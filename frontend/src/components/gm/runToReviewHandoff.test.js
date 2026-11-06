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
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LiveEncounterLauncher from './LiveEncounterLauncher';
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

test('a handoff to a deleted encounter warns and never substitutes another fight', async () => {
  localStorage.setItem(`gm.questEncounter.${CAMPAIGN}`, 'deleted-last-week');
  openLivePlay();
  await waitFor(async () => expect((await reviewSelection()).id).toBe(''));
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

test('a handoff is consumed once, so refresh keeps a later manual choice until a new request arrives', async () => {
  apiClient.get.mockImplementation(url => {
    if (url === `/campaigns/${CAMPAIGN}`) return Promise.resolve({ data: { id: CAMPAIGN, name: 'Spilsby Wednesday' } });
    if (url === `/campaigns/${CAMPAIGN}/combat-scenarios`) return Promise.resolve({ data: SCENARIOS });
    if (url === `/campaigns/${CAMPAIGN}/live-party`) return Promise.resolve({ data: [] });
    if (url === `/campaigns/${CAMPAIGN}/npcs`) return Promise.resolve({ data: [] });
    if (url === `/campaigns/${CAMPAIGN}/live-state`) return Promise.reject(new Error('temporary live-state failure'));
    return Promise.resolve({ data: [] });
  });

  const renderLauncher = nonce => (
    <MemoryRouter>
      <LiveEncounterLauncher
        campaignId={CAMPAIGN}
        requestedEncounterId="hm01"
        requestedEncounterCampaignId={CAMPAIGN}
        encounterRequestNonce={nonce}
      />
    </MemoryRouter>
  );
  const view = render(renderLauncher(1));
  const select = await screen.findByLabelText('Choose battle type');
  await waitFor(() => expect(select).toHaveValue('hm01'));

  fireEvent.change(select, { target: { value: 'hm02' } });
  expect(select).toHaveValue('hm02');
  fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
  await waitFor(() => expect(select).toHaveValue('hm02'));

  view.rerender(renderLauncher(2));
  await waitFor(async () => expect(await screen.findByLabelText('Choose battle type')).toHaveValue('hm01'));
});

test('StrictMode and repeated loading warn once for one missing request', async () => {
  mockApi();
  render(
    <React.StrictMode>
      <MemoryRouter>
        <LiveEncounterLauncher
          campaignId={CAMPAIGN}
          requestedEncounterId="deleted-last-week"
          requestedEncounterCampaignId={CAMPAIGN}
          encounterRequestNonce={41}
        />
      </MemoryRouter>
    </React.StrictMode>,
  );

  const select = await screen.findByLabelText('Choose battle type');
  await waitFor(() => expect(select).toHaveValue(''));
  expect(toast.warning).toHaveBeenCalledTimes(1);
  expect(toast.warning).toHaveBeenCalledWith(
    'That encounter is no longer in this campaign. Choose another below.',
  );
});

test('a delayed response from the old campaign cannot replace the new campaign selection or roster', async () => {
  const deferred = () => {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
  };
  const oldResponses = {
    campaign: deferred(), scenarios: deferred(), players: deferred(), npcs: deferred(), liveState: deferred(),
  };
  const campaignB = 'camp-2';
  const scenariosB = [{ id: 'b-encounter', name: 'Harbour Brawl', live_ready: true, combatants: [] }];

  apiClient.get.mockImplementation(url => {
    if (url === '/campaigns/camp-a') return oldResponses.campaign.promise;
    if (url === '/campaigns/camp-a/combat-scenarios') return oldResponses.scenarios.promise;
    if (url === '/campaigns/camp-a/live-party') return oldResponses.players.promise;
    if (url === '/campaigns/camp-a/npcs') return oldResponses.npcs.promise;
    if (url === '/campaigns/camp-a/live-state') return oldResponses.liveState.promise;
    if (url === `/campaigns/${campaignB}`) return Promise.resolve({ data: { id: campaignB, name: 'Second table' } });
    if (url === `/campaigns/${campaignB}/combat-scenarios`) return Promise.resolve({ data: scenariosB });
    if (url === `/campaigns/${campaignB}/live-party`) {
      return Promise.resolve({ data: [{ id: 'b-player', name: 'B Player', hp: 12, max_hp: 12 }] });
    }
    if (url === `/campaigns/${campaignB}/npcs`) return Promise.resolve({ data: [] });
    if (url === `/campaigns/${campaignB}/live-state`) return Promise.resolve({ data: { companion_npc_ids: [] } });
    return Promise.resolve({ data: [] });
  });

  const view = render(
    <MemoryRouter>
      <LiveEncounterLauncher
        campaignId="camp-a"
        requestedEncounterId="a-encounter"
        requestedEncounterCampaignId="camp-a"
        encounterRequestNonce={1}
      />
    </MemoryRouter>,
  );
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/campaigns/camp-a/combat-scenarios'));

  view.rerender(
    <MemoryRouter>
      <LiveEncounterLauncher
        campaignId={campaignB}
        requestedEncounterId="a-encounter"
        requestedEncounterCampaignId="camp-a"
        encounterRequestNonce={1}
      />
    </MemoryRouter>,
  );
  const select = await screen.findByLabelText('Choose battle type');
  await waitFor(() => expect(select).toHaveValue('b-encounter'));
  expect(screen.getByText('B Player')).toBeInTheDocument();

  await act(async () => {
    oldResponses.campaign.resolve({ data: { id: 'camp-a', name: 'Old table' } });
    oldResponses.scenarios.resolve({ data: [{ id: 'a-encounter', name: 'Old Ambush', live_ready: true }] });
    oldResponses.players.resolve({ data: [{ id: 'a-player', name: 'A Player', hp: 7, max_hp: 7 }] });
    oldResponses.npcs.resolve({ data: [] });
    oldResponses.liveState.resolve({ data: { companion_npc_ids: [] } });
    await Promise.resolve();
  });

  expect(select).toHaveValue('b-encounter');
  expect(screen.getByText('B Player')).toBeInTheDocument();
  expect(screen.queryByText('Old Ambush')).not.toBeInTheDocument();
  expect(screen.queryByText('A Player')).not.toBeInTheDocument();
});
