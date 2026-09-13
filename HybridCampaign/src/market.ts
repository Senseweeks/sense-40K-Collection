import source from './data/catalogue.json' with { type: 'json' };
import type { AuctionCheck, BidderDeal, CampaignClock, CampaignClockCategory, CampaignClockStatus, CampaignDate, CampaignGovernance, CampaignRole, CampaignSourceStatus, CatalogueItem, ChaosEvent, EventInstance, EventOperationMode, EventResult, Lot, MarketHistoryEntry, MarketState, ObjectiveOffer, ObjectiveOfferRecipient, ObjectiveRecord, ObjectiveRewardType, Pool, RecipientType, RewardRecord, RewardStatus, SettlementRecord, TradeCoinDebt, TradeTransaction, UnderFireScenario, Visit } from './types';
import { bidders } from './data/bidders';
import { addCampaignDays, validateCampaignDate } from './campaign-time';

export const defaultObjectiveRecipients: ObjectiveOfferRecipient[] = [
  { id: 'gilded-index', name: 'The Gilded Index', type: 'index', active: true, canOfferObjectives: true },
  { id: 'the-cell', name: 'The Cell', type: 'cell', active: true, canOfferObjectives: false },
  { id: 'adeptus-astartes', name: 'Adeptus Astartes', type: 'faction', active: true, canOfferObjectives: true }, { id: 'adeptus-mechanicus', name: 'Adeptus Mechanicus', type: 'faction', active: true, canOfferObjectives: true }, { id: 'agents-imperium', name: 'Agents of the Imperium', type: 'faction', active: true, canOfferObjectives: true }, { id: 'astra-militarum', name: 'Astra Militarum', type: 'faction', active: true, canOfferObjectives: true }, { id: 'grey-knights', name: 'Grey Knights', type: 'faction', active: true, canOfferObjectives: true },
  { id: 'cassian-verid', name: 'Rogue Trader Cassian Verid', type: 'npc', active: true, canOfferObjectives: true }, { id: 'eremus-vahl', name: 'Tithe-House Provost Eremus Vahl', type: 'npc', active: true, canOfferObjectives: true }, { id: 'octavia-merrow', name: 'Tithe Prefect Octavia Merrow', type: 'npc', active: true, canOfferObjectives: true }, { id: 'marius-calthorne', name: 'Lord Governor Marius Calthorne', type: 'npc', active: true, canOfferObjectives: true }, { id: 'orest-valecourt', name: 'Inquisitor Orest Valecourt', type: 'npc', active: true, canOfferObjectives: true },
];

export const catalogue = source.items as CatalogueItem[];
/** v8 adds the universal operations bridge. */
export const CURRENT_STATE_VERSION = 14;
export const fieldAssetRule = source.fieldAssetRule;
export const campaignRoles: CampaignRole[] = ['owner-gm', 'gm', 'co-gm', 'player', 'display'];
export const campaignSourceStatuses: CampaignSourceStatus[] = ['active-canonical', 'current-implementation', 'planning-reference', 'draft-candidate', 'archived-superseded', 'external-official-reference'];
const DAYS_PER_MONTH = 28;
const MONTHS_PER_YEAR = 12;
const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR;

export function campaignDateFromImperialFraction(fraction: number, year: number, era: CampaignDate['era'], imperialOrigin: string): CampaignDate {
  if (!Number.isInteger(fraction) || fraction < 0 || fraction > 999 || !Number.isInteger(year) || year < 1 || !imperialOrigin.trim()) throw new Error('The Imperial campaign-date origin is invalid.');
  const dayOfYear = Math.floor((fraction / 1000) * DAYS_PER_YEAR);
  return { year, era, month: Math.floor(dayOfYear / DAYS_PER_MONTH) + 1, day: (dayOfYear % DAYS_PER_MONTH) + 1, imperialOrigin: imperialOrigin.trim() };
}

export const defaultCampaignGovernance = (): CampaignGovernance => {
  const imperialOrigin = '5 512 412.M42';
  const date = campaignDateFromImperialFraction(512, 412, 'M42', imperialOrigin);
  return { startDate: structuredClone(date), currentDate: structuredClone(date), imperialOrigin, rolePolicy: [...campaignRoles], identities: [], sourceStatuses: [...campaignSourceStatuses], sourceStatusPolicyVersion: 1, honourCatalogue: { targetCount: 60, reviewedCount: 17, availability: 'frozen' } };
};

export function formatCampaignDate(date: CampaignDate) { return `M${date.month} D${date.day}, ${date.year}.${date.era}`; }

export function validateCampaignGovernance(input: unknown): CampaignGovernance {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Campaign governance is required before preparing a visit.');
  const governance = input as CampaignGovernance;
  const validDate = (date: CampaignDate | undefined) => !!date && Number.isInteger(date.year) && date.year > 0 && date.era === 'M42' && Number.isInteger(date.month) && date.month >= 1 && date.month <= MONTHS_PER_YEAR && Number.isInteger(date.day) && date.day >= 1 && date.day <= DAYS_PER_MONTH && !!date.imperialOrigin?.trim();
  if (!validDate(governance.startDate) || !validDate(governance.currentDate) || !governance.imperialOrigin?.trim()) throw new Error('Campaign governance must use a valid M1-M12, day 1-28 campaign date.');
  if (!Array.isArray(governance.rolePolicy) || governance.rolePolicy.length !== campaignRoles.length || new Set(governance.rolePolicy).size !== campaignRoles.length || governance.rolePolicy.some((role) => !campaignRoles.includes(role))) throw new Error('Campaign governance has invalid role metadata.');
  if (!Array.isArray(governance.identities) || governance.identities.some((identity) => !identity.id?.trim() || !identity.name?.trim() || !campaignRoles.includes(identity.role)) || new Set(governance.identities.map((identity) => identity.id)).size !== governance.identities.length) throw new Error('Campaign governance has an invalid identity roster.');
  if (!Array.isArray(governance.sourceStatuses) || governance.sourceStatuses.length !== campaignSourceStatuses.length || new Set(governance.sourceStatuses).size !== campaignSourceStatuses.length || governance.sourceStatuses.some((status) => !campaignSourceStatuses.includes(status)) || governance.sourceStatusPolicyVersion !== 1) throw new Error('Campaign governance has an invalid source-status policy.');
  const honours = governance.honourCatalogue;
  if (!honours || honours.targetCount !== 60 || honours.reviewedCount !== 17 || honours.availability !== 'frozen') throw new Error('Campaign governance must retain the frozen 17-of-60 Kill Team Honour policy.');
  return governance;
}
const pools: Record<string, Pool[]> = {
  upgrade: ['standard', 'ordinary', 'powerful', 'exceptional'],
  fixed: ['unit3', 'unit4'],
};

export const defaultState = (): MarketState => ({
  stateVersion: CURRENT_STATE_VERSION, revision: 1, visits: [], exchangeRpPerTc: 3, cooldowns: {}, retired: [], audioMuted: true, campaignGovernance: defaultCampaignGovernance(), buyerRoster: ['The Cell'], bidderDeals: [], tradeCoinDebts: [], rewardRecords: [], objectiveOfferRecipients: structuredClone(defaultObjectiveRecipients),
  ceremony: { status: 'idle', mode: 'auto', cue: 'address', lotPosition: 0, durationMs: 0, revision: 1 }, campaignClocks: [], eventInstances: [],
});

/** Safely fills compatibility defaults without changing valid current semantics. */
export function migrateMarketState(raw: unknown): MarketState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid saved state.');
  const state = structuredClone(raw) as MarketState;
  state.stateVersion ??= 1;
  state.visits ??= [];
  state.cooldowns ??= {};
  state.retired ??= [];
  state.bidderDeals ??= [];
  state.tradeCoinDebts ??= [];
  state.rewardRecords ??= [];
  state.campaignClocks ??= [];
  state.eventInstances ??= [];
  state.campaignGovernance ??= defaultCampaignGovernance();
  state.buyerRoster ??= ['The Cell'];
  state.objectiveOfferRecipients = (state.objectiveOfferRecipients ?? structuredClone(defaultObjectiveRecipients)).map((recipient) => ({
    ...recipient,
    canOfferObjectives: recipient.canOfferObjectives ?? ['index', 'faction', 'npc'].includes(recipient.type),
  }));
  if (!state.objectiveOfferRecipients.some((recipient) => recipient.id === 'the-cell')) state.objectiveOfferRecipients.push(structuredClone(defaultObjectiveRecipients.find((recipient) => recipient.id === 'the-cell')!));
  for (const visit of state.visits) {
    visit.objectiveRecords ??= [];
    visit.tradeRequests ??= [];
    visit.settlements ??= [];
    visit.auctionChecks ??= [];
    visit.tradeCoin ??= { balance: 0, transactions: [] };
    for (const settlement of visit.settlements) {
      if (settlement.adaptation && !settlement.adaptation.temporalStatus) settlement.adaptation.temporalStatus = settlement.campaignSettledAt ? 'campaign' : 'legacy-pending';
    }
    for (const objective of visit.objectiveRecords) {
      objective.audit ??= [];
      for (const offer of objective.offers ?? []) offer.enabled ??= true;
      const selected = objective.selectedOfferId && objective.offers.find((offer) => offer.id === objective.selectedOfferId);
      if (selected && selected.recipientType !== 'index' && !(state.rewardRecords ?? []).some((reward) => reward.source === 'objective' && reward.visitId === visit.id && reward.objectiveId === objective.id && reward.offerId === selected.id)) {
        const now = objective.redeemedAt ?? objective.acquiredAt ?? new Date().toISOString();
        state.rewardRecords.push({ id: `objective-reward-${visit.id}-${objective.id}-${selected.id}`, recipientId: selected.recipientId, recipientName: selected.recipientName, recipientType: selected.recipientType, rewardType: selected.rewardType as Exclude<ObjectiveRewardType, 'tc'>, amount: selected.amount, detail: selected.detail, status: 'claimed', source: 'objective', visitId: visit.id, objectiveId: objective.id, offerId: selected.id, createdAt: now, updatedAt: now, audit: [] });
      }
    }
  }
  state.stateVersion = CURRENT_STATE_VERSION;
  return state;
}

