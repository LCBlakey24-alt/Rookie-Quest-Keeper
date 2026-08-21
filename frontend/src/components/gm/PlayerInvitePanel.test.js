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
