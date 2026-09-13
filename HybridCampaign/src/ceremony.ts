import { resolveChaosOutcome, rollChaos } from './market';
import type { CeremonyCueKind, CeremonyTimeline, Lot, MarketState, Visit } from './types';

export const cueDuration: Record<CeremonyCueKind, number> = {
  'cassian-opening': 6000, address: 7000, reveal: 7000, 'security-interruption': 0, catalogue: 0,
};

export function lotCues(_lot: Lot): CeremonyCueKind[] { return ['address', 'reveal']; }

export function running(cue: CeremonyCueKind, lotPosition: number, mode: CeremonyTimeline['mode']): CeremonyTimeline {
  return { status: 'running', mode, cue, lotPosition, startedAt: Date.now(), durationMs: cueDuration[cue], revision: Date.now() };
}
function continuing(timeline: CeremonyTimeline, cue: CeremonyCueKind, lotPosition: number): CeremonyTimeline {
  return { ...running(cue, lotPosition, timeline.mode), replaying: timeline.replaying };
}

export function activeVisit(state: MarketState) { return state.visits.find((visit) => visit.id === state.activeVisitId); }
export function replaceVisit(state: MarketState, visit: Visit): MarketState { return { ...state, visits: state.visits.map((entry) => entry.id === visit.id ? visit : entry) }; }

export function startCeremony(state: MarketState): MarketState {
  const visit = activeVisit(state);
  if (!visit) throw new Error('Prepare a visit before starting the ceremony.');
  if (visit.missedCassian) throw new Error('Cassian is unavailable for this visit.');
  if (visit.phase !== 'prelude' || state.ceremony.status !== 'idle') throw new Error('This ceremony has already begun or this visit is no longer prepared.');
  const prepared = { ...visit, chaos: visit.chaos ?? rollChaos(visit), phase: 'rolling' as const };
  return { ...replaceVisit(state, prepared), ceremony: running('cassian-opening', 0, state.ceremony.mode) };
}

export function replayCeremony(state: MarketState): MarketState {
  const visit = activeVisit(state);
  if (!visit) throw new Error('Prepare a visit before replaying the ceremony.');
  if (visit.missedCassian) throw new Error('Cassian is unavailable for this visit.');
  if (state.ceremony.status !== 'catalogue') throw new Error('The ceremony can be restarted only after the catalogue opens.');
  const replayed = { ...visit, phase: 'rolling' as const };
  return { ...replaceVisit(state, replayed), ceremony: { ...running('cassian-opening', 0, state.ceremony.mode), replaying: true } };
}

export function advanceCeremony(state: MarketState): MarketState {
  const visit = activeVisit(state);
  if (!visit) throw new Error('Prepare a visit before advancing the ceremony.');
  if (state.ceremony.status === 'awaiting-chaos-resolution') throw new Error('Resolve the Chaos interruption before advancing the ceremony.');
  if (state.ceremony.status === 'catalogue' || state.ceremony.status === 'idle') throw new Error('There is no active ceremony cue to advance.');
  const timeline = state.ceremony;
  if (timeline.cue === 'cassian-opening') return { ...state, ceremony: continuing(timeline, 'address', 1) };
  if (timeline.cue === 'security-interruption') return { ...state, ceremony: { ...timeline, status: 'awaiting-chaos-resolution', startedAt: undefined, pausedRemainingMs: undefined, revision: Date.now() } };
  const lot = visit.lots[timeline.lotPosition - 1];
  const cues = lotCues(lot);
  const index = cues.indexOf(timeline.cue);
  if (index < cues.length - 1) return { ...state, ceremony: continuing(timeline, cues[index + 1], timeline.lotPosition) };
  if (timeline.lotPosition < visit.lots.length) {
    const next = visit.lots[timeline.lotPosition];
    return { ...state, ceremony: continuing(timeline, lotCues(next)[0], timeline.lotPosition + 1) };
  }
  if (visit.chaos?.triggered && !timeline.replaying) return { ...replaceVisit(state, { ...visit, phase: 'chaos' }), ceremony: running('security-interruption', 6, timeline.mode) };
  return { ...replaceVisit(state, { ...visit, phase: 'catalogue' }), ceremony: { ...timeline, status: 'catalogue', cue: 'catalogue', durationMs: 0, startedAt: Date.now(), revision: Date.now() } };
}

export function pauseCeremony(state: MarketState): MarketState {
  if (state.ceremony.status !== 'running' || !state.ceremony.startedAt) throw new Error('Only a running ceremony may be paused.');
  const remaining = Math.max(0, state.ceremony.durationMs - (Date.now() - state.ceremony.startedAt));
  return { ...state, ceremony: { ...state.ceremony, status: 'paused', pausedRemainingMs: remaining, startedAt: undefined, revision: Date.now() } };
}

export function resumeCeremony(state: MarketState): MarketState {
  if (state.ceremony.status !== 'paused') throw new Error('Only a paused ceremony may be resumed.');
  return { ...state, ceremony: { ...state.ceremony, status: 'running', startedAt: Date.now(), durationMs: state.ceremony.pausedRemainingMs ?? state.ceremony.durationMs, pausedRemainingMs: undefined, revision: Date.now() } };
}

/** Chaos needs an explicit GM decision before the public register can open. */
export function resolveChaosCeremony(state: MarketState, outcome: 'full-success' | 'primary-success' | 'failure', attended: boolean): MarketState {
  const visit = activeVisit(state);
  if (!visit || state.ceremony.status !== 'awaiting-chaos-resolution') throw new Error('The ceremony is not awaiting a Chaos resolution.');
  const resolved = resolveChaosOutcome(state, visit.id, outcome, attended);
  return { ...resolved, ceremony: { ...resolved.ceremony, status: 'catalogue', cue: 'catalogue', lotPosition: visit.lots.length, startedAt: undefined, pausedRemainingMs: undefined, durationMs: 0, revision: Date.now() } };
}
