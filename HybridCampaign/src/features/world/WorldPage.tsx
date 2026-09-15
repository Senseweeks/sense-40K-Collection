import { useEffect, useState } from 'react';
import type { CampaignControlState, CampaignDate, CampaignEventRun, CampaignIdentity, ColdEmberLedger, EventTemplate, RegionalPressure, TravelRecord, TravelRoute, TypedProject, WorldLocation } from '../../types';
import { Modal } from '../../components/MarketModal';
import { campaignFetch } from '../../runtime';
const headers = { 'Content-Type': 'application/json' };
const request = async <T,>(url: string, options?: RequestInit): Promise<T> => { const response = await campaignFetch(url, { ...options, headers: { ...headers, ...(options?.headers ?? {}) } }); const body = await response.json().catch(() => ({})); if (!response.ok)
    throw new Error(body.error ?? 'The world service rejected this request.'); return body as T; };
type WorldData = Pick<CampaignControlState, 'worldLocations' | 'travelRoutes' | 'travelRecords' | 'eventTemplates' | 'eventRuns' | 'typedProjects' | 'regionalPressures' | 'coldEmber'> & {
    currentDate?: CampaignDate;
    playerName?: string;
    indexOperating?: boolean;
    partyLocationId?: string;
    locations: WorldLocation[];
    routes: TravelRoute[];
    travel: TravelRecord[];
    templates: EventTemplate[];
    events: CampaignEventRun[];
    projects: TypedProject[];
    pressures: RegionalPressure[];
    coldEmber?: ColdEmberLedger;
};
const split = (text: string) => text.split('\n').map(entry => entry.trim()).filter(Boolean);
const join = (items: string[]) => items.join('\n');
// Full location titles remain available to screen readers and detail panels.
// The map itself uses the body name to prevent long dossier subtitles from
// colliding with neighbouring celestial bodies.
const mapLabel = (title: string) => title.split(' — ')[0];
export type TravelEstimate = { days: number; locationIds: string[] };
export const calculateTravelEstimate = (locations: Array<Pick<WorldLocation, 'id'>>, routes: Array<Pick<TravelRoute, 'originLocationId' | 'destinationLocationId' | 'durationDays'>>, originId: string, destinationId: string): TravelEstimate | undefined => {
    if (!originId || !destinationId || originId === destinationId)
        return undefined;
    const locationIds = new Set(locations.map(location => location.id));
    if (!locationIds.has(originId) || !locationIds.has(destinationId))
        return undefined;
    const neighbours = new Map<string, Array<{ id: string; days: number }>>();
    for (const route of routes) {
        const forward = neighbours.get(route.originLocationId) ?? [];
        forward.push({ id: route.destinationLocationId, days: route.durationDays });
        neighbours.set(route.originLocationId, forward);
        const reverse = neighbours.get(route.destinationLocationId) ?? [];
        reverse.push({ id: route.originLocationId, days: route.durationDays });
        neighbours.set(route.destinationLocationId, reverse);
    }
    const distances = new Map<string, number>([[originId, 0]]);
    const paths = new Map<string, string[]>([[originId, [originId]]]);
    const remaining = new Set(locationIds);
    while (remaining.size) {
        const current = [...remaining].filter(id => distances.has(id)).sort((left, right) => (distances.get(left) ?? Infinity) - (distances.get(right) ?? Infinity))[0];
        if (!current)
            break;
        remaining.delete(current);
        if (current === destinationId)
            return { days: distances.get(current) ?? 0, locationIds: paths.get(current) ?? [] };
        for (const neighbour of neighbours.get(current) ?? []) {
            if (!remaining.has(neighbour.id))
                continue;
            const candidate = (distances.get(current) ?? Infinity) + neighbour.days;
            if (candidate < (distances.get(neighbour.id) ?? Infinity)) {
                distances.set(neighbour.id, candidate);
                paths.set(neighbour.id, [...(paths.get(current) ?? []), neighbour.id]);
            }
        }
    }
    return undefined;
};
export const worldCss = `.world-page{max-width:1220px}.world-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;align-items:start}.world-panel{align-self:start;height:max-content;padding:20px;border:1px solid #526159;background:#14201d}.world-panel.wide{grid-column:1/-1}.world-panel h2{margin:0 0 10px}.world-card{padding:14px 0;border-top:1px solid #45534d}.world-card h3{margin:0 0 5px}.world-card p{margin:5px 0;color:#c8d1c7}.world-card summary{cursor:pointer;color:#f1e4ca;font-weight:700}.world-meta{font:700 .7rem Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#76dfe4}.world-form{display:grid;align-content:start;gap:10px;margin-top:14px}.world-form label{display:grid;gap:5px;align-content:start}.world-form input:not([type=checkbox]),.world-form select,.world-form textarea{width:100%;min-inline-size:0;padding:9px;color:#eee5d2;background:#0d1513;border:1px solid #6f765f}.world-form textarea{min-height:64px;resize:vertical}.world-form label:has(input[type=checkbox]){display:flex;width:max-content;align-items:center;gap:8px}.world-form input[type=checkbox]{inline-size:16px;block-size:16px;margin:0;padding:0;accent-color:#65d6df}.world-form button{justify-self:start;margin:0}.world-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.world-actions button{margin:0}.world-route-estimate{margin:0;padding:10px 12px;border-left:3px solid #76dfe4;background:rgba(8,19,17,.66);color:#dfe9de}.track-row{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;margin:8px 0}.world-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}.world-detail-grid .world-form{align-self:start;min-height:0;margin:0}.world-atlas-workspace{display:grid;grid-template-columns:1.4fr 1fr;gap:14px}.world-search{margin:0 0 8px}.world-location-list{max-height:280px;overflow:auto}.world-location-list button{width:100%;text-align:left;margin:0;border-width:0 0 1px;padding:10px;background:transparent}.atlas-page{max-width:1120px;margin:0 auto}.atlas-map{position:relative;aspect-ratio:2048/1466;overflow:hidden;border:1px solid #617466;background:#0d1513}.atlas-map>img{display:block;width:100%;height:100%;object-fit:cover}.atlas-pin{position:absolute;transform:translate(0,-50%);display:inline-flex;align-items:center;gap:5px;border:0;background:transparent;color:#e9f5ef;padding:0;white-space:nowrap;text-shadow:0 1px 2px #000}.atlas-pin-right-edge{flex-direction:row-reverse;transform:translate(-100%,-50%)}.atlas-pin-dot{width:13px;height:13px;flex:0 0 13px;border-radius:50%;border:2px solid #f2d278;background:#172e2b;box-shadow:0 0 0 2px rgba(0,0,0,.55),0 0 12px rgba(114,220,229,.28)}.atlas-pin-label{padding:3px 5px;border:1px solid rgba(108,214,222,.78);border-left:2px solid #f2d278;background:rgba(5,16,18,.84);font:700 .62rem ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.045em;text-transform:uppercase;box-shadow:0 1px 5px rgba(0,0,0,.55)}.atlas-pin:focus,.atlas-pin:hover{outline:0;z-index:3}.atlas-pin:focus .atlas-pin-dot,.atlas-pin:hover .atlas-pin-dot{border-color:#fff1a9;box-shadow:0 0 0 3px #78e2e9,0 0 16px rgba(120,226,233,.65)}.atlas-pin:focus .atlas-pin-label,.atlas-pin:hover .atlas-pin-label{border-color:#78e2e9;background:#173431}.atlas-detail{padding:16px;border:1px solid #466057;background:rgba(8,19,17,.92)}.atlas-location-list{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.atlas-location-list button{margin:0}.atlas-grid{display:grid;grid-template-columns:2fr 1fr;gap:16px}.atlas-grid article{padding:16px;border:1px solid #466057;background:rgba(8,19,17,.9)}.atlas-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:0 0 18px}.atlas-actions a{display:grid;gap:4px;min-height:76px;padding:13px;border:1px solid #526159;background:#14201d;color:#eee5d2;text-decoration:none}.atlas-actions a:hover,.atlas-actions a:focus-visible{border-color:#78e2e9;outline:2px solid #78e2e9;outline-offset:2px}.atlas-actions strong{color:#f1d8a2}.atlas-actions span{font:inherit;font-size:.84rem;color:#c8d1c7}@media(max-width:760px){.world-grid,.atlas-grid,.world-detail-grid,.world-atlas-workspace{grid-template-columns:1fr}.world-panel.wide{grid-column:auto}.track-row{grid-template-columns:1fr}.atlas-pin-label{font-size:.54rem;padding:2px 3px}.atlas-pin-dot{width:11px;height:11px;flex-basis:11px}}`;
/** Player-facing command deck. It follows the requested map-first strategy
 * layout while retaining the campaign's original visual language and assets. */
