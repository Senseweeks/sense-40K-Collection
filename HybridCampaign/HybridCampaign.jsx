import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CampaignApp from './src/App.tsx';
import campaignCss from './src/styles.css';
import mirenCss from './src/miren.css';
import { campaignFetch, setCampaignRuntime } from './src/runtime.ts';
import { accounts, getAccount, getAuthEventName } from '../preview/auth.mjs';

const campaignRoles = ['owner-gm', 'gm', 'co-gm', 'player', 'display'];
const gmRoles = new Set(['owner-gm', 'gm', 'co-gm']);
const prettyRole = role => role.replace(/-/g, ' ').replace(/\b\w/g, value => value.toUpperCase());

/** Scope only the imported base styles; App's feature CSS is class-scoped already. */
const scopeCampaignCss = source => source
  .replace(/:root\b/g, '.hybrid-campaign-shell')
  .replace(/(^|[,{])\s*body\b/gm, '$1 .hybrid-campaign-shell')
  .replace(/(^|[,{])\s*\*(?=\s*[{,])/gm, '$1 .hybrid-campaign-shell *');

const embeddedCss = `
  ${scopeCampaignCss(campaignCss)}
  ${scopeCampaignCss(mirenCss)}
  .hybrid-campaign-shell { min-height:100%; background:#0c1412; color:#eee5d2; }
  .hybrid-campaign-shell .hybrid-return { position:sticky; z-index:20; top:0; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 18px; border-bottom:1px solid #6d785e; background:rgba(10,18,16,.96); backdrop-filter:blur(8px); }
  .hybrid-campaign-shell .hybrid-return a, .hybrid-campaign-shell .hybrid-hub a { color:#f2dfb0; text-decoration:none; }
  .hybrid-campaign-shell .hybrid-return a:hover, .hybrid-campaign-shell .hybrid-hub a:hover { color:#fff7df; }
  .hybrid-campaign-shell .hybrid-return strong { font:700 .72rem Arial,sans-serif; letter-spacing:.12em; text-transform:uppercase; color:#71dbe1; }
  .hybrid-campaign-shell .hybrid-hub { min-height:calc(100dvh - 45px); max-width:1000px; margin:0 auto; padding:clamp(28px,5vw,68px) 22px; }
  .hybrid-campaign-shell .hybrid-hub > header { background:transparent; border:0; padding:0; }
  .hybrid-campaign-shell .hybrid-hub h1 { color:#f1d8a2; font:clamp(2rem,5vw,4.2rem) Georgia,serif; margin:8px 0 16px; }
  .hybrid-campaign-shell .hybrid-hub p { max-width:730px; color:#c6d2ca; line-height:1.6; }
  .hybrid-campaign-shell .hybrid-launches { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:12px; margin:28px 0; }
  .hybrid-campaign-shell .hybrid-launch { display:grid; gap:5px; min-height:96px; padding:18px; border:1px solid #586c62; background:#15221e; }
  .hybrid-campaign-shell .hybrid-launch strong { color:#f0d7a1; font:700 1.02rem Georgia,serif; }
  .hybrid-campaign-shell .hybrid-launch span { color:#aebdb3; font-size:.86rem; }
  .hybrid-campaign-shell .hybrid-note { padding:16px; border-left:3px solid #64d6db; background:#122622; }
  .hybrid-campaign-shell .hybrid-onboarding { max-width:620px; padding:24px; border:1px solid #687c70; background:#13201c; }
  .hybrid-campaign-shell .hybrid-onboarding label { display:grid; gap:6px; margin:14px 0; }
  .hybrid-campaign-shell .hybrid-onboarding input, .hybrid-campaign-shell .hybrid-onboarding select { width:100%; min-height:42px; }
  .hybrid-campaign-shell .hybrid-onboarding button { margin-top:8px; }
  .hybrid-campaign-shell .hybrid-error { color:#ffb9a9; }
  @media (max-width:640px) { .hybrid-campaign-shell .hybrid-return { padding:9px 12px; } .hybrid-campaign-shell .hybrid-return strong { display:none; } }
`;

const savedAccount = () => {
  const active = getAccount();
  return accounts?.find(active.username) ?? null;
};

/**
 * The preview host always returns JSON. Parsing through text first prevents a
 * raw browser exception from trapping a player on setup if a local server was
 * restarted while their page was open.
 */
const readCampaignJson = async response => {
  const raw = await response.text();
  if (!raw.trim()) throw new Error('The campaign preview returned an empty response. Reload the page and try again.');
  try { return JSON.parse(raw); }
  catch { throw new Error('The campaign preview returned an invalid response. Reload the page and try again.'); }
};

function runtimeFor(account) {
  if (!account?.campaignRole || !campaignRoles.includes(account.campaignRole)) return null;
  return {
    mode: 'preview',
    apiBase: '/hybrid-campaign/api',
    actor: {
      role: account.campaignRole,
      identityId: account.campaignIdentityId || undefined,
      // Test fixtures deliberately use stable keys. Browser-local numeric IDs
      // can change after a storage reset, whereas fixture campaign profiles
      // must survive fresh preview and test-server instances.
      accountKey: account.testFixtureId ? `preview-test:${account.testFixtureId}` : `preview-account:${account.id}`,
    },
  };
}

function PlayerOnboarding({ account, onFinished }) {
  const [factions, setFactions] = useState([]);
  const [characterName, setCharacterName] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [supportingFactionName, setSupportingFactionName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    void campaignFetch('/preview/onboarding-options', { cache: 'no-store', headers: { Accept: 'application/json' } }).then(async response => {
      const body = await readCampaignJson(response);
      if (!response.ok) throw new Error(body.error || 'Onboarding options are unavailable.');
      if (!body.factions?.length) throw new Error('No active supporting factions are available yet. Ask the GM to activate one in the campaign roster.');
      if (!active) return;
      setFactions(body.factions || []);
      setRecipientId(current => current || body.factions?.[0]?.id || '');
    }).catch(problem => { if (active) setError(problem instanceof Error ? problem.message : 'Onboarding options are unavailable.'); });
    return () => { active = false; };
  }, []);
  const submit = async event => {
    event.preventDefault();
    setError(''); setSaving(true);
    try {
      const response = await campaignFetch('/preview/onboarding', { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ characterName, supportingFactionRecipientId: recipientId, supportingFactionName }) });
      const body = await readCampaignJson(response);
      if (!response.ok) throw new Error(body.error || 'The campaign profile could not be created.');
      accounts.assignCampaignIdentity(account.id, body.identity.id);
      window.dispatchEvent(new Event(getAuthEventName()));
      onFinished();
      // New players enter through the public system map, where the atlas and
      // its location choices lead naturally into the rest of the campaign.
      window.location.hash = '#/atlas';
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'The campaign profile could not be created.'); }
    finally { setSaving(false); }
  };
  return <main className="hybrid-hub"><header><p className="eyebrow">Player profile setup</p><h1>Enter the Tavrellis campaign</h1><p>This local preview links one character to this Tavern account. The GM can later adjust campaign roles from the account controls.</p></header><form className="hybrid-onboarding" onSubmit={submit}><label>Character name<input required maxLength="80" value={characterName} onChange={event => setCharacterName(event.target.value)} /></label><label>Supporting faction<select required value={recipientId} onChange={event => setRecipientId(event.target.value)}>{factions.map(faction => <option key={faction.id} value={faction.id}>{faction.name}</option>)}</select></label><label>Supporting faction or warband name<input required maxLength="120" value={supportingFactionName} onChange={event => setSupportingFactionName(event.target.value)} placeholder="Your named support route" /></label>{error && <p className="hybrid-error" role="alert">{error}</p>}<button disabled={saving || !factions.length}>{saving ? 'Creating profile…' : 'Create campaign profile'}</button></form></main>;
}

