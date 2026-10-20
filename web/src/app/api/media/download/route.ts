import { NextResponse } from 'next/server';

import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import {
  R2NotConfiguredError,
  R2RequestError,
  presignRenditionDownload,
  readR2Config,
} from '@/lib/media-r2';
import {
  downloadFilename,
  fetchPlayableRenditions,
  pickDownloadRendition,
} from '@/lib/playback';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (message: string, status: number) =>
  NextResponse.json({ ok: false, message }, { status });

/**
 * Mints a short-lived URL that saves a lesson's media instead of playing it.
 *
 * Same object, same bucket and the same window as playback. The difference is
 * `response-content-disposition`, which is what makes a browser keep the bytes
 * rather than open them — without it a button labelled "Save for offline" would
 * open a tab and play the lesson, which is not what the button says.
 *
 * TWO GATES, AND THEY ARE NOT THE SAME GATE
 * -----------------------------------------
 * `may_download_lesson()` deliberately does not call `can_access_lesson()`. That
 * function also returns true for a free preview while `learning.previews` is on,
 * and a sample is free to watch but not free to keep; using it here would put a
 * hole in a paid feature. So a learner who can stream a preview gets a 403 from
 * this route, and that is the intended behaviour.
 *
 * `learning.offline` is CODE-gated and ships off, which means today this route
 * refuses everybody. Enabling it needs the offline decisions that are still
 * open: how many devices, whether a saved copy expires, and whether anything
 * protects it.
 *
 * WHAT THIS IS NOT
 * ----------------
 * Not DRM. The saved file is an ordinary MP4 that can be copied and shared, so
 * what this buys is convenience on a metered connection and not protection. Any
 * claim otherwise would be a lie in a product that charges for the feature, and
 * the decision is recorded as open rather than quietly answered here.
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return fail('Storage is not configured on this deployment.', 503);
  }

  const params = new URL(request.url).searchParams;
  const lessonId = params.get('lesson')?.trim() ?? '';
  const resourceId = params.get('resource')?.trim() ?? '';
  const requestedProfile = params.get('profile')?.trim() ?? '';

  if (!UUID.test(lessonId)) return fail('That is not a lesson.', 400);
  if (resourceId && !UUID.test(resourceId)) return fail('That is not a lesson resource.', 400);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in to save a lesson.', 401);

  let offlineOn = false;
  try {
    offlineOn = await isFlagEnabled(supabase, 'learning.offline');
  } catch {
    offlineOn = false;
  }
  if (!offlineOn) {
    return fail(
      'Saving lessons for offline use is not enabled on this platform yet.',
      403,
    );
  }

  const { data: mayDownload, error: gateError } = await supabase.rpc('may_download_lesson', {
    p_lesson_id: lessonId,
  });
  if (gateError) return fail(gateError.message, 500);
  if (mayDownload !== true) {
    // Covers both "not entitled" and "entitled but this is a preview", which is
    // the point of the predicate. Not distinguished in the response either.
    return fail('This lesson cannot be saved with what you have.', 403);
  }

  const { data: resources, error: resourceError } = await supabase
    .from('lesson_resources')
    .select('id, display_name, resource_type, media_asset_id')
    .eq('lesson_id', lessonId)
    .not('media_asset_id', 'is', null)
    .order('position', { ascending: true });
  if (resourceError) return fail(resourceError.message, 500);

  const rows = (resources ?? []) as unknown as Array<{
    id: string;
    display_name: string;
    resource_type: string;
    media_asset_id: string;
  }>;
  const wanted = resourceId ? rows.filter((r) => r.id === resourceId) : rows;
  if (wanted.length === 0) {
    return fail('This lesson has no uploaded media to save.', 404);
  }

  const renditions = await fetchPlayableRenditions(
    supabase,
    wanted.map((r) => r.media_asset_id),
  );

  // A lesson can hold more than one file. Without a resource id, save the first
  // one that actually has an encoded copy — a master with no renditions yet is
  // not something a learner can be given.
  let chosen = null;
  let chosenResource = null;
  for (const resource of wanted) {
    const forAsset = renditions.filter((r) => r.assetId === resource.media_asset_id);
    const pick = pickDownloadRendition(forAsset, requestedProfile || null);
    if (pick) {
      chosen = pick;
      chosenResource = resource;
      break;
    }
  }

  if (!chosen || !chosenResource) {
    return fail(
      requestedProfile
        ? `Nothing has been encoded at ${requestedProfile} for this lesson yet.`
        : 'Nothing has been encoded for this lesson yet.',
      404,
    );
  }

  const config = readR2Config();
  if (!config) return fail(new R2NotConfiguredError().message, 503);
  if (chosen.bucket !== config.renditionsBucket) {
    return fail(
      `That rendition is recorded in '${chosen.bucket}', which this deployment does not serve.`,
      503,
    );
  }

  try {
    const filename = downloadFilename(
      chosenResource.display_name,
      chosen.profile,
      chosen.mimeType,
    );
    const signed = presignRenditionDownload(config, chosen.objectKey, {
      filename,
      contentType: chosen.mimeType,
    });
    return NextResponse.json({
      ok: true,
      data: {
        url: signed.url,
        filename,
        expiresAt: signed.expiresAt,
        expiresInSeconds: signed.expiresInSeconds,
        renditionId: chosen.id,
        profile: chosen.profile,
        mimeType: chosen.mimeType,
        byteSize: chosen.byteSize,
      },
    });
  } catch (cause) {
    const message =
      cause instanceof R2RequestError ? cause.message : 'The download URL could not be signed.';
    return fail(message, 503);
  }
}
