const normalizeName = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const labelText = (label, character) => (typeof label === 'function' ? label(character) : label);

const classLevelOf = (character, className) => {
  const key = normalizeName(className);
  const classLevels = { ...(character?.multiclass_levels || {}), ...(character?.classLevels || {}), ...(character?.class_levels || {}) };
  const mappedLevel = Number(classLevels[key] || classLevels[className] || classLevels[className?.charAt?.(0)?.toUpperCase?.() + className?.slice?.(1)] || 0);
  if (mappedLevel > 0) return mappedLevel;

  const entry = (Array.isArray(character?.classes) ? character.classes : [])
    .find(item => normalizeName(item?.name || item?.class_name || item?.className || item?.class) === key);
  const entryLevel = Number(entry?.level || entry?.class_level || entry?.classLevel || 0);
  if (entryLevel > 0) return entryLevel;

  return Math.max(1, Number(character?.level || character?.character_level || 1));
};

const is2024Rules = (character) => String(character?.rules_edition || character?.ruleset_id || '').includes('2024');

export function resourceValue(character, rule) {
  const existing = character?.resources?.[rule.key] || {};
  const rulesMax = Number(rule.maxValue || 0) || 0;
  const storedMax = Number(existing.max ?? existing.total ?? 0) || 0;
  const max = Math.max(rulesMax, storedMax);
  const hasLeveledPastStoredMax = rulesMax > storedMax;
  const current = hasLeveledPastStoredMax
    ? rulesMax
    : Number(existing.current ?? existing.remaining ?? max) || 0;

  return {
    ...rule,
    label: labelText(rule.label, character),
    current: Math.max(0, Math.min(max, current)),
    max,
  };
}

export function resourceActionCards(character, resources, handlers = { spendResource: () => {} }) {
  const byKey = Object.fromEntries(resources.map((resource) => [resource.key, resource]));
  const cards = { action: [], bonus: [], reaction: [] };

  const add = (bucket, key, title, description, onClick, displayType = 'Resource') => {
    const resource = byKey[key];
    const suffix = resource ? ` • ${resource.label} ${resource.current}/${resource.max}` : '';
    cards[bucket].push({
      key: `${bucket}-${key}-${title}`,
      title,
      type: resource?.label || displayType,
      description: `${description}${suffix}`,
      disabled: Boolean(resource && resource.current <= 0),
      onClick,
    });
  };

  const className = normalizeName(character?.character_class || character?.class_name || character?.class);
  if (byKey.ki || className === 'monk') {
    add('bonus', 'ki', 'Flurry of Blows', 'Spend 1 Ki/Discipline Point to make extra unarmed strikes after taking the Attack action.', () => handlers.spendResource('ki', 'Flurry of Blows'));
    add('bonus', 'ki', 'Patient Defense', 'Spend 1 Ki/Discipline Point to Dodge as a bonus action.', () => handlers.spendResource('ki', 'Patient Defense'));
    add('bonus', 'ki', 'Step of the Wind', 'Spend 1 Ki/Discipline Point to Dash or Disengage as a bonus action.', () => handlers.spendResource('ki', 'Step of the Wind'));
  }
  if (byKey.sorcery_points || className === 'sorcerer') {
    add('bonus', 'sorcery_points', 'Convert Sorcery Points', 'Use sorcery points for Metamagic or to create spell slots if your table uses that rule.', () => handlers.spendResource('sorcery_points', 'Sorcery Points'));
    add('bonus', 'sorcery_points', 'Metamagic', 'Spend sorcery points on a Metamagic option you know.', () => handlers.spendResource('sorcery_points', 'Metamagic'));
  }
  if (byKey.rage || className === 'barbarian') add('bonus', 'rage', 'Rage', 'Enter a rage and apply your rage bonuses and resistances.', () => handlers.spendResource('rage', 'Rage'));
  if (byKey.bardic_inspiration || className === 'bard') add('bonus', 'bardic_inspiration', 'Bardic Inspiration', 'Give one creature an inspiration die.', () => handlers.spendResource('bardic_inspiration', 'Bardic Inspiration'));
  const fighterLevel = className === 'fighter' || byKey.second_wind || byKey.action_surge || byKey.indomitable ? classLevelOf(character, 'fighter') : 0;
  if (byKey.second_wind || fighterLevel >= 1) add('bonus', 'second_wind', 'Second Wind', 'Regain hit points using your fighter resource.', () => handlers.spendResource('second_wind', 'Second Wind'));
  if (byKey.action_surge || fighterLevel >= 2) add('action', 'action_surge', 'Action Surge', 'Take one additional action on your turn.', () => handlers.spendResource('action_surge', 'Action Surge'));
  if (byKey.indomitable || fighterLevel >= 9) add('reaction', 'indomitable', 'Indomitable', 'Reroll a failed saving throw when this feature applies.', () => handlers.spendResource('indomitable', 'Indomitable'));
  if (byKey.superiority_dice) {
    add('action', 'superiority_dice', 'Battle Master Maneuver', 'Spend a superiority die when a maneuver applies.', () => handlers.spendResource('superiority_dice', 'Superiority Die'));
    add('reaction', 'superiority_dice', 'Reaction Maneuver', 'Use a reaction maneuver such as Riposte or Parry if known.', () => handlers.spendResource('superiority_dice', 'Reaction Maneuver'));
  }
  if (byKey.wild_shape || className === 'druid') add('action', 'wild_shape', 'Wild Shape', 'Transform using a Wild Shape use.', () => handlers.spendResource('wild_shape', 'Wild Shape'));
  if (byKey.channel_divinity) add('action', 'channel_divinity', 'Channel Divinity', 'Use a Channel Divinity option from your class or subclass.', () => handlers.spendResource('channel_divinity', 'Channel Divinity'));
  if (byKey.lay_on_hands || className === 'paladin') add('action', 'lay_on_hands', 'Lay on Hands', 'Spend points from your healing pool.', () => handlers.spendResource('lay_on_hands', 'Lay on Hands'));
  if (byKey.arcane_recovery || className === 'wizard') add('action', 'arcane_recovery', 'Arcane Recovery', 'Recover spell slots during a short rest when this applies.', () => handlers.spendResource('arcane_recovery', 'Arcane Recovery'));
  if (byKey.favored_enemy || (className === 'ranger' && (is2024Rules(character) || classLevelOf(character, 'ranger') >= 2))) {
    const spendFavoredEnemy = byKey.favored_enemy ? () => handlers.spendResource('favored_enemy', "Hunter's Mark") : undefined;
    add('bonus', 'favored_enemy', "Hunter's Mark", "Cast or move Hunter's Mark when your Ranger features or spells make it available.", spendFavoredEnemy, 'Core Ranger feature');
  }
  if (className === 'rogue') {
    add('action', 'rogue', 'Sneak Attack', 'Once per turn, add extra damage when you hit with a finesse or ranged weapon and meet Sneak Attack conditions.', undefined, 'Core Rogue feature');
    if (classLevelOf(character, 'rogue') >= 2) {
      add('bonus', 'rogue', 'Cunning Action', 'Take the Dash, Disengage, or Hide action as a bonus action.', undefined, 'Core Rogue feature');
    }
  }
  return cards;
}
