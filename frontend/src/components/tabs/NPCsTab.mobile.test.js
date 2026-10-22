import React from 'react';
import fs from 'fs';
import path from 'path';
import { fireEvent, render, screen } from '@testing-library/react';
import NPCsTab from './NPCsTab';
import apiClient from '@/lib/apiClient';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));
jest.mock('@/components/RookFormFillPanel', () => () => null);

const NPCS = [
  { id: 'jordan', name: 'Jordan Crow', hp: 168, ac: 19, location: 'Balderin',
    attacks: [{ name: 'Great Weapon', bonus: '+9', damage: '2d6+5 slashing' }],
    stats: { strength: 20 }, notes: 'Saved GM backstory', backstory: 'Founder of the Shield.' },
  { id: 'edwin', name: 'Edwin Hollowmere', hp: 18, ac: 12,
    actions: [{ name: 'Fire Bolt', bonus: '+5', damage: '1d10 fire' }],
    description: 'Owner of Hollowmere Manor.' },
  { id: 'unstatted', name: 'Unfinished NPC', hp: 0, ac: 0 },
  { id: 'mabel', name: 'Mabel Barleybrook', hp: 102, ac: 15 },
];

beforeEach(() => {
  jest.clearAllMocks();
  apiClient.get.mockResolvedValue({ data: NPCS });
});

describe('GM NPC phone roster', () => {
  test('keeps names and verified HP/AC visible while full stat blocks are collapsed', async () => {
    render(<NPCsTab campaignId="spilsby-wednesday" />);
    const card = await screen.findByTestId('npc-card-jordan');
    expect(card).toHaveTextContent('Jordan Crow');
    expect(card).toHaveTextContent('168');
    expect(card).toHaveTextContent('19');
    expect(screen.getByTestId('npc-combat-card-jordan')).not.toHaveAttribute('open');
    const unknown = screen.getByTestId('npc-card-unstatted');
    expect(unknown).toHaveTextContent('—');
    expect(unknown).not.toHaveTextContent('HP 0');
  });

  test('expands and collapses all NPC stat blocks without modifying the stored data', async () => {
    render(<NPCsTab campaignId="spilsby-wednesday" />);
    await screen.findByTestId('npc-card-jordan');
    const toggle = screen.getByTestId('npc-toggle-all-stats');
    expect(toggle).toHaveTextContent('Show all stat blocks');
    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent('Collapse all stats');
    expect(screen.getByTestId('npc-combat-card-jordan')).toHaveAttribute('open');
    expect(screen.getByTestId('npc-combat-card-edwin')).toHaveAttribute('open');
    expect(screen.getByText('Great Weapon')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByTestId('npc-combat-card-jordan')).not.toHaveAttribute('open');
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(apiClient.put).not.toHaveBeenCalled();
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  test('mobile layout keeps the campaign header out of the sticky layer and compacts NPC cards', () => {
    const campaign = fs.readFileSync(path.join(__dirname, '../CampaignDashboard.css'), 'utf8');
    const roster = fs.readFileSync(path.join(__dirname, 'NPCsTab.css'), 'utf8');
    expect(campaign).toContain('#root .campaign-dashboard-simple .gm-dashboard-header.campaign-dashboard-header');
    expect(campaign).toContain('position: static !important;');
    expect(campaign).toContain('.campaign-dashboard-workspace');
    expect(roster).toContain('.rqk-npc-card-header');
    expect(roster).toContain('height: auto !important;');
    expect(roster).toContain('.rqk-npc-combat-quick-stats');
  });
});
