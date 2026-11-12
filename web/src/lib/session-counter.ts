/** A counter kept only in component memory; no storage, telemetry or account data. */
export const MAX_SESSION_COUNT = 999_999;
export type CounterState = { count: number; confirmingReset: boolean };
export type CounterAction = 'increase' | 'decrease' | 'ask-reset' | 'cancel-reset' | 'confirm-reset';
export const initialCounterState:CounterState = { count: 0, confirmingReset: false };
export function sessionCounter(state: CounterState, action: CounterAction):CounterState {
  switch (action) {
    case 'increase': return state.confirmingReset ? state : { ...state, count: Math.min(MAX_SESSION_COUNT,state.count+1) };
    case 'decrease': return state.confirmingReset ? state : { ...state, count: Math.max(0,state.count-1) };
    case 'ask-reset': return state.count>0 ? { ...state, confirmingReset: true } : state;
    case 'cancel-reset': return { ...state, confirmingReset: false };
    case 'confirm-reset': return state.confirmingReset ? { count:0, confirmingReset:false } : state;
  }
}
