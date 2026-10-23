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

  test('reveals a portraitless NPC beyond the first 24 while keeping other selections', async () => {
    const npcs = Array.from({ length: 30 }, (_, index) => ({
      id: `npc-${index + 1}`,
      name: `NPC ${String(index + 1).padStart(2, '0')}`,
      notes: 'Private GM plot detail',
    }));
    apiClient.get.mockImplementation(url => Promise.resolve({
      data: url.endsWith('/npcs') ? npcs : [],
    }));

    render(<LiveSecondScreenDock campaignId="campaign-1" />);
    expect(await screen.findByText('0 selected · 30 of 30 NPCs shown')).toBeInTheDocument();

    const search = screen.getByRole('searchbox', { name: 'Search second screen NPCs' });
    fireEvent.change(search, { target: { value: 'NPC 30' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Reveal NPC 30' }));
    fireEvent.change(search, { target: { value: 'NPC 01' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Reveal NPC 01' }));
    expect(screen.getByText('2 selected · 1 of 30 NPCs shown')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Show selected NPCs \(2\)/ }));
    await waitFor(() => expect(liveDisplayPublishStatus.publishCampaignDisplayStateWithStatus).toHaveBeenCalledWith(
      'campaign-1',
      expect.objectContaining({ mode: 'npc-grid' }),
    ));
    const state = liveDisplayPublishStatus.publishCampaignDisplayStateWithStatus.mock.calls
      .find(([, payload]) => payload?.mode === 'npc-grid')?.[1];
    expect(state.payload.npcs.map(npc => npc.name)).toEqual(['NPC 01', 'NPC 30']);
    expect(state.payload.npcs.every(npc => npc.image_url === '')).toBe(true);
    expect(JSON.stringify(state.payload)).not.toContain('Private GM plot detail');
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
