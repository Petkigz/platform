import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  describeKind,
  preferenceChangeOf,
  preferenceRefusalOf,
  preferenceRefusalStatus,
  type PreferenceRefusal,
} from '@/lib/notification-prefs';

/**
 * POST /api/notifications/preferences — turn one kind of in-app message on or off.
 *
 * The database decides three things this route does not: which kinds exist,
 * that the two money-failure kinds cannot be silenced, and that the row is
 * always written for the caller and nobody else.
 *
 * **Every refusal is named** (`reason`, with a status of its own). This route
 * used to send back the sentence `set_notification_preference()` raised, and
 * the screen printed it: English, for every reader, and whatever the
 * database chose to say. The screen now says its own sentence for each name;
 * `message` is English for a caller with no words of its own, and the
 * database's sentence is logged.
 */
const NO_STORE = { 'Cache-Control': 'no-store' } as const;

const ENGLISH: Record<PreferenceRefusal, string> = {
  unconfigured: 'Supabase is not configured on this deployment.',
  malformed: 'A kind and a true-or-false are required.',
  signed_out: 'Sign in to choose what you are told.',
  unknown_kind: 'That is not something the platform tells you about.',
  locked: 'Being told that money owed to you did not arrive cannot be switched off.',
  failed: 'That change was not saved.',
  unconfirmed: 'No answer came back. Reload to see whether the change was saved.',
};
const refuse = (reason: PreferenceRefusal) =>
  NextResponse.json({ ok: false, reason, message: ENGLISH[reason] }, { status: preferenceRefusalStatus(reason), headers: NO_STORE });

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return refuse('unconfigured');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refuse('malformed');
  }
  const change = preferenceChangeOf(body);
  if (!change) return refuse('malformed');

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return refuse('signed_out');

    const { data, error } = await supabase.rpc('set_notification_preference', {
      p_kind: change.kind,
      p_enabled: change.enabled,
    });
    if (error) {
      const reason = preferenceRefusalOf(error.code);
      if (reason === 'failed') console.error('[notifications] preference refused:', error.code, error.message);
      return refuse(reason);
    }

    // Only what this code can name goes back: the kind and whether it is on.
    const saved = (data ?? {}) as Record<string, unknown>;
    const kind = describeKind(saved.kind)?.kind ?? null;
    if (kind === null || typeof saved.enabled !== 'boolean') {
      // The function returned, so the row was written; what it holds was not read.
      console.error('[notifications] preference saved, answer unreadable');
      return refuse('unconfirmed');
    }
    return NextResponse.json({ ok: true, value: { kind, enabled: saved.enabled } }, { headers: NO_STORE });
  } catch (error) {
    // No answer at all: the change may have been saved.
    console.error('[notifications] preference got no answer:', error instanceof Error ? error.message : error);
    return refuse('unconfirmed');
  }
}
