import {
  applyClassSpecificChoicesToPayload,
  buildClassSpecificChoicePlan,
  normaliseClassSpecificSelection,
} from './classSpecificChoiceEngine';

const basePayload = (overrides = {}) => ({
  name: 'Class Choice Hero',
  character_class: 'Fighter',
  level: 1,
  class_features: [],
  ...overrides,
});

describe('class specific choice engine', () => {
  test('builds Fighting Style, Expertise, Metamagic, and Battle Master targets', () => {
    expect(buildClassSpecificChoicePlan({ className: 'Fighter', level: 1 })).toMatchObject({
      fightingStyleTarget: 1,
      expertiseTarget: 0,
      metamagicTarget: 0,
      maneuverTarget: 0,
      hasChoices: true,
    });

    expect(buildClassSpecificChoicePlan({ className: 'Rogue', level: 6 })).toMatchObject({
      expertiseTarget: 4,
      hasChoices: true,
    });

    expect(buildClassSpecificChoicePlan({ className: 'Sorcerer', level: 10 })).toMatchObject({
      metamagicTarget: 3,
      hasChoices: true,
    });

    expect(buildClassSpecificChoicePlan({ className: 'Fighter', level: 7, subclassName: 'Battle Master' })).toMatchObject({
      fightingStyleTarget: 1,
      maneuverTarget: 5,
      hasChoices: true,
    });
  });

  test('normalises class-specific selections to their plan limits', () => {
    const plan = buildClassSpecificChoicePlan({ className: 'Fighter', level: 7, subclassName: 'Battle Master' });
    const selection = normaliseClassSpecificSelection({
      fightingStyles: ['Defense', 'Archery'],
      maneuvers: ['Trip Attack', 'Riposte', 'Parry', 'Menacing Attack', 'Precision Attack', 'Rally'],
    }, plan);

    expect(selection.fightingStyles).toEqual(['Defense']);
    expect(selection.maneuvers).toEqual(['Trip Attack', 'Riposte', 'Parry', 'Menacing Attack', 'Precision Attack']);
  });

  test('applies Fighting Style and Battle Master maneuvers to a payload', () => {
    const plan = buildClassSpecificChoicePlan({ className: 'Fighter', level: 7, subclassName: 'Battle Master' });
    const payload = applyClassSpecificChoicesToPayload(
      basePayload({ level: 7, subclass: 'Battle Master' }),
      {
        fightingStyles: ['Defense'],
        maneuvers: ['Trip Attack', 'Riposte', 'Parry', 'Menacing Attack', 'Precision Attack'],
      },
      plan,
    );

    expect(payload.fighting_style).toBe('Defense');
    expect(payload.fighting_styles).toEqual(['Defense']);
    expect(payload.combat_maneuvers).toEqual(['Trip Attack', 'Riposte', 'Parry', 'Menacing Attack', 'Precision Attack']);
    expect(payload.superiority_dice).toEqual({ die: 'd8', total: 4, remaining: 4 });
    expect(payload.class_features.map((feature) => feature.name)).toEqual(expect.arrayContaining(['Fighting Style: Defense', 'Combat Superiority']));
  });

  test('applies Sorcerer metamagic and resource counters to a payload', () => {
    const plan = buildClassSpecificChoicePlan({ className: 'Sorcerer', level: 10 });
    const payload = applyClassSpecificChoicesToPayload(
      basePayload({ character_class: 'Sorcerer', level: 10 }),
      { metamagic: ['Quickened Spell', 'Subtle Spell', 'Twinned Spell'] },
      plan,
    );

    expect(payload.metamagic_options).toEqual(['Quickened Spell', 'Subtle Spell', 'Twinned Spell']);
    expect(payload.sorcery_points).toBe(10);
    expect(payload.sorcery_points_remaining).toBe(10);
  });

  test('applies Expertise choices without adding unrelated resources', () => {
    const plan = buildClassSpecificChoicePlan({ className: 'Rogue', level: 6 });
    const payload = applyClassSpecificChoicesToPayload(
      basePayload({ character_class: 'Rogue', level: 6 }),
      { expertise: ['Stealth', 'Acrobatics', 'Perception', 'Investigation'] },
      plan,
    );

    expect(payload.expertise).toEqual(['Stealth', 'Acrobatics', 'Perception', 'Investigation']);
    expect(payload.expertise_choices).toEqual(['Stealth', 'Acrobatics', 'Perception', 'Investigation']);
    expect(payload.superiority_dice).toBeUndefined();
    expect(payload.sorcery_points).toBeUndefined();
  });

  test('clears stale class-specific fields when the current plan has no matching choices', () => {
    const plan = buildClassSpecificChoicePlan({ className: 'Wizard', level: 7 });
    const payload = applyClassSpecificChoicesToPayload(
      basePayload({
        character_class: 'Wizard',
        level: 7,
        fighting_style: 'Defense',
        fighting_styles: ['Defense'],
        expertise: ['Stealth'],
        expertise_choices: ['Stealth'],
        metamagic: ['Quickened Spell'],
        metamagic_options: ['Quickened Spell'],
        sorcery_points: 7,
        sorcery_points_remaining: 4,
        combat_maneuvers: ['Trip Attack'],
        battle_master_maneuvers: ['Trip Attack'],
        maneuvers: ['Trip Attack'],
        superiority_dice: { die: 'd8', total: 4, remaining: 2 },
        class_features: [
          { name: 'Fighting Style: Defense', source: 'starting-level choice' },
          { name: 'Combat Superiority', source: 'starting-level choice' },
          { name: 'Arcane Recovery', source: 'Wizard' },
        ],
      }),
      {
        fightingStyles: ['Defense'],
        expertise: ['Stealth'],
        metamagic: ['Quickened Spell'],
        maneuvers: ['Trip Attack'],
      },
      plan,
    );

    expect(payload.fighting_style).toBeUndefined();
    expect(payload.fighting_styles).toBeUndefined();
    expect(payload.expertise).toBeUndefined();
    expect(payload.expertise_choices).toBeUndefined();
    expect(payload.metamagic).toBeUndefined();
    expect(payload.metamagic_options).toBeUndefined();
    expect(payload.sorcery_points).toBeUndefined();
    expect(payload.sorcery_points_remaining).toBeUndefined();
    expect(payload.combat_maneuvers).toBeUndefined();
    expect(payload.battle_master_maneuvers).toBeUndefined();
    expect(payload.maneuvers).toBeUndefined();
    expect(payload.superiority_dice).toBeUndefined();
    expect(payload.class_features).toEqual([{ name: 'Arcane Recovery', source: 'Wizard' }]);
  });

  test('preserves Sorcerer points when only Metamagic choices are empty for a Sorcerer plan', () => {
    const plan = buildClassSpecificChoicePlan({ className: 'Sorcerer', level: 2 });
    const payload = applyClassSpecificChoicesToPayload(
      basePayload({ character_class: 'Sorcerer', level: 2, sorcery_points: 2, sorcery_points_remaining: 1 }),
      { metamagic: ['Quickened Spell'] },
      plan,
    );

    expect(payload.metamagic).toBeUndefined();
    expect(payload.metamagic_options).toBeUndefined();
    expect(payload.sorcery_points).toBe(2);
    expect(payload.sorcery_points_remaining).toBe(1);
  });
});
