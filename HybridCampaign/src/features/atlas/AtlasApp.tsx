import { useEffect, useState } from 'react';
import type { AtlasLocation, PlayerAtlasProjection } from './atlas-types';

type Terminal = { id: string; label: string; note: string };
const bridgeTerminals: readonly Terminal[] = [
  { id: 'army', label: 'Army manager', note: 'Force-record terminal integration pending.' },
  { id: 'briefings', label: 'Briefings', note: 'Published record terminal integration pending.' },
  { id: 'resources', label: 'Cell resources', note: 'Shared asset terminal integration pending.' },
  { id: 'operations', label: 'Operations', note: 'Published operation terminal integration pending.' },
];
const lowerTerminals: readonly Terminal[] = [
  { id: 'travel', label: 'Travel corridors', note: 'Journey-planning terminal integration pending.' },
  { id: 'activities', label: 'Location activities', note: 'Published activity terminal integration pending.' },
  { id: 'relationships', label: 'Relationships & leads', note: 'Player-safe lead terminal integration pending.' },
];

const responseJson = async <T,>(response: Response): Promise<T> => {
  const raw = await response.text();
  if (!raw.trim()) throw new Error('The command deck returned an empty response.');
  let body: unknown;
  try { body = JSON.parse(raw); } catch { throw new Error('The command deck returned an invalid response.'); }
  if (!response.ok) throw new Error(typeof (body as { error?: unknown }).error === 'string' ? (body as { error: string }).error : 'The command deck is unavailable.');
  return body as T;
};

const TerminalControl = ({ terminal }: { terminal: Terminal }) => <button className="atlas-terminal-control" type="button" disabled aria-disabled="true" title={terminal.note}>
  <strong>{terminal.label}</strong><span>Terminal integration pending.</span>
</button>;

const Dossier = ({ location }: { location: AtlasLocation | undefined }) => <article className="atlas-detail atlas-side-dossier" aria-live="polite">
  {location ? <>
    <span className="world-meta">{location.detailStatus === 'dossier' ? 'Dossier' : 'Map-only'} · published</span>
    <h2>{location.title}</h2>
    <p>{location.publicDescription}</p>
    <p><strong>Access:</strong> {location.authorityAccess}</p>
    {location.consequences.map((consequence, index) => <p key={`${location.id}-${index}`}><strong>Known consequence:</strong> {consequence}</p>)}
    <section className="atlas-available-actions" aria-label="Available location actions"><h3>Available actions</h3><p>No duties or opportunities are currently assigned at this location.</p></section>
  </> : <p>Loading the cleared Tavrellis survey feed…</p>}
</article>;

