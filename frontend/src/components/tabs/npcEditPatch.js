// Update only the fields a GM actually changed, so a quick lore edit never
// rewrites unrelated combat statistics, spell metadata, or campaign history.
const PATCH_FIELDS = [
  'name', 'image_url', 'portrait_url', 'combat_ready', 'race', 'class_name',
  'level', 'alignment', 'description', 'appearance', 'personality', 'backstory',
  'role', 'hp', 'max_hp', 'ac', 'speed', 'proficiency_bonus', 'stats',
  'saving_throws', 'skills', 'attacks', 'abilities', 'spells', 'location',
  'notes', 'color', 'cr', 'armor', 'size', 'actions', 'bonus_actions',
  'reactions', 'legendary_actions', 'special_abilities', 'damage_resistances',
  'damage_immunities', 'condition_immunities', 'senses', 'languages',
  'mechanics_status', 'canon_status', 'statblock_source', 'statblock_notes',
  'dm_only',
];

export function changedNpcFields(original = {}, edited = {}) {
  const changes = {};
  for (const field of PATCH_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(edited, field)) continue;
    if (edited[field] === undefined) continue;
    if (JSON.stringify(edited[field]) !== JSON.stringify(original[field])) {
      changes[field] = edited[field];
    }
  }
  return changes;
}

export function normaliseNpcPatch(patch = {}) {
  const next = { ...patch };
  for (const name of ['hp', 'ac']) {
    if (next[name] !== undefined && next[name] !== null && next[name] !== '') {
      const numeric = Number(next[name]);
      if (Number.isFinite(numeric)) next[name] = numeric;
      else delete next[name];
    }
  }
  return next;
}
