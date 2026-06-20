import { getWizardSheetSummary } from './wizardSheetSummary';

describe('Wizard sheet summary helper', () => {
  test('summarises a 2014 Wizard with school, Arcane Recovery, and spells', () => {
    const summary = getWizardSheetSummary({
      character_class: 'Wizard',
      level: 10,
      rules_edition: '2014',
      subclass: 'School of Evocation',
      spellbookSpells: ['Detect Magic', 'Fireball'],
      preparedSpells: ['Shield', 'Magic Missile'],
    });

    expect(summary).toMatchObject({
      className: 'Wizard',
      edition: '2014',
      level: 10,
      isWizard: true,
      subclassKey: 'evocation',
      subclassLabel: 'School of Evocation',
      subclassRole: 'Arcane blaster',
      subclassSupportedInRuleset: true,
      spellcastingLevel: 10,
      spellcastingOnline: true,
      spellcastingHint: 'Full caster level 10',
      arcaneRecoveryLevel: 5,
      arcaneRecoveryLabel: 'Recover spell slots up to level 5 total',
      scholarLabel: 'Not used in this ruleset',
      spellbookSpellsLabel: 'Detect Magic, Fireball',
      preparedSpellsLabel: 'Shield, Magic Missile',
    });
    expect(summary.subclassFeatures.map(feature => feature.level)).toEqual([2, 6, 10]);
    expect(summary.nextSubclassFeatures.map(feature => feature.level)).toEqual([14]);
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toContain('arcane_tradition_feature_10');
  });

  test('summarises a 2024 Wizard with Scholar and school choices', () => {
    const summary = getWizardSheetSummary({
      character_class: 'Wizard',
      level: 6,
      rules_edition: '2024',
      subclass: 'School of Illusion',
      scholarSkill: 'Arcana',
      spellbook_spells: ['Detect Magic', 'Invisibility'],
      prepared_spells: ['Shield'],
    });

    expect(summary).toMatchObject({
      edition: '2024',
      level: 6,
      subclassKey: 'illusion',
      subclassLabel: 'School of Illusion',
      subclassSupportedInRuleset: true,
      spellcastingLevel: 6,
      arcaneRecoveryLevel: 3,
      scholarLabel: 'Arcana',
      spellbookSpellsLabel: 'Detect Magic, Invisibility',
      preparedSpellsLabel: 'Shield',
    });
    expect(summary.choices.map(choice => choice.choiceType)).toEqual(expect.arrayContaining(['scholar_skill', 'subclass', 'asi_or_feat']));
    expect(summary.subclassFeatures.map(feature => feature.level)).toEqual([3, 6]);
  });

  test('prompts for missing 2024 Wizard choices and spells', () => {
    const summary = getWizardSheetSummary({
      character_class: 'Wizard',
      level: 3,
      rules_edition: '2024',
    });

    expect(summary.subclassLabel).toBe('Choose/record Wizard School');
    expect(summary.scholarLabel).toBe('Choose Scholar skill');
    expect(summary.spellbookSpellsLabel).toBe('Record spellbook spells');
    expect(summary.preparedSpellsLabel).toBe('Choose prepared Wizard spells');
  });

  test('summarises multiclass Wizard level instead of character level', () => {
    const summary = getWizardSheetSummary({
      character_class: 'Fighter',
      level: 12,
      class_levels: { Fighter: 7, Wizard: 5 },
      rules_edition: '2014',
      wizard_subclass: 'School of Abjuration',
    });

    expect(summary.level).toBe(5);
    expect(summary.isWizard).toBe(true);
    expect(summary.spellcastingLevel).toBe(5);
    expect(summary.arcaneRecoveryLevel).toBe(3);
    expect(summary.subclassKey).toBe('abjuration');
  });

  test('flags unsupported school for the selected ruleset', () => {
    const summary = getWizardSheetSummary({
      character_class: 'Wizard',
      level: 5,
      rules_edition: '2024',
      subclass: 'School of Necromancy',
    });

    expect(summary.subclassKey).toBe('necromancy');
    expect(summary.subclassLabel).toBe('School of Necromancy');
    expect(summary.subclassSupportedInRuleset).toBe(false);
    expect(summary.subclassRole).toBe('');
  });

  test('returns a safe non-Wizard summary', () => {
    const summary = getWizardSheetSummary({ character_class: 'Druid', level: 4 });

    expect(summary.level).toBe(0);
    expect(summary.isWizard).toBe(false);
    expect(summary.arcaneRecoveryLabel).toBe('Recover spell slots up to level 1 total');
    expect(summary.preparedSpellsLabel).toBe('Choose prepared Wizard spells');
  });
});