const playerAtlasDeckCss = `
  .atlas-command-deck{display:grid;grid-template-columns:minmax(190px,.72fr) minmax(0,2.2fr) minmax(220px,.9fr);grid-template-rows:auto minmax(0,1fr);gap:12px;max-width:1420px;padding:16px;align-items:stretch}
  .atlas-command-top{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 18px;border:1px solid #806a3d;border-bottom:3px solid #bc9a50;background:linear-gradient(100deg,#241a15,#321d19 58%,#171312);box-shadow:inset 0 1px 0 rgba(255,224,157,.14),inset 0 -12px 30px rgba(0,0,0,.18)}
  .atlas-command-top h1{margin:2px 0 0;color:#eed69d;font-size:clamp(1.35rem,2.2vw,2rem);text-shadow:0 1px 0 #000}.atlas-command-top .eyebrow{margin:0;color:#c2a866}
  .atlas-tool-strip{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px}.atlas-tool-strip a,.atlas-quick a{display:grid;gap:3px;padding:10px 11px;border:1px solid #71633f;background:linear-gradient(180deg,rgba(48,37,25,.94),rgba(21,19,16,.94));color:#f0e3c5;text-decoration:none;font:700 .76rem Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase;transition:border-color .16s ease,background .16s ease,transform .16s ease}
  .atlas-tool-strip a:hover,.atlas-tool-strip a:focus-visible,.atlas-quick a:hover,.atlas-quick a:focus-visible{border-color:#d1ad62;background:#49341e;outline:2px solid #d1ad62;outline-offset:2px;transform:translateY(-1px)}
  .atlas-ongoings{grid-row:2/4;display:flex;flex-direction:column;gap:10px;padding:16px 14px;border:1px solid #76574a;border-left:3px solid #b88b55;background:linear-gradient(180deg,#251b17,#151715 38%);min-width:0}.atlas-ongoings h2,.atlas-quick h2{margin:0;color:#f1d8a2;font-size:1.05rem}.atlas-rail-note{margin:0;color:#b9c6bd;font-size:.86rem;line-height:1.45}
  .atlas-alert{padding:11px 10px;border-top:1px solid #57423d;background:rgba(6,15,14,.28)}.atlas-alert:first-of-type{border-top:0}.atlas-alert strong{display:block;color:#f0d8a0;font:700 .94rem Georgia,serif}.atlas-alert span{display:block;margin-top:4px;color:#c6d2ca;font-size:.82rem;line-height:1.4}
  .atlas-system-panel{grid-column:2;min-width:0;padding:12px;border:1px solid #78643d;background:linear-gradient(145deg,rgba(42,31,22,.96),rgba(11,14,13,.98));box-shadow:0 12px 28px rgba(0,0,0,.42),inset 0 0 0 1px rgba(198,160,83,.1)}.atlas-system-panel .atlas-map{border-color:#a38245;box-shadow:0 0 0 2px rgba(180,142,71,.15),inset 0 0 60px rgba(77,42,24,.16)}.atlas-system-panel .atlas-detail{margin-top:12px;border-color:#735c39;background:rgba(18,17,14,.92)}.atlas-system-panel .atlas-detail h2{margin:6px 0;color:#f1d8a2}.atlas-system-panel .atlas-detail p{color:#cbd5cc;line-height:1.5}
  .atlas-location-list{max-height:140px;overflow:auto;padding-right:4px}.atlas-location-list button{border:1px solid #3f5952;background:#101f1d;color:#d6dfd4;font-size:.78rem}.atlas-location-list button[aria-pressed=true]{border-color:#74dce5;color:#fff1c9;background:#1a3532}
  .atlas-quick{grid-column:3;display:flex;flex-direction:column;gap:8px;padding:16px 14px;border:1px solid #73623e;border-right:3px solid #bd9850;background:linear-gradient(180deg,#221d16,#121411 45%)}.atlas-quick .eyebrow{margin:0;color:#d1b166}.atlas-quick a span{color:#bfcbbf;font:400 .78rem Georgia,serif;letter-spacing:0;text-transform:none;line-height:1.35}.atlas-empty{margin:0;padding:10px;border:1px dashed #5a5d51;color:#b7c0b6;font-size:.85rem;line-height:1.4}
  .atlas-pin-dot{border-color:#e0bd6d;background:#2b1c15;box-shadow:0 0 0 2px rgba(0,0,0,.62),0 0 12px rgba(198,160,83,.35)}.atlas-pin-label{border-color:rgba(198,160,83,.86);border-left-color:#c64e3d;background:rgba(20,14,12,.9);box-shadow:0 1px 5px rgba(0,0,0,.62)}.atlas-pin:focus .atlas-pin-dot,.atlas-pin:hover .atlas-pin-dot{border-color:#fff1a9;box-shadow:0 0 0 3px #e0bd6d,0 0 16px rgba(224,189,109,.65)}.atlas-pin:focus .atlas-pin-label,.atlas-pin:hover .atlas-pin-label{border-color:#e0bd6d;background:#362419}
  @media(max-width:1050px){.atlas-command-deck{grid-template-columns:minmax(180px,.65fr) minmax(0,1.75fr)}.atlas-command-top{grid-column:1/-1}.atlas-quick{grid-column:2;grid-row:3;display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr))}.atlas-quick h2,.atlas-quick .eyebrow{grid-column:1/-1}.atlas-ongoings{grid-row:2/4}.atlas-system-panel{grid-column:2}}
  @media(max-width:720px){.atlas-command-deck{display:flex;flex-direction:column;padding:10px}.atlas-command-top{display:grid}.atlas-tool-strip{justify-content:start}.atlas-ongoings{order:2}.atlas-system-panel{order:3}.atlas-quick{order:4;display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr))}.atlas-quick h2,.atlas-quick .eyebrow{grid-column:1/-1}.atlas-location-list{max-height:168px}.atlas-pin-label{font-size:.5rem;letter-spacing:0;padding:2px}.atlas-pin-dot{width:10px;height:10px;flex-basis:10px}}
`;

/** In-universe presentation layer for the player bridge. It adds no campaign
 * facts: labels describe the screen the player is already using. */
const inquisitorialBridgeCss = `
  .atlas-command-deck{position:relative;isolation:isolate;max-width:1480px;padding:22px;background:radial-gradient(ellipse at 50% -30%,rgba(114,44,24,.3),transparent 42%),linear-gradient(90deg,rgba(3,7,8,.72),rgba(13,17,16,.78) 28%,rgba(7,10,11,.8) 72%,rgba(3,6,7,.74)),url('/hybrid-campaign/assets/backgrounds/tavrellis-command-bridge-frame.png') center/cover;border:1px solid #493a28;box-shadow:0 20px 80px rgba(0,0,0,.58),inset 0 0 0 1px rgba(213,177,99,.08)}
  .atlas-command-deck::before{content:'';pointer-events:none;position:absolute;z-index:-1;inset:8px;background:repeating-linear-gradient(0deg,rgba(215,184,113,.025) 0 1px,transparent 1px 4px),linear-gradient(90deg,transparent 0 6%,rgba(183,134,58,.05) 6.1% 6.2%,transparent 6.3% 93.7%,rgba(183,134,58,.05) 93.8% 93.9%,transparent 94%)}
  .atlas-command-top{position:relative;overflow:hidden;min-height:94px;border:2px solid #8d7040;border-bottom:4px solid #c29a4f;background:linear-gradient(106deg,#211714,#44231d 42%,#211915 72%,#111312);box-shadow:0 10px 30px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,232,170,.22),inset 0 -22px 34px rgba(0,0,0,.35)}
  .atlas-command-top::after{content:'';position:absolute;inset:0;pointer-events:none;opacity:.35;background:repeating-linear-gradient(90deg,transparent 0 62px,rgba(222,183,101,.16) 63px 64px),linear-gradient(0deg,transparent 0 86%,rgba(223,191,126,.24) 86.5% 87%,transparent 88%)}
  .atlas-bridge-title{position:relative;z-index:1;display:flex;align-items:center;gap:12px}.atlas-inquisition-sigil{display:block;width:43px;height:52px;object-fit:cover;object-position:center 39%;border:1px solid #b88d48;background:#0a0a08;box-shadow:inset 0 0 0 3px rgba(0,0,0,.32),0 0 11px rgba(189,132,63,.25)}
  .atlas-command-top h1{letter-spacing:.035em}.atlas-command-top .eyebrow{color:#d1b36e}.atlas-welcome{margin:3px 0 0;color:#b9d9d0;font:700 .69rem ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase}.atlas-tool-strip{position:relative;z-index:1}.atlas-tool-strip a{position:relative;border-color:#897342;background:linear-gradient(180deg,#47301f,#1a1714);box-shadow:inset 0 1px 0 rgba(255,239,188,.11)}
  .atlas-ongoings,.atlas-quick{position:relative;overflow:hidden;border-color:#6f5340;background:linear-gradient(180deg,rgba(49,25,21,.96),rgba(20,18,16,.98) 36%,rgba(8,13,14,.99));box-shadow:0 12px 28px rgba(0,0,0,.36),inset 0 0 26px rgba(182,49,32,.07)}.atlas-ongoings::before,.atlas-quick::before{content:'';position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,#9d3e2e,#d1aa5f,#9d3e2e);opacity:.85}.atlas-ongoings .eyebrow,.atlas-quick .eyebrow{margin-top:5px;color:#d6b774}.atlas-ongoings h2,.atlas-quick h2{font-family:Georgia,serif;letter-spacing:.025em}.atlas-rail-note{padding-bottom:10px;border-bottom:1px solid rgba(191,154,83,.28)}
  .atlas-alert{position:relative;padding:13px 11px 13px 15px;border:1px solid rgba(116,80,55,.54);border-left:3px solid #a94436;background:linear-gradient(90deg,rgba(91,34,26,.25),rgba(8,14,14,.12))}.atlas-alert::before{content:'//';position:absolute;left:4px;top:12px;color:#c4a05a;font:700 .6rem ui-monospace,monospace}.atlas-empty{border-color:#66583d;background:rgba(48,34,23,.38)}
  .atlas-system-panel{position:relative;padding:14px;border:2px solid #84683e;background:linear-gradient(145deg,#34241b,#121718 52%,#211914);box-shadow:0 18px 38px rgba(0,0,0,.5),inset 0 0 0 1px rgba(234,198,121,.12)}.atlas-system-panel::before,.atlas-system-panel::after{content:'';position:absolute;z-index:2;width:28px;height:28px;pointer-events:none;border-color:#d2aa5d;border-style:solid;opacity:.85}.atlas-system-panel::before{left:7px;top:7px;border-width:2px 0 0 2px}.atlas-system-panel::after{right:7px;bottom:7px;border-width:0 2px 2px 0}
  .atlas-screen-heading{display:flex;justify-content:space-between;gap:10px;align-items:center;margin:0 0 8px;padding:5px 8px;border:1px solid #645234;background:linear-gradient(90deg,#171b1a,#3a291e,#151716);color:#d8b974;font:700 .64rem ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.11em;text-transform:uppercase}.atlas-screen-heading span:last-child{color:#79cfd0;font-size:.58rem}.atlas-holomap{position:relative}.atlas-holomap::before{content:'';position:absolute;z-index:1;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(112,229,222,.055) 0 1px,transparent 1px 4px),linear-gradient(90deg,rgba(112,229,222,.1) 1px,transparent 1px),linear-gradient(rgba(112,229,222,.08) 1px,transparent 1px);background-size:auto,10% 100%,100% 12.5%;mix-blend-mode:screen;opacity:.42}.atlas-holomap::after{content:'TRACKED BODIES // SELECT A SIGNAL';position:absolute;z-index:2;left:8px;bottom:7px;padding:3px 5px;border:1px solid rgba(115,213,211,.55);background:rgba(4,16,18,.8);color:#9de7df;font:700 .52rem ui-monospace,monospace;letter-spacing:.08em;pointer-events:none}.atlas-system-panel .atlas-map{border:2px solid #a28248;box-shadow:0 0 0 3px rgba(10,8,6,.85),0 0 26px rgba(48,176,169,.15),inset 0 0 60px rgba(44,104,99,.15)}.atlas-system-panel .atlas-detail{position:relative;border:1px solid #84683e;background:linear-gradient(100deg,rgba(28,23,18,.98),rgba(9,16,16,.97));box-shadow:inset 3px 0 #a94535}.atlas-system-panel .atlas-detail::before{content:'DOSSIER FEED';display:block;margin:-2px 0 8px;color:#7dd9d5;font:700 .58rem ui-monospace,monospace;letter-spacing:.12em}.atlas-system-panel .world-meta{color:#d4b66e}
  .atlas-pin-dot{border-color:#baf6eb;background:#155350;box-shadow:0 0 0 2px rgba(0,0,0,.72),0 0 15px rgba(98,235,224,.65)}.atlas-pin-label{border-color:rgba(120,232,223,.82);border-left-color:#d4aa57;background:rgba(4,19,20,.92);color:#e1fcf6;text-shadow:0 0 8px rgba(100,240,230,.5)}.atlas-pin:focus .atlas-pin-dot,.atlas-pin:hover .atlas-pin-dot{border-color:#fff4ba;box-shadow:0 0 0 3px #d3ad5e,0 0 20px rgba(112,239,226,.9)}.atlas-pin:focus .atlas-pin-label,.atlas-pin:hover .atlas-pin-label{border-color:#f2d58b;background:#203936}.atlas-party-marker{position:absolute;z-index:5;transform:translate(-50%,-130%);display:grid;place-items:center;width:25px;height:25px;border:2px solid #f1d281;border-radius:50% 50% 50% 0;background:#8f342a;color:#fff3c3;box-shadow:0 0 0 3px rgba(16,12,8,.8),0 0 17px rgba(242,204,101,.85);font:700 .55rem ui-monospace,monospace;pointer-events:none;rotate:-45deg}.atlas-party-marker span{rotate:45deg}.atlas-party-marker-note{position:absolute;z-index:3;right:8px;bottom:7px;padding:3px 5px;border:1px solid rgba(209,165,88,.7);background:rgba(31,18,14,.88);color:#edce81;font:700 .52rem ui-monospace,monospace;letter-spacing:.075em;pointer-events:none}
  .atlas-quick a{position:relative;padding:13px 12px 13px 17px;border-color:#69573a;background:linear-gradient(100deg,rgba(52,29,22,.83),rgba(18,19,16,.9))}.atlas-quick a::before{content:'+';position:absolute;left:6px;top:11px;color:#d5b66d}.atlas-quick a strong{color:#f0d7a0}.atlas-quick a span{color:#bac5bc}.atlas-quick a:hover{background:linear-gradient(100deg,#583324,#2a241b)}
  @media(max-width:720px){.atlas-command-deck{padding:11px}.atlas-command-top{min-height:0}.atlas-bridge-title{align-items:flex-start}.atlas-inquisition-sigil{width:34px;height:42px;font-size:1.55rem}.atlas-screen-heading{font-size:.54rem}.atlas-screen-heading span:last-child{display:none}.atlas-system-panel{padding:9px}.atlas-holomap::after{font-size:.42rem;bottom:5px;left:5px}.atlas-quick a{min-height:74px}}
`;

