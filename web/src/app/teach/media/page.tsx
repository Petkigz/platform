import Link from 'next/link';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/env';
import { MEDIA_STATUS_LABEL, fetchMediaAssets, readableByteSize } from '@/lib/media';
import { parseTeacherTerms, uploadBlockedSentence, type TeacherTerms } from '@/lib/licence';
import { createClient } from '@/lib/supabase/server';

import { MasterPlayer } from '@/app/_shared/master-player';
import { UploadMedia } from './upload-form';

type StorageReading = {
  enforced: boolean;
  usedBytes: string;
  quotaBytes: string | null;
  remainingBytes: string | null;
  fileCount: number;
  byStatus: Array<{ status: string; files: number; bytes: string }>;
};

export const dynamic = 'force-dynamic';

/**
 * A teacher's own uploads.
 *
 * The list is whatever `media_assets_read` returns — `uploaded_by =
 * current_user_id() OR is_privileged()` — so there is no filter here, because a
 * second filter would be a second opinion about who may see what.
 *
 * Uploading and publishing are separate acts and this page says so. A file lands
 * as `pending`, and only a staff verification makes it `available`; only an
 * available file can be attached to a lesson. That split exists because letting
 * an uploader mark their own file as ready is how unreviewed material reaches a
 * child.
 *
 * Waiting for verification is not waiting in the dark: the person who uploaded a
 * file can watch it, from `pending` onwards, through `/api/media/master`. What
 * they cannot do is promote it.
 */
export default async function TeachMediaPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/teach/media');

  const assets = await fetchMediaAssets(supabase);
  const usable = assets.filter((asset) => asset.status === 'available').length;

  // The same gate `media_assets` enforces on insert. Asking first turns a
  // refusal after an upload attempt into a sentence before one, and the form is
  // not shown at all when the database would refuse it — a form that always
  // fails teaches people to distrust the page.
  const { data: termsData } = await supabase.rpc('my_teacher_terms');
  const terms: TeacherTerms = parseTeacherTerms(termsData);
  const blocked = uploadBlockedSentence(terms);

  // The same numbers the upload route refuses with. A cap a teacher cannot see
  // is felt as an outage — the first they would hear of 50 GB is a bounce.
  const { data: storageData } = await supabase.rpc('my_media_storage');
  const storage = (storageData ?? null) as StorageReading | null;
  const usedPercent =
    storage?.enforced && storage.quotaBytes && Number(storage.quotaBytes) > 0
      ? Math.min(100, Math.round((Number(storage.usedBytes) / Number(storage.quotaBytes)) * 100))
      : null;

  return (
    <div className="page wide">
      <nav className="crumbs">
        <Link href="/teach">Teaching</Link>
        <span aria-hidden>›</span>
        <span>Media library</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Teaching</p>
        <h1>Media library</h1>
        <p className="muted">
          Everything you have uploaded, and what state each file is in. A file is
          usable in a lesson once it has been verified; {String(usable)} of{' '}
          {String(assets.length)} {assets.length === 1 ? 'is' : 'are'} ready now.
        </p>
      </div>

      {storage && (
        <section className="card" style={{ marginBottom: '1rem' }}>
          <div className="outline-h" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h2>Storage</h2>
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              {storage.fileCount} {storage.fileCount === 1 ? 'master' : 'masters'}
            </span>
          </div>

          <p style={{ margin: '0.25rem 0 0.5rem' }}>
            <strong>{readableByteSize(Number(storage.usedBytes))}</strong>{' '}
            {storage.enforced && storage.quotaBytes ? (
              <>of {readableByteSize(Number(storage.quotaBytes))} used</>
            ) : (
              <span className="muted">used · no cap is being enforced</span>
            )}
          </p>

          {usedPercent !== null && (
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={usedPercent}
              aria-label="Storage used"
              style={{
                height: '0.7rem',
                borderRadius: '999px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${usedPercent}%`,
                  height: '100%',
                  background: usedPercent >= 90 ? '#a33' : 'var(--green-800)',
                }}
              />
            </div>
          )}

          <p className="muted" style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
            {storage.enforced && storage.remainingBytes !== null ? (
              <>
                {readableByteSize(Number(storage.remainingBytes))} of room left. Counted on the
                masters you uploaded — the delivery copies made from them are the platform&apos;s,
                not your allowance. Withdrawn and deleted files do not count; pending and held
                ones do.
              </>
            ) : (
              <>
                There is no storage cap on this platform at the moment. Uploads are still limited
                per file, and every file waits for verification. Counted on the masters you
                uploaded; withdrawn and deleted files do not count.
              </>
            )}
          </p>

          {storage.byStatus.length > 0 && (
            <ul className="lessons" style={{ marginTop: '0.5rem' }}>
              {storage.byStatus.map((row) => (
                <li key={row.status} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{MEDIA_STATUS_LABEL[row.status as keyof typeof MEDIA_STATUS_LABEL] ?? row.status}</span>
                  <span className="muted">
                    {row.files} file(s) · {readableByteSize(Number(row.bytes))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {blocked ? (
        <section className="card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Uploading is paused</h2>
          <p style={{ marginBottom: '0.5rem' }}>{blocked}</p>
          <p style={{ marginBottom: 0 }}>
            <Link href="/teach#teacher-terms" className="btn">
              {terms.blockedBy === 'not_published' ? 'See where this is published' : 'Agree to the terms'}
            </Link>
          </p>
        </section>
      ) : (
        <UploadMedia
          remainingBytes={storage?.enforced && storage.remainingBytes !== null
            ? Number(storage.remainingBytes)
            : null}
        />
      )}

      <section className="card">
        <h2>Your files</h2>

        {assets.length === 0 ? (
          <p className="muted">Nothing uploaded yet.</p>
        ) : (
          <ul className="lessons">
            {assets.map((asset) => (
              <li key={asset.id}>
                <span className="n">{MEDIA_STATUS_LABEL[asset.status]}</span>
                <span className="t" style={{ minWidth: 0, flex: 1 }}>
                  <strong>{asset.displayName}</strong>
                  <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
                    {asset.mimeType} · {readableByteSize(asset.byteSize)}
                    {asset.durationSeconds !== null &&
                      ` · ${String(Math.round(asset.durationSeconds / 60))} min`}
                  </span>
                  {asset.status === 'pending' && (
                    <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
                      Waiting for verification. It cannot be attached to a lesson until a staff
                      member has confirmed the file arrived.
                    </span>
                  )}
                  {asset.status === 'quarantined' && (
                    <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
                      Held for review, and every copy derived from it has been withdrawn.
                    </span>
                  )}
                </span>
                {asset.status === 'available' && <span className="badge">Ready</span>}
                <span style={{ display: 'block', marginTop: '0.4rem' }}>
                  <MasterPlayer assetId={asset.id} />
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="muted" style={{ fontSize: '0.9rem', marginTop: '0.75rem' }}>
          Only platform staff can withdraw a file, and they need a written reason
          to do it. If something here has to come down,{' '}
          <Link href="/support">contact support</Link>.
        </p>
      </section>
    </div>
  );
}
