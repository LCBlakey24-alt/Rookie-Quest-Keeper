import { getClericSheetSummary } from './clericSheetSummary';

describe('Cleric sheet summary helper', () => {
  test('summarises a 2014 Cleric with domain, spellcasting, and Channel Divinity', () => {
    const summary = getClericSheetSummary({
      character_class: 'Cleric',
      level: 8,
      rules_edition: '2014',
      subclass: 'Life Domain',
      preparedSpells: ['Bless', 'Cure Wounds'],
    });

    expect(summary).toMatchObject({
      className: 'Cleric',
      edition: '2014',
      level: 8,
      isCleric: true,
      subclassKey: 'life_domain',
      subclassLabel: 'Life Domain',
      subclassRole: 'Healing and protective support',
      subclassSupportedInRuleset: true,
      channelDivinityUses: 2,
      channelDivinityLabel: '2 Channel Divinity uses',
      destroyUndeadCR: '1',
      destroyUndeadLabel: 'Destroy Undead CR 1',
      spellcastingLevel: 8,
      spellcastingOnline: true,
      spellcastingHint: 'Full caster level 8',
      divineOrderLabel: 'Not used in this ruleset',
      blessedStrikesLabel: 'None yet',
      preparedSpellsLabel: 'Bless, Cure Wounds',
    });
    expect(summary.subclassFeatureLevels).toEqual([1, 2, 6, 8]);
    expect(summary.nextSubclassFeatureLevel).toBe(17);
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toEqual(expect.arrayContaining(['ability_score_improvement_8', 'destroy_undead_1']));
  });

  test('summarises a 2024 Cleric with Divine Order and Blessed Strikes selections', () => {
    const summary = getClericSheetSummary({
      character_class: 'Cleric',
      level: 7,
      rules_edition: '2024',
      subclass: 'Life Domain',
      divineOrder: 'Protector',
      blessedStrikes: 'Divine Strike',
      prepared_spells: ['Guiding Bolt', 'Healing Word'],
    });

    expect(summary).toMatchObject({
      edition: '2024',
      level: 7,
      subclassKey: 'life_domain',
      subclassLabel: 'Life Domain',
      subclassSupportedInRuleset: true,
      channelDivinityUses: 4,
      channelDivinityLabel: '4 Channel Divinity uses',
      destroyUndeadCR: 'scales with Cleric level',
      destroyUndeadLabel: 'Sear Undead online',
      divineOrderLabel: 'Protector',
      blessedStrikesLabel: 'Divine Strike',
      preparedSpellsLabel: 'Guiding Bolt, Healing Word',
    });
    expect(summary.choices.map(choice => choice.choiceType)).toEqual(expect.arrayContaining(['divine_order', 'subclass', 'blessed_strikes']));
  });

  test('prompts for 2024 Cleric selections when missing', () => {
    const summary = getClericSheetSummary({
      character_class: 'Cleric',
      level: 7,
      rules_edition: '2024',
    });

    expect(summary.subclassLabel).toBe('Choose/record Cleric Subclass');
    expect(summary.divineOrderLabel).toBe('Choose Divine Order');
    expect(summary.blessedStrikesLabel).toBe('Choose Blessed Strikes option');
    expect(summary.preparedSpellsLabel).toBe('Choose prepared Cleric spells');
  });

  test('summarises multiclass Cleric level instead of character level', () => {
    const summary = getClericSheetSummary({
      character_class: 'Fighter',
      level: 12,
      class_levels: { Fighter: 7, Cleric: 5 },
      rules_edition: '2014',
      cleric_subclass: 'Custom Cleric Subclass',
    });

    expect(summary.level).toBe(5);
    expect(summary.isCleric).toBe(true);
    expect(summary.spellcastingLevel).toBe(5);
    expect(summary.channelDivinityUses).toBe(1);
    expect(summary.destroyUndeadLabel).toBe('Destroy Undead CR 1/2');
    expect(summary.subclassKey).toBe('custom_cleric_subclass');
    expect(summary.subclassSupportedAutomation).toBe(false);
    expect(summary.subclassCustom).toBe(true);
  });

  test('flags non-built-in subclass records as unsupported automation', () => {
    const summary = getClericSheetSummary({
      character_class: 'Cleric',
      level: 5,
      rules_edition: '2024',
      subclass: 'Twilight Domain',
    });

    expect(summary.subclassKey).toBe('twilight_domain');
    expect(summary.subclassLabel).toBe('Twilight Domain');
    expect(summary.subclassSupportedInRuleset).toBe(false);
    expect(summary.subclassSupportedAutomation).toBe(false);
    expect(summary.subclassRole).toBe('');
    expect(summary.subclassFeatureLevels).toEqual([]);
  });

  test('returns a safe non-Cleric summary', () => {
    const summary = getClericSheetSummary({ character_class: 'Wizard', level: 4 });

    expect(summary.level).toBe(0);
    expect(summary.isCleric).toBe(false);
    expect(summary.channelDivinityLabel).toBe('Channel Divinity not unlocked');
    expect(summary.preparedSpellsLabel).toBe('Choose prepared Cleric spells');
  });
});
