import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import CampaignFirstSteps from './CampaignFirstSteps';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { get: jest.fn() } }));

beforeEach(() => { localStorage.clear(); });

test('a new campaign gets four steps, each opening its tool', async () => {
  apiClient.get.mockResolvedValue({ data: [] });
  const onOpenTab = jest.fn();
  await act(async () => { render(<CampaignFirstSteps campaignId="camp-1" counts={{ players: 0, quests: 0, npcs: 0 }} onOpenTab={onOpenTab} />); });
  expect(screen.getByText(/0 of 4 done/)).toBeInTheDocument();
  fireEvent.click(screen.getByTestId('first-step-players'));
  fireEvent.click(screen.getByTestId('first-step-combat'));
  expect(onOpenTab.mock.calls.map(([tab]) => tab)).toEqual(['players', 'combat']);
  expect(apiClient.get).toHaveBeenCalledWith('/campaigns/camp-1/combat-scenarios');
});

test('steps tick themselves off from the campaign records', async () => {
  apiClient.get.mockResolvedValue({ data: [{ id: 'enc' }] });
  await act(async () => { render(<CampaignFirstSteps campaignId="camp-1" counts={{ players: 2, quests: 1, npcs: 0 }} onOpenTab={jest.fn()} />); });
  expect(screen.getByText(/3 of 4 done/)).toBeInTheDocument();
});

test('it goes away when everything is done, or when hidden', async () => {
  apiClient.get.mockResolvedValue({ data: [{ id: 'enc' }] });
  const { container, unmount } = render(<CampaignFirstSteps campaignId="camp-1" counts={{ players: 1, quests: 1, npcs: 1 }} onOpenTab={jest.fn()} />);
  await act(async () => {});
  expect(container).toBeEmptyDOMElement();
  unmount();
  apiClient.get.mockResolvedValue({ data: [] });
  await act(async () => { render(<CampaignFirstSteps campaignId="camp-2" counts={{}} onOpenTab={jest.fn()} />); });
  fireEvent.click(screen.getByRole('button', { name: 'Hide first steps' }));
  expect(screen.queryByTestId('campaign-first-steps')).toBeNull();
  expect(localStorage.getItem('rqk.firstSteps.hidden.camp-2')).toBe('1');
});
