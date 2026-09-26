import { PACT_MAGIC_SLOTS, SPELL_SLOTS } from './spellDatabase';

const ABILITIES = new Set(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']);
const STYLES = new Set(['known', 'prepared', 'spellbook']);
const PROGRESSIONS = new Set(['full', 'half', 'third', 'pact']);

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const clampLevel = (value, fallback = 1) => Math.max(1, Math.min(20, Math.trunc(toNumber(value, fallback)) || fallback));

const normaliseToken = (value = '') => String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '');

const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const countField = (raw, ...keys) => {
  const value = firstDefined(...keys.map((key) => raw?.[key]));
  return Math.max(0, Math.trunc(toNumber(value, 0)));
};

const normaliseCountTable = (value) => {
  const output = {};
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        const level = clampLevel(firstDefined(entry.level, entry.class_level, entry.classLevel), index + 1);
        const count = Math.max(0, Math.trunc(toNumber(firstDefined(entry.count, entry.value, entry.total), 0)));
        output[level] = count;
        return;
      }
      const count = Number(entry);
      if (Number.isFinite(count)) output[index + 1] = Math.max(0, Math.trunc(count));
    });
    return output;
  }
  if (!value || typeof value !== 'object') return output;
  Object.entries(value).forEach(([rawLevel, rawCount]) => {
    const level = Number(rawLevel);
    const count = Number(rawCount);
    if (!Number.isInteger(level) || level < 1 || level > 20 || !Number.isFinite(count)) return;
    output[level] = Math.max(0, Math.trunc(count));
  });
  return output;
};

const countTableField = (raw, ...keys) => normaliseCountTable(firstDefined(...keys.map((key) => raw?.[key])));

const withLevelOneSeed = (table, count) => {
  const output = { ...(table || {}) };
  if (Number(count || 0) > 0 && output[1] === undefined) output[1] = Math.max(0, Math.trunc(Number(count)));
  return output;
};

export function homebrewProgressionTableValue(table = {}, level = 1) {
  const safeLevel = clampLevel(level, 1);
  let value = 0;
  Object.entries(table || {})
    .map(([rawLevel, rawValue]) => [Number(rawLevel), Number(rawValue)])
    .filter(([entryLevel, entryValue]) => Number.isInteger(entryLevel) && entryLevel >= 1 && entryLevel <= safeLevel && Number.isFinite(entryValue))
    .sort(([a], [b]) => a - b)
    .forEach(([, entryValue]) => { value = Math.max(0, Math.trunc(entryValue)); });
  return value;
}

export function normaliseHomebrewClassSpellcasting(classData = {}) {
  const raw = classData?.spellcasting;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const rawAbility = firstDefined(raw.ability, raw.spellcasting_ability, raw.spellcastingAbility);
  const abilityToken = String(rawAbility || '').trim().toLowerCase();
  const ability = ABILITIES.has(abilityToken) ? abilityToken : '';

  const rawStyle = String(firstDefined(raw.type, raw.style, raw.casting_type, raw.castingType) || 'known').trim().toLowerCase();
  const type = STYLES.has(rawStyle) ? rawStyle : 'known';

  const rawProgression = normaliseToken(firstDefined(raw.progression, raw.slot_progression, raw.slotProgression) || '');
  const progressionAliases = { fullcaster: 'full', halfcaster: 'half', thirdcaster: 'third', pactmagic: 'pact' };
  const explicitProgression = progressionAliases[rawProgression] || rawProgression;
  const progression = PROGRESSIONS.has(explicitProgression)
    ? explicitProgression
    : raw.pactMagic || raw.pact_magic
      ? 'pact'
      : raw.halfCaster || raw.half_caster
        ? 'half'
        : raw.thirdCaster || raw.third_caster
          ? 'third'
          : 'full';

  const startLevel = clampLevel(firstDefined(raw.start_level, raw.startLevel), 1);
  const cantripsAtLevelOne = countField(
    raw,
    'cantrips_level_1',
    'cantripsLevel1',
    'cantrips_known_level_1',
    'cantripsKnownLevel1',
  );
  const spellsAtLevelOne = countField(
    raw,
    'spells_level_1',
    'spellsLevel1',
    'spells_known_level_1',
    'spellsKnownLevel1',
  );
  const cantripsKnownTable = withLevelOneSeed(countTableField(
    raw,
    'cantrips_known_table',
    'cantripsKnownTable',
    'cantrips_progression',
    'cantripsProgression',
  ), cantripsAtLevelOne);
  const spellsKnownTable = type === 'known'
    ? withLevelOneSeed(countTableField(raw, 'spells_known_table', 'spellsKnownTable'), spellsAtLevelOne)
    : countTableField(raw, 'spells_known_table', 'spellsKnownTable');
  const spellbookSpellsTable = type === 'spellbook'
    ? withLevelOneSeed(countTableField(raw, 'spellbook_spells_table', 'spellbookSpellsTable'), spellsAtLevelOne)
    : countTableField(raw, 'spellbook_spells_table', 'spellbookSpellsTable');
  const preparedSpellsTable = type === 'prepared'
    ? withLevelOneSeed(countTableField(raw, 'prepared_spells_table', 'preparedSpellsTable'), spellsAtLevelOne)
    : countTableField(raw, 'prepared_spells_table', 'preparedSpellsTable');

  return {
    ...raw,
    ability,
    type,
    progression,
    startLevel,
    cantripsAtLevelOne,
    spellsAtLevelOne,
    cantripsKnownTable,
    spellsKnownTable,
    spellbookSpellsTable,
    preparedSpellsTable,
    ritual: Boolean(raw.ritual),
    halfCaster: progression === 'half',
    thirdCaster: progression === 'third',
    pactMagic: progression === 'pact',
    homebrew: true,
  };
}

