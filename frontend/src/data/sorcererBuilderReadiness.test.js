import {
  getSorcererBuilderOptions,
  getSorcererBuilderSelectionList,
  validateSorcererBuilderSelections,
} from './sorcererBuilderOptions';
import { getSorcererBuilderChoiceSummary } from './sorcererBuilderChoiceSummary';
import { getSorcererBuilderReadiness } from './sorcererBuilderReadiness';

describe('Sorcerer builder options and readiness', () => {
  test('returns 2014 builder options with origin and Metamagic timing', () => {
    const levelOne = getSorcererBuilderOptions({ level: 1, edition: '2014' });
    expect(levelOne).toMatchObject({
      className: 'Sorcerer',
      edition: '2014',
      level: 1,
      subclassChoiceLevel: 1,
      subclassRequired: true,
      sorceryPointMaximum: 0,
      metamagicCount: 0,
      metamagicRequired: false,
    });

    const levelThree = getSorcererBuilderOptions({ level: 3, edition: '2014' });
    expect(levelThree.metamagicRequired).toBe(true);
    expect(levelThree.metamagicCount).toBe(2);
    expect(levelThree.subclassOptions.map(option => option.key)).toContain('draconic');
  });

  test('returns 2024 builder options with staged subclass choice', () => {
    const levelOne = getSorcererBuilderOptions({ level: 1, edition: '2024' });
    expect(levelOne).toMatchObject({
      edition: '2024',
      subclassChoiceLevel: 3,
      subclassRequired: false,
      sorceryPointMaximum: 0,
      metamagicCount: 0,
      metamagicRequired: false,
    });

    const levelThree = getSorcererBuilderOptions({ level: 3, edition: '2024' });
    expect(levelThree.subclassRequired).toBe(true);
    expect(levelThree.metamagicRequired).toBe(true);
    expect(levelThree.metamagicCount).toBe(2);
    expect(levelThree.subclassOptions.map(option => option.key)).toEqual(expect.arrayContaining(['draconic', 'wild_magic', 'aberrant_mind', 'clockwork_soul']));
  });

  test('validates required 2014 choices', () => {
    expect(validateSorcererBuilderSelections({ level: 1, edition: '2014' })).toMatchObject({
      ready: false,
      errors: ['Choose a Sorcerer origin.'],
    });

    expect(validateSorcererBuilderSelections({
      level: 3,
      edition: '2014',
      subclass: 'Draconic Bloodline',
      metamagic: ['Careful Spell', 'Subtle Spell'],
    })).toMatchObject({ ready: true, errors: [] });
  });

  test('validates required 2024 choices', () => {
    const missing = validateSorcererBuilderSelections({ level: 3, edition: '2024' });

    expect(missing.ready).toBe(false);
    expect(missing.errors).toEqual(expect.arrayContaining([
      'Choose a Sorcerer origin.',
      'Choose 2 Metamagic options.',
    ]));

    expect(validateSorcererBuilderSelections({
      level: 3,
      edition: '2024',
      subclass: 'Wild Magic',
      metamagic: ['Quickened Spell', 'Subtle Spell'],
    })).toMatchObject({ ready: true, errors: [] });
  });

  test('rejects invalid selections', () => {
    const result = validateSorcererBuilderSelections({
      level: 3,
      edition: '2024',
      subclass: 'Divine Soul',
      metamagic: ['Quickened Spell', 'Unknown Spell'],
    });

    expect(result.errors).toEqual(expect.arrayContaining([
      'Choose a Sorcerer origin available in this ruleset.',
      'Choose valid Metamagic options.',
    ]));
  });

  test('builds selected choice summaries', () => {
    const summary = getSorcererBuilderChoiceSummary({
      level: 3,
      edition: '2024',
      selections: {
        subclass: 'Aberrant Mind',
        metamagic: ['Distant Spell', 'Subtle Spell'],
      },
    });

    expect(summary).toMatchObject({
      className: 'Sorcerer',
      edition: '2024',
      level: 3,
      sorceryPointMaximum: 3,
      metamagicCount: 2,
      requiredChoices: {
        subclass: true,
        metamagic: true,
      },
    });
    expect(summary.subclass.key).toBe('aberrant_mind');
    expect(summary.metamagic.map(option => option.key)).toEqual(['distant', 'subtle']);
  });

  test('normalises selection aliases', () => {
    expect(getSorcererBuilderSelectionList({
      sorcerer_subclass: 'Draconic Bloodline',
      metamagic_options: 'Careful Spell',
    })).toEqual({
      subclass: 'Draconic Bloodline',
      metamagic: ['Careful Spell'],
    });
  });

  test('returns readiness with validation and choice summary', () => {
    const readiness = getSorcererBuilderReadiness({
      level: 3,
      edition: '2024',
      subclass: 'Clockwork Soul',
      metamagic: ['Careful Spell', 'Extended Spell'],
    });

    expect(readiness).toMatchObject({
      className: 'Sorcerer',
      edition: '2024',
      level: 3,
      ready: true,
      errors: [],
    });
    expect(readiness.choiceSummary.subclass.key).toBe('clockwork_soul');
    expect(readiness.choiceSummary.metamagic.map(option => option.key)).toEqual(['careful', 'extended']);
  });
});
