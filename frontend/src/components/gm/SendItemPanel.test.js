import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SendItemPanel from './SendItemPanel';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const theme = {
  bg: { card: '#111' },
  border: '#333',
  text: { primary: '#fff', secondary: '#ddd', muted: '#999' },
  accent: { primary: '#c08a3d', secondary: '#e0b15c', gm: '#d00000' },
  gradient: 'linear-gradient(#d00000,#900)',
};

describe('SendItemPanel GM to player flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates a campaign item and grants that exact item to the selected character', async () => {
    apiClient.post
      .mockResolvedValueOnce({ data: { id: 'item-1', name: 'Flame Tongue' } })
      .mockResolvedValueOnce({ data: { message: 'Flame Tongue granted to Ari' } });

    render(
      <SendItemPanel
        theme={theme}
        campaignId="campaign-1"
        partyCharacters={[{ id: 'char-1', name: 'Ari', level: 5, character_class: 'Fighter' }]}
      />,
    );

    fireEvent.change(screen.getByTestId('item-recipient'), { target: { value: 'char-1' } });
    fireEvent.change(screen.getByTestId('item-name-input'), { target: { value: 'Flame Tongue' } });
    fireEvent.change(screen.getByTestId('item-rarity-select'), { target: { value: 'Rare' } });
    fireEvent.click(screen.getByTestId('attunement-checkbox'));
    fireEvent.click(screen.getByTestId('send-item-btn'));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(2));
    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/campaigns/campaign-1/inventory', expect.objectContaining({
      name: 'Flame Tongue',
      quantity: 1,
      item_type: 'wondrous',
      attunement_required: true,
      notes: 'Rare rarity',
    }));
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/campaigns/campaign-1/inventory/item-1/grant', {
      target_type: 'character',
      target_id: 'char-1',
    });
    expect(toast.success).toHaveBeenCalledWith('Flame Tongue granted to Ari');
  });

  test('does not lose an item if the final grant fails', async () => {
    apiClient.post
      .mockResolvedValueOnce({ data: { id: 'item-2', name: 'Moon Blade' } })
      .mockRejectedValueOnce({ response: { data: { detail: 'Character is no longer in this campaign' } } });

    render(
      <SendItemPanel
        theme={theme}
        campaignId="campaign-1"
        partyCharacters={[{ id: 'char-1', name: 'Ari', level: 5, character_class: 'Fighter' }]}
      />,
    );

    fireEvent.change(screen.getByTestId('item-recipient'), { target: { value: 'char-1' } });
    fireEvent.change(screen.getByTestId('item-name-input'), { target: { value: 'Moon Blade' } });
    fireEvent.click(screen.getByTestId('send-item-btn'));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(2));
    expect(toast.error).toHaveBeenCalledWith('Character is no longer in this campaign');
  });

  test('requires an active campaign before enabling send', () => {
    render(
      <SendItemPanel
        theme={theme}
        partyCharacters={[{ id: 'char-1', name: 'Ari', level: 5, character_class: 'Fighter' }]}
      />,
    );

    fireEvent.change(screen.getByTestId('item-recipient'), { target: { value: 'char-1' } });
    fireEvent.change(screen.getByTestId('item-name-input'), { target: { value: 'Potion' } });

    expect(screen.getByTestId('send-item-btn')).toBeDisabled();
  });
});