export function buildHomebrewSpellcastingSnapshot(classData = {}, className = '') {
  const definition = normaliseHomebrewClassSpellcasting(classData);
  if (!definition) return null;
  return {
    class_name: className || classData?.name || '',
    ability: definition.ability,
    type: definition.type,
    progression: definition.progression,
    start_level: definition.startLevel,
    cantrips_level_1: definition.cantripsAtLevelOne,
    spells_level_1: definition.spellsAtLevelOne,
    cantrips_known_table: definition.cantripsKnownTable,
    spells_known_table: definition.spellsKnownTable,
    spellbook_spells_table: definition.spellbookSpellsTable,
    prepared_spells_table: definition.preparedSpellsTable,
    ritual: definition.ritual,
  };
}

export function getSavedHomebrewSpellcasting(character = {}, className = '') {
  const saved = character?.homebrew_spellcasting;
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return null;
  const wanted = normaliseToken(className);
  const direct = Object.entries(saved).find(([name]) => normaliseToken(name) === wanted)?.[1];
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) return direct;
  return Object.values(saved).find((definition) => (
    definition
    && typeof definition === 'object'
    && !Array.isArray(definition)
    && normaliseToken(definition.class_name || definition.className) === wanted
  )) || null;
}

export function getHomebrewSpellProgression(classData = {}, beforeLevel = 0, afterLevel = beforeLevel + 1) {
  const definition = normaliseHomebrewClassSpellcasting(classData);
  if (!definition) {
    return {
      cantripTargetBefore: 0,
      cantripTargetAfter: 0,
      cantripGain: 0,
      spellTargetBefore: 0,
      spellTargetAfter: 0,
      spellGain: 0,
      preparedCapacityBefore: 0,
      preparedCapacityAfter: 0,
      preparedCapacityGain: 0,
      type: 'none',
    };
  }

  const before = Math.max(0, Math.min(20, Math.trunc(toNumber(beforeLevel, 0))));
  const after = Math.max(0, Math.min(20, Math.trunc(toNumber(afterLevel, before + 1))));
  const cantripTargetBefore = before > 0 ? homebrewProgressionTableValue(definition.cantripsKnownTable, before) : 0;
  const cantripTargetAfter = after > 0 ? homebrewProgressionTableValue(definition.cantripsKnownTable, after) : 0;
  const spellTable = definition.type === 'spellbook'
    ? definition.spellbookSpellsTable
    : definition.type === 'prepared'
      ? definition.preparedSpellsTable
      : definition.spellsKnownTable;
  const spellTargetBefore = before > 0 ? homebrewProgressionTableValue(spellTable, before) : 0;
  const spellTargetAfter = after > 0 ? homebrewProgressionTableValue(spellTable, after) : 0;
  const preparedCapacityBefore = definition.type === 'prepared' ? spellTargetBefore : 0;
  const preparedCapacityAfter = definition.type === 'prepared' ? spellTargetAfter : 0;

  return {
    cantripTargetBefore,
    cantripTargetAfter,
    cantripGain: Math.max(0, cantripTargetAfter - cantripTargetBefore),
    spellTargetBefore,
    spellTargetAfter,
    spellGain: Math.max(0, spellTargetAfter - spellTargetBefore),
    preparedCapacityBefore,
    preparedCapacityAfter,
    preparedCapacityGain: Math.max(0, preparedCapacityAfter - preparedCapacityBefore),
    type: definition.type,
  };
}

