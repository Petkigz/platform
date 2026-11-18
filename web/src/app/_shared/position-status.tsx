'use client';

import { useLocaleCode, useT } from '@/lib/i18n/client';
import { formatDateTime } from '@/lib/i18n/format';
import { formatPosition } from '@/lib/resume';
import type { useMediaPosition } from './use-media-position';

type Position = ReturnType<typeof useMediaPosition>;

/** A place the player cannot reach: it stops at twenty-four hours. */
const PLAYER_LIMIT = 86400;

/**
 * Everything a player says about the saved place: checking it, a choice
 * between two places, places kept on this device, and the notice a learner
 * reads before turning that on.
 *
 * **In the language of the page.** The lesson page puts a provider round its
 * players that carries these sentences; anywhere else (`useT()` with nothing
 * above it that has them) they are English, as they were. A date is written
 * the way that language writes one and names its time zone.
 *
 * The notice under the tick box is what the learner agrees to. It is written
 * in twenty-seven languages by the builder and **no speaker has read it**.
 */
export function PositionStatus({ position }: { position: Position }) {
  const t = useT();
  const locale = useLocaleCode();
  const { ready, notice, saveError, conflict, useServer, useLocal,
    legacyPlace, legacyError, reviewLegacyPlace, dismissLegacyPlace,
    legacyRecoveries, reviewLegacyRecovery, discardLegacyRecovery,
    recoveryEnabled, recoveryAvailable, recoveryError, recoveries, toggleRecovery, discardRecovery, useRecovery } = position;
  const when = (value: string | number) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : formatDateTime(locale, date.toISOString());
  };
  return (
    <div style={{ display: 'grid', gap: '0.4rem' }}>
      {!ready && <p className="meta" role="status">{t('player.checking')}</p>}
      {(saveError || notice) && <p className="meta" role="status">{saveError ? <span className="danger">{saveError}</span> : notice}</p>}
      {legacyPlace !== null && (
        <div role="group" aria-label={t('player.legacyGroup')} style={{ display: 'grid', gap: '0.4rem' }}>
          <p className="meta" style={{ margin: 0 }}>
            {t('player.legacyPlace', { at: formatPosition(legacyPlace) })}
            {legacyPlace > PLAYER_LIMIT ? ` ${t('player.limit')}` : ''}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button type="button" className="secondary" disabled={Boolean(conflict) || recoveries.length > 0} onClick={reviewLegacyPlace}>{t('player.legacyReview')}</button>
            <button type="button" className="ghost" onClick={dismissLegacyPlace}>{t('player.notNow')}</button>
          </div>
          {legacyError && <p className="meta danger" role="status">{legacyError}</p>}
        </div>
      )}
      {recoveryAvailable && (
        <div style={{ display: 'grid', gap: '0.3rem' }}>
          <label>
            <input type="checkbox" checked={recoveryEnabled} onChange={(event) => toggleRecovery(event.currentTarget.checked)} />{' '}
            {t('player.recoveryToggle')}
          </label>
          <p className="meta" style={{ margin: 0 }}>
            {t('player.recoveryNotice')}
          </p>
        </div>
      )}
      {recoveryError && <p className="meta danger" role="status">{recoveryError}</p>}
      {legacyRecoveries.length > 0 && (
        <div role="group" aria-label={t('player.earlierGroup')} style={{ display: 'grid', gap: '0.5rem' }}>
          <p className="meta" style={{ margin: 0 }}>
            {t('player.earlierIntro')}
          </p>
          {legacyRecoveries.map((record) => {
            const vars = { at: formatPosition(record.seconds), when: when(record.updatedAt) };
            return (
              <div key={record.sessionId} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <span><bdi>{vars.at}</bdi> · <bdi>{vars.when}</bdi></span>
                <button type="button" className="secondary" disabled={Boolean(conflict) || recoveries.length > 0} onClick={() => reviewLegacyRecovery(record)} aria-label={t('player.earlierReviewLabel', vars)}>{t('player.earlierReview')}</button>
                <button type="button" className="ghost" disabled={Boolean(conflict)} onClick={() => discardLegacyRecovery(record)} aria-label={t('player.earlierDiscardLabel', vars)}>{t('player.earlierDiscard')}</button>
              </div>
            );
          })}
        </div>
      )}
      {recoveries.length > 0 && (
        <div role="group" aria-label={t('player.deviceGroup')} style={{ display: 'grid', gap: '0.5rem' }}>
          <p role="status" style={{ margin: 0 }}>{t('player.deviceIntro')}</p>
          {recoveries.map((record) => {
            const vars = { at: formatPosition(record.seconds), when: when(record.updatedAt) };
            return (
              <div key={record.sessionId} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <span><bdi>{vars.at}</bdi> · <bdi>{vars.when}</bdi></span>
                <button type="button" className="secondary" disabled={Boolean(conflict)} onClick={() => useRecovery(record)} aria-label={t('player.deviceReviewLabel', vars)}>{t('player.deviceReview')}</button>
                <button type="button" className="ghost" onClick={() => discardRecovery(record)} aria-label={t('player.deviceDiscardLabel', vars)}>{t('player.deviceDiscard')}</button>
              </div>
            );
          })}
        </div>
      )}
      {conflict && (
        <div role="group" aria-label={t('player.conflictGroup')} style={{ display: 'grid', gap: '0.5rem' }}>
          <p role="status" style={{ margin: 0 }}>
            {t('player.conflictIntro')}{' '}
            {conflict.server.seconds === null
              ? t('player.conflictNone')
              : `${t('player.conflictSaved', { at: formatPosition(conflict.server.seconds) })}${conflict.server.seconds > PLAYER_LIMIT ? ` ${t('player.limit')}` : ''}`}{' '}
            {t('player.conflictLocal', { at: formatPosition(conflict.local) })}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button type="button" className="secondary" onClick={useServer}>{t('player.useSaved')}</button>
            <button type="button" className="secondary" onClick={useLocal}>{t('player.keepLocal')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
