import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

function renderTable(mapUrl, tokens = [
  { id: 'goblin', name: 'Goblin', x: 50, y: 50 },
]) {
  loadDisplayState.mockReturnValue({
    mode: 'combat',
    payload: { display_target: 'virtual-table', map_url: mapUrl, tokens },
  });
  return render(
    <MemoryRouter initialEntries={['/campaign/example/player-display?target=virtual-table']}>
      <Routes>
        <Route path="/campaign/:campaignId/player-display" element={<PlayerDisplayPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('visible map token alignment', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
    apiClient.get.mockResolvedValue({ data: [] });
  });

  afterEach(() => jest.restoreAllMocks());

  test('a mapless encounter still renders without an image-size crash', () => {
    renderTable('');
    expect(screen.getByTestId('virtual-table-combat-hud')).toBeInTheDocument();
    expect(screen.getByText('Battle map waiting')).toBeInTheDocument();
  });

  test('hidden enemies are absent from the player map, roster and token shelf', () => {
    renderTable('', [
      { id: 'hidden-map', name: 'Secret Beholder', x: 40, y: 40, hidden: true },
      { id: 'hidden-shelf', name: 'Secret Dragon', is_hidden: true },
      { id: 'invisible', name: 'Invisible Golem', player_visible: false, x: 10, y: 20 },
      { id: 'revealed', name: 'Friendly Goblin', x: 25, y: 50 },
    ]);
    expect(screen.queryByText('Secret Beholder')).not.toBeInTheDocument();
    expect(screen.queryByText('Secret Dragon')).not.toBeInTheDocument();
    expect(screen.queryByText('Invisible Golem')).not.toBeInTheDocument();
    expect(screen.queryByTestId('combat-map-token-hidden-map')).not.toBeInTheDocument();
    expect(screen.getByText('Friendly Goblin')).toBeInTheDocument();
  });

  test('0,0 is a real map location; only missing coordinates go to the shelf', () => {
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, right: 1280, bottom: 720,
      width: 1280, height: 720, toJSON: () => ({}),
    });
    renderTable('https://example.test/battle-map.png', [
      { id: 'edge', name: 'Edge Scout', x: 0, y: 0 },
      { id: 'far-edge', name: 'Far Scout', x: 100, y: 100 },
      { id: 'waiting', name: 'Waiting Scout' },
    ]);
    const image = screen.getByRole('img', { name: 'Battle map' });
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 1280 });
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 720 });
    fireEvent.load(image);
    expect(screen.getByTestId('combat-map-token-edge')).toHaveStyle({
      left: '0%', top: '0%', transform: 'translate(0%, 0%)',
    });
    expect(screen.getByTestId('combat-map-token-far-edge')).toHaveStyle({
      left: '100%', top: '100%', transform: 'translate(-100%, -100%)',
    });
    expect(screen.queryByTestId('combat-map-token-waiting')).not.toBeInTheDocument();
    expect(screen.getAllByText('Waiting Scout').length).toBeGreaterThan(0);
  });

  test('token overlay matches the actual contained portrait-map rectangle', () => {
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, right: 1280, bottom: 720,
      width: 1280, height: 720, toJSON: () => ({}),
    });
    renderTable('https://example.test/portrait-map.png');
    const image = screen.getByRole('img', { name: 'Battle map' });
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 800 });
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 1200 });
    fireEvent.load(image);

    const overlay = screen.getByTestId('combat-map-token-overlay');
    expect(overlay).toHaveStyle({ left: '400px', top: '0px', width: '480px', height: '720px' });
    expect(overlay).toContainElement(screen.getByText('G'));
  });
});
