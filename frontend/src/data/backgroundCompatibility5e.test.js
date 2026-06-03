import { describe, expect, it } from 'vitest';
import { getCompatibleBackgrounds } from './backgroundCompatibility5e';

describe('background compatibility list', () => {
  it('includes Gladiator for Punch-style character testing', () => {
    const backgrounds = getCompatibleBackgrounds();

    expect(backgrounds.Gladiator).toBeTruthy();
    expect(backgrounds.Gladiator.skillProficiencies).toContain('Athletics');
    expect(backgrounds.Gladiator.skillProficiencies).toContain('Performance');
  });
});
