import { createPreviewApi } from './previewApi';
import { PREVIEW_CAMPAIGN_ID as campaignId } from './previewSeed';
import { PREVIEW_STORAGE_KEY, PREVIEW_USER } from './previewMode';

function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
}

test('opens with sample characters and filters GM data from the player campaign', () => {
  const api = createPreviewApi(memoryStorage());
  expect(api.request('get', '/characters')).toHaveLength(2);
  const campaign = api.request('get', `/player/campaign/${campaignId}`);
  expect(campaign.name).toBe('Preview campaign');
  expect(campaign.party).toHaveLength(2);
  expect(campaign.world_setting_notes).toBeUndefined();
  expect(campaign.party[0].spell_slots).toBeUndefined();
});

test('character HP and spell slots survive a reload, including zero values', () => {
  const storage = memoryStorage();
  const api = createPreviewApi(storage);
  api.request('patch', '/characters/demo-wizard-1', { current_hit_points: 0, spell_slots_remaining: { 1: 0 } });
  const reloaded = createPreviewApi(storage).request('get', '/characters/demo-wizard-1');
  expect(reloaded.current_hit_points).toBe(0);
  expect(reloaded.spell_slots_remaining).toEqual({ 1: 0 });
  expect(reloaded.name).toBe('Demo Wizard');
});

test('a GM timeline event is visible to the player and can be deleted', () => {
  const api = createPreviewApi(memoryStorage());
  const event = api.request('post', `/campaigns/${campaignId}/timeline`, { title: 'New event', type: 'major', session_number: '', in_game_date: 'Day 2' });
  expect(api.request('get', '/player/timeline')).toEqual(expect.arrayContaining([expect.objectContaining({ id: event.id, in_game_date: 'Day 2', type: 'major' })]));
  api.request('delete', `/campaigns/${campaignId}/timeline/${event.id}`);
  expect(api.request('get', '/player/timeline').some(item => item.id === event.id)).toBe(false);
});

test('new handouts stay private until shared, then read and saved state persists', () => {
  const storage = memoryStorage();
  const api = createPreviewApi(storage);
  const handout = api.request('post', `/campaigns/${campaignId}/handouts`, { title: 'Shared clue', content: 'Sample clue' });
  expect(api.request('get', '/player/handouts').some(item => item.id === handout.id)).toBe(false);
  api.request('post', `/campaigns/${campaignId}/handouts/${handout.id}/share`, { recipients: [PREVIEW_USER] });
  api.request('patch', `/player/handouts/${handout.id}/read`);
  api.request('patch', `/player/handouts/${handout.id}/saved`, { saved: true });
  expect(createPreviewApi(storage).request('get', '/player/handouts')).toEqual(expect.arrayContaining([expect.objectContaining({ title: 'Shared clue', read: true, saved: true })]));
});

test('notes can be created, edited and deleted after reloading the workspace', () => {
  const storage = memoryStorage();
  const api = createPreviewApi(storage);
  const note = api.request('post', '/player/notes', { title: 'My note', content: 'First draft', campaign_id: campaignId });
  api.request('put', `/player/notes/${note.id}`, { content: 'Edited draft' });
  const reloaded = createPreviewApi(storage);
  expect(reloaded.request('get', '/player/notes')).toEqual(expect.arrayContaining([expect.objectContaining({ id: note.id, content: 'Edited draft', campaign_id: campaignId })]));
  reloaded.request('delete', `/player/notes/${note.id}`);
  expect(reloaded.request('get', '/player/notes').some(item => item.id === note.id)).toBe(false);
});

test('unknown online actions fail rather than claiming a save', () => {
  const storage = memoryStorage();
  const api = createPreviewApi(storage);
  expect(() => api.request('post', '/rook/chat', { message: 'Hi' })).toThrow('not connected');
  expect(storage.getItem(PREVIEW_STORAGE_KEY)).toBeNull();
});

test('failed browser storage rolls back the edit', () => {
  const api = createPreviewApi({ getItem: () => null, setItem: () => { throw new Error('quota'); } });
  expect(() => api.request('patch', '/characters/demo-fighter-1', { current_hit_points: 0 })).toThrow('could not save');
  expect(api.request('get', '/characters/demo-fighter-1').current_hit_points).toBe(12);
});

test('deleting a campaign unlinks characters without deleting their sheets', () => {
  const api = createPreviewApi(memoryStorage());
  api.request('delete', `/campaigns/${campaignId}`);
  expect(api.request('get', '/campaigns')).toEqual([]);
  expect(api.request('get', '/characters')).toHaveLength(2);
  expect(api.request('get', '/characters/demo-fighter-1').campaign_id).toBeNull();
});

test('a newly created character can join using the preview campaign code', () => {
  const api = createPreviewApi(memoryStorage());
  const character = api.request('post', '/characters', { name: 'New preview hero' });
  const { join_code } = api.request('get', `/campaign-invites/${campaignId}`);
  expect(join_code).toHaveLength(6);
  api.request('post', '/campaign-invites/join', { character_id: character.id, join_code });
  expect(api.request('get', `/characters/${character.id}`).campaign_id).toBe(campaignId);
});
