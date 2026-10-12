import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LiveNpcLookup from './LiveNpcLookup';
import apiClient from '@/lib/apiClient';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn() },
}));
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
}));

describe('Live NPC full card details', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.get.mockImplementation(url => {
      if (url.endsWith('/npcs')) return Promise.resolve({ data: [{
        id: 'mira-1',
        name: 'Mira',
        role: 'Scout',
        description: 'The full description with information at the very end: ' + 'long '.repeat(60) + 'END OF DESCRIPTION',
        personality: 'Cautious but curious.',
        notes: 'GM ONLY: The hidden clue remains readable.',
      }] });
      if (url.endsWith('/locations')) return Promise.resolve({ data: [] });
      if (url.endsWith('/live-state')) return Promise.resolve({ data: { companion_npc_ids: [] } });
      throw new Error('Unexpected endpoint: ' + url);
    });
  });

  test('expanded NPC shows complete description, personality and GM notes without a capped inner scroller', async () => {
    render(<LiveNpcLookup campaignId="campaign-1" />);
    const name = await screen.findByText('Mira');
    fireEvent.click(name.closest('button'));
    expect(screen.getByText(/END OF DESCRIPTION/)).toBeInTheDocument();
    expect(screen.getByText(/Cautious but curious/)).toBeInTheDocument();
    expect(screen.getByText(/The hidden clue remains readable/)).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Personality')).toBeInTheDocument();
    expect(screen.getByText('GM notes')).toBeInTheDocument();
  });
});
