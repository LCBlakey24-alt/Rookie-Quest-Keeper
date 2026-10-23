import fs from 'fs';
import path from 'path';

test('live GM encounter launch uses the registered combat route and keeps chosen scenario', () => {
  const live = fs.readFileSync(path.resolve(__dirname, './LiveSessionGridPage.js'), 'utf8');
  const router = fs.readFileSync(path.resolve(__dirname, '../../App.js'), 'utf8');
  expect(router).toContain('path="/combat/:campaignId"');
  expect(live).toContain('navigate(`/combat/${campaignId}`, { state: { scenario, campaignName: campaign?.name } })');
  expect(live).not.toContain('navigate(`/campaign/${campaignId}/combat`');
});
