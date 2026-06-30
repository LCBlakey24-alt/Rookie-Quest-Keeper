import { characterCreationModes } from './characterCreationModes';

describe('character creation mode metadata', () => {
  test('keeps the three visible creation routes in launch order', () => {
    expect(characterCreationModes.map(mode => mode.key)).toEqual(['full', 'basic', 'matchmaker']);
    expect(characterCreationModes).toHaveLength(3);
  });

  test('does not expose legacy kids or premade route labels', () => {
    const text = JSON.stringify(characterCreationModes);
    expect(text).not.toMatch(/Kids Mode|Premade Characters/);
    expect(characterCreationModes.map(mode => mode.route)).toEqual(['/characters/new/full', '/characters/new/basic', '/characters/new/matchmaker']);
  });
});
