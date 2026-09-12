const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const key = (value = '') => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

const editionFor = (character = {}) => {
  const raw = character.rules_edition || character.edition || character.ruleset_id || '2014';
  return String(raw).includes('2024') ? '2024' : '2014';
};

const proficiencyBonus = (level = 1) => 2 + Math.floor((Math.max(1, toNumber(level, 1)) - 1) / 4);
const abilityModifier = (score = 10) => Math.floor((toNumber(score, 10) - 10) / 2);

const classLevel = (classLevels = {}, className = '') => {
  const wanted = key(className);
  const match = Object.entries(classLevels || {}).find(([name]) => key(name) === wanted);
  return match ? Math.max(0, toNumber(match[1], 0)) : 0;
};

function totalLevel(classLevels = {}, character = {}) {
  const total = Object.values(classLevels || {}).reduce((sum, level) => sum + Math.max(0, toNumber(level, 0)), 0);
  return total || Math.max(1, toNumber(character.level, 1));
}

function warlockShape(level = 0) {
  const safeLevel = Math.max(0, Math.min(20, toNumber(level, 0)));
  if (!safeLevel) return { level: 0, slots: 0 };
  const slotLevel = safeLevel <= 2 ? 1 : safeLevel <= 4 ? 2 : safeLevel <= 6 ? 3 : safeLevel <= 8 ? 4 : 5;
  const slots = safeLevel === 1 ? 1 : safeLevel <= 10 ? 2 : safeLevel <= 16 ? 3 : 4;
  return { level: slotLevel, slots };
}

function resourceSpecs(character = {}, classLevels = {}) {
  const edition = editionFor(character);
  const pb = proficiencyBonus(totalLevel(classLevels, character));
  const specs = {};

  const barbarian = classLevel(classLevels, 'Barbarian');
  if (barbarian) {
    const maximum = edition === '2014' && barbarian >= 20
      ? 99
      : barbarian >= 17 ? 6 : barbarian >= 12 ? 5 : barbarian >= 6 ? 4 : barbarian >= 3 ? 3 : 2;
    specs.rage = { label: 'Rage', max: maximum, restore: 'long-rest', className: 'Barbarian', min_level: 1 };
  }

  const bard = classLevel(classLevels, 'Bard');
  if (bard) {
    specs.bardic_inspiration = {
      label: 'Bardic Inspiration',
      max: Math.max(1, abilityModifier(character.charisma)),
      restore: bard >= 5 ? 'short-rest' : 'long-rest',
      className: 'Bard',
      min_level: 1,
    };
  }

  const cleric = classLevel(classLevels, 'Cleric');
  if (cleric >= 2) {
    const maximum = edition === '2024'
      ? Math.max(2, Math.ceil(cleric / 2))
      : cleric >= 18 ? 3 : cleric >= 6 ? 2 : 1;
    specs.channel_divinity = {
      label: 'Channel Divinity', max: maximum, restore: 'short-rest', className: 'Cleric', min_level: 2,
    };
  }

  const druid = classLevel(classLevels, 'Druid');
  if (druid >= 2) {
    specs.wild_shape = { label: 'Wild Shape', max: 2, restore: 'short-rest', className: 'Druid', min_level: 2 };
  }

  const fighter = classLevel(classLevels, 'Fighter');
  if (fighter >= 1) {
    specs.second_wind = {
      label: 'Second Wind',
      max: edition === '2024' ? pb : 1,
      restore: edition === '2024' ? 'long-rest' : 'short-rest',
      className: 'Fighter',
      min_level: 1,
    };
  }
  if (fighter >= 2) {
    specs.action_surge = {
      label: 'Action Surge', max: fighter >= 17 ? 2 : 1, restore: 'short-rest', className: 'Fighter', min_level: 2,
    };
  }
  if (fighter >= 9) {
    specs.indomitable = {
      label: 'Indomitable',
      max: fighter >= 17 ? 3 : fighter >= 13 ? 2 : 1,
      restore: 'long-rest',
      className: 'Fighter',
      min_level: 9,
    };
  }

  const monk = classLevel(classLevels, 'Monk');
  if (monk >= 2) {
    specs.ki = {
      label: edition === '2024' ? 'Discipline Points' : 'Ki',
      max: monk,
      restore: 'short-rest',
      className: 'Monk',
      min_level: 2,
    };
  }

  const paladin = classLevel(classLevels, 'Paladin');
  if (paladin >= 1) {
    specs.lay_on_hands = {
      label: 'Lay on Hands', max: paladin * 5, restore: 'long-rest', className: 'Paladin', min_level: 1,
    };
  }
  if (paladin >= 3) {
    // The clean-sheet resource engine intentionally uses one stable
    // Channel Divinity key. Keep that shape here so preview and backend saves
    // do not sprout duplicate Cleric/Paladin counters.
    specs.channel_divinity = {
      label: 'Channel Divinity',
      max: edition === '2024' ? pb : 1,
      restore: edition === '2024' ? 'long-rest' : 'short-rest',
      className: 'Paladin',
      min_level: 3,
    };
  }

  const ranger = classLevel(classLevels, 'Ranger');
  if (ranger >= 1 && edition === '2024') {
    specs.favored_enemy = {
      label: 'Favored Enemy', max: Math.max(2, Math.ceil(ranger / 2)), restore: 'long-rest', className: 'Ranger', min_level: 1,
    };
  }

  const sorcerer = classLevel(classLevels, 'Sorcerer');
  if (sorcerer >= 2) {
    specs.sorcery_points = {
      label: 'Sorcery Points', max: sorcerer, restore: 'long-rest', className: 'Sorcerer', min_level: 2,
    };
  }

  const warlock = classLevel(classLevels, 'Warlock');
  if (warlock >= 1) {
    const pact = warlockShape(warlock);
    specs.pact_magic = {
      label: 'Pact Magic',
      max: pact.slots,
      slot_level: pact.level,
      restore: 'short-rest',
      className: 'Warlock',
      min_level: 1,
    };
  }

  const wizard = classLevel(classLevels, 'Wizard');
  if (wizard >= 1) {
    specs.arcane_recovery = {
      label: 'Arcane Recovery', max: 1, restore: 'long-rest', className: 'Wizard', min_level: 1,
    };
  }

  return specs;
}

export function mergeCharacterClassResources(character = {}, classLevels = {}, { initialiseMissing = true } = {}) {
  const existing = character.resources && typeof character.resources === 'object' && !Array.isArray(character.resources)
    ? character.resources
    : {};
  const merged = { ...existing };
  const specs = resourceSpecs(character, classLevels);

  Object.entries(specs).forEach(([resourceKey, spec]) => {
    const old = merged[resourceKey] && typeof merged[resourceKey] === 'object' && !Array.isArray(merged[resourceKey])
      ? merged[resourceKey]
      : null;
    const nextMax = Math.max(0, toNumber(spec.max, 0));
    if (!nextMax) return;

    let current;
    if (old) {
      const oldMax = Math.max(0, toNumber(old.max ?? old.maximum, nextMax));
      const oldCurrent = Math.max(0, Math.min(oldMax, toNumber(old.current ?? old.remaining, oldMax)));
      current = Math.min(nextMax, oldCurrent + Math.max(0, nextMax - oldMax));
    } else if (initialiseMissing) {
      current = nextMax;
    } else {
      return;
    }

    merged[resourceKey] = {
      ...(old || {}),
      ...spec,
      current,
      remaining: current,
      max: nextMax,
    };
  });

  return merged;
}

export { classLevel, resourceSpecs, warlockShape };
