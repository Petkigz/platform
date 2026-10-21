'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { readableByteSize } from '@/lib/media';

type UnfinishedAsset = {
  id: string;
  displayName: string | null;
  mimeType: string;
  byteSize: number;
  status: string;
  uploader: string | null;
};

export type UnfinishedUpload = {
  key: string;
  uploadId: string;
  /** When the upload was opened, if storage said. */
  initiated: string | null;
  /** Null when the key was not derived from an asset this platform knows. */
  assetId: string | null;
  asset: UnfinishedAsset | null;
};

type ListingResponse = {
  ok?: boolean;
  error?: string;
  data?: { capped: boolean; uploads: UnfinishedUpload[] };
};

type AbandonResponse = {
  ok?: boolean;
  error?: string;
  data?: { recorded: boolean; deleted: boolean; note: string | null };
};

/** How long an upload has been sitting there, which is the reason to end it. */
function openedLabel(initiated: string | null): string {
  if (!initiated) return 'opened at a time storage did not report';
  const when = new Date(initiated);
  if (Number.isNaN(when.getTime())) return `opened ${initiated}`;
  const days = Math.floor((Date.now() - when.getTime()) / 86_400_000);
  const date = when.toLocaleDateString();
  if (days < 1) return `opened ${date}`;
  return `opened ${date} · ${String(days)} day${days === 1 ? '' : 's'} ago`;
}

/**
 * The bytes nobody finished sending.
 *
 * A multipart upload stores its parts as they arrive, and the object does not
 * exist until the upload is completed. So an upload nobody finished — a tab closed
 * at part 300 of 512, a browser that ran out of memory, a teacher who gave up —
 * leaves bytes in the bucket that no row in this schema mentions. They are billed
 * as storage, they cannot be served, and until this panel existed nothing in the
 * platform could find them, because the upload id is storage's and the schema
 * records the file that was declared rather than the transfer that stalled.
 *
 * Storage ends an incomplete upload on its own lifecycle after seven days, so
 * this is not a leak and nothing here is urgent. What it is: a week of storage per
 * abandoned transfer, and a list nobody could read. Ending one early needs a
 * written reason, like every other reversal here, and the reason is recorded
 * before storage is asked to delete anything — so a refusal leaves a record of the
 * decision instead of leaving a deletion with no record at all.
 *
 * The listing is fetched on a button rather than on load. It is a request to the
 * bucket, which costs a small amount of money and a moment, and the page already
 * reads the moderation queue; paying for it on every visit to look at something
 * that is usually empty is not a trade worth making silently.
 */
