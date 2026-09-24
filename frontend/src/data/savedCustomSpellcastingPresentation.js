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

  const ability = String(character?.spellcasting_ability || '').trim().toLowerCase();
  const modifier = ability ? abilityMod(character?.[ability]) : 0;
  const savedSaveDc = Number(character?.spell_save_dc);
  const savedAttackBonus = Number(character?.spell_attack_bonus);
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
    saveDc: Number.isFinite(savedSaveDc) && savedSaveDc > 0
      ? savedSaveDc
      : ability ? 8 + Number(proficiencyBonus || 2) + modifier : null,
    attackBonus: Number.isFinite(savedAttackBonus)
      ? savedAttackBonus
      : ability ? Number(proficiencyBonus || 2) + modifier : null,
    listMode,
    listLabel,
    preparedCapacity: 0,
    castingType: `Homebrew · ${listLabel}`,
    homebrew: true,
  };
}
