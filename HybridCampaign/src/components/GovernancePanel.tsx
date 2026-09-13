import { formatCampaignDate } from '../market';
import type { CampaignGovernance } from '../types';
import { getCampaignRuntime } from '../runtime';

export const governanceCss = `.governance-panel{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(270px,.75fr);gap:18px;margin:24px 0;padding:20px;border:1px solid #557068;background:linear-gradient(110deg,#13221f,#101817)}.governance-panel h2{margin:2px 0 7px}.governance-panel p{margin:5px 0;color:#c7d0c4;line-height:1.45}.governance-date{color:#f1d8a2!important;font-size:1.28rem}.governance-status{display:grid;gap:8px;align-content:start;padding:13px 15px;border-left:3px solid #6bcfd4;background:rgba(28,70,65,.38)}.governance-status strong{color:#e9d8ae}.governance-status small{color:#9fb0a6;line-height:1.4}.governance-status a{margin-top:4px;justify-self:start}@media(max-width:760px){.governance-panel{grid-template-columns:1fr;padding:17px}.governance-status{border-left:0;border-top:3px solid #6bcfd4}}`;

export function GovernancePanel({ governance }: { governance: CampaignGovernance }) {
  const honours = governance.honourCatalogue;
  const hosted = getCampaignRuntime().mode === 'standalone' && import.meta.env.VITE_HOSTED_MODE === 'true';
  return <section className="governance-panel" aria-labelledby="campaign-governance-title">
    <div>
      <p className="eyebrow">Campaign baseline · GM-only</p>
      <h2 id="campaign-governance-title">Campaign Governance</h2>
      <p className="governance-date">{formatCampaignDate(governance.currentDate)}</p>
      <p>Imperial origin: {governance.imperialOrigin}</p>
      <p>{governance.identities.length ? `${governance.identities.length} named campaign identities configured.` : 'Identity roster is ready for setup; no named players have been seeded.'}</p>
    </div>
    <aside className="governance-status" aria-label="Governance status">
      <strong>Kill Team Honours frozen</strong>
      <span>{honours.reviewedCount} reviewed of {honours.targetCount} planned entries.</span>
      <small>Legacy temporal records remain pending the Phase 1 calendar migration. No Honour may be awarded until the full catalogue is reviewed and explicitly reopened.</small>
      {hosted && <a className="display-link" href="#/access">Account access</a>}
    </aside>
  </section>;
}
