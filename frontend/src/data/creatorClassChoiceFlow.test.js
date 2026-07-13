import {
  FIGHTER_FIGHTING_STYLES,
  buildFighterFightingStyleFeature,
  getMissingClassChoiceMessages,
  isClassChoiceComplete,
  isFighterFightingStyleRequired,
  mergeClassChoiceFeatures,
} from './creatorClassChoiceFlow';

describe('creator class choice flow', () => {
  test('requires a Fighter fighting style at level 1', () => {
    expect(isFighterFightingStyleRequired({ className: 'Fighter', level: 1 })).toBe(true);
    expect(isFighterFightingStyleRequired({ className: 'Fighter', level: 2 })).toBe(false);
    expect(isFighterFightingStyleRequired({ className: 'Wizard', level: 1 })).toBe(false);
  });

  test('exposes the supported Fighter fighting styles', () => {
    expect(FIGHTER_FIGHTING_STYLES).toEqual([
      'Archery',
      'Defense',
      'Dueling',
      'Great Weapon Fighting',
      'Protection',
      'Two-Weapon Fighting',
    ]);
  });

  test('blocks Fighter completion until a fighting style is selected', () => {
    expect(getMissingClassChoiceMessages({ className: 'Fighter', level: 1, choices: {} })).toEqual([
      'Choose a Fighter fighting style.',
    ]);
    expect(isClassChoiceComplete({ className: 'Fighter', level: 1, choices: {} })).toBe(false);
    expect(isClassChoiceComplete({ className: 'Fighter', level: 1, choices: { fighterFightingStyle: 'Defense' } })).toBe(true);
  });

  test('builds the Fighter fighting style feature for the saved sheet', () => {
    expect(buildFighterFightingStyleFeature('Defense')).toEqual({
      name: 'Fighting Style: Defense',
      description: 'Fighter level 1 fighting style: Defense.',
    });
  });

  test('merges the selected fighting style into class features', () => {
    const features = mergeClassChoiceFeatures({
      className: 'Fighter',
      baseFeatures: [
        { name: 'Fighting Style', description: 'Generic class feature.' },
        { name: 'Second Wind', description: 'Fighter feature gained at level 1.' },
      ],
      choices: { fighterFightingStyle: 'Defense' },
    });

    expect(features).toEqual([
      { name: 'Fighting Style: Defense', description: 'Fighter level 1 fighting style: Defense.' },
      { name: 'Second Wind', description: 'Fighter feature gained at level 1.' },
    ]);
  });
});