export function seeded(seed: number) {
  let value = seed >>> 0;
  return () => { value += 0x6d2b79f5; let t = value; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const roll = (rng: () => number, die: number) => Math.floor(rng() * die) + 1;

function eligible(pool: Pool, state: MarketState, used: Set<string>) {
  return catalogue.filter((item) => item.pool === pool && !used.has(item.id) && !state.retired.includes(item.id) && !state.cooldowns[item.id]);
}
function pick(pool: Pool, state: MarketState, used: Set<string>, rng: () => number) {
  const candidates = eligible(pool, state, used);
  if (!candidates.length) throw new Error(`No eligible catalogue entries in ${pool}.`);
  return candidates[Math.floor(rng() * candidates.length)];
}
export function claimantsForItem(item: CatalogueItem) {
  if (!item.pool.startsWith('marquee')) return undefined;
  const tags = item.interestTags ?? [];
  const matches = bidders.map((bidder) => ({ name: bidder.name, score: bidder.interests.filter((tag) => tags.includes(tag)).length })).filter((bidder) => bidder.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  if (tags.includes('trazyn')) matches.unshift({ name: 'Trazyn the Infinite', score: 2 });
  const publicClaimants = matches.slice(0, 3);
  return publicClaimants.map((bidder, index) => ({ name: bidder.name, interest: bidder.score >= 2 ? 'Intense' as const : index === 0 ? 'Serious' as const : 'Curious' as const }));
}
function upgradePool(value: number): Pool { return value <= 8 ? 'standard' : value <= 15 ? 'ordinary' : value <= 19 ? 'powerful' : 'exceptional'; }

export function generateVisit(state: MarketState, seed = Date.now()): Visit {
  validateCampaignGovernance(state.campaignGovernance);
  const rng = seeded(seed);
  const used = new Set<string>();
  const lots: Lot[] = [];
  const add = (pool: Pool) => {
    let target = pool;
    if (!eligible(target, state, used).length && pool === 'unit4') target = 'unit3';
    if (!eligible(target, state, used).length && pool === 'unit3') target = 'unit4';
    const item = pick(target, state, used, rng); used.add(item.id);
    lots.push({ id: `${seed}-${lots.length + 1}`, itemId: item.id, position: lots.length + 1, pool: target, locked: false, status: 'available', claimants: claimantsForItem(item) });
  };
  add('field');
  add('field');
  for (let i = 0; i < 2; i += 1) add(upgradePool(roll(rng, 20)));
  add(roll(rng, 6) <= 4 ? 'unit3' : 'unit4');
  add(roll(rng, 2) === 1 ? 'marquee-unit' : 'marquee-relic');
  const debts = (state.tradeCoinDebts ?? []).filter((debt) => !debt.carriedToVisitId);
  const debt = debts.reduce((total, entry) => total + entry.amount, 0);
  const id = `visit-${seed}`;
  const transactions: TradeTransaction[] = debt ? [{ id: `debt-${id}`, label: `GM correction debt carried from prior visit${debts.length > 1 ? 's' : ''}`, amount: -debt, createdAt: new Date().toISOString(), kind: 'legacy' }] : [];
  return { id, number: Math.max(0, ...state.visits.map((visit) => visit.number)) + 1, createdAt: new Date().toISOString(), seed, phase: 'prelude', lots, notes: [], objectiveRecords: [], tradeCoin: { balance: -debt, transactions }, tradeRequests: [], settlements: [], auctionChecks: [] };
}

/** Mark outstanding GM correction debts as carried once their generated visit is placed in state. */
export function attachGeneratedVisit(state: MarketState, visit: Visit): MarketState {
  return { ...state, visits: [...state.visits, visit], activeVisitId: visit.id, ceremony: defaultState().ceremony,
    tradeCoinDebts: (state.tradeCoinDebts ?? []).map((debt) => debt.carriedToVisitId ? debt : { ...debt, carriedToVisitId: visit.id }) };
}

export function generateBonusCatalogue(state: MarketState, visit: Visit, seed = visit.seed + 997): Lot[] {
  const original = new Set(visit.lots.map((lot) => lot.itemId));
  const generated = generateVisit(state, seed).lots;
  const used = new Set(original);
  return generated.map((lot, index) => {
    let itemId = lot.itemId;
    if (used.has(itemId)) {
      const candidates = eligible(lot.pool, state, used);
      if (candidates.length) itemId = candidates[Math.floor(seeded(seed + index)() * candidates.length)].id;
    }
    used.add(itemId);
    return { ...lot, id: `${lot.id}-bonus`, itemId, position: index + 7, claimants: claimantsForItem(getItem(itemId)!) };
  });
}

export function rollChaos(visit: Visit, seed = visit.seed + 41): ChaosEvent {
  const rng = seeded(seed); const result = roll(rng, 10);
  if (result !== 1) return { roll: result, triggered: false };
  const d3 = roll(rng, 3);
  return { roll: result, triggered: true, attackType: (['Dockside Raid', 'Assassination', 'Auction Theft'] as const)[d3 - 1], outcome: 'unresolved' };
}

/** Record the GM's Chaos outcome and open the catalogue.  The first full
 * success improves Miren's exchange; later full successes add the canonical
 * bonus catalogue and one Trade Coin without rolling Chaos again. */
export function resolveChaosOutcome(state: MarketState, visitId: string, outcome: Exclude<NonNullable<ChaosEvent['outcome']>, 'unresolved'>, attended: boolean): MarketState {
  const visit = state.visits.find((entry) => entry.id === visitId);
  if (!visit || visit.phase !== 'chaos' || !visit.chaos?.triggered) throw new Error('There is no unresolved Chaos interruption to resolve.');
  if (!['full-success', 'primary-success', 'failure'].includes(outcome)) throw new Error('Select a valid Chaos outcome.');
  if (outcome === 'failure') {
    const marked = { ...state, visits: state.visits.map((entry) => entry.id === visitId ? { ...visit, chaos: { ...visit.chaos!, outcome, attended } } : entry) };
    return abortChaosVisit(marked, visitId, visit.lots.length);
  }
  const firstFullSuccess = outcome === 'full-success' && state.exchangeRpPerTc === 3;
  const laterFullSuccess = outcome === 'full-success' && state.exchangeRpPerTc === 2;
  const coin = visit.tradeCoin ?? { balance: 0, transactions: [] };
  const bonusLots = laterFullSuccess ? generateBonusCatalogue(state, visit) : visit.bonusLots;
  const nextVisit: Visit = {
    ...visit,
    phase: 'catalogue',
    bonusLots,
    chaos: { ...visit.chaos!, outcome, attended, bonusCatalogue: laterFullSuccess || visit.chaos!.bonusCatalogue },
    tradeCoin: laterFullSuccess ? {
      balance: coin.balance + 1,
      transactions: [...coin.transactions, { id: `chaos-success-${Date.now()}`, label: 'Later Chaos full success: bonus catalogue gratitude', amount: 1, createdAt: new Date().toISOString(), kind: 'legacy' }],
    } : coin,
  };
  return { ...state, exchangeRpPerTc: firstFullSuccess ? 2 : state.exchangeRpPerTc, visits: state.visits.map((entry) => entry.id === visitId ? nextVisit : entry) };
}

export function applyCooldowns(state: MarketState, visit: Visit): MarketState {
  const next: MarketState = structuredClone(state);
  for (const [id, count] of Object.entries(next.cooldowns)) next.cooldowns[id] = count - 1;
  Object.keys(next.cooldowns).filter((id) => next.cooldowns[id] <= 0).forEach((id) => delete next.cooldowns[id]);
  [...visit.lots, ...(visit.bonusLots ?? [])].forEach((lot) => {
    if (lot.status === 'npc-won' && lot.pool.startsWith('marquee')) {
      if (!next.retired.includes(lot.itemId)) next.retired.push(lot.itemId);
    } else {
      // Closing the visit makes every displayed, non-retired holding unavailable for two complete future visits.
      next.cooldowns[lot.itemId] = 2;
    }
  });
  return next;
}

/**
 * A Chaos-aborted ceremony closes only holdings Miren actually revealed.  The
 * remaining catalogue was never displayed and must remain eligible stock.
 */
export function abortChaosVisit(state: MarketState, visitId: string, revealedPosition: number): MarketState {
  const visit = state.visits.find((entry) => entry.id === visitId);
  if (!visit || visit.phase !== 'chaos') throw new Error('Only a Chaos-interrupted visit may be aborted.');
  if (!Number.isInteger(revealedPosition) || revealedPosition < 0) throw new Error('The revealed holding count is invalid.');
  const closeLot = (lot: Lot) => lot.position <= revealedPosition && lot.status === 'available' ? { ...lot, status: 'unsold' as const } : lot;
  const aborted: Visit = { ...visit, phase: 'aborted', lots: visit.lots.map(closeLot), bonusLots: visit.bonusLots?.map(closeLot) };
  const revealed = allLots(aborted).filter((lot) => lot.position <= revealedPosition);
  const next: MarketState = structuredClone({ ...state, visits: state.visits.map((entry) => entry.id === visitId ? aborted : entry) });
  for (const [itemId, remaining] of Object.entries(next.cooldowns)) next.cooldowns[itemId] = remaining - 1;
  Object.entries(next.cooldowns).filter(([, remaining]) => remaining <= 0).forEach(([itemId]) => delete next.cooldowns[itemId]);
  for (const lot of revealed) {
    if (lot.status === 'npc-won' && lot.pool.startsWith('marquee')) {
      if (!next.retired.includes(lot.itemId)) next.retired.push(lot.itemId);
    } else next.cooldowns[lot.itemId] = 2;
  }
  return next;
}

export const underFireScenarios: Record<UnderFireScenario, { setup: string; primary: string; bonus: string; failure: string; aftermath: string; imStages: string }> = {
  'Dockside Raid': { setup: 'Place three Cargo Hives, three Staff markers, and a player-side extraction zone. Play four Turning Points.', primary: 'Secure at least two Cargo Hives.', bonus: 'Secure all three Cargo Hives and extract all three Staff markers.', failure: 'Fewer than two Cargo Hives are secured by the deadline.', aftermath: 'Stolen cargo escalates local Chaos activity; define the enabled cult, contaminated worksite, armed remnant, or next pressure.', imStages: 'Resolve access or positioning, decisive intervention, then extraction or containment; state two plausible Skills and a complication for each.' },
  'Assassination Attempt': { setup: 'Place the Civilian near the centre and a player-side extraction zone. Deploy the Cell between the target and the Chaos approach. Play four Turning Points.', primary: 'Extract the Civilian before the deadline.', bonus: 'Incapacitate every invading Chaos operative.', failure: 'An attacker executes or abducts the Civilian, or the Civilian is not extracted by the deadline.', aftermath: 'If Cassian is targeted, he is wounded, aborts the visit, and misses his next appearance. A VIP loss creates a tailored relationship consequence.', imStages: 'Resolve access or positioning, decisive intervention, then extraction or containment; state two plausible Skills and a complication for each.' },
  'Auction Theft': { setup: 'Choose a marked Courier carrying the marquee lot, mark its extraction edge, and place three Secondary Cargo markers. Play four Turning Points.', primary: 'Prevent the Courier extracting the marquee lot and secure the recovered lot.', bonus: 'Also secure at least two Secondary Cargo markers.', failure: 'The Courier extracts with the lot, or the lot is unsecured at the deadline.', aftermath: 'Mark narrative Chaos escalation. A stolen relic becomes a later event engine; a stolen unit or war engine may appear in a later major Chaos battle.', imStages: 'Resolve access or positioning, decisive intervention, then extraction or containment; state two plausible Skills and a complication for each.' },
};
const clockCategories: CampaignClockCategory[] = ['faction', 'investigation', 'deadline', 'recurring', 'custom'];
const clockStatuses: CampaignClockStatus[] = ['active', 'completed', 'abandoned'];
const eventScenarios: UnderFireScenario[] = ['Dockside Raid', 'Assassination Attempt', 'Auction Theft'];
const eventModes: EventOperationMode[] = ['kill-team', 'imperium-maledictum'];
const now = () => new Date().toISOString();
const withClock = (state: MarketState, id: string, change: (clock: CampaignClock) => CampaignClock) => {
  const clock = (state.campaignClocks ?? []).find((entry) => entry.id === id); if (!clock) throw new Error('Campaign clock not found.');
  return { ...state, campaignClocks: state.campaignClocks!.map((entry) => entry.id === id ? change(entry) : entry) };
};
const clockAudit = (clock: CampaignClock, action: CampaignClock['audit'][number]['action'], progress: number, note?: string) => ({ ...clock, progress, updatedAt: now(), audit: [...clock.audit, { at: now(), action, priorProgress: clock.progress, nextProgress: progress, note: note?.trim() || undefined }] });

export function createCampaignClock(state: MarketState, input: Pick<CampaignClock, 'title' | 'category' | 'segments' | 'notes'>): MarketState {
  if (!input.title.trim() || !clockCategories.includes(input.category) || !Number.isInteger(input.segments) || input.segments < 1 || input.segments > 12) throw new Error('Enter a title, category, and between 1 and 12 clock segments.');
  const createdAt = now(); const clock: CampaignClock = { id: `clock-${Date.now()}`, title: input.title.trim(), category: input.category, segments: input.segments, progress: 0, status: 'active', notes: input.notes?.trim() || undefined, createdAt, updatedAt: createdAt, audit: [{ at: createdAt, action: 'created', priorProgress: 0, nextProgress: 0 }] };
  return { ...state, campaignClocks: [...(state.campaignClocks ?? []), clock] };
}
export function updateCampaignClock(state: MarketState, id: string, input: Partial<Pick<CampaignClock, 'title' | 'category' | 'segments' | 'notes'>>): MarketState {
  return withClock(state, id, (clock) => { const next = { ...clock, ...input, title: input.title?.trim() ?? clock.title, notes: input.notes?.trim() || undefined }; if (!next.title || !clockCategories.includes(next.category) || !Number.isInteger(next.segments) || next.segments < 1 || next.segments > 12 || next.segments < next.progress) throw new Error('A clock needs a title, valid category, and a segment count that covers current progress.'); return { ...next, updatedAt: now(), audit: [...next.audit, { at: now(), action: 'edited', priorProgress: clock.progress, nextProgress: clock.progress }] }; });
}
export function setCampaignClockProgress(state: MarketState, id: string, progress: number, note?: string): MarketState {
  return withClock(state, id, (clock) => { if (clock.status !== 'active' || !Number.isInteger(progress) || progress < 0 || progress > clock.segments) throw new Error('Only an active clock may be set within its segment range.'); const next = clockAudit(clock, 'progressed', progress, note); return progress === clock.segments ? { ...next, status: 'completed', audit: [...next.audit, { at: now(), action: 'completed', priorProgress: progress, nextProgress: progress, note: 'Clock filled by progress update.' }] } : next; });
}
export function completeCampaignClock(state: MarketState, id: string, note?: string): MarketState { return withClock(state, id, (clock) => { if (clock.status !== 'active') throw new Error('Only an active clock may be completed.'); return { ...clockAudit(clock, 'completed', clock.segments, note), status: 'completed' }; }); }
export function reopenCampaignClock(state: MarketState, id: string, note?: string): MarketState { return withClock(state, id, (clock) => { if (clock.status === 'active') throw new Error('This clock is already active.'); const progress = Math.min(clock.progress, Math.max(0, clock.segments - 1)); return { ...clockAudit(clock, 'reopened', progress, note), status: 'active' }; }); }
export function abandonCampaignClock(state: MarketState, id: string, note?: string): MarketState { return withClock(state, id, (clock) => { if (clock.status !== 'active') throw new Error('Only an active clock may be abandoned.'); return { ...clockAudit(clock, 'abandoned', clock.progress, note), status: 'abandoned' }; }); }

const findEvent = (state: MarketState, id: string) => { const event = (state.eventInstances ?? []).find((entry) => entry.id === id); if (!event) throw new Error('Event instance not found.'); return event; };
const replaceEvent = (state: MarketState, event: EventInstance) => ({ ...state, eventInstances: state.eventInstances!.map((entry) => entry.id === event.id ? event : entry) });
const validateEventInput = (scenario: UnderFireScenario, mode: EventOperationMode, target?: string) => { if (!eventScenarios.includes(scenario) || !eventModes.includes(mode) || (scenario === 'Assassination Attempt' && (!target?.trim() || /trazyn/i.test(target)))) throw new Error('Choose a valid scenario and operation mode; Assassination requires a non-Trazyn target.'); };
export function startUnderFireEvent(state: MarketState, input: { scenario: UnderFireScenario; operationMode: EventOperationMode; target?: string }): MarketState {
  const visit = state.visits.find((entry) => entry.id === state.activeVisitId); if (!visit || visit.phase !== 'chaos' || !visit.chaos?.triggered) throw new Error('The Under Fire operation begins only during an unresolved Chaos interruption.'); if ((state.eventInstances ?? []).some((entry) => entry.status !== 'resolved')) throw new Error('Resolve the active campaign event before starting another.'); validateEventInput(input.scenario, input.operationMode, input.target); const createdAt = now(); const event: EventInstance = { id: `event-${Date.now()}`, templateId: 'gilded-index-under-fire', visitId: visit.id, scenario: input.scenario, operationMode: input.operationMode, status: 'setup', setupConfirmed: false, turningPoint: 0, target: input.scenario === 'Assassination Attempt' ? input.target!.trim() : undefined, objectives: { primary: false, bonus: false, failed: false }, notes: '', clockLinks: [], createdAt, updatedAt: createdAt, audit: [{ at: createdAt, action: 'created' }] };
  const attackType: NonNullable<ChaosEvent['attackType']> = input.scenario === 'Assassination Attempt' ? 'Assassination' : input.scenario;
  const nextVisit = { ...visit, chaos: { ...visit.chaos, attackType } }; return { ...state, visits: state.visits.map((entry) => entry.id === visit.id ? nextVisit : entry), eventInstances: [...(state.eventInstances ?? []), event] };
}
export function beginUnderFireEvent(state: MarketState, id: string): MarketState { const event = findEvent(state, id); if (event.status !== 'setup') throw new Error('Only a prepared event may begin.'); const at = now(); return replaceEvent(state, { ...event, status: 'in-progress', setupConfirmed: true, turningPoint: 1, updatedAt: at, audit: [...event.audit, { at, action: 'started' }] }); }
export function updateUnderFireEvent(state: MarketState, id: string, change: Partial<Pick<EventInstance, 'target' | 'notes' | 'objectives'>>): MarketState { const event = findEvent(state, id); if (event.status === 'resolved') throw new Error('Resolved events require a reasoned correction.'); const objectives = { ...event.objectives, ...(change.objectives ?? {}) }; if (event.scenario === 'Assassination Attempt' && (!change.target?.trim() && !event.target || /trazyn/i.test(change.target ?? event.target ?? ''))) throw new Error('Assassination requires a relevant non-Trazyn target.'); const at = now(); return replaceEvent(state, { ...event, target: change.target?.trim() ?? event.target, notes: change.notes ?? event.notes, objectives, updatedAt: at, audit: [...event.audit, { at, action: 'updated' }] }); }
export function advanceUnderFireTurningPoint(state: MarketState, id: string): MarketState { const event = findEvent(state, id); if (event.status !== 'in-progress' || event.turningPoint >= 4) throw new Error('Only an in-progress operation below Turning Point 4 may advance.'); const at = now(); return replaceEvent(state, { ...event, turningPoint: event.turningPoint + 1, updatedAt: at, audit: [...event.audit, { at, action: 'advanced' }] }); }
export function linkEventClock(state: MarketState, eventId: string, clockId: string, advances: number, note?: string): MarketState { const event = findEvent(state, eventId); if (!(state.campaignClocks ?? []).some((clock) => clock.id === clockId) || !Number.isInteger(advances) || advances < 1 || advances > 12 || event.clockLinks.some((link) => link.clockId === clockId)) throw new Error('Choose an unlinked campaign clock and a positive segment advance.'); const at = now(); return replaceEvent(state, { ...event, clockLinks: [...event.clockLinks, { clockId, advances, note: note?.trim() || undefined }], updatedAt: at, audit: [...event.audit, { at, action: 'clock-linked' }] }); }
export function applyEventClockLink(state: MarketState, eventId: string, clockId: string, note?: string): MarketState { const event = findEvent(state, eventId); const link = event.clockLinks.find((entry) => entry.clockId === clockId); if (!link || link.appliedAt) throw new Error('That event clock link is not available to apply.'); const clock = (state.campaignClocks ?? []).find((entry) => entry.id === clockId); if (!clock || clock.status !== 'active') throw new Error('Only an active linked clock may be advanced.'); const progressed = setCampaignClockProgress(state, clockId, Math.min(clock.segments, clock.progress + link.advances), note ?? link.note); const at = now(); const nextEvent: EventInstance = { ...event, clockLinks: event.clockLinks.map((entry) => entry.clockId === clockId ? { ...entry, appliedAt: at } : entry), updatedAt: at, audit: [...event.audit, { at, action: 'clock-linked' as const }] }; return { ...progressed, eventInstances: progressed.eventInstances!.map((entry) => entry.id === event.id ? nextEvent : entry) };
}
export function resolveUnderFireEvent(state: MarketState, id: string, attended: boolean, rng: () => number = Math.random): MarketState {
  const event = findEvent(state, id); if (event.status === 'resolved') throw new Error('This event has already been resolved.'); const visit = state.visits.find((entry) => entry.id === event.visitId); if (!visit || visit.id !== state.activeVisitId || visit.phase !== 'chaos' || !visit.chaos?.triggered) throw new Error('The linked Chaos interruption is no longer available.'); let result: EventResult; let unattendedRoll: number | undefined;
  if (attended) result = event.objectives.failed || !event.objectives.primary ? 'failure' : event.objectives.bonus ? 'full-success' : 'primary-success';
  else { unattendedRoll = Math.floor(rng() * 10) + 1; result = unattendedRoll <= 4 ? 'failure' : 'primary-success'; }
  const resolved = resolveChaosOutcome(state, event.visitId, result, attended);
  const at = now(); const finalEvent: EventInstance = { ...event, status: 'resolved', attended, unattendedRoll, result, updatedAt: at, resolvedAt: at, audit: [...event.audit, { at, action: 'resolved' }] };
  const ceremony = result === 'failure'
    ? { ...resolved.ceremony, status: 'idle' as const, cue: 'catalogue' as const, durationMs: 0, startedAt: undefined, pausedRemainingMs: undefined, revision: Date.now() }
    : { ...resolved.ceremony, status: 'catalogue' as const, cue: 'catalogue' as const, lotPosition: visit.lots.length, durationMs: 0, startedAt: undefined, pausedRemainingMs: undefined, revision: Date.now() };
  return { ...resolved, ceremony, eventInstances: resolved.eventInstances!.map((entry) => entry.id === event.id ? finalEvent : entry) };
}
export function correctUnderFireEvent(state: MarketState, id: string, change: Pick<EventInstance, 'notes' | 'objectives'>, reason: string): MarketState { const event = findEvent(state, id); if (event.status !== 'resolved' || !reason.trim()) throw new Error('A resolved event correction requires a reason.'); const at = now(); return replaceEvent(state, { ...event, notes: change.notes, objectives: change.objectives, updatedAt: at, audit: [...event.audit, { at, action: 'corrected', reason: reason.trim() }] }); }

export function getItem(id: string) { return catalogue.find((item) => item.id === id); }
export function replaceLotMetadata(lot: Lot, item: CatalogueItem): Lot {
  return { ...lot, itemId: item.id, claimants: claimantsForItem(item) };
}
export function replaceUnrevealedLot(visit: Visit, lotId: string, item: CatalogueItem, revealedPosition: number): Visit {
  const lot = allLots(visit).find((entry) => entry.id === lotId);
  if (!lot || lot.locked || lot.status !== 'available' || lot.position <= revealedPosition) throw new Error('A holding may only be replaced before Miren introduces it.');
  return updateLot(visit, lotId, (entry) => replaceLotMetadata(entry, item));
}
export function mirenIntroduction(item: CatalogueItem) {
  return item.mirenAnnouncement;
}
export function labelForLot(lot: Lot) { return lot.position <= 2 ? 'Field Asset' : lot.position <= 4 ? 'Archive Lot' : lot.position === 5 ? 'Foreign Asset' : 'Marquee Lot'; }
export function categoryTitle(pool: Pool) { return { field: 'Field Holding', standard: 'Archive Augmentation', ordinary: 'Recovered Augmentation', powerful: 'Exceptional Augmentation', exceptional: 'Restricted Holding', unit3: 'Chartered Asset', unit4: 'Chartered Asset', 'marquee-unit': 'Marquee Holding', 'marquee-relic': 'Marquee Reliquary' }[pool]; }
export const originRules = source.originRules;

export const allLots = (visit: Visit) => [...visit.lots, ...(visit.bonusLots ?? [])];
export function cooldownEntries(state: MarketState) { return Object.entries(state.cooldowns).map(([itemId, remaining]) => { const last = [...state.visits].sort((a, b) => b.number - a.number).find((visit) => allLots(visit).some((lot) => lot.itemId === itemId)); return { item: getItem(itemId), remaining, lastShownVisit: last?.number, nextEligibleVisit: (last?.number ?? 0) + remaining + 1 }; }).filter((entry) => entry.item); }
export function adaptationEntries(state: MarketState, now = Date.now()) {
  const current = state.campaignGovernance?.currentDate;
  return state.visits.flatMap((visit) => (visit.settlements ?? []).filter((settlement) => settlement.adaptation).map((settlement) => {
    const adaptation = settlement.adaptation!;
    const campaignReady = adaptation.campaignReadyAt;
    const ready = campaignReady && current ? JSON.stringify(campaignReady) === JSON.stringify(current) || ((campaignReady.year < current.year) || (campaignReady.year === current.year && (campaignReady.month < current.month || (campaignReady.month === current.month && campaignReady.day <= current.day)))) : new Date(adaptation.readyAt).getTime() <= now;
    return { visitNumber: visit.number, ...settlement, ready, pendingTemporalReview: adaptation.temporalStatus === 'legacy-pending' };
  })).filter((entry) => !entry.ready);
}
const visitCoin = (visit: Visit) => visit.tradeCoin ?? { balance: 0, transactions: [] };
const isUnit = (item: CatalogueItem) => item.pool === 'unit3' || item.pool === 'unit4';
const updateLot = (visit: Visit, lotId: string, change: (lot: Lot) => Lot): Visit => ({ ...visit, lots: visit.lots.map((lot) => lot.id === lotId ? change(lot) : lot), bonusLots: visit.bonusLots?.map((lot) => lot.id === lotId ? change(lot) : lot) });

export function recordSettlement(visit: Visit, lotId: string, input: { buyer: string; tcSpent: number; rpConfirmed: boolean; settledAt: string; adaptationDays?: 28 | 84; campaignDate?: CampaignDate }): Visit {
  const lot = allLots(visit).find((entry) => entry.id === lotId); if (!lot || lot.status !== 'available') throw new Error('This holding cannot be settled.');
  const item = getItem(lot.itemId)!; const coin = visitCoin(visit);
  if (!input.buyer.trim() || input.tcSpent < item.price.tc || (item.price.rp > 0 && !input.rpConfirmed)) throw new Error('Settlement details do not satisfy the holding requirements.');
  if (coin.balance < input.tcSpent) throw new Error('The Index holds insufficient Trade Coin for that settlement.');
  if (isUnit(item) && input.adaptationDays !== 28 && input.adaptationDays !== 84) throw new Error('Select the unit adaptation duration.');
  const id = `settlement-${Date.now()}`; const settledAt = input.settledAt || new Date().toISOString();
  if (input.campaignDate) validateCampaignDate(input.campaignDate);
  const adaptation = isUnit(item) ? { durationDays: input.adaptationDays!, readyAt: new Date(new Date(settledAt).getTime() + input.adaptationDays! * 86400000).toISOString(), ...(input.campaignDate ? { campaignReadyAt: addCampaignDays(input.campaignDate, input.adaptationDays!), temporalStatus: 'campaign' as const } : { temporalStatus: 'legacy-pending' as const }) } : undefined;
  const settlement: SettlementRecord = { id, lotId, itemId: item.id, itemName: item.name, buyer: input.buyer.trim(), tcSpent: input.tcSpent, requiredRp: item.price.rp, rpConfirmed: input.rpConfirmed, settledAt, ...(input.campaignDate ? { campaignSettledAt: structuredClone(input.campaignDate) } : {}), adaptation };
  const tx: TradeTransaction = { id: `debit-${id}`, label: `${item.name} settled for ${input.tcSpent} TC`, amount: -input.tcSpent, createdAt: settledAt, kind: 'settlement-debit', settlementId: id };
  const next = updateLot(visit, lotId, (entry) => ({ ...entry, status: 'purchased', settlementId: id }));
  return { ...next, settlements: [...(visit.settlements ?? []), settlement], tradeCoin: { balance: coin.balance - input.tcSpent, transactions: [...coin.transactions, tx] } };
}

export function recordNpcWinner(visit: Visit, lotId: string, winner: string): Visit {
  const lot = allLots(visit).find((entry) => entry.id === lotId); if (!lot || lot.status !== 'available' || !lot.pool.startsWith('marquee') || !winner.trim()) throw new Error('A marquee winner must be named.');
  return updateLot(visit, lotId, (entry) => ({ ...entry, status: 'npc-won', npcWinner: winner.trim(), settlementId: undefined }));
}

const closed = (visit: Visit) => visit.phase === 'resolved' || visit.phase === 'aborted';
const replaceClosedVisit = (state: MarketState, visit: Visit) => ({ ...state, visits: state.visits.map((entry) => entry.id === visit.id ? visit : entry) });

function rebuildClosedLedger(visit: Visit): Visit {
  const coin = visitCoin(visit);
  const credits = coin.transactions.filter((transaction) => transaction.amount > 0 && transaction.kind !== 'settlement-debit');
  const settlements = visit.settlements ?? [];
  const spent = settlements.reduce((sum, settlement) => sum + settlement.tcSpent, 0);
  const available = credits.reduce((sum, transaction) => sum + transaction.amount, 0);
  const debits: TradeTransaction[] = settlements.map((settlement) => ({ id: `debit-${settlement.id}`, label: `${settlement.itemName} settled for ${settlement.tcSpent} TC`, amount: -settlement.tcSpent, createdAt: settlement.settledAt, kind: 'settlement-debit', settlementId: settlement.id }));
  const remaining = available - spent;
  const expiry: TradeTransaction[] = remaining > 0 ? [{ id: `expiry-${visit.id}`, label: 'Unspent coin surrendered at departure', amount: -remaining, createdAt: visit.createdAt, kind: 'expiry' }] : [];
  return { ...visit, settlements, tradeCoin: { balance: Math.min(0, remaining), transactions: [...credits, ...debits, ...expiry] } };
}

function debtForClosedVisit(state: MarketState, visit: Visit): TradeCoinDebt[] {
  const deficit = Math.max(0, -(visitCoin(visit).balance));
  const retained = (state.tradeCoinDebts ?? []).filter((debt) => debt.sourceVisitId !== visit.id);
  return deficit ? [...retained, { id: `debt-${visit.id}`, sourceVisitId: visit.id, amount: deficit, createdAt: new Date().toISOString() }] : retained;
}

/** Reconstruct market availability from closed visit records after a GM correction. */
export function rebuildMarketAvailability(state: MarketState): MarketState {
  const base: MarketState = { ...state, cooldowns: {}, retired: [] };
  return state.visits.filter(closed).sort((a, b) => a.number - b.number).reduce<MarketState>((next, visit) => applyCooldowns(next, visit), base);
}

export function correctSettlement(state: MarketState, visitId: string, settlementId: string, input: { buyer: string; tcSpent: number; rpConfirmed: boolean; adaptationDays?: 28 | 84 }): MarketState {
  const visit = state.visits.find((entry) => entry.id === visitId); if (!visit || !closed(visit)) throw new Error('Only a closed visit may be corrected.');
  const prior = (visit.settlements ?? []).find((entry) => entry.id === settlementId); if (!prior) throw new Error('Settlement record not found.');
  const item = getItem(prior.itemId); if (!item || !input.buyer.trim() || input.tcSpent < item.price.tc || (item.price.rp > 0 && !input.rpConfirmed)) throw new Error('Settlement details do not satisfy the holding requirements.');
  if (isUnit(item) && input.adaptationDays !== 28 && input.adaptationDays !== 84) throw new Error('Select the unit adaptation duration.');
  const replacement: SettlementRecord = { ...prior, buyer: input.buyer.trim(), tcSpent: input.tcSpent, rpConfirmed: input.rpConfirmed, adaptation: isUnit(item) ? { durationDays: input.adaptationDays!, readyAt: new Date(new Date(prior.settledAt).getTime() + input.adaptationDays! * 86400000).toISOString() } : undefined };
  const corrected = rebuildClosedLedger({ ...visit, settlements: (visit.settlements ?? []).map((entry) => entry.id === settlementId ? replacement : entry) });
  const next = replaceClosedVisit(state, corrected);
  return rebuildMarketAvailability({ ...next, tradeCoinDebts: debtForClosedVisit(next, corrected) });
}

export function removeSettlement(state: MarketState, visitId: string, settlementId: string): MarketState {
  const visit = state.visits.find((entry) => entry.id === visitId); if (!visit || !closed(visit)) throw new Error('Only a closed visit may be corrected.');
  const settlement = (visit.settlements ?? []).find((entry) => entry.id === settlementId); if (!settlement) throw new Error('Settlement record not found.');
  const reopened = updateLot(visit, settlement.lotId, (lot) => ({ ...lot, status: 'unsold', settlementId: undefined }));
  const corrected = rebuildClosedLedger({ ...reopened, settlements: (reopened.settlements ?? []).filter((entry) => entry.id !== settlementId) });
  const next = replaceClosedVisit(state, corrected);
  return rebuildMarketAvailability({ ...next, tradeCoinDebts: debtForClosedVisit(next, corrected) });
}

export function correctNpcWinner(state: MarketState, visitId: string, lotId: string, winner: string): MarketState {
  const visit = state.visits.find((entry) => entry.id === visitId); const lot = visit && allLots(visit).find((entry) => entry.id === lotId);
  if (!visit || !closed(visit) || !lot || lot.status !== 'npc-won' || !lot.pool.startsWith('marquee') || !winner.trim()) throw new Error('A closed marquee outcome requires a named claimant.');
  return rebuildMarketAvailability(replaceClosedVisit(state, updateLot(visit, lotId, (entry) => ({ ...entry, npcWinner: winner.trim() }))));
}

export function removeNpcWinner(state: MarketState, visitId: string, lotId: string): MarketState {
  const visit = state.visits.find((entry) => entry.id === visitId); const lot = visit && allLots(visit).find((entry) => entry.id === lotId);
  if (!visit || !closed(visit) || !lot || lot.status !== 'npc-won' || !lot.pool.startsWith('marquee')) throw new Error('Only a closed marquee outcome may be removed.');
  return rebuildMarketAvailability(replaceClosedVisit(state, updateLot(visit, lotId, (entry) => ({ ...entry, status: 'unsold', npcWinner: undefined }))));
}

export function validateMarketState(input: MarketState): MarketState {
  const state = migrateMarketState(input);
  validateCampaignGovernance(state.campaignGovernance);
  for (const visit of state.visits) for (const lot of allLots(visit)) {
    if (lot.status === 'npc-won' && (!lot.pool.startsWith('marquee') || !lot.npcWinner?.trim())) throw new Error('Invalid saved state: only named marquee outcomes may be NPC-won.');
    if (lot.status === 'purchased' && !(visit.settlements ?? []).some((settlement) => settlement.id === lot.settlementId && settlement.lotId === lot.id)) throw new Error('Invalid saved state: every purchased holding requires its settlement record.');
  }
  const pairs = new Set<string>();
  for (const deal of state.bidderDeals!) { const visit = state.visits.find((entry) => entry.id === deal.visitId); const lot = visit && allLots(visit).find((entry) => entry.id === deal.lotId); const key = `${deal.visitId}:${deal.lotId}:${deal.bidder}`; if (!visit || !lot || !lot.pool.startsWith('marquee') || !deal.bidder.trim() || !deal.partyObligation.trim() || !deal.bidderObligation.trim() || (deal.pressureReduction !== 0 && deal.pressureReduction !== 1) || !['active','settled'].includes(deal.status) || pairs.has(key)) throw new Error('Invalid saved state: bidder deal is incomplete or invalid.'); pairs.add(key); }
  const carried = new Set<string>();
  for (const debt of state.tradeCoinDebts!) { if (!debt.id || !debt.sourceVisitId || !Number.isInteger(debt.amount) || debt.amount <= 0 || !state.visits.some((visit) => visit.id === debt.sourceVisitId) || (debt.carriedToVisitId && (!state.visits.some((visit) => visit.id === debt.carriedToVisitId) || carried.has(debt.sourceVisitId)))) throw new Error('Invalid saved state: correction debt is invalid.'); if (debt.carriedToVisitId) carried.add(debt.sourceVisitId); }
  for (const visit of state.visits) for (const check of visit.auctionChecks ?? []) { const lot = allLots(visit).find((entry) => entry.id === check.lotId); const item = lot && getItem(lot.itemId); if (!lot || !item || !lot.pool.startsWith('marquee') || !Number.isInteger(check.playerTc) || check.playerTc < item.price.tc || !Number.isInteger(check.playerRp) || check.playerRp < item.price.rp || !check.extraRpRolls.every((roll) => roll === 1 || roll === 2) || !Number.isInteger(check.d10) || check.d10 < 1 || check.d10 > 10 || !Number.isInteger(check.pressure) || check.pressure < 1 || (check.npcTc !== undefined && check.npcTc !== check.playerTc + 1) || (check.responder && !lot.claimants?.some((claimant) => claimant.name === check.responder))) throw new Error('Invalid saved state: auction check is invalid.'); }
  const rosterIds = new Set<string>();
  for (const recipient of state.objectiveOfferRecipients!) { if (!recipient.id.trim() || !recipient.name.trim() || !['index','faction','npc','cell','player'].includes(recipient.type) || typeof recipient.canOfferObjectives !== 'boolean' || rosterIds.has(recipient.id)) throw new Error('Invalid saved state: campaign recipient directory is invalid.'); rosterIds.add(recipient.id); }
  if (state.objectiveOfferRecipients!.filter((recipient) => recipient.type === 'index').length !== 1) throw new Error('Invalid saved state: exactly one Index recipient is required.');
  for (const visit of state.visits) for (const objective of visit.objectiveRecords ?? []) { const indexOffers = objective.offers.filter((offer) => offer.recipientType === 'index'); const ids = new Set<string>(); if (!objective.id || !objective.title.trim() || !objective.summary.trim() || indexOffers.length !== 1 || indexOffers[0].rewardType !== 'tc' || ![1,2].includes(indexOffers[0].amount ?? 0) || objective.offers.some((offer) => !offer.id || ids.has(offer.id) || !offer.recipientId.trim() || !offer.recipientName.trim() || !offer.detail.trim() || !offer.playerText.trim() || (offer.enabled !== undefined && typeof offer.enabled !== 'boolean') || (offer.rewardType === 'tc' && offer.recipientType !== 'index')) || (objective.selectedOfferId && !objective.offers.some((offer) => offer.id === objective.selectedOfferId)) || (objective.state === 'redeemed' && !objective.selectedOfferId) || objective.audit.some((audit) => !audit.reason.trim() || !objective.offers.some((offer) => offer.id === audit.offerId))) throw new Error('Invalid saved state: objective record is invalid.'); objective.offers.forEach((offer) => ids.add(offer.id)); const request = (visit.tradeRequests ?? []).find((entry) => entry.kind === 'objective' && entry.recordId === objective.id); const credits = (visit.tradeCoin?.transactions ?? []).filter((entry) => entry.kind === 'objective-credit' && entry.objectiveId === objective.id && entry.offerId === indexOffers[0].id); if (objective.selectedOfferId === indexOffers[0].id && ((!request && credits.length !== 1) || (request && request.offerId !== indexOffers[0].id) || (request && credits.length))) throw new Error('Invalid saved state: Index objective credit is not linked to its offer.'); }
  const rewardIds = new Set<string>();
  for (const reward of state.rewardRecords ?? []) {
    const recipient = state.objectiveOfferRecipients!.find((entry) => entry.id === reward.recipientId);
    const numeric = reward.rewardType === 'rp' || reward.rewardType === 'reputation';
    if (!reward.id || rewardIds.has(reward.id) || !recipient || !reward.recipientName.trim() || reward.recipientName !== recipient.name || reward.recipientType !== recipient.type || !['rp','reputation','battle-honour','asset','narrative'].includes(reward.rewardType) || !['manual','objective'].includes(reward.source) || !['issued','claimed','approved','spent','void'].includes(reward.status) || !reward.detail.trim() || !reward.createdAt || !reward.updatedAt || (numeric && (!Number.isInteger(reward.amount) || reward.amount === 0 || (reward.rewardType === 'rp' && reward.amount! < 0 && reward.status !== 'spent'))) || (!numeric && reward.amount !== undefined) || (reward.rewardType === 'reputation' && reward.status === 'spent') || (reward.source === 'objective' && (!reward.visitId || !reward.objectiveId || !reward.offerId)) || reward.audit.some((audit) => !audit.reason.trim())) throw new Error('Invalid saved state: reward record is invalid.');
    rewardIds.add(reward.id);
  }
  for (const visit of state.visits) for (const objective of visit.objectiveRecords ?? []) {
    const selected = objective.selectedOfferId && objective.offers.find((offer) => offer.id === objective.selectedOfferId);
    if (selected && selected.recipientType !== 'index' && !(state.rewardRecords ?? []).some((reward) => reward.source === 'objective' && reward.visitId === visit.id && reward.objectiveId === objective.id && reward.offerId === selected.id)) throw new Error('Invalid saved state: redeemed objective offer is missing its reward claim.');
    if ((state.rewardRecords ?? []).filter((reward) => reward.source === 'objective' && reward.visitId === visit.id && reward.objectiveId === objective.id).length > 1) throw new Error('Invalid saved state: objective reward claim is duplicated.');
  }
  const clockIds = new Set<string>();
  for (const clock of state.campaignClocks ?? []) {
    if (!clock.id || clockIds.has(clock.id) || !clock.title?.trim() || !clockCategories.includes(clock.category) || !clockStatuses.includes(clock.status) || !Number.isInteger(clock.segments) || clock.segments < 1 || clock.segments > 12 || !Number.isInteger(clock.progress) || clock.progress < 0 || clock.progress > clock.segments || !clock.createdAt || !clock.updatedAt || !Array.isArray(clock.audit) || clock.audit.some((audit) => !audit.at || !['created','edited','progressed','completed','reopened','abandoned','linked-event'].includes(audit.action) || !Number.isInteger(audit.priorProgress) || !Number.isInteger(audit.nextProgress))) throw new Error('Invalid saved state: campaign clock is invalid.');
    clockIds.add(clock.id);
  }
  const eventIds = new Set<string>(); let activeEvents = 0;
  for (const event of state.eventInstances ?? []) {
    if (!event.id || eventIds.has(event.id) || event.templateId !== 'gilded-index-under-fire' || !state.visits.some((visit) => visit.id === event.visitId) || !eventScenarios.includes(event.scenario) || !eventModes.includes(event.operationMode) || !['setup','in-progress','resolved'].includes(event.status) || typeof event.setupConfirmed !== 'boolean' || !Number.isInteger(event.turningPoint) || event.turningPoint < 0 || event.turningPoint > 4 || (event.scenario === 'Assassination Attempt' && (!event.target?.trim() || /trazyn/i.test(event.target))) || !event.objectives || typeof event.objectives.primary !== 'boolean' || typeof event.objectives.bonus !== 'boolean' || typeof event.objectives.failed !== 'boolean' || !Array.isArray(event.clockLinks) || event.clockLinks.some((link) => !clockIds.has(link.clockId) || !Number.isInteger(link.advances) || link.advances < 1 || link.advances > 12) || new Set(event.clockLinks.map((link) => link.clockId)).size !== event.clockLinks.length || !event.createdAt || !event.updatedAt || !Array.isArray(event.audit) || event.audit.some((audit) => !audit.at || !['created','started','advanced','updated','resolved','corrected','clock-linked'].includes(audit.action)) || (event.status === 'resolved' && (!event.result || !event.resolvedAt || typeof event.attended !== 'boolean')) || (event.status !== 'resolved' && (event.result !== undefined || event.resolvedAt !== undefined))) throw new Error('Invalid saved state: event instance is invalid.');
    eventIds.add(event.id); if (event.status !== 'resolved') activeEvents += 1;
  }
  if (activeEvents > 1) throw new Error('Invalid saved state: only one campaign event may be active.');
  return state;
}

function validateObjectiveOffers(title: string, summary: string, offers: ObjectiveOffer[]) {
  if (!title.trim() || !summary.trim() || !offers.length) throw new Error('Enter an objective title, summary, and at least one offer.');
  const index = offers.filter((offer) => offer.recipientType === 'index');
  if (index.length !== 1 || index[0].rewardType !== 'tc' || ![1, 2].includes(index[0].amount ?? 0)) throw new Error('The Gilded Index must have exactly one 1 or 2 TC offer.');
  if (offers.some((offer) => !offer.id || !offer.recipientId.trim() || !offer.recipientName.trim() || !offer.detail.trim() || !offer.playerText.trim() || (offer.rewardType === 'tc' && offer.recipientType !== 'index'))) throw new Error('Every offer needs a recipient, detail, and player-facing wording.');
}
export function issueObjective(visit: Visit, title: string, summary: string, offers: ObjectiveOffer[]): Visit {
  validateObjectiveOffers(title, summary, offers);
  const now = new Date().toISOString(); const objective: ObjectiveRecord = { id: `objective-${Date.now()}`, title: title.trim(), summary: summary.trim(), acquiredAt: now, state: 'recorded', offers: structuredClone(offers), audit: [] };
  return { ...visit, objectiveRecords: [...(visit.objectiveRecords ?? []), objective] };
}
export function presentObjective(visit: Visit, id: string): Visit {
  const record = (visit.objectiveRecords ?? []).find((objective) => objective.id === id); if (!record || record.state !== 'recorded') throw new Error('Only a recorded objective may be presented.');
  return { ...visit, objectiveRecords: visit.objectiveRecords!.map((objective) => objective.id === id ? { ...objective, state: 'presented' } : objective) };
}
/** Player-facing Index offers which may still be redeemed at Miren's counter. */
export function availableIndexObjectives(visit: Visit) {
  return (visit.objectiveRecords ?? []).flatMap((objective) => objective.state === 'presented'
    ? objective.offers.filter((offer) => offer.recipientType === 'index' && offer.enabled !== false).map((offer) => ({ objective, offer }))
    : []);
}
export function redeemObjective(visit: Visit, objectiveId: string, offerId: string): Visit {
  const objective = (visit.objectiveRecords ?? []).find((entry) => entry.id === objectiveId); const offer = objective?.offers.find((entry) => entry.id === offerId);
  if (!objective || !offer || offer.enabled === false || objective.state !== 'presented') throw new Error('Only an enabled offer on a presented objective may be accepted.');
  const next = { ...visit, objectiveRecords: visit.objectiveRecords!.map((entry) => entry.id === objectiveId ? { ...entry, state: 'redeemed' as const, selectedOfferId: offerId, redeemedAt: new Date().toISOString() } : entry) };
  if (offer.recipientType !== 'index') return next;
  const coin = next.tradeCoin ?? { balance: 0, transactions: [] };
  const createdAt = new Date().toISOString();
  return { ...next, tradeCoin: { balance: coin.balance + offer.amount!, transactions: [...coin.transactions, { id: `objective-credit-${Date.now()}`, label: `${objective.title} - ${offer.recipientName}`, amount: offer.amount!, createdAt, kind: 'objective-credit', objectiveId, offerId }] } };
}
export function redeemObjectiveInState(state: MarketState, visitId: string, objectiveId: string, offerId: string): MarketState {
  const visit = state.visits.find((entry) => entry.id === visitId); const objective = visit?.objectiveRecords?.find((entry) => entry.id === objectiveId); const offer = objective?.offers.find((entry) => entry.id === offerId);
  if (!visit || !objective || !offer) throw new Error('Objective offer not found.');
  const nextVisit = redeemObjective(visit, objectiveId, offerId);
  if (offer.recipientType === 'index') return { ...state, visits: state.visits.map((entry) => entry.id === visitId ? nextVisit : entry) };
  if ((state.rewardRecords ?? []).some((reward) => reward.source === 'objective' && reward.visitId === visitId && reward.objectiveId === objectiveId)) throw new Error('This accepted objective offer already has a reward claim.');
  const now = new Date().toISOString();
  const reward: RewardRecord = { id: `objective-reward-${Date.now()}`, recipientId: offer.recipientId, recipientName: offer.recipientName, recipientType: offer.recipientType, rewardType: offer.rewardType as Exclude<ObjectiveRewardType, 'tc'>, amount: offer.amount, detail: offer.detail, status: 'claimed', source: 'objective', visitId, objectiveId, offerId, createdAt: now, updatedAt: now, audit: [] };
  return { ...state, visits: state.visits.map((entry) => entry.id === visitId ? nextVisit : entry), rewardRecords: [...(state.rewardRecords ?? []), reward] };
}
export function correctObjectiveOffer(state: MarketState, visitId: string, objectiveId: string, offerId: string, nextOffer: ObjectiveOffer, reason: string): MarketState {
  if (!reason.trim()) throw new Error('Explain why this objective offer is being corrected.');
  const visit = state.visits.find((entry) => entry.id === visitId); const objective = visit?.objectiveRecords?.find((entry) => entry.id === objectiveId); const prior = objective?.offers.find((entry) => entry.id === offerId);
  if (!visit || !objective || !prior) throw new Error('Objective offer not found.');
  const replacement = { ...nextOffer, id: prior.id, recipientId: prior.recipientId, recipientName: prior.recipientName, recipientType: prior.recipientType };
  const offers = objective.offers.map((offer) => offer.id === offerId ? replacement : offer); validateObjectiveOffers(objective.title, objective.summary, offers);
  let nextVisit: Visit = { ...visit, objectiveRecords: visit.objectiveRecords!.map((entry) => entry.id === objectiveId ? { ...entry, offers, audit: [...entry.audit, { at: new Date().toISOString(), offerId, prior, next: replacement, reason: reason.trim() }] } : entry) };
  if (objective.selectedOfferId === offerId && prior.recipientType === 'index') {
    const request = (nextVisit.tradeRequests ?? []).find((entry) => entry.kind === 'objective' && entry.recordId === objectiveId && entry.offerId === offerId);
    const delta = (replacement.amount ?? 0) - (prior.amount ?? 0);
    const credit = (nextVisit.tradeCoin?.transactions ?? []).find((entry) => entry.kind === 'objective-credit' && entry.objectiveId === objectiveId && entry.offerId === offerId);
    if (!request && !credit) throw new Error('The redeemed Index offer has no linked Trade Coin credit.');
    if (credit) {
      const coin = nextVisit.tradeCoin ?? { balance: 0, transactions: [] };
      if (coin.balance + delta < 0) throw new Error('That correction would make the current Trade Coin balance negative.');
      nextVisit = { ...nextVisit, tradeCoin: { balance: coin.balance + delta, transactions: coin.transactions.map((transaction) => transaction.id === credit.id ? { ...transaction, amount: replacement.amount!, label: `${objective.title} - ${replacement.recipientName}` } : transaction) } };
    }
    if (request) nextVisit = { ...nextVisit, tradeRequests: nextVisit.tradeRequests!.map((entry) => entry.id === request.id ? { ...entry, amount: replacement.amount!, label: `${objective.title} - ${replacement.recipientName}` } : entry) };
  }
  return { ...state, visits: state.visits.map((entry) => entry.id === visitId ? nextVisit : entry) };
}
export function updateObjectiveRecipient(state: MarketState, id: string, change: Partial<Pick<ObjectiveOfferRecipient, 'name' | 'active' | 'canOfferObjectives'>>): MarketState {
  const recipient = (state.objectiveOfferRecipients ?? []).find((entry) => entry.id === id); if (!recipient || (change.name !== undefined && !change.name.trim())) throw new Error('Recipient change is invalid.');
  if (recipient.type === 'index' && change.active === false) throw new Error('The Gilded Index recipient must remain active.');
  return { ...state, objectiveOfferRecipients: state.objectiveOfferRecipients!.map((entry) => entry.id === id ? { ...entry, ...change, name: change.name?.trim() ?? entry.name } : entry) };
}
export function addObjectiveRecipient(state: MarketState, input: Omit<ObjectiveOfferRecipient, 'id'>): MarketState {
  if (!input.name.trim() || !['faction', 'npc', 'cell', 'player'].includes(input.type)) throw new Error('Enter a recipient name and type.');
  const id = `recipient-${Date.now()}`; return { ...state, objectiveOfferRecipients: [...(state.objectiveOfferRecipients ?? []), { ...input, id, name: input.name.trim() }] };
}

const rewardTypes: Exclude<ObjectiveRewardType, 'tc'>[] = ['rp', 'reputation', 'battle-honour', 'asset', 'narrative'];
const rewardStatuses: RewardStatus[] = ['issued', 'claimed', 'approved', 'spent', 'void'];
const rewardSnapshot = (reward: RewardRecord) => ({ recipientId: reward.recipientId, recipientName: reward.recipientName, recipientType: reward.recipientType, rewardType: reward.rewardType, amount: reward.amount, detail: reward.detail, status: reward.status });
function validateRewardInput(state: MarketState, input: Pick<RewardRecord, 'recipientId' | 'rewardType' | 'amount' | 'detail'>) {
  const recipient = (state.objectiveOfferRecipients ?? []).find((entry) => entry.id === input.recipientId && entry.active);
  if (!recipient || !rewardTypes.includes(input.rewardType) || !input.detail.trim()) throw new Error('Choose an active recipient, reward type, and detail.');
  const numeric = input.rewardType === 'rp' || input.rewardType === 'reputation';
  if (numeric && (!Number.isInteger(input.amount) || input.amount === 0)) throw new Error('RP and reputation rewards require a non-zero whole-number amount.');
  if (!numeric && input.amount !== undefined) throw new Error('Only RP and reputation rewards use a numeric amount.');
  return recipient;
}
export function issueReward(state: MarketState, input: Pick<RewardRecord, 'recipientId' | 'rewardType' | 'amount' | 'detail'>): MarketState {
  const recipient = validateRewardInput(state, input); const now = new Date().toISOString();
  const reward: RewardRecord = { id: `reward-${Date.now()}`, recipientId: recipient.id, recipientName: recipient.name, recipientType: recipient.type, rewardType: input.rewardType, amount: input.amount, detail: input.detail.trim(), source: 'manual', status: 'issued', createdAt: now, updatedAt: now, audit: [] };
  return { ...state, rewardRecords: [...(state.rewardRecords ?? []), reward] };
}
export function updateRewardStatus(state: MarketState, id: string, status: RewardStatus, reason?: string): MarketState {
  const reward = (state.rewardRecords ?? []).find((entry) => entry.id === id); if (!reward || !rewardStatuses.includes(status) || (reward.rewardType === 'reputation' && status === 'spent')) throw new Error('That reward status change is not valid.');
  if (reward.status === 'void' || reward.status === status) throw new Error('That reward cannot take the requested status.');
  if ((status === 'void' || status === 'spent') && !reason?.trim()) throw new Error('Explain why this reward is being voided or spent.');
  const next = { ...reward, status, updatedAt: new Date().toISOString() }; const audit = (status === 'void' || status === 'spent') ? [...reward.audit, { at: next.updatedAt, reason: reason!.trim(), prior: rewardSnapshot(reward), next: rewardSnapshot(next) }] : reward.audit;
  return { ...state, rewardRecords: state.rewardRecords!.map((entry) => entry.id === id ? { ...next, audit } : entry) };
}
export function correctReward(state: MarketState, id: string, input: Pick<RewardRecord, 'recipientId' | 'rewardType' | 'amount' | 'detail'>, reason: string): MarketState {
  const prior = (state.rewardRecords ?? []).find((entry) => entry.id === id); if (!prior || !reason.trim() || prior.status === 'void') throw new Error('A non-void reward correction requires a reason.');
  const recipient = validateRewardInput(state, input); const next = { ...prior, recipientId: recipient.id, recipientName: recipient.name, recipientType: recipient.type, rewardType: input.rewardType, amount: input.amount, detail: input.detail.trim(), updatedAt: new Date().toISOString() };
  return { ...state, rewardRecords: state.rewardRecords!.map((entry) => entry.id === id ? { ...next, audit: [...prior.audit, { at: next.updatedAt, reason: reason.trim(), prior: rewardSnapshot(prior), next: rewardSnapshot(next) }] } : entry) };
}
export function rewardTotals(state: MarketState) { const rows = state.rewardRecords ?? []; const total = (type: 'rp' | 'reputation', recipientId: string) => rows.filter((reward) => reward.rewardType === type && reward.recipientId === recipientId && reward.status === 'approved').reduce((sum, reward) => sum + (reward.amount ?? 0), 0); return (state.objectiveOfferRecipients ?? []).map((recipient) => ({ recipient, rp: total('rp', recipient.id), reputation: total('reputation', recipient.id) })).filter((row) => row.rp !== 0 || row.reputation !== 0); }
export function tradeCoinLedger(state: MarketState) { return state.visits.flatMap((visit) => (visit.tradeCoin?.transactions ?? []).map((transaction) => ({ ...transaction, visitId: visit.id, visitNumber: visit.number }))); }

export function linkedDeals(state: MarketState, visitId: string, lotId: string) { return (state.bidderDeals ?? []).filter((deal) => deal.visitId === visitId && deal.lotId === lotId); }
export function calculateAuctionPressure(state: MarketState, visitId: string, lotId: string, bid: number) { const visit = state.visits.find((entry) => entry.id === visitId); const lot = visit && allLots(visit).find((entry) => entry.id === lotId); const item = lot && getItem(lot.itemId); if (!visit || !lot || !item || !lot.pool.startsWith('marquee') || !Number.isInteger(bid) || bid < item.price.tc) throw new Error('Enter a whole Trade Coin bid at or above the marquee floor.'); const overbid = bid - item.price.tc; const dealReduction = Math.min(3, linkedDeals(state, visitId, lotId).filter((deal) => deal.status === 'active').reduce((sum, deal) => sum + deal.pressureReduction, 0)); return { floor: item.price.tc, requiredRp: item.price.rp, overbidReduction: overbid, dealReduction, pressure: Math.max(1, 6 - overbid - dealReduction) }; }

/** Resolve the GM's Pressure roll. Extra RP is rolled as independent D2s and is deliberately retained in history. */
export function applyAuctionPressure(state: MarketState, input: { visitId: string; lotId: string; playerTc: number; playerRp: number; extraRp: number; responder?: string; rng?: () => number }): MarketState {
  const visit = state.visits.find((entry) => entry.id === input.visitId); const lot = visit && allLots(visit).find((entry) => entry.id === input.lotId); const item = lot && getItem(lot.itemId);
  if (!visit || !lot || !item || visit.id !== state.activeVisitId || visit.phase !== 'catalogue' || lot.status !== 'available' || !lot.pool.startsWith('marquee') || !Number.isInteger(input.playerTc) || !Number.isInteger(input.playerRp) || !Number.isInteger(input.extraRp) || input.extraRp < 0 || input.playerRp !== item.price.rp + input.extraRp) throw new Error('Enter a whole TC bid and the required RP plus any extra RP.');
  const base = calculateAuctionPressure(state, visit.id, lot.id, input.playerTc); const rng = input.rng ?? Math.random;
  const extraRpRolls = Array.from({ length: input.extraRp }, () => (rng() < .5 ? 1 : 2) as 1 | 2);
  const extraReduction = extraRpRolls.filter((result) => result === 1).length;
  const pressure = Math.max(1, base.pressure - extraReduction);
  const d10 = Math.floor(rng() * 10) + 1;
  const success = d10 <= pressure;
  if (success && (!input.responder || !lot.claimants?.some((claimant) => claimant.name === input.responder))) throw new Error('Choose one interested claimant to make the successful counterbid.');
  const check: AuctionCheck = { id: `auction-${Date.now()}`, lotId: lot.id, playerTc: input.playerTc, playerRp: input.playerRp, extraRpRolls, dealReduction: base.dealReduction, pressure, d10, responder: success ? input.responder : undefined, npcTc: success ? input.playerTc + 1 : undefined, createdAt: new Date().toISOString() };
  const nextVisit = { ...visit, auctionChecks: [...(visit.auctionChecks ?? []), check] };
  return replaceClosedVisit(state, nextVisit);
}
export function createBidderDeal(state: MarketState, input: Omit<BidderDeal, 'id' | 'createdAt' | 'updatedAt'>): MarketState { const visit = state.visits.find((entry) => entry.id === input.visitId); const lot = visit && allLots(visit).find((entry) => entry.id === input.lotId); if (!visit || visit.id !== state.activeVisitId || visit.phase !== 'catalogue' || !lot || lot.status !== 'available' || !lot.pool.startsWith('marquee') || !lot.claimants?.some((claimant) => claimant.name === input.bidder) || !input.partyObligation.trim() || !input.bidderObligation.trim() || (input.pressureReduction !== 0 && input.pressureReduction !== 1) || linkedDeals(state,input.visitId,input.lotId).some((deal) => deal.bidder === input.bidder)) throw new Error('This confirmed deal is not valid for the active marquee auction.'); const now = new Date().toISOString(); return { ...state, bidderDeals: [...(state.bidderDeals ?? []), { ...input, id: `deal-${Date.now()}`, createdAt: now, updatedAt: now }] }; }
export function updateBidderDeal(state: MarketState, id: string, change: Partial<Pick<BidderDeal,'partyObligation'|'bidderObligation'|'note'|'pressureReduction'|'status'>>): MarketState { const deal = (state.bidderDeals ?? []).find((entry) => entry.id === id); if (!deal || (change.pressureReduction !== undefined && change.pressureReduction !== 0 && change.pressureReduction !== 1)) throw new Error('Invalid bidder-deal correction.'); const next = { ...deal, ...change, updatedAt: new Date().toISOString() }; if (!next.partyObligation.trim() || !next.bidderObligation.trim()) throw new Error('Both deal obligations are required.'); return { ...state, bidderDeals: state.bidderDeals!.map((entry) => entry.id === id ? next : entry) }; }
export function removeBidderDeal(state: MarketState, id: string): MarketState { if (!(state.bidderDeals ?? []).some((deal) => deal.id === id)) throw new Error('Bidder deal not found.'); return { ...state, bidderDeals: state.bidderDeals!.filter((deal) => deal.id !== id) }; }

export function finalizeVisit(state: MarketState, visit: Visit): MarketState {
  if ((visit.tradeRequests ?? []).some((request) => request.status === 'pending')) throw new Error('Resolve every pending Trade Coin request before departure.');
  const finalize = (lot: Lot) => { if (lot.status === 'npc-won' && (!lot.pool.startsWith('marquee') || !lot.npcWinner)) throw new Error('NPC-won status requires a named marquee claimant.'); if (lot.status === 'purchased' && !lot.settlementId) throw new Error('Purchased status requires a recorded settlement.'); return lot.status === 'available' ? { ...lot, status: 'unsold' as const } : lot; };
  const resolved: Visit = { ...visit, phase: 'resolved', lots: visit.lots.map(finalize), bonusLots: visit.bonusLots?.map(finalize) };
  const coin = visitCoin(resolved); const transactions = coin.balance ? [...coin.transactions, { id: `expiry-${Date.now()}`, label: 'Unspent coin surrendered at departure', amount: -coin.balance, createdAt: new Date().toISOString(), kind: 'expiry' as const }] : coin.transactions;
  resolved.tradeCoin = { balance: 0, transactions };
  return applyCooldowns({ ...state, visits: state.visits.map((entry) => entry.id === visit.id ? resolved : entry) }, resolved);
}

export function buildMarketHistory(state: MarketState): MarketHistoryEntry[] {
  return state.visits.filter((visit) => visit.phase === 'resolved' || visit.phase === 'aborted').flatMap((visit) => [
    ...(visit.settlements ?? []).map((record) => ({ id: record.id, visitId: visit.id, visitNumber: visit.number, itemId: record.itemId, itemName: record.itemName, outcome: 'cell' as const, buyer: record.buyer, tcSpent: record.tcSpent, requiredRp: record.requiredRp, rpConfirmed: record.rpConfirmed, settledAt: record.settledAt, adaptation: record.adaptation })),
    ...allLots(visit).filter((lot) => lot.status === 'npc-won' && lot.npcWinner).map((lot) => ({ id: `npc-${visit.id}-${lot.id}`, visitId: visit.id, visitNumber: visit.number, itemId: lot.itemId, itemName: getItem(lot.itemId)?.name ?? lot.itemId, outcome: 'npc' as const, buyer: lot.npcWinner! })),
  ]);
}
