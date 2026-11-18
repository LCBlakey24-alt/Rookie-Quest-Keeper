import { activeQuestSummaries, hasOpenQuests } from './liveActiveQuests';

const quest = (overrides) => ({ id: 'q', title: 'Quest', status: 'active', objectives: [], ...overrides });

test('leads with active and pinned quests, pinned first, and skips finished ones', () => {
  const list = activeQuestSummaries([
    quest({ id: 'a', title: 'Active' }),
    quest({ id: 'p', title: 'Pinned draft', status: 'draft', is_pinned: true }),
    quest({ id: 'd', title: 'Draft', status: 'draft' }),
    quest({ id: 'c', title: 'Done', status: 'completed', is_pinned: true }),
  ]);
  expect(list.map((item) => item.id)).toEqual(['p', 'a']);
});

test('says what is next and how far along the quest is', () => {
  const [summary] = activeQuestSummaries([quest({
    objectives: [
      { title: 'Search the ship', status: 'completed' },
      { title: 'Find the log', status: 'upcoming' },
      { title: 'Follow the trail', status: 'upcoming' },
    ],
    linked_npc_ids: ['n1', 'n2'], linked_location_ids: ['l1'], linked_reward_ids: ['r1'],
  })]);
  expect(summary.next).toBe('Find the log');
  expect(summary.progress).toBe('1 of 3 objectives done');
  expect(summary.links).toEqual(['2 people', '1 place', '1 reward']);
});

test('a quest with every objective resolved says so', () => {
  const [summary] = activeQuestSummaries([quest({ objectives: [{ title: 'A', status: 'completed' }, { title: 'B', status: 'skipped' }] })]);
  expect(summary.next).toBe('Every objective is done');
});

test('knows when there are open quests but none active', () => {
  expect(activeQuestSummaries([quest({ status: 'draft' })])).toEqual([]);
  expect(hasOpenQuests([quest({ status: 'draft' })])).toBe(true);
  expect(hasOpenQuests([quest({ status: 'completed' })])).toBe(false);
});