export function UnfinishedUploads() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [looked, setLooked] = useState(false);
  const [uploads, setUploads] = useState<UnfinishedUpload[]>([]);
  const [capped, setCapped] = useState(false);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);

  async function look() {
    setMessage(null);
    setBusyId(null);
    const response = await fetch('/api/admin/media', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'list_unfinished_uploads' }),
    });
    const json = (await response.json().catch(() => ({}))) as ListingResponse;
    setLooked(true);

    if (!response.ok || !json.data) {
      setUploads([]);
      setCapped(false);
      setMessage({ tone: 'error', text: json.error ?? 'The bucket could not be asked.' });
      return;
    }

    setUploads(json.data.uploads);
    setCapped(json.data.capped);
  }

  async function abandon(upload: UnfinishedUpload) {
    const reason = (reasons[upload.uploadId] ?? '').trim();
    if (reason.length === 0) {
      setMessage({
        tone: 'error',
        text: 'Say why these bytes are not going to arrive. A deletion with no reason cannot be defended later.',
      });
      return;
    }
    if (!upload.assetId) return;

    setBusyId(upload.uploadId);
    setMessage(null);

    const response = await fetch('/api/admin/media', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'abandon_upload',
        assetId: upload.assetId,
        uploadId: upload.uploadId,
        reason,
      }),
    });
    const json = (await response.json().catch(() => ({}))) as AbandonResponse;
    setBusyId(null);

    if (!response.ok || !json.data) {
      setMessage({ tone: 'error', text: json.error ?? 'That was not recorded.' });
      return;
    }

    setReasons((current) => ({ ...current, [upload.uploadId]: '' }));
    setUploads((current) => current.filter((entry) => entry.uploadId !== upload.uploadId));
    setMessage({
      tone: 'info',
      text: json.data.deleted
        ? json.data.note ??
          'The parts are deleted and the decision is in the audit trail. The file itself is untouched.'
        : `Recorded, but storage did not delete the parts: ${json.data.note ?? 'it refused'}`,
    });
    startTransition(() => router.refresh());
  }

  return (
    <section className="card" style={{ display: 'grid', gap: '0.6rem' }}>
      <h2>Uploads nobody finished</h2>
      <p className="muted">
        Parts of a file that were sent and never assembled. They are in the bucket
        and not in any list above, because the object they would become does not
        exist yet. Storage deletes them on its own after seven days; ending one
        here stops paying for it sooner and records who decided.
      </p>

      <div>
        <button
          type="button"
          className="btn secondary"
          disabled={pending || busyId !== null}
          onClick={() => void look()}
        >
          {looked ? 'Ask the bucket again' : 'Look in the bucket'}
        </button>
      </div>

      {message && (
        <p className={message.tone === 'error' ? 'error' : 'muted'} role="status">
          {message.text}
        </p>
      )}

      {capped && (
        <p className="notice warn">
          Storage has more unfinished uploads than this read. What is listed is the
          first pages of them, oldest first; the rest are still there.
        </p>
      )}

      {looked && uploads.length === 0 && (
        <p className="empty">
          Nothing is unfinished. Every upload opened in this bucket was completed
          or abandoned.
        </p>
      )}

      {uploads.map((upload) => (
        <div className="card" key={upload.uploadId} style={{ display: 'grid', gap: '0.5rem' }}>
          <p style={{ margin: 0 }}>
            <strong>{upload.asset?.displayName ?? 'A file nobody named'}</strong>
            {upload.asset ? (
              <>
                {' — '}
                {upload.asset.mimeType} · declared {readableByteSize(upload.asset.byteSize)} ·{' '}
                {upload.asset.status}
                {upload.asset.uploader ? ` · uploaded by ${upload.asset.uploader}` : ''}
              </>
            ) : null}
          </p>

          <p className="muted" style={{ fontSize: '0.9rem', margin: 0 }}>
            {openedLabel(upload.initiated)}
          </p>

          <p className="muted" style={{ fontSize: '0.85rem', margin: 0, wordBreak: 'break-all' }}>
            {upload.key} · {upload.uploadId}
          </p>

          {upload.assetId ? (
            <>
              <label className="eyebrow" htmlFor={`abandon-${upload.uploadId}`}>
                Why these bytes are not going to arrive
              </label>
              <input
                id={`abandon-${upload.uploadId}`}
                value={reasons[upload.uploadId] ?? ''}
                onChange={(event) =>
                  setReasons((current) => ({ ...current, [upload.uploadId]: event.target.value }))
                }
                maxLength={2000}
                placeholder="The teacher left it in June, the file was re-sent, nobody owns it"
                style={{ width: '100%' }}
              />
              <div>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={pending || busyId !== null}
                  onClick={() => void abandon(upload)}
                >
                  End this upload
                </button>
              </div>
            </>
          ) : (
            <p className="muted" style={{ fontSize: '0.9rem', margin: 0 }}>
              This key was not derived from an asset, so there is nothing to record
              the decision against and no button here. Storage will end it on its
              own within seven days.
            </p>
          )}
        </div>
      ))}

      <p className="muted" style={{ fontSize: '0.9rem' }}>
        Ending an upload deletes parts, not files. The asset row is left exactly as
        it was — still <code>pending</code> if the teacher has not finished, still{' '}
        <code>available</code> if a later attempt succeeded and these are the
        leftovers of an earlier one — because a stalled transfer says nothing about
        the file. Withdrawing a file is a different decision with a different
        button.
      </p>
    </section>
  );
}
