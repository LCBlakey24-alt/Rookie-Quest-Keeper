import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import usePrivateCampaignPackAccess from './usePrivateCampaignPackAccess';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

function Probe({ campaignId }) {
  const allowed = usePrivateCampaignPackAccess(campaignId);
  return <span data-testid="personal-access">{allowed ? 'personal' : 'generic'}</span>;
}

beforeEach(() => {
  apiClient.get.mockReset();
});

test('a normal new account never sees private GM campaign packs', async () => {
  apiClient.get.mockImplementation(url => Promise.resolve({
    data: url === '/admin/check' ? { is_admin: false }
      : { id: 'someone-else-campaign', dm_user_id: 'new-user' },
  }));
  render(<Probe campaignId="someone-else-campaign" />);
  expect(screen.getByTestId('personal-access')).toHaveTextContent('generic');
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
  expect(screen.getByTestId('personal-access')).toHaveTextContent('generic');
});

test('an admin cannot reveal a campaign that they do not own', async () => {
  apiClient.get.mockImplementation(url => url === '/admin/check'
    ? Promise.resolve({ data: { is_admin: true } })
    : Promise.reject({ response: { status: 404 } }));
  render(<Probe campaignId="not-owned" />);
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
  expect(screen.getByTestId('personal-access')).toHaveTextContent('generic');
});

test('the original admin may use personal packs in a verified owned campaign', async () => {
  apiClient.get.mockImplementation(url => Promise.resolve({
    data: url === '/admin/check' ? { is_admin: true }
      : { id: 'owned', dm_user_id: 'site-admin' },
  }));
  render(<Probe campaignId="owned" />);
  expect(screen.getByTestId('personal-access')).toHaveTextContent('generic');
  await waitFor(() => expect(screen.getByTestId('personal-access')).toHaveTextContent('personal'));
});

test('a sign-out or account switch immediately hides previously available personal material', async () => {
  let isAdmin = true;
  apiClient.get.mockImplementation(url => Promise.resolve({
    data: url === '/admin/check' ? { is_admin: isAdmin }
      : { id: 'owned', dm_user_id: 'site-admin' },
  }));
  render(<Probe campaignId="owned" />);
  await waitFor(() => expect(screen.getByTestId('personal-access')).toHaveTextContent('personal'));

  isAdmin = false;
  act(() => window.dispatchEvent(new Event('rqk:auth-scope-changed')));
  expect(screen.getByTestId('personal-access')).toHaveTextContent('generic');
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(4));
  expect(screen.getByTestId('personal-access')).toHaveTextContent('generic');
});

test('changing campaign IDs never shows the previous campaign personal pack', async () => {
  apiClient.get.mockImplementation(url => Promise.resolve({
    data: url === '/admin/check' ? { is_admin: true }
      : { id: 'campaign-A', dm_user_id: 'site-admin' },
  }));
  const view = render(<Probe campaignId="campaign-A" />);
  await waitFor(() => expect(screen.getByTestId('personal-access')).toHaveTextContent('personal'));
  view.rerender(<Probe campaignId="campaign-B" />);
  expect(screen.getByTestId('personal-access')).toHaveTextContent('generic');
});
