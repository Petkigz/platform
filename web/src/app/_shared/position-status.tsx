'use client';

import { formatPosition } from '@/lib/resume';
import type { useMediaPosition } from './use-media-position';

type Position = ReturnType<typeof useMediaPosition>;

export function PositionStatus({ position }: { position: Position }) {
  const { ready, notice, saveError, conflict, useServer, useLocal } = position;
  return (
    <div style={{ display: 'grid', gap: '0.4rem' }}>
      {!ready && <p className="meta" role="status">Checking your saved place…</p>}
      {(saveError || notice) && <p className="meta" role="status">{saveError ? <span className="danger">{saveError}</span> : notice}</p>}
      {conflict && (
        <div role="group" aria-label="Choose your saved place" style={{ display: 'grid', gap: '0.5rem' }}>
          <p role="status" style={{ margin: 0 }}>
            Your saved place changed elsewhere. Saved place: {formatPosition(conflict.server.seconds)}. This player: {formatPosition(conflict.local)}. Which should be kept?
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button type="button" className="secondary" onClick={useServer}>Use saved place</button>
            <button type="button" className="secondary" onClick={useLocal}>Keep this player’s place</button>
          </div>
        </div>
      )}
    </div>
  );
}
