import {
  buildSavedCustomCasterRow,
  hasSavedCustomSpellcasting,
  inferSavedSpellListMode,
} from './savedCustomSpellcastingPresentation';

describe('saved custom spellcasting presentation', () => {
  test('detects custom caster data from saved spell fields', () => {
    expect(hasSavedCustomSpellcasting({
      character_class: 'Runesmith',
      spell_slots: { 1: 2 },
    })).toBe(true);

    expect(hasSavedCustomSpellcasting({
      character_class: 'Warden',
    })).toBe(false);
  });

  test('infers the saved list style without inventing a class rule', () => {
    expect(inferSavedSpellListMode({ spellbook: [{ name: 'Shield' }] })).toBe('spellbook');
    expect(inferSavedSpellListMode({ spells_prepared: [{ name: 'Cure Wounds' }] })).toBe('prepared');
    expect(inferSavedSpellListMode({ spells_known: [{ name: 'Hex' }] })).toBe('known');
  });

  test('builds a caster row from persisted homebrew spellcasting math', () => {
    expect(buildSavedCustomCasterRow({
      character_class: 'Runesmith',
      level: 3,
      intelligence: 16,
      spellcasting_ability: 'intelligence',
      spell_save_dc: 13,
      spell_attack_bonus: 5,
      spell_slots: { 1: 4, 2: 2 },
      spells_known: [{ name: 'Rune Bolt' }],
    }, 'Runesmith', 3, 2)).toEqual({
      className: 'Runesmith',
      level: 3,
      ability: 'intelligence',
      abilityLabel: 'INT',
      saveDc: 13,
      attackBonus: 5,
      listMode: 'known',
      listLabel: 'Known spells',
      preparedCapacity: 0,
      castingType: 'Homebrew · Known spells',
      homebrew: true,
    });
  });

  test('does not assign primary saved caster data to another multiclass entry', () => {
    expect(buildSavedCustomCasterRow({
      character_class: 'Wizard',
      spellcasting_ability: 'intelligence',
      spell_slots: { 1: 2 },
    }, 'Runesmith', 1, 2)).toBeNull();
  });
});
