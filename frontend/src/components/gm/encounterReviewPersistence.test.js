/**
 * Mounted: the GM's encounter choices survive a trip to another tool.
 *
 * Two mechanisms used to destroy them. LiveSessionGridMode keys the tool body
 * on the active tool, so opening Notes unmounted the launcher. And the reset
 * effect depended on baseCombatants, so any refresh returning a new object
 * reference -- including Retry -- cleared the selections for the same
 * encounter with identical content.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LiveSessionGridMode from './LiveSessionGridMode';

jest.mock('@/lib/apiClient', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));

const apiClient = require('@/lib/apiClient');
const CAMPAIGN = 'camp-1';

const PLAYERS = [
  { id: 'p1', character_id: 'c1', name: 'Rina Ironside', hp: 40, max_hp: 54, ac: 19 },
  { id: 'p2', character_id: 'c2', name: 'Orren Oakenshade', hp: 31, max_hp: 38, ac: 16 },
];

const SCENARIOS = [{
  id: 'hm01',
  name: 'Hollowmere Ambush',
  live_ready: true,
  live_default: true,
  planned_encounter_order: 1,
  combatants: [
    { id: 'g1', name: 'Goblin', type: 'enemy', hp: 7, maxHp: 7 },
    { id: 'g2', name: 'Goblin', type: 'enemy', hp: 7, maxHp: 7 },
  ],
}];

/** Fresh object references every call, as a real refresh produces. */
function mockApi(players = PLAYERS) {
  apiClient.get.mockImplementation(url => {
    if (url === `/campaigns/${CAMPAIGN}`) return Promise.resolve({ data: { id: CAMPAIGN, name: 'Spilsby Wednesday' } });
    if (url === `/campaigns/${CAMPAIGN}/combat-scenarios`) {
      return Promise.resolve({ data: JSON.parse(JSON.stringify(SCENARIOS)) });
    }
    if (url === `/campaigns/${CAMPAIGN}/npcs`) return Promise.resolve({ data: [] });
    if (url === `/campaigns/${CAMPAIGN}/live-state`) return Promise.resolve({ data: { companion_npc_ids: [] } });
    if (url.includes('/live-party') || url.includes('/players')) {
      return Promise.resolve({ data: JSON.parse(JSON.stringify(players)) });
    }
    return Promise.resolve({ data: [] });
  });
}

function openLivePlay() {
  return render(
    <MemoryRouter>
      <LiveSessionGridMode
        campaignId={CAMPAIGN} scenarios={SCENARIOS} players={PLAYERS}
        renderTool={toolId => <div data-testid={`tool-${toolId}`}>tool</div>}
        onOpenSingleTab={() => {}} onRollDice={() => {}}
      />
    </MemoryRouter>,
  );
}

async function review() {
  return screen.findByTestId('live-encounter-launcher');
}

/** Toggle a participant row by its visible name. */
async function toggleRow(name) {
  const launcher = await review();
  const row = within(launcher).getByText(name).closest('button')
    || within(launcher).getByText(name).parentElement.closest('button');
  fireEvent.click(row);
}

async function counts() {
  const launcher = await review();
  return within(launcher).getByTestId('live-encounter-roster-counts').textContent;
}

async function openReview() {
  fireEvent.click(screen.getByTestId('run-review-encounter'));
  await review();
}

/** Come back through the primary nav, as a GM would. Passes no encounter id,
 *  so the draft has to stand on its own. */
async function returnToReview() {
  fireEvent.click(screen.getByTestId('live-tool-combat'));
  await review();
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  mockApi();
  localStorage.setItem(`gm.liveMode.focus.${CAMPAIGN}`, 'overview');
});

test('an excluded player is still excluded after visiting Notes', async () => {
  openLivePlay();
  await screen.findByText('Hollowmere Ambush');
  await openReview();
  await waitFor(async () => expect(await counts()).toContain('Party: 2'));

  await toggleRow('Orren Oakenshade');
  await waitFor(async () => expect(await counts()).toContain('Party: 1'));

  // Away to Notes, which unmounts the launcher entirely, and back.
  fireEvent.click(screen.getByTestId('live-tool-notes'));
  await screen.findByTestId('tool-notes');
  await returnToReview();

  await waitFor(async () => expect(await counts()).toContain('Party: 1'));
});

