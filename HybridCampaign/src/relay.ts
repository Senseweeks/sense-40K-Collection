import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultState, migrateMarketState, validateMarketState } from './market';
import type { CampaignRole, MarketState } from './types';
import { campaignFetch, getCampaignRuntime } from './runtime';

const headersFor = (role: CampaignRole, revision?: number) => ({
  'Content-Type': 'application/json',
  ...(getCampaignRuntime().mode === 'standalone' && import.meta.env.VITE_HOSTED_MODE !== 'true' ? { 'X-Trusted-Local-Role': role } : {}),
  ...(revision !== undefined ? { 'If-Match-Revision': String(revision) } : {}),
});

/** Client of the campaign API. The legacy EventSource JSON relay is gone. */
export function useIndexRelay(role: CampaignRole = 'owner-gm') {
  const [state, setState] = useState<MarketState>(defaultState);
  const [online, setOnline] = useState(false);
  const lastValidState = useRef(state);
  const accept = useCallback((raw: unknown) => { const next = validateMarketState(migrateMarketState(raw)); lastValidState.current = next; setState(next); return next; }, []);
  useEffect(() => {
    let alive = true;
    const hydrate = async () => {
      try {
        const response = await campaignFetch('/campaign/projection', { headers: headersFor(role) });
        if (!response.ok) throw new Error('Campaign API unavailable.');
        const remote = await response.json() as { market?: MarketState };
        if (alive && remote.market) accept(remote.market); if (alive) setOnline(true);
      } catch { if (alive) setOnline(false); }
    };
    void hydrate(); const poll = window.setInterval(() => void hydrate(), 3000);
    return () => { alive = false; clearInterval(poll); };
  }, [accept, role]);
  const commit = async (next: MarketState) => {
    const committed = validateMarketState(migrateMarketState(next)); const previous = lastValidState.current; setState(committed);
    try {
      const response = await campaignFetch('/index-state', { method: 'PUT', headers: headersFor(role, previous.revision), body: JSON.stringify(committed) });
      const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error((body as { error?: string }).error ?? 'The campaign API rejected the market state.');
      accept(body);
    } catch (error) { setState(previous); throw error; }
  };
  const systemCommit = async (next: MarketState) => {
    const previous = lastValidState.current;
    const response = await campaignFetch('/index-state', { method: 'PUT', headers: headersFor(role), body: JSON.stringify(validateMarketState(migrateMarketState(next))) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((body as { error?: string }).error ?? 'The local ceremony automation could not persist its cue.');
    accept(body);
  };
  return { state, commit, systemCommit, online, role };
}
