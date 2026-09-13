import {
  buildLegacyPreparedMigrationPlan,
  buildLegacyPreparedMigrationUpdates,
  getCharacterPreparedCapacity,
  getCharacterSpellListMode,
  getSpellListDestination,
  getSpellListLabel,
  normaliseCharacterClassLevels,
  spellBelongsToClass,
  tagSpellSource,
} from './characterSpellListRules';

describe('character sheet spell list rules', () => {
  test.each([
    ['2014', 'Bard', 'known', 'spells_known'],
    ['2024', 'Bard', 'prepared', 'spells_prepared'],
    ['2014', 'Ranger', 'known', 'spells_known'],
    ['2024', 'Ranger', 'prepared', 'spells_prepared'],
    ['2014', 'Sorcerer', 'known', 'spells_known'],
    ['2024', 'Sorcerer', 'prepared', 'spells_prepared'],
    ['2014', 'Warlock', 'known', 'spells_known'],
    ['2024', 'Warlock', 'prepared', 'spells_prepared'],
    ['2014', 'Cleric', 'prepared', 'spells_prepared'],
    ['2024', 'Cleric', 'prepared', 'spells_prepared'],
    ['2014', 'Wizard', 'spellbook', 'spellbook'],
    ['2024', 'Wizard', 'spellbook', 'spellbook'],
  ])('%s %s routes levelled spells to the right sheet list', (edition, className, mode, destination) => {
    const character = { rules_edition: edition, character_class: className };
    expect(getCharacterSpellListMode(character, className)).toBe(mode);
    expect(getSpellListDestination(character, className, 1)).toBe(destination);
  });

  test('cantrips always use the cantrip list regardless of caster model', () => {
    expect(getSpellListDestination({ rules_edition: '2024' }, 'Wizard', 0)).toBe('cantrips_known');
    expect(getSpellListDestination({ rules_edition: '2014' }, 'Bard', 0)).toBe('cantrips_known');
  });

  test('labels communicate prepared, known and spellbook storage correctly', () => {
    expect(getSpellListLabel({ rules_edition: '2024' }, 'Bard')).toBe('Prepared');
    expect(getSpellListLabel({ rules_edition: '2014' }, 'Bard')).toBe('Known');
    expect(getSpellListLabel({ rules_edition: '2024' }, 'Wizard')).toBe('Spellbook');
  });

  test('prepared capacity is edition aware', () => {
    expect(getCharacterPreparedCapacity({ rules_edition: '2024', wisdom: 8 }, 'Ranger', 2)).toBe(3);
    expect(getCharacterPreparedCapacity({ rules_edition: '2014', charisma: 18 }, 'Paladin', 5)).toBe(6);
  });

  test('new spell entries retain their source class for multiclass sheets', () => {
    expect(tagSpellSource({ name: 'Shield', level: 1 }, 'Wizard')).toMatchObject({ name: 'Shield', sourceClass: 'Wizard' });
    expect(spellBelongsToClass({ name: 'Shield', sourceClass: 'Wizard' }, 'Wizard')).toBe(true);
    expect(spellBelongsToClass({ name: 'Shield', sourceClass: 'Wizard' }, 'Bard')).toBe(false);
  });

  test('legacy untagged spell entries remain visible rather than disappearing', () => {
    expect(spellBelongsToClass({ name: 'Legacy Spell' }, 'Wizard')).toBe(true);
  });

  test('class levels normalise map, array and single-class save shapes', () => {
    expect(normaliseCharacterClassLevels({ class_levels: { bard: 3, Wizard: 2 } })).toEqual({ Bard: 3, Wizard: 2 });
    expect(normaliseCharacterClassLevels({ classes: [{ name: 'Warlock', level: 4 }] })).toEqual({ Warlock: 4 });
    expect(normaliseCharacterClassLevels({ character_class: 'Ranger', level: 5 })).toEqual({ Ranger: 5 });
  });

  test('single 2024 prepared caster can safely surface and migrate legacy known spells', () => {
    const character = {
      rules_edition: '2024',
      character_class: 'Warlock',
      level: 3,
      class_levels: { Warlock: 3 },
      charisma: 16,
      spells_known: [
        { name: 'Hex', level: 1 },
        { name: 'Armor of Agathys', level: 1 },
        { name: 'Misty Step', level: 2 },
        { name: 'Hold Person', level: 2 },
      ],
      spells_prepared: [],
    };
    const plan = buildLegacyPreparedMigrationPlan(character);
    expect(plan.hasMigration).toBe(true);
    expect(plan.ambiguous).toBe(false);
    expect(plan.safeCandidates[0]).toMatchObject({ className: 'Warlock', count: 4, capacity: 4, safe: true });
    expect(plan.effectivePrepared.map((spell) => spell.name)).toEqual(['Hex', 'Armor of Agathys', 'Misty Step', 'Hold Person']);
    expect(plan.effectivePrepared.every((spell) => spell.sourceClass === 'Warlock')).toBe(true);

    const updates = buildLegacyPreparedMigrationUpdates(character);
    expect(updates.spells_prepared).toEqual(updates.prepared_spells);
    expect(updates.spells_prepared).toEqual(updates.preparedSpells);
    expect(character.spells_known).toHaveLength(4); // migration helper never deletes the legacy list
  });

  test('over-capacity legacy prepared migration is surfaced but not auto-applied', () => {
    const character = {
      rules_edition: '2024',
      character_class: 'Ranger',
      level: 1,
      class_levels: { Ranger: 1 },
      wisdom: 10,
      spells_known: [
        { name: 'A', level: 1 },
        { name: 'B', level: 1 },
        { name: 'C', level: 1 },
      ],
    };
    const plan = buildLegacyPreparedMigrationPlan(character);
    expect(plan.hasOverflow).toBe(true);
    expect(plan.hasMigration).toBe(false);
    expect(plan.candidates[0]).toMatchObject({ className: 'Ranger', capacity: 2, count: 3, overflow: 1, safe: false });
    expect(buildLegacyPreparedMigrationUpdates(character)).toBeNull();
  });

  test('untagged multiclass legacy spells are not guessed between multiple prepared classes', () => {
    const character = {
      rules_edition: '2024',
      character_class: 'Bard',
      level: 5,
      class_levels: { Bard: 3, Warlock: 2 },
      charisma: 16,
      spells_known: [{ name: 'Legacy Unknown Source', level: 1 }],
      spells_prepared: [],
    };
    const plan = buildLegacyPreparedMigrationPlan(character);
    expect(plan.ambiguous).toBe(true);
    expect(plan.hasMigration).toBe(false);
    expect(plan.effectivePrepared).toEqual([]);
  });

  test('source-tagged multiclass legacy spells migrate to their own prepared class', () => {
    const character = {
      rules_edition: '2024',
      character_class: 'Bard',
      level: 5,
      class_levels: { Bard: 3, Warlock: 2 },
      charisma: 16,
      spells_known: [
        { name: 'Healing Word', level: 1, sourceClass: 'Bard' },
        { name: 'Hex', level: 1, sourceClass: 'Warlock' },
      ],
      spells_prepared: [],
    };
    const plan = buildLegacyPreparedMigrationPlan(character);
    expect(plan.hasMigration).toBe(true);
    expect(plan.safeCandidates.map((candidate) => candidate.className)).toEqual(['Bard', 'Warlock']);
    expect(plan.effectivePrepared.map((spell) => `${spell.sourceClass}:${spell.name}`)).toEqual([
      'Bard:Healing Word',
      'Warlock:Hex',
    ]);
  });

  test('2014 known-spell saves never produce revised prepared migration work', () => {
    const plan = buildLegacyPreparedMigrationPlan({
      rules_edition: '2014',
      character_class: 'Warlock',
      level: 3,
      spells_known: [{ name: 'Hex' }],
    });
    expect(plan.hasMigration).toBe(false);
    expect(plan.candidates).toEqual([]);
  });
});
