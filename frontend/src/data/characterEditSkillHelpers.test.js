import { classSkillsForEdit } from './characterEditSkillHelpers';

describe('classSkillsForEdit', () => {
  test('removes background-granted skills from a saved complete proficiency list', () => {
    expect(classSkillsForEdit(
      ['Athletics', 'Intimidation', 'Perception', 'Survival'],
      ['Athletics', 'Intimidation'],
    )).toEqual(['Perception', 'Survival']);
  });

  test('deduplicates saved skills without mutating the inputs', () => {
    const saved = ['Athletics', 'Perception', 'Perception'];
    const background = ['Athletics'];

    expect(classSkillsForEdit(saved, background)).toEqual(['Perception']);
    expect(saved).toEqual(['Athletics', 'Perception', 'Perception']);
    expect(background).toEqual(['Athletics']);
  });

  test('handles missing or malformed lists safely', () => {
    expect(classSkillsForEdit(null, undefined)).toEqual([]);
    expect(classSkillsForEdit('Athletics', ['Athletics'])).toEqual([]);
  });
});
