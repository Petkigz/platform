import { NextResponse } from 'next/server';

import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { decideKey, deriveSaveKey, readVaultSecret, VaultSecretError } from '@/lib/offline-key';
import { toBase64Url } from '@/lib/offline-vault';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (message: string, status: number) => NextResponse.json({ ok: false, message }, { status });

/**
 * The key that opens one saved lesson.
 *
 * This is the lock on bytes that live on somebody's own device. The save is a
 * row the learner owns; the key is derived from it and a server-only secret, and
 * is minted only while that row says the copy is still theirs. So a save that
 * lapsed, or a device somebody removed, stops being openable even though the
 * ciphertext is still sitting in the browser.
 *
 * WHAT THIS IS NOT
 * ----------------
 * Not DRM. A client that keeps the key it was handed keeps its copy. What the
 * platform gains is that nothing durable is plaintext and nothing out of date is
 * readable through the app — no more, and the screen says so.
 *
 * WHO MAY HAVE THE KEY
 * --------------------
 * `offline_downloads_read` is `can_access_learner(learner_profile_id) or
 * is_privileged`, so the select returns this learner's saves (or, for staff,
 * somebody's). The route selects the row and trusts that answer rather than
 * re-deriving entitlement here: a second authority that can disagree is exactly
 * the defect this codebase has fixed before.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Storage is not configured on this deployment.', 503);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail('Malformed request.', 400);
  }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const downloadId = typeof body.downloadId === 'string' ? body.downloadId.trim() : '';
  if (!UUID.test(downloadId)) return fail('That is not a saved lesson.', 400);

  let secret: string;
  try {
    secret = readVaultSecret();
  } catch (error) {
    // Fail closed, and say what is missing. A deployment that cannot seal a
    // lesson must not save one in the clear and call it protected.
    return fail(
      error instanceof VaultSecretError ? error.message : 'Offline saving is not configured.',
      503,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in to open a saved lesson.', 401);

  const { data, error } = await supabase
    .from('offline_downloads')
    .select('id, expires_at, removed_at')
    .eq('id', downloadId)
    .maybeSingle();

  if (error) return fail('The saved copies could not be read.', 502);
  if (!data) return fail('There is no saved copy with that id.', 404);

  const decision = decideKey(data as { id: string; expires_at: string | null; removed_at: string | null });
  if (!decision.ok) return fail(decision.message, 410);

  const key = await deriveSaveKey(secret, decision.saveId);

  return NextResponse.json(
    { ok: true, key: toBase64Url(key), expiresAt: decision.expiresAt },
    { headers: { 'cache-control': 'no-store' } },
  );
}
