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

function normaliseCountTable(value = {}, levelOneFallback = 0) {
  const entries = Array.isArray(value)
    ? value.map((count, index) => [index + 1, count])
    : Object.entries(value && typeof value === 'object' ? value : {});

  const table = Object.fromEntries(
    entries
      .map(([level, count]) => [clampLevel(level, 1), Math.max(0, Math.trunc(toNumber(count, 0)))])
      .filter(([level]) => level >= 1 && level <= 20)
      .sort((left, right) => left[0] - right[0]),
  );

  if (levelOneFallback > 0 && table[1] === undefined) table[1] = Math.max(0, Math.trunc(levelOneFallback));
  return table;
}

function cumulativeCount(table = {}, level = 1) {
  const safeLevel = clampLevel(level, 1);
  return Object.entries(table || {})
    .map(([entryLevel, count]) => [Number(entryLevel), Math.max(0, Math.trunc(toNumber(count, 0)))])
    .filter(([entryLevel]) => entryLevel <= safeLevel)
    .sort((left, right) => right[0] - left[0])?.[0]?.[1] || 0;
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

  const cantripsByLevel = normaliseCountTable(
    firstDefined(
      raw.cantrips_by_level,
      raw.cantripsByLevel,
      raw.cantrips_known_by_level,
      raw.cantripsKnownByLevel,
      raw.cantrip_progression,
      raw.cantripProgression,
    ),
    cantripsAtLevelOne,
  );
  const spellsByLevel = normaliseCountTable(
    firstDefined(
      raw.spells_by_level,
      raw.spellsByLevel,
      raw.spells_known_by_level,
      raw.spellsKnownByLevel,
      raw.prepared_spells_by_level,
      raw.preparedSpellsByLevel,
      raw.spellbook_spells_by_level,
      raw.spellbookSpellsByLevel,
      raw.spell_progression,
      raw.spellProgression,
    ),
    spellsAtLevelOne,
  );

  return {
    ...raw,
    ability,
    type,
    progression,
    startLevel,
    cantripsAtLevelOne,
    spellsAtLevelOne,
    cantripsByLevel,
    spellsByLevel,
    ritual: Boolean(raw.ritual),
    halfCaster: progression === 'half',
    thirdCaster: progression === 'third',
    pactMagic: progression === 'pact',
    homebrew: true,
  };
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

export function getHomebrewSpellChoiceTargets(classData = {}, level = 1) {
  const definition = normaliseHomebrewClassSpellcasting(classData);
  const safeLevel = clampLevel(level, 1);
  if (!definition || safeLevel < definition.startLevel) {
    return { cantrips: 0, spells: 0, type: 'none' };
  }

  return {
    cantrips: cumulativeCount(definition.cantripsByLevel, safeLevel),
    spells: cumulativeCount(definition.spellsByLevel, safeLevel),
    type: definition.type,
  };
}

export function getHomebrewSpellChoiceGain(classData = {}, beforeLevel = 0, afterLevel = beforeLevel + 1) {
  const before = Number(beforeLevel) > 0
    ? getHomebrewSpellChoiceTargets(classData, beforeLevel)
    : { cantrips: 0, spells: 0, type: normaliseHomebrewClassSpellcasting(classData)?.type || 'none' };
  const after = getHomebrewSpellChoiceTargets(classData, afterLevel);
  return {
    cantrips: Math.max(0, after.cantrips - before.cantrips),
    spells: Math.max(0, after.spells - before.spells),
    type: after.type,
    before,
    after,
  };
}

export function getHomebrewLevelOneSpellRequirements(classData = {}) {
  return getHomebrewSpellChoiceTargets(classData, 1);
}

export function getHomebrewMaxSpellLevel(classData = {}, level = 1, edition = '2014') {
  const slots = getHomebrewSpellSlots(classData, level, edition);
  if (slots?.level) return Math.max(0, toNumber(slots.level, 0));
  return Object.keys(slots)
    .map((slotLevel) => toNumber(slotLevel, 0))
    .filter((slotLevel) => slotLevel > 0)
    .sort((left, right) => right - left)[0] || 0;
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
