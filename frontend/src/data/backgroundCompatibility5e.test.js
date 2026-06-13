import { getCompatibleBackgrounds } from './backgroundCompatibility5e';

describe('background compatibility list', () => {
  test('includes Gladiator for Punch-style character testing', () => {
    const backgrounds = getCompatibleBackgrounds();

    expect(backgrounds.Gladiator).toBeTruthy();
    expect(backgrounds.Gladiator.skillProficiencies).toContain('Athletics');
    expect(backgrounds.Gladiator.skillProficiencies).toContain('Performance');
  });
});
