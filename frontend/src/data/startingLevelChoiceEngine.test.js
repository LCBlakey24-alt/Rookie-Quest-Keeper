import {
  applyStartingLevelChoicesToPayload,
  buildStartingLevelChoicePlan,
  getSpellChoicePlan,
  normaliseSpellSelection,
  normaliseWarlockSelection,
  pruneStartingLevelDetailSelections,
} from './startingLevelChoiceEngine';

const basePayload = (overrides = {}) => ({
  name: 'Choice Test Hero',
  character_class: 'Fighter',
  level: 1,
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  feats: [],
  ...overrides,
});

describe('starting level choice engine', () => {
  test('creates prepared spell plans from level and spellcasting ability', () => {
    const plan = getSpellChoicePlan({ className: 'Cleric', level: 5, abilities: { wisdom: 16 } });

    expect(plan.spellcastingType).toBe('prepared');
    expect(plan.spellcastingAbility).toBe('wisdom');
    expect(plan.preparedTarget).toBe(8);
    expect(plan.hasPreparedSpellPicker).toBe(true);
    expect(plan.spellOptions.length).toBeGreaterThan(0);
    expect(plan.maxSpellLevel).toBeGreaterThanOrEqual(3);
  });

  test('creates known spell and Warlock choice plans for higher-level Warlocks', () => {
    const plan = buildStartingLevelChoicePlan({ className: 'Warlock', startingLevel: 5, edition: '2014', abilities: { charisma: 16 } });

    expect(plan.spellPlan.hasKnownSpellPicker).toBe(true);
    expect(plan.spellPlan.knownTarget).toBeGreaterThan(0);
    expect(plan.warlockPlan.pactBoonRequired).toBe(true);
    expect(plan.warlockPlan.invocationCount).toBeGreaterThanOrEqual(3);
    expect(plan.hasChoices).toBe(true);
  });

  test('normalises spell and Warlock selections to their allowed limits', () => {
    const spellPlan = { cantripTarget: 1, knownTarget: 2, preparedTarget: 1 };
    const warlockPlan = { invocationCount: 2 };

    expect(normaliseSpellSelection({
      cantrips: ['A', 'B'],
      spells: ['C', 'D', 'E'],
      prepared: ['F', 'G'],
    }, spellPlan)).toMatchObject({
      cantrips: ['A'],
      spells: ['C', 'D'],
      prepared: ['F'],
    });

    expect(normaliseWarlockSelection({
      pactBoon: 'Pact of the Tome',
      invocations: ['Agonizing Blast', 'Devil’s Sight', 'Mask of Many Faces'],
    }, warlockPlan)).toEqual({
      pactBoon: 'Pact of the Tome',
      invocations: ['Agonizing Blast', 'Devil’s Sight'],
    });
  });

  test('prunes spell and Warlock detail selections when plan limits change', () => {
    const pruned = pruneStartingLevelDetailSelections({
      spells: {
        cantrips: ['Fire Bolt', 'Mage Hand'],
        spells: ['Hex', 'Armor of Agathys', 'Invisibility'],
        prepared: ['Shield', 'Magic Missile'],
        arcanum: { 6: 'Eyebite', 7: 'Forcecage' },
      },
      warlock: {
        pactBoon: 'Pact of the Tome',
        invocations: ['Agonizing Blast', 'Devil’s Sight', 'Mask of Many Faces'],
      },
      classSpecific: { metamagic: ['Quickened Spell'] },
    }, {
      spellPlan: {
        cantripTarget: 1,
        knownTarget: 2,
        preparedTarget: 1,
        arcanumLevels: [6],
      },
      warlockPlan: {
        pactBoonRequired: false,
        invocationCount: 1,
      },
    });

    expect(pruned.spells.cantrips).toEqual(['Fire Bolt']);
    expect(pruned.spells.spells).toEqual(['Hex', 'Armor of Agathys']);
    expect(pruned.spells.prepared).toEqual(['Shield']);
    expect(pruned.spells.arcanum).toEqual({ 6: 'Eyebite' });
    expect(pruned.warlock.pactBoon).toBe('');
    expect(pruned.warlock.invocations).toEqual(['Agonizing Blast']);
    expect(pruned.classSpecific).toEqual({ metamagic: ['Quickened Spell'] });
  });

  test('applies ASI choices, feats, prepared spells, Pact Boon, and invocations to payload', () => {
    const clericPlan = getSpellChoicePlan({ className: 'Cleric', level: 3, abilities: { wisdom: 16 } });
    const preparedSpell = clericPlan.spellOptions[0];
    const enhanced = applyStartingLevelChoicesToPayload(
      basePayload({ character_class: 'Cleric', wisdom: 16 }),
      {
        'asi-4': { mode: 'asi', abilityOne: 'wisdom', abilityTwo: 'constitution' },
        'asi-8': { mode: 'feat', featName: 'Test Feat' },
      },
      [{ name: 'Test Feat', description: 'A test feat.', source: 'test' }],
      {
        spellPlan: clericPlan,
        spells: { prepared: [preparedSpell.name] },
        warlockPlan: { invocationCount: 2 },
        warlock: { pactBoon: 'Pact of the Tome', invocations: ['Agonizing Blast', 'Devil’s Sight'] },
      },
    );

    expect(enhanced.wisdom).toBe(17);
    expect(enhanced.constitution).toBe(11);
    expect(enhanced.feats.map((feat) => feat.name)).toContain('Test Feat');
    expect(enhanced.prepared_spells.map((spell) => spell.name)).toEqual([preparedSpell.name]);
    expect(enhanced.spells_prepared.map((spell) => spell.name)).toEqual([preparedSpell.name]);
    expect(enhanced.pact_boon).toBe('Pact of the Tome');
    expect(enhanced.eldritch_invocations).toEqual(['Agonizing Blast', 'Devil’s Sight']);
  });
});
