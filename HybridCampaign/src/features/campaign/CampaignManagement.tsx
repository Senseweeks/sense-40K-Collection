import { useEffect, useState } from 'react';
import { formatCampaignDate } from '../../market';
import type { CampaignDate, CampaignDocketActivity, CampaignDocketEntry, CampaignIdentity, LegacyAdaptationReview } from '../../types';
import { campaignFetch } from '../../runtime';

const activities: CampaignDocketActivity[] = ['preparation', 'transit', 'operation', 'return', 'market-visit', 'downtime', 'repair-recovery-training', 'deadline', 'custom'];
const headers = { 'Content-Type': 'application/json' };
const request = async <T,>(url: string, options?: RequestInit): Promise<T> => {
  const response = await campaignFetch(url, { ...options, headers: { ...headers, ...(options?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? 'The campaign API rejected this request.');
  return body as T;
};

export function CampaignManagement({ currentDate, report }: { currentDate: CampaignDate; report: (message: string) => void }) {
  const [docket, setDocket] = useState<CampaignDocketEntry[]>([]);
  const [legacy, setLegacy] = useState<LegacyAdaptationReview[]>([]);
  const [identities, setIdentities] = useState<CampaignIdentity[]>([]);
  const [sources, setSources] = useState<{ id: string; title: string; vaultPath: string; status: string; excerpt: string }[]>([]);
  const [activity, setActivity] = useState<CampaignDocketActivity>('downtime');
  const [days, setDays] = useState(1); const [note, setNote] = useState(''); const [query, setQuery] = useState('');
  const [identityName, setIdentityName] = useState('');
  const [identityRole, setIdentityRole] = useState<CampaignIdentity['role']>('player');
  const load = () => Promise.all([
    request<CampaignDocketEntry[]>('/campaign/docket').catch(() => []),
    request<LegacyAdaptationReview[]>('/campaign/legacy-adaptations').catch(() => []),
    request<CampaignIdentity[]>('/campaign/identities').catch(() => []),
    request<typeof sources>('/campaign/sources').catch(() => []),
  ]).then(([entries, reviews, people, indexed]) => { setDocket(entries); setLegacy(reviews); setIdentities(people); setSources(indexed); });
  useEffect(() => { void load().catch(error => report(error.message)); }, []);
  const advance = async () => { try { await request('/campaign/docket', { method: 'POST', body: JSON.stringify({ activity, durationDays: days, note, actorId: 'local-owner' }) }); setNote(''); await load(); location.reload(); } catch (error) { report(error instanceof Error ? error.message : 'Could not advance campaign time.'); } };
  const confirm = async (review: LegacyAdaptationReview) => { try { await request(`/campaign/legacy-adaptations/${review.id}/confirm`, { method: 'POST', body: JSON.stringify({ campaignSettledAt: currentDate }) }); await load(); location.reload(); } catch (error) { report(error instanceof Error ? error.message : 'Could not confirm the adaptation date.'); } };
  const addIdentity = async () => { try {
    const name = identityName.trim();
    if (!name) throw new Error('Enter a name before adding a local identity.');
    const id = globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}`;
    const saved = await request<CampaignIdentity[]>('/campaign/identities', { method: 'PUT', body: JSON.stringify([...identities, { id, name, role: identityRole }]) });
    setIdentities(saved); setIdentityName('');
  } catch (error) { report(error instanceof Error ? error.message : 'Could not save the local identity.'); } };
  const search = () => void request<typeof sources>(`/campaign/sources?q=${encodeURIComponent(query)}`).then(setSources).catch(error => report(error.message));
  return <main className="control campaign-management">
    <header className="control-header"><div><p className="eyebrow">GM-only · trusted local tool</p><h1>Campaign Docket & Source Registry</h1></div><a className="display-link" href="#/">Return to Control</a></header>
    <p className="form-error">Trusted-local roles are interface projections, not authentication. Do not expose this application remotely.</p>
    <section className="campaign-grid">
      <article><h2>Campaign time</h2><p className="governance-date">{formatCampaignDate(currentDate)}</p>
        <label>Declared activity<select value={activity} onChange={event => setActivity(event.target.value as CampaignDocketActivity)}>{activities.map(item => <option key={item}>{item}</option>)}</select></label>
        <label>Duration (days)<input type="number" min="1" max="336" value={days} onChange={event => setDays(Number(event.target.value))}/></label>
        <p className="preset-row">{[1, 3, 7, 14].map(value => <button key={value} type="button" onClick={() => setDays(value)}>{value} day{value === 1 ? '' : 's'}</button>)}</p>
        <label>Declaration note<input value={note} onChange={event => setNote(event.target.value)} placeholder="Why this time passes"/></label><button onClick={() => void advance()}>Record and advance time</button>
        <h3>Docket history</h3>{docket.length ? docket.map(entry => <p key={entry.id}><strong>{entry.activity}</strong> · {entry.durationDays} days · {formatCampaignDate(entry.effectiveStart)} → {formatCampaignDate(entry.effectiveEnd)}{entry.supersededAt ? ' · superseded' : ''}</p>) : <p>No declared campaign time has passed.</p>}
      </article>
      <article><h2>Legacy adaptation review</h2><p>Wall-clock adaptations remain archival until individually confirmed.</p>
        {legacy.length ? legacy.map(review => <section className="ledger-row" key={review.id}><strong>{review.itemName}</strong><span>{review.buyer} · legacy record {new Date(review.legacySettledAt).toLocaleDateString()}</span>{review.status === 'pending' ? <button onClick={() => void confirm(review)}>Assign current campaign date</button> : <span>Confirmed: {formatCampaignDate(review.campaignSettledAt!)}</span>}</section>) : <p>No adaptation records await campaign-date confirmation.</p>}
        <h2>Local identities</h2><p>{identities.length ? `${identities.length} identities configured.` : 'No named local identities have been configured.'}</p>
        <div className="identity-form"><label>Name<input aria-label="Local identity name" value={identityName} onChange={event => setIdentityName(event.target.value)} placeholder="Name at this table"/></label><label>Role<select aria-label="Local identity role" value={identityRole} onChange={event => setIdentityRole(event.target.value as CampaignIdentity['role'])}>{(['owner-gm', 'gm', 'co-gm', 'player', 'display'] as CampaignIdentity['role'][]).map(role => <option key={role} value={role}>{role}</option>)}</select></label><button type="button" onClick={() => void addIdentity()}>Add local identity</button></div>
        {identities.length ? <ul className="identity-list">{identities.map(identity => <li key={identity.id}><strong>{identity.name}</strong><span>{identity.role}</span></li>)}</ul> : null}
      </article>
    </section>
    <section className="source-search"><h2>Curated source registry</h2><label>Search approved sources<input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') search(); }}/></label><button onClick={search}>Search sources</button>{sources.map(source => <article key={source.id}><strong>{source.title}</strong><span>{source.status} · {source.vaultPath}</span><p>{source.excerpt}</p></article>)}</section>
  </main>;
}
