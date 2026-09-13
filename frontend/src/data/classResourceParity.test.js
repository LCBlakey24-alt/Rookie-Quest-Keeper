import { getClassResourceRules } from './classResourceRules';
import { resourceSpecs } from './characterClassResources';

const normalisePersistedSpecs = (specs = {}) => Object.fromEntries(
  Object.entries(specs).map(([key, spec]) => [key, {
    max: Number(spec.max || 0),
    restore: spec.restore || '',
    shortRestRestore: Number(spec.short_rest_restore || 0),
    slotLevel: Number(spec.slot_level || 0),
  }]),
);

const normaliseSheetRules = (rules = []) => Object.fromEntries(
  rules.map((rule) => [rule.key, {
    max: Number(rule.maxValue || 0),
    restore: rule.restore || '',
    shortRestRestore: Number(rule.shortRestRestoreValue || 0),
    slotLevel: Number(rule.slotLevelValue || 0),
  }]),
);

const singleClassCases = [
  ['Barbarian', 20, '2014', {}],
  ['Barbarian', 17, '2024', {}],
  ['Bard', 5, '2014', { charisma: 18 }],
  ['Bard', 5, '2024', { charisma: 18 }],
  ['Cleric', 18, '2014', {}],
  ['Cleric', 18, '2024', {}],
  ['Druid', 20, '2014', {}],
  ['Druid', 17, '2024', {}],
  ['Fighter', 17, '2014', {}],
  ['Fighter', 17, '2024', {}],
  ['Monk', 5, '2014', {}],
  ['Monk', 5, '2024', {}],
  ['Paladin', 11, '2014', {}],
  ['Paladin', 11, '2024', {}],
  ['Ranger', 17, '2024', {}],
  ['Sorcerer', 5, '2014', {}],
  ['Sorcerer', 5, '2024', {}],
  ['Warlock', 17, '2014', {}],
  ['Warlock', 17, '2024', {}],
  ['Wizard', 5, '2014', {}],
  ['Wizard', 5, '2024', {}],
];

describe('class resource persistence and character-sheet parity', () => {
  test.each(singleClassCases)(
    '%s level %i (%s) uses the same resource shape in persistence and the sheet',
    (className, classLevel, edition, extras) => {
      const character = {
        character_class: className,
        level: classLevel,
        edition,
        rules_edition: edition,
        ...extras,
      };
      const persisted = normalisePersistedSpecs(resourceSpecs(character, { [className]: classLevel }));
      const sheet = normaliseSheetRules(getClassResourceRules(character));

      expect(sheet).toEqual(persisted);
    },
  );

  test.each(['2014', '2024'])(
    'Cleric / Paladin multiclass Channel Divinity stays aligned in %s rules',
    (edition) => {
      const classLevels = { Cleric: 6, Paladin: 3 };
      const character = {
        character_class: 'Cleric',
        level: 9,
        edition,
        rules_edition: edition,
        class_levels: classLevels,
      };
      const persisted = normalisePersistedSpecs(resourceSpecs(character, classLevels));
      const sheet = normaliseSheetRules(getClassResourceRules(character));

      expect(sheet).toEqual(persisted);
    },
  );
});
