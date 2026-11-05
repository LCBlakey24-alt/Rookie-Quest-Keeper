/**
 * Run and Encounter Review must agree on which fight is next.
 *
 * They did not. Run showed `prepared[0]` -- the first element of whatever
 * array it was handed, with no reference to live_default, live_ready,
 * played, legacy or planned_encounter_order. Its button then called
 * onSelect('combat') and passed no encounter identity at all. Review then
 * chose for itself, and preferred the remembered encounter from
 * gm.lastEncounter, which is written at LAUNCH and therefore usually names
 * the fight the GM has already played.
 *
 * So a GM read one encounter name on Run, clicked it, and opened another.
 */
import {
  nextPreparedEncounterId,
  rankedPreparedEncounters,
  resolveEncounterSelection,
} from './encounterSelection';

const enc = (id, extra = {}) => ({ id, name: id, ...extra });

describe('which encounter is next', () => {
  test('two ready encounters run in planned order', () => {
    const scenarios = [
      enc('second', { live_ready: true, planned_encounter_order: 2 }),
      enc('first', { live_ready: true, planned_encounter_order: 1 }),
    ];
    expect(nextPreparedEncounterId(scenarios)).toBe('first');
  });

  test('a default encounter wins even when it is not first in planned order', () => {
    const scenarios = [
      enc('ready-first', { live_ready: true, planned_encounter_order: 1 }),
      enc('tonight', { live_default: true, live_ready: true, planned_encounter_order: 9 }),
    ];
    expect(nextPreparedEncounterId(scenarios)).toBe('tonight');
  });

  test('a played encounter is never chosen automatically', () => {
    const scenarios = [
      enc('done', { live_default: true, live_ready: true, played: true, planned_encounter_order: 1 }),
      enc('up-next', { live_ready: true, planned_encounter_order: 2 }),
    ];
    expect(nextPreparedEncounterId(scenarios)).toBe('up-next');
  });

  test('a legacy encounter is never chosen automatically while anything else exists', () => {
    const scenarios = [
      enc('old', { legacy: true, planned_encounter_order: 1 }),
      enc('current', { planned_encounter_order: 2 }),
    ];
    expect(nextPreparedEncounterId(scenarios)).toBe('current');
  });

  test('an unprepared encounter is still better than nothing', () => {
    const scenarios = [enc('draft', { planned_encounter_order: 3 })];
    expect(nextPreparedEncounterId(scenarios)).toBe('draft');
  });

  test('everything played falls back rather than returning nothing', () => {
    const scenarios = [enc('a', { played: true }), enc('b', { played: true })];
    expect(nextPreparedEncounterId(scenarios)).toBeTruthy();
  });

  test('no encounters at all is empty, not a crash', () => {
    expect(nextPreparedEncounterId([])).toBe('');
    expect(nextPreparedEncounterId(undefined)).toBe('');
  });

  test('encounters with no planned order sort after those that have one', () => {
    const scenarios = [
      enc('unordered', { live_ready: true }),
      enc('ordered', { live_ready: true, planned_encounter_order: 5 }),
    ];
    expect(nextPreparedEncounterId(scenarios)).toBe('ordered');
  });

  test('unplanned null or empty orders follow actual planned encounters', () => {
    const scenarios = [
      enc('null-order', { live_ready: true, planned_encounter_order: null }),
      enc('empty-order', { live_ready: true, planned_encounter_order: '' }),
      enc('planned', { live_ready: true, planned_encounter_order: 3 }),
    ];
    expect(nextPreparedEncounterId(scenarios)).toBe('planned');
  });

  test('the ranking Run shows is the ranking Review uses', () => {
    const scenarios = [
      enc('legacy', { legacy: true }),
      enc('played', { live_ready: true, played: true, planned_encounter_order: 1 }),
      enc('ready-2', { live_ready: true, planned_encounter_order: 2 }),
      enc('default', { live_default: true, live_ready: true, planned_encounter_order: 8 }),
    ];
    expect(rankedPreparedEncounters(scenarios).map(item => item.id))
      .toEqual(['default', 'ready-2', 'played', 'legacy']);
    expect(nextPreparedEncounterId(scenarios)).toBe(rankedPreparedEncounters(scenarios)[0].id);
  });
});

