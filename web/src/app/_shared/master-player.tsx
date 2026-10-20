'use client';

import { useState } from 'react';

type MasterResponse = {
  ok?: boolean;
  message?: string;
  data?: {
    url: string;
    kind: 'video' | 'audio' | null;
    displayName: string | null;
    mimeType: string;
    byteSize: number;
    expiresAt: string;
  };
};

/**
 * Watch one uploaded master.
 *
 * Nothing is fetched until somebody asks: a media library can hold dozens of
 * files, and minting a signed URL for each of them at page load would hand the
 * browser a pile of bearer tokens for the archive to keep in memory. So this is a
 * button, and closing it drops the URL.
 *
 * Whether the caller may watch is decided by `may_watch_master()` in the
 * database and reached through `master_preview_target()`. This component asks,
 * and shows the answer — including "that file is not available to you", which is
 * what the route says for a file that is not theirs and for one that does not
 * exist, deliberately the same.
 */
export function MasterPlayer({
  assetId,
  label,
}: {
  assetId: string;
  /** What the button says. Staff are looking before they confirm; a teacher is not. */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [data, setData] = useState<MasterResponse['data'] | null>(null);
  const [error, setError] = useState('');

  async function watch() {
    setOpen(true);
    setBusy(true);
    setError('');
    setUrl(null);
    setData(null);
    try {
      const response = await fetch(`/api/media/master?asset=${encodeURIComponent(assetId)}`, {
        cache: 'no-store',
      });
      const result = (await response.json().catch(() => ({}))) as MasterResponse;
      if (!response.ok || !result.data?.url) {
        throw new Error(result.message ?? 'That file could not be opened.');
      }
      setData(result.data);
      setUrl(result.data.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That file could not be opened.');
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setUrl(null);
    setData(null);
    setError('');
  }

  if (!open) {
    return (
      <button type="button" className="btn ghost" onClick={() => void watch()}>
        {label ?? 'Watch'}
      </button>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
      {busy && <p className="muted">Opening the file…</p>}

      {error && <p className="muted">{error}</p>}

      {url && data?.kind === 'video' && (
        <video
          controls
          playsInline
          preload="metadata"
          src={url}
          aria-label={data.displayName ?? 'Uploaded file'}
          style={{
            width: '100%',
            maxHeight: '60vh',
            borderRadius: '0.75rem',
            background: '#101510',
          }}
        >
          Your browser cannot play this video.
        </video>
      )}

      {url && data?.kind === 'audio' && (
        <audio
          controls
          preload="metadata"
          src={url}
          aria-label={data.displayName ?? 'Uploaded file'}
          style={{ width: '100%' }}
        >
          Your browser cannot play this audio.
        </audio>
      )}

      {url && data?.kind === null && (
        <p className="muted">
          This file is {data.mimeType}, which a browser cannot play. It is stored,
          and it can be attached to a lesson as a document.
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {error && (
          <button type="button" className="btn secondary" onClick={() => void watch()}>
            Try again
          </button>
        )}
        <button type="button" className="btn ghost" onClick={close}>
          Close
        </button>
      </div>

      {url && (
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          This is the file as it was uploaded, not the copy learners are served.
          The link stops working in fifteen minutes.
        </p>
      )}
    </div>
  );
}
