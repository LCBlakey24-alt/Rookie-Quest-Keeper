import {
  calculatePassiveSkill,
  calculateSkillModifier,
  getExpertiseSkills,
  getSkillProficiencyMultiplier,
  rollD20,
} from './cleanSheetUtils';

describe('clean sheet skill proficiency math', () => {
  const character = {
    wisdom: 16,
    dexterity: 14,
    skill_proficiencies: ['Perception', 'Stealth'],
    expertise_choices: ['Perception'],
  };

  test('normal proficiency adds proficiency bonus once', () => {
    expect(getSkillProficiencyMultiplier(character, 'Stealth')).toBe(1);
    expect(calculateSkillModifier({
      character,
      skill: 'Stealth',
      ability: 'dexterity',
      proficiencyBonus: 3,
    })).toBe(5);
  });

  test('expertise doubles proficiency and also counts as proficiency', () => {
    expect(getExpertiseSkills(character)).toEqual(['Perception']);
    expect(getSkillProficiencyMultiplier(character, 'perception')).toBe(2);
    expect(calculateSkillModifier({
      character,
      skill: 'Perception',
      ability: 'wisdom',
      proficiencyBonus: 3,
    })).toBe(9);
    expect(calculatePassiveSkill({
      character,
      skill: 'Perception',
      ability: 'wisdom',
      proficiencyBonus: 3,
    })).toBe(19);
  });

  test('expertise aliases are deduplicated and object entries are accepted', () => {
    const withAliases = {
      expertise: ['Stealth'],
      expertise_skills: [{ name: 'stealth' }, { skill: 'Sleight of Hand' }],
    };
    expect(getExpertiseSkills(withAliases)).toEqual(['Stealth', 'Sleight of Hand']);
    expect(getSkillProficiencyMultiplier(withAliases, 'sleight-of-hand', [])).toBe(2);
  });
});

describe('clean sheet d20 roll controls', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('options-object advantage keeps the higher roll and applies custom bonus', () => {
    const random = jest.spyOn(Math, 'random');
    random.mockReturnValueOnce(0.2).mockReturnValueOnce(0.8); // 5 and 17

    const result = rollD20(4, { mode: 'advantage', bonus: 2 });

    expect(result.allRolls).toEqual([5, 17]);
    expect(result.d20).toBe(17);
    expect(result.modifier).toBe(6);
    expect(result.total).toBe(23);
    expect(result.mode).toBe('advantage');
  });

  test('options-object disadvantage keeps the lower roll', () => {
    const random = jest.spyOn(Math, 'random');
    random.mockReturnValueOnce(0.9).mockReturnValueOnce(0.1); // 19 and 3

    const result = rollD20(1, { mode: 'disadvantage', bonus: 0 });

    expect(result.d20).toBe(3);
    expect(result.total).toBe(4);
    expect(result.mode).toBe('disadvantage');
  });

  test('legacy string roll mode remains supported', () => {
    const random = jest.spyOn(Math, 'random');
    random.mockReturnValueOnce(0.4).mockReturnValueOnce(0.6); // 9 and 13

    const result = rollD20(2, 'advantage');

    expect(result.d20).toBe(13);
    expect(result.modifier).toBe(2);
    expect(result.total).toBe(15);
  });
});
