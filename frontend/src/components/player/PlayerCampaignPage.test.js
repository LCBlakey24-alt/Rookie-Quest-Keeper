import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { fetchPlayerCampaignSections } from './playerCampaignData';
import { PlayerCampaignWorkspace } from './PlayerCampaignPage';

jest.mock('./playerCampaignData', () => ({ fetchPlayerCampaignSections: jest.fn() }));
jest.mock('./CombatInitiativeSubmitter', () => () => null);

const data = {
  campaign: { id: 'c1', name: 'Test table', description: 'Shared description' },
  party: [{ id: 'p1', name: 'Hero', level: 3 }],
  characters: [{ id: 'p1', name: 'Hero', current_hit_points: 0, max_hit_points: 20 }],
  failures: [],
};

beforeEach(() => { jest.resetAllMocks(); });

test('offers a real character sheet link, preserves zero HP and omits GM actions', async () => {
  fetchPlayerCampaignSections.mockResolvedValue(data);
  render(<MemoryRouter><PlayerCampaignWorkspace campaignId="c1" /></MemoryRouter>);
  expect(await screen.findByText('Test table')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open Sheet' })).toHaveAttribute('href', '/characters/p1');
  expect(screen.getByText('HP 0 / 20')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Player home' })).toHaveAttribute('href', '/player');
  expect(screen.queryByText('GM Notes')).not.toBeInTheDocument();
});

test('keeps loaded campaign details when refresh fails', async () => {
  fetchPlayerCampaignSections.mockResolvedValueOnce(data).mockResolvedValueOnce({ campaign: null, party: null, characters: null, failures: ['campaign details', 'characters'] });
  render(<MemoryRouter><PlayerCampaignWorkspace campaignId="c1" /></MemoryRouter>);
  await screen.findByText('Test table');
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Could not refresh');
  expect(screen.getByText('Test table')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open Sheet' })).toBeInTheDocument();
});
