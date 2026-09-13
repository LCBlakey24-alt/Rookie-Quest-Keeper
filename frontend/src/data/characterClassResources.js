const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const key = (value = '') => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

const editionFor = (character = {}) => {
  const raw = character.rules_edition || character.edition || character.ruleset_id || '2014';
  return String(raw).includes('2024') ? '2024' : '2014';
};

const abilityModifier = (score = 10) => Math.floor((toNumber(score, 10) - 10) / 2);

const classLevel = (classLevels = {}, className = '') => {
  const wanted = key(className);
  const match = Object.entries(classLevels || {}).find(([name]) => key(name) === wanted);
  return match ? Math.max(0, toNumber(match[1], 0)) : 0;
};

function warlockShape(level = 0) {
  const safeLevel = Math.max(0, Math.min(20, toNumber(level, 0)));
  if (!safeLevel) return { level: 0, slots: 0 };
  const slotLevel = safeLevel <= 2 ? 1 : safeLevel <= 4 ? 2 : safeLevel <= 6 ? 3 : safeLevel <= 8 ? 4 : 5;
  const slots = safeLevel === 1 ? 1 : safeLevel <= 10 ? 2 : safeLevel <= 16 ? 3 : 4;
  return { level: slotLevel, slots };
}

function clericChannelMax(level = 0, edition = '2014') {
  const safeLevel = Math.max(0, toNumber(level, 0));
  if (safeLevel < 2) return 0;
  if (edition === '2024') return safeLevel >= 18 ? 4 : safeLevel >= 6 ? 3 : 2;
  return safeLevel >= 18 ? 3 : safeLevel >= 6 ? 2 : 1;
}

function paladinChannelMax(level = 0, edition = '2014') {
  const safeLevel = Math.max(0, toNumber(level, 0));
  if (safeLevel < 3) return 0;
  if (edition === '2024') return safeLevel >= 11 ? 3 : 2;
  return 1;
}

function addChannelDivinitySpecs(specs, edition, clericLevel, paladinLevel) {
  const clericMax = clericChannelMax(clericLevel, edition);
  const paladinMax = paladinChannelMax(paladinLevel, edition);
  const hasCleric = clericMax > 0;
  const hasPaladin = paladinMax > 0;
  if (!hasCleric && !hasPaladin) return;

  if (edition === '2014') {
    specs.channel_divinity = {
      label: 'Channel Divinity',
      max: Math.max(clericMax, paladinMax),
      restore: 'short-rest',
      className: hasCleric && hasPaladin ? 'Cleric / Paladin' : hasCleric ? 'Cleric' : 'Paladin',
      min_level: hasCleric ? 2 : 3,
    };
    return;
  }

  const dualPool = hasCleric && hasPaladin;
  if (hasCleric) {
    specs[dualPool ? 'cleric_channel_divinity' : 'channel_divinity'] = {
      label: dualPool ? 'Cleric Channel Divinity' : 'Channel Divinity',
      max: clericMax,
      restore: 'long-rest',
      short_rest_restore: 1,
      className: 'Cleric',
      min_level: 2,
    };
  }
  if (hasPaladin) {
    specs[dualPool ? 'paladin_channel_divinity' : 'channel_divinity'] = {
      label: dualPool ? 'Paladin Channel Divinity' : 'Channel Divinity',
      max: paladinMax,
      restore: 'long-rest',
      short_rest_restore: 1,
      className: 'Paladin',
      min_level: 3,
    };
  }
}

