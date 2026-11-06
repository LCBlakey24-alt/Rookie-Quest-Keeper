/**
 * Mounted: an optional lookup failing must not stop a fight the GM understands.
 *
 * The guard was:
 *   loadErrors.some(item => ['players','npcs','liveState'].includes(item.key))
 * so a failed saved-NPC or travelling-companion request -- suggestions the GM
 * had not asked for -- blocked a launch where the party and the prepared
 * enemies had both loaded cleanly.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LiveEncounterLauncher from './LiveEncounterLauncher';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));
jest.mock('@/lib/apiClient', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));

const apiClient = require('@/lib/apiClient');
const { toast } = require('sonner');

const CAMPAIGN = 'camp-1';
const SCENARIO = {
  id: 'hm01', name: 'Hollowmere Ambush', live_ready: true, live_default: true, planned_encounter_order: 1,
  combatants: [{ id: 'g1', name: 'Goblin', type: 'enemy', hp: 7, maxHp: 7 }],
};
const PLAYERS = [{ id: 'p1', character_id: 'c1', name: 'Rina Ironside', hp: 40, max_hp: 54, ac: 19 }];

function mockApi({ npcsFail = false, partyFail = false, players = PLAYERS } = {}) {
  apiClient.get.mockImplementation(url => {
    if (url === `/campaigns/${CAMPAIGN}`) return Promise.resolve({ data: { id: CAMPAIGN, name: 'Spilsby' } });
    if (url === `/campaigns/${CAMPAIGN}/combat-scenarios`) return Promise.resolve({ data: [SCENARIO] });
    if (url === `/campaigns/${CAMPAIGN}/npcs`) {
      return npcsFail ? Promise.reject(new Error('offline')) : Promise.resolve({ data: [] });
    }
    if (url === `/campaigns/${CAMPAIGN}/live-state`) return Promise.resolve({ data: { companion_npc_ids: [] } });
    if (url.includes('/live-party') || url.includes('/players')) {
      return partyFail ? Promise.reject(new Error('offline')) : Promise.resolve({ data: players });
    }
    return Promise.resolve({ data: [] });
  });
}

function open() {
  return render(<MemoryRouter><LiveEncounterLauncher campaignId={CAMPAIGN} /></MemoryRouter>);
}

async function start() {
  const launcher = await screen.findByTestId('live-encounter-launcher');
  fireEvent.click(within(launcher).getByTestId('live-encounter-start'));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  mockNavigate.mockClear();
});

test('a failed saved-NPC lookup warns but still starts the fight', async () => {
  mockApi({ npcsFail: true });
  open();
  await screen.findByTestId('live-encounter-launcher');
  await start();

  await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  const [, options] = mockNavigate.mock.calls[0];
  expect(options.state.scenario.combatants.length).toBeGreaterThan(0);
  expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('saved NPCs'));
});

test('the launched roster still carries the party and the enemy', async () => {
  mockApi({ npcsFail: true });
  open();
  await screen.findByTestId('live-encounter-launcher');
  await start();

  await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  const names = mockNavigate.mock.calls[0][1].state.scenario.combatants.map(item => item.name);
  expect(names).toEqual(expect.arrayContaining(['Rina Ironside', 'Goblin']));
});

test('an empty party that loaded cleanly still fights the prepared enemy', async () => {
  mockApi({ players: [] });
  open();
  await screen.findByTestId('live-encounter-launcher');
  await start();

  await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  const combatants = mockNavigate.mock.calls[0][1].state.scenario.combatants;
  expect(combatants.map(item => item.name)).toEqual(['Goblin']);
});

test('a party that could not be read asks before leaving everyone out', async () => {
  const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
  mockApi({ partyFail: true });
  open();
  await screen.findByTestId('live-encounter-launcher');
  await start();

  expect(confirmSpy).toHaveBeenCalled();
  expect(mockNavigate).not.toHaveBeenCalled();
  confirmSpy.mockRestore();
});

test('and starts without them once the GM confirms', async () => {
  const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
  mockApi({ partyFail: true });
  open();
  await screen.findByTestId('live-encounter-launcher');
  await start();

  await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  const combatants = mockNavigate.mock.calls[0][1].state.scenario.combatants;
  expect(combatants.every(item => item.type !== 'player')).toBe(true);
  confirmSpy.mockRestore();
});

test('the launched party uses canonical character state, not the prepared snapshot', async () => {
  // Rina is on 40 of 54 right now. A prepared snapshot saying 54 must not win.
  mockApi();
  open();
  await screen.findByTestId('live-encounter-launcher');
  await start();

  await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  const rina = mockNavigate.mock.calls[0][1].state.scenario.combatants.find(item => item.name === 'Rina Ironside');
  expect(rina.hp).toBe(40);
  expect(rina.maxHp).toBe(54);
});
