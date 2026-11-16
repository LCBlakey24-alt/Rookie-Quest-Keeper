import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import MonstersTab from './MonstersTab';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn(), info: jest.fn() },
}));
jest.mock('@/data/monsterDatabase', () => ({
  MONSTER_DATABASE: [{ id: 'wolf-1', name: 'Wolf', source: 'srd', type: 'beast', cr: '1/4', hp: 11, ac: 13 }],
}));
jest.mock('@/lib/monsterStatBlockAdapter', () => ({
  hasRatedMonsterCr: () => true,
  monsterCrValue: () => 0.25,
  normaliseMonsterStatBlock: creature => creature,
  monsterToCombatant: creature => ({ id: creature.id, name: creature.name, hp: creature.hp, ac: creature.ac }),
}));
jest.mock('./RosterSplitView', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ items, renderDetail, testId }) => React.createElement('div', { 'data-testid': testId },
      items[0] ? renderDetail(items[0]) : null),
  };
});
jest.mock('./NpcCompactStatBlock', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/components/MonsterLookup', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/components/CustomCreatureManager', () => ({
  __esModule: true,
  default: () => null,
}));

function setup({ maps = [], preserveBattlefield = true } = {}) {
  apiClient.get.mockImplementation(async path => ({
    data: path.endsWith('/maps') ? maps : [],
  }));
  apiClient.post.mockImplementation(async (path, payload) => ({
    data: {
      id: 'encounter-test-1',
      campaign_id: 'campaign-a',
      ...payload,
      ...(preserveBattlefield ? {} : { battlefield_mode: undefined, terrain_type: undefined, map_id: undefined }),
    },
  }));
  render(<MonstersTab campaignId="campaign-a" />);
}

async function pickWolfAndOpenBattlefield() {
  await screen.findByTestId('gm-bestiary-split-reference');
  fireEvent.click(screen.getByRole('button', { name: 'Add one Wolf' }));
  fireEvent.click(screen.getByText('Choose battlefield and grid'));
}

describe('encounter seed battlefield saving', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sends generic terrain and grid choices alongside combatants', async () => {
    setup();
    await pickWolfAndOpenBattlefield();
    fireEvent.click(screen.getByRole('button', { name: 'Generic textured floor' }));
    fireEvent.click(screen.getByTestId('terrain-choice-grass'));
    fireEvent.change(screen.getByLabelText('Map columns'), { target: { value: '42' } });
    fireEvent.change(screen.getByLabelText('Feet per square'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Encounter/ }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    expect(apiClient.post).toHaveBeenCalledWith('/campaigns/campaign-a/combat-scenarios',
      expect.objectContaining({
        battlefield_mode: 'generic', terrain_type: 'grass',
        map_id: '', grid_cols: 42, grid_rows: 20, feet_per_square: 10,
        combatants: [expect.objectContaining({ name: 'Wolf' })],
      }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  test('a saved map can be linked without modifying the stored map', async () => {
    const maps = [{ id: 'map-a', name: 'Forest Clearing', background_url: 'https://example.test/map.png' }];
    setup({ maps });
    await pickWolfAndOpenBattlefield();
    fireEvent.click(screen.getByRole('button', { name: 'Saved battle map' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Saved battlefield map' }), { target: { value: 'map-a' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Encounter/ }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    expect(apiClient.post.mock.calls[0][1]).toEqual(expect.objectContaining({
      battlefield_mode: 'saved', map_id: 'map-a',
    }));
    expect(maps[0].name).toBe('Forest Clearing');
  });

  test('a saved map cannot be chosen without selecting a map first', async () => {
    setup();
    await pickWolfAndOpenBattlefield();
    fireEvent.click(screen.getByRole('button', { name: 'Saved battle map' }));
    fireEvent.click(screen.getByRole('button', { name: /Save Encounter/ }));
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Choose an existing campaign battle map'));
  });

  test('warns when an older backend discards the requested terrain', async () => {
    setup({ preserveBattlefield: false });
    await pickWolfAndOpenBattlefield();
    fireEvent.click(screen.getByRole('button', { name: 'Generic textured floor' }));
    fireEvent.click(screen.getByTestId('terrain-choice-water'));
    fireEvent.click(screen.getByRole('button', { name: /Save Encounter/ }));
    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith(
      expect.stringContaining('battlefield was not retained'),
    ));
    expect(toast.success).not.toHaveBeenCalled();
  });
});
