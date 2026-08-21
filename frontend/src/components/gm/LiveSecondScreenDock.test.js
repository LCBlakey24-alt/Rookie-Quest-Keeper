import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LiveSecondScreenDock from './LiveSecondScreenDock';
import apiClient from '@/lib/apiClient';
import * as liveDisplayBus from '@/lib/liveDisplayBus';
import { toast } from 'sonner';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/lib/liveDisplayBus', () => ({
  createDisplayState: jest.fn((mode, payload) => ({ mode, payload })),
  loadDisplayState: jest.fn(() => ({ mode: 'blank', payload: {} })),
  publishCampaignDisplayState: jest.fn(async (_campaignId, state) => state),
  subscribeDisplayState: jest.fn(),
  subscribeRemoteDisplayState: jest.fn(),
}));

jest.mock('@/data/tiaKartaSecondScreenPresets', () => []);

describe('LiveSecondScreenDock asset refresh reliability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    liveDisplayBus.loadDisplayState.mockReturnValue({ mode: 'blank', payload: {} });
    liveDisplayBus.subscribeDisplayState.mockImplementation(() => () => {});
    liveDisplayBus.subscribeRemoteDisplayState.mockImplementation(() => () => {});
    liveDisplayBus.publishCampaignDisplayState.mockImplementation(async (_campaignId, state) => state);
  });

  test('keeps last known map and NPC assets when a manual refresh fails', async () => {
    let failRefresh = false;
    apiClient.get.mockImplementation(url => {
      if (failRefresh) return Promise.reject(new Error('offline'));
      if (url.endsWith('/maps')) return Promise.resolve({ data: [{ id: 'map-1', name: 'Vault Map', image_url: '/map.png' }] });
      if (url.endsWith('/npcs')) return Promise.resolve({ data: [{ id: 'npc-1', name: 'Mira', portrait_url: '/mira.png' }] });
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    render(<LiveSecondScreenDock campaignId="campaign-1" />);

    expect(await screen.findByRole('button', { name: /Vault Map/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mira/i })).toBeInTheDocument();

    failRefresh = true;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh assets' }));

    expect(await screen.findByTestId('second-screen-asset-warning')).toHaveTextContent('Keeping the last known assets');
    expect(screen.getByRole('button', { name: /Vault Map/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mira/i })).toBeInTheDocument();
    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith(
      'Second screen assets only partly refreshed',
      expect.any(Object),
    ));
    expect(toast.success).not.toHaveBeenCalledWith('Second screen assets refreshed');
  });
});