function resourceSpecs(character = {}, classLevels = {}) {
  const edition = editionFor(character);
  const specs = {};

  const barbarian = classLevel(classLevels, 'Barbarian');
  if (barbarian) {
    const maximum = edition === '2014' && barbarian >= 20
      ? 99
      : barbarian >= 17 ? 6 : barbarian >= 12 ? 5 : barbarian >= 6 ? 4 : barbarian >= 3 ? 3 : 2;
    specs.rage = {
      label: 'Rage',
      max: maximum,
      restore: 'long-rest',
      ...(edition === '2024' ? { short_rest_restore: 1 } : {}),
      className: 'Barbarian',
      min_level: 1,
    };
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
  const paladin = classLevel(classLevels, 'Paladin');
  addChannelDivinitySpecs(specs, edition, cleric, paladin);

  const druid = classLevel(classLevels, 'Druid');
  if (druid >= 2) {
    const maximum = edition === '2024'
      ? druid >= 17 ? 4 : druid >= 6 ? 3 : 2
      : druid >= 20 ? 99 : 2;
    specs.wild_shape = {
      label: 'Wild Shape',
      max: maximum,
      restore: edition === '2024' ? 'long-rest' : 'short-rest',
      ...(edition === '2024' ? { short_rest_restore: 1 } : {}),
      className: 'Druid',
      min_level: 2,
    };
  }

  const fighter = classLevel(classLevels, 'Fighter');
  if (fighter >= 1) {
    const secondWindMax = edition === '2024'
      ? fighter >= 10 ? 4 : fighter >= 4 ? 3 : 2
      : 1;
    specs.second_wind = {
      label: 'Second Wind',
      max: secondWindMax,
      restore: edition === '2024' ? 'long-rest' : 'short-rest',
      ...(edition === '2024' ? { short_rest_restore: 1 } : {}),
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
      label: edition === '2024' ? 'Focus Points' : 'Ki',
      max: monk,
      restore: 'short-rest',
      className: 'Monk',
      min_level: 2,
    };
  }

  if (paladin >= 1) {
    specs.lay_on_hands = {
      label: 'Lay on Hands', max: paladin * 5, restore: 'long-rest', className: 'Paladin', min_level: 1,
    };
  }

  const ranger = classLevel(classLevels, 'Ranger');
  if (ranger >= 1 && edition === '2024') {
    const favoredEnemyMax = ranger >= 17 ? 6 : ranger >= 13 ? 5 : ranger >= 9 ? 4 : ranger >= 5 ? 3 : 2;
    specs.favored_enemy = {
      label: 'Favored Enemy', max: favoredEnemyMax, restore: 'long-rest', className: 'Ranger', min_level: 1,
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

function legacyChannelTarget(legacy = {}, specs = {}) {
  const scopedKeys = ['cleric_channel_divinity', 'paladin_channel_divinity'].filter(resourceKey => specs[resourceKey]);
  if (!scopedKeys.length) return '';

  const source = key(legacy.className || legacy.class_name || '');
  const sourceTarget = `${source}_channel_divinity`;
  if (scopedKeys.includes(sourceTarget)) return sourceTarget;

  const legacyMax = Math.max(0, toNumber(legacy.max ?? legacy.maximum, 0));
  const matching = scopedKeys.filter(resourceKey => Number(specs[resourceKey]?.max || 0) === legacyMax && legacyMax > 0);
  if (matching.length === 1) return matching[0];

  // Old frontend generation processed Paladin after Cleric, so an ambiguous
  // unscoped dual-class tracker represented the Paladin pool most recently.
  if (scopedKeys.includes('paladin_channel_divinity')) return 'paladin_channel_divinity';
  return scopedKeys[0];
}

function migrateLegacyChannelDivinity(resources = {}, specs = {}) {
  const legacy = resources.channel_divinity;
  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) return resources;
  const target = legacyChannelTarget(legacy, specs);
  if (!target) return resources;

  const migrated = { ...resources };
  if (!migrated[target] || typeof migrated[target] !== 'object' || Array.isArray(migrated[target])) {
    migrated[target] = { ...legacy, migration_source: 'legacy_channel_divinity' };
  }
  delete migrated.channel_divinity;
  return migrated;
}

export function mergeCharacterClassResources(character = {}, classLevels = {}, { initialiseMissing = true } = {}) {
  const existing = character.resources && typeof character.resources === 'object' && !Array.isArray(character.resources)
    ? character.resources
    : {};
  const specs = resourceSpecs(character, classLevels);
  const merged = migrateLegacyChannelDivinity({ ...existing }, specs);

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