describe('what the GM asked for beats what the app would pick', () => {
  const scenarios = [
    enc('next-up', { live_default: true, live_ready: true, planned_encounter_order: 1 }),
    enc('other', { live_ready: true, planned_encounter_order: 2 }),
    enc('finished', { played: true, planned_encounter_order: 0 }),
  ];

  test('an encounter handed over from Run is the one that opens', () => {
    const result = resolveEncounterSelection({ scenarios, requestedId: 'other' });
    expect(result.id).toBe('other');
    expect(result.reason).toBe('requested');
  });

  test('an encounter handed over from Notes is the one that opens', () => {
    const result = resolveEncounterSelection({ scenarios, requestedId: 'finished' });
    expect(result.id).toBe('finished');
  });

  test("the GM's own in-session choice is kept across a refresh", () => {
    const result = resolveEncounterSelection({ scenarios, gmSelectedId: 'other' });
    expect(result.id).toBe('other');
    expect(result.reason).toBe('gm-selected');
  });

  test('a request beats a previous in-session choice', () => {
    const result = resolveEncounterSelection({ scenarios, requestedId: 'finished', gmSelectedId: 'other' });
    expect(result.id).toBe('finished');
  });
});

describe('the last fight is only reopened when the GM asks for it', () => {
  const scenarios = [
    enc('up-next', { live_default: true, live_ready: true, planned_encounter_order: 2 }),
    enc('last-night', { live_ready: true, played: true, planned_encounter_order: 1 }),
  ];

  test('a remembered encounter does not hijack the next one', () => {
    // gm.lastEncounter is written at launch, so it names the fight already
    // played. This was the defect: Review opened it instead of what Run showed.
    const result = resolveEncounterSelection({ scenarios, rememberedId: 'last-night' });
    expect(result.id).toBe('up-next');
    expect(result.reason).toBe('next');
  });

  test('Reopen Last Encounter does open it, played or not', () => {
    const result = resolveEncounterSelection({
      scenarios, rememberedId: 'last-night', allowRemembered: true,
    });
    expect(result.id).toBe('last-night');
    expect(result.reason).toBe('remembered');
  });

  test('Reopen Last falls back cleanly when that encounter is gone', () => {
    const result = resolveEncounterSelection({
      scenarios, rememberedId: 'deleted-long-ago', allowRemembered: true,
    });
    expect(result.id).toBe('up-next');
    expect(result.missingRequest).toBe('deleted-long-ago');
  });
});

describe('an encounter that is not there any more', () => {
  const scenarios = [enc('still-here', { live_ready: true, planned_encounter_order: 1 })];

  test('a deleted request falls back and says which one was missing', () => {
    const result = resolveEncounterSelection({ scenarios, requestedId: 'deleted' });
    expect(result.id).toBe('still-here');
    expect(result.missingRequest).toBe('deleted');
    expect(result.reason).toBe('next');
  });

  test('a stale in-session choice from another campaign is dropped quietly', () => {
    // Switching campaigns leaves a selection that names nothing here. That is
    // ordinary, not an error worth interrupting the GM about.
    const result = resolveEncounterSelection({ scenarios, gmSelectedId: 'from-other-campaign' });
    expect(result.id).toBe('still-here');
    expect(result.missingRequest).toBe('');
  });

  test('an empty campaign resolves to nothing without throwing', () => {
    const result = resolveEncounterSelection({ scenarios: [], requestedId: 'anything' });
    expect(result.id).toBe('');
    expect(result.missingRequest).toBe('anything');
  });

  test('an encounter that disappears mid-review is reported, not silently swapped', () => {
    const result = resolveEncounterSelection({
      scenarios, gmSelectedId: 'vanished', requestedId: '', reportMissingSelection: true,
    });
    expect(result.id).toBe('still-here');
    expect(result.missingRequest).toBe('vanished');
  });
});

describe('an archived encounter never returns on its own', () => {
  const scenarios = [
    enc('archived', { legacy: true }),
    enc('current', { live_ready: true, planned_encounter_order: 1 }),
  ];

  test('Reopen Last skips an archived encounter and offers the current one', () => {
    const result = resolveEncounterSelection({
      scenarios, rememberedId: 'archived', allowRemembered: true,
    });
    expect(result.id).toBe('current');
  });

  test('but a GM who picks the archived one in this session keeps it', () => {
    const result = resolveEncounterSelection({ scenarios, gmSelectedId: 'archived' });
    expect(result.id).toBe('archived');
  });

  test('and an explicit handoff to it is still honoured', () => {
    expect(resolveEncounterSelection({ scenarios, requestedId: 'archived' }).id).toBe('archived');
  });
});