/** Page-local presentation for terminals that deliberately have no action yet.
 * Keeping their future destinations in one data list below makes it hard for a
 * later feature to accidentally look live before its API boundary exists. */
const playerAtlasTerminalCss = `
  .atlas-command-status{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}.atlas-command-status span{padding:3px 6px;border:1px solid rgba(120,207,203,.42);background:rgba(4,17,18,.66);color:#bdece5;font:700 .58rem ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.07em;text-transform:uppercase}.atlas-command-status b{color:#e3c06f;font-weight:700}
  .atlas-terminal-control{display:grid;gap:4px;width:100%;min-height:62px;padding:11px 12px;border:1px solid #5b5239;border-left:3px solid #6e563b;background:linear-gradient(100deg,rgba(37,29,21,.94),rgba(15,18,17,.96));color:#aeb7ae;text-align:left;opacity:.82;cursor:not-allowed}.atlas-terminal-control strong{color:#d4c6a1;font:700 .8rem Arial,sans-serif;letter-spacing:.055em;text-transform:uppercase}.atlas-terminal-control span{color:#929b91;font:400 .76rem Georgia,serif;letter-spacing:0;text-transform:none}.atlas-terminal-control:disabled{filter:saturate(.72)}
  .atlas-tool-strip .atlas-terminal-control{width:auto;min-height:0;padding:9px 10px}.atlas-tool-strip .atlas-terminal-control strong{font-size:.7rem}.atlas-tool-strip .atlas-terminal-control span{display:none}
  .atlas-available-actions{margin-top:13px;padding:10px;border:1px dashed #66583d;background:rgba(48,34,23,.3)}.atlas-available-actions h3{margin:0 0 5px;color:#d6b774;font:700 .68rem ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.1em;text-transform:uppercase}.atlas-available-actions p{margin:0;color:#b6c0b5;font-size:.84rem}
  .atlas-pin[aria-pressed=true]{z-index:4}.atlas-pin[aria-pressed=true] .atlas-pin-dot{border-color:#fff4ba;background:#9b3d2e;box-shadow:0 0 0 4px rgba(210,170,93,.82),0 0 22px rgba(115,239,226,.9)}.atlas-pin[aria-pressed=true] .atlas-pin-label{border-color:#f0d28b;background:#34443b;color:#fff8dc}.atlas-selection-announcement{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .atlas-load-error{margin:18px;padding:14px;border:1px solid #9a4938;background:#291815;color:#f0c6b9}.atlas-load-error h2{margin:0 0 6px;color:#f1d8a2}
  @media(max-width:720px){.atlas-command-status{margin-top:9px}.atlas-command-status span{font-size:.5rem}.atlas-tool-strip .atlas-terminal-control{flex:1 1 130px}.atlas-terminal-control{min-height:70px}}
`;

/** Mechanical construction layer: these screens are deliberately built from
 * separate framed modules so the deck reads as ship hardware, not a coloured
 * dashboard placed over a background illustration. */
