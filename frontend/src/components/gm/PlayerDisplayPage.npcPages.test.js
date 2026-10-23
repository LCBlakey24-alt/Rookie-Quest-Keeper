import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PlayerDisplayPage from './PlayerDisplayPage';
import apiClient from '@/lib/apiClient';
import { loadDisplayState } from '@/lib/liveDisplayBus';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
jest.mock('@/lib/liveDisplayBus', () => ({
  loadDisplayState: jest.fn(),
  subscribeDisplayState: () => () => {},
  subscribeRemoteDisplayState: () => () => {},
}));
jest.mock('@/data/campaignCharacterBridge', () => ({
  normalizeCampaignCharacter: value => value,
}));
jest.mock('@/components/gm/GroupCheckDisplay', () => () => null);

const makeNpcs = count => Array.from({ length: count }, (_, index) => ({
  id: `npc-${index + 1}`,
  name: `NPC ${String(index + 1).padStart(2, '0')}`,
  image_url: '',
}));

function renderScene(target, count) {
  loadDisplayState.mockReturnValue({
    mode: 'npc-grid',
    updated_at: '2026-10-23T16:30:00',
    payload: { npcs: makeNpcs(count), title: 'The party arrives' },
  });
  return render(
    <MemoryRouter initialEntries={[`/campaign/test/player-display?target=${target}`]}>
      <Routes>
        <Route path="/campaign/:campaignId/player-display" element={<PlayerDisplayPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('player-facing NPC gallery pagination', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    apiClient.get.mockResolvedValue({ data: [] });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('eight or fewer NPCs stay together with no pagination buttons', () => {
    const view = renderScene('standing-tv', 8);
    expect(view.container.querySelectorAll('.rqk-player-display__npc-card')).toHaveLength(8);
    expect(screen.queryByRole('group', { name: 'NPC gallery pages' })).not.toBeInTheDocument();
    view.unmount();
  });

  test('large TV scenes stay legible and cycle all NPCs with manual controls', () => {
    const view = renderScene('standing-tv', 11);
    expect(view.container.querySelectorAll('.rqk-player-display__npc-card')).toHaveLength(8);
    expect(screen.getByText('NPC 01')).toBeInTheDocument();
    expect(screen.queryByText('NPC 11')).not.toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next NPC page' }));
    expect(view.container.querySelectorAll('.rqk-player-display__npc-card')).toHaveLength(3);
    expect(screen.getByText('NPC 11')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous NPC page' }));
    expect(screen.getByText('NPC 01')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(10000); });
    expect(screen.getByText('NPC 11')).toBeInTheDocument();
    view.unmount();
  });

  test('virtual tabletop keeps up to ten NPCs visible on one page', () => {
    const view = renderScene('virtual-table', 10);
    expect(view.container.querySelectorAll('.rqk-player-display__npc-card')).toHaveLength(10);
    expect(screen.queryByRole('button', { name: 'Next NPC page' })).not.toBeInTheDocument();
    view.unmount();
  });
});
