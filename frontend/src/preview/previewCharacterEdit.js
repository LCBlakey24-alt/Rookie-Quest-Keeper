const SAFE_BUILDER_EDIT_FIELDS = new Set([
  'name',
  'race',
  'subrace',
  'background',
  'alignment',
  'portrait_url',
  'personality_trait',
  'personality_traits',
  'ideal',
  'ideals',
  'bond',
  'bonds',
  'flaw',
  'flaws',
  'backstory',
  'appearance',
  'notes',
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
  'saving_throw_proficiencies',
  'skill_proficiencies',
  'weapon_proficiencies',
  'armor_proficiencies',
  'armour_proficiencies',
  'tool_proficiencies',
  'languages',
  'racial_traits',
]);

const LEVEL_ONE_BUILD_FIELDS = new Set([
  'character_class',
  'subclass',
  'edition',
  'rules_edition',
  'ruleset_id',
  'fighting_style',
  'class_features',
  'feats',
  'spellcasting_ability',
  'spell_save_dc',
  'spell_attack_bonus',
  'spell_slots',
  'spells_known',
  'spells_prepared',
  'cantrips_known',
  'spellbook',
]);

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

function savedClassCount(character = {}) {
  const map = character.class_levels || character.multiclass_levels || {};
  if (map && typeof map === 'object' && !Array.isArray(map)) {
    const count = Object.values(map).filter((level) => toNumber(level, 0) > 0).length;
    if (count) return count;
  }

  if (Array.isArray(character.classes)) {
    const count = character.classes.filter((entry) => entry && toNumber(entry.level, 0) > 0).length;
    if (count) return count;
  }
  return character.character_class ? 1 : 0;
}

export function isPreviewFullBuilderEdit(payload = {}) {
  return String(payload.creation_mode || '').trim().toLowerCase() === 'full';
}

export function stateSafePreviewBuilderEdit(existing = {}, payload = {}) {
  const fields = new Set(SAFE_BUILDER_EDIT_FIELDS);
  const level = Math.max(1, toNumber(existing.level, 1));
  if (level === 1 && savedClassCount(existing) <= 1) {
    LEVEL_ONE_BUILD_FIELDS.forEach((field) => fields.add(field));
  }

  return Object.fromEntries(Object.entries(payload || {})
    .filter(([field, value]) => fields.has(field) && value !== undefined && value !== null));
}
