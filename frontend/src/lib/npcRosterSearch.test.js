import { matchesNpcSearch, npcNeedsReview } from './npcRosterSearch';

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


describe('GM NPC provisional-import review', () => {
  test.each([
    'Legacy / provisional healer',
    'Identity and mechanics UNCONFIRMED',
    'Proposed Master of Trade; appointment NOT established',
    'Legacy identity UNRESOLVED',
    'Mine associate, stats missing',
  ])('flags uncertain campaign lore (%s) without mutating it', role => {
    const entry = { id: 'saved-npc', name: 'Draft person', role };
    expect(npcNeedsReview(entry)).toBe(true);
    expect(entry.role).toBe(role);
  });

  test.each([
    'Master of Defence / Shield commander',
    '13-year-old alchemist',
    'First Councillor / elderly adviser (PUBLIC FORM)',
    'Master Smith / Works and Industry candidate',
  ])('keeps established NPCs in the primary roster (%s)', role => {
    expect(npcNeedsReview({ role })).toBe(false);
  });

  test('null and sparse records do not break the roster', () => {
    expect(npcNeedsReview(null)).toBe(false);
    expect(npcNeedsReview({ name: 'Untitled' })).toBe(false);
  });
});
