import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import PreparedCharactersPanel from './PreparedCharactersPanel';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const own = [
  { id: 'free', name: 'Synthetic Ranger' },
  { id: 'busy', name: 'Already playing', campaign_id: 'other' },
  { id: 'waiting', name: 'Synthetic Cleric', prepared_for_campaign_id: 'c1' },
];

beforeEach(() => {
  jest.clearAllMocks();
  apiClient.get.mockImplementation((url) => Promise.resolve({ data: url === '/characters' ? own
    : { characters: [{ id: 'waiting', name: 'Synthetic Cleric', race: 'Dwarf', character_class: 'Cleric', level: 2 }] } }));
});

const renderPanel = () => render(<MemoryRouter><PreparedCharactersPanel campaignId="c1" /></MemoryRouter>);

test('lists waiting characters and only offers free ones', async () => {
  renderPanel();
  expect(await screen.findByText('Synthetic Cleric')).toBeInTheDocument();
  expect(screen.getByText('Dwarf · Cleric · level 2')).toBeInTheDocument();
  const options = [...screen.getByTestId('prepared-pick').querySelectorAll('option')].map((option) => option.textContent);
  expect(options).toEqual(['Choose one of your characters…', 'Synthetic Ranger']);
  expect(screen.getByRole('link', { name: 'Create a character' })).toHaveAttribute('href', '/characters/new');
});

test('offers and withdraws characters', async () => {
  apiClient.post.mockResolvedValue({ data: { characters: [{ id: 'free', name: 'Synthetic Ranger' }, { id: 'waiting', name: 'Synthetic Cleric' }] } });
  apiClient.delete.mockResolvedValue({ data: { characters: [{ id: 'free', name: 'Synthetic Ranger' }] } });
  renderPanel();
  await screen.findByText('Synthetic Cleric');
  fireEvent.change(screen.getByTestId('prepared-pick'), { target: { value: 'free' } });
  fireEvent.click(screen.getByTestId('prepared-offer'));
  await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/campaigns/c1/prepared-characters', { character_id: 'free' }));
  expect(await screen.findByRole('button', { name: 'Stop offering Synthetic Ranger' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Stop offering Synthetic Cleric' }));
  await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/campaigns/c1/prepared-characters/waiting'));
});
