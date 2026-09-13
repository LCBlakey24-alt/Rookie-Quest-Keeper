import {
  buildInitialClassResources,
  getClassResourceRules,
  restoreClassResources,
  warlockPactShape,
} from './classResourceRules';

describe('clean-sheet Pact Magic scaling', () => {
  test.each([
    [1, 1, 1],
    [2, 2, 1],
    [3, 2, 2],
    [5, 2, 3],
    [7, 2, 4],
    [9, 2, 5],
    [11, 3, 5],
    [17, 4, 5],
    [20, 4, 5],
  ])('Warlock %i has %i Pact slots at slot level %i', (level, slots, slotLevel) => {
    const character = { character_class: 'Warlock', level, rules_edition: '2014' };
    expect(warlockPactShape(character)).toEqual({ slots, slotLevel });
    expect(getClassResourceRules(character).find(rule => rule.key === 'pact_magic')).toMatchObject({
      maxValue: slots,
      slotLevelValue: slotLevel,
      restore: 'short-rest',
    });
  });

  test('initial Warlock tracker persists slot level metadata at high levels', () => {
    expect(buildInitialClassResources({
      character_class: 'Warlock',
      level: 17,
      rules_edition: '2014',
    }).pact_magic).toMatchObject({
      current: 4,
      remaining: 4,
      max: 4,
      slot_level: 5,
      restore: 'short-rest',
      className: 'Warlock',
    });
  });

  test('short rest repairs stale Pact maximum and slot-level metadata', () => {
    const restored = restoreClassResources({
      character_class: 'Warlock',
      level: 11,
      rules_edition: '2014',
      resources: {
        pact_magic: {
          label: 'Pact Magic',
          current: 0,
          remaining: 0,
          max: 2,
          slot_level: 4,
          restore: 'short-rest',
        },
      },
    }, 'short-rest');

    expect(restored.pact_magic).toMatchObject({
      current: 3,
      remaining: 3,
      max: 3,
      slot_level: 5,
      restore: 'short-rest',
    });
  });

  test('multiclass Warlock uses Warlock level rather than total level', () => {
    const rules = getClassResourceRules({
      character_class: 'Fighter',
      level: 18,
      class_levels: { Fighter: 7, Warlock: 11 },
      rules_edition: '2014',
    });

    expect(rules.find(rule => rule.className === 'Warlock' && rule.key === 'pact_magic')).toMatchObject({
      maxValue: 3,
      slotLevelValue: 5,
    });
  });
});
