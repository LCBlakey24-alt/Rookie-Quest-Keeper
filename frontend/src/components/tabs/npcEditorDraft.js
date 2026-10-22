// Editing must be lossless: never replace a detailed NPC with a seven-field form.
// This module only selects fields supported by the NPC create/update API.
const STRING_FIELDS = [
  'name', 'description', 'image_url', 'portrait_url', 'race', 'class_name',
  'alignment', 'appearance', 'personality', 'backstory', 'role',
  'location', 'notes', 'speed', 'armor', 'size', 'senses', 'languages',
  'mechanics_status', 'canon_status', 'statblock_source', 'statblock_notes',
];
const LIST_FIELDS = [
  'skills', 'saving_throws', 'damage_resistances', 'damage_immunities',
  'condition_immunities',
];
const ACTION_FIELDS = [
  'attacks', 'abilities', 'actions', 'bonus_actions', 'reactions',
  'legendary_actions', 'special_abilities',
];

export const NPC_STAT_NAMES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
export const NPC_ACTION_FIELDS = ACTION_FIELDS;
export const NPC_LIST_FIELDS = LIST_FIELDS;

export function createNpcDraft(npc = {}) {
  const draft = {};
  STRING_FIELDS.forEach(field => {
    draft[field] = npc[field] ?? '';
  });
  draft.hp = npc.hp ?? 10;
  draft.max_hp = npc.max_hp ?? npc.hp ?? 10;
  draft.ac = npc.ac ?? 10;
  draft.level = npc.level ?? 1;
  draft.proficiency_bonus = npc.proficiency_bonus ?? 2;
  draft.cr = npc.cr ?? '';
  draft.combat_ready = npc.combat_ready !== false;
  draft.dm_only = npc.dm_only !== false;
  // Do not fabricate a set of six ability scores for a narrative NPC.
  draft.stats = npc.stats && typeof npc.stats === 'object' ? { ...npc.stats } : null;
  LIST_FIELDS.forEach(field => {
    draft[field] = Array.isArray(npc[field]) ? [...npc[field]] : [];
  });
  ACTION_FIELDS.forEach(field => {
    draft[field] = Array.isArray(npc[field]) ? npc[field].map(entry => (
      entry && typeof entry === 'object' ? { ...entry } : entry
    )) : [];
  });
  // Preserve nested spell details even when the full spell builder is not open.
  if (npc.spells && typeof npc.spells === 'object') {
    draft.spells = { ...npc.spells };
  }
  return draft;
}

export function prepareNpcSavePayload(draft) {
  const payload = { ...draft };
  LIST_FIELDS.forEach(field => {
    payload[field] = (draft[field] || []).map(item => String(item).trim()).filter(Boolean);
  });
  ACTION_FIELDS.forEach(field => {
    payload[field] = (draft[field] || []).filter(entry => {
      if (typeof entry === 'string') return entry.trim();
      return entry && Object.values(entry).some(value => value !== null && value !== undefined && String(value).trim());
    });
  });
  if (draft.stats && typeof draft.stats === 'object') {
    const incomplete = NPC_STAT_NAMES.filter(key => (
      draft.stats[key] === '' || draft.stats[key] === null ||
      draft.stats[key] === undefined || !Number.isInteger(Number(draft.stats[key])) ||
      Number(draft.stats[key]) < 0
    ));
    if (incomplete.length) {
      throw new Error('Finish all six ability scores before saving, or clear the scores you have entered.');
    }
    payload.stats = Object.fromEntries(NPC_STAT_NAMES.map(key => [key, Number(draft.stats[key])]));
  } else {
    delete payload.stats;
  }
  ['hp', 'max_hp', 'ac', 'level', 'proficiency_bonus'].forEach(field => {
    if (draft[field] === '' || draft[field] === null || draft[field] === undefined) {
      delete payload[field];
    } else {
      payload[field] = Number(draft[field]);
    }
  });
  payload.cr = String(draft.cr ?? '').trim();
  return payload;
}
