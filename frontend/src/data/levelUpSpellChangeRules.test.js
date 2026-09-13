import {
  buildLevelUpSpellChanges,
  getLevelUpPreparedReplacementRule,
  legacyPreparedFallback,
  preparedSpellsForClass,
  spellNameSet,
} from './levelUpSpellChangeRules';

describe('level up spell change rules', () => {
  test.each(['Bard', 'Sorcerer', 'Warlock'])('2024 %s can replace one prepared spell on level up', (className) => {
    expect(getLevelUpPreparedReplacementRule({ className, edition: '2024' })).toEqual({
      cadence: 'level-up',
      maxReplacements: 1,
      allowed: true,
    });
  });

  test.each(['Cleric', 'Druid', 'Paladin', 'Ranger', 'Wizard'])('2024 %s does not expose a level-up replacement', (className) => {
    expect(getLevelUpPreparedReplacementRule({ className, edition: '2024' }).allowed).toBe(false);
  });

  test('server preflight rule wins over local fallback', () => {
    const rule = getLevelUpPreparedReplacementRule({
      className: 'Bard',
      edition: '2024',
      preflight: {
        progression_reference: {
          prepared_spell_change: { cadence: 'long-rest', max_replacements: 1 },
        },
      },
    });
    expect(rule).toEqual({ cadence: 'long-rest', maxReplacements: 1, allowed: false });
  });

  test('prepared spell list filters source-tagged multiclass entries without hiding legacy untagged spells', () => {
    const character = {
      spells_prepared: [
        { name: 'Healing Word', sourceClass: 'Bard' },
        { name: 'Shield', sourceClass: 'Wizard' },
        { name: 'Legacy Untagged' },
      ],
    };
    expect(preparedSpellsForClass(character, 'Bard').map((spell) => spell.name)).toEqual([
      'Healing Word',
      'Legacy Untagged',
    ]);
  });

  test('legacy 2024 known spell list can seed a missing prepared list non-destructively', () => {
    const fallback = legacyPreparedFallback({
      rules_edition: '2024',
      character_class: 'Warlock',
      spells_prepared: [],
      spells_known: [{ name: 'Hex' }, { name: 'Armor of Agathys' }],
    }, 'Warlock');
    expect(fallback.migrated).toBe(true);
    expect(fallback.spells.map((spell) => spell.name)).toEqual(['Hex', 'Armor of Agathys']);
  });

  test('2014 known casters never use the prepared fallback', () => {
    expect(legacyPreparedFallback({
      rules_edition: '2014',
      spells_known: [{ name: 'Hex' }],
    }, 'Warlock')).toEqual({ spells: [], migrated: false });
  });

  test('builds growth additions and one replacement in one backward-compatible new_spells array', () => {
    const payload = buildLevelUpSpellChanges({
      className: 'Bard',
      additions: [{ name: 'Hypnotic Pattern', level: 3 }],
      replacementFrom: 'Heat Metal',
      replacementTo: { name: 'Silence', level: 2 },
    });
    expect(payload).toEqual([
      { name: 'Hypnotic Pattern', level: 3, sourceClass: 'Bard' },
      { name: 'Silence', level: 2, sourceClass: 'Bard', replaces: 'Heat Metal' },
    ]);
  });

  test('spell name sets normalise punctuation and case', () => {
    expect(spellNameSet([{ name: 'Tasha’s Hideous Laughter' }]).has('tashashideouslaughter')).toBe(true);
  });
});
