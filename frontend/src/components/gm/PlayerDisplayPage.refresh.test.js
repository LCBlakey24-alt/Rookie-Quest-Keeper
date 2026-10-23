import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PlayerDisplayPage from './PlayerDisplayPage';
import apiClient from '@/lib/apiClient';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
jest.mock('@/lib/liveDisplayBus', () => ({
  loadDisplayState: () => ({ mode: 'blank', payload: {} }),
  subscribeDisplayState: () => () => {},
  subscribeRemoteDisplayState: () => () => {},
}));
jest.mock('@/data/campaignCharacterBridge', () => ({
  normalizeCampaignCharacter: value => value,
}));
jest.mock('@/components/gm/GroupCheckDisplay', () => () => null);

function showDisplay() {
  return render(
    <MemoryRouter initialEntries={['/campaign/example/player-display']}>
      <Routes>
        <Route path="/campaign/:campaignId/player-display" element={<PlayerDisplayPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('player display party polling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    apiClient.get.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('a failed refresh leaves last-known players visible and marks sync unavailable', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: [{ id: 'arin', name: 'Arin', hp: 12, maxHp: 20 }] })
      .mockRejectedValueOnce(new Error('network offline'));
    const view = showDisplay();
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText('Arin')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(15000);
      await Promise.resolve();
    });
    expect(screen.getByText('Arin')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Party sync unavailable · last-known roster shown');
    view.unmount();
  });

  test('a late old response cannot overwrite a newer party refresh', async () => {
    let finishOldRequest;
    apiClient.get
      .mockImplementationOnce(() => new Promise(resolve => { finishOldRequest = resolve; }))
      .mockResolvedValueOnce({ data: [{ id: 'current', name: 'Current Hero' }] });
    const view = showDisplay();

    await act(async () => {
      jest.advanceTimersByTime(15000);
      await Promise.resolve();
    });
    expect(screen.getByText('Current Hero')).toBeInTheDocument();

    await act(async () => {
      finishOldRequest({ data: [{ id: 'old', name: 'Old Hero' }] });
      await Promise.resolve();
    });
    expect(screen.getByText('Current Hero')).toBeInTheDocument();
    expect(screen.queryByText('Old Hero')).not.toBeInTheDocument();
    view.unmount();
  });
});
