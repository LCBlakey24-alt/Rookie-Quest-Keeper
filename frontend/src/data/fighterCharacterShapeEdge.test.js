import { hasFighterClassLevel, isFighterCharacter } from './fighterCharacterShape';

describe('Fighter character shape edge cases', () => {
  test('does not treat zero or missing Fighter levels as active Fighter data', () => {
    expect(hasFighterClassLevel({ fighter_level: 0 })).toBe(false);
    expect(hasFighterClassLevel({ fighterLevel: 0 })).toBe(false);
    expect(hasFighterClassLevel({ class_levels: { fighter: 0 } })).toBe(false);
    expect(hasFighterClassLevel({ classLevels: { Fighter: 0 } })).toBe(false);
    expect(hasFighterClassLevel({ multiclass_levels: { Fighter: 0 } })).toBe(false);
  });

  test('does not treat non-Fighter class entries as Fighter data', () => {
    expect(isFighterCharacter({ classes: [{ name: 'Wizard', level: 14 }, { name: 'Rogue', level: 3 }] })).toBe(false);
  });
});
