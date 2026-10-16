import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LivePlayerDisplayControls from './LivePlayerDisplayControls';
import apiClient from '@/lib/apiClient';
import { createDisplayState } from '@/lib/liveDisplayBus';
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
    createDisplayState.mockImplementation((mode, payload) => ({ mode, payload }));
    apiClient.get.mockResolvedValue({ data: [] });
    publishCampaignDisplayStateWithStatus.mockImplementation(async (_campaignId, state) => ({ state, remoteSynced: true }));
  });

  test('shows all NPCs together or only checked NPCs without leaking private notes', async () => {
    const entries = ['Alys', 'Bram', 'Cora', 'Dain'].map((name, index) => ({
      id: 'npc-' + index, name, role: 'Townsfolk', notes: 'GM secret ' + name,
      public_description: 'Met at the inn',
    }));
    apiClient.get.mockImplementation(url => Promise.resolve({
      data: url.endsWith('/npcs') ? entries : [],
    }));

    render(<LivePlayerDisplayControls campaignId="campaign-1" />);
    const all = await screen.findByRole('button', { name: /Show All/i });
    fireEvent.click(all);
    await waitFor(() => expect(publishCampaignDisplayStateWithStatus).toHaveBeenCalledWith(
      'campaign-1',
      expect.objectContaining({ mode: 'npc-grid', payload: expect.objectContaining({
        npcs: expect.arrayContaining(entries.map(({ id, name }) => expect.objectContaining({ id, name }))),
      }) }),
    ));
    let sent = publishCampaignDisplayStateWithStatus.mock.calls.filter(([, state]) => state.mode === 'npc-grid').at(-1)[1];
    expect(sent.payload.npcs).toHaveLength(4);
    expect(JSON.stringify(sent)).not.toContain('GM secret');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Alys' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cora' }));
    fireEvent.click(screen.getByRole('button', { name: /Show Selected \(2\)/i }));
    await waitFor(() => expect(publishCampaignDisplayStateWithStatus.mock.calls.filter(([, state]) => state.mode === 'npc-grid')).toHaveLength(2));
    sent = publishCampaignDisplayStateWithStatus.mock.calls.filter(([, state]) => state.mode === 'npc-grid').at(-1)[1];
    expect(sent.payload.npcs.map(npc => npc.name)).toEqual(['Alys', 'Cora']);
  });

  test('Battle Starting sends a player-safe warning before the GM chooses the HUD', async () => {
    render(<LivePlayerDisplayControls campaignId="campaign-1" campaignName="Test Campaign" />);
    fireEvent.click(screen.getAllByRole('button', { name: /Battle Starting!/i })[0]);
    await waitFor(() => expect(publishCampaignDisplayStateWithStatus).toHaveBeenCalledWith(
      'campaign-1',
      expect.objectContaining({ mode: 'battle-start', payload: expect.objectContaining({ title: 'Battle Starting' }) }),
    ));
    const call = publishCampaignDisplayStateWithStatus.mock.calls.find(([, state]) => state.mode === 'battle-start');
    expect(call[1].payload).not.toHaveProperty('tokens');
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
