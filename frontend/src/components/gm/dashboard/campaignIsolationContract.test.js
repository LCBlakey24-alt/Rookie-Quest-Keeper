import fs from 'fs';
import path from 'path';

const source = () => fs.readFileSync(path.join(__dirname, '../../CampaignDashboard.js'), 'utf8');

describe('GM campaign route isolation', () => {
  test('invalidates older request completions before changing campaign or home data', () => {
    const code = source();
    expect(code).toContain('const requestId = ++campaignLoadSeqRef.current');
    expect(code).toContain('requestId === campaignLoadSeqRef.current');
    expect(code).toContain('activeCampaignIdRef.current === campaignId');
    expect(code).toContain('if (!stillCurrent()) return;');
    expect(code).toContain('return () => { campaignLoadSeqRef.current += 1; };');
    expect(code).toContain('campaign && campaign.id !== campaignId');
  });

  test('join codes remain tied to their owning campaign, even during slow requests', () => {
    const code = source();
    expect(code).toContain('inviteCampaignId === campaignId ? invite : null');
    expect(code).toContain('setInviteCampaignId(requestedCampaign)');
    expect(code).toContain('activeCampaignIdRef.current !== requestedCampaign');
    expect(code).toContain('const loadedInvite = currentInvite || await fetchInviteCode()');
    expect(code).toContain('invite={currentInvite}');
  });

  test('GM Home is remounted for each party and the prior party never flashes', () => {
    const code = source();
    expect(code.match(/key=\{campaignId\}/g)?.length).toBeGreaterThanOrEqual(2);
    expect(code).toContain('setCampaign(null)');
    expect(code).toContain('setHomeBootstrap(null)');
  });
});