function CampaignHub({ account }) {
  const role = account.campaignRole;
  const choices = gmRoles.has(role)
    ? [['#/', 'Open GM Control', 'Market, world, operations, and campaign records'], ['#/world', 'World Command', 'Atlas, routes, and regional pressure'], ['#/army', 'Force Command', 'Collections, rosters, and progression']]
    : role === 'display'
      ? [['#/display', 'Open table display', 'Published gallery and public ceremony']]
      : [['#/atlas', 'Explore Tavrellis', 'System map, known locations, and campaign choices'], ['#/briefings', 'Campaign briefings', 'Published recaps and acknowledgements'], ['#/resources', 'Cell resources', 'Approved shared and personal resources'], ['#/rosters', 'Army Manager', 'Your collection, drafts, and progression'], ['#/exchange', "Miren's counter", 'Available Trade Coin exchange and objectives']];
  return <main className="hybrid-hub"><header><p className="eyebrow">Senseweeks’s Hybrid Campaign Experiment</p><h1>{gmRoles.has(role) ? 'Campaign Command' : role === 'display' ? 'Table Display' : account.campaignIdentityId ? 'Your campaign hub' : 'Campaign access'}</h1><p>{gmRoles.has(role) ? 'Use the campaign tools from one focused command surface.' : role === 'display' ? 'This account is restricted to published, table-safe material.' : 'Choose a player-facing workspace. GM records and unpublished material remain private.'}</p></header><nav className="hybrid-launches" aria-label="Campaign workspaces">{choices.map(([target, title, detail]) => <a className="hybrid-launch" key={target} href={target}><strong>{title}</strong><span>{detail}</span></a>)}</nav><aside className="hybrid-note"><strong>Local preview role: {prettyRole(role)}</strong><br/>This integration uses the existing browser-local account simulator. It is deliberately not a hosted authentication system.</aside></main>;
}

