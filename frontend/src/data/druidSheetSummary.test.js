import { getDruidSheetSummary } from './druidSheetSummary';

describe('Druid sheet summary helper', () => {
  test('summarises a 2014 Druid with circle, Wild Shape, and spellcasting', () => {
    const summary = getDruidSheetSummary({
      character_class: 'Druid',
      level: 8,
      rules_edition: '2014',
      subclass: 'Circle of the Moon',
      preparedSpells: ['Entangle', 'Cure Wounds'],
    });

    expect(summary).toMatchObject({
      className: 'Druid',
      edition: '2014',
      level: 8,
      isDruid: true,
      subclassKey: 'moon',
      subclassLabel: 'Circle of the Moon',
      subclassRole: 'Wild Shape bruiser',
      subclassSupportedInRuleset: true,
      wildShapeUses: 2,
      wildShapeLabel: '2 Wild Shape uses',
      wildShapeLimit: 'CR 1 beast forms',
      wildShapeLimitLabel: 'CR 1 beast forms',
      spellcastingLevel: 8,
      spellcastingOnline: true,
      spellcastingHint: 'Full caster level 8',
      primalOrderLabel: 'Not used in this ruleset',
      elementalFuryLabel: 'None yet',
      preparedSpellsLabel: 'Entangle, Cure Wounds',
    });
    expect(summary.subclassFeatures.map(feature => feature.level)).toEqual([2, 6]);
    expect(summary.nextSubclassFeatures.map(feature => feature.level)).toEqual([10]);
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toEqual(expect.arrayContaining(['wild_shape_improvement_8', 'ability_score_improvement_8']));
  });

  test('summarises a 2024 Druid with Primal Order and Elemental Fury selections', () => {
    const summary = getDruidSheetSummary({
      character_class: 'Druid',
      level: 7,
      rules_edition: '2024',
      subclass: 'Circle of the Sea',
      primalOrder: 'Warden',
      elementalFury: 'Primal Strike',
      prepared_spells: ['Healing Word', 'Faerie Fire'],
    });

    expect(summary).toMatchObject({
      edition: '2024',
      level: 7,
      subclassKey: 'sea',
      subclassLabel: 'Circle of the Sea',
      subclassSupportedInRuleset: true,
      wildShapeUses: 2,
      wildShapeLimitLabel: '2024 Wild Shape forms online',
      spellcastingLevel: 7,
      primalOrderLabel: 'Warden',
      elementalFuryLabel: 'Primal Strike',
      preparedSpellsLabel: 'Healing Word, Faerie Fire',
    });
    expect(summary.choices.map(choice => choice.choiceType)).toEqual(expect.arrayContaining(['primal_order', 'subclass', 'elemental_fury']));
  });

  test('prompts for missing 2024 Druid choices', () => {
    const summary = getDruidSheetSummary({
      character_class: 'Druid',
      level: 7,
      rules_edition: '2024',
    });

    expect(summary.subclassLabel).toBe('Choose/record Druid Circle');
    expect(summary.primalOrderLabel).toBe('Choose Primal Order');
    expect(summary.elementalFuryLabel).toBe('Choose Elemental Fury option');
    expect(summary.preparedSpellsLabel).toBe('Choose prepared Druid spells');
  });

  test('summarises multiclass Druid level instead of character level', () => {
    const summary = getDruidSheetSummary({
      character_class: 'Fighter',
      level: 12,
      class_levels: { Fighter: 7, Druid: 5 },
      rules_edition: '2014',
      druid_subclass: 'Circle of the Land',
    });

    expect(summary.level).toBe(5);
    expect(summary.isDruid).toBe(true);
    expect(summary.spellcastingLevel).toBe(5);
    expect(summary.wildShapeUses).toBe(2);
    expect(summary.wildShapeLimitLabel).toBe('CR 1/2 beast forms; no flying speed');
    expect(summary.subclassKey).toBe('land');
  });

  test('flags unsupported circle for the selected ruleset', () => {
    const summary = getDruidSheetSummary({
      character_class: 'Druid',
      level: 5,
      rules_edition: '2024',
      subclass: 'Circle of Spores',
    });

    expect(summary.subclassKey).toBe('spores');
    expect(summary.subclassLabel).toBe('Circle of Spores');
    expect(summary.subclassSupportedInRuleset).toBe(false);
    expect(summary.subclassRole).toBe('');
  });

  test('returns a safe non-Druid summary', () => {
    const summary = getDruidSheetSummary({ character_class: 'Wizard', level: 4 });

    expect(summary.level).toBe(0);
    expect(summary.isDruid).toBe(false);
    expect(summary.wildShapeLabel).toBe('Wild Shape not unlocked');
    expect(summary.preparedSpellsLabel).toBe('Choose prepared Druid spells');
  });
});
