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
  NextResponse.json({ ok: false, message }, { status, headers: { 'cache-control': 'private, no-store' } });

/**
 * Say why a save did not happen, once, in the one place that refuses.
 *
 * A refusal leaves no row anywhere — the bytes never moved, so no table knows — and
 * `needs_plus` is the single most useful thing this platform can learn about a
 * learner on Basic. The reason is not guessed here: `lesson_download_standing()`
 * is the function that already answers the question in reasoning order, so the event
 * carries its vocabulary rather than a second list invented at the call site. It is
 * fire-and-forget: a failed recording must never change the refusal a learner sees.
 */
async function recordSaveRefusal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lessonId: string,
  reason: string,
): Promise<void> {
  try {
    await supabase.rpc('record_analytics_event', {
      p_code: 'lesson.save_refused',
      p_subject_id: lessonId,
      p_learner_profile_id: null,
      p_properties: { reason },
    });
  } catch {
    // Instrumentation is not allowed to fail the request it is watching.
  }
}

/**
 * Issue a short-lived URL only for an entitled learner and a live booking of
 * the selected resource. The player fetches and encrypts bytes in its vault;
 * an authorized client can still keep plaintext or retain a key. This is not DRM.
 * Free previews are watchable but are not enough to save a lesson.
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return fail('Storage is not configured on this deployment.', 503);
  }

  const params = new URL(request.url).searchParams;
  const lessonId = params.get('lesson')?.trim() ?? '';
  const resourceId = params.get('resource')?.trim() ?? '';
  const requestedProfile = params.get('profile')?.trim() ?? '';
  const saveId = params.get('save')?.trim() ?? '';

  if (!UUID.test(lessonId)) return fail('That is not a lesson.', 400);
  if (!UUID.test(saveId)) return fail('Book this save in the app before downloading. Refresh the page and try again.', 400);
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
    // Not recorded: the switch is off for everybody, so this is a configuration
    // fact and would count page reloads rather than anybody's intent.
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
    // the point of the predicate. Not distinguished in the response either — but
    // the record of it can distinguish, because `lesson_download_standing()` knows
    // and the operator's question ("Basic wanting Plus?") has an answer.
    const { data: standing } = await supabase.rpc('lesson_download_standing', {
      p_lesson_id: lessonId,
    });
    const reason = (standing as { reason?: string } | null)?.reason ?? 'not_entitled';
    await recordSaveRefusal(supabase, lessonId, reason);
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
    await recordSaveRefusal(supabase, lessonId, 'not_encoded');
    return fail(
      requestedProfile
        ? `Nothing has been encoded at ${requestedProfile} for this lesson yet.`
        : 'Nothing has been encoded for this lesson yet.',
      404,
    );
  }

  const { data: matchesBooking, error: bookingError } = await supabase.rpc('offline_booking_matches_resource', {
    p_download_id: saveId,
    p_lesson_id: lessonId,
    p_resource_id: chosenResource.id,
  });
  if (bookingError) return fail('The save booking could not be checked.', 503);
  if (matchesBooking !== true) return fail('This save is no longer valid for that lesson resource.', 403);

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
    }, { headers: { 'cache-control': 'private, no-store' } });
  } catch (cause) {
    const message =
      cause instanceof R2RequestError ? cause.message : 'The download URL could not be signed.';
    return fail(message, 503);
  }
}
