import { isFighterCharacter, normaliseCharacterClassName } from './fighterCharacterShape';

describe('Fighter character shape extra coverage', () => {
  test('normalises punctuation and spacing in class names', () => {
    expect(normaliseCharacterClassName('  Fighter!! ')).toBe('fighter');
    expect(normaliseCharacterClassName('Battle-Master')).toBe('battlemaster');
  });

  test('ignores empty class arrays and unknown class names', () => {
    expect(isFighterCharacter({ classes: [] })).toBe(false);
    expect(isFighterCharacter({ className: 'Not Fighter' })).toBe(false);
  });

  test('detects Fighter class entries with alternate class name keys', () => {
    expect(isFighterCharacter({ classes: [{ class_name: 'Fighter', level: 3 }] })).toBe(true);
    expect(isFighterCharacter({ classes: [{ className: 'Fighter', level: 3 }] })).toBe(true);
    expect(isFighterCharacter({ classes: [{ class: 'Fighter', level: 3 }] })).toBe(true);
  });
});
