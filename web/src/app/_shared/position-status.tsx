'use client';

import { formatPosition } from '@/lib/resume';
import type { useMediaPosition } from './use-media-position';

type Position = ReturnType<typeof useMediaPosition>;

export function PositionStatus({ position }: { position: Position }) {
  const { ready, notice, saveError, conflict, useServer, useLocal,
    recoveryEnabled, recoveryAvailable, recoveryError, recoveries, toggleRecovery, discardRecovery, useRecovery } = position;
  return (
    <div style={{ display: 'grid', gap: '0.4rem' }}>
      {!ready && <p className="meta" role="status">Checking your saved place…</p>}
      {(saveError || notice) && <p className="meta" role="status">{saveError ? <span className="danger">{saveError}</span> : notice}</p>}
      {recoveryAvailable && (
        <div style={{ display: 'grid', gap: '0.3rem' }}>
          <label>
            <input type="checkbox" checked={recoveryEnabled} onChange={(event) => toggleRecovery(event.currentTarget.checked)} />{' '}
            Keep a temporary recovery place on this browser
          </label>
          <p className="meta" style={{ margin: 0 }}>
            Optional. Anyone with access to this browser profile may see lesson identifiers and positions, including for other accounts using it. Turning this off removes recovery places for all accounts on this browser. Your account must be confirmed online before a place can be stored. Records expire after seven days and are cleared on a later visit; storage may be unavailable or cleared sooner.
          </p>
        </div>
      )}
      {recoveryError && <p className="meta danger" role="status">{recoveryError}</p>}
      {recoveries.length > 0 && (
        <div role="group" aria-label="Device recovery places" style={{ display: 'grid', gap: '0.5rem' }}>
          <p role="status" style={{ margin: 0 }}>A place from this browser may not have reached your account. Review or discard each place before automatic saving continues. Choosing one leaves other places for a later visit.</p>
          {recoveries.map((record) => (
            <div key={record.sessionId} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <span>{formatPosition(record.seconds)} · {new Date(record.updatedAt).toLocaleString()}</span>
              <button type="button" className="secondary" disabled={Boolean(conflict)} onClick={() => useRecovery(record)} aria-label={`Review device place ${formatPosition(record.seconds)} from ${new Date(record.updatedAt).toLocaleString()}`}>Review this place</button>
              <button type="button" className="ghost" onClick={() => discardRecovery(record)} aria-label={`Discard device place ${formatPosition(record.seconds)} from ${new Date(record.updatedAt).toLocaleString()}`}>Discard</button>
            </div>
          ))}
        </div>
      )}
      {conflict && (
        <div role="group" aria-label="Choose your saved place" style={{ display: 'grid', gap: '0.5rem' }}>
          <p role="status" style={{ margin: 0 }}>
            The account’s saved place may differ from this player.{' '}
            {conflict.server.seconds === null ? 'No saved place.' : `Saved place: ${formatPosition(conflict.server.seconds)}${conflict.server.seconds > 86400 ? ' (player limit: 24 hours)' : ''}.`}{' '}
            This player: {formatPosition(conflict.local)}. Which should be kept?
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
