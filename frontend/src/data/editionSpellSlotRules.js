import {
  PACT_MAGIC_SLOTS,
  SPELLCASTING_CLASSES,
  SPELL_SLOTS,
  getCanonicalSpellcastingClass,
  getCharacterSubclassForClass,
} from './spellDatabase';

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normaliseName = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function editionFor(character = {}) {
  const raw = character?.rules_edition || character?.edition || character?.ruleset_id || '2014';
  return String(raw).includes('2024') ? '2024' : '2014';
}

export function halfCasterContribution(level = 0, edition = '2014') {
  const safeLevel = Math.max(0, toNumber(level, 0));
  return String(edition) === '2024'
    ? Math.ceil(safeLevel / 2)
    : Math.floor(safeLevel / 2);
}

export function classHasEditionSpellcasting(character = {}, className = '', explicitLevel = null) {
  const canonicalClass = getCanonicalSpellcastingClass(className);
  const info = SPELLCASTING_CLASSES[canonicalClass];
  if (!info) return false;

  const classLevels = character?.class_levels || character?.multiclass_levels || {};
  const mapped = Object.entries(classLevels).find(([name]) => normaliseName(name) === normaliseName(canonicalClass));
  const fallbackLevel = normaliseName(character?.character_class) === normaliseName(canonicalClass)
    ? toNumber(character?.level, 1)
    : 0;
  const level = Math.max(0, explicitLevel === null ? toNumber(mapped?.[1], fallbackLevel) : toNumber(explicitLevel, 0));
  if (level <= 0) return false;

  if (info.halfCaster) {
    return level >= (editionFor(character) === '2024' ? 1 : 2);
  }

  if (info.subclassOnly) {
    const subclass = getCharacterSubclassForClass(character, canonicalClass);
    return level >= 3 && normaliseName(subclass) === normaliseName(info.subclassOnly);
  }

  return true;
}

export function getEditionSpellSlotsForClass(character = {}, className = '', level = 0) {
  const canonicalClass = getCanonicalSpellcastingClass(className);
  const info = SPELLCASTING_CLASSES[canonicalClass];
  const safeLevel = Math.max(0, Math.min(20, toNumber(level, 0)));
  if (!info || safeLevel <= 0 || !classHasEditionSpellcasting(character, canonicalClass, safeLevel)) return {};

  if (info.pactMagic) return PACT_MAGIC_SLOTS[safeLevel] || {};

  // A class's OWN slot table is the full-caster table at ceil(level / N), in
  // both editions. halfCasterContribution() is the *multiclass* rule (floor in
  // 2014, ceil in 2024) and belongs only in getEditionMulticlassSpellSlots
  // below -- using it here understated slots at every odd level under 2014, so
  // a Paladin 5 reported {1:3} instead of {1:4, 2:2}.
  // The start level is already enforced by classHasEditionSpellcasting above
  // (2 in 2014, 1 in 2024 for half casters; 3 for third casters), so ceil()
  // cannot leak a slot to a character who has no Spellcasting yet.
  let effectiveLevel = safeLevel;
  if (info.halfCaster) effectiveLevel = Math.ceil(safeLevel / 2);
  if (info.thirdCaster) effectiveLevel = Math.ceil(safeLevel / 3);
  return SPELL_SLOTS[Math.min(Math.max(effectiveLevel, 0), 20)] || {};
}

export function getEditionMaxSpellLevel(character = {}, className = '', level = 0) {
  const slots = getEditionSpellSlotsForClass(character, className, level);
  if (slots?.level) return toNumber(slots.level, 0);
  return Object.keys(slots)
    .map((slotLevel) => toNumber(slotLevel, 0))
    .filter((slotLevel) => slotLevel > 0)
    .sort((a, b) => b - a)[0] || 0;
}

export function getEditionMulticlassSpellSlots(classLevels = {}, character = {}) {
  let multiclassLevel = 0;
  let warlockLevel = 0;
  const edition = editionFor(character);

  Object.entries(classLevels || {}).forEach(([rawClass, rawLevel]) => {
    const canonicalClass = getCanonicalSpellcastingClass(rawClass);
    const info = SPELLCASTING_CLASSES[canonicalClass];
    if (!info) return;
    const level = Math.max(0, toNumber(rawLevel, 0));
    if (level <= 0) return;

    if (info.pactMagic) {
      warlockLevel += level;
      return;
    }

    if (info.subclassOnly) {
      if (classHasEditionSpellcasting(character, canonicalClass, level)) {
        multiclassLevel += Math.floor(level / 3);
      }
      return;
    }

    if (info.halfCaster) {
      multiclassLevel += halfCasterContribution(level, edition);
      return;
    }

    multiclassLevel += level;
  });

  const cappedMulticlassLevel = Math.min(Math.max(multiclassLevel, 0), 20);
  return {
    multiclassLevel,
    cappedMulticlassLevel,
    slots: SPELL_SLOTS[cappedMulticlassLevel] || {},
    pactMagic: warlockLevel > 0
      ? (PACT_MAGIC_SLOTS[Math.min(Math.max(warlockLevel, 0), 20)] || null)
      : null,
  };
}
