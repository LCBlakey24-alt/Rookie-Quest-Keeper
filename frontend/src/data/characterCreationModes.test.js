import { characterCreationModes } from './characterCreationModes';

describe('character creation mode metadata', () => {
  test('keeps the four visible creation routes in launch-readiness order', () => {
    expect(characterCreationModes.map(mode => mode.key)).toEqual(['full', 'basic', 'premade', 'kids']);
    expect(characterCreationModes).toHaveLength(4);
  });
});
