import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { campaignApiHandler } from './api-middleware';
import { CampaignService, type ActorContext } from './campaign-service';
import type { CampaignIdentity, CampaignRole } from '../src/types';
import { campaignTestPlayers } from '../test-player-fixtures.mjs';

export interface PreviewPlayerProfile {
  id: string;
  accountKey: string;
  identityId: string;
  characterName: string;
  supportingFactionRecipientId: string;
  supportingFactionName: string;
  createdAt: string;
  updatedAt: string;
}

interface PreviewSnapshot {
  schemaVersion: 1;
  savedAt: string;
  campaign: ReturnType<CampaignService['persistenceSnapshot']>;
  profiles: PreviewPlayerProfile[];
}

const roles: CampaignRole[] = ['owner-gm', 'gm', 'co-gm', 'player', 'display'];
const gmRoles: CampaignRole[] = ['owner-gm', 'gm', 'co-gm'];
const json = (response: ServerResponse, value: unknown, status = 200) => {
  response.statusCode = status;
  // Preview account state can change without a full page reload. Never let a
  // browser cache an onboarding response and accidentally reuse an old,
  // empty, or unauthorised result.
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(value));
};
const fail = (response: ServerResponse, message: string, status = 400) => json(response, { error: message }, status);
const text = (value: unknown, label: string) => {
  const result = typeof value === 'string' ? value.trim() : '';
  if (!result) throw new Error(`${label} is required.`);
  return result;
};
const header = (request: IncomingMessage, name: string) => typeof request.headers[name] === 'string' ? request.headers[name]!.trim() : '';
const readJson = async (request: IncomingMessage) => new Promise<Record<string, unknown>>((resolveBody, reject) => {
  let body = '';
  let bytes = 0;
  request.on('data', (chunk: Buffer) => {
    bytes += chunk.length;
    if (bytes > 64 * 1024) {
      reject(new Error('The preview onboarding request is too large.'));
      request.destroy();
      return;
    }
    body += chunk;
  });
  request.on('end', () => {
    try { resolveBody(body ? JSON.parse(body) as Record<string, unknown> : {}); }
    catch { reject(new Error('The preview request must contain valid JSON.')); }
  });
  request.on('error', reject);
});

/**
 * Creates the in-process campaign authority used by the existing site preview.
 * The snapshot is intentionally local and ignored by Git; it is not a hosted
 * authentication boundary. A later web deployment can replace this adapter.
 */
