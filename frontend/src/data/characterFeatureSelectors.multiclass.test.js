/**
 * Review finding 9: a multiclass character's features come from each
 * class's own level, not the total level applied to the primary class.
 */
import { getCharacterClassFeatures } from './characterFeatureSelectors';

const names = (features) => features.map((feature) => feature.name);

test('Fighter 1 / Wizard 10 gets no Action Surge, Extra Attack or Indomitable', () => {
  const character = { character_class: 'Fighter', level: 11, class_levels: { Fighter: 1, Wizard: 10 } };
  const features = getCharacterClassFeatures(character, '2014');
  const fighter = features.filter((feature) => feature.sourceClass === 'Fighter');
  expect(names(fighter)).not.toEqual(expect.arrayContaining(['Action Surge']));
  expect(names(features)).not.toContain('Extra Attack');
  expect(names(features)).not.toContain('Indomitable');
  expect(fighter.every((feature) => Number(feature.level || 1) <= 1)).toBe(true);
});

test('the secondary class contributes its own features at its own level', () => {
  const character = { character_class: 'Fighter', level: 11, class_levels: { Fighter: 1, Wizard: 10 } };
  const wizard = getCharacterClassFeatures(character, '2014').filter((feature) => feature.sourceClass === 'Wizard');
  expect(wizard.length).toBeGreaterThan(0);
  expect(wizard.every((feature) => Number(feature.level || 1) <= 10)).toBe(true);
});

test('a classes array with per-class subclasses works the same way', () => {
  const character = {
    character_class: 'Fighter', level: 11,
    classes: [{ name: 'Fighter', level: 1 }, { name: 'Wizard', level: 10, subclass: 'School of Evocation' }],
  };
  expect(names(getCharacterClassFeatures(character, '2014'))).not.toContain('Action Surge');
});

test('a single-class character is unchanged: Fighter 5 has Action Surge and Extra Attack', () => {
  const features = names(getCharacterClassFeatures({ character_class: 'Fighter', level: 5 }, '2014'));
  expect(features).toEqual(expect.arrayContaining(['Action Surge', 'Extra Attack']));
});

test('the sheet feature summary (classic Traits) uses class levels too', () => {
  // eslint-disable-next-line global-require
  const { buildClassFeatureSummary } = require('../components/clean-sheet/sheetFeatureSummary');
  const summary = buildClassFeatureSummary({ character_class: 'Fighter', level: 11, class_levels: { Fighter: 1, Wizard: 10 } }, '2014');
  expect(names(summary)).not.toContain('Action Surge');
  expect(names(summary)).not.toContain('Extra Attack');
});
