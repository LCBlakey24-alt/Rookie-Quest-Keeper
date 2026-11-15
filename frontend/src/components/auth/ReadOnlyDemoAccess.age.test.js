import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true, default: { post: jest.fn() },
}));
jest.mock('@/lib/auth', () => ({
  AUTH_USERNAME_KEY: 'rqk_username',
  setAuthToken: jest.fn(),
}));
jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

// The Google widget loads lazily only on the optional sign-in panel.
process.env.REACT_APP_GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
const ReadOnlyDemoAccess = require('./ReadOnlyDemoAccess').default;

describe('Google account registration age gate', () => {
  let callback;
  beforeEach(() => {
    jest.clearAllMocks();
    callback = null;
    window.google = { accounts: { id: {
      initialize: jest.fn(({ callback: cb }) => { callback = cb; }),
      renderButton: jest.fn(),
      cancel: jest.fn(),
    } } };
  });

  afterEach(() => {
    delete window.google;
  });

  const show = () => render(<MemoryRouter><ReadOnlyDemoAccess /></MemoryRouter>);

  test('existing Google users sign in without a new age statement', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { token: 'existing-token', username: 'ExistingMember' } });
    show();
    await waitFor(() => expect(typeof callback).toBe('function'));
    await act(async () => { callback({ credential: 'existing-credential' }); });
    expect(apiClient.post).toHaveBeenCalledWith('/auth/google', { credential: 'existing-credential' });
    expect(screen.queryByTestId('google-adult-attestation')).not.toBeInTheDocument();
  });

  test('new Google users must explicitly confirm age before creating an account', async () => {
    apiClient.post
      .mockResolvedValueOnce({ data: { requires_username: true, suggested_username: 'NewRook' } })
      .mockResolvedValueOnce({ data: { token: 'new-token', username: 'NewRook' } });
    show();
    await waitFor(() => expect(typeof callback).toBe('function'));
    await act(async () => { callback({ credential: 'new-credential' }); });
    expect(await screen.findByTestId('google-adult-attestation')).toBeRequired();
    const form = screen.getByTestId('google-adult-attestation').closest('form');
    fireEvent.submit(form);
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('at least 18'));

    fireEvent.click(screen.getByTestId('google-adult-attestation'));
    fireEvent.submit(form);
    await waitFor(() => expect(apiClient.post).toHaveBeenLastCalledWith('/auth/google', {
      credential: 'new-credential', username: 'NewRook', adult_self_attested: true,
    }));
  });
});
