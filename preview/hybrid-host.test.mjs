import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const hostModule = await import('../HybridCampaign/server/preview-host.ts');
const { createHybridCampaignPreviewHost } = hostModule.default ?? hostModule;

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const listen = host => new Promise((resolve, reject) => {
  const server = http.createServer((request, response) => host.handle(request, response));
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve(server));
});
const close = server => new Promise(resolve => server.close(resolve));
const headers = (role, account = 'preview-account:test') => ({
  'X-Preview-Campaign-Role': role,
  'X-Preview-Campaign-Account': account,
});

test('Hybrid Campaign onboarding is account-bound, player-safe, and persistent', async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'hybrid-campaign-preview-'));
  const snapshotPath = path.join(temp, 'state.json');
  let server;
  try {
    const host = await createHybridCampaignPreviewHost(projectRoot, { snapshotPath });
    server = await listen(host);
    const port = server.address().port;
    const call = (route, init = {}) => fetch(`http://127.0.0.1:${port}${route}`, init);
    const player = headers('player', 'preview-account:player-one');
    const optionsResponse = await call('/hybrid-campaign/api/preview/onboarding-options', { headers: player });
    assert.equal(optionsResponse.status, 200);
    assert.match(optionsResponse.headers.get('content-type') ?? '', /^application\/json/);
    assert.equal(optionsResponse.headers.get('cache-control'), 'no-store');
    const options = await optionsResponse.json();
    assert.ok(options.factions.length > 0);
    const seededProfiles = host.getProfiles();
    assert.equal(seededProfiles.length, 5);
    assert.deepEqual(seededProfiles.map(profile => profile.supportingFactionRecipientId).sort(), ['adeptus-astartes', 'adeptus-mechanicus', 'agents-imperium', 'astra-militarum', 'grey-knights']);
    const testArmyResponse = await call('/hybrid-campaign/api/campaign/army', { headers: headers('player', 'preview-test:test-adeptus-astartes') });
    assert.equal(testArmyResponse.status, 200);
    const testArmy = await testArmyResponse.json();
    assert.equal(testArmy.profiles.length, 1, 'a test player sees only its own force profile');
    assert.equal(testArmy.units.length, 4, 'the durable preview force includes a squad, two attachments, and a support unit');
    assert.equal(testArmy.attachments.length, 2, 'the leader and attendant are permanently attached to the test squad');

    const onboarding = await call('/hybrid-campaign/api/preview/onboarding', {
      method: 'POST',
      headers: { ...player, 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterName: 'Integration Player', supportingFactionRecipientId: options.factions[0].id, supportingFactionName: 'Verification Cohort' }),
    });
    assert.equal(onboarding.status, 201);
    const created = await onboarding.json();
    assert.equal(created.identity.role, 'player');

    const profileResponse = await call('/hybrid-campaign/api/preview/profile', { headers: player });
    assert.equal(profileResponse.status, 200);
    assert.equal((await profileResponse.json()).profile.identityId, created.identity.id);

    const projectionResponse = await call('/hybrid-campaign/api/campaign/projection', { headers: player });
    const projection = await projectionResponse.json();
    assert.equal(projection.role, 'player');
    assert.equal('worldLocations' in projection.control, false);
    assert.equal('objectiveOfferRecipients' in projection.market, false);

    const worldResponse = await call('/hybrid-campaign/api/campaign/world', { headers: player });
    const world = await worldResponse.json();
    assert.deepEqual(world.currentDate, { year: 412, era: 'M42', month: 7, day: 5, imperialOrigin: '5 512 412.M42' });
    assert.equal(world.playerName, 'Integration Player');
    assert.equal(world.indexOperating, false, 'the Index terminal is absent when no active visit is operating');
    assert.equal(world.partyLocationId, undefined, 'the Atlas does not invent a party position without a completed public journey');
    assert.equal(world.locations.length, 16, 'the player Atlas retains all sixteen published system bodies');
    const eonope = world.locations.find(location => location.id === 'location-eonope');
    assert.deepEqual(eonope.mapPosition, { x: 70.5, y: 13.5 });
    assert.equal('gmSecrets' in eonope, false);
    assert.equal('sourceReferences' in eonope, false);
    assert.equal('contacts' in eonope, false);
    assert.equal(world.pressures.every(pressure => 'gmNotes' in pressure === false), true);

    const forged = await call('/hybrid-campaign/api/campaign/projection', { headers: { 'X-Trusted-Local-Role': 'owner-gm' } });
    assert.equal(forged.status, 400);
    await close(server); server = undefined;

    const restarted = await createHybridCampaignPreviewHost(projectRoot, { snapshotPath });
    assert.equal(restarted.getProfiles().length, 6);
    assert.equal(restarted.getProfiles().filter(profile => profile.accountKey.startsWith('preview-test:')).length, 5);
    server = await listen(restarted);
    const restartedPort = server.address().port;
    const persisted = await fetch(`http://127.0.0.1:${restartedPort}/hybrid-campaign/api/preview/profile`, { headers: player });
    assert.equal(persisted.status, 200);
    assert.equal((await persisted.json()).profile.identityId, created.identity.id);
  } finally {
    if (server) await close(server);
    await rm(temp, { recursive: true, force: true });
  }
});
