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

  test('can search and reveal NPCs past the first 24 while retaining other selections', async () => {
    const savedNpcs = Array.from({ length: 30 }, (_, index) => ({
      id: `npc-${index + 1}`,
      name: `NPC ${String(index + 1).padStart(2, '0')}`,
      private_notes: 'Never send this to players',
      public_description: 'A visible villager',
    }));
    apiClient.get.mockImplementation((url) => Promise.resolve({
      data: url.endsWith('/npcs') ? savedNpcs : [],
    }));

    render(<LivePlayerDisplayControls campaignId="campaign-1" />);
    const search = screen.getByRole('searchbox', { name: 'Search NPCs to reveal' });
    await waitFor(() => expect(screen.getByText('0 selected · Showing 30 of 30 NPCs')).toBeInTheDocument());

    fireEvent.change(search, { target: { value: 'NPC 30' } });
    expect(screen.getByText('0 selected · Showing 1 of 30 NPCs')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Reveal NPC 30' }));
    fireEvent.change(search, { target: { value: 'NPC 01' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Reveal NPC 01' }));
    expect(screen.getByText('2 selected · Showing 1 of 30 NPCs')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /Send NPC Grid/i })[0]);
    await waitFor(() => expect(publishCampaignDisplayStateWithStatus).toHaveBeenCalledWith(
      'campaign-1',
      expect.objectContaining({
        mode: 'npc-grid',
        payload: expect.objectContaining({
          npcs: expect.arrayContaining([
            expect.objectContaining({ id: 'npc-1' }),
            expect.objectContaining({ id: 'npc-30' }),
          ]),
        }),
      }),
    ));
    const reveal = publishCampaignDisplayStateWithStatus.mock.calls.find(([, state]) => state.mode === 'npc-grid');
    expect(reveal[1].payload.npcs).toHaveLength(2);
    expect(reveal[1].payload.npcs[0]).not.toHaveProperty('private_notes');
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
