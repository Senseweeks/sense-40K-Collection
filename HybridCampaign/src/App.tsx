import { useEffect, useMemo, useState } from 'react';
import { activeVisit, replaceVisit, resolveChaosCeremony } from './ceremony';
import { adaptationEntries, allLots, applyAuctionPressure, availableIndexObjectives, cooldownEntries, attachGeneratedVisit, buildMarketHistory, calculateAuctionPressure, catalogue, categoryTitle, correctNpcWinner, correctSettlement, createBidderDeal, addObjectiveRecipient, correctObjectiveOffer, updateObjectiveRecipient, defaultObjectiveRecipients, defaultState, finalizeVisit, generateVisit, getItem, issueObjective, issueReward, labelForLot, linkedDeals, presentObjective, recordNpcWinner, recordSettlement, redeemObjectiveInState, removeBidderDeal, removeNpcWinner, removeSettlement, replaceUnrevealedLot, rewardTotals, tradeCoinLedger, updateBidderDeal, updateRewardStatus, correctReward, validateMarketState } from './market';
import { useIndexRelay } from './relay';
import type { BidderDeal, CampaignRole, Lot, MarketHistoryEntry, MarketState, ObjectiveOffer, ObjectiveOfferRecipient, RewardRecord, RewardStatus, TradeRequest, Visit } from './types';
import { ErrorDialog, errorText } from './ui/ErrorDialog';
import { MarketCommitProvider, useMarketCommit } from './ui/CommitContext';
import { AtTableShell, atTableCss } from './ui/AtTableShell';
import { CeremonyClock, CeremonyCommand } from './components/CeremonyCommand';
import { GovernancePanel, governanceCss } from './components/GovernancePanel';
import { Buyer, Modal, Months } from './components/MarketModal';
import { RewardsPage } from './features/rewards/RewardsPage';
import { Display, Exchange, Inventory } from './features/player/PlayerRoutes';
import { AuctionDesk } from './features/market/AuctionDesk';
import { ObjectiveRegister } from './features/objectives/ObjectiveRegister';
import { ClosedHistory } from './features/history/ClosedHistory';
import { OperationsPage, operationsCss } from './features/operations/OperationsPage';
import { PlayerOperations } from './features/operations/PlayerOperations';
import { CampaignManagement } from './features/campaign/CampaignManagement';
import { CampaignLedger, PlayerBriefings, campaignLedgerCss } from './features/campaign/CampaignLedger';
import { EconomyPage, PlayerResources } from './features/campaign/EconomyPage';
import { ArmyPage, RostersPage, armyCss } from './features/army/ArmyPage';
import { PlayerAtlas, WorldPage, worldCss } from './features/world/WorldPage';
import { PasswordAction, SignIn, useHostedActor } from './features/player/AuthGateway';
import { GmAccess } from './features/campaign/GmAccess';
const price = (l: Lot) => { const p = getItem(l.itemId)!.price; return `${p.tc} TC${p.rp ? ` + ${p.rp} RP` : ''}${p.auction ? ' minimum bid' : ''}`; };
const isUnit = (l: Lot) => l.pool === 'unit3' || l.pool === 'unit4';
const amend = (v: Visit, id: string, f: (l: Lot) => Lot): Visit => ({ ...v, lots: v.lots.map(l => l.id === id ? f(l) : l), bonusLots: v.bonusLots?.map(l => l.id === id ? f(l) : l) });
const message = (report: (x: string) => void, error: unknown) => { const text = errorText(error); report(text); dispatchEvent(new CustomEvent('gilded-index-error', { detail: text })); };
const objectiveCss = `.modal>section:has(.trade-stack){width:min(880px,100%);padding:30px 34px}.objective-heading{margin:0 0 18px;padding:12px 14px;border-left:3px solid #65d6df;background:rgba(42,82,76,.3)}.objective-heading span,.trade-card header span{color:#76dfe4;font:700 .66rem Arial,sans-serif;letter-spacing:.13em}.objective-heading p{margin:5px 0 0;color:#c7d1c7}.trade-stack{display:grid;gap:14px;margin:18px 0}.trade-card{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px;padding:18px!important;border:1px solid #526159!important;background:#101a18}.trade-card header{position:relative;grid-column:1/-1!important;width:100%;display:flex;flex-direction:column;align-items:flex-start;gap:5px;padding:0 150px 12px 0;border-bottom:1px solid #3e504a}.trade-card header strong{display:block;color:#f1d7a0;font-size:1.08rem}.trade-card .quiet-button{align-self:end;justify-self:start}.interest-toggle{position:absolute;right:0;top:2px;display:inline-flex!important;align-items:center;justify-content:flex-start;gap:8px;width:max-content;margin:2px 0 8px!important;padding:5px 9px;border:1px solid #4f756c;border-radius:999px;background:#18312d;color:#bfe6dc!important;font:700 .68rem Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase}.interest-toggle input{appearance:none;width:12px!important;height:12px;margin:0!important;padding:0!important;border:1px solid #6ddad8!important;border-radius:50%;background:transparent!important}.interest-toggle input:checked{background:#6ddad8!important;box-shadow:0 0 7px rgba(109,218,216,.7)}.trade-disabled{opacity:.56;border-color:#3f4d49!important;background:#0c1211!important}.trade-disabled header strong{text-decoration:line-through;color:#9da9a0}.trade-disabled>label:not(.interest-toggle),.trade-disabled .quiet-button{display:none!important}.market-ledgers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin:28px 0}.market-ledgers article{padding:18px;border:1px solid #526159;background:#14201d}.market-ledgers h2{margin-bottom:12px}.market-ledgers p{padding:9px 0;margin:0;border-top:1px solid #35443e;color:#c9d1c6}.modal-actions{display:flex;justify-content:space-between;gap:12px;margin-top:20px}.quiet-button{border-color:#596a63!important;background:#13201d!important;color:#c9d5cc!important}@media(max-width:650px){.modal>section:has(.trade-stack){padding:22px 18px}.trade-card{grid-template-columns:1fr}.modal-actions{flex-direction:column}}`;
const objectiveRecipients = [
    ['adeptus-astartes', 'Adeptus Astartes', 'faction'], ['adeptus-mechanicus', 'Adeptus Mechanicus', 'faction'], ['agents-imperium', 'Agents of the Imperium', 'faction'], ['astra-militarum', 'Astra Militarum', 'faction'], ['grey-knights', 'Grey Knights', 'faction'],
    ['cassian-verid', 'Rogue Trader Cassian Verid', 'npc'], ['eremus-vahl', 'Tithe-House Provost Eremus Vahl', 'npc'], ['octavia-merrow', 'Tithe Prefect Octavia Merrow', 'npc'], ['marius-calthorne', 'Lord Governor Marius Calthorne', 'npc'], ['orest-valecourt', 'Inquisitor Orest Valecourt', 'npc']
] as const;
const workflowCss = `.modal{position:fixed;z-index:100;inset:0;display:grid;place-items:center;padding:20px;background:rgba(2,7,6,.78);backdrop-filter:blur(3px)}.modal>section{position:relative;width:min(620px,100%);max-height:90vh;overflow:auto;padding:28px;background:#15201e;border:1px solid #b38a4d;box-shadow:0 18px 70px #000;color:#eadfc9}.modal label,.auction-desk label,.objectives label{display:block;margin:12px 0;color:#c7d0c3}.modal input,.modal select,.auction-desk input,.auction-desk select,.objectives input,.objectives select,.filters input,.filters select,.history>input{width:100%;margin-top:5px;padding:9px;color:#eee5d2;background:#0d1513;border:1px solid #6f765f}.modal-close{position:absolute;right:12px;top:10px;border:0!important;background:none!important;font-size:1.6rem;padding:2px!important}.history,.auction-desk,.objectives{margin-top:28px;padding:18px;border:1px solid #586257;background:#14201d}.history article,.auction-desk article,.objectives article,.inventory-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px;padding:12px;border-top:1px solid #45534d}.history article span{flex:1;color:#bfc6b8}.history button,.auction-desk button,.objectives button,.modal button{margin:8px 6px 0 0}.debt{padding:8px;border-left:3px solid #d26b51;background:#34201b;color:#ffd2bd}.auction-inputs{display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:10px}.auction-result,.player-auction{padding:12px;border-left:3px solid #60d6da;background:rgba(32,80,74,.34)}.objectives article{align-items:flex-end}.inventory header{margin-bottom:22px}.filters{display:flex;gap:10px;flex-wrap:wrap}.filters>*{min-width:200px;flex:1}.inventory-row{display:grid;grid-template-columns:1.2fr 2fr 1fr}.opportunity{margin-top:26px;padding:18px;border:1px solid #a98a54;background:rgba(14,24,22,.9)}.opportunity article{padding:10px 0;border-top:1px solid #4d5c54}.player-auction{margin-bottom:15px}@media(max-width:760px){.auction-inputs{grid-template-columns:1fr}.inventory-row{grid-template-columns:1fr}.modal{padding:10px}.modal>section{padding:22px 18px}}`;
const campaignCss = `.campaign-management,.economy-page{max-width:1180px}.campaign-grid,.economy-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.campaign-grid>article,.source-search,.economy-grid>article,.rp-history{padding:20px;border:1px solid #526159;background:#14201d}.campaign-management label,.economy-page label{display:block;margin:12px 0}.campaign-management input,.campaign-management select,.economy-page input,.economy-page select{width:100%;margin-top:5px;padding:9px;color:#eee5d2;background:#0d1513;border:1px solid #6f765f}.preset-row{display:flex;gap:8px;flex-wrap:wrap}.ledger-row,.source-search article,.economy-row,.rp-history article{display:grid;gap:6px;padding:12px 0;border-top:1px solid #45534d}.source-search,.rp-history{margin-top:20px}.source-search span{color:#9fb0a6;font-size:.9rem}.identity-form{display:grid;grid-template-columns:minmax(0,1fr) 150px auto;gap:10px;align-items:end}.identity-form label{margin:0}.identity-form button{margin-bottom:12px}.identity-list{list-style:none;margin:14px 0 0;padding:0}.identity-list li{display:flex;gap:10px;justify-content:space-between;padding:8px 0;border-top:1px solid #45534d}.identity-list span{color:#9fb0a6;text-transform:capitalize}.economy-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:20px 0}.economy-summary article{padding:14px;border:1px solid #526159;background:#14201d}.economy-summary span{display:block;color:#9fb0a6}.economy-summary strong{font-size:1.6rem}.economy-form{margin-top:18px;padding-top:10px;border-top:1px solid #45534d}@media(max-width:760px){.campaign-grid,.economy-grid,.economy-summary{grid-template-columns:1fr}.identity-form{grid-template-columns:1fr}.identity-form button{margin-bottom:0}}`;
const gmRoutes = new Set(['#/', '#/access', '#/rewards', '#/economy', '#/operations', '#/world', '#/campaign', '#/ledger', '#/army']);
const isGm = (role: CampaignRole) => ['owner-gm', 'gm', 'co-gm'].includes(role);
const permittedRoute = (role: CampaignRole, route: string) => isGm(role) || (role === 'display' ? route === '#/display' : !gmRoutes.has(route));
const RouteDenied = ({ role }: { role: CampaignRole }) => <main className="display"><header className="gallery-header"><p className="eyebrow">Campaign access boundary</p><h1>That workspace is not assigned to this role</h1></header><section><p>{role === 'display' ? 'The display view is limited to the published gallery.' : 'Use the player-facing links provided by the campaign hub.'}</p><a className="display-link" href={role === 'display' ? '#/display' : '#/briefings'}>Open your available view</a></section></main>;
export default function App() { const [route, setRoute] = useState(location.hash || '#/'); const access = useHostedActor(); const localRole = route === '#/display' ? 'display' : route === '#/exchange' || route === '#/briefings' || route === '#/resources' || route === '#/operation-briefing' || route === '#/rosters' || route === '#/atlas' ? 'player' : 'owner-gm'; const role = access.hosted ? (access.actor?.role ?? 'display') : localRole; const relay = useIndexRelay(role); const [error, setError] = useState(''); useEffect(() => { const f = () => setRoute(location.hash || '#/'); const onError = (event: Event) => setError(String((event as CustomEvent<string>).detail || 'The action could not be completed.')); addEventListener('hashchange', f); addEventListener('gilded-index-error', onError); return () => { removeEventListener('hashchange', f); removeEventListener('gilded-index-error', onError); }; }, []); if (access.hosted && !access.ready) return <main className="control"><p>Connecting to campaign portal…</p></main>; const authMatch = route.match(/^#\/(activate|reset)\?token=(.+)$/); if (access.hosted && authMatch) return <PasswordAction kind={authMatch[1] as 'activate' | 'reset'} token={decodeURIComponent(authMatch[2])} onSignedIn={() => void access.refresh()}/>; if (access.hosted && !access.actor) return <SignIn onSignedIn={() => void access.refresh()}/>; const page = !permittedRoute(role, route) ? <RouteDenied role={role}/> : route === '#/access' ? <GmAccess report={setError}/> : route === '#/display' ? <Display state={relay.state} online={relay.online}/> : route === '#/exchange' ? <Exchange state={relay.state} commit={relay.systemCommit} report={setError}/> : route === '#/briefings' ? <PlayerBriefings report={setError}/> : route === '#/resources' ? <PlayerResources report={setError}/> : route === '#/atlas' ? <PlayerAtlas report={setError}/> : route === '#/catalogue' ? <Inventory state={relay.state}/> : route === '#/rewards' ? <RewardsPage state={relay.state} commit={relay.commit}/> : route === '#/economy' ? <EconomyPage report={setError}/> : route === '#/operation-briefing' ? <PlayerOperations report={setError}/> : route === '#/operations' ? <OperationsPage state={relay.state} commit={relay.commit} report={setError}/> : route === '#/world' ? <WorldPage report={setError}/> : route === '#/campaign' ? <CampaignManagement currentDate={relay.state.campaignGovernance!.currentDate} report={setError}/> : route === '#/ledger' ? <CampaignLedger currentDate={relay.state.campaignGovernance!.currentDate} report={setError}/> : route === '#/army' ? <ArmyPage report={setError}/> : route === '#/rosters' ? <RostersPage report={setError}/> : <AtTableShell><Control {...relay}/></AtTableShell>; return <MarketCommitProvider value={relay.commit}><style>{workflowCss + objectiveCss + operationsCss + governanceCss + atTableCss + campaignCss + campaignLedgerCss + armyCss + worldCss}</style><CeremonyClock state={relay.state} commit={relay.systemCommit} onError={error => message(setError, error)}/>{page}<ErrorDialog error={error} clear={() => setError('')}/></MarketCommitProvider>; }
function Control({ state, commit, online }: {
    state: MarketState;
    commit: (s: MarketState) => Promise<void>;
    online: boolean;
}) {
    const active = activeVisit(state);
    const [settle, setSettle] = useState<Lot>();
    const [winner, setWinner] = useState<Lot>();
    const [close, setClose] = useState(false);
    const [error, setError] = useState('');
    const save = (x: MarketState) => void commit(x).catch(e => message(setError, e));
    const setVisit = (v: Visit) => save(replaceVisit(state, v));
    const answer = (r: TradeRequest, ok: boolean) => {
        if (!active)
            return;
        const coin = active.tradeCoin ?? { balance: 0, transactions: [] };
        const req = (active.tradeRequests ?? []).map(x => x.id === r.id ? { ...x, status: ok ? 'approved' as const : 'rejected' as const } : x);
        setVisit(ok ? { ...active, tradeRequests: req, tradeCoin: { balance: coin.balance + r.amount, transactions: [...coin.transactions, { id: `credit-${Date.now()}`, label: r.label, amount: r.amount, createdAt: new Date().toISOString(), kind: r.kind === 'rp' ? 'rp-credit' : 'objective-credit' }] } } : { ...active, tradeRequests: req });
    };
    const replace = (l: Lot) => {
        if (!active)
            return;
        try {
            const used = new Set(allLots(active).map(x => x.itemId));
            const choices = catalogue.filter(x => x.pool === l.pool && !used.has(x.id) && !state.retired.includes(x.id) && !state.cooldowns[x.id]);
            if (choices.length)
                setVisit(replaceUnrevealedLot(active, l.id, choices[Math.floor(Math.random() * choices.length)], state.ceremony.lotPosition));
        }
        catch (e) {
            message(setError, e);
        }
    };
    return <main className="control"><header className="control-header"><div><p className="eyebrow">Cassian Verid's private control</p><h1>The Gilded Index</h1></div><span className={`uplink ${online ? 'online' : 'offline'}`}>{online ? 'INDEX UPLINK LIVE' : 'UPLINK RECONNECTING'}</span></header><section className="control-actions"><a className="display-link" href="#/catalogue">GM inventory</a><a className="display-link" href="#/ledger">Campaign ledger</a><a className="display-link" href="#/economy">Economy & assets</a><a className="display-link" href="#/campaign">Time & sources</a><a className="display-link" href="#/operations">Clocks & events</a><a className="display-link" href="#/world">World & arcs</a><a className="display-link" href="#/army">Army management</a><a className="display-link" href="#/display" target="_blank">Open player gallery</a><a className="display-link" href="#/exchange" target="_blank">Open Miren's counter</a></section><GovernancePanel governance={state.campaignGovernance!}/><CeremonyCommand state={state} save={save} prepare={() => { try { const visit = generateVisit(state); save(attachGeneratedVisit(state, visit)); } catch (error) { message(setError, error); } }} report={setError}>{state.ceremony.status === "awaiting-chaos-resolution" && <section className="chaos-resolution"><p className="eyebrow">Guard interruption · event command required</p><h2>Chaos operation awaiting resolution</h2><p>Run and record The Gilded Index Under Fire before reopening the register.</p><a className="display-link" href="#/operations">Open event command</a></section>}</CeremonyCommand>{error && <p className="form-error">{error}</p>}{active && <><section className="visit-overview"><div><span>Register</span><strong>{active.number}</strong></div><div><span>Trade Coin</span><strong>{active.tradeCoin?.balance ?? 0} TC</strong></div><div><span>Phase</span><strong>{active.phase}</strong></div><div><span>Pending claims</span><strong>{(active.tradeRequests ?? []).filter(x => x.status === 'pending').length}</strong></div></section><section id="holdings" className="gm-lots"><h2>Registered holdings</h2>{allLots(active).map(l => { const revealed = state.ceremony.lotPosition >= l.position; return <article className="gm-lot" key={l.id}><div><span>LOT {l.position} · {labelForLot(l)} · {l.status}</span><h3>{getItem(l.itemId)!.name}</h3><p>{categoryTitle(l.pool)} · {price(l)}{l.npcWinner ? ` · NPC: ${l.npcWinner}` : ''}</p></div><div className="lot-actions"><button onClick={() => setVisit(amend(active, l.id, x => ({ ...x, locked: !x.locked })))}>{l.locked ? 'Unlock' : 'Lock'}</button><button disabled={l.locked || revealed || l.status !== 'available'} onClick={() => replace(l)}>Replace</button>{l.status === 'available' && <><button onClick={() => setSettle(l)}>Settle</button>{l.pool.startsWith('marquee') && <button onClick={() => setWinner(l)}>NPC winner</button>}<button onClick={() => setVisit(amend(active, l.id, x => ({ ...x, status: 'unsold' })))}>Unsold</button></>}</div></article>; })}</section><AuctionDesk state={state} commit={commit} report={setError}/><ObjectiveRegister visit={active} state={state} setVisit={setVisit} report={setError}/><section className="gm-requests"><h2>Counter requests</h2>{(active.tradeRequests ?? []).filter(x => x.status === 'pending').map(x => <article key={x.id}><span>{x.label} · {x.amount} TC</span><button onClick={() => answer(x, true)}>Approve</button><button onClick={() => answer(x, false)}>Refuse</button></article>)}</section><section className="utility-actions"><button onClick={() => setClose(true)}>Close visit</button><label>Import state<input type="file" accept="application/json" onChange={event => event.target.files?.[0]?.text().then(text => save(validateMarketState(JSON.parse(text) as MarketState))).catch(error => message(setError, error))}/></label></section></>}<MarketLedgers state={state}/><ClosedHistory state={state} save={save} report={setError}/>{settle && <Settlement lot={settle} visit={active!} roster={state.buyerRoster ?? ['The Cell']} close={() => setSettle(undefined)} save={(buyer, tc, rp, days) => {
                try {
                    const v = recordSettlement(active!, settle.id, { buyer, tcSpent: tc, rpConfirmed: rp, adaptationDays: days, settledAt: new Date().toISOString(), campaignDate: state.campaignGovernance!.currentDate });
                    save({ ...replaceVisit(state, v), buyerRoster: [...new Set([...(state.buyerRoster ?? ['The Cell']), buyer.trim()])].filter(Boolean) });
                    setSettle(undefined);
                }
                catch (e) {
                    message(setError, e);
                }
            }}/>} {winner && <Winner lot={winner} close={() => setWinner(undefined)} save={name => {
                try {
                    setVisit(recordNpcWinner(active!, winner.id, name));
                    setWinner(undefined);
                }
                catch (e) {
                    message(setError, e);
                }
            }}/>} {close && <Closeout visit={active!} close={() => setClose(false)} finish={() => {
                try {
                    save({ ...finalizeVisit(state, active!), ceremony: defaultState().ceremony });
                    setClose(false);
                }
                catch (e) {
                    message(setError, e);
                }
            }}/>}</main>;
}
function ChaosResolution({ state, save, report }: {
    state: MarketState;
    save: (state: MarketState) => void;
    report: (text: string) => void;
}) {
    const [outcome, setOutcome] = useState<'full-success' | 'primary-success' | 'failure'>('primary-success');
    const [attended, setAttended] = useState(true);
    const visit = activeVisit(state);
    if (!visit?.chaos?.triggered)
        return null;
    return <section className="chaos-resolution">
        <p className="eyebrow">Guard interruption · GM resolution required</p>
        <h2>{visit.chaos.attackType ?? 'Chaos interruption'}</h2>
        <p>Record the table outcome before Miren reopens the register.</p>
        <label>Outcome<select value={outcome} onChange={event => setOutcome(event.target.value as typeof outcome)}>
            <option value="full-success">Full success</option><option value="primary-success">Primary success</option><option value="failure">Failure</option>
        </select></label>
        <label><input type="checkbox" checked={attended} onChange={event => setAttended(event.target.checked)}/> The Cell attended the intervention</label>
        <button onClick={() => { try {
        save(resolveChaosCeremony(state, outcome, attended));
    }
    catch (error) {
        message(report, error);
    } }}>Resolve Chaos and open catalogue</button>
    </section>;
}
function Settlement({ lot, visit, roster, close, save }: {
    lot: Lot;
    visit: Visit;
    roster: string[];
    close: () => void;
    save: (buyer: string, tc: number, rp: boolean, days?: 28 | 84) => void;
}) { const item = getItem(lot.itemId)!; const [buyer, setBuyer] = useState(roster[0] ?? 'The Cell'); const [tc, setTc] = useState(item.price.tc); const [rp, setRp] = useState(item.price.rp === 0); const [days, setDays] = useState<28 | 84>(28); return <Modal title={item.name} close={close}><Buyer buyer={buyer} setBuyer={setBuyer} roster={roster}/><label>TC spent<input type="number" min={item.price.tc} value={tc} onChange={e => setTc(Number(e.target.value))}/></label><p>Available trust: {visit.tradeCoin?.balance ?? 0} TC · Required RP: {item.price.rp}</p>{item.price.rp > 0 && <label><input type="checkbox" checked={rp} onChange={e => setRp(e.target.checked)}/> Required RP payment confirmed</label>}{isUnit(lot) && <Months value={days} setValue={setDays}/>}<button onClick={() => save(buyer, tc, rp, isUnit(lot) ? days : undefined)}>Record settlement</button></Modal>; }
function Winner({ lot, close, save }: {
    lot: Lot;
    close: () => void;
    save: (x: string) => void;
}) { const [name, setName] = useState(lot.claimants?.[0]?.name ?? ''); return <Modal title="Record NPC winner" close={close}><label>Interested claimant<select value={name} onChange={e => setName(e.target.value)}><option value="">Select claimant</option>{lot.claimants?.map(x => <option key={x.name} value={x.name}>{x.name} · {x.interest}</option>)}</select></label><button disabled={!name} onClick={() => save(name)}>Record winner</button></Modal>; }
function Closeout({ visit, close, finish }: {
    visit: Visit;
    close: () => void;
    finish: () => void;
}) { const pending = (visit.tradeRequests ?? []).filter(x => x.status === 'pending'); const unsold = allLots(visit).filter(x => x.status === 'available'); return <Modal title="Departure preflight" close={close}>{pending.length ? <><p className="form-error">Resolve every Trade Coin request before departure.</p><ul>{pending.map(x => <li key={x.id}>{x.label} · {x.amount} TC</li>)}</ul></> : <p>All Trade Coin requests are resolved.</p>}<p><strong>Unsold:</strong> {unsold.length ? unsold.map(x => getItem(x.itemId)!.name).join(', ') : 'none'}.</p><p>All non-retired holdings receive a two-visit cooldown. Unspent {visit.tradeCoin?.balance ?? 0} TC expires.</p><button disabled={pending.length > 0} onClick={finish}>Confirm departure</button></Modal>; }
function MarketLedgers({ state }: {
    state: MarketState;
}) { const cooldowns = cooldownEntries(state); const adapting = adaptationEntries(state); return <section id="ledgers" className="market-ledgers"><article><h2>Cooldown Tracker</h2>{cooldowns.length ? cooldowns.map(entry => <p key={entry.item!.id}><strong>{entry.item!.name}</strong> · shown Visit {entry.lastShownVisit ?? '—'} · {entry.remaining} visit(s) remaining · eligible Visit {entry.nextEligibleVisit}</p>) : <p>All stock is currently eligible.</p>}</article><article><h2>Adaptation Ledger</h2>{adapting.length ? adapting.map(entry => <p key={entry.id}><strong>{entry.itemName}</strong> · {entry.buyer} · {entry.adaptation!.durationDays === 28 ? '1 month' : '3 months'} · ready {new Date(entry.adaptation!.readyAt).toLocaleDateString()}</p>) : <p>No market units are currently adapting.</p>}<a className="display-link" href="#/rewards">Open rewards & adaptation ledger</a></article></section>; }
function revealSummary(item: ReturnType<typeof getItem>) { return item?.rules.split(/(?<=[.!?])\s+/)[0] ?? ''; }
