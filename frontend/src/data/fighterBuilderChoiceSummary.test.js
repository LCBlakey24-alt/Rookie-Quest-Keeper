import { getFighterBuilderChoiceSummary } from './fighterBuilderChoiceSummary';

describe('Fighter builder choice summary', () => {
  test('summarises level 1 2014 Fighter choices', () => {
    const summary = getFighterBuilderChoiceSummary(1, '2014');

    expect(summary.hasRequiredChoices).toBe(true);
    expect(summary.sections).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'fighting_style', required: true, count: 1 }),
    ]));
    expect(summary.sections.find(section => section.key === 'weapon_mastery')).toBeUndefined();
  });

  test('summarises 2024 Fighter mastery choices for the builder', () => {
    const summary = getFighterBuilderChoiceSummary(1, '2024');
    const mastery = summary.sections.find(section => section.key === 'weapon_mastery');

    expect(mastery).toMatchObject({ required: true, count: 3 });
    expect(mastery.options).toHaveLength(8);
  });

  test('summarises subclass choices at level 3', () => {
    const summary = getFighterBuilderChoiceSummary(3, '2014');
    const subclass = summary.sections.find(section => section.key === 'subclass');

    expect(subclass).toMatchObject({ required: true, count: 1 });
    expect(subclass.options.map(option => option.key)).toEqual(['champion', 'battle_master', 'eldritch_knight']);
  });
});
