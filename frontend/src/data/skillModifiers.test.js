import { bestSkill, hasJackOfAllTrades, passiveScore, skillModifier } from './skillModifiers';
import { SKILLS } from '@/components/clean-sheet/cleanSheetUtils';

const rogue = {
  character_class: 'Rogue', level: 3, dexterity: 17, wisdom: 12, strength: 8,
  skill_proficiencies: ['Stealth', 'perception', 'Acrobatics'], expertise: ['Stealth', 'Perception'],
};

describe('skill modifiers', () => {
  test('proficiency adds the bonus once', () => {
    expect(skillModifier(rogue, 'Acrobatics', 'dexterity', 2)).toMatchObject({ modifier: 3 + 2, proficient: true, expertise: false });
  });

  test('expertise adds it twice, whatever case the record uses', () => {
    expect(skillModifier(rogue, 'Stealth', 'dexterity', 2)).toMatchObject({ modifier: 3 + 4, expertise: true });
    expect(skillModifier({ ...rogue, expertise: undefined, expertise_skills: ['stealth'] }, 'Stealth', 'dexterity', 2).modifier).toBe(7);
  });

  test('expertise without proficiency does nothing', () => {
    expect(skillModifier({ dexterity: 14, expertise: ['Stealth'] }, 'Stealth', 'dexterity', 2)).toMatchObject({ modifier: 2, expertise: false });
  });

  test('passive Perception counts expertise: 10 + 1 + 4', () => {
    expect(passiveScore(rogue, 'Perception', 'wisdom', 2)).toBe(15);
  });

  test('Jack of All Trades: a level 2 Bard adds half proficiency, rounded down, to unproficient skills only', () => {
    const bard = { character_class: 'Bard', level: 5, strength: 10, charisma: 18, skill_proficiencies: ['Performance'] };
    expect(hasJackOfAllTrades(bard)).toBe(true);
    expect(skillModifier(bard, 'Athletics', 'strength', 3)).toMatchObject({ modifier: 0 + 1, halfProficiency: true });
    expect(skillModifier(bard, 'Performance', 'charisma', 3)).toMatchObject({ modifier: 4 + 3, halfProficiency: false });
    expect(hasJackOfAllTrades({ character_class: 'Bard', level: 1 })).toBe(false);
  });

  test('multiclass: Jack of All Trades follows the Bard levels, not the total', () => {
    const multi = { character_class: 'Fighter', level: 5, classes: [{ name: 'Fighter', level: 4 }, { name: 'Bard', level: 1 }] };
    expect(hasJackOfAllTrades(multi)).toBe(false);
    expect(hasJackOfAllTrades({ ...multi, classes: [{ name: 'Fighter', level: 3 }, { name: 'Bard', level: 2 }] })).toBe(true);
  });

  test('best skill is the highest modifier (it used to always show a dash)', () => {
    expect(bestSkill(rogue, SKILLS, 2)).toEqual({ skill: 'Stealth', modifier: 7 });
    const fighter = { strength: 16, skill_proficiencies: ['Athletics', 'Intimidation'] };
    expect(bestSkill(fighter, SKILLS, 2)).toEqual({ skill: 'Athletics', modifier: 5 });
  });
});
