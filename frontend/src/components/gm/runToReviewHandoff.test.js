/**
 * Mounted: the encounter named on Run is the encounter Review opens.
 *
 * Before, Run showed prepared[0] and its button called onSelect('combat')
 * with no encounter identity. Review then chose for itself and preferred the
 * id in gm.lastEncounter -- written when a fight LAUNCHES, so usually the
 * encounter already played. The GM read one name, clicked it, and got
 * another.
 *
 * These drive the real components through a real click.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LiveSessionGridMode from './LiveSessionGridMode';

jest.mock('@/lib/apiClient', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));

const apiClient = require('@/lib/apiClient');
const { toast } = require('sonner');

const CAMPAIGN = 'camp-1';

// Run filtered to ready-and-unplayed and sorted by planned order, then took
// the first. Review preferred live_default. Those agree until the encounter
// the GM marked for tonight is not the earliest in planned order -- which is
// exactly what "run this one next" is for. Hollowmere is the default but
// sits at order 5, so the two policies used to name different encounters.
const SCENARIOS = [
  { id: 'hm00', name: 'Cellar Skirmish', live_ready: true, played: true, planned_encounter_order: 0, combatants: [] },
  { id: 'hm02', name: 'Bridge Standoff', live_ready: true, planned_encounter_order: 2, combatants: [] },
  { id: 'hm01', name: 'Hollowmere Ambush', live_ready: true, live_default: true, planned_encounter_order: 5, combatants: [] },
];

function mockApi({ scenarios = SCENARIOS } = {}) {
  apiClient.get.mockImplementation(url => {
    if (url === `/campaigns/${CAMPAIGN}`) return Promise.resolve({ data: { id: CAMPAIGN, name: 'Spilsby Wednesday' } });
    if (url === `/campaigns/${CAMPAIGN}/combat-scenarios`) return Promise.resolve({ data: scenarios });
    if (url === `/campaigns/${CAMPAIGN}/npcs`) return Promise.resolve({ data: [] });
    if (url === `/campaigns/${CAMPAIGN}/live-state`) return Promise.resolve({ data: { companion_npc_ids: [] } });
    if (url.includes('/live-party') || url.includes('/players')) return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
}

function openLivePlay(scenarios = SCENARIOS) {
  return render(
    <MemoryRouter>
      <LiveSessionGridMode
        campaignId={CAMPAIGN}
        scenarios={scenarios}
        players={[]}
        renderTool={() => <div />}
        onOpenSingleTab={() => {}}
        onRollDice={() => {}}
      />
    </MemoryRouter>,
  );
}

/** The encounter Encounter Review has actually loaded. */
async function reviewSelection() {
  const launcher = await screen.findByTestId('live-encounter-launcher');
  const select = within(launcher).getByLabelText('Choose battle type');
  const chosen = select.querySelector(`option[value="${select.value}"]`);
  return { id: select.value, name: chosen ? chosen.textContent : '' };
}

beforeEach(() => {
  localStorage.clear();
  mockApi();
  // Start on the Run overview rather than a remembered tool.
  localStorage.setItem(`gm.liveMode.focus.${CAMPAIGN}`, 'overview');
});

test('Run names the encounter marked for tonight, not merely the earliest planned', async () => {
  // Run sorted ready encounters by planned order and took the first, which
  // ignored live_default. Review preferred live_default. With the default at
  // order 5 and another ready encounter at order 2, they disagreed.
  openLivePlay();
  expect(await screen.findByText('Hollowmere Ambush')).toBeInTheDocument();
  expect(screen.queryByText('Bridge Standoff')).not.toBeInTheDocument();
  expect(screen.queryByText('Cellar Skirmish')).not.toBeInTheDocument();
});

test('Review & run opens exactly the encounter Run named', async () => {
  openLivePlay();
  await screen.findByText('Hollowmere Ambush');

  fireEvent.click(screen.getByTestId('run-review-encounter'));

  const selection = await waitFor(async () => {
    const current = await reviewSelection();
    expect(current.id).not.toBe('');
    return current;
  });
  expect(selection.id).toBe('hm01');
  expect(selection.name).toBe('Hollowmere Ambush');
});

test('a remembered played encounter no longer hijacks Review & run', async () => {
  // gm.lastEncounter is written at launch, so after one fight it names the
  // encounter just played. This is the exact defect.
  localStorage.setItem(`gm.lastEncounter.${CAMPAIGN}`, 'hm00');
  openLivePlay();
  await screen.findByText('Hollowmere Ambush');

  fireEvent.click(screen.getByTestId('run-review-encounter'));

  const selection = await waitFor(async () => {
    const current = await reviewSelection();
    expect(current.id).not.toBe('');
    return current;
  });
  expect(selection.id).toBe('hm01');
  expect(selection.name).not.toBe('Cellar Skirmish');
});

test('Reopen last encounter is a separate action that does open the played one', async () => {
  localStorage.setItem(`gm.lastEncounter.${CAMPAIGN}`, 'hm00');
  openLivePlay();
  await screen.findByText('Hollowmere Ambush');

  fireEvent.click(screen.getByTestId('run-reopen-last-encounter'));

  const selection = await waitFor(async () => {
    const current = await reviewSelection();
    expect(current.id).not.toBe('');
    return current;
  });
  expect(selection.id).toBe('hm00');
  expect(selection.name).toBe('Cellar Skirmish');
});

test('a quest handoff through storage still works', async () => {
  localStorage.setItem(`gm.questEncounter.${CAMPAIGN}`, 'hm02');
  openLivePlay();
  const selection = await waitFor(async () => {
    const current = await reviewSelection();
    expect(current.id).not.toBe('');
    return current;
  });
  expect(selection.id).toBe('hm02');
});

test('a handoff to a deleted encounter warns and offers the next one instead', async () => {
  localStorage.setItem(`gm.questEncounter.${CAMPAIGN}`, 'deleted-last-week');
  openLivePlay();
  const selection = await waitFor(async () => {
    const current = await reviewSelection();
    expect(current.id).not.toBe('');
    return current;
  });
  expect(selection.id).toBe('hm01');
  expect(toast.warning).toHaveBeenCalledWith(
    'That encounter is no longer in this campaign. Choose another below.',
  );
});

test('switching campaigns does not carry a selection across', async () => {
  const other = [{ id: 'other-1', name: 'Harbour Brawl', live_ready: true, planned_encounter_order: 1, combatants: [] }];
  const { rerender } = openLivePlay();
  await screen.findByText('Hollowmere Ambush');
  fireEvent.click(screen.getByTestId('run-review-encounter'));
  await waitFor(async () => expect((await reviewSelection()).id).toBe('hm01'));

  apiClient.get.mockImplementation(url => {
    if (url === '/campaigns/camp-2') return Promise.resolve({ data: { id: 'camp-2', name: 'Other table' } });
    if (url === '/campaigns/camp-2/combat-scenarios') return Promise.resolve({ data: other });
    return Promise.resolve({ data: [] });
  });
  rerender(
    <MemoryRouter>
      <LiveSessionGridMode
        campaignId="camp-2" scenarios={other} players={[]}
        renderTool={() => <div />} onOpenSingleTab={() => {}} onRollDice={() => {}}
      />
    </MemoryRouter>,
  );
  await waitFor(async () => expect((await reviewSelection()).id).toBe('other-1'));
});
