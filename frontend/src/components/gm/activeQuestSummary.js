/**
 * Which quests Live Play's Run screen leads with, and what to say about each.
 * Pure: no React, no requests, so it is easy to test.
 */
const RESOLVED = new Set(['completed', 'skipped']);
const FINISHED_QUESTS = new Set(['completed', 'failed', 'archived']);

const count = (list) => (Array.isArray(list) ? list.filter(Boolean).length : 0);

/** Active or pinned quests, pinned first, at most `limit`. */
export function activeQuestSummaries(quests = [], limit = 3) {
  return (Array.isArray(quests) ? quests : [])
    .filter((quest) => quest && !FINISHED_QUESTS.has(String(quest.status || '').toLowerCase())
      && (String(quest.status || '').toLowerCase() === 'active' || quest.is_pinned))
    .sort((a, b) => Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned)))
    .slice(0, limit)
    .map((quest) => {
      const objectives = Array.isArray(quest.objectives) ? quest.objectives : [];
      const done = objectives.filter((objective) => RESOLVED.has(String(objective?.status || '').toLowerCase())).length;
      const next = objectives.find((objective) => !RESOLVED.has(String(objective?.status || '').toLowerCase()));
      const links = [
        [count(quest.linked_npc_ids), 'person', 'people'],
        [count(quest.linked_location_ids), 'place', 'places'],
        [count(quest.linked_encounter_ids), 'encounter', 'encounters'],
        [count(quest.linked_reward_ids), 'reward', 'rewards'],
        [count(quest.linked_handout_ids), 'handout', 'handouts'],
      ].filter(([n]) => n > 0).map(([n, one, many]) => `${n} ${n === 1 ? one : many}`);
      return {
        id: quest.id,
        title: quest.title || 'Untitled quest',
        pinned: Boolean(quest.is_pinned),
        progress: objectives.length ? `${done} of ${objectives.length} objectives done` : 'No objectives yet',
        next: next ? next.title : (objectives.length ? 'Every objective is done' : ''),
        links,
      };
    });
}

/** Whether any quest exists that is not finished, so the panel can nudge. */
export function hasOpenQuests(quests = []) {
  return (Array.isArray(quests) ? quests : [])
    .some((quest) => quest && !FINISHED_QUESTS.has(String(quest.status || '').toLowerCase()));
}
