import {
  buildSavedCustomCasterRow,
  customCasterNumbers,
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

  test('follows level-ups and ability increases instead of the numbers saved at creation', () => {
    // Saved at level 1 with INT 16 (DC 13, +5); now level 5 (PB 3) with INT 18.
    const row = buildSavedCustomCasterRow({
      character_class: 'Runesmith', level: 5, intelligence: 18,
      spellcasting_ability: 'intelligence', spell_save_dc: 13, spell_attack_bonus: 5,
      spells_known: [{ name: 'Rune Bolt' }],
    }, 'Runesmith', 5, 3);
    expect(row.saveDc).toBe(15);
    expect(row.attackBonus).toBe(7);
  });

  test('reads abbreviated abilities and scores kept under stats', () => {
    expect(customCasterNumbers({ spellcasting_ability: 'CHA', stats: { charisma: 14 } }, 2))
      .toEqual({ ability: 'charisma', modifier: 2, saveDc: 12, attackBonus: 4 });
  });

  test('without an ability, falls back to a real saved DC and never shows a 0 placeholder', () => {
    expect(customCasterNumbers({ spell_save_dc: 14, spell_attack_bonus: 6 }, 2)).toMatchObject({ saveDc: 14, attackBonus: 6 });
    expect(customCasterNumbers({ spell_save_dc: 0, spell_attack_bonus: 0 }, 2)).toMatchObject({ saveDc: null, attackBonus: null });
  });
});
