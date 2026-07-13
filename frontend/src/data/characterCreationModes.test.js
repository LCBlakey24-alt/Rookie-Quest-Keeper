import { characterCreationModes } from './characterCreationModes';

describe('character creation mode metadata', () => {
  test('keeps launch creation routes in product order with Rook as an extra helper', () => {
    expect(characterCreationModes.map(mode => mode.key)).toEqual(['full', 'basic', 'premade', 'kids', 'matchmaker']);
    expect(characterCreationModes).toHaveLength(5);
  });

  test('uses the canonical /characters/new route family', () => {
    expect(characterCreationModes.map(mode => mode.route)).toEqual([
      '/characters/new/full',
      '/characters/new/basic',
      '/characters/new/premade',
      '/characters/new/kids',
      '/characters/new/matchmaker',
    ]);
  });
});
