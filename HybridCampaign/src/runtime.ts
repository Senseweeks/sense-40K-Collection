import type { CampaignRole } from './types';

/**
 * Minimal transport seam between the imported campaign UI and the host site.
 *
 * The standalone campaign uses `/api`.  The collection preview mounts it below
 * `/hybrid-campaign/api` and supplies a trusted local-preview actor here.  A
 * later production adapter can replace this object without touching features.
 */
export interface CampaignRuntimeActor {
  role: CampaignRole;
  identityId?: string;
  accountKey?: string;
}

export interface CampaignRuntime {
  mode: 'standalone' | 'preview';
  apiBase: string;
  actor?: CampaignRuntimeActor;
}

declare global {
  interface Window {
    __HYBRID_CAMPAIGN_RUNTIME__?: CampaignRuntime;
  }
}

// The embedded preview can remount the campaign root when a Tavern account
// changes. Keep the active adapter in module state as well as on `window` so
// cleanup from an older React tree cannot accidentally send a new tree back to
// standalone `/api` endpoints.
let configuredRuntime: CampaignRuntime | undefined;

export const setCampaignRuntime = (runtime?: CampaignRuntime) => {
  configuredRuntime = runtime;
  if (runtime) window.__HYBRID_CAMPAIGN_RUNTIME__ = runtime;
  else delete window.__HYBRID_CAMPAIGN_RUNTIME__;
};

export const getCampaignRuntime = (): CampaignRuntime => configuredRuntime ?? window.__HYBRID_CAMPAIGN_RUNTIME__ ?? {
  mode: 'standalone',
  apiBase: '/api',
};

export const campaignApiUrl = (path: string) => {
  const base = getCampaignRuntime().apiBase.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

/** Send all API calls through the host-selected path and actor context. */
export const campaignFetch = (path: string, init: RequestInit = {}) => {
  const runtime = getCampaignRuntime();
  const headers = new Headers(init.headers);
  // Imported trusted-local callers may still construct these legacy headers.
  // Never forward them through the integrated preview boundary.
  headers.delete('X-Trusted-Local-Role');
  headers.delete('X-Campaign-Identity');
  if (runtime.mode === 'preview' && runtime.actor) {
    headers.set('X-Preview-Campaign-Role', runtime.actor.role);
    if (runtime.actor.identityId) headers.set('X-Preview-Campaign-Identity', runtime.actor.identityId);
    if (runtime.actor.accountKey) headers.set('X-Preview-Campaign-Account', runtime.actor.accountKey);
  }
  return fetch(campaignApiUrl(path), { ...init, headers });
};

export const previewActor = () => getCampaignRuntime().mode === 'preview'
  ? getCampaignRuntime().actor ?? null
  : null;
