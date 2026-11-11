import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GMPartyWorkspace from './GMPartyWorkspace';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/components/tabs/PlayersTab', () => function MockPlayersTab() {
  return <div>Legacy players</div>;
});

const member = {
  id: 'member-1',
  character_id: 'char-1',
  character_name: 'Ari',
  character_class: 'Fighter',
  character_level: 3,
  status: 'active',
};

const liveParty = {
  character_id: 'char-1',
  name: 'Ari',
  hp: 24,
  max_hp: 30,
  ac: 17,
  initiativeMod: 2,
};

describe('GMPartyWorkspace refresh reliability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('keeps last known joined characters when a later refresh fails', async () => {
    let failRefresh = false;
    apiClient.get.mockImplementation(url => {
      if (failRefresh) return Promise.reject(new Error('offline'));
      if (url.endsWith('/members')) return Promise.resolve({ data: [member] });
      if (url.endsWith('/live-party')) return Promise.resolve({ data: [liveParty] });
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    render(<GMPartyWorkspace campaignId="campaign-1" />);
    expect(await screen.findByText('Ari')).toBeInTheDocument();

    failRefresh = true;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(await screen.findByTestId('gm-party-load-warning')).toHaveTextContent('Showing the last known data');
    expect(screen.getByText('Ari')).toBeInTheDocument();
    expect(screen.queryByText('No joined characters yet. Share the join code above and they will appear here.')).not.toBeInTheDocument();
  });

  test('reports a saved status change accurately when the follow-up refresh fails', async () => {
    let failRefresh = false;
    apiClient.get.mockImplementation(url => {
      if (failRefresh) return Promise.reject(new Error('offline'));
      if (url.endsWith('/members')) return Promise.resolve({ data: [member] });
      if (url.endsWith('/live-party')) return Promise.resolve({ data: [liveParty] });
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    apiClient.put.mockImplementation(async () => {
      failRefresh = true;
      return { data: { status: 'retired' } };
    });

    render(<GMPartyWorkspace campaignId="campaign-1" />);
    const statusSelect = await screen.findByDisplayValue('Active');
    fireEvent.change(statusSelect, { target: { value: 'retired' } });

    await waitFor(() => expect(apiClient.put).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByDisplayValue('Retired')).toBeInTheDocument());
    expect(toast.warning).toHaveBeenCalledWith(
      'Ari marked Retired',
      expect.objectContaining({ description: expect.stringContaining('status change was saved') }),
    );
  });
});

describe('granting a level up', () => {
  const loadParty = () => {
    apiClient.get.mockImplementation((url) => Promise.resolve({ data: url.includes('/members') ? [member] : [liveParty] }));
  };

  test('the GM grants a level after confirming, and the card says so', async () => {
    loadParty();
    apiClient.post.mockResolvedValue({ data: { message: 'Ari can now level up to 4', grant: { to_level: 4 }, already_pending: false } });
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(<GMPartyWorkspace campaignId="camp-1" />);
    fireEvent.click(await screen.findByTestId('grant-level-up-char-1'));
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('Let Ari level up to 4?'));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/campaigns/camp-1/characters/char-1/level-up-grant'));
    expect(await screen.findByTestId('level-up-granted-char-1')).toHaveTextContent('Level 4 granted');
    expect(toast.success).toHaveBeenCalledWith('Ari can now level up to 4');
    confirmSpy.mockRestore();
  });

  test('cancelling the confirmation grants nothing', async () => {
    loadParty();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(<GMPartyWorkspace campaignId="camp-1" />);
    fireEvent.click(await screen.findByTestId('grant-level-up-char-1'));
    expect(apiClient.post).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
