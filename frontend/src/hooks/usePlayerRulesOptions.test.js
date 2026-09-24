import {
  buildMergedCharacterRules,
  normaliseBackgroundOption,
  normaliseClassOption,
  normaliseClassSkillChoices,
} from './usePlayerRulesOptions';

describe('uploaded character rule option normalization', () => {
  test('normalises backend class skill choice objects into creator-ready fields', () => {
    expect(normaliseClassSkillChoices({
      skill_choices: {
        choose: 2,
        from: ['Athletics', 'Insight', 'Perception'],
      },
    })).toEqual({
      skillChoices: ['Athletics', 'Insight', 'Perception'],
      skillCount: 2,
    });
  });

  test('supports common homebrew aliases for class skill choices', () => {
    expect(normaliseClassOption({
      name: 'Warden',
      skillChoices: {
        count: 3,
        options: 'Athletics, Nature and Survival',
      },
    })).toMatchObject({
      skillChoices: ['Athletics', 'Nature', 'Survival'],
      skillCount: 3,
    });
  });

  test('preserves any-skill classes and their explicit choice count', () => {
    expect(normaliseClassOption({ skill_choices: 'any', skill_count: 4 })).toMatchObject({
      skillChoices: 'any',
      skillCount: 4,
    });
  });

  test('keeps legacy array class choices and explicit count working', () => {
    expect(normaliseClassOption({
      skill_choices: ['Arcana', 'History', 'Religion'],
      skill_count: 2,
    })).toMatchObject({
      skillChoices: ['Arcana', 'History', 'Religion'],
      skillCount: 2,
    });
  });

  test('normalises background skills into plain names for edit/create comparisons', () => {
    expect(normaliseBackgroundOption({
      skill_proficiencies: [{ name: 'Stealth' }, 'Deception'],
    }).skillProficiencies).toEqual(['Stealth', 'Deception']);
  });

  test('preserves 2024 background ASI and origin feat fields for the active creator', () => {
    expect(normaliseBackgroundOption({
      asi2024: { wisdom: 2, constitution: 1 },
      origin_feat_2024: 'Tough',
    })).toMatchObject({
      asi2024: { wisdom: 2, constitution: 1 },
      originFeat2024: 'Tough',
    });
  });

  test('accepts snake-case 2024 ASI data from uploaded backgrounds', () => {
    expect(normaliseBackgroundOption({
      asi_2024: { intelligence: 2, dexterity: 1 },
    }).asi2024).toEqual({ intelligence: 2, dexterity: 1 });
  });

  test('merged uploaded classes expose a usable skill target to the creator', () => {
    const merged = buildMergedCharacterRules({}, {
      classes: [{
        name: 'Warden',
        skill_choices: { choose: 2, from: ['Athletics', 'Nature', 'Survival'] },
      }],
    });

    expect(merged.classes.Warden.skillChoices).toEqual(['Athletics', 'Nature', 'Survival']);
    expect(merged.classes.Warden.skillCount).toBe(2);
  });
});
