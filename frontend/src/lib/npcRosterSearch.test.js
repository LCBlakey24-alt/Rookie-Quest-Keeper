import { matchesNpcSearch } from './npcRosterSearch';

describe('GM NPC roster search', () => {
  const npc = {
    name: 'Mabel Barleybrook',
    role: 'Master of Provisions',
    location: 'Balderin',
    description: 'Druid with wooden root legs',
    backstory: 'She suspects the royal palace explosion was not an accident',
    notes: 'Guard the grain stores before the council meets',
    skills: ['Nature +5', 'Perception +8'],
    saving_throws: ['WIS +8'],
  };

  test.each([
    'MABEL', 'provisions', 'Balderin', 'wooden', 'palace explosion',
    'grain stores', 'nature +5', 'wis +8',
  ])('finds an NPC by %s', query => {
    expect(matchesNpcSearch(npc, query)).toBe(true);
  });

  test('empty search shows all records; no match hides record', () => {
    expect(matchesNpcSearch(npc, '')).toBe(true);
    expect(matchesNpcSearch(npc, '   ')).toBe(true);
    expect(matchesNpcSearch(npc, 'Thorgar')).toBe(false);
  });

  test('missing or incomplete fields do not crash the NPC screen', () => {
    expect(matchesNpcSearch({}, 'Jordan')).toBe(false);
    expect(matchesNpcSearch(null, 'Jordan')).toBe(false);
    expect(matchesNpcSearch({ name: 'Jordan Crow', skills: null }, 'crow')).toBe(true);
  });
});
