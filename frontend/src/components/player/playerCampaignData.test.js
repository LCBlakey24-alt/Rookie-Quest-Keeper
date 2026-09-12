import { fetchPlayerCampaign, fetchPlayerCampaignSections } from './playerCampaignData';

const campaign = { id: 'c1', name: 'The table', world_setting_notes: 'GM secret', environment: { weather: 'Rain', gm_notes: 'Secret' }, party: [{ id: 'p1', name: 'Hero', user_id: 'private', notes: 'private' }] };

test('uses the player endpoint and only exposes public campaign and party fields', async () => {
  const client = { get: jest.fn().mockResolvedValue({ data: campaign }) };
  const result = await fetchPlayerCampaign(client, 'c1');
  expect(client.get).toHaveBeenCalledTimes(1);
  expect(client.get).toHaveBeenCalledWith('/player/campaign/c1');
  expect(result.campaign.name).toBe('The table');
  expect(result.campaign.environment).toEqual({ weather: 'Rain' });
  expect(JSON.stringify(result)).not.toMatch(/secret|private/i);
});

test('an older backend falls back only to the joined campaign list', async () => {
  const client = { get: jest.fn().mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValueOnce({ data: [campaign] }) };
  const result = await fetchPlayerCampaign(client, 'c1');
  expect(client.get.mock.calls.map(call => call[0])).toEqual(['/player/campaign/c1', '/campaign-invites/joined/list']);
  expect(result.party).toBeNull();
  expect(result.campaign.name).toBe('The table');
});

test.each([401, 403, 500, undefined])('does not mask a %s failure with a different endpoint', async status => {
  const client = { get: jest.fn().mockRejectedValue(status ? { response: { status } } : new Error('offline')) };
  await expect(fetchPlayerCampaign(client, 'c1')).rejects.toBeDefined();
  expect(client.get).toHaveBeenCalledTimes(1);
});

test('a failed campaign request does not hide successfully loaded own characters', async () => {
  const client = { get: jest.fn(path => path === '/characters'
    ? Promise.resolve({ data: [{ id: 'mine', campaign_id: 'c1' }, { id: 'other', campaign_id: 'c2' }] })
    : Promise.reject(new Error('offline'))) };
  const result = await fetchPlayerCampaignSections(client, 'c1');
  expect(result.characters).toEqual([{ id: 'mine', campaign_id: 'c1' }]);
  expect(result.campaign).toBeNull();
  expect(result.failures).toContain('campaign details');
});

test.each([{ ...campaign, id: 'c2' }, { ...campaign, party: {} }])('rejects an unconfirmed campaign response', async data => {
  await expect(fetchPlayerCampaign({ get: async () => ({ data }) }, 'c1')).rejects.toThrow();
});
