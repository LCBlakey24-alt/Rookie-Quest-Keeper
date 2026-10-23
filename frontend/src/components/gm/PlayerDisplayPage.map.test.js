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

function renderTable(mapUrl) {
  loadDisplayState.mockReturnValue({
    mode: 'combat',
    payload: { display_target: 'virtual-table', map_url: mapUrl, tokens: [
      { id: 'goblin', name: 'Goblin', x: 50, y: 50 },
    ] },
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