const playerAtlasHardwareCss = `
  .atlas-command-deck{gap:18px;padding:28px 30px 34px;--deck-brass:#b88b4b;--deck-shadow:#050706;--holo:#71d9d3}
  .atlas-command-top,.atlas-ongoings,.atlas-system-panel,.atlas-quick{isolation:isolate;border:0!important;box-shadow:0 0 0 2px #080a09,0 0 0 4px #5c472d,0 0 0 6px #19150f,0 15px 28px rgba(0,0,0,.58),inset 0 1px 0 rgba(248,218,147,.24),inset 0 -2px 0 rgba(0,0,0,.88)!important}
  .atlas-command-top::before,.atlas-ongoings::after,.atlas-system-panel::after,.atlas-quick::after{content:'';position:absolute;z-index:3;inset:8px;pointer-events:none;background:radial-gradient(circle at 0 0,#d7b66d 0 2px,#21170e 2.5px 4px,transparent 4.5px),radial-gradient(circle at 100% 0,#d7b66d 0 2px,#21170e 2.5px 4px,transparent 4.5px),radial-gradient(circle at 0 100%,#d7b66d 0 2px,#21170e 2.5px 4px,transparent 4.5px),radial-gradient(circle at 100% 100%,#d7b66d 0 2px,#21170e 2.5px 4px,transparent 4.5px);opacity:.95}
  .atlas-command-top{min-height:112px!important;padding:18px 22px!important;background:linear-gradient(180deg,rgba(74,43,29,.97),rgba(24,24,20,.96) 20%,rgba(30,20,16,.98))!important}
  .atlas-command-top::after{opacity:.6!important;background:repeating-linear-gradient(90deg,transparent 0 48px,rgba(230,190,106,.18) 49px 50px),linear-gradient(90deg,rgba(0,0,0,.3),transparent 8%,transparent 92%,rgba(0,0,0,.38))!important}
  .atlas-ongoings,.atlas-quick{padding:20px 18px!important;background:linear-gradient(135deg,rgba(52,31,24,.96),rgba(14,18,17,.98) 32%,rgba(7,12,13,.99))!important}.atlas-ongoings::after,.atlas-quick::after{inset:9px}.atlas-ongoings{border-left:6px solid #604126!important}.atlas-quick{border-right:6px solid #604126!important}
  .atlas-alert{border:1px solid #3f3528!important;border-left:4px solid #9d3e2e!important;background:linear-gradient(90deg,rgba(91,34,26,.44),rgba(7,15,16,.74))!important;box-shadow:inset 0 1px 0 rgba(236,196,118,.08),0 3px 8px rgba(0,0,0,.28)}.atlas-alert:nth-of-type(odd){border-left-color:#c19a55!important}
  .atlas-system-panel{padding:20px 20px 30px!important;background:linear-gradient(135deg,rgba(59,41,28,.98),rgba(9,17,18,.98) 30%,rgba(18,18,15,.99))!important;overflow:visible}.atlas-system-panel::before{left:12px!important;top:12px!important;width:38px!important;height:38px!important;border-width:3px 0 0 3px!important}.atlas-system-panel::after{inset:10px;background:radial-gradient(circle at 0 0,#efd38a 0 2px,#281a0f 2.5px 4px,transparent 4.5px),radial-gradient(circle at 100% 0,#efd38a 0 2px,#281a0f 2.5px 4px,transparent 4.5px),radial-gradient(circle at 0 100%,#efd38a 0 2px,#281a0f 2.5px 4px,transparent 4.5px),radial-gradient(circle at 100% 100%,#efd38a 0 2px,#281a0f 2.5px 4px,transparent 4.5px)}
  .atlas-screen-heading{position:relative;margin:0 0 14px!important;padding:8px 12px!important;border:1px solid #9c7a42!important;box-shadow:inset 0 0 0 2px #15120d,0 3px 7px rgba(0,0,0,.45);background:linear-gradient(90deg,#151b1b,#334440 48%,#151512)!important}.atlas-screen-heading::before{content:'◈';margin-right:7px;color:#e6c575}
  .atlas-holomap{padding:15px 15px 42px;background:linear-gradient(135deg,#080f10,#1a2928 52%,#0b0d0e);border:2px solid #211b12;box-shadow:inset 0 0 0 2px #956f35,inset 0 0 0 5px #080c0c,0 8px 15px rgba(0,0,0,.48);transform:perspective(1300px) rotateX(1.15deg);transform-origin:center bottom}.atlas-holomap::before{inset:14px!important;border:1px solid rgba(109,231,220,.28);background:repeating-linear-gradient(0deg,rgba(112,229,222,.07) 0 1px,transparent 1px 4px),linear-gradient(90deg,rgba(112,229,222,.1) 1px,transparent 1px),linear-gradient(rgba(112,229,222,.08) 1px,transparent 1px)!important}.atlas-holomap::after{left:18px!important;bottom:24px!important;padding:4px 7px!important;border-color:#b5904e!important;background:rgba(5,14,15,.9)!important;color:#b5f3eb!important;box-shadow:0 2px 4px rgba(0,0,0,.72)}
  .atlas-system-panel .atlas-map{border:3px solid #d0a85b!important;background:#052022;box-shadow:0 0 0 3px #18140e,0 0 0 6px #5d4525,0 0 0 8px #0a0d0e,0 0 26px rgba(48,176,169,.36),inset 0 0 60px rgba(44,104,99,.32)!important}.atlas-system-panel .atlas-map>img{filter:saturate(.72) contrast(1.16) brightness(.86);mix-blend-mode:screen;opacity:.92}.atlas-system-panel .atlas-map::before{content:'';position:absolute;z-index:1;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,transparent 0 18%,rgba(90,235,222,.23) 18.2% 18.8%,transparent 19% 32%,rgba(90,235,222,.21) 32.2% 32.7%,transparent 33% 46%,rgba(90,235,222,.18) 46.2% 46.7%,transparent 47%),repeating-radial-gradient(ellipse at 50% 50%,transparent 0 8.8%,rgba(128,242,231,.06) 9% 9.25%,transparent 9.5% 14%);box-shadow:inset 0 0 36px rgba(2,8,9,.78),inset 0 0 0 1px rgba(155,237,226,.3)}.atlas-system-panel .atlas-map::after{content:'';position:absolute;z-index:1;inset:0;pointer-events:none;background:linear-gradient(90deg,transparent 49.86%,rgba(119,239,230,.23) 49.96% 50.04%,transparent 50.14%),linear-gradient(transparent 49.86%,rgba(119,239,230,.23) 49.96% 50.04%,transparent 50.14%);mix-blend-mode:screen}.atlas-system-panel .atlas-pin{z-index:2}.atlas-system-panel .atlas-pin-dot{position:relative}.atlas-system-panel .atlas-pin[aria-pressed=true] .atlas-pin-dot::after{content:'';position:absolute;inset:-10px;border:1px solid #ea7257;clip-path:polygon(0 0,34% 0,34% 8%,66% 8%,66% 0,100% 0,100% 34%,92% 34%,92% 66%,100% 66%,100% 100%,66% 100%,66% 92%,34% 92%,34% 100%,0 100%,0 66%,8% 66%,8% 34%,0 34%);box-shadow:0 0 12px rgba(238,92,67,.95),inset 0 0 9px rgba(243,141,93,.35);pointer-events:none}
  .atlas-holotable-plinth{position:relative;height:29px;margin:-2px 18px 0;transform:perspective(500px) rotateX(-40deg);transform-origin:top;background:linear-gradient(180deg,#d0a55e 0 7%,#5c4424 8% 14%,#292016 15% 61%,#080b0b 62%);clip-path:polygon(4% 0,96% 0,100% 100%,0 100%);box-shadow:0 11px 14px rgba(0,0,0,.62)}.atlas-holotable-plinth::before{content:'HOLO-EMITTER ARRAY // SYSTEM SURVEY LOCKED';position:absolute;left:50%;top:6px;transform:translateX(-50%);color:#6be0d8;font:700 .48rem ui-monospace,monospace;letter-spacing:.11em;white-space:nowrap;text-shadow:0 0 8px rgba(99,238,226,.75)}.atlas-holotable-plinth::after{content:'';position:absolute;inset:8px 11%;border-top:1px solid rgba(92,223,213,.45);border-bottom:1px solid rgba(212,172,93,.32)}.atlas-holotable-support{position:absolute;top:19px;width:20%;height:14px;background:linear-gradient(90deg,#080909,#725329 16%,#251b12 64%,#060808);border:1px solid #a98042;clip-path:polygon(8% 0,92% 0,100% 100%,0 100%);box-shadow:0 7px 9px rgba(0,0,0,.58)}.atlas-holotable-support:first-child{left:11%}.atlas-holotable-support:last-child{right:11%}
  .atlas-system-panel .atlas-detail{margin-top:23px!important;padding:20px!important;border:2px solid #6f5530!important;box-shadow:inset 0 0 0 2px #15120d,inset 5px 0 #a94535,0 7px 14px rgba(0,0,0,.4)!important;background:linear-gradient(100deg,rgba(34,27,20,.99),rgba(7,15,16,.99))!important}.atlas-system-panel .atlas-detail::after{content:'';position:absolute;right:10px;top:10px;width:18px;height:18px;border:2px solid #b88b4b;border-left:0;border-bottom:0;opacity:.75}
  .atlas-side-dossier{position:relative;margin:0 0 8px;padding:17px 14px 14px!important;border:2px solid #775830!important;background:linear-gradient(150deg,rgba(56,31,23,.97),rgba(7,16,17,.99) 58%)!important;box-shadow:inset 0 0 0 2px #11110d,inset 4px 0 #a84835,0 5px 12px rgba(0,0,0,.42)!important}.atlas-side-dossier::before{content:'TARGETING DOSSIER';display:block;margin:0 0 8px;padding-bottom:7px;border-bottom:1px solid rgba(186,150,77,.45);color:#74d8d0;font:700 .58rem ui-monospace,monospace;letter-spacing:.12em}.atlas-side-dossier::after{content:'';position:absolute;right:8px;top:8px;width:15px;height:15px;border:2px solid #bc9250;border-left:0;border-bottom:0;opacity:.86}.atlas-side-dossier h2{margin:4px 0 9px!important;color:#efd597!important;font-size:1.15rem!important;line-height:1.12}.atlas-side-dossier p{margin:7px 0;color:#d0d8cf!important;font-size:.83rem;line-height:1.42}.atlas-side-dossier .world-meta{color:#dab66d}.atlas-side-dossier .atlas-available-actions{margin-top:11px;padding:9px}.atlas-side-dossier .atlas-available-actions h3{font-size:.58rem}.atlas-side-dossier .atlas-available-actions p{margin:0;font-size:.76rem}
  .atlas-terminal-control{position:relative;border:2px solid #695133!important;border-left:5px solid #a57a3b!important;box-shadow:inset 0 0 0 1px #0a0c0c,inset 0 1px 0 rgba(237,202,125,.13),0 4px 8px rgba(0,0,0,.4)!important;background:linear-gradient(100deg,rgba(66,39,27,.92),rgba(14,20,19,.98))!important}.atlas-terminal-control::after{content:'◇';position:absolute;right:9px;top:50%;transform:translateY(-50%);color:#856d43;font-size:.72rem}.atlas-terminal-control:disabled{opacity:.9!important}.atlas-terminal-control strong{color:#d9c59c!important}
  @media(max-width:1050px){.atlas-side-dossier{grid-column:1/-1}}@media(max-width:720px){.atlas-command-deck{gap:14px;padding:16px 14px 22px}.atlas-command-top{padding:15px!important}.atlas-holomap{padding:10px 10px 31px;transform:none}.atlas-holotable-plinth{height:19px;margin:0 11px}.atlas-holotable-plinth::before{font-size:.34rem;top:4px}.atlas-holotable-support{display:none}.atlas-system-panel{padding:14px 13px 22px!important}.atlas-command-top,.atlas-ongoings,.atlas-system-panel,.atlas-quick{box-shadow:0 0 0 2px #080a09,0 0 0 4px #5c472d,0 10px 18px rgba(0,0,0,.5)!important}}@media(max-width:460px){.atlas-pin-label{position:relative}.atlas-pin[data-location-id="location-iscara"] .atlas-pin-label{transform:translateY(-9px)}.atlas-pin[data-location-id="location-ex-morvan"] .atlas-pin-label{transform:translateY(9px)}.atlas-pin[data-location-id="location-gork"] .atlas-pin-label{transform:translateY(-8px)}.atlas-pin[data-location-id="location-warp-meridian"] .atlas-pin-label{transform:translateY(8px)}.atlas-pin[data-location-id="location-alecto"] .atlas-pin-label{transform:translate(-8px,10px)}.atlas-pin[data-location-id="location-carthax"] .atlas-pin-label{transform:translateY(-8px)}.atlas-pin[data-location-id="location-khelt"] .atlas-pin-label{transform:translateY(9px)}.atlas-pin[data-location-id="location-cthon"] .atlas-pin-label{transform:translateY(-8px)}.atlas-pin[data-location-id="location-pyraxis"] .atlas-pin-label{transform:translateY(9px)}}
  /* Uneven grime and hard, riveted fittings keep this from reading as a clean sci-fi dashboard. */
  .atlas-command-top,.atlas-ongoings,.atlas-system-panel,.atlas-quick{background-image:repeating-linear-gradient(107deg,rgba(205,163,90,.055) 0 1px,transparent 1px 13px),repeating-linear-gradient(17deg,rgba(0,0,0,.2) 0 1px,transparent 1px 9px),linear-gradient(135deg,rgba(58,37,26,.98),rgba(8,14,14,.99) 42%,rgba(28,19,14,.98))!important;background-blend-mode:overlay,multiply,normal}.atlas-command-top{background-image:repeating-linear-gradient(103deg,rgba(219,180,103,.075) 0 1px,transparent 1px 17px),repeating-linear-gradient(14deg,rgba(0,0,0,.22) 0 1px,transparent 1px 11px),linear-gradient(180deg,rgba(80,47,31,.98),rgba(22,22,18,.98) 24%,rgba(27,18,14,.99))!important}.atlas-ongoings,.atlas-quick{background-image:repeating-linear-gradient(108deg,rgba(185,135,68,.07) 0 1px,transparent 1px 14px),repeating-linear-gradient(23deg,rgba(0,0,0,.23) 0 1px,transparent 1px 10px),linear-gradient(135deg,rgba(60,35,26,.98),rgba(11,17,16,.99) 33%,rgba(5,10,11,.99))!important}.atlas-system-panel{background-image:repeating-linear-gradient(105deg,rgba(192,147,73,.065) 0 1px,transparent 1px 16px),repeating-linear-gradient(15deg,rgba(0,0,0,.25) 0 1px,transparent 1px 9px),linear-gradient(135deg,rgba(65,43,28,.99),rgba(8,17,18,.99) 31%,rgba(18,17,14,.99))!important}.atlas-command-top::after{background:repeating-linear-gradient(90deg,transparent 0 48px,rgba(230,190,106,.16) 49px 50px),repeating-linear-gradient(13deg,rgba(10,4,2,.32) 0 1px,transparent 1px 13px),linear-gradient(90deg,rgba(0,0,0,.35),transparent 8%,transparent 92%,rgba(0,0,0,.44))!important}.atlas-holomap::after{content:none!important}.atlas-tracked-body{position:absolute;z-index:2;left:18px;bottom:24px;padding:4px 7px;border:1px solid #b5904e;background:rgba(5,14,15,.9);color:#b5f3eb;font:700 .52rem ui-monospace,monospace;letter-spacing:.08em;box-shadow:0 2px 4px rgba(0,0,0,.72);pointer-events:none}.atlas-command-status .atlas-date-status{display:flex;min-width:112px;padding:4px 8px;align-items:center;justify-content:center;gap:5px;border:2px solid #b38b49;background:linear-gradient(180deg,rgba(72,43,23,.95),rgba(12,20,20,.95));color:#e1c57d;font-size:.62rem;box-shadow:inset 0 0 0 1px #17120d,0 0 10px rgba(197,151,70,.22)}.atlas-command-status .atlas-date-status b{font:700 .88rem Georgia,serif;color:#fff0bc;letter-spacing:.03em}.atlas-pin[data-location-id="location-iscara"] .atlas-pin-label{transform:translate(-13px,-15px)}.atlas-pin[data-location-id="location-ex-morvan"] .atlas-pin-label{transform:translate(1px,15px)}.atlas-pin[data-location-id="location-carthax"] .atlas-pin-label{transform:translate(-13px,-15px)}.atlas-pin[data-location-id="location-warp-meridian"] .atlas-pin-label{transform:translate(3px,15px)}
  .atlas-screen-heading .atlas-map-date{display:flex;align-items:baseline;justify-content:center;gap:6px;min-width:144px;padding:3px 8px;border-left:1px solid rgba(204,166,85,.48);border-right:1px solid rgba(204,166,85,.48);background:linear-gradient(90deg,transparent,rgba(128,101,53,.25),transparent);color:#ead48e;text-align:center}.atlas-screen-heading .atlas-map-date small{color:#8de0d8;font:700 .5rem ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase}.atlas-screen-heading .atlas-map-date b{color:#fff0bb;font:700 .82rem Georgia,serif;letter-spacing:.045em;white-space:nowrap}.atlas-tracked-body{border:0;background:transparent;box-shadow:none;padding:0;color:rgba(181,243,235,.82);text-shadow:0 1px 2px #000}.atlas-pin[data-location-id="location-khelt"] .atlas-pin-label{transform:translateY(20px)}
  @media(max-width:720px){.atlas-tracked-body{left:13px;bottom:16px;font-size:.42rem}.atlas-screen-heading .atlas-map-date{min-width:0;padding:0 5px}.atlas-screen-heading .atlas-map-date small{display:none}.atlas-screen-heading .atlas-map-date b{font-size:.62rem}.atlas-pin[data-location-id="location-khelt"] .atlas-pin-label{transform:translateY(15px)}}
  @media(prefers-reduced-motion:reduce){.atlas-holomap{transform:none}}
`;

