import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AdminUsersTab from './AdminUsersTab';
import apiClient from '@/lib/apiClient';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock('@/lib/auth', () => ({
  AUTH_USERNAME_KEY: 'rqk_username', getAuthToken: jest.fn(), setAuthToken: jest.fn(),
}));

const accounts = [
  {
    username: 'owner', email: 'owner@example.test', access_level: 'admin',
    subscription_tier: 'pro', subscription_status: 'active',
    created_at: '2026-05-03T18:06:13Z', last_login_at: null,
    character_count: 2, owned_campaign_count: 0, joined_campaign_count: 0,
    feedback_count: 1, review_count: 0,
  },
  {
    username: 'member', email: 'member@example.test', access_level: 'member',
    subscription_tier: 'free', subscription_status: null,
    created_at: '2026-06-14T18:06:13Z', last_login_at: null,
    character_count: 0, owned_campaign_count: 1, joined_campaign_count: 0,
    feedback_count: 0, review_count: 0,
  },
];

function screenSize(mobile) {
  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: mobile,
    media: '(max-width: 720px)',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
}

describe('Admin member directory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    screenSize(false);
    apiClient.get.mockResolvedValue({ data: accounts });
  });

  test('shows server-verified access and recorded subscription without inventing online activity', async () => {
    render(<AdminUsersTab />);
    await waitFor(() => expect(screen.getByTestId('user-row-owner')).toBeInTheDocument());
    expect(screen.getByTestId('user-row-member')).toBeInTheDocument();
    expect(screen.getByText('Site Admin')).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();
    expect(screen.getByText('Pro · active')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getAllByText('Not recorded')).toHaveLength(2);
    expect(screen.getByText(/not an online indicator/i)).toBeInTheDocument();
    expect(screen.queryByText(/currently online/i)).not.toBeInTheDocument();
  });

  test('mobile account cards show the same access and subscription labels', async () => {
    screenSize(true);
    render(<AdminUsersTab />);
    const owner = await screen.findByTestId('user-row-owner');
    const member = screen.getByTestId('user-row-member');
    expect(owner).toHaveTextContent('Site Admin');
    expect(owner).toHaveTextContent('Plan: Pro · active');
    expect(member).toHaveTextContent('Member');
    expect(member).toHaveTextContent('Not recorded');
  });

  test('admin list failures are shown as errors rather than claiming no accounts exist', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('network error'));
    render(<AdminUsersTab />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load accounts');
  });
});
