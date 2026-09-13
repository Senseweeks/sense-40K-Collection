import { useEffect, useState } from 'react';
import type { CampaignRole } from '../../types';
import { campaignFetch, getCampaignRuntime, previewActor } from '../../runtime';

export interface HostedActor { role: CampaignRole; identityId?: string; }
const hosted = import.meta.env.VITE_HOSTED_MODE === 'true';
const csrf = async () => { const response = await campaignFetch('/auth/csrf'); const body = await response.json() as { csrfToken: string }; return body.csrfToken; };
export const hostedRequest = async (path: string, body: unknown) => { const token = await csrf(); return campaignFetch(path.replace(/^\/api/, ''), { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': token }, body: JSON.stringify(body) }); };

export function useHostedActor() {
  const preview = getCampaignRuntime().mode === 'preview';
  const [actor, setActor] = useState<HostedActor | null>(() => preview ? previewActor() : hosted ? null : { role: 'owner-gm' });
  const [ready, setReady] = useState(!hosted || preview);
  useEffect(() => {
    if (preview) { setActor(previewActor()); setReady(true); return; }
    if (!hosted) return;
    void campaignFetch('/auth/session').then(async response => response.ok ? response.json() as Promise<{ actor: HostedActor }> : { actor: null }).then(value => setActor(value.actor)).finally(() => setReady(true));
  }, [preview]);
  const refresh = () => {
    if (getCampaignRuntime().mode === 'preview') { setActor(previewActor()); return Promise.resolve(); }
    return campaignFetch('/auth/session').then(async response => setActor(response.ok ? (await response.json() as { actor: HostedActor }).actor : null));
  };
  return { hosted: hosted || preview, actor, ready, refresh };
}

export function SignIn({ onSignedIn }: { onSignedIn: () => void }) { const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [resetRequested, setResetRequested] = useState(false); const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(''); const response = await hostedRequest('/api/auth/login', { email, password }); if (!response.ok) { const payload = await response.json().catch(() => ({})) as { error?: string }; setError(payload.error ?? 'Sign-in failed.'); return; } onSignedIn(); };
  const requestReset = async () => { setError(''); if (!email.trim()) { setError('Enter your email address first, then request a reset link.'); return; } const response = await hostedRequest('/api/auth/reset/request', { email }); if (!response.ok) { const payload = await response.json().catch(() => ({})) as { error?: string }; setError(payload.error ?? 'The reset request could not be completed.'); return; } setResetRequested(true); };
  return <main className="control auth-gateway"><section><p className="eyebrow">Tavrellis campaign portal</p><h1>Sign in</h1><form onSubmit={submit}><label>Email<input required type="email" value={email} onChange={event => { setEmail(event.target.value); setResetRequested(false); }} /></label><label>Password<input required type="password" minLength={12} value={password} onChange={event => setPassword(event.target.value)} /></label>{error && <p className="form-error">{error}</p>}{resetRequested && <p className="form-success">If that address belongs to an active account, a reset link is on its way.</p>}<button>Sign in</button><button type="button" className="display-link" onClick={() => void requestReset()}>Email a password-reset link</button></form><p>Invitations and password resets are issued by the campaign GM.</p></section></main>;
}

export function PasswordAction({ kind, token, onSignedIn }: { kind: 'activate' | 'reset'; token: string; onSignedIn: () => void }) { const [password, setPassword] = useState(''); const [error, setError] = useState(''); const submit = async (event: React.FormEvent) => { event.preventDefault(); const response = await hostedRequest(kind === 'activate' ? '/api/auth/activate' : '/api/auth/reset/complete', { token, password }); const payload = await response.json().catch(() => ({})) as { error?: string }; if (!response.ok) return setError(payload.error ?? 'This link could not be used.'); onSignedIn(); location.hash = '#/'; };
  return <main className="control auth-gateway"><section><p className="eyebrow">Tavrellis campaign portal</p><h1>{kind === 'activate' ? 'Activate account' : 'Set a new password'}</h1><form onSubmit={submit}><label>New password<input required type="password" minLength={12} value={password} onChange={event => setPassword(event.target.value)}/></label>{error && <p className="form-error">{error}</p>}<button>{kind === 'activate' ? 'Activate account' : 'Reset password'}</button></form></section></main>;
}
