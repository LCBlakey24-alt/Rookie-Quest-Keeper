import {
  mergeCharacterClassResources,
  resourceSpecs,
} from './characterClassResources';
import {
  buildInitialClassResources,
  getClassResourceRules,
  restoreClassResources,
} from './classResourceRules';

const dualCharacter = (edition, overrides = {}) => ({
  character_class: 'Cleric',
  level: 10,
  rules_edition: edition,
  class_levels: { Cleric: 6, Paladin: 4 },
  classes: [
    { name: 'Cleric', level: 6 },
    { name: 'Paladin', level: 4 },
  ],
  ...overrides,
});

describe('canonical Channel Divinity resource specs', () => {
  test('2014 Cleric and Paladin share one pool using the higher class-granted use count', () => {
    const specs = resourceSpecs({ edition: '2014' }, { Cleric: 6, Paladin: 4 });

    expect(specs.channel_divinity).toMatchObject({
      max: 2,
      restore: 'short-rest',
      className: 'Cleric / Paladin',
    });
    expect(specs.cleric_channel_divinity).toBeUndefined();
    expect(specs.paladin_channel_divinity).toBeUndefined();
  });

  test('2024 Cleric and Paladin keep separate class-scoped pools', () => {
    const specs = resourceSpecs({ edition: '2024' }, { Cleric: 6, Paladin: 3 });

    expect(specs.channel_divinity).toBeUndefined();
    expect(specs.cleric_channel_divinity).toMatchObject({
      label: 'Cleric Channel Divinity',
      max: 3,
      restore: 'long-rest',
      short_rest_restore: 1,
      className: 'Cleric',
    });
    expect(specs.paladin_channel_divinity).toMatchObject({
      label: 'Paladin Channel Divinity',
      max: 2,
      restore: 'long-rest',
      short_rest_restore: 1,
      className: 'Paladin',
    });
  });

  test('2024 single-class characters retain the stable unscoped key', () => {
    expect(resourceSpecs({ edition: '2024' }, { Cleric: 6 }).channel_divinity).toMatchObject({ max: 3, className: 'Cleric' });
    expect(resourceSpecs({ edition: '2024' }, { Paladin: 3 }).channel_divinity).toMatchObject({ max: 2, className: 'Paladin' });
  });
});

describe('character resource merging', () => {
  test('2014 shared pool is not overwritten by the Paladin class', () => {
    const resources = mergeCharacterClassResources(
      { edition: '2014', resources: {} },
      { Cleric: 6, Paladin: 4 },
    );

    expect(resources.channel_divinity).toMatchObject({ max: 2, current: 2, remaining: 2, className: 'Cleric / Paladin' });
  });

  test('2024 dual-class migration preserves spent Cleric uses and creates the Paladin pool', () => {
    const resources = mergeCharacterClassResources({
      edition: '2024',
      resources: {
        channel_divinity: {
          label: 'Channel Divinity',
          className: 'Cleric',
          max: 3,
          current: 1,
          remaining: 1,
          restore: 'long-rest',
          short_rest_restore: 1,
        },
      },
    }, { Cleric: 6, Paladin: 3 });

    expect(resources.channel_divinity).toBeUndefined();
    expect(resources.cleric_channel_divinity).toMatchObject({
      max: 3,
      current: 1,
      remaining: 1,
      migration_source: 'legacy_channel_divinity',
    });
    expect(resources.paladin_channel_divinity).toMatchObject({ max: 2, current: 2, remaining: 2 });
  });

  test('ambiguous old 2024 dual-class tracker maps to the Paladin overwrite shape', () => {
    const resources = mergeCharacterClassResources({
      edition: '2024',
      resources: {
        channel_divinity: { max: 2, current: 0, remaining: 0, restore: 'long-rest' },
      },
    }, { Cleric: 2, Paladin: 3 });

    expect(resources.channel_divinity).toBeUndefined();
    expect(resources.paladin_channel_divinity).toMatchObject({ current: 0, remaining: 0, migration_source: 'legacy_channel_divinity' });
    expect(resources.cleric_channel_divinity).toMatchObject({ current: 2, remaining: 2 });
  });
});

describe('clean-sheet resource rules', () => {
  test('2014 dual-class rules collapse to one shared Channel Divinity tracker', () => {
    const rules = getClassResourceRules(dualCharacter('2014'));
    const channelRules = rules.filter(rule => rule.key.includes('channel_divinity'));

    expect(channelRules).toHaveLength(1);
    expect(channelRules[0]).toMatchObject({
      key: 'channel_divinity',
      maxValue: 2,
      restore: 'short-rest',
      className: 'Cleric / Paladin',
    });
  });

  test('2024 dual-class rules expose two independent trackers', () => {
    const rules = getClassResourceRules(dualCharacter('2024'));

    expect(rules.find(rule => rule.key === 'cleric_channel_divinity')).toMatchObject({
      maxValue: 3,
      restore: 'long-rest',
      shortRestRestoreValue: 1,
      className: 'Cleric',
    });
    expect(rules.find(rule => rule.key === 'paladin_channel_divinity')).toMatchObject({
      maxValue: 2,
      restore: 'long-rest',
      shortRestRestoreValue: 1,
      className: 'Paladin',
    });
    expect(rules.find(rule => rule.key === 'channel_divinity')).toBeUndefined();
  });

  test('initial 2024 dual-class resources create both pools', () => {
    const resources = buildInitialClassResources(dualCharacter('2024'));

    expect(resources.channel_divinity).toBeUndefined();
    expect(resources.cleric_channel_divinity).toMatchObject({ max: 3, current: 3, remaining: 3 });
    expect(resources.paladin_channel_divinity).toMatchObject({ max: 2, current: 2, remaining: 2 });
  });

  test('2024 short rest restores one use to each independent pool', () => {
    const restored = restoreClassResources(dualCharacter('2024', {
      resources: {
        cleric_channel_divinity: { className: 'Cleric', max: 3, current: 0, remaining: 0, restore: 'long-rest', short_rest_restore: 1 },
        paladin_channel_divinity: { className: 'Paladin', max: 2, current: 0, remaining: 0, restore: 'long-rest', short_rest_restore: 1 },
      },
    }), 'short-rest');

    expect(restored.cleric_channel_divinity).toMatchObject({ max: 3, current: 1, remaining: 1 });
    expect(restored.paladin_channel_divinity).toMatchObject({ max: 2, current: 1, remaining: 1 });
  });

  test('rest repair migrates an old unscoped 2024 dual-class tracker before recovery', () => {
    const restored = restoreClassResources(dualCharacter('2024', {
      resources: {
        channel_divinity: {
          className: 'Cleric',
          max: 3,
          current: 0,
          remaining: 0,
          restore: 'long-rest',
          short_rest_restore: 1,
        },
      },
    }), 'short-rest');

    expect(restored.channel_divinity).toBeUndefined();
    expect(restored.cleric_channel_divinity).toMatchObject({ current: 1, remaining: 1, migration_source: 'legacy_channel_divinity' });
    expect(restored.paladin_channel_divinity).toMatchObject({ current: 1, remaining: 1 });
  });
});
