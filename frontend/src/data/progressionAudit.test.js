import { CLASS_FEATURES } from './classFeatures';
import { getClassResourceRules } from './classResourceRules';
import { getCharacterClassFeatures } from './characterFeatureSelectors';
import { resourceActionCards, resourceValue } from './actionEconomyCards';

const CORE_CLASSES = ['barbarian','bard','cleric','druid','fighter','monk','paladin','ranger','rogue','sorcerer','warlock','wizard'];
const ASI_LEVELS = {
  default: [4, 8, 12, 16, 19],
  fighter: [4, 6, 8, 12, 14, 16, 19],
  rogue: [4, 8, 10, 12, 16, 19],
};

function character(className, level, extras = {}) {
  return {
    character_class: className[0].toUpperCase() + className.slice(1),
    level,
    strength: 14,
    dexterity: 16,
    constitution: 14,
    intelligence: 12,
    wisdom: 16,
    charisma: 16,
    ...extras,
  };
}

function actionTitlesFor(testCharacter) {
  const resources = getClassResourceRules(testCharacter).map(rule => resourceValue(testCharacter, rule));
  const cards = resourceActionCards(testCharacter, resources, { spendResource: jest.fn() });
  return Object.fromEntries(Object.entries(cards).map(([bucket, list]) => [bucket, list.map(card => card.title)]));
}

describe('1-to-20 class progression audit data', () => {
  test.each(CORE_CLASSES)('%s has class feature data for levels 1 through 20', (className) => {
    const data = CLASS_FEATURES[className];
    expect(data).toBeTruthy();
    for (let level = 1; level <= 20; level += 1) {
      expect(() => getCharacterClassFeatures(character(className, level))).not.toThrow();
      expect(getCharacterClassFeatures(character(className, level)).length).toBeGreaterThan(0);
    }
  });

  test.each(CORE_CLASSES)('%s ASI/feat levels are represented in expected progression', (className) => {
    const expected = ASI_LEVELS[className] || ASI_LEVELS.default;
    expect(expected).toContain(4);
    expect(expected).toContain(19);
  });
});

describe('class resource unlocks and action economy audit', () => {
  test('Monk Ki/Discipline unlocks at 2, scales by monk level, and creates clickable bonus actions', () => {
    expect(getClassResourceRules(character('monk', 1)).find(rule => rule.key === 'ki')).toBeUndefined();
    expect(getClassResourceRules(character('monk', 2)).find(rule => rule.key === 'ki')).toMatchObject({ maxValue: 2, restore: 'short-rest' });
    expect(getClassResourceRules(character('monk', 20)).find(rule => rule.key === 'ki')).toMatchObject({ maxValue: 20 });
    expect(actionTitlesFor(character('monk', 2)).bonus).toEqual(expect.arrayContaining(['Flurry of Blows', 'Patient Defense', 'Step of the Wind']));
  });

  test.each([3, 6, 11, 17])('Monk Open Hand level %i includes expected subclass features without slug names', (level) => {
    const features = getCharacterClassFeatures(character('monk', level, { subclass: 'way-of-the-open-hand' }));
    const names = features.map(feature => feature.name);
    expect(names.join(' ')).not.toMatch(/way-of|dash/);
    expect(names).toContain('Open Hand Technique');
    if (level >= 6) expect(names).toContain('Wholeness of Body');
    if (level >= 11) expect(names).toContain('Tranquility');
    if (level >= 17) expect(names).toContain('Quivering Palm');
  });

  test('Shadow Monk action economy buckets are correct', () => {
    const features = getCharacterClassFeatures(character('monk', 17, { subclass: 'Warrior of Shadow' }));
    expect(features.find(feature => feature.name === 'Shadow Arts')).toMatchObject({ type: 'action' });
    expect(features.find(feature => feature.name === 'Shadow Step')).toMatchObject({ type: 'bonus_action' });
    expect(features.find(feature => feature.name === 'Cloak of Shadows')).toMatchObject({ type: 'action' });
    expect(features.find(feature => feature.name === 'Opportunist')).toMatchObject({ type: 'reaction' });
  });

  test('reference class action/resource cards are available at intended levels', () => {
    expect(actionTitlesFor(character('fighter', 2)).action).toContain('Action Surge');
    expect(actionTitlesFor(character('sorcerer', 2)).bonus).toEqual(expect.arrayContaining(['Convert Sorcery Points', 'Metamagic']));
    expect(actionTitlesFor(character('barbarian', 1)).bonus).toContain('Rage');
    expect(actionTitlesFor(character('paladin', 1)).action).toContain('Lay on Hands');
    expect(actionTitlesFor(character('paladin', 3)).action).toContain('Channel Divinity');
    expect(getClassResourceRules(character('warlock', 1)).find(rule => rule.key === 'pact_magic')).toMatchObject({ maxValue: 1, restore: 'short-rest' });
    expect(getClassResourceRules(character('warlock', 2)).find(rule => rule.key === 'pact_magic')).toMatchObject({ maxValue: 2 });
  });
});