type PlayerCommandDeckStatus = { campaignDate: string; playerName: string; cellLocation: string; operationStatus: string; signalCount: number };
type TerminalControl = { id: string; label: string; note: string; requiresIndexOperating?: boolean };
const terminalControls: readonly TerminalControl[] = [
    { id: 'army', label: 'Army manager', note: 'Roster and force-record terminal integration pending.' },
    { id: 'briefings', label: 'Briefings', note: 'Published record terminal integration pending.' },
    { id: 'resources', label: 'Cell resources', note: 'Shared asset terminal integration pending.' },
    { id: 'operations', label: 'Operations', note: 'Published operation terminal integration pending.' },
    { id: 'exchange', label: 'Miren’s counter', note: 'Identity-bound exchange terminal integration pending.', requiresIndexOperating: true },
    { id: 'travel', label: 'Travel corridors', note: 'GM-confirmed journey planning integration pending.' },
    { id: 'missions', label: 'Location activities', note: 'Published mission opportunity integration pending.' },
    { id: 'relationships', label: 'Relationships & leads', note: 'Player-safe lead and relationship integration pending.' },
];

const formatDate = (date?: CampaignDate) => date ? `M${date.month} D${date.day}, ${date.year}.${date.era}` : 'Campaign date unavailable';

export function WorldPage({ report }: {
    report: (message: string) => void;
}) {
    const [data, setData] = useState<WorldData>();
    const [control, setControl] = useState<CampaignControlState>();
    const [locationQuery, setLocationQuery] = useState('');
    const [editingLocation, setEditingLocation] = useState<WorldLocation>();
    const [identities, setIdentities] = useState<CampaignIdentity[]>([]);
    const [routeId, setRouteId] = useState('');
    const [journey, setJourney] = useState({ origin: '', destination: '' });
    const [participants, setParticipants] = useState<string[]>([]);
    const [travelNote, setTravelNote] = useState('');
    const [templateId, setTemplateId] = useState('');
    const [eventBriefing, setEventBriefing] = useState('');
    const [cold, setCold] = useState<Record<string, string>>({});
    const [decision, setDecision] = useState({ title: '', detail: '', sourceReference: '00 Campaign Bible/Greater Campaign Arc - The Cold Ember.docx', published: false });
    const [hearth, setHearth] = useState({ status: '', station: '', control: '', breach: '', breachDetail: '', activation: '' });
    const [pressures, setPressures] = useState<Record<string, {
        status: string;
        summary: string;
        notes: string;
        severity: string;
        published: boolean;
        urgent: boolean;
    }>>({});
    const [project, setProject] = useState({ title: '', track: '', maximum: '4', source: '' });
    const [locationDraft, setLocationDraft] = useState({ title: '', description: '', access: '', secrets: '', source: '', published: true });
    const [routeDraft, setRouteDraft] = useState({ title: '', origin: '', destination: '', description: '', transit: 'Local', days: '1', access: '', pressure: '', source: '', published: true });
    const load = () => Promise.all([request<WorldData>('/campaign/world'), request<CampaignIdentity[]>('/campaign/identities'), request<CampaignControlState>('/campaign/control')]).then(([world, people, fullControl]) => { setData(world); setControl(fullControl); setIdentities(people.filter(person => person.role === 'player')); setRouteId(current => current || world.routes[0]?.id || ''); setTemplateId(current => current || world.templates[0]?.id || ''); setJourney(current => ({ origin: current.origin || world.locations[0]?.id || '', destination: current.destination || world.locations[1]?.id || world.locations[0]?.id || '' })); setRouteDraft(current => ({ ...current, origin: current.origin || world.locations[0]?.id || '', destination: current.destination || world.locations[1]?.id || world.locations[0]?.id || '' })); if (world.coldEmber) {
        const c = world.coldEmber;
        setCold({ phase: c.phase, transition: c.transitionAvailability, protected: join(c.protectedParties), evidence: c.evidenceDisposition, compacts: join(c.compactsOwed), history: join(c.historyVersions), resources: join(c.resourcesLost), sabine: join(c.sabineSecretKnownBy), miniatures: join(c.miniatureMilestones), endings: join(c.endingPossibilities) });
    } setPressures(Object.fromEntries(world.pressures.map(row => [row.id, { status: row.currentStatus, summary: row.publicSummary, notes: row.gmNotes, severity: String(row.severity ?? ''), published: row.published, urgent: row.playerFacingUrgent }]))); });
    useEffect(() => { void load().catch(error => report(error.message)); }, []);
    const submit = async (work: () => Promise<unknown>) => { try {
        await work();
        await load();
    }
    catch (error) {
        report(error instanceof Error ? error.message : 'The world update could not be saved.');
    } };
    const coldEmber = data?.coldEmber;
    const hearthshield = data?.projects.find(project => project.id === 'project-hearthshield');
    const routeEstimate = data ? calculateTravelEstimate(data.locations, data.routes, journey.origin, journey.destination) : undefined;
    const routeEstimateNames = routeEstimate?.locationIds.map(id => data?.locations.find(location => location.id === id)?.title ?? id).join(' → ');
    const filteredLocations = data?.locations.filter(location => `${location.title} ${location.detailStatus} ${location.publicationStatus}`.toLowerCase().includes(locationQuery.toLowerCase())) ?? [];
    const setColdValue = (field: string, value: string) => setCold(current => ({ ...current, [field]: value }));
    return <><main className="control world-page">
<header className="control-header">
<div>
<p className="eyebrow">GM-only · world and arc command</p>
<h1>Campaign World</h1>
</div>
<a className="display-link" href="#/">Return to Control</a>
</header>
<section className="control-actions">
<a className="display-link" href="#/atlas" target="_blank">Open player atlas</a>
<a className="display-link" href="#/operations">Open operations</a>
<a className="display-link" href="#/campaign">Campaign docket</a>
</section>
<div className="world-grid">
    <section className="world-panel">
<p className="eyebrow">Curated atlas</p>
<h2>Atlas workspace</h2><div className="world-atlas-workspace"><div className="atlas-map" aria-label="GM Tavrellis system map"><img src="/hybrid-campaign/assets/world-atlas/tavrellis-system-unlabelled-map.png" alt="Tavrellis system map"/>{data?.locations.filter(location => location.mapPosition).map(location => <button className={`atlas-pin ${location.mapPosition!.x > 79 ? 'atlas-pin-right-edge' : ''}`} key={location.id} aria-label={`Edit ${location.title}`} title={location.title} style={{ left: `${location.mapPosition!.x}%`, top: `${location.mapPosition!.y}%` }} onClick={() => setEditingLocation(location)}><span className="atlas-pin-dot" aria-hidden="true"/><span className="atlas-pin-label" aria-hidden="true">{mapLabel(location.title)}</span></button>)}</div><div><input className="world-search" aria-label="Search atlas locations" placeholder="Search locations" value={locationQuery} onChange={event => setLocationQuery(event.target.value)}/><div className="world-location-list">{filteredLocations.map(location => <button key={location.id} onClick={() => setEditingLocation(location)}><strong>{location.title}</strong><br/><span className="world-meta">{location.readiness.replaceAll('-', ' ')} · {location.publicationStatus} · {location.linkedEvidenceIds.length} evidence · {location.linkedAssetIds.length} assets</span></button>)}</div></div></div><details className="world-card">
<summary>Add location</summary>
<div className="world-form">
<label>Location title<input value={locationDraft.title} onChange={event => setLocationDraft(current => ({ ...current, title: event.target.value }))}/>
</label>
<label>Player-safe description<textarea value={locationDraft.description} onChange={event => setLocationDraft(current => ({ ...current, description: event.target.value }))}/>
</label>
<label>Authority and access<input value={locationDraft.access} onChange={event => setLocationDraft(current => ({ ...current, access: event.target.value }))}/>
</label>
<label>GM-only location notes<textarea value={locationDraft.secrets} onChange={event => setLocationDraft(current => ({ ...current, secrets: event.target.value }))}/>
</label>
<label>Canonical source path (optional)<input value={locationDraft.source} onChange={event => setLocationDraft(current => ({ ...current, source: event.target.value }))}/>
</label>
<label>
<input type="checkbox" checked={locationDraft.published} onChange={event => setLocationDraft(current => ({ ...current, published: event.target.checked }))}/> Publish in Atlas</label>
<button onClick={() => void submit(async () => { await request('/campaign/world/locations', { method: 'POST', body: JSON.stringify({ title: locationDraft.title, publicDescription: locationDraft.description, authorityAccess: locationDraft.access, gmSecrets: locationDraft.secrets, sourceReferences: locationDraft.source ? [locationDraft.source] : [], publicationStatus: locationDraft.published ? 'published' : 'draft' }) }); setLocationDraft({ title: '', description: '', access: '', secrets: '', source: '', published: true }); })}>Create location</button>
</div>
</details>
</section>
    <section className="world-panel">
<p className="eyebrow">Named regional records</p>
<h2>Regional pressures</h2>{data?.pressures.map(pressure => { const draft = pressures[pressure.id] ?? { status: pressure.currentStatus, summary: pressure.publicSummary, notes: pressure.gmNotes, severity: String(pressure.severity ?? ''), published: pressure.published, urgent: pressure.playerFacingUrgent }; const change = (patch: Partial<typeof draft>) => setPressures(current => ({ ...current, [pressure.id]: { ...draft, ...patch } })); return <article className="world-card" key={pressure.id}>
<span className="world-meta">{pressure.kind}{pressure.kind === 'scar-activity' ? ` · ${pressure.severity}/4` : ''}</span>
<h3>{pressure.title}</h3>
<div className="world-form">
<label>Status<input value={draft.status} onChange={event => change({ status: event.target.value })}/>
</label>{pressure.kind === 'scar-activity' && <label>Scar band (0 distant · 4 breach)<input type="number" min="0" max="4" value={draft.severity} onChange={event => change({ severity: event.target.value })}/>
</label>}<label>Player-safe summary<textarea value={draft.summary} onChange={event => change({ summary: event.target.value })}/>
</label>
<label>GM notes<textarea value={draft.notes} onChange={event => change({ notes: event.target.value })}/>
</label>
<label>
<input type="checkbox" checked={draft.published} onChange={event => change({ published: event.target.checked })}/> Publish to Atlas</label>
<label><input type="checkbox" checked={draft.urgent} onChange={event => change({ urgent: event.target.checked })}/> Show as a player-known urgent notice</label>
<button onClick={() => void submit(() => request(`/campaign/world/pressures/${pressure.id}`, { method: 'PUT', body: JSON.stringify({ currentStatus: draft.status, severity: pressure.kind === 'scar-activity' ? Number(draft.severity) : undefined, publicSummary: draft.summary, gmNotes: draft.notes, published: draft.published, playerFacingUrgent: draft.urgent, reason: 'GM updated the named regional pressure.' }) }))}>Save pressure</button>
</div>
</article>; })}</section>
    <section className="world-panel">
<p className="eyebrow">GM-confirmed calendar movement</p>
<h2>Travel docket</h2>{data?.routes.map(route => <article className="world-card" key={route.id}>
<span className="world-meta">{route.publicationStatus}</span>
<h3>{route.title}</h3>
<p>{route.transitBand} · {route.durationDays} days · {route.accessRequirements}</p>
</article>)}<details className="world-card">
<summary>Manage travel corridors</summary>
<div className="world-form">
<label>Route title<input value={routeDraft.title} onChange={event => setRouteDraft(current => ({ ...current, title: event.target.value }))}/>
</label>
<label>Origin<select value={routeDraft.origin} onChange={event => setRouteDraft(current => ({ ...current, origin: event.target.value }))}>{data?.locations.map(location => <option key={location.id} value={location.id}>{location.title}</option>)}</select>
</label>
<label>Destination<select value={routeDraft.destination} onChange={event => setRouteDraft(current => ({ ...current, destination: event.target.value }))}>{data?.locations.map(location => <option key={location.id} value={location.id}>{location.title}</option>)}</select>
</label>
{routeEstimate && <p className="world-route-estimate"><strong>Suggested itinerary:</strong> {routeEstimateNames} · approximately {routeEstimate.days} day{routeEstimate.days === 1 ? '' : 's'} across established corridors.</p>}
<label>Player-safe route description<textarea value={routeDraft.description} onChange={event => setRouteDraft(current => ({ ...current, description: event.target.value }))}/>
</label>
<label>Transit band<input value={routeDraft.transit} onChange={event => setRouteDraft(current => ({ ...current, transit: event.target.value }))}/>
</label>
<label>Transit days (1–336)<input type="number" min="1" max="336" value={routeDraft.days} onChange={event => setRouteDraft(current => ({ ...current, days: event.target.value }))}/>
</label>
<label>Access requirements<input value={routeDraft.access} onChange={event => setRouteDraft(current => ({ ...current, access: event.target.value }))}/>
</label>
<label>GM-only route pressure<textarea value={routeDraft.pressure} onChange={event => setRouteDraft(current => ({ ...current, pressure: event.target.value }))}/>
</label>
<label>Canonical source path<input value={routeDraft.source} onChange={event => setRouteDraft(current => ({ ...current, source: event.target.value }))}/>
</label>
<label>
<input type="checkbox" checked={routeDraft.published} onChange={event => setRouteDraft(current => ({ ...current, published: event.target.checked }))}/> Publish in Atlas</label>
<button onClick={() => void submit(async () => { await request('/campaign/world/routes', { method: 'POST', body: JSON.stringify({ title: routeDraft.title, originLocationId: routeDraft.origin, destinationLocationId: routeDraft.destination, publicDescription: routeDraft.description, transitBand: routeDraft.transit, durationDays: Number(routeDraft.days), accessRequirements: routeDraft.access, gmPressure: routeDraft.pressure, sourceReference: routeDraft.source, publicationStatus: routeDraft.published ? 'published' : 'draft' }) }); setRouteDraft(current => ({ ...current, title: '', description: '', transit: 'Local', days: '1', access: '', pressure: '', source: '', published: true })); })}>Add corridor</button>
</div>
</details>
<div className="world-form">
<h3>Connected itinerary planner</h3>
<label>Origin<select value={journey.origin} onChange={event => setJourney(current => ({ ...current, origin: event.target.value }))}>{data?.locations.filter(location => location.publicationStatus !== 'withdrawn').map(location => <option key={location.id} value={location.id}>{location.title}</option>)}</select>
</label>
<label>Destination<select value={journey.destination} onChange={event => setJourney(current => ({ ...current, destination: event.target.value }))}>{data?.locations.filter(location => location.publicationStatus !== 'withdrawn').map(location => <option key={location.id} value={location.id}>{location.title}</option>)}</select>
</label>
{routeEstimate ? <p className="world-route-estimate"><strong>Corridor sequence:</strong> {routeEstimateNames} · {routeEstimate.days} total days. This is one multi-leg journey, not a direct route.</p> : <p className="world-route-estimate">No connected corridor itinerary is available for these endpoints.</p>}
<label>Participants<select multiple value={participants} onChange={event => setParticipants([...event.target.selectedOptions].map(option => option.value))}>{identities.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select>
</label>
<label>Travel purpose<input value={travelNote} onChange={event => setTravelNote(event.target.value)} placeholder="Why is the Cell travelling?"/>
</label>
<button disabled={!routeEstimate} onClick={() => void submit(() => request('/campaign/world/travel', { method: 'POST', body: JSON.stringify({ originLocationId: journey.origin, destinationLocationId: journey.destination, participantIds: participants, note: travelNote }) }))}>Plan connected journey</button>
</div>{data?.travel.map(travel => <article className="world-card" key={travel.id}>
<span className="world-meta">{travel.status}</span>
<p>{travel.corridorIds.map(id => data.routes.find(route => route.id === id)?.title ?? 'Unknown corridor').join(' → ')} · {travel.totalDurationDays} days · {travel.note}</p>{travel.status === 'planned' && <button onClick={() => void submit(() => request(`/campaign/world/travel/${travel.id}/confirm`, { method: 'POST' }))}>Confirm departure & advance time</button>}{travel.status === 'confirmed' && <button onClick={() => void submit(() => request(`/campaign/world/travel/${travel.id}/complete`, { method: 'POST' }))}>Complete journey</button>}</article>)}</section>
    <section className="world-panel">
<p className="eyebrow">Template-driven operations</p>
<h2>Event Compendium</h2>{data?.templates.map(template => <article className="world-card" key={template.id}>
<h3>{template.title}</h3>
<p>{template.stages.map(stage => stage.title).join(' → ')}</p>
</article>)}<div className="world-form">
<label>Event template<select value={templateId} onChange={event => setTemplateId(event.target.value)}>{data?.templates.map(template => <option key={template.id} value={template.id}>{template.title}</option>)}</select>
</label>
<label>Player-safe briefing<textarea value={eventBriefing} onChange={event => setEventBriefing(event.target.value)} placeholder="What the Cell is told"/>
</label>
<button onClick={() => void submit(() => request('/campaign/events', { method: 'POST', body: JSON.stringify({ templateId, playerBriefing: eventBriefing }) }))}>Create event run</button>
</div>{data?.events.map(event => { const template = data.templates.find(entry => entry.id === event.templateId); return <article className="world-card" key={event.id}>
<span className="world-meta">{event.status}</span>
<h3>{event.title}</h3>
<p>{event.playerBriefing}</p>{template?.stages.map(stage => { const state = event.stageStates.find(entry => entry.stageId === stage.id); return <p key={stage.id}>
<strong>{stage.title}</strong> · {state?.status ?? 'pending'} {['prepared', 'in-progress'].includes(event.status) && state?.status !== 'completed' && state?.status !== 'failed' && <button onClick={() => void submit(() => request(`/campaign/events/${event.id}/stage`, { method: 'POST', body: JSON.stringify({ stageId: stage.id, status: state?.status === 'active' ? 'completed' : 'active', reason: `GM recorded ${stage.title}.` }) }))}>{state?.status === 'active' ? 'Complete stage' : 'Activate stage'}</button>}</p>; })}<div className="world-actions">{event.status === 'draft' && <button onClick={() => void submit(() => request(`/campaign/events/${event.id}`, { method: 'POST', body: JSON.stringify({ action: 'prepare' }) }))}>Prepare</button>}{event.status === 'prepared' && <button onClick={() => void submit(() => request(`/campaign/events/${event.id}`, { method: 'POST', body: JSON.stringify({ action: 'start' }) }))}>Start</button>}{['prepared', 'in-progress'].includes(event.status) && <button onClick={() => void submit(() => request(`/campaign/events/${event.id}`, { method: 'POST', body: JSON.stringify({ action: 'resolve', result: 'partial-success', reason: 'GM-confirmed event outcome.' }) }))}>Resolve</button>}</div>
</article>; })}</section>
    {hearthshield && <section className="world-panel wide">
<p className="eyebrow">Typed project · named mechanics</p>
<h2>The Hearthshield Project</h2>
<p>{hearthshield.status} · {hearthshield.stationStatus} · {hearthshield.controlState}</p>{hearthshield.tracks.map(track => <div className="track-row" key={track.id}>
<strong>{track.title}</strong>
<span>{track.value}/{track.maximum}</span>
<span>
<button disabled={track.value <= 0} onClick={() => void submit(() => request('/campaign/world/hearthshield', { method: 'PUT', body: JSON.stringify({ trackId: track.id, value: track.value - 1, reason: 'GM correction to named Hearthshield preparation.' }) }))}>−</button>
<button disabled={track.value >= track.maximum} onClick={() => void submit(() => request('/campaign/world/hearthshield', { method: 'PUT', body: JSON.stringify({ trackId: track.id, value: track.value + 1, reason: 'GM-confirmed Hearthshield preparation.' }) }))}>+</button>
</span>
</div>)}<div className="world-detail-grid">
<div className="world-form">
<label>Project status<select value={hearth.status || hearthshield.status} onChange={event => setHearth(current => ({ ...current, status: event.target.value }))}>{['inactive', 'active', 'ready', 'activated', 'suspended', 'completed', 'lost'].map(status => <option key={status}>{status}</option>)}</select>
</label>
<label>Station status<input value={hearth.station || hearthshield.stationStatus} onChange={event => setHearth(current => ({ ...current, station: event.target.value }))}/>
</label>
<button onClick={() => void submit(() => request('/campaign/world/hearthshield', { method: 'PUT', body: JSON.stringify({ projectStatus: hearth.status || hearthshield.status, stationStatus: hearth.station || hearthshield.stationStatus, reason: 'GM updated Hearthshield operational status.' }) }))}>Save project status</button>
</div>
<div className="world-form">
<label>Initial control / Accord<select value={hearth.control} onChange={event => setHearth(current => ({ ...current, control: event.target.value }))}>
<option value="">Leave unchanged</option>
<option value="quist">Quist</option>
<option value="kalagan">Kalagan</option>
<option value="accord">Hearthshield Accord (3/3 only)</option>
</select>
</label>
<button disabled={!hearth.control} onClick={() => void submit(() => request('/campaign/world/hearthshield', { method: 'PUT', body: JSON.stringify({ controlState: hearth.control, reason: 'GM recorded the negotiated Hearthshield control arrangement.' }) }))}>Record control</button>
<p>{hearthshield.accordAvailable ? 'Accord is available at 3/3.' : 'Accord remains unavailable until both readiness tracks are 3.'}</p>
</div>
<div className="world-form">
<label>Breach Front title<input value={hearth.breach} onChange={event => setHearth(current => ({ ...current, breach: event.target.value }))}/>
</label>
<label>Breach Front detail<textarea value={hearth.breachDetail} onChange={event => setHearth(current => ({ ...current, breachDetail: event.target.value }))}/>
</label>
<button onClick={() => void submit(() => request('/campaign/world/hearthshield', { method: 'PUT', body: JSON.stringify({ breachFront: { title: hearth.breach, detail: hearth.breachDetail }, reason: 'GM recorded a named Hearthshield Breach Front.' }) }))}>Add Breach Front</button>
</div>
<div className="world-form">
<label>Activation / shutdown record<textarea value={hearth.activation} onChange={event => setHearth(current => ({ ...current, activation: event.target.value }))}/>
</label>
<button onClick={() => void submit(() => request('/campaign/world/hearthshield', { method: 'PUT', body: JSON.stringify({ activationDetail: hearth.activation, reason: 'GM recorded Hearthshield activation history.' }) }))}>Record activation history</button>
</div>
</div>{hearthshield.contactStates.map(contact => <article className="world-card" key={contact.id}>
<strong>{contact.title}</strong>
<p>{contact.detail}</p>
<button onClick={() => void submit(() => request('/campaign/world/hearthshield', { method: 'PUT', body: JSON.stringify({ contactId: contact.id, contactActive: !contact.active, reason: `GM recorded ${contact.title}.` }) }))}>{contact.active ? 'Close contact state' : 'Establish contact state'}</button>
</article>)}{hearthshield.breachFronts.map(front => <article className="world-card" key={front.id}>
<strong>{front.title}</strong> · {front.status}<p>{front.detail}</p>{front.status === 'active' && <button onClick={() => void submit(() => request('/campaign/world/hearthshield', { method: 'PUT', body: JSON.stringify({ breachFront: { title: front.title, detail: front.detail, resolve: true }, reason: 'GM confirmed the Breach Front is resolved.' }) }))}>Resolve Breach Front</button>}</article>)}</section>}
    <section className="world-panel">
<p className="eyebrow">Reusable record foundation</p>
<h2>New typed project</h2>
<p>Use a named project when its track is not a generic campaign clock.</p>
<div className="world-form">
<label>Project title<input value={project.title} onChange={event => setProject(current => ({ ...current, title: event.target.value }))}/>
</label>
<label>Optional named track<input value={project.track} onChange={event => setProject(current => ({ ...current, track: event.target.value }))}/>
</label>
<label>Track maximum (1–12)<input type="number" min="1" max="12" value={project.maximum} onChange={event => setProject(current => ({ ...current, maximum: event.target.value }))}/>
</label>
<label>Canonical source path<input value={project.source} onChange={event => setProject(current => ({ ...current, source: event.target.value }))}/>
</label>
<button onClick={() => void submit(() => request('/campaign/world/projects', { method: 'POST', body: JSON.stringify({ title: project.title, tracks: project.track ? [{ title: project.track, maximum: Number(project.maximum) }] : [], sourceReferences: project.source ? [project.source] : [], reason: 'GM created a separate named project.' }) }))}>Create typed project</button>
</div>
</section>
    {coldEmber && <section className="world-panel wide">
<p className="eyebrow">GM-only decision ledger · pressure, never prediction</p>
<h2>Cold Ember</h2>
<p>
<strong>{coldEmber.phase}</strong> · {coldEmber.transitionAvailability}</p>
<div className="world-detail-grid">
<div className="world-form">
<label>Current phase<input value={cold.phase ?? ''} onChange={event => setColdValue('phase', event.target.value)}/>
</label>
<label>Transition availability<input value={cold.transition ?? ''} onChange={event => setColdValue('transition', event.target.value)}/>
</label>
<label>Evidence disposition<input value={cold.evidence ?? ''} onChange={event => setColdValue('evidence', event.target.value)}/>
</label>
<label>Protected parties (one per line)<textarea value={cold.protected ?? ''} onChange={event => setColdValue('protected', event.target.value)}/>
</label>
<label>Compacts owed (one per line)<textarea value={cold.compacts ?? ''} onChange={event => setColdValue('compacts', event.target.value)}/>
</label>
<label>History versions that survived (one per line)<textarea value={cold.history ?? ''} onChange={event => setColdValue('history', event.target.value)}/>
</label>
<label>Resources lost (one per line)<textarea value={cold.resources ?? ''} onChange={event => setColdValue('resources', event.target.value)}/>
</label>
<label>Who knows Sabine’s secret (one per line)<textarea value={cold.sabine ?? ''} onChange={event => setColdValue('sabine', event.target.value)}/>
</label>
<label>Miniature milestones (one per line)<textarea value={cold.miniatures ?? ''} onChange={event => setColdValue('miniatures', event.target.value)}/>
</label>
<label>Ending possibilities (one per line)<textarea value={cold.endings ?? ''} onChange={event => setColdValue('endings', event.target.value)}/>
</label>
<button onClick={() => void submit(() => request('/campaign/world/cold-ember', { method: 'PUT', body: JSON.stringify({ phase: cold.phase, transitionAvailability: cold.transition, evidenceDisposition: cold.evidence, protectedParties: split(cold.protected ?? ''), compactsOwed: split(cold.compacts ?? ''), historyVersions: split(cold.history ?? ''), resourcesLost: split(cold.resources ?? ''), sabineSecretKnownBy: split(cold.sabine ?? ''), miniatureMilestones: split(cold.miniatures ?? ''), endingPossibilities: split(cold.endings ?? ''), reason: 'GM updated the Cold Ember choice-pressure ledger.' }) }))}>Save ledger state</button>
</div>
<div className="world-form">
<label>Decision title<input value={decision.title} onChange={event => setDecision(current => ({ ...current, title: event.target.value }))}/>
</label>
<label>Decision / consequence<textarea value={decision.detail} onChange={event => setDecision(current => ({ ...current, detail: event.target.value }))}/>
</label>
<label>Canonical source<input value={decision.sourceReference} onChange={event => setDecision(current => ({ ...current, sourceReference: event.target.value }))}/>
</label>
<label>
<input type="checkbox" checked={decision.published} onChange={event => setDecision(current => ({ ...current, published: event.target.checked }))}/> Publish this decision to Atlas</label>
<button onClick={() => void submit(() => request('/campaign/world/cold-ember', { method: 'PUT', body: JSON.stringify({ decision, reason: 'GM recorded a durable Cold Ember choice.' }) }))}>Record decision</button>
<h3>Recorded decisions</h3>{coldEmber.decisions.map(entry => <article className="world-card" key={entry.id}>
<strong>{entry.title}</strong>
<p>{entry.detail}</p>
<span className="world-meta">{entry.published ? 'published' : 'GM only'}</span>
</article>)}</div>
</div>
</section>}
  </div>
</main>{editingLocation && control && <WorldLocationModal location={editingLocation} control={control} close={() => setEditingLocation(undefined)} save={async (input) => { await submit(() => request(`/campaign/world/locations/${editingLocation.id}`, { method: 'PUT', body: JSON.stringify(input) })); setEditingLocation(undefined); }} setReadiness={async readiness => { await submit(() => request(`/campaign/world/locations/${editingLocation.id}/readiness`, { method: 'POST', body: JSON.stringify({ readiness, reason: `GM moved ${editingLocation.title} through the Tavrellis dossier workshop.` }) })); }} promote={async (sourcePath, basis) => { await submit(() => request(`/campaign/world/locations/${editingLocation.id}/promote`, { method: 'POST', body: JSON.stringify({ sourcePath, basis, reason: `GM approved the canonical Tavrellis dossier for ${editingLocation.title}.` }) })); setEditingLocation(undefined); }}/>}</>;
}
function WorldLocationModal({ location, control, close, save, setReadiness, promote }: { location: WorldLocation; control: CampaignControlState; close: () => void; save: (input: Record<string, unknown>) => Promise<void>; setReadiness: (readiness: WorldLocation['readiness']) => Promise<void>; promote: (sourcePath: string, basis: 'existing-source' | 'gm-approved-workshop') => Promise<void> }) {
  const [draft, setDraft] = useState({ publicDescription: location.publicDescription, gmSecrets: location.gmSecrets, authorityAccess: location.authorityAccess, contacts: join(location.contacts), activePressures: join(location.activePressures), sourceReferences: join(location.sourceReferences), handoutPaths: join(location.handoutPaths), artPaths: join(location.artPaths), publicationStatus: location.publicationStatus, x: String(location.mapPosition?.x ?? ''), y: String(location.mapPosition?.y ?? ''), linkedEvidenceIds: location.linkedEvidenceIds, linkedAssetIds: location.linkedAssetIds, consequence: '', consequencePublished: true, approvalSource: '', approvalBasis: 'gm-approved-workshop' as 'existing-source' | 'gm-approved-workshop' });
  const patch = (change: Partial<typeof draft>) => setDraft(current => ({ ...current, ...change }));
  const saveDraft = () => save({ publicDescription: draft.publicDescription, gmSecrets: draft.gmSecrets, authorityAccess: draft.authorityAccess, contacts: split(draft.contacts), activePressures: split(draft.activePressures), sourceReferences: split(draft.sourceReferences), handoutPaths: split(draft.handoutPaths), artPaths: split(draft.artPaths), publicationStatus: draft.publicationStatus, mapPosition: { x: Number(draft.x), y: Number(draft.y) }, linkedEvidenceIds: draft.linkedEvidenceIds, linkedAssetIds: draft.linkedAssetIds, consequence: draft.consequence.trim() ? { detail: draft.consequence, published: draft.consequencePublished } : undefined, reason: 'GM updated the focused Tavrellis location dossier.' });
  return <Modal title={`Location dossier · ${location.title}`} eyebrow="GM atlas dossier" close={close}>
    <p className="world-route-estimate"><strong>Dossier workflow:</strong> {location.readiness.replaceAll('-', ' ')}{location.dossierApproval ? ` · v${location.dossierApproval.version} · ${location.dossierApproval.basis.replaceAll('-', ' ')}` : ''}</p>
    <div className="world-detail-grid"><div className="world-form"><label>Player-safe description<textarea value={draft.publicDescription} onChange={event => patch({ publicDescription: event.target.value })}/></label><label>GM truth<textarea value={draft.gmSecrets} onChange={event => patch({ gmSecrets: event.target.value })}/></label><label>Authority / access<input value={draft.authorityAccess} onChange={event => patch({ authorityAccess: event.target.value })}/></label><label>Contacts (one per line)<textarea value={draft.contacts} onChange={event => patch({ contacts: event.target.value })}/></label><label>Active pressures (one per line)<textarea value={draft.activePressures} onChange={event => patch({ activePressures: event.target.value })}/></label><label>Canonical sources (one per line)<textarea value={draft.sourceReferences} onChange={event => patch({ sourceReferences: event.target.value })}/></label></div><div className="world-form"><label>Publication<select value={draft.publicationStatus} onChange={event => patch({ publicationStatus: event.target.value as WorldLocation['publicationStatus'] })}><option value="draft">Draft</option><option value="published">Published</option><option value="withdrawn">Withdrawn</option></select></label><label>Map X (0–100)<input type="number" min="0" max="100" value={draft.x} onChange={event => patch({ x: event.target.value })}/></label><label>Map Y (0–100)<input type="number" min="0" max="100" value={draft.y} onChange={event => patch({ y: event.target.value })}/></label><label>Handout paths (one per line)<textarea value={draft.handoutPaths} onChange={event => patch({ handoutPaths: event.target.value })}/></label><label>Art paths (one per line)<textarea value={draft.artPaths} onChange={event => patch({ artPaths: event.target.value })}/></label><label>Linked evidence<select multiple value={draft.linkedEvidenceIds} onChange={event => patch({ linkedEvidenceIds: [...event.target.selectedOptions].map(option => option.value) })}>{control.evidence.map(entry => <option value={entry.id} key={entry.id}>{entry.title}</option>)}</select></label><label>Linked Claimed Assets<select multiple value={draft.linkedAssetIds} onChange={event => patch({ linkedAssetIds: [...event.target.selectedOptions].map(option => option.value) })}>{control.economy.claimedAssets.map(entry => <option value={entry.id} key={entry.id}>{entry.title}</option>)}</select></label><label>Published consequence<textarea value={draft.consequence} onChange={event => patch({ consequence: event.target.value })}/></label><label><input type="checkbox" checked={draft.consequencePublished} onChange={event => patch({ consequencePublished: event.target.checked })}/> Publish consequence</label></div></div>
    <div className="world-actions">{location.detailStatus === 'map-only' && location.readiness === 'map-only' && <button onClick={() => void setReadiness('in-workshop')}>Begin lore workshop</button>}{location.detailStatus === 'map-only' && location.readiness === 'in-workshop' && <button onClick={() => void setReadiness('ready-for-approval')}>Mark ready for approval</button>}</div>
    {location.detailStatus === 'map-only' && location.readiness === 'ready-for-approval' && <div className="world-form"><h3>Publish approved canonical dossier</h3><label>Canonical DOCX path<input value={draft.approvalSource} onChange={event => patch({ approvalSource: event.target.value })} placeholder="06 Locations/Calverna.docx"/></label><label>Canon basis<select value={draft.approvalBasis} onChange={event => patch({ approvalBasis: event.target.value as 'existing-source' | 'gm-approved-workshop' })}><option value="gm-approved-workshop">GM-approved workshop</option><option value="existing-source">Existing source</option></select></label><button onClick={() => void promote(draft.approvalSource, draft.approvalBasis)}>Approve and publish dossier</button></div>}
    <button onClick={() => void saveDraft()}>Save dossier</button>
  </Modal>;
}
export function PlayerAtlas({ report }: {
    report: (message: string) => void;
}) {
    const [data, setData] = useState<Partial<WorldData>>();
    const [selectedId, setSelectedId] = useState('');
    const [loadFailed, setLoadFailed] = useState(false);
    useEffect(() => {
        void request<Partial<WorldData>>('/campaign/world', { headers: { 'X-Trusted-Local-Role': 'player' } })
            .then(result => { setData(result); setLoadFailed(false); })
            .catch(() => { setLoadFailed(true); report('The Atlas data service is temporarily unavailable.'); });
    }, [report]);
    const locations = data?.locations ?? [];
    const selected = locations.find(location => location.id === selectedId) ?? locations[0];
    const partyLocation = locations.find(location => location.id === data?.partyLocationId);
    const ongoings = (data?.pressures ?? []).filter(pressure => pressure.published && pressure.playerFacingUrgent).map(pressure => ({ id: `pressure-${pressure.id}`, title: pressure.title, detail: pressure.publicSummary || pressure.currentStatus })).slice(0, 6);
    const status: PlayerCommandDeckStatus = {
        campaignDate: formatDate(data?.currentDate),
        playerName: data?.playerName || 'authorised Cell operative',
        cellLocation: partyLocation?.title || 'No published location assignment',
        operationStatus: 'No published operation',
        signalCount: ongoings.length,
    };
    const visibleTerminalControls = terminalControls.filter(control => !control.requiresIndexOperating || data?.indexOperating);
    if (loadFailed)
        return <main className="display atlas-page atlas-command-deck"><style>{playerAtlasDeckCss}{inquisitorialBridgeCss}{playerAtlasTerminalCss}{playerAtlasHardwareCss}</style><section className="atlas-load-error" role="alert"><h2>Hololithic chart unavailable</h2><p>The command deck cannot retrieve its cleared survey feed. Reload the page and try again.</p></section></main>;
    return <main className="display atlas-page atlas-command-deck">
<style>{playerAtlasDeckCss}{inquisitorialBridgeCss}{playerAtlasTerminalCss}{playerAtlasHardwareCss}</style>
<aside className="atlas-ongoings" aria-labelledby="atlas-ongoings-title"><p className="eyebrow">Vox & astropathic traffic</p><h2 id="atlas-ongoings-title">Priority reports</h2>{ongoings.length ? ongoings.map(item => <article className="atlas-alert" key={item.id}><strong>{item.title}</strong><span>{item.detail}</span></article>) : <p className="atlas-empty">No priority reports await your attention.</p>}</aside>
<header className="atlas-command-top"><div className="atlas-bridge-title"><img className="atlas-inquisition-sigil" src="/hybrid-campaign/assets/branding/inquisitorial-command-seal.png" alt="" aria-hidden="true"/><div><p className="eyebrow">Inquisitorial command bridge · public survey feed</p><h1>Tavrellis hololithic chart</h1><p className="atlas-welcome">Welcome aboard, {status.playerName}.</p><div className="atlas-command-status" aria-label="Player-safe campaign status"><span>Location <b>{status.cellLocation}</b></span><span>Operation <b>{status.operationStatus}</b></span><span>Signals <b>{status.signalCount}</b></span></div></div></div><nav className="atlas-tool-strip" aria-label="Future player terminals">{visibleTerminalControls.filter(control => ['army', 'briefings', 'resources', 'operations'].includes(control.id)).map(control => <button className="atlas-terminal-control" type="button" key={control.id} disabled aria-disabled="true" title={control.note}><strong>{control.label}</strong><span>Terminal integration pending.</span></button>)}</nav></header>
<section className="atlas-system-panel" aria-label="Interactive Tavrellis system map"><div className="atlas-screen-heading"><span>Hololithic system survey · Tavrellis</span><span className="atlas-map-date"><small>Campaign date</small><b>{status.campaignDate}</b></span><span>Clearance: Cell public</span></div><p className="atlas-selection-announcement" aria-live="polite">{selected ? `${selected.title} selected.` : 'No location selected.'}</p><div className="atlas-holomap"><div className="atlas-map"><img src="/hybrid-campaign/assets/world-atlas/tavrellis-system-unlabelled-map.png" alt="Tavrellis system map"/>{partyLocation?.mapPosition ? <span className="atlas-party-marker" role="img" aria-label={`Current Cell position: ${partyLocation.title}`} style={{ left: `${partyLocation.mapPosition.x}%`, top: `${partyLocation.mapPosition.y}%` }}><span>⌖</span></span> : <span className="atlas-party-marker-note">CELL POSITION // NOT PUBLISHED</span>}{locations.filter(location => location.mapPosition).map(location => <button className={`atlas-pin ${location.mapPosition!.x > 79 ? 'atlas-pin-right-edge' : ''}`} key={location.id} data-location-id={location.id} aria-label={`View ${location.title}`} aria-pressed={selected?.id === location.id} title={location.title} style={{ left: `${location.mapPosition!.x}%`, top: `${location.mapPosition!.y}%` }} onClick={() => setSelectedId(location.id)}><span className="atlas-pin-dot" aria-hidden="true"/><span className="atlas-pin-label" aria-hidden="true">{mapLabel(location.title)}</span></button>)}</div><div className="atlas-holotable-plinth" aria-hidden="true"><span className="atlas-holotable-support"/><span className="atlas-holotable-support"/></div><span className="atlas-tracked-body" aria-hidden="true">{selected ? `TRACKED BODY // ${mapLabel(selected.title).toUpperCase()}` : 'TRACKED BODIES // NO SIGNAL'}</span></div></section>
<aside className="atlas-quick" aria-labelledby="atlas-quick-title"><article className="atlas-detail atlas-side-dossier">{selected ? <><span className="world-meta">{selected.detailStatus === 'dossier' ? 'Dossier' : 'Map-only'} · {selected.publicationStatus}</span><h2>{selected.title}</h2><p>{selected.publicDescription}</p><p><strong>Access:</strong> {selected.authorityAccess}</p>{selected.consequences?.filter(entry => entry.published).map(entry => <p key={entry.at}><strong>Known consequence:</strong> {entry.detail}</p>)}<section className="atlas-available-actions" aria-label="Location activities"><h3>Available actions</h3><p>No duties or opportunities are currently assigned at this location.</p></section></> : <p>Loading Tavrellis system entries…</p>}</article><p className="eyebrow">Sanctioned command terminal</p><h2 id="atlas-quick-title">Requisition & records</h2>{visibleTerminalControls.filter(control => !['army', 'briefings', 'resources', 'operations'].includes(control.id)).map(control => <button className="atlas-terminal-control" type="button" key={control.id} disabled aria-disabled="true" title={control.note}><strong>{control.label}</strong><span>Terminal integration pending.</span></button>)}</aside>
</main>;
}
