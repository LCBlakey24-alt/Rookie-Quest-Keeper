import { mergeJordanQuest } from './TiaKartaJordanQuestImportV2';

const npc = id => ({ id, name: id });
const location = id => ({ id, name: id });
const encounter = (id, name) => ({ id, name });

describe('mergeJordanQuest', () => {
  const npcs = [npc('jordan'), npc('edris')];
  const locations = [location('gragon'), location('cave')];
  const encounters = [
    encounter('riverside', 'Riverside Defence'),
    encounter('ritual', 'Brambleheart Ritual'),
    encounter('gate', 'Old Gate Defence'),
    encounter('wall', 'Broken Wall Defence'),
  ];

  test('creates the canonical quest when no quest exists', () => {
    const merged = mergeJordanQuest(null, npcs, locations, encounters);
    expect(merged.title).toBe('Recruit Jordan Crow');
    expect(merged.status).toBe('active');
    expect(merged.objectives).toHaveLength(10);
    expect(merged.linked_npc_ids).toEqual(['jordan', 'edris']);
    expect(merged.objectives.find(item => item.title.startsWith('Destroy both Vine Hearts')).linked_encounter_id).toBe('ritual');
  });

  test('repairs missing links without resetting GM progress or wording', () => {
    const existing = {
      id: 'quest-1',
      title: 'Recruit Jordan Crow',
      status: 'completed',
      summary: 'My rewritten summary',
      linked_npc_ids: ['custom-npc'],
      linked_location_ids: [],
      linked_encounter_ids: [],
      objectives: [
        {
          id: 'objective-custom',
          title: 'Defend the Riverside through three waves',
          status: 'skipped',
          optional: true,
          notes: 'GM changed this on purpose',
          linked_encounter_id: '',
        },
        {
          id: 'objective-extra',
          title: 'A completely custom follow-up',
          status: 'upcoming',
          optional: true,
        },
      ],
    };

    const merged = mergeJordanQuest(existing, npcs, locations, encounters);
    const riverside = merged.objectives.find(item => item.title === 'Defend the Riverside through three waves');

    expect(merged.title).toBeUndefined();
    expect(merged.status).toBeUndefined();
    expect(riverside.status).toBe('skipped');
    expect(riverside.optional).toBe(true);
    expect(riverside.notes).toBe('GM changed this on purpose');
    expect(riverside.linked_encounter_id).toBe('riverside');
    expect(merged.objectives.some(item => item.title === 'A completely custom follow-up')).toBe(true);
    expect(merged.objectives).toHaveLength(11);
    expect(merged.linked_npc_ids).toEqual(['custom-npc', 'jordan', 'edris']);
    expect(merged.linked_encounter_ids).toEqual(['riverside', 'ritual', 'gate', 'wall']);
  });
});