export default function AtlasApp({ accountKey }: { accountKey: string }) {
  const [deck, setDeck] = useState<PlayerAtlasProjection>();
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void fetch('/hybrid-campaign/api/atlas', { cache: 'no-store', headers: { Accept: 'application/json', 'X-Preview-Campaign-Role': 'player', 'X-Preview-Campaign-Account': accountKey } })
      .then(responseJson<PlayerAtlasProjection>)
      .then(data => { if (active) { setDeck(data); setSelectedId(current => current || data.locations[0]?.id || ''); } })
      .catch(problem => { if (active) setError(problem instanceof Error ? problem.message : 'The command deck is unavailable.'); });
    return () => { active = false; };
  }, [accountKey]);

  const selected = deck?.locations.find(location => location.id === selectedId) ?? deck?.locations[0];
  const partyLocation = deck?.locations.find(location => location.id === deck.partyLocationId);
  if (error) return <main className="display atlas-page atlas-command-deck"><section className="atlas-load-error" role="alert"><h2>Hololithic chart unavailable</h2><p>The command deck cannot retrieve its cleared survey feed. Reload the page and try again.</p></section></main>;
  return <main className="display atlas-page atlas-command-deck">
    <header className="atlas-command-top">
      <div className="atlas-bridge-title"><img className="atlas-inquisition-sigil" src="/hybrid-campaign/assets/branding/inquisitorial-command-seal.png" alt="" aria-hidden="true"/><div>
        <p className="eyebrow">Inquisitorial command bridge · public survey feed</p><h1>Tavrellis hololithic chart</h1>
        <p className="atlas-welcome">Welcome aboard, {deck?.playerName ?? 'authorised operative'}.</p>
        <div className="atlas-command-status" aria-label="Player campaign status"><span>Location <b>{partyLocation?.title ?? 'No published assignment'}</b></span><span>Operation <b>No published operation</b></span><span>Signals <b>{deck?.urgentSignals.length ?? 0}</b></span></div>
      </div></div>
      <nav className="atlas-tool-strip" aria-label="Future player terminals">{bridgeTerminals.map(terminal => <TerminalControl terminal={terminal} key={terminal.id}/>)}</nav>
    </header>
    <aside className="atlas-ongoings" aria-labelledby="atlas-signals-title"><p className="eyebrow">Vox & astropathic traffic</p><h2 id="atlas-signals-title">Priority reports</h2>
      {deck?.urgentSignals.length ? deck.urgentSignals.map(signal => <article className={`atlas-alert atlas-alert-${signal.severity}`} key={signal.id}><strong>{signal.title}</strong><span>{signal.detail}</span></article>) : <p className="atlas-empty">No priority reports await your attention.</p>}
    </aside>
    <section className="atlas-system-panel" aria-label="Interactive Tavrellis system map">
      <div className="atlas-screen-heading"><span>Hololithic system survey · Tavrellis</span><span className="atlas-map-date"><small>Campaign date</small><b>{deck?.campaignDate ?? 'Acquiring chronometer data'}</b></span><span>Clearance: Cell public</span></div>
      <p className="atlas-selection-announcement" aria-live="polite">{selected ? `${selected.title} selected.` : 'No location selected.'}</p>
      <div className="atlas-holomap"><div className="atlas-map">
        <img src="/hybrid-campaign/assets/world-atlas/tavrellis-system-unlabelled-map.png" alt="Tavrellis system holomap"/>
        {partyLocation ? <span className="atlas-party-marker" role="img" aria-label={`Current Cell position: ${partyLocation.title}`} style={{ left: `${partyLocation.mapPosition.x}%`, top: `${partyLocation.mapPosition.y}%` }}><span>⌖</span></span> : <span className="atlas-party-marker-note">POSITION // AWAITING PUBLIC ASSIGNMENT</span>}
        {deck?.locations.map(location => <button className={`atlas-pin ${location.mapPosition.x > 79 ? 'atlas-pin-right-edge' : ''}`} type="button" key={location.id} data-location-id={location.id} aria-label={`View ${location.title}`} aria-pressed={selected?.id === location.id} title={location.title} style={{ left: `${location.mapPosition.x}%`, top: `${location.mapPosition.y}%` }} onClick={() => setSelectedId(location.id)}><span className="atlas-pin-dot" aria-hidden="true"/><span className="atlas-pin-label" aria-hidden="true">{location.mapLabel}</span></button>)}
      </div><div className="atlas-holotable-plinth" aria-hidden="true"><span className="atlas-holotable-support"/><span className="atlas-holotable-support"/></div><span className="atlas-tracked-body" aria-hidden="true">{selected ? `TRACKED BODY // ${selected.mapLabel.toUpperCase()}` : 'TRACKED BODIES // ACQUIRING'}</span></div>
    </section>
    <aside className="atlas-quick" aria-labelledby="atlas-terminal-title"><Dossier location={selected}/><p className="eyebrow">Sanctioned command terminal</p><h2 id="atlas-terminal-title">Requisition & records</h2>{lowerTerminals.map(terminal => <TerminalControl terminal={terminal} key={terminal.id}/>)}</aside>
  </main>;
}
