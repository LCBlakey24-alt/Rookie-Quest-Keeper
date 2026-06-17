import { getWarlockSheetSummary } from './warlockSheetSummary';

describe('Warlock sheet summary helper', () => {
  test('summarises a 2014 Warlock with patron, pact, and invocations', () => {
    const summary = getWarlockSheetSummary({
      character_class: 'Warlock',
      level: 10,
      rules_edition: '2014',
      patron: 'Fiend Patron',
      pactBoon: 'Pact of the Blade',
      invocations: ['One', 'Two', 'Three', 'Four', 'Five'],
    });

    expect(summary).toMatchObject({
      className: 'Warlock',
      edition: '2014',
      level: 10,
      isWarlock: true,
      subclassKey: 'fiend',
      subclassLabel: 'Fiend Patron',
      subclassRole: 'Damage caster',
      subclassSupportedInRuleset: true,
      pactBoonLabel: 'Pact of the Blade',
      pactMagicSlots: 2,
      pactMagicSlotLevel: 5,
      pactMagicLabel: '2 Pact Magic slots at level 5',
      invocationCount: 5,
      invocationsLabel: 'One, Two, Three, Four, Five',
      mysticArcanumLabel: 'Mystic Arcanum not unlocked',
    });
    expect(summary.subclassFeatures.map(feature => feature.level)).toEqual([1, 6, 10]);
    expect(summary.nextSubclassFeatures.map(feature => feature.level)).toEqual([14]);
  });

  test('summarises a 2024 Warlock with staged choices', () => {
    const summary = getWarlockSheetSummary({
      character_class: 'Warlock',
      level: 6,
      rules_edition: '2024',
      subclass: 'Archfey Patron',
      pact_boon: 'Pact of the Chain',
      eldritch_invocations: ['One', 'Two', 'Three', 'Four', 'Five'],
    });

    expect(summary).toMatchObject({
      edition: '2024',
      level: 6,
      subclassKey: 'archfey',
      subclassLabel: 'Archfey Patron',
      pactBoonLabel: 'Pact of the Chain',
      pactMagicSlots: 2,
      pactMagicSlotLevel: 3,
      invocationCount: 5,
      invocationsLabel: 'One, Two, Three, Four, Five',
    });
    expect(summary.subclassFeatures.map(feature => feature.level)).toEqual([3, 6]);
    expect(summary.choices.map(choice => choice.choiceType)).toEqual(expect.arrayContaining(['eldritch_invocations', 'subclass', 'pact_boon']));
  });

  test('prompts for missing choices', () => {
    const summary = getWarlockSheetSummary({ character_class: 'Warlock', level: 3, rules_edition: '2024' });

    expect(summary.subclassLabel).toBe('Choose/record Warlock Patron');
    expect(summary.pactBoonLabel).toBe('Choose Pact Boon');
    expect(summary.invocationsLabel).toBe('Choose 3 Eldritch Invocations');
  });

  test('summarises multiclass Warlock level instead of character level', () => {
    const summary = getWarlockSheetSummary({
      character_class: 'Fighter',
      level: 12,
      class_levels: { Fighter: 7, Warlock: 5 },
      rules_edition: '2014',
      patron: 'Celestial Patron',
    });

    expect(summary.level).toBe(5);
    expect(summary.isWarlock).toBe(true);
    expect(summary.pactMagicSlots).toBe(2);
    expect(summary.pactMagicSlotLevel).toBe(3);
    expect(summary.subclassKey).toBe('celestial');
  });

  test('flags unsupported patron for the selected ruleset', () => {
    const summary = getWarlockSheetSummary({
      character_class: 'Warlock',
      level: 5,
      rules_edition: '2024',
      patron: 'Genie Patron',
    });

    expect(summary.subclassKey).toBe('genie');
    expect(summary.subclassLabel).toBe('Genie Patron');
    expect(summary.subclassSupportedInRuleset).toBe(false);
    expect(summary.subclassRole).toBe('');
  });

  test('returns a safe non-Warlock summary', () => {
    const summary = getWarlockSheetSummary({ character_class: 'Wizard', level: 4 });

    expect(summary.level).toBe(0);
    expect(summary.isWarlock).toBe(false);
    expect(summary.pactMagicLabel).toBe('1 Pact Magic slot at level 1');
    expect(summary.invocationsLabel).toBe('None yet');
  });
});
