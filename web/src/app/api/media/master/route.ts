import { NextResponse } from 'next/server';

import { isSupabaseConfigured } from '@/lib/env';
import {
  MASTER_PREVIEW_SECONDS,
  fetchMasterPreviewTarget,
  playerKindFor,
} from '@/lib/master-preview';
import { R2NotConfiguredError, R2RequestError, presignMasterDownload, readR2Config } from '@/lib/media-r2';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (message: string, status: number) =>
  NextResponse.json({ ok: false, message }, { status });

/**
 * Mints a short-lived URL for one master — the archive copy, not a delivery copy.
 *
 * A learner never reaches this route: `may_watch_master()` answers yes only for
 * the person who uploaded the file, platform staff, and the author of a version
 * whose lesson uses it while it is available. Those are the three people who have
 * to look at a file rather than watch a lesson — a teacher checking what they
 * made, a staff member verifying an upload before confirming it, and a course
 * whose media was uploaded on their behalf.
 *
 * WHO IS ALLOWED IS NOT DECIDED HERE. `master_preview_target()` is SECURITY
 * DEFINER and returns the object coordinates only where `may_watch_master()` says
 * yes, so this route asks and signs. It returns no rows for an asset that does
 * not exist and for one that is not the caller's, and both become the same 404
 * here, because the difference would tell a caller which uploads are real.
 *
 * The window is fifteen minutes rather than the six hours a learner's playback
 * URL gets: this is a check, not a lesson, and a master URL is a bearer token for
 * the one copy nothing else in the system hands out.
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return fail('Storage is not configured on this deployment.', 503);
  }

  const assetId = new URL(request.url).searchParams.get('asset')?.trim() ?? '';
  if (!UUID.test(assetId)) return fail('That is not a file.', 400);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in to watch a file.', 401);

  const result = await fetchMasterPreviewTarget(supabase, assetId);
  if (!result.ok) return fail(result.message, result.status);
  if (!result.target) return fail('That file is not available to you.', 404);

  const target = result.target;
  const config = readR2Config();
  if (!config) return fail(new R2NotConfiguredError().message, 503);

  if (target.bucket !== config.mastersBucket) {
    // The row records where the object is. Signing it against the bucket this
    // deployment serves would produce a URL to somewhere else.
    return fail(
      `That file is recorded in '${target.bucket}', which this deployment does not serve.`,
      503,
    );
  }

  try {
    const signed = presignMasterDownload(config, target.objectKey, {
      expiresInSeconds: MASTER_PREVIEW_SECONDS,
    });
    return NextResponse.json({
      ok: true,
      data: {
        url: signed.url,
        expiresAt: signed.expiresAt,
        expiresInSeconds: signed.expiresInSeconds,
        assetId: target.assetId,
        mimeType: target.mimeType,
        byteSize: target.byteSize,
        displayName: target.displayName,
        status: target.status,
        // Which element the browser needs, or null when a browser cannot play
        // this file at all — an uploaded PDF is a master too, and saying so is
        // better than a black rectangle.
        kind: playerKindFor(target.mimeType),
      },
    });
  } catch (cause) {
    const message =
      cause instanceof R2RequestError ? cause.message : 'The preview URL could not be signed.';
    return fail(message, 503);
  }
}
