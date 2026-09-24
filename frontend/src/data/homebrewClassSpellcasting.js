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

  return {
    ...raw,
    ability,
    type,
    progression,
    startLevel,
    cantripsAtLevelOne,
    spellsAtLevelOne,
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
