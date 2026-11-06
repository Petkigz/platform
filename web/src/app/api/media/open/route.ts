import { NextResponse } from 'next/server';

import { isSupabaseConfigured } from '@/lib/env';
import { MASTER_PREVIEW_SECONDS, fetchMasterPreviewTarget } from '@/lib/master-preview';
import { R2NotConfiguredError, R2RequestError, presignMasterDownload, readR2Config } from '@/lib/media-r2';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Open a file: a redirect to a short-lived address.
 *
 * `/api/media/master` answers with JSON, which is right for the preview page that
 * asks for it and renders a player around it. A file handed in as coursework needs
 * the other shape — a link somebody can click — because a page of handwriting or a
 * PDF is not something this platform renders, it is something the browser opens.
 *
 * Two rules keep this from being a hole:
 *
 *   * **Who may look is still `may_watch_master()`**, asked through
 *     `master_preview_target()`. Nothing is decided here; this route only turns a
 *     yes into a redirect.
 *   * **The address is signed, not stored.** It expires in fifteen minutes, so a
 *     link can remain usable until expiry even after access changes. It may also
 *     appear in browser history. A signed link cannot prevent copying or saving.
 *
 * A refusal and a missing row are the same 404 on purpose: distinguishing them
 * would tell a caller which uploads are real.
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return new NextResponse('Storage is not configured on this deployment.', { status: 503 });
  }

  const assetId = new URL(request.url).searchParams.get('asset')?.trim() ?? '';
  if (!UUID.test(assetId)) return new NextResponse('That is not a file.', { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // A file address is a person-sized thing, so the browser is sent to sign in
  // rather than shown an error it cannot act on.
  if (!user) {
    return NextResponse.redirect(
      new URL(`/sign-in?next=${encodeURIComponent(`/api/media/open?asset=${assetId}`)}`, request.url),
    );
  }

  const result = await fetchMasterPreviewTarget(supabase, assetId);
  if (!result.ok) return new NextResponse(result.message, { status: result.status });
  if (!result.target) return new NextResponse('That file is not available to you.', { status: 404 });

  const config = readR2Config();
  if (!config) return new NextResponse(new R2NotConfiguredError().message, { status: 503 });

  if (result.target.bucket !== config.mastersBucket) {
    return new NextResponse(
      `That file is recorded in '${result.target.bucket}', which this deployment does not serve.`,
      { status: 503 },
    );
  }

  try {
    const signed = presignMasterDownload(config, result.target.objectKey, {
      expiresInSeconds: MASTER_PREVIEW_SECONDS,
    });
    const response = NextResponse.redirect(signed.url, 302);
    // A signed URL must never be cached by anything in the middle: the next
    // request is a different person, or the same one after the signature expired.
    response.headers.set('cache-control', 'private, no-store');
    return response;
  } catch (cause) {
    const message =
      cause instanceof R2RequestError ? cause.message : 'The address for that file could not be signed.';
    return new NextResponse(message, { status: 503 });
  }
}