export function getHomebrewMaxSpellLevel(classData = {}, level = 1, edition = '2014') {
  const slots = getHomebrewSpellSlots(classData, level, edition);
  return Object.keys(slots)
    .map(Number)
    .filter((slotLevel) => Number.isFinite(slotLevel) && slotLevel > 0)
    .sort((a, b) => b - a)[0] || 0;
}

export function homebrewSpellcastingIsActive(classData = {}, level = 1) {
  const definition = normaliseHomebrewClassSpellcasting(classData);
  return Boolean(definition && clampLevel(level, 1) >= definition.startLevel);
}

export function getHomebrewSpellSlots(classData = {}, level = 1, edition = '2014') {
  const definition = normaliseHomebrewClassSpellcasting(classData);
  const safeLevel = clampLevel(level, 1);
  if (!definition || safeLevel < definition.startLevel) return {};

  if (definition.pactMagic) {
    const pact = PACT_MAGIC_SLOTS[safeLevel] || {};
    const slotLevel = Math.max(0, toNumber(pact.level, 0));
    const slots = Math.max(0, toNumber(pact.slots, 0));
    return slotLevel > 0 && slots > 0 ? { [String(slotLevel)]: slots } : {};
  }

  let effectiveLevel = safeLevel;
  if (definition.halfCaster) {
    effectiveLevel = String(edition).includes('2024')
      ? Math.ceil(safeLevel / 2)
      : Math.floor(safeLevel / 2);
  } else if (definition.thirdCaster) {
    effectiveLevel = Math.floor(safeLevel / 3);
  }

  if (effectiveLevel <= 0) return {};
  return { ...(SPELL_SLOTS[Math.min(effectiveLevel, 20)] || {}) };
}

export function getHomebrewLevelOneSpellRequirements(classData = {}) {
  const definition = normaliseHomebrewClassSpellcasting(classData);
  if (!definition || definition.startLevel > 1) {
    return { cantrips: 0, spells: 0, type: 'none' };
  }

  return {
    cantrips: definition.cantripsAtLevelOne,
    spells: definition.spellsAtLevelOne,
    type: definition.type,
  };
}

export function buildHomebrewSpellcastingState(classData = {}, {
  level = 1,
  edition = '2014',
  scores = {},
  proficiencyBonus = 2,
} = {}) {
  const definition = normaliseHomebrewClassSpellcasting(classData);
  if (!definition || !homebrewSpellcastingIsActive(classData, level)) return {};

  const slots = getHomebrewSpellSlots(classData, level, edition);
  const state = {
    spell_slots: slots,
    spell_slots_remaining: { ...slots },
  };

  if (!definition.ability) return state;

  const abilityScore = toNumber(scores?.[definition.ability], 10);
  const abilityModifier = Math.floor((abilityScore - 10) / 2);
  return {
    ...state,
    spellcasting_ability: definition.ability,
    spell_save_dc: 8 + toNumber(proficiencyBonus, 2) + abilityModifier,
    spell_attack_bonus: toNumber(proficiencyBonus, 2) + abilityModifier,
  };
}


export function buildHomebrewPactMagicTracker(classData = {}, {
  level = 1,
  edition = '2014',
} = {}) {
  const definition = normaliseHomebrewClassSpellcasting(classData);
  if (!definition?.pactMagic || !homebrewSpellcastingIsActive(classData, level)) return null;

  const slots = getHomebrewSpellSlots(classData, level, edition);
  const entries = Object.entries(slots).filter(([slotLevel, count]) => Number(slotLevel) > 0 && Number(count) > 0);
  if (entries.length !== 1) return null;

  const [slotLevel, count] = entries[0];
  const maximum = Math.max(0, Number(count) || 0);
  if (!maximum) return null;

  return {
    label: 'Pact Magic',
    current: maximum,
    remaining: maximum,
    max: maximum,
    slot_level: Number(slotLevel),
    restore: 'short-rest',
    min_level: definition.startLevel,
    className: classData?.name || 'Homebrew',
    homebrew: true,
  };
}
