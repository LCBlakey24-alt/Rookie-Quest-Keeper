import { previewAdapter } from './previewTransport';

beforeEach(() => {
  localStorage.clear();
});

test('preview player quest feed exposes the shared quest without GM-only fields', async () => {
  const response = await previewAdapter({
    method: 'get',
    url: '/player/campaign/preview-campaign/quests',
  });

  expect(response.data).toHaveLength(1);
  expect(response.data[0]).toMatchObject({
    id: 'preview-shared-quest',
    title: 'Find the missing courier',
    status: 'active',
  });
  expect(response.data[0].objectives).toEqual(expect.arrayContaining([
    expect.objectContaining({ title: 'Follow the tracks beyond the bridge', optional: false }),
  ]));

  const serialized = JSON.stringify(response.data);
  expect(serialized).not.toContain('Secret preview GM note');
  expect(serialized).not.toContain('preview-secret-encounter');
  expect(serialized).not.toContain('preview-secret-reward');
  expect(serialized).not.toContain('GM-only clue timing');
  expect(serialized).not.toContain('linked_encounter_id');
  expect(serialized).not.toContain('gm_notes');
});