export async function createHybridCampaignPreviewHost(projectRoot: string, options: { snapshotPath?: string } = {}) {
  process.env.HOSTED_BUILD = 'true';
  process.env.HYBRID_CAMPAIGN_PREVIEW = 'true';
  const snapshotPath = options.snapshotPath ?? resolve(projectRoot, 'HybridCampaign', '.campaign-preview-state.json');
  const service = new CampaignService();
  let profiles: PreviewPlayerProfile[] = [];

  if (existsSync(snapshotPath)) {
    try {
      const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as Partial<PreviewSnapshot>;
      if (snapshot.schemaVersion !== 1 || !snapshot.campaign || !Array.isArray(snapshot.profiles)) throw new Error('unsupported snapshot format');
      service.hydratePersisted(snapshot.campaign);
      profiles = snapshot.profiles.map((profile) => ({ ...profile }));
    } catch (error) {
      console.warn(`Hybrid Campaign preview ignored an invalid snapshot: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
  if (!service.memoryForApi().sources.length) service.seedSources();

  const persist = async () => {
    const snapshot: PreviewSnapshot = {
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      campaign: service.persistenceSnapshot(),
      profiles,
    };
    await mkdir(dirname(snapshotPath), { recursive: true });
    const temp = `${snapshotPath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temp, JSON.stringify(snapshot, null, 2), 'utf8');
    await rename(temp, snapshotPath);
  };

  const fixtureAccountKey = (fixtureId: string) => `preview-test:${fixtureId}`;
  /**
   * These profiles are part of the local preview fixture, not browser state.
   * On an older snapshot, migrate any previous numeric browser binding to the
   * stable fixture key instead of creating a second dummy player.
   */
  const materialiseTestPlayers = () => {
    let changed = false;
    for (const fixture of campaignTestPlayers) {
      const accountKey = fixtureAccountKey(fixture.id);
      if (profiles.some(profile => profile.accountKey === accountKey)) continue;
      const legacyProfile = profiles.find(profile => profile.characterName === fixture.characterName && profile.accountKey.startsWith('preview-account:'));
      if (legacyProfile) {
        legacyProfile.accountKey = accountKey;
        legacyProfile.updatedAt = new Date().toISOString();
        changed = true;
        continue;
      }
      const recipient = service.memoryForApi().state.objectiveOfferRecipients?.find(entry => entry.id === fixture.recipientId && entry.type === 'faction' && entry.active);
      if (!recipient) throw new Error(`The ${fixture.recipientId} test faction is not active in the campaign roster.`);
      let identity = service.memoryForApi().identities.find(entry => entry.name === fixture.characterName && entry.role === 'player');
      if (!identity) {
        identity = { id: randomUUID(), name: fixture.characterName, role: 'player' };
        service.setIdentities([...service.memoryForApi().identities, identity], { role: 'owner-gm', identityId: 'preview-test-fixture' });
      }
      const createdAt = new Date().toISOString();
      profiles = [...profiles, { id: randomUUID(), accountKey, identityId: identity.id, characterName: fixture.characterName, supportingFactionRecipientId: recipient.id, supportingFactionName: fixture.supportingFactionName, createdAt, updatedAt: createdAt }];
      changed = true;
    }
    return changed;
  };
  /**
   * Give every durable local test account a compact, attachment-aware force.
   * These are deliberately fictional preview records: they demonstrate the
   * Army Manager without copying a datasheet or changing a real campaign
   * collection.  They are created through the same service actions as GM
   * entries and persist with the other local preview fixtures.
   */
  const materialiseTestForces = () => {
    let changed = false;
    const actor: ActorContext = { role: 'owner-gm', identityId: 'preview-test-fixture' };
    for (const fixture of campaignTestPlayers) {
      const identity = service.memoryForApi().identities.find(entry => entry.name === fixture.characterName && entry.role === 'player');
      if (!identity) continue;
      let profile = service.memoryForApi().control.forceProfiles.find(entry => entry.ownerIdentityId === identity.id && entry.system === 'warhammer-40000' && entry.displayName === `${fixture.supportingFactionName} Test Force`);
      if (!profile) {
        profile = service.createForceProfile({ ownerIdentityId: identity.id, system: 'warhammer-40000', displayName: `${fixture.supportingFactionName} Test Force`, factionRoute: fixture.supportingFactionName, sourceReference: 'Local preview fixture' }, actor);
        changed = true;
      }
      const unitSpecs = [
        { title: 'Test Line Squad', approximatePoints: 100, unitKind: 'squad' },
        { title: 'Test Squad Leader', approximatePoints: 70, unitKind: 'leader' },
        { title: 'Test Field Attendant', approximatePoints: 45, unitKind: 'attendant' },
        { title: 'Test Support Unit', approximatePoints: 90, unitKind: 'independent' },
      ] as const;
      for (const spec of unitSpecs) if (!service.memoryForApi().control.collectionUnits.some(entry => entry.profileId === profile!.id && entry.title === spec.title)) {
        service.createForceUnit({ profileId: profile.id, title: spec.title, factionRoute: fixture.supportingFactionName, approximatePoints: spec.approximatePoints, sourceReference: 'Local preview fixture', provenance: 'Durable local test fixture', unitKind: spec.unitKind } as any, actor);
        changed = true;
      }
      const collection = service.memoryForApi().control.collectionUnits.filter(entry => entry.profileId === profile!.id);
      const squad = collection.find(entry => entry.title === 'Test Line Squad');
      for (const role of ['leader', 'attendant'] as const) {
        const child = collection.find(entry => entry.unitKind === role);
        if (squad && child && !service.memoryForApi().control.unitAttachments.some(entry => entry.scope === 'permanent' && entry.childUnitId === child.id)) {
          service.setUnitAttachment({ parentUnitId: squad.id, childUnitId: child.id, role, scope: 'permanent' }, actor);
          changed = true;
        }
      }
    }
    return changed;
  };
  const testPlayersChanged = materialiseTestPlayers();
  const testForcesChanged = materialiseTestForces();
  if (testPlayersChanged || testForcesChanged) await persist();

  const actorFor = (request: IncomingMessage): ActorContext => {
    const role = header(request, 'x-preview-campaign-role') as CampaignRole;
    const accountKey = header(request, 'x-preview-campaign-account');
    const suppliedIdentityId = header(request, 'x-preview-campaign-identity');
    if (!roles.includes(role)) throw new Error('Choose a campaign role in the local preview account controls.');
    if (role !== 'player') return { role };
    if (!accountKey) throw new Error('The preview player account is unavailable. Reload the Tavern preview and try again.');
    const profile = profiles.find((entry) => entry.accountKey === accountKey);
    if (!profile) {
      if (suppliedIdentityId) throw new Error('This preview account has not completed campaign onboarding.');
      return { role };
    }
    if (suppliedIdentityId && suppliedIdentityId !== profile.identityId) throw new Error('The requested player identity is not assigned to this preview account.');
    return { role, identityId: profile.identityId };
  };

  const campaignApi = campaignApiHandler(service, persist, actorFor, '/hybrid-campaign/api');
  const onboard = async (request: IncomingMessage, response: ServerResponse) => {
    try {
      const actor = actorFor(request);
      const accountKey = header(request, 'x-preview-campaign-account');
      if (actor.role !== 'player') return fail(response, 'Only a player account may complete player onboarding.', 403);
      if (profiles.some((profile) => profile.accountKey === accountKey)) return fail(response, 'This preview account already has a linked campaign profile.', 409);
      const body = await readJson(request);
      const characterName = text(body.characterName, 'Character name');
      if (characterName.length > 80) return fail(response, 'Character names must be 80 characters or fewer.');
      const recipientId = text(body.supportingFactionRecipientId, 'Supporting faction');
      const supportingFactionName = text(body.supportingFactionName, 'Supporting faction or warband name');
      if (supportingFactionName.length > 120) return fail(response, 'Supporting faction or warband names must be 120 characters or fewer.');
      const recipient = service.memoryForApi().state.objectiveOfferRecipients?.find((entry) => entry.id === recipientId && entry.type === 'faction' && entry.active);
      if (!recipient) return fail(response, 'Choose an active faction from the campaign offer roster.');
      if (service.memoryForApi().identities.some((identity) => identity.name.localeCompare(characterName, undefined, { sensitivity: 'accent' }) === 0)) return fail(response, 'That character name is already in use.');
      const identity: CampaignIdentity = { id: randomUUID(), name: characterName, role: 'player' };
      // The host has already verified the account/profile boundary above. The
      // canonical service retains its GM-only identity mutation rule.
      service.setIdentities([...service.memoryForApi().identities, identity], { role: 'owner-gm', identityId: `preview-account:${accountKey}` });
      const createdAt = new Date().toISOString();
      const profile: PreviewPlayerProfile = {
        id: randomUUID(), accountKey, identityId: identity.id, characterName,
        supportingFactionRecipientId: recipient.id, supportingFactionName,
        createdAt, updatedAt: createdAt,
      };
      profiles = [...profiles, profile];
      await persist();
      return json(response, { profile, identity }, 201);
    } catch (error) {
      return fail(response, error instanceof Error ? error.message : 'The player profile could not be created.');
    }
  };

  return {
    service,
    getProfiles: () => profiles.map((profile) => ({ ...profile })),
    async handle(request: IncomingMessage, response: ServerResponse) {
      const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
      if (pathname === '/hybrid-campaign/api/preview/profile' && request.method === 'GET') {
        try {
          const actor = actorFor(request);
          const accountKey = header(request, 'x-preview-campaign-account');
          const profile = actor.role === 'player' ? profiles.find((entry) => entry.accountKey === accountKey) : undefined;
          return json(response, { profile: profile ? { ...profile } : null });
        } catch (error) { return fail(response, error instanceof Error ? error.message : 'The preview profile is unavailable.', 403); }
      }
      if (pathname === '/hybrid-campaign/api/preview/onboarding-options' && request.method === 'GET') {
        try {
          const actor = actorFor(request);
          if (actor.role !== 'player') return fail(response, 'Only a player account may read onboarding options.', 403);
          const factions = (service.memoryForApi().state.objectiveOfferRecipients ?? [])
            .filter((entry) => entry.type === 'faction' && entry.active)
            .map((entry) => ({ id: entry.id, name: entry.name }));
          return json(response, { factions });
        } catch (error) { return fail(response, error instanceof Error ? error.message : 'Onboarding options are unavailable.', 403); }
      }
      if (pathname === '/hybrid-campaign/api/preview/onboarding' && request.method === 'POST') return onboard(request, response);
      return campaignApi(request, response);
    },
  };
}
