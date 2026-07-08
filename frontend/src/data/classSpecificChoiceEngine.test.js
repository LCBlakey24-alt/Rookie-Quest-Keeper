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
});
