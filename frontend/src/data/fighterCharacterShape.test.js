import { hasFighterClassLevel, isFighterCharacter, normaliseCharacterClassName } from './fighterCharacterShape';

describe('Fighter character shape helpers', () => {
  test('normalises class names', () => {
    expect(normaliseCharacterClassName(' Fighter ')).toBe('fighter');
    expect(normaliseCharacterClassName('Battle Master')).toBe('battlemaster');
  });

  test('detects direct Fighter class names', () => {
    expect(isFighterCharacter({ character_class: 'Fighter' })).toBe(true);
    expect(isFighterCharacter({ className: 'Fighter' })).toBe(true);
    expect(isFighterCharacter({ class: 'Fighter' })).toBe(true);
    expect(isFighterCharacter({ character_class: 'Wizard' })).toBe(false);
  });

  test('detects direct Fighter level fields', () => {
    expect(hasFighterClassLevel({ fighter_level: 3 })).toBe(true);
    expect(hasFighterClassLevel({ fighterLevel: 3 })).toBe(true);
  });

  test('detects Fighter level maps and class arrays', () => {
    expect(isFighterCharacter({ class_levels: { fighter: 3 } })).toBe(true);
    expect(isFighterCharacter({ classLevels: { Fighter: 3 } })).toBe(true);
    expect(isFighterCharacter({ multiclass_levels: { Fighter: 3 } })).toBe(true);
    expect(isFighterCharacter({ classes: [{ name: 'Wizard', level: 14 }, { name: 'Fighter', level: 3 }] })).toBe(true);
  });
});
