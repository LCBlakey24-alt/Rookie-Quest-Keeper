import { getEditionMulticlassSpellSlots } from './editionSpellSlotRules';
import {
  buildPactMagicResource,
  getCastOptionsForSpell,
  getNormalSpellPool,
  getPactMagicPool,
  spendCastOption,
} from './spellcastingPools';

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const displayClass = (value = '') => {
  const raw = String(value || '').trim();
  return raw ? `${raw.slice(0, 1).toUpperCase()}${raw.slice(1)}` : 'Fighter';
};

export function characterClassLevels(character = {}) {
  const saved = character.class_levels || character.multiclass_levels || {};
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    const entries = Object.entries(saved).filter(([, level]) => toNumber(level, 0) > 0);
    if (entries.length) return Object.fromEntries(entries.map(([name, level]) => [displayClass(name), toNumber(level, 0)]));
  }

  if (Array.isArray(character.classes)) {
    const entries = character.classes
      .map((entry) => [displayClass(entry?.name || entry?.class_name || entry?.character_class || entry?.class), toNumber(entry?.level, 0)])
      .filter(([, level]) => level > 0);
    if (entries.length) return Object.fromEntries(entries);
  }

  return {
    [displayClass(character.character_class || character.class_name || character.class || 'Fighter')]: Math.max(1, toNumber(character.level, 1)),
  };
}

export function getCharacterSpellPools(character = {}) {
  const classLevels = characterClassLevels(character);
  const slotMath = getEditionMulticlassSpellSlots(classLevels, character) || {};
  return {
    classLevels,
    slotMath,
    normal: getNormalSpellPool(character, slotMath),
    pact: getPactMagicPool(character, slotMath),
  };
}

export function getCharacterCastOptions(character = {}, spell = {}) {
  const pools = getCharacterSpellPools(character);
  const options = getCastOptionsForSpell({
    spell,
    normalSlots: pools.normal.totals,
    normalRemaining: pools.normal.remaining,
    pactPool: pools.pact,
  });
  return { ...pools, options };
}

function sameCastOption(left = {}, right = {}) {
  return left.source === right.source && toNumber(left.level, 0) === toNumber(right.level, 0);
}

export function chooseCharacterCastOption(options = [], { preferredSource = 'spell', explicitOption = null } = {}) {
  if (!options.length) return null;
  if (options[0]?.source === 'cantrip') return options[0];

  if (explicitOption) {
    const exact = options.find((option) => sameCastOption(option, explicitOption));
    if (exact) return exact;
    return null;
  }

  return [...options].sort((left, right) => {
    const levelDelta = toNumber(left.level, 0) - toNumber(right.level, 0);
    if (levelDelta) return levelDelta;
    if (left.source === right.source) return 0;
    if (left.source === preferredSource) return -1;
    if (right.source === preferredSource) return 1;
    return left.source === 'spell' ? -1 : 1;
  })[0];
}

export function buildCharacterSpellCastUpdate(
  character = {},
  spell = {},
  { preferredSource = 'spell', explicitOption = null } = {},
) {
  const pools = getCharacterCastOptions(character, spell);
  const option = chooseCharacterCastOption(pools.options, { preferredSource, explicitOption });
  const spellLevel = Math.max(0, toNumber(spell?.level ?? spell?.spell_level, 0));

  if (!option) {
    const explicitMissing = Boolean(explicitOption && pools.options.length);
    return {
      ok: false,
      reason: explicitMissing
        ? 'That spell slot pool is no longer available.'
        : `No level ${spellLevel}+ spell slots left`,
      option: null,
      options: pools.options,
      updates: {},
      pools,
    };
  }

  if (option.source === 'cantrip') {
    return {
      ok: true,
      reason: '',
      option,
      options: pools.options,
      updates: {},
      pools,
    };
  }

  const spent = spendCastOption({
    option,
    normalRemaining: pools.normal.remaining,
    pactPool: pools.pact,
  });
  const updates = {};

  if (option.source === 'pact') {
    updates.resources = buildPactMagicResource(
      character.resources || {},
      pools.pact,
      spent.pactRemaining,
    );

    // Warlock-only/legacy sheets historically exposed Pact Magic through the
    // spell_slots fields. Keep that compatibility mirror in sync while the
    // canonical counter lives at resources.pact_magic.
    if (pools.normal.legacyPactExcluded) {
      updates.spell_slots_remaining = {
        ...(character.spell_slots_remaining || {}),
        [String(pools.pact.level)]: spent.pactRemaining,
      };
    }
  } else {
    updates.spell_slots_remaining = spent.normalRemaining;
  }

  return {
    ok: true,
    reason: '',
    option,
    options: pools.options,
    updates,
    pools,
  };
}
