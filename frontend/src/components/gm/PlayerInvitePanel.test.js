import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PlayerInvitePanel from './PlayerInvitePanel';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
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

jest.mock('@/components/gm/CampaignJoinCodeCard', () => function MockJoinCodeCard(props) {
  return (
    <div>
      <span data-testid="join-code">{props.code || 'NO-CODE'}</span>
      <button type="button" onClick={props.onRotate}>Rotate code</button>
    </div>
  );
});

describe('PlayerInvitePanel refresh reliability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  test('does not report success when player detail requests fail', async () => {
    apiClient.get.mockRejectedValue(new Error('offline'));

    render(<PlayerInvitePanel campaignId="campaign-1" />);

    expect(await screen.findByTestId('player-invite-load-warning')).toHaveTextContent('Could not refresh');
    expect(toast.success).not.toHaveBeenCalledWith('Player details refreshed');
  });

  test('preserves a newly rotated join code if the follow-up invite refresh fails', async () => {
    let afterRotate = false;
    apiClient.get.mockImplementation(url => {
      if (url === '/campaign-invites/campaign-1') {
        if (afterRotate) return Promise.reject(new Error('invite refresh failed'));
        return Promise.resolve({ data: { join_code: 'OLD123', uses: 1 } });
      }
      if (url === '/campaigns/campaign-1/live-party') return Promise.resolve({ data: [] });
      if (url === '/campaign-invites/campaign-1/members') return Promise.resolve({ data: [] });
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    apiClient.post.mockImplementation(async () => {
      afterRotate = true;
      return { data: { join_code: 'NEW456', uses: 0 } };
    });

    render(<PlayerInvitePanel campaignId="campaign-1" />);
    await waitFor(() => expect(screen.getByTestId('join-code')).toHaveTextContent('OLD123'));

    fireEvent.click(screen.getByRole('button', { name: 'Rotate code' }));

    await waitFor(() => expect(screen.getByTestId('join-code')).toHaveTextContent('NEW456'));
    expect(toast.warning).toHaveBeenCalledWith(
      'New join code saved, but some player details did not refresh',
      expect.any(Object),
    );
  });
});


test('offline players can link a saved character without needing a join code', async () => {
  window.rookieDesktop = { offline: true };
  let attached = false;
  const hero = { id: 'hero-8', name: 'Test Paladin', level: 8, max_hit_points: 64 };
  apiClient.get.mockImplementation(url => {
    if (url === '/characters') return Promise.resolve({ data: [{ ...hero, campaign_id: attached ? 'campaign-1' : null }] });
    if (url === '/campaign-invites/campaign-1') return Promise.resolve({ data: { campaign_id: 'campaign-1' } });
    if (url === '/campaign-invites/campaign-1/members') return Promise.resolve({ data: attached ? [{ character_id: hero.id, character_name: hero.name, status: 'active' }] : [] });
    if (url === '/campaigns/campaign-1/live-party') return Promise.resolve({ data: attached ? [{ ...hero, character_id: hero.id }] : [] });
    return Promise.reject(new Error('Unexpected request: ' + url));
  });
  apiClient.post.mockImplementation(async () => { attached = true; return { data: { ...hero, campaign_id: 'campaign-1' } }; });
  render(<PlayerInvitePanel campaignId="campaign-1" />);

  expect(await screen.findByTestId('offline-player-management')).toBeInTheDocument();
  expect(screen.queryByTestId('join-code')).not.toBeInTheDocument();
  await screen.findByRole('option', { name: /Test Paladin/ });
  fireEvent.change(screen.getByRole('combobox', { name: 'Existing unlinked character' }), { target: { value: 'hero-8' } });
  fireEvent.click(screen.getByRole('button', { name: 'Link to campaign' }));
  await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/campaigns/campaign-1/attach-local-character', { character_id: 'hero-8' }));
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Existing unlinked character' })).toHaveValue(''));
  expect(toast.success).toHaveBeenCalledWith('Character linked to this offline campaign');
  delete window.rookieDesktop;
});
