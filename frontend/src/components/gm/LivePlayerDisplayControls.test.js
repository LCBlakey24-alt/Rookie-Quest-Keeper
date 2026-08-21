import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LivePlayerDisplayControls from './LivePlayerDisplayControls';
import apiClient from '@/lib/apiClient';
import { publishCampaignDisplayStateWithStatus } from '@/lib/liveDisplayPublishStatus';
import { toast } from 'sonner';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('@/lib/liveDisplayBus', () => ({
  createDisplayState: jest.fn((mode, payload) => ({ mode, payload })),
  loadDisplayState: jest.fn(() => ({ mode: 'blank', payload: {} })),
}));

jest.mock('@/lib/liveDisplayPublishStatus', () => ({
  publishCampaignDisplayStateWithStatus: jest.fn(),
}));

jest.mock('@/data/campaignCharacterBridge', () => ({
  normalizeCampaignCharacter: jest.fn((value) => value),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('LivePlayerDisplayControls reliability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.get.mockResolvedValue({ data: [] });
    publishCampaignDisplayStateWithStatus.mockImplementation(async (_campaignId, state) => ({ state, remoteSynced: true }));
  });

  test('warns instead of reporting remote success when a reveal only synced locally', async () => {
    publishCampaignDisplayStateWithStatus.mockImplementation(async (_campaignId, state) => ({ state, remoteSynced: false }));

    render(<LivePlayerDisplayControls campaignId="campaign-1" campaignName="Test Campaign" />);

    fireEvent.click(screen.getByRole('button', { name: /Send Scene Title/i }));

    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith(
      'Updated locally — remote display not synced',
      expect.any(Object),
    ));
    expect(toast.success).not.toHaveBeenCalledWith('Sent to player display', expect.any(Object));
  });

  test('keeps last-known maps when a manual refresh cannot reload maps', async () => {
    let failMaps = false;
    apiClient.get.mockImplementation((url) => {
      if (url.endsWith('/maps')) {
        return failMaps ? Promise.reject(new Error('offline')) : Promise.resolve({ data: [{ id: 'map-1', name: 'Vault Map' }] });
      }
      return Promise.resolve({ data: [] });
    });

    render(<LivePlayerDisplayControls campaignId="campaign-1" />);

    expect(await screen.findByRole('option', { name: 'Vault Map' })).toBeInTheDocument();

    failMaps = true;
    fireEvent.click(screen.getByRole('button', { name: /Refresh Data/i }));

    expect(await screen.findByTestId('player-display-resource-warning')).toHaveTextContent('maps');
    expect(screen.getByRole('option', { name: 'Vault Map' })).toBeInTheDocument();
    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith(
      'Player display data only partly refreshed',
      expect.any(Object),
    ));
    expect(toast.success).not.toHaveBeenCalledWith('Player display data refreshed');
  });
});