test('a disabled enemy is still disabled after visiting another tool', async () => {
  openLivePlay();
  await screen.findByText('Hollowmere Ambush');
  await openReview();
  await waitFor(async () => expect(await counts()).toContain('Enemies: 2'));

  const launcher = await review();
  const goblinRows = within(launcher).getAllByText('Goblin');
  fireEvent.click(goblinRows[0].closest('button') || goblinRows[0].parentElement.closest('button'));
  await waitFor(async () => expect(await counts()).toContain('Enemies: 1'));

  fireEvent.click(screen.getByTestId('live-tool-notes'));
  await screen.findByTestId('tool-notes');
  await returnToReview();

  await waitFor(async () => expect(await counts()).toContain('Enemies: 1'));
});

test('quick-added creatures survive a tool switch', async () => {
  openLivePlay();
  await screen.findByText('Hollowmere Ambush');
  await openReview();

  const launcher = await review();
  fireEvent.change(within(launcher).getByPlaceholderText('Name'), { target: { value: 'Dire Wolf' } });
  const qty = within(launcher).getByLabelText('Qty');
  fireEvent.change(qty, { target: { value: '2' } });
  fireEvent.keyDown(within(launcher).getByPlaceholderText('Name'), { key: 'Enter' });

  await waitFor(async () => expect(await counts()).toContain('Temporary: 2'));

  fireEvent.click(screen.getByTestId('live-tool-notes'));
  await screen.findByTestId('tool-notes');
  await returnToReview();

  await waitFor(async () => expect(await counts()).toContain('Temporary: 2'));
});

test('a half-typed creature is still there when the GM comes back', async () => {
  openLivePlay();
  await screen.findByText('Hollowmere Ambush');
  await openReview();

  let launcher = await review();
  fireEvent.change(within(launcher).getByPlaceholderText('Name'), { target: { value: 'Bandit Capt' } });

  fireEvent.click(screen.getByTestId('live-tool-notes'));
  await screen.findByTestId('tool-notes');
  await returnToReview();

  launcher = await review();
  await waitFor(() => expect(within(launcher).getByPlaceholderText('Name')).toHaveValue('Bandit Capt'));
});

test('Retry refreshes the data without undoing the GM', async () => {
  // The old reset effect keyed on baseCombatants, so identical content with a
  // new object reference cleared everything.
  openLivePlay();
  await screen.findByText('Hollowmere Ambush');
  await openReview();
  await toggleRow('Orren Oakenshade');
  await waitFor(async () => expect(await counts()).toContain('Party: 1'));

  // A newcomer joins the party on the refresh.
  mockApi([...PLAYERS, { id: 'p3', character_id: 'c3', name: 'Josh', hp: 30, max_hp: 41, ac: 15 }]);
  fireEvent.click(screen.getByTestId('live-tool-combat'));

  await waitFor(async () => {
    const text = await counts();
    // Orren stays out; Josh comes in without being asked for.
    expect(text).toContain('Party: 2');
  });
  const launcher = await review();
  expect(within(launcher).getByText('Josh')).toBeInTheDocument();
});

test('Reset review restores the saved encounter after confirmation', async () => {
  const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
  openLivePlay();
  await screen.findByText('Hollowmere Ambush');
  await openReview();
  await toggleRow('Orren Oakenshade');
  await waitFor(async () => expect(await counts()).toContain('Party: 1'));

  const launcher = await review();
  fireEvent.click(within(launcher).getByTestId('live-encounter-reset-review'));

  await waitFor(async () => expect(await counts()).toContain('Party: 2'));
  expect(confirmSpy).toHaveBeenCalled();
  confirmSpy.mockRestore();
});

test('Reset review keeps the draft if the GM says no', async () => {
  const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
  openLivePlay();
  await screen.findByText('Hollowmere Ambush');
  await openReview();
  await toggleRow('Orren Oakenshade');
  await waitFor(async () => expect(await counts()).toContain('Party: 1'));

  const launcher = await review();
  fireEvent.click(within(launcher).getByTestId('live-encounter-reset-review'));

  await waitFor(async () => expect(await counts()).toContain('Party: 1'));
  confirmSpy.mockRestore();
});

test('the counts describe the roster that launches, not what is available', async () => {
  openLivePlay();
  await screen.findByText('Hollowmere Ambush');
  await openReview();
  await waitFor(async () => {
    const text = await counts();
    expect(text).toContain('Party: 2');
    expect(text).toContain('Enemies: 2');
    expect(text).toContain('Total: 4');
  });

  await toggleRow('Orren Oakenshade');
  await waitFor(async () => {
    const text = await counts();
    expect(text).toContain('Party: 1');
    expect(text).toContain('Total: 3');
  });
});
