import { buildInitialClassResources, getClassResourceRules, restoreClassResources } from './classResourceRules';

const fighter = {
  character_class: 'Fighter',
  level: 1,
};

describe('Fighter class resources', () => {
  test('2014 fighter starts with one short-rest Second Wind', () => {
    const resources = buildInitialClassResources({ ...fighter, rules_edition: '2014', level: 1 });

    expect(resources.second_wind).toMatchObject({
      max: 1,
      current: 1,
      remaining: 1,
      restore: 'short-rest',
    });
    expect(resources.action_surge).toBeUndefined();
  });

  test('2024 fighter derives Second Wind uses from level when proficiency bonus is missing', () => {
    const resources = buildInitialClassResources({ ...fighter, rules_edition: '2024', level: 9 });

    expect(resources.second_wind).toMatchObject({
      max: 4,
      restore: 'long-rest',
    });
  });

  test('fighter unlocks Action Surge and later gains a second use', () => {
    expect(getClassResourceRules({ ...fighter, level: 2 }).find(rule => rule.key === 'action_surge')).toMatchObject({ maxValue: 1 });
    expect(getClassResourceRules({ ...fighter, level: 17 }).find(rule => rule.key === 'action_surge')).toMatchObject({ maxValue: 2 });
  });

  test('Samurai Fighting Spirit unlocks only for Samurai Fighters', () => {
    expect(getClassResourceRules({ ...fighter, level: 3, subclass: 'Samurai' }).find(rule => rule.key === 'samurai_fighting_spirit')).toMatchObject({ maxValue: 3, restore: 'long-rest' });
    expect(getClassResourceRules({ ...fighter, level: 3, subclass: 'Champion' }).find(rule => rule.key === 'samurai_fighting_spirit')).toBeUndefined();
  });

  test('fighter Indomitable scales by level', () => {
    expect(getClassResourceRules({ ...fighter, level: 8 }).find(rule => rule.key === 'indomitable')).toBeUndefined();
    expect(getClassResourceRules({ ...fighter, level: 9 }).find(rule => rule.key === 'indomitable')).toMatchObject({ maxValue: 1 });
    expect(getClassResourceRules({ ...fighter, level: 13 }).find(rule => rule.key === 'indomitable')).toMatchObject({ maxValue: 2 });
    expect(getClassResourceRules({ ...fighter, level: 17 }).find(rule => rule.key === 'indomitable')).toMatchObject({ maxValue: 3 });
  });

  test('long rest restores fighter resources and updates stale maximums', () => {
    const restored = restoreClassResources({
      ...fighter,
      rules_edition: '2024',
      level: 17,
      resources: {
        second_wind: { current: 0, remaining: 0, max: 2, restore: 'long-rest' },
        action_surge: { current: 0, remaining: 0, max: 1, restore: 'short-rest' },
        indomitable: { current: 0, remaining: 0, max: 1, restore: 'long-rest' },
      },
    }, 'long-rest');

    expect(restored.second_wind).toMatchObject({ current: 6, remaining: 6, max: 6 });
    expect(restored.action_surge).toMatchObject({ current: 2, remaining: 2, max: 2 });
    expect(restored.indomitable).toMatchObject({ current: 3, remaining: 3, max: 3 });
  });
});

describe('Cleric class resources', () => {
  test('2014 Cleric Channel Divinity uses Cleric level scaling', () => {
    expect(getClassResourceRules({ character_class: 'Cleric', level: 1, rules_edition: '2014' }).find(rule => rule.key === 'channel_divinity')).toBeUndefined();
    expect(getClassResourceRules({ character_class: 'Cleric', level: 2, rules_edition: '2014' }).find(rule => rule.key === 'channel_divinity')).toMatchObject({ maxValue: 1 });
    expect(getClassResourceRules({ character_class: 'Cleric', level: 6, rules_edition: '2014' }).find(rule => rule.key === 'channel_divinity')).toMatchObject({ maxValue: 2 });
    expect(getClassResourceRules({ character_class: 'Cleric', level: 18, rules_edition: '2014' }).find(rule => rule.key === 'channel_divinity')).toMatchObject({ maxValue: 3 });
  });

  test('2024 Cleric Channel Divinity follows revised scaling', () => {
    expect(getClassResourceRules({ character_class: 'Cleric', level: 2, rules_edition: '2024' }).find(rule => rule.key === 'channel_divinity')).toMatchObject({ maxValue: 2 });
    expect(getClassResourceRules({ character_class: 'Cleric', level: 7, rules_edition: '2024' }).find(rule => rule.key === 'channel_divinity')).toMatchObject({ maxValue: 4 });
    expect(getClassResourceRules({ character_class: 'Cleric', level: 20, rules_edition: '2024' }).find(rule => rule.key === 'channel_divinity')).toMatchObject({ maxValue: 10 });
  });

  test('multiclass Cleric resources use Cleric level instead of total character level', () => {
    const rules = getClassResourceRules({
      character_class: 'Fighter',
      level: 12,
      rules_edition: '2014',
      class_levels: { Fighter: 7, Cleric: 5 },
    });

    expect(rules.find(rule => rule.className === 'Cleric' && rule.key === 'channel_divinity')).toMatchObject({ maxValue: 1 });
    expect(rules.find(rule => rule.className === 'Fighter' && rule.key === 'action_surge')).toMatchObject({ maxValue: 1 });
  });
});

describe('Monk and Paladin class resources', () => {
  test('Monk and Paladin helpers are defined and class-level aware', () => {
    expect(getClassResourceRules({ character_class: 'Monk', level: 5, rules_edition: '2014' }).find(rule => rule.key === 'ki')).toMatchObject({ maxValue: 5 });
    expect(getClassResourceRules({ character_class: 'Paladin', level: 4, rules_edition: '2014' }).find(rule => rule.key === 'lay_on_hands')).toMatchObject({ maxValue: 20 });
  });
});

describe('Bard, Sorcerer, and Warlock multiclass resources', () => {
  test('Bard restore timing uses Bard level rather than total character level', () => {
    const rules = getClassResourceRules({
      character_class: 'Fighter',
      level: 10,
      rules_edition: '2014',
      charisma: 16,
      class_levels: { Fighter: 7, Bard: 3 },
    });

    expect(rules.find(rule => rule.className === 'Bard' && rule.key === 'bardic_inspiration')).toMatchObject({
      maxValue: 3,
      restore: 'long-rest',
    });
  });

  test('Sorcery Points use Sorcerer level rather than total character level', () => {
    const rules = getClassResourceRules({
      character_class: 'Fighter',
      level: 10,
      rules_edition: '2014',
      class_levels: { Fighter: 8, Sorcerer: 2 },
    });

    expect(rules.find(rule => rule.className === 'Sorcerer' && rule.key === 'sorcery_points')).toMatchObject({ maxValue: 2 });
  });

  test('Warlock Pact Magic uses Warlock level rather than total character level', () => {
    const rules = getClassResourceRules({
      character_class: 'Fighter',
      level: 10,
      rules_edition: '2014',
      class_levels: { Fighter: 9, Warlock: 1 },
    });

    expect(rules.find(rule => rule.className === 'Warlock' && rule.key === 'pact_magic')).toMatchObject({ maxValue: 1 });
  });
});
