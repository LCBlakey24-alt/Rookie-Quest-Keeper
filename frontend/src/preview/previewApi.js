import { createPreviewSeed } from './previewSeed';
import { PREVIEW_STORAGE_KEY, PREVIEW_USER } from './previewMode';

const copy = value => JSON.parse(JSON.stringify(value));
const COLLECTIONS = new Set(['timeline', 'handouts', 'ingame-notes', 'quests', 'story-arcs', 'npcs', 'locations', 'maps', 'calendar-events', 'combat-scenarios', 'encounters', 'factions', 'roll-tables', 'loot-tables', 'treasury-transactions', 'session-recaps']);
const OBJECTS = new Set(['calendar', 'live-state', 'player-display', 'environment', 'settings', 'treasury', 'combat']);

function fail(message, status = 501) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function publicCampaign(campaign) {
  const { id, name, description, system, rules_edition, world_name, environment } = campaign;
  return { id, name, description, system, rules_edition, world_name, environment };
}

export function createPreviewApi(storage = typeof localStorage === 'undefined' ? null : localStorage) {
  let state;
  try {
    const saved = JSON.parse(storage?.getItem(PREVIEW_STORAGE_KEY) || 'null');
    if (saved?.version === 1 && Array.isArray(saved.campaigns) && Array.isArray(saved.characters)
      && saved.collections && saved.objects && saved.receipts && Array.isArray(saved.notes) && Array.isArray(saved.recaps) && Array.isArray(saved.homebrew)) state = saved;
  } catch { /* Start with sample data when browser storage is unavailable. */ }
  if (!state) state = createPreviewSeed();

  const findCampaign = id => state.campaigns.find(item => item.id === id) || fail('Preview campaign not found.', 404);
  const party = id => state.characters.filter(character => character.campaign_id === id);
  const records = (id, collection) => {
    findCampaign(id);
    if (!Object.hasOwn(state.collections, id)) state.collections[id] = {};
    if (!Object.hasOwn(state.collections[id], collection)) state.collections[id][collection] = [];
    return state.collections[id][collection];
  };
  const recipients = id => party(id).length ? [{ username: PREVIEW_USER, display_name: PREVIEW_USER, character_name: party(id)[0].name }] : [];

  function crud(list, method, id, body, defaults = {}) {
    if (method === 'get' && !id) return list;
    const index = list.findIndex(item => item.id === id);
    if (method === 'post' && !id) {
      const now = new Date().toISOString();
      const record = { ...defaults, ...body, id: `preview-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`, created_at: now, updated_at: now };
      list.unshift(record);
      return record;
    }
    if (index < 0) fail('Preview record not found.', 404);
    if (method === 'get') return list[index];
    if (method === 'patch' || method === 'put') {
      list[index] = { ...list[index], ...body, id, updated_at: new Date().toISOString() };
      return list[index];
    }
    if (method === 'delete') { list.splice(index, 1); return { message: 'Deleted from the preview.' }; }
    fail('This action is not available in the local preview.');
  }

  function dispatch(method, path, body) {
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    if (parts.some(part => ['__proto__', 'prototype', 'constructor'].includes(part))) fail('Invalid preview path.', 400);
    if (method === 'get' && path === '/auth/me') return { username: PREVIEW_USER, is_admin: false };
    if (method === 'get' && path === '/admin/check') return { is_admin: false };
    if (method === 'get' && path === '/health') return { status: 'local-preview' };
    if (method === 'get' && path === '/site-settings') return { campaign_creation_enabled: true, character_creation_enabled: true, uploads_enabled: false, rook_text_enabled: false, feedback_enabled: false };
    if (method === 'get' && path === '/rule-systems') return [{ id: 'dnd5e_2014', name: 'D&D 5e', short_code: 'dnd5e_2014' }];
    if (method === 'get' && path.startsWith('/player/rules/')) return { races: [], classes: [], subclasses: [], backgrounds: [], feats: [], spells: [], sources: [] };
    if (method === 'get' && ['/updates', '/updates/global', '/uploads', '/custom-rulesets', '/rulesets', '/notifications'].includes(path)) return [];
    if (method === 'get' && path === '/homebrew') return state.homebrew;

    if (parts[0] === 'characters' && parts.length <= 2) {
      if (method === 'post' && !String(body.name || '').trim()) fail('Give the character a name.', 400);
      return crud(state.characters, method, parts[1], body, { user_id: PREVIEW_USER });
    }
    if (parts[0] === 'campaigns' && parts.length <= 2) {
      if (method === 'post' && !String(body.name || '').trim()) fail('Give the campaign a name.', 400);
      const result = crud(state.campaigns, method, parts[1], body, { dm_user_id: PREVIEW_USER, rules_edition: '2014', environment: {}, join_code: `PV${Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0')}` });
      if (method === 'delete') {
        state.characters.forEach(character => { if (character.campaign_id === parts[1]) { character.campaign_id = null; character.campaign_name = ''; } });
        delete state.collections[parts[1]];
      }
      return result;
    }
    if (path === '/campaign-invites/join' && method === 'post') {
      const campaign = state.campaigns.find(item => item.join_code === String(body.join_code || '').trim().toUpperCase());
      const character = state.characters.find(item => item.id === body.character_id);
      if (!campaign || !character) fail('Choose a preview character and use a join code from a preview campaign.', 400);
      Object.assign(character, { campaign_id: campaign.id, campaign_name: campaign.name, campaign_join_status: 'active' });
      return { campaign: publicCampaign(campaign), character };
    }
    if (path === '/campaign-invites/joined/list' && method === 'get') {
      return state.campaigns.filter(campaign => party(campaign.id).length).map(campaign => ({ ...publicCampaign(campaign), member_role: 'player' }));
    }
    if (parts[0] === 'campaign-invites' && parts.length === 3 && parts[2] === 'members' && method === 'get') {
      findCampaign(parts[1]);
      return party(parts[1]).map(character => ({ id: character.id, character_id: character.id, character_name: character.name, character_level: character.level, character_class: character.character_class, username: PREVIEW_USER, status: character.campaign_join_status || 'active' }));
    }
    if (parts[0] === 'campaign-invites' && parts.length === 2 && method === 'get') {
      const campaign = findCampaign(parts[1]);
      return { campaign_id: parts[1], join_code: campaign.join_code };
    }
    if (parts[0] === 'player' && parts[1] === 'campaign' && parts.length === 3 && method === 'get') {
      return { ...publicCampaign(findCampaign(parts[2])), party: party(parts[2]).map(({ id, name, character_class, level }) => ({ id, name, character_class, level })) };
    }
    if (path === '/player/timeline' && method === 'get') return state.campaigns.flatMap(campaign => records(campaign.id, 'timeline'));
    if (path === '/player/session-recaps' && method === 'get') return state.recaps;
    if (parts[0] === 'player' && parts[1] === 'notes' && parts.length <= 3) {
      return crud(state.notes, method, parts[2], body, { user_id: PREVIEW_USER, campaign_name: state.campaigns.find(c => c.id === body.campaign_id)?.name || '' });
    }
    if (path === '/player/handouts' && method === 'get') {
      return state.campaigns.flatMap(campaign => records(campaign.id, 'handouts').filter(handout => handout.shared_with?.includes(PREVIEW_USER))
        .map(handout => ({ ...handout, handout_id: handout.id, read: false, saved: false, ...(state.receipts[handout.id] || {}) })));
    }
    if (parts[0] === 'player' && parts[1] === 'handouts' && parts.length === 4) {
      const handout = state.campaigns.flatMap(c => records(c.id, 'handouts')).find(item => item.id === parts[2] && item.shared_with?.includes(PREVIEW_USER));
      if (!handout) fail('Handout not found in the preview.', 404);
      if (method === 'get' && parts[3] === 'share-options') return { recipients: [] };
      if (method === 'patch' && ['read', 'saved'].includes(parts[3])) {
        state.receipts[handout.id] = { ...state.receipts[handout.id], [parts[3]]: parts[3] === 'read' ? true : Boolean(body.saved) };
        return state.receipts[handout.id];
      }
    }
    if (parts[0] === 'campaigns' && parts.length >= 3) {
      const [, campaignId, resource, id, action] = parts;
      const campaign = findCampaign(campaignId);
      if (method === 'get' && ['players', 'live-party'].includes(resource) && !id) return party(campaignId).map(character => ({
        ...character, character_id: character.id, character_name: character.name, source: 'character',
        current_hp: character.current_hit_points, max_hp: character.max_hit_points, hp: character.current_hit_points,
        stats: { strength: character.strength, dexterity: character.dexterity, constitution: character.constitution, intelligence: character.intelligence, wisdom: character.wisdom, charisma: character.charisma },
      }));
      if (method === 'get' && resource === 'handout-recipients' && !id) return { recipients: recipients(campaignId) };
      if (method === 'get' && resource === 'combat-initiative' && id === 'mine') return { combat_active: false };
      if (OBJECTS.has(resource) && !id) {
        const key = `${campaignId}/${resource}`;
        if (method === 'get') return state.objects[key] || (resource === 'environment' ? campaign.environment : resource === 'calendar' || resource === 'combat' ? null : {});
        if (method === 'put' || method === 'patch') {
          state.objects[key] = { ...state.objects[key], ...body };
          if (resource === 'environment') campaign.environment = state.objects[key];
          return state.objects[key];
        }
      }
      if (resource === 'handouts' && id && action === 'share' && parts.length === 5 && method === 'post') {
        const handout = records(campaignId, 'handouts').find(item => item.id === id);
        if (!handout) fail('Handout not found in the preview.', 404);
        handout.shared_with = [PREVIEW_USER];
        handout.delivery_count = 1;
        return { message: 'Shared with the preview player.', shared_count: 1 };
      }
      if (COLLECTIONS.has(resource) && parts.length <= 4) {
        let payload = body;
        if (resource === 'timeline' && method === 'post') {
          if (!String(body.title || '').trim()) fail('Add a timeline title first.', 400);
          payload = { ...body, title: body.title.trim(), type: body.type || body.event_type || 'session', event_type: body.type || body.event_type || 'session', session_number: Number(body.session_number) || 0, timestamp: new Date().toISOString() };
        }
        const result = crud(records(campaignId, resource), method, id, payload, { campaign_id: campaignId });
        return resource === 'timeline' && method === 'get' && !id ? { events: result } : result;
      }
    }
    fail('This online feature is not connected in the local preview. Campaigns, character sheets, notes, handouts and timeline editing are available.');
  }

  return {
    request(method, url, body = {}) {
      const verb = String(method || 'get').toLowerCase();
      const path = new URL(url, 'https://preview.invalid').pathname.replace(/^\/api(?=\/|$)/, '').replace(/\/$/, '') || '/';
      const before = verb === 'get' ? null : copy(state);
      try {
        const result = dispatch(verb, path, body);
        if (verb !== 'get' && storage) {
          try { storage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(state)); }
          catch { fail('This browser could not save your preview change. Free some storage and try again.', 507); }
        }
        return copy(result);
      } catch (error) {
        if (before) state = before;
        throw error;
      }
    },
  };
}

let instance;
export function previewRequest(method, url, body) {
  if (!instance) instance = createPreviewApi();
  return instance.request(method, url, body);
}
