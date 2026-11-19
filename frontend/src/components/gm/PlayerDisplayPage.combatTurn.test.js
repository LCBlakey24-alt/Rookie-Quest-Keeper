import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import PlayerDisplayPage from './PlayerDisplayPage';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }));

const combat = (activeId) => ({ data: {
  state: { campaign_id: 'camp', mode: 'combat', updated_at: '2026-11-19T10:00:00Z', payload: {
    title: 'Synthetic Ambush', round: 2, active_id: activeId,
    party: [{ id: 'combatant-kestrel', name: 'Synthetic Rogue', type: 'player', hp: 30, maxHp: 33, initiative: 21 }],
    tokens: [{ id: 'bandit-1', name: 'Synthetic Bandit', type: 'enemy', initiative: 11, subtitle: 'Enemy' }],
  } },
  party: [],
} });

const card = (name) => screen.getAllByText(name).map(node => node.closest('article')).find(Boolean);

test("the combat page's own player id lights up that player's turn", async () => {
  apiClient.get.mockResolvedValue(combat('combatant-kestrel'));
  render(<MemoryRouter><PlayerDisplayPage tvCode="ABCD2345" /></MemoryRouter>);
  await screen.findByText('Synthetic Ambush');
  expect(card('Synthetic Rogue').className).toContain('is-active');
  expect(card('Synthetic Bandit').className).not.toContain('is-active');
});

test("Live Play's player-<id> form lights up the same card", async () => {
  apiClient.get.mockResolvedValue(combat('player-combatant-kestrel'));
  render(<MemoryRouter><PlayerDisplayPage tvCode="ABCD2345" /></MemoryRouter>);
  await screen.findByText('Synthetic Ambush');
  expect(card('Synthetic Rogue').className).toContain('is-active');
});

test('an enemy card does not repeat "Enemy" under its name', async () => {
  apiClient.get.mockResolvedValue(combat('bandit-1'));
  render(<MemoryRouter><PlayerDisplayPage tvCode="ABCD2345" /></MemoryRouter>);
  await screen.findByText('Synthetic Ambush');
  expect(card('Synthetic Bandit').className).toContain('is-active');
  expect(card('Synthetic Bandit').textContent.match(/Enemy/g)).toHaveLength(1);
});
