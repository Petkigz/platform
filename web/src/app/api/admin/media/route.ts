import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  MAX_LISTED_IDS,
  fetchMediaAssetsByIds,
  quarantineMediaAsset,
  retryMediaRendition,
  withdrawMediaAsset,
} from '@/lib/media';
import { abandonUnfinishedUpload, listUnfinishedMasterUploads } from '@/lib/media-multipart';
import { confirmMediaUpload } from '@/lib/media-verify';
import { R2NotConfiguredError, R2RequestError, masterKeyAssetId, readR2Config } from '@/lib/media-r2';

export const dynamic = 'force-dynamic';

type Payload = {
  action?: unknown;
  assetId?: unknown;
  /** The copy to put back in the queue, for `retry_rendition`. */
  renditionId?: unknown;
  /** Storage's id for an upload nobody finished, for `abandon_upload`. */
  uploadId?: unknown;
  reason?: unknown;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (message: string, status: number) =>
  NextResponse.json({ ok: false, error: message }, { status });

/**
 * Holding and withdrawing an uploaded master.
 *
 * These are the two powers a rights complaint or a safeguarding report about a
 * file needs, and until this route existed they were SQL functions with no way
 * to reach them: `quarantine_media_upload()` and `delete_media_asset()` were
 * built and tested and nothing called them.
 *
 * The third action, `verify`, is the one that lets an upload finish: it looks at
 * the object in storage with a single HEAD, compares its size with what was
 * declared, and only then calls `confirm_media_upload()`.
 *
 * The fourth, `retry_rendition`, is the one that undoes a failure. An encode
 * that failed used to be permanent: `fail_media_rendition()` moved the row to
 * `failed`, nothing moved it back, and a second register for the same profile
 * hit the unique index. So a lesson lost a rung until somebody edited the
 * database. A retry needs a written reason, which is what keeps it from becoming
 * an automatic loop — the usual reason a master will not encode is the master
 * itself.
 *
 * The last two are about bytes rather than files. A multipart upload stores its
 * parts as they arrive, and the object does not exist until the upload is
 * completed, so an upload nobody finished — a tab closed at part 300 of 512 —
 * leaves bytes in the bucket that no row in this schema mentions. They are billed,
 * they cannot be served, and storage deletes them on its own lifecycle after seven
 * days. `list_unfinished_uploads` reads that list from the bucket, because the
 * upload id is storage's and nothing here records it; `abandon_upload` ends one
 * early, with a written reason, and records the decision before it asks storage to
 * delete anything — so a refusal leaves a record of what was decided rather than
 * leaving a deletion with no record at all.
 *
 * All of them are staff-only in the database as well as here. Checking only in the
 * route would mean one forgotten import away from anybody calling the function.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Storage is not configured on this deployment.', 503);

  const body = (await request.json().catch(() => null)) as Payload | null;
  const action = body?.action;
  if (
    action !== 'quarantine' &&
    action !== 'withdraw' &&
    action !== 'verify' &&
    action !== 'retry_rendition' &&
    action !== 'list_unfinished_uploads' &&
    action !== 'abandon_upload'
  ) {
    return fail('Unknown moderation action.', 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) return fail('Only platform staff can moderate uploads.', 403);

  // Retrying a copy is addressed to the copy, not to the master: one master has
  // several rungs and usually only one of them failed.
  if (action === 'retry_rendition') {
    const renditionId = typeof body?.renditionId === 'string' ? body.renditionId.trim() : '';
    if (!UUID.test(renditionId)) return fail('That is not a rendition.', 400);

    const reason = typeof body?.reason === 'string' ? body.reason : '';
    const retried = await retryMediaRendition(supabase, renditionId, reason);
    if (!retried.ok) {
      const status = /Only platform staff/.test(retried.message) ? 403
        : /gone|withdrawn|held for review|Only a rendition that failed/.test(retried.message) ? 409
        : 400;
      return fail(retried.message, status);
    }
    return NextResponse.json(
      { ok: true, data: { renditionId, action } },
      { status: 200 },
    );
  }

  // The bucket listing needs no asset id: it is the question, not the answer.
  if (action === 'list_unfinished_uploads') {
    const config = readR2Config();
    if (!config) return fail(new R2NotConfiguredError().message, 503);

    const listed = await listUnfinishedMasterUploads({ config });
    if (!listed.ok) return fail(listed.message, listed.status);

    // Storage lists by object key; the platform's record of a file is addressed by
    // id, and the key is derived from it. A key that was not derived from an asset
    // is shown as one this platform cannot name, rather than being dropped: an
    // upload nobody can account for is the one worth looking at.
    const keyed = listed.value.uploads.map((upload) => {
      try {
        return { upload, assetId: masterKeyAssetId(upload.key) };
      } catch (error) {
        if (error instanceof R2RequestError) return { upload, assetId: null };
        throw error;
      }
    });

    const ids = keyed
      .map((entry) => entry.assetId)
      .filter((id): id is string => id !== null)
      .slice(0, MAX_LISTED_IDS);
    const rows = await fetchMediaAssetsByIds(supabase, ids);
    const byId = new Map(rows.map((row) => [row.id, row]));

    return NextResponse.json({
      ok: true,
      data: {
        capped: listed.value.capped,
        uploads: keyed.map(({ upload, assetId: id }) => ({
          key: upload.key,
          uploadId: upload.uploadId,
          initiated: upload.initiated,
          assetId: id,
          asset: id ? (byId.get(id) ?? null) : null,
        })),
      },
    });
  }

  if (action === 'abandon_upload') {
    const config = readR2Config();
    if (!config) return fail(new R2NotConfiguredError().message, 503);

    const target = typeof body?.assetId === 'string' ? body.assetId.trim() : '';
    if (!UUID.test(target)) return fail('That is not an upload.', 400);
    const uploadId = typeof body?.uploadId === 'string' ? body.uploadId.trim() : '';
    if (!uploadId) return fail('That upload has no id, so there is nothing to end.', 400);

    const reason = typeof body?.reason === 'string' ? body.reason : '';
    const outcome = await abandonUnfinishedUpload(
      supabase,
      { assetId: target, uploadId, reason },
      { config },
    );
    if (!outcome.ok) return fail(outcome.message, outcome.status);
    return NextResponse.json({ ok: true, data: { action, ...outcome.value } });
  }

  const assetId = typeof body?.assetId === 'string' ? body.assetId.trim() : '';
  if (!UUID.test(assetId)) return fail('That is not an upload.', 400);

  // Verifying an upload is the third power on this screen, and the one that
  // makes the other two matter: until a file is confirmed it stays `pending`,
  // it cannot be attached to a lesson, and the transcode worker will not encode
  // it. It needs no written reason, because it is not a judgement about the
  // content — it is a statement that the bytes arrived.
  if (action === 'verify') {
    const config = readR2Config();
    if (!config) return fail(new R2NotConfiguredError().message, 503);

    const outcome = await confirmMediaUpload(supabase, assetId, { config });
    if (!outcome.ok) return fail(outcome.message, outcome.status);
    return NextResponse.json(
      { ok: true, data: { assetId, action, verifiedBytes: outcome.verifiedBytes } },
      { status: 200 },
    );
  }

  const reason = typeof body?.reason === 'string' ? body.reason : '';
  const result =
    action === 'quarantine'
      ? await quarantineMediaAsset(supabase, assetId, reason)
      : await withdrawMediaAsset(supabase, assetId, reason);

  if (!result.ok) {
    const status = /Only platform staff/.test(result.message) ? 403
      : /gone|already/.test(result.message) ? 409
      : 400;
    return fail(result.message, status);
  }

  return NextResponse.json({ ok: true, data: { assetId, action } }, { status: 200 });
}
