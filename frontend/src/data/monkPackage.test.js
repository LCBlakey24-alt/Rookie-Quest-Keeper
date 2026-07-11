import { getMonkProgressionSummary, getMonkBuilderOptions, getMonkFinalStatus, getMonkSubclassOptions } from './monkPackage';

describe('monk package', () => {
  test('exports progression, builder, subclass, and final status helpers', () => {
    expect(getMonkProgressionSummary(5).resourceUses).toBe(5);
    expect(getMonkProgressionSummary(11).martialArtsDie).toBe('d8');
    expect(getMonkBuilderOptions(3).needsSubclass).toBe(true);
    expect(getMonkSubclassOptions('2024').map(option => option.key)).toEqual(['open_hand', 'custom_monk_subclass']);
    expect(getMonkFinalStatus({ character: { character_class: 'Monk', level: 3, subclass: 'Way of the Open Hand' }, level: 3, subclass: 'Way of the Open Hand' }).ready).toBe(true);
  });
});
