import {
  getClericBuilderOptions,
  getClericBuilderSelectionList,
  getSelectedClericSubclass,
  isValidClericSubclass,
  validateClericBuilderSelections,
} from './clericBuilderOptions';
import { getClericBuilderChoiceSummary } from './clericBuilderChoiceSummary';
import { getClericBuilderReadiness } from './clericBuilderReadiness';
import {
  getClericSubclassByKey,
  getClericSubclassOptions,
  getClericSubclassSummary,
  isClericSubclassAvailable,
} from './clericSubclasses';

describe('Cleric subclass and builder readiness helpers', () => {
  test('returns 2014 Cleric subclass options', () => {
    const options = getClericSubclassOptions('2014');

    expect(options.map(option => option.key)).toEqual(expect.arrayContaining([
      'life_domain',
      'light_domain',
      'trickery_domain',
      'war_domain',
      'knowledge_domain',
      'nature_domain',
      'tempest_domain',
      'forge_domain',
      'grave_domain',
      'peace_domain',
      'twilight_domain',
    ]));
  });

  test('returns 2024 Cleric subclass options', () => {
    const options = getClericSubclassOptions('2024');

    expect(options.map(option => option.key)).toEqual(['life_domain', 'light_domain', 'trickery_domain', 'war_domain']);
  });

  test('finds and validates Cleric subclasses by key or name', () => {
    expect(getClericSubclassByKey('Life Domain', '2014')?.key).toBe('life_domain');
    expect(getClericSubclassByKey('tempest_domain', '2014')?.name).toBe('Tempest Domain');
    expect(isClericSubclassAvailable('Twilight Domain', '2014')).toBe(true);
    expect(isClericSubclassAvailable('Twilight Domain', '2024')).toBe(false);
    expect(isValidClericSubclass('War Domain', '2024')).toBe(true);
    expect(isValidClericSubclass('Forge Domain', '2024')).toBe(false);
  });

  test('summarises Cleric subclass progression', () => {
    const summary = getClericSubclassSummary('Life Domain', 6, '2014');

    expect(summary).toMatchObject({
      key: 'life_domain',
      name: 'Life Domain',
      level: 6,
      role: 'Healing and protective support',
      supportedInRuleset: true,
    });
    expect(summary.activeFeatureLevels).toEqual([1, 2, 6]);
    expect(summary.nextFeatureLevel).toBe(8);
  });

  test('returns Cleric builder options for 2014 and 2024 rules', () => {
    const options2014 = getClericBuilderOptions({ level: 1, edition: '2014' });
    const options2024 = getClericBuilderOptions({ level: 7, edition: '2024' });

    expect(options2014.subclassRequired).toBe(true);
    expect(options2014.divineOrderRequired).toBe(false);
    expect(options2014.blessedStrikesRequired).toBe(false);

    expect(options2024.subclassRequired).toBe(true);
    expect(options2024.divineOrderRequired).toBe(true);
    expect(options2024.blessedStrikesRequired).toBe(true);
    expect(options2024.divineOrderOptions.map(option => option.key)).toEqual(['protector', 'thaumaturge']);
    expect(options2024.blessedStrikesOptions.map(option => option.key)).toEqual(['divine_strike', 'potent_spellcasting']);
  });

  test('validates incomplete 2014 Cleric selections', () => {
    const result = validateClericBuilderSelections({ level: 1, edition: '2014' });

    expect(result.ready).toBe(false);
    expect(result.errors).toEqual(['Choose a Cleric subclass.']);
  });

  test('validates complete 2014 Cleric selections', () => {
    const result = validateClericBuilderSelections({ level: 1, edition: '2014', subclass: 'Life Domain' });

    expect(result.ready).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('validates incomplete 2024 Cleric selections', () => {
    const result = validateClericBuilderSelections({ level: 7, edition: '2024', subclass: 'Life Domain' });

    expect(result.ready).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'Choose a Divine Order.',
      'Choose a Blessed Strikes option.',
    ]));
  });

  test('validates complete 2024 Cleric selections', () => {
    const result = validateClericBuilderSelections({
      level: 7,
      edition: '2024',
      subclass: 'War Domain',
      divineOrder: 'Protector',
      blessedStrikes: 'Divine Strike',
    });

    expect(result.ready).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('summarises Cleric builder choices', () => {
    const summary = getClericBuilderChoiceSummary({
      level: 7,
      edition: '2024',
      selections: {
        subclass: 'Trickery Domain',
        divineOrder: 'Thaumaturge',
        blessedStrikes: 'Potent Spellcasting',
        preparedSpells: ['cure wounds', 'bless'],
      },
    });

    expect(summary.subclass.key).toBe('trickery_domain');
    expect(summary.divineOrder.key).toBe('thaumaturge');
    expect(summary.blessedStrikes.key).toBe('potent_spellcasting');
    expect(summary.preparedSpells).toEqual(['cure wounds', 'bless']);
  });

  test('returns selected subclass and selection list aliases', () => {
    expect(getSelectedClericSubclass({ cleric_subclass: 'Light Domain' }, '2014')?.key).toBe('light_domain');
    expect(getClericBuilderSelectionList({
      clericSubclass: 'Life Domain',
      divine_order: 'Protector',
      blessed_strikes: 'Divine Strike',
      prepared_spells: 'bless',
    })).toEqual({
      subclass: 'Life Domain',
      divineOrder: 'Protector',
      blessedStrikes: 'Divine Strike',
      preparedSpells: ['bless'],
    });
  });

  test('returns readiness with choice summary', () => {
    const readiness = getClericBuilderReadiness({
      level: 7,
      edition: '2024',
      subclass: 'Life Domain',
      divineOrder: 'Protector',
      blessedStrikes: 'Divine Strike',
      preparedSpells: ['bless'],
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.errors).toEqual([]);
    expect(readiness.choiceSummary.subclass.key).toBe('life_domain');
    expect(readiness.choiceSummary.divineOrder.key).toBe('protector');
    expect(readiness.choiceSummary.blessedStrikes.key).toBe('divine_strike');
  });
});
