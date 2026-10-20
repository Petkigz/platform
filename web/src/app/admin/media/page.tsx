import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchMediaModerationQueue, MEDIA_STATUS_LABEL, readableByteSize } from '@/lib/media';
import { MasterPlayer } from '@/app/_shared/master-player';
import { ModerateForm } from './moderate-form';
import { RetryRenditionForm } from './retry-rendition-form';

export const dynamic = 'force-dynamic';

/**
 * Uploaded masters, and the two things staff can do about one.
 *
 * Quarantining holds a file for review and withdraws every rendition derived
 * from it, because playback requires the master to be available. Withdrawing is
 * a soft delete per D7: the row is tombstoned and the object survives, so a
 * rights request can still be matched to the exact bytes later.
 *
 * Both need a reason in writing, and the database refuses without one — the
 * audit trail for a takedown used to record who and when but not why.
 *
 * Staff can also watch the file itself, through `/api/media/master`. Verification
 * compares a byte count against storage, which is not the same as looking: a file
 * of exactly the declared size can still be the wrong footage.
 *
 * The fourth thing is undoing a failed encode. A copy that failed used to be
 * stuck: nothing in the schema moved a `failed` rendition back, and registering
 * the same profile again hit the unique index, so a full disk on the worker cost
 * a lesson one of its rungs for good. A retry needs a written reason, which is
 * what stops it from becoming an automatic loop over a master that genuinely
 * cannot be encoded.
 */
export default async function AdminMediaPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/media');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const queue = await fetchMediaModerationQueue(supabase);

  return (
    <main className="page">
      <nav className="crumbs">
        <Link href="/admin">Admin</Link>
        <span aria-hidden>›</span>
        <span>Uploaded media</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Content</p>
        <h1>Uploaded media</h1>
        <p className="muted">
          Every master anybody has uploaded. Quarantining holds one for review
          and stops every copy derived from it; withdrawing ends its use but
          keeps the object, because a rights request may have to be matched to
          it later. A copy that failed to encode can be put back in the queue.
          All three need a written reason, and all three are recorded in the
          governance audit trail.
        </p>
      </div>

      {queue.length === 0 && <p className="muted">Nothing has been uploaded yet.</p>}

      {queue.map((asset) => {
        // A retry is only offered for a master that can still be encoded from:
        // the schema refuses one whose master is quarantined or withdrawn, and a
        // button that always fails is worse than no button.
        const failed = asset.status === 'available'
          ? asset.renditions
              .filter((r) => r.status === 'failed' && r.id !== '')
              .map((r) => ({
                id: r.id,
                profile: r.profile,
                failureReason: r.failureReason,
              }))
          : [];

        return (
        <section className="card" key={asset.id}>
          <h2>{asset.displayName ?? <span className="muted">Untitled upload</span>}</h2>
          <p className="eyebrow">
            {MEDIA_STATUS_LABEL[asset.status]} · {asset.mimeType} ·{' '}
            {readableByteSize(asset.byteSize)}
            {asset.durationSeconds !== null && ` · ${Math.round(asset.durationSeconds / 60)} min`}
            {' · uploaded '}
            {new Date(asset.createdAt).toLocaleDateString()}
          </p>

          <p className="muted" style={{ fontSize: '0.9rem' }}>
            {asset.uploader ? `Uploaded by ${asset.uploader}` : 'Uploader unknown'}
            {' · '}
            {asset.renditions.length === 0
              ? 'no renditions encoded yet'
              : `${asset.renditions.length} rendition${asset.renditions.length === 1 ? '' : 's'}: ${asset.renditions
                  .map((r) => `${r.profile} (${r.status})`)
                  .join(', ')}`}
          </p>

          {asset.status === 'deleted' ? (
            <p className="muted">
              Withdrawn. The row is tombstoned and the object survives per the
              retention schedule.
            </p>
          ) : (
            <>
              <MasterPlayer assetId={asset.id} label="Watch the file" />
              <ModerateForm assetId={asset.id} canVerify={asset.status === 'pending'} />
              <RetryRenditionForm failed={failed} />
            </>
          )}
        </section>
        );
      })}

      <p className="muted">
        Verifying an upload transfers no byte: it asks storage whether the object
        arrived and whether it is the size that was declared, and it does not
        recompute the checksum, because that would mean downloading the file.
        Watching one does — a signed link to the master itself, good for fifteen
        minutes, because a file nobody has looked at is a file nobody has
        moderated. Retrying a failed copy transfers nothing either: it moves the
        row back to pending, and the next worker run does the encoding. Only staff
        can verify, quarantine, withdraw or retry, and an uploader can never
        promote their own file.
      </p>
    </main>
  );
}
