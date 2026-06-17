import { getSorcererSheetSummary } from './sorcererSheetSummary';

describe('Sorcerer sheet summary helper', () => {
  test('summarises a 2014 Sorcerer with origin and Metamagic', () => {
    const summary = getSorcererSheetSummary({
      character_class: 'Sorcerer',
      level: 10,
      rules_edition: '2014',
      origin: 'Draconic Bloodline',
      metamagic: ['Careful Spell', 'Subtle Spell', 'Quickened Spell'],
    });

    expect(summary).toMatchObject({
      className: 'Sorcerer',
      edition: '2014',
      level: 10,
      isSorcerer: true,
      subclassKey: 'draconic',
      subclassLabel: 'Draconic Bloodline',
      subclassRole: 'Elemental caster',
      subclassSupportedInRuleset: true,
      spellcastingLevel: 10,
      spellcastingOnline: true,
      spellcastingHint: 'Full caster spellcasting level 10',
      sorceryPointMaximum: 10,
      sorceryPointLabel: '10 Sorcery Points',
      metamagicCount: 3,
      metamagicLabel: 'Careful Spell, Subtle Spell, Quickened Spell',
    });
    expect(summary.subclassFeatures.map(feature => feature.level)).toEqual([1, 6]);
    expect(summary.nextSubclassFeatures.map(feature => feature.level)).toEqual([14]);
    expect(summary.selectedMetamagic.map(option => option.key)).toEqual(['careful', 'subtle', 'quickened']);
  });

  test('summarises a 2024 Sorcerer with staged origin choice', () => {
    const summary = getSorcererSheetSummary({
      character_class: 'Sorcerer',
      level: 6,
      rules_edition: '2024',
      subclass: 'Wild Magic',
      metamagic_options: ['Distant Spell', 'Extended Spell'],
    });

    expect(summary).toMatchObject({
      edition: '2024',
      level: 6,
      subclassKey: 'wild_magic',
      subclassLabel: 'Wild Magic',
      sorceryPointMaximum: 6,
      sorceryPointLabel: '6 Sorcery Points',
      metamagicCount: 2,
      metamagicLabel: 'Distant Spell, Extended Spell',
    });
    expect(summary.subclassFeatures.map(feature => feature.level)).toEqual([3, 6]);
    expect(summary.nextSubclassFeatures.map(feature => feature.level)).toEqual([14]);
  });

  test('prompts for missing choices', () => {
    const summary = getSorcererSheetSummary({ character_class: 'Sorcerer', level: 3, rules_edition: '2024' });

    expect(summary.subclassLabel).toBe('Choose/record Sorcerer Origin');
    expect(summary.metamagicLabel).toBe('Choose 2 Metamagic options');
  });

  test('summarises multiclass Sorcerer level instead of character level', () => {
    const summary = getSorcererSheetSummary({
      character_class: 'Fighter',
      level: 12,
      class_levels: { Fighter: 7, Sorcerer: 5 },
      rules_edition: '2014',
      origin: 'Divine Soul',
    });

    expect(summary.level).toBe(5);
    expect(summary.isSorcerer).toBe(true);
    expect(summary.sorceryPointMaximum).toBe(5);
    expect(summary.subclassKey).toBe('divine_soul');
  });

  test('flags unsupported origin for the selected ruleset', () => {
    const summary = getSorcererSheetSummary({
      character_class: 'Sorcerer',
      level: 5,
      rules_edition: '2024',
      origin: 'Divine Soul',
    });

    expect(summary.subclassKey).toBe('divine_soul');
    expect(summary.subclassLabel).toBe('Divine Soul');
    expect(summary.subclassSupportedInRuleset).toBe(false);
    expect(summary.subclassRole).toBe('');
  });

  test('returns a safe non-Sorcerer summary', () => {
    const summary = getSorcererSheetSummary({ character_class: 'Wizard', level: 4 });

    expect(summary.level).toBe(0);
    expect(summary.isSorcerer).toBe(false);
    expect(summary.sorceryPointLabel).toBe('Sorcery Points not unlocked');
    expect(summary.metamagicLabel).toBe('None yet');
  });
});
