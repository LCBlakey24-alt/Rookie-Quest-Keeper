import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LiveSecondScreenDock from './LiveSecondScreenDock';
import apiClient from '@/lib/apiClient';
import * as liveDisplayBus from '@/lib/liveDisplayBus';
import * as liveDisplayPublishStatus from '@/lib/liveDisplayPublishStatus';
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
  subscribeDisplayState: jest.fn(),
  subscribeRemoteDisplayState: jest.fn(),
}));

jest.mock('@/lib/liveDisplayPublishStatus', () => ({
  publishCampaignDisplayStateWithStatus: jest.fn(async (_campaignId, state) => ({ state, remoteSynced: true })),
}));

jest.mock('@/data/tiaKartaSecondScreenPresets', () => [{
  id: 'test-screen',
  title: 'Test Screen',
  eyebrow: 'Test',
  subtitle: 'Testing',
}]);

describe('LiveSecondScreenDock reliability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    liveDisplayBus.createDisplayState.mockImplementation((mode, payload) => ({ mode, payload }));
    liveDisplayBus.loadDisplayState.mockReturnValue({ mode: 'blank', payload: {} });
    liveDisplayBus.subscribeDisplayState.mockImplementation(() => () => {});
    liveDisplayBus.subscribeRemoteDisplayState.mockImplementation(() => () => {});
    liveDisplayPublishStatus.publishCampaignDisplayStateWithStatus.mockImplementation(async (_campaignId, state) => ({ state, remoteSynced: true }));
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
    expect(screen.getByRole('checkbox', { name: /Mira/i })).toBeInTheDocument();

    failRefresh = true;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh assets' }));

    expect(await screen.findByTestId('second-screen-asset-warning')).toHaveTextContent('Keeping the last known assets');
    expect(screen.getByRole('button', { name: /Vault Map/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Mira/i })).toBeInTheDocument();
    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith(
      'Second screen assets only partly refreshed',
      expect.any(Object),
    ));
    expect(toast.success).not.toHaveBeenCalledWith('Second screen assets refreshed');
  });

  test('shows multiple selected NPC portraits in a single player-safe gallery', async () => {
    apiClient.get.mockImplementation(url => {
      if (url.endsWith('/npcs')) return Promise.resolve({ data: [
        { id: 'n1', name: 'Mira', portrait_url: '/mira.png', notes: 'GM secret one' },
        { id: 'n2', name: 'Thorgar', portrait_url: '/thorgar.png', gm_notes: 'GM secret two' },
      ] });
      return Promise.resolve({ data: [] });
    });

    render(<LiveSecondScreenDock campaignId="campaign-1" />);
    expect(await screen.findByLabelText(/Mira/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Mira/i));
    fireEvent.click(screen.getByLabelText(/Thorgar/i));
    fireEvent.click(screen.getByRole('button', { name: /Show selected NPCs \(2\)/i }));

    await waitFor(() => expect(liveDisplayPublishStatus.publishCampaignDisplayStateWithStatus).toHaveBeenCalled());
    const sent = liveDisplayPublishStatus.publishCampaignDisplayStateWithStatus.mock.calls.find(([, state]) => state?.mode === 'npc-grid')?.[1];
    expect(sent?.payload?.npcs).toHaveLength(2);
    expect(sent.payload.npcs.map(item => item.name)).toEqual(['Mira', 'Thorgar']);
    expect(JSON.stringify(sent.payload)).not.toMatch(/GM secret/);
  });

  test('finds world map uploads stored as legacy image_data', async () => {
    apiClient.get.mockImplementation(url => {
      if (url.endsWith('/world-maps')) return Promise.resolve({ data: [{ id: 'w1', name: 'Tia-Karta World', image_data: 'data:image/jpeg;base64,worldpicture' }] });
      return Promise.resolve({ data: [] });
    });

    render(<LiveSecondScreenDock campaignId="campaign-1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Tia-Karta World/i }));
    await waitFor(() => expect(liveDisplayPublishStatus.publishCampaignDisplayStateWithStatus).toHaveBeenCalled());
    const sent = liveDisplayPublishStatus.publishCampaignDisplayStateWithStatus.mock.calls.find(([, state]) => state?.mode === 'image')?.[1];
    expect(sent?.mode).toBe('image');
    expect(sent.payload.image_url).toBe('data:image/jpeg;base64,worldpicture');
  });

  test('warns when a reveal only updates the local display', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    liveDisplayPublishStatus.publishCampaignDisplayStateWithStatus.mockResolvedValue({
      state: { mode: 'title', payload: { title: 'Test Screen' } },
      remoteSynced: false,
    });

    render(<LiveSecondScreenDock campaignId="campaign-1" />);

    fireEvent.click(await screen.findByRole('button', { name: /Test Screen/i }));

    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith(
      'Updated locally — remote display not synced',
      expect.any(Object),
    ));
    expect(toast.success).not.toHaveBeenCalledWith('Second screen updated', expect.any(Object));
  });
});
