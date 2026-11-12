const ABILITY_LABELS = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
};

const toArray = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const hasItems = (value) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
const normalizeName = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const abilityMod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);

const ABILITY_ALIASES = {
  str: 'strength', strength: 'strength',
  dex: 'dexterity', dexterity: 'dexterity',
  con: 'constitution', constitution: 'constitution',
  int: 'intelligence', intelligence: 'intelligence',
  wis: 'wisdom', wisdom: 'wisdom',
  cha: 'charisma', charisma: 'charisma',
};

/** 'INT', 'int' or 'Intelligence' -> 'intelligence'; anything else -> ''. */
export function normaliseSpellcastingAbility(value = '') {
  return ABILITY_ALIASES[String(value || '').trim().toLowerCase()] || '';
}

const abilityScore = (character = {}, ability = '') => {
  const short = Object.keys(ABILITY_ALIASES).find((key) => key.length === 3 && ABILITY_ALIASES[key] === ability);
  return character?.[ability] ?? character?.stats?.[ability] ?? character?.[short] ?? character?.stats?.[short];
};

/**
 * Spell save DC and attack bonus for a custom (homebrew) caster, from the
 * character's current ability score and proficiency bonus, so they follow
 * level-ups and ability increases. The values saved at creation are only a
 * fallback when no spellcasting ability is known.
 */
export function customCasterNumbers(character = {}, proficiencyBonus = 2) {
  const ability = normaliseSpellcastingAbility(character?.spellcasting_ability);
  const proficiency = Number(proficiencyBonus) || 2;
  if (ability) {
    const modifier = abilityMod(abilityScore(character, ability));
    return { ability, modifier, saveDc: 8 + proficiency + modifier, attackBonus: proficiency + modifier };
  }
  const savedSaveDc = Number(character?.spell_save_dc);
  const savedAttack = character?.spell_attack_bonus;
  const savedAttackBonus = savedAttack === null || savedAttack === undefined || savedAttack === '' ? NaN : Number(savedAttack);
  const saveDc = Number.isFinite(savedSaveDc) && savedSaveDc > 0 ? savedSaveDc : null;
  const attackBonus = saveDc !== null && Number.isFinite(savedAttackBonus) ? savedAttackBonus : null;
  return { ability: '', modifier: attackBonus === null ? 0 : attackBonus - proficiency, saveDc, attackBonus };
}

export function hasSavedCustomSpellcasting(character = {}) {
  return Boolean(
    character?.spellcasting_ability
    || hasItems(character?.spell_slots)
    || hasItems(character?.spell_slots_remaining)
    || toArray(character?.cantrips_known || character?.cantrips).length
    || toArray(character?.spells_known || character?.known_spells).length
    || toArray(character?.spells_prepared || character?.prepared_spells).length
    || toArray(character?.spellbook).length
  );
}

export function inferSavedSpellListMode(character = {}) {
  if (toArray(character?.spellbook).length) return 'spellbook';
  if (toArray(character?.spells_prepared || character?.prepared_spells).length) return 'prepared';
  return 'known';
}

export function buildSavedCustomCasterRow(character = {}, className = '', level = 1, proficiencyBonus = 2) {
  if (!className || !hasSavedCustomSpellcasting(character)) return null;

  const primaryClass = character?.character_class || character?.class_name || '';
  if (primaryClass && normalizeName(primaryClass) !== normalizeName(className)) return null;

  const { ability, saveDc, attackBonus } = customCasterNumbers(character, proficiencyBonus);
  const listMode = inferSavedSpellListMode(character);
  const labels = {
    known: 'Known spells',
    prepared: 'Prepared spells',
    spellbook: 'Spellbook',
  };
  const listLabel = labels[listMode] || 'Spells';

  return {
    className,
    level: Number(level) || Number(character?.level) || 1,
    ability,
    abilityLabel: ABILITY_LABELS[ability] || ability || '—',
    saveDc,
    attackBonus,
    listMode,
    listLabel,
    preparedCapacity: 0,
    castingType: `Homebrew · ${listLabel}`,
    homebrew: true,
  };
}
