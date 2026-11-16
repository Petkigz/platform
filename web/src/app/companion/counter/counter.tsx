'use client';
import { useReducer } from 'react';
import { initialCounterState, MAX_SESSION_COUNT, sessionCounter } from '@/lib/session-counter';
import { useT } from '@/lib/i18n/client';

export function Counter() {
  const t = useT();
  const [state,dispatch]=useReducer(sessionCounter,initialCounterState);
  return (
    <section className="card companion-tool" aria-labelledby="counter-heading">
      <h2 id="counter-heading">{t('companion.counterHeading')}</h2>
      <p className="muted">{t('companion.counterToolLede')}</p>
      <output aria-label={t('companion.counterCurrent')} aria-live="polite" aria-atomic="true" className="counter-count">
        {state.count}
      </output>
      <div className="counter-actions">
        <button type="button" className="btn counter-tap" disabled={state.confirmingReset || state.count>=MAX_SESSION_COUNT} onClick={()=>dispatch('increase')}>{t('companion.counterOne')}</button>
        <button type="button" className="btn secondary" disabled={state.confirmingReset || state.count===0} onClick={()=>dispatch('decrease')}>{t('companion.counterUndo')}</button>
        <button type="button" className="btn ghost" disabled={state.confirmingReset || state.count===0} onClick={()=>dispatch('ask-reset')}>{t('companion.counterReset')}</button>
      </div>
      {state.confirmingReset && (
        <div className="notice warn" role="group" aria-label={t('companion.counterConfirmLabel')} style={{marginTop:'1rem'}}>
          <p>{t('companion.counterConfirmQuestion')}</p>
          <div className="counter-actions">
            <button type="button" className="btn secondary" onClick={()=>dispatch('confirm-reset')}>{t('companion.counterYes')}</button>
            <button type="button" className="btn ghost" onClick={()=>dispatch('cancel-reset')}>{t('companion.counterKeep')}</button>
          </div>
        </div>
      )}
      {state.count===MAX_SESSION_COUNT && <p className="muted">{t('companion.counterLimit')}</p>}
    </section>
  );
}
