import { getCharacterHeaderClassLabel } from './CleanSheetHeader';

describe('CleanSheetHeader class progression label', () => {
  test('keeps a single class and subclass concise', () => {
    expect(getCharacterHeaderClassLabel({
      character_class: 'fighter',
      subclass: 'champion',
      level: 5,
      class_levels: { fighter: 5 },
    })).toBe('Fighter (Champion)');
  });

  test('shows every multiclass level instead of only the primary class', () => {
    expect(getCharacterHeaderClassLabel({
      character_class: 'fighter',
      subclass: 'champion',
      level: 5,
      class_levels: { fighter: 3, wizard: 2 },
    })).toBe('Fighter 3 (Champion) / Wizard 2');
  });

  test('uses per-class subclass metadata when saved on multiclass rows', () => {
    expect(getCharacterHeaderClassLabel({
      character_class: 'fighter',
      level: 8,
      multiclass_levels: { fighter: 5, rogue: 3 },
      classes: [
        { name: 'fighter', level: 5, subclass: 'battle_master' },
        { name: 'rogue', level: 3, subclass: 'thief' },
      ],
    })).toBe('Fighter 5 (Battle Master) / Rogue 3 (Thief)');
  });

  test('ignores zero-level legacy entries', () => {
    expect(getCharacterHeaderClassLabel({
      character_class: 'wizard',
      level: 4,
      class_levels: { wizard: 4, fighter: 0 },
    })).toBe('Wizard');
  });
});
