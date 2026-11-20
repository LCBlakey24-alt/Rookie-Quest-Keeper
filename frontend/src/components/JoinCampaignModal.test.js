import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import JoinCampaignModal from './JoinCampaignModal';
import apiClient from '@/lib/apiClient';

jest.mock('@/lib/apiClient', () => ({ post: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), info: jest.fn(), success: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

const renderModal = (props = {}) => render(
  <MemoryRouter>
    <JoinCampaignModal open onOpenChange={jest.fn()} {...props} />
  </MemoryRouter>,
);

const enterCode = (code = 'abc123') => {
  const input = screen.getByRole('textbox', { name: /campaign join code/i });
  fireEvent.change(input, { target: { value: code } });
  fireEvent.submit(input.closest('form'));
};

function mockPreviewThenJoin(prepared = [], joinData = { campaign: { name: 'Elders Herald' }, status: 'active' }) {
  apiClient.post.mockImplementation((url) => Promise.resolve({ data: url.endsWith('/preview')
    ? { campaign: { id: 'c1', name: 'Elders Herald' }, prepared_characters: prepared }
    : joinData }));
}

test('the code is checked first, then the chosen own character joins', async () => {
  mockPreviewThenJoin([], { campaign: { name: 'Elders Herald' }, status: 'pending' });
  const onSuccess = jest.fn();
  renderModal({ characterId: 'hero-1', characterName: 'Hero', onSuccess });
  enterCode();
  await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/campaign-invites/preview', { join_code: 'ABC123' }));
  expect(await screen.findByRole('radio', { name: /Hero/ })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Join Campaign' }));
  await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/campaign-invites/join', { join_code: 'ABC123', character_id: 'hero-1' }));
  expect(onSuccess).toHaveBeenCalledWith({ name: 'Elders Herald' }, 'pending');
});

test('a player with no characters can claim one the GM prepared', async () => {
  mockPreviewThenJoin([{ id: 'ready', name: 'Synthetic Ranger', race: 'Elf', character_class: 'Ranger', level: 3 }]);
  renderModal({ characters: [] });
  enterCode();
  const option = await screen.findByRole('radio', { name: /Synthetic Ranger/ });
  expect(option).toBeChecked();
  expect(screen.getByText(/Elf · Ranger · level 3/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Claim and Join' }));
  await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/campaign-invites/join', { join_code: 'ABC123', prepared_character_id: 'ready' }));
});

test('players with characters can still pick a prepared one instead', async () => {
  mockPreviewThenJoin([{ id: 'ready', name: 'Synthetic Ranger' }]);
  renderModal({ characters: [{ id: 'mine', name: 'My Bard' }], characterId: 'mine' });
  enterCode();
  expect(await screen.findByRole('radio', { name: /My Bard/ })).toBeChecked();
  fireEvent.click(screen.getByRole('radio', { name: /Synthetic Ranger/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Claim and Join' }));
  await waitFor(() => expect(apiClient.post).toHaveBeenLastCalledWith('/campaign-invites/join', { join_code: 'ABC123', prepared_character_id: 'ready' }));
});

test('with nothing to pick, it offers to create a character', async () => {
  mockPreviewThenJoin([]);
  renderModal({ characters: [] });
  enterCode();
  expect(await screen.findByRole('button', { name: 'Create Character' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Join Campaign|Claim/ })).toBeNull();
});

test('continue stays disabled until the code has six characters', () => {
  renderModal({ characterId: 'hero-1' });
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox', { name: /campaign join code/i }), { target: { value: 'abc' } });
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  expect(apiClient.post).not.toHaveBeenCalled();
});