export default function HybridCampaign() {
  const [version, setVersion] = useState(0);
  const [hash, setHash] = useState(() => window.location.hash);
  const account = useMemo(() => savedAccount(), [version]);
  const runtime = runtimeFor(account);
  // Make the adapter available before child effects (notably player onboarding)
  // attempt their first request.
  if (runtime) setCampaignRuntime(runtime);
  useEffect(() => {
    if (runtime) setCampaignRuntime(runtime);
    // Do not clear the adapter during this component's cleanup. React can
    // briefly retain an older keyed campaign tree while mounting its
    // replacement; clearing here made the new onboarding request fall back to
    // `/api`, which is not a JSON endpoint in the Tavern preview.
  }, [runtime?.actor?.role, runtime?.actor?.identityId, runtime?.actor?.accountKey]);
  useEffect(() => {
    if (!runtime || runtime.actor.role !== 'player' || account.campaignIdentityId) return;
    // A durable fixture profile is resolved from its stable account key. This
    // mirrors account onboarding after browser storage has been reset.
    void campaignFetch('/preview/profile', { headers: { Accept: 'application/json' } })
      .then(readCampaignJson)
      .then(body => {
        if (body.profile?.identityId) {
          accounts.assignCampaignIdentity(account.id, body.profile.identityId);
          window.dispatchEvent(new Event(getAuthEventName()));
        }
      })
      .catch(problem => console.warn('Campaign profile synchronisation failed:', problem));
  }, [runtime?.actor?.role, runtime?.actor?.accountKey, account?.campaignIdentityId]);
  useEffect(() => {
    const refresh = () => setVersion(value => value + 1);
    const updateHash = () => setHash(window.location.hash);
    window.addEventListener(getAuthEventName(), refresh);
    window.addEventListener('hashchange', updateHash);
    return () => { window.removeEventListener(getAuthEventName(), refresh); window.removeEventListener('hashchange', updateHash); };
  }, []);
  useEffect(() => accounts?.subscribe(() => setVersion(value => value + 1)), []);
  const returnToTavern = () => { window.location.hash = ''; };
  return <section className="hybrid-campaign-shell"><style>{embeddedCss}</style><nav className="hybrid-return" aria-label="Campaign navigation"><Link to="/projects" onClick={returnToTavern}>← Return to the Tavern</Link><strong>Senseweeks’s Hybrid Campaign Experiment</strong></nav>{!runtime ? <main className="hybrid-hub"><header><p className="eyebrow">Campaign access setup</p><h1>Awaiting a campaign role</h1><p>Save this Tavern account, then have a site administrator assign a Hybrid Campaign role from the account controls above. Site permissions and campaign roles remain separate.</p></header></main> : runtime.actor.role === 'player' && !runtime.actor.identityId ? <PlayerOnboarding account={account} onFinished={() => setVersion(value => value + 1)} /> : !hash || hash === '#' ? <CampaignHub account={account} /> : <CampaignApp key={`${account.id}:${account.campaignRole}:${account.campaignIdentityId || ''}`} />}</section>;
}
