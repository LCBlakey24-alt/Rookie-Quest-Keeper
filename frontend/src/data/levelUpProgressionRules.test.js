import {
  classLevelFor,
  needsSubclassChoice,
  normaliseClassLevels,
  resolveExistingClassName,
  subclassForClass,
  subclassUnlockLevel,
} from './levelUpProgressionRules';

describe('class-aware level-up progression helpers', () => {
  const multiclass = {
    character_class: 'Fighter',
    subclass: 'Champion',
    level: 5,
    class_levels: { Fighter: 3, Wizard: 2 },
    classes: [
      { name: 'Fighter', level: 3, subclass: 'Champion' },
      { name: 'Wizard', level: 2, subclass: 'Evocation' },
    ],
  };

  test('reads every existing class from class_levels', () => {
    expect(normaliseClassLevels(multiclass)).toEqual({ Fighter: 3, Wizard: 2 });
    expect(classLevelFor(multiclass, 'wizard')).toBe(2);
  });

  test('resolves secondary-class subclass independently of primary subclass', () => {
    expect(subclassForClass(multiclass, 'Fighter')).toBe('Champion');
    expect(subclassForClass(multiclass, 'Wizard')).toBe('Evocation');
  });

  test('2014 and 2024 subclass unlock levels differ where expected', () => {
    expect(subclassUnlockLevel('Warlock', '2014')).toBe(1);
    expect(subclassUnlockLevel('Wizard', '2014')).toBe(2);
    expect(subclassUnlockLevel('Fighter', '2014')).toBe(3);
    expect(subclassUnlockLevel('Warlock', '2024')).toBe(3);
  });

  test('new 2014 warlock multiclass needs a subclass immediately', () => {
    expect(needsSubclassChoice({
      character: multiclass,
      className: 'Warlock',
      classLevelAfter: 1,
      edition: '2014',
    })).toBe(true);
  });

  test('existing class with subclass does not ask again', () => {
    expect(needsSubclassChoice({
      character: multiclass,
      className: 'Wizard',
      classLevelAfter: 3,
      edition: '2014',
    })).toBe(false);
  });

  test('class selection is case-insensitive and defaults to a real owned class', () => {
    expect(resolveExistingClassName(multiclass, 'wizard')).toBe('Wizard');
    expect(resolveExistingClassName(multiclass, 'not-a-class')).toBe('Fighter');
  });
});
