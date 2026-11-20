import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import QuestManagerV3 from './QuestManagerV3';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() } }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

test('every quest control has a name a screen reader can announce', async () => {
  apiClient.get.mockImplementation((url) => Promise.resolve({ data: url.endsWith('/quests')
    ? [{ id: 'q1', title: 'Synthetic Lost Bell', status: 'active', linked_npc_ids: [] }]
    : url.endsWith('/npcs') ? [{ id: 'n1', name: 'Synthetic Bellringer' }] : [] }));
  await act(async () => { render(<QuestManagerV3 campaignId="camp-1" onOpenTab={jest.fn()} />); });
  expect(screen.getByRole('combobox', { name: 'Show quests' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Search quests' })).toBeInTheDocument();
  // Open the quest so its status and link pickers render (they had no name).
  const toggle = screen.getAllByRole('button').find((b) => /Synthetic Lost Bell/.test(b.textContent || ''));
  await act(async () => { fireEvent.click(toggle); });
  expect(screen.getByRole('combobox', { name: 'Status of Synthetic Lost Bell' })).toBeInTheDocument();
  expect(screen.getAllByRole('combobox', { name: /to Synthetic Lost Bell$/ }).length).toBeGreaterThan(0);
  const unnamed = screen.queryAllByRole('combobox').filter((el) => !el.getAttribute('aria-label'));
  expect(unnamed).toHaveLength(0);
});
