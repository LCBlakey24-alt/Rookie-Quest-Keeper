import { CLASSES } from './characterRules5e';
import { getStartingEquipmentGroups } from './startingEquipmentRules';
import {
  buildRandomCharacterPlan,
  pickRandom,
  randomIndex,
  sampleUnique,
} from './randomCharacterGenerator';

function seededRng(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

describe('random character generation engine', () => {
  test('basic random helpers are deterministic and bounded', () => {
    expect(randomIndex(0, () => 0.5)).toBe(-1);
    expect(randomIndex(4, () => 0)).toBe(0);
    expect(randomIndex(4, () => 0.999999)).toBe(3);
    expect(pickRandom(['a', 'b', 'c'], () => 0.5)).toBe('b');
    expect(sampleUnique(['a', 'b', 'c'], 99, seededRng(1)).sort()).toEqual(['a', 'b', 'c']);
  });

  test('the same RNG seed produces the same complete plan', () => {
    const first = buildRandomCharacterPlan({
      edition: '2014',
      startingLevel: 1,
      rng: seededRng(12345),
      name: 'Fate',
    });
    const second = buildRandomCharacterPlan({
      edition: '2014',
      startingLevel: 1,
      rng: seededRng(12345),
      name: 'Fate',
    });

    expect(second).toEqual(first);
    expect(first.draftPatch.name).toBe('Fate');
    expect(first.revealSequence[0].id).toBe('class');
    expect(first.revealSequence[1].id).toBe('species');
  });

  test('generated class skills satisfy the class target without duplicating background skills', () => {
    const plan = buildRandomCharacterPlan({
      edition: '2014',
      startingLevel: 1,
      rng: seededRng(777),
    });
    const classData = CLASSES[plan.draftPatch.characterClass] || {};
    const selected = plan.draftPatch.selectedSkills;
    const backgroundSkills = new Set(
      (plan.revealSequence.find((step) => step.id === 'skills')?.options || [])
        .filter((skill) => false),
    );

    expect(selected).toHaveLength(Number(classData.skillCount || 0));
    expect(new Set(selected).size).toBe(selected.length);
    selected.forEach((skill) => expect(backgroundSkills.has(skill)).toBe(false));
  });

  test('every generated starting-equipment choice comes from the canonical class group', () => {
    const plan = buildRandomCharacterPlan({
      edition: '2014',
      startingLevel: 1,
      rng: seededRng(2026),
    });
    const groups = getStartingEquipmentGroups(plan.draftPatch.characterClass);

    Object.entries(plan.draftPatch.startingEquipmentChoices).forEach(([groupId, choice]) => {
      const group = groups.find((entry) => entry.id === groupId);
      expect(group).toBeTruthy();
      expect(group.options).toContain(choice);
    });
  });

  test('a level 1 fighter is not assigned a subclass before its unlock level', () => {
    const fighterRng = () => 0.34;
    const plan = buildRandomCharacterPlan({
      edition: '2014',
      startingLevel: 1,
      rng: fighterRng,
    });

    expect(plan.draftPatch.characterClass).toBe('Fighter');
    expect(plan.metadata.subclassRequired).toBe(false);
    expect(plan.draftPatch.subclass).toBe('');
    expect(plan.revealSequence.some((step) => step.id === 'subclass')).toBe(false);
  });

  test('a level 4 fighter receives its subclass and ASI choice', () => {
    const fighterRng = () => 0.34;
    const plan = buildRandomCharacterPlan({
      edition: '2014',
      startingLevel: 4,
      rng: fighterRng,
    });

    expect(plan.draftPatch.characterClass).toBe('Fighter');
    expect(plan.metadata.subclassRequired).toBe(true);
    expect(plan.draftPatch.subclass).toBeTruthy();
    expect(plan.levelChoices['asi-4']).toMatchObject({ mode: 'asi' });
    expect(plan.revealSequence.some((step) => step.id === 'subclass')).toBe(true);
    expect(plan.revealSequence.some((step) => step.id === 'asi-4')).toBe(true);
  });

  test('level 1 wizard receives the required spellbook and cantrip selections from legal pools', () => {
    const wizardRng = () => 0.999999;
    const plan = buildRandomCharacterPlan({
      edition: '2014',
      startingLevel: 1,
      rng: wizardRng,
    });
    const spellPlan = plan.metadata.spellPlan;
    const legalCantrips = new Set(spellPlan.cantripOptions.map((spell) => spell.name));
    const legalSpells = new Set(spellPlan.spellOptions.map((spell) => spell.name));

    expect(plan.draftPatch.characterClass).toBe('Wizard');
    expect(plan.draftPatch.selectedCantrips).toHaveLength(spellPlan.cantripTarget);
    expect(plan.draftPatch.selectedSpells).toHaveLength(spellPlan.spellbookTarget);
    plan.draftPatch.selectedCantrips.forEach((spell) => expect(legalCantrips.has(spell)).toBe(true));
    plan.draftPatch.selectedSpells.forEach((spell) => expect(legalSpells.has(spell)).toBe(true));
  });

  test('rolled ability scores are real 4d6-drop-lowest results, not arbitrary score picks', () => {
    const plan = buildRandomCharacterPlan({
      edition: '2014',
      startingLevel: 1,
      rng: () => 0.999999,
    });

    expect(Object.values(plan.draftPatch.scores)).toEqual([18, 18, 18, 18, 18, 18]);
  });

  test('starting level is clamped to the supported 1-20 range', () => {
    expect(buildRandomCharacterPlan({ startingLevel: -4, rng: seededRng(3) }).startingLevel).toBe(1);
    expect(buildRandomCharacterPlan({ startingLevel: 999, rng: seededRng(3) }).startingLevel).toBe(20);
  });

  test('2024 input stays in the 2024 rules path', () => {
    const plan = buildRandomCharacterPlan({
      edition: 'dnd5e_2024',
      startingLevel: 3,
      rng: seededRng(42),
    });

    expect(plan.edition).toBe('2024');
    expect(plan.draftPatch.edition).toBe('2024');
    expect(plan.draftPatch.startingLevel).toBe(3);
  });
});
