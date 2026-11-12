'use client';
import { useReducer } from 'react';
import { initialCounterState, MAX_SESSION_COUNT, sessionCounter } from '@/lib/session-counter';

export function Counter() {
  const [state,dispatch]=useReducer(sessionCounter,initialCounterState);
  return (
    <section className="card" aria-labelledby="counter-heading">
      <h2 id="counter-heading">Your count</h2>
      <p className="muted">Use this for a count of your choice. There is no required target.</p>
      <output aria-label="Current count" aria-live="polite" aria-atomic="true" style={{display:'block',fontSize:'3rem',fontWeight:700,margin:'1rem 0'}}>
        {state.count}
      </output>
      <div className="row" style={{gap:'0.75rem',flexWrap:'wrap'}}>
        <button type="button" className="btn" disabled={state.confirmingReset || state.count>=MAX_SESSION_COUNT} onClick={()=>dispatch('increase')}>Count one</button>
        <button type="button" className="btn secondary" disabled={state.confirmingReset || state.count===0} onClick={()=>dispatch('decrease')}>Undo one</button>
        <button type="button" className="btn ghost" disabled={state.confirmingReset || state.count===0} onClick={()=>dispatch('ask-reset')}>Reset</button>
      </div>
      {state.confirmingReset && (
        <div className="notice warn" role="group" aria-label="Confirm reset" style={{marginTop:'1rem'}}>
          <p>Reset this count to zero?</p>
          <div className="row" style={{gap:'0.75rem',flexWrap:'wrap'}}>
            <button type="button" className="btn secondary" onClick={()=>dispatch('confirm-reset')}>Yes, reset</button>
            <button type="button" className="btn ghost" onClick={()=>dispatch('cancel-reset')}>Keep count</button>
          </div>
        </div>
      )}
      {state.count===MAX_SESSION_COUNT && <p className="muted">The counter has reached its limit.</p>}
    </section>
  );
}
