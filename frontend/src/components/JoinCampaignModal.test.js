import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import JoinCampaignModal from './JoinCampaignModal';
import apiClient from '@/lib/apiClient';

jest.mock('@/lib/apiClient', () => ({ post: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), info: jest.fn(), success: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

test('join code has an accessible label and Enter submits the selected character', async () => {
  apiClient.post.mockResolvedValue({ data: { campaign: { name: 'Elders Herald' }, status: 'pending' } });
  const onSuccess = jest.fn();
  render(<JoinCampaignModal characterId="hero-1" characterName="Hero" open onOpenChange={jest.fn()} onSuccess={onSuccess} />);

  const input = screen.getByRole('textbox', { name: /campaign join code/i });
  fireEvent.change(input, { target: { value: 'abc123' } });
  fireEvent.submit(input.closest('form'));

  await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/campaign-invites/join', {
    join_code: 'ABC123', character_id: 'hero-1',
  }));
  expect(onSuccess).toHaveBeenCalledWith({ name: 'Elders Herald' }, 'pending');
});

test('join remains disabled until the code has six characters', () => {
  render(<JoinCampaignModal characterId="hero-1" open onOpenChange={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Join Campaign' })).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox', { name: /campaign join code/i }), { target: { value: 'abc' } });
  expect(screen.getByRole('button', { name: 'Join Campaign' })).toBeDisabled();
  expect(apiClient.post).not.toHaveBeenCalled();
});
