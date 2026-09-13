import { useEffect } from 'react';
import { activeVisit, advanceCeremony, pauseCeremony, replayCeremony, resumeCeremony, startCeremony } from '../ceremony';
import type { MarketState } from '../types';
import { errorText } from '../ui/ErrorDialog';

export function CeremonyClock({ state, commit, onError, report }: { state: MarketState; commit: (state: MarketState) => Promise<void>; onError?: (error: unknown) => void; report?: (message: string) => void }) {
  useEffect(() => {
    if (state.ceremony.status !== 'running' || !state.ceremony.startedAt) return;
    const remaining = Math.max(0, state.ceremony.durationMs - (Date.now() - state.ceremony.startedAt));
    const fail = onError ?? ((error: unknown) => report?.(error instanceof Error ? error.message : String(error)));
    const timer = window.setTimeout(() => void commit(advanceCeremony(state)).catch(fail), remaining);
    return () => window.clearTimeout(timer);
  }, [state, commit, onError]);
  return null;
}

function statusText(state: MarketState) {
  const visit = activeVisit(state);
  if (!visit) return 'No visit prepared.';
  if (state.ceremony.status === 'idle') return 'Prepared · awaiting Cassian’s opening.';
  if (state.ceremony.status === 'awaiting-chaos-resolution') return 'Chaos interruption · GM resolution required.';
  if (state.ceremony.status === 'catalogue') return 'Catalogue open.';
  const cue = state.ceremony.cue === 'cassian-opening' ? 'Cassian’s opening' : state.ceremony.cue === 'address' ? `Miren’s address · lot ${state.ceremony.lotPosition}` : state.ceremony.cue === 'reveal' ? `Miren’s reveal · lot ${state.ceremony.lotPosition}` : 'Ceremony in progress';
  return `${state.ceremony.status === 'paused' ? 'Paused · ' : ''}${cue}.`;
}

export function CeremonyCommand({ state, save, prepare, onError, report, children }: { state: MarketState; save: (next: MarketState) => void; prepare: () => void; onError?: (error: unknown) => void; report?: (message: string) => void; children?: React.ReactNode }) {
  const fail = onError ?? ((error: unknown) => { const text = errorText(error); report?.(text); dispatchEvent(new CustomEvent('gilded-index-error', { detail: text })); });
  const action = (change: () => MarketState) => { try { save(change()); } catch (error) { fail(error); } };
  return <section className="ceremony-command" aria-labelledby="ceremony-command-title"><div><p className="eyebrow">Shared player presentation</p><h2 id="ceremony-command-title">Ceremony Command</h2><p className="ceremony-status" role="status">{statusText(state)}</p></div><div className="ceremony-command-actions"><button onClick={prepare}>Prepare visit</button>{state.ceremony.status === 'idle' ? <button onClick={() => action(() => startCeremony(state))}>Start ceremony</button> : null}{state.ceremony.status === 'running' ? <button onClick={() => action(() => pauseCeremony(state))}>Pause ceremony</button> : null}{state.ceremony.status === 'paused' ? <button onClick={() => action(() => resumeCeremony(state))}>Resume ceremony</button> : null}{['running', 'paused'].includes(state.ceremony.status) ? <button onClick={() => action(() => advanceCeremony(state))}>Advance cue</button> : null}{state.ceremony.status === 'catalogue' ? <button onClick={() => action(() => replayCeremony(state))}>Restart ceremony</button> : null}</div>{children}</section>;
}
