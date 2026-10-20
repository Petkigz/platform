import { NextResponse } from 'next/server';

import { isSupabaseConfigured } from '@/lib/env';
import {
  R2NotConfiguredError,
  R2RequestError,
  presignRenditionPlayback,
  readR2Config,
} from '@/lib/media-r2';
import { isServable, toPlayable } from '@/lib/playback';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (message: string, status: number) =>
  NextResponse.json({ ok: false, message }, { status });

/**
 * Mints a short-lived URL for one delivery copy.
 *
 * This is the only place a learner's player gets bytes from, and it is a
 * rendition, never a master: D8 keeps the archive and the delivery copies apart
 * so that "a learner never touches a master" is a property of the code rather
 * than a filter somebody remembered to add.
 *
 * WHO IS ALLOWED IS NOT DECIDED HERE
 * ----------------------------------
 * `media_renditions_read` is `may_play_rendition(id) or is_privileged(...)`, and
 * `may_play_rendition()` walks rendition → master → `lesson_resources` →
 * `lessons` and asks `can_access_lesson_now()`. So this route selects the row and
 * trusts the answer. Re-checking entitlement here would create a second
 * authority that could disagree with the first, which is how a preview gate once
 * nearly gave away a paid feature.
 *
 * A row the caller may not play does not come back at all, so "that rendition
 * does not exist" and "that rendition is not yours" produce the same response.
 * They are not distinguished on purpose: the difference tells a caller what to
 * try next.
 *
 * The URL is returned as JSON rather than as a redirect so the player can see
 * the expiry and ask again. A redirect would be cached by the browser and would
 * start failing silently an hour into a long lesson.
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return fail('Storage is not configured on this deployment.', 503);
  }

  const renditionId = new URL(request.url).searchParams.get('rendition')?.trim() ?? '';
  if (!UUID.test(renditionId)) return fail('That is not a rendition.', 400);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in to play a lesson.', 401);

  const { data, error } = await supabase
    .from('media_renditions')
    .select(
      'id, asset_id, profile, mime_type, bucket, object_key, byte_size, width, height, duration_seconds',
    )
    .eq('id', renditionId)
    // Redundant with may_play_rendition(), which also requires this, and kept
    // anyway: a pending or failed row must not be servable even if that
    // predicate is ever widened.
    .eq('status', 'available')
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!data) return fail('That rendition is not available to you.', 404);

  const rendition = toPlayable(data as never);
  // A poster is served too: it is part of playing the lesson, and it is a
  // rendition of a master this caller may already watch.
  if (!isServable(rendition)) {
    return fail('That rendition is not something a player can use.', 404);
  }

  const config = readR2Config();
  if (!config) return fail(new R2NotConfiguredError().message, 503);

  if (rendition.bucket !== config.renditionsBucket) {
    // The row records where the object is. Signing it against the bucket this
    // deployment is configured for would produce a URL to somewhere else.
    return fail(
      `That rendition is recorded in '${rendition.bucket}', which this deployment does not serve.`,
      503,
    );
  }

  try {
    const signed = presignRenditionPlayback(config, rendition.objectKey);
    return NextResponse.json({
      ok: true,
      data: {
        url: signed.url,
        expiresAt: signed.expiresAt,
        expiresInSeconds: signed.expiresInSeconds,
        renditionId: rendition.id,
        profile: rendition.profile,
        mimeType: rendition.mimeType,
        byteSize: rendition.byteSize,
        width: rendition.width,
        height: rendition.height,
        durationSeconds: rendition.durationSeconds,
      },
    });
  } catch (cause) {
    const message =
      cause instanceof R2RequestError
        ? cause.message
        : 'The playback URL could not be signed.';
    return fail(message, 503);
  }
}
