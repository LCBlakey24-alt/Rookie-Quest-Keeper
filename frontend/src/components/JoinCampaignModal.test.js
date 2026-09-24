import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import JoinCampaignModal from './JoinCampaignModal';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('JoinCampaignModal approval messaging', () => {
  beforeEach(() => jest.clearAllMocks());

  test('tells the player when the GM still needs to approve the join', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        status: 'pending',
        campaign: { id: 'campaign-1', name: 'Tia-Karta' },
      },
    });

    render(
      <JoinCampaignModal
        characterId="char-1"
        characterName="Ari"
        open
        onOpenChange={jest.fn()}
        onSuccess={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('ABC123'), { target: { value: 'ABC123' } });
    fireEvent.click(screen.getByRole('button', { name: /Join Campaign/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith(
      'Request sent to GM',
      expect.objectContaining({ description: expect.stringContaining('waiting for approval') }),
    );
  });
});
