import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';

import AccountSettings from './AccountSettings';
import apiClient from '@/lib/apiClient';
import { getAuthToken, getStoredAuthUsername } from '@/lib/auth';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));
jest.mock('@/lib/auth', () => ({
  getAuthToken: jest.fn(),
  getStoredAuthUsername: jest.fn(),
  setAuthToken: jest.fn(),
}));
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const profile = {
  username: 'PlayerOne',
  email: 'one@example.test',
  auth_provider: 'password',
  password_login_enabled: true,
};
const exportData = {
  format: 'rookiequestkeeper-personal-data-v1',
  account: { username: 'PlayerOne' },
  campaigns_created: [],
  records: { player_characters: [] },
};

function renderSettings() {
  return render(<MemoryRouter><AccountSettings username="PlayerOne" onLogout={jest.fn()} /></MemoryRouter>);
}

describe('Account Settings: personal-data export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAuthToken.mockReturnValue('token-for-player-one');
    getStoredAuthUsername.mockReturnValue('PlayerOne');
    apiClient.get.mockImplementation((url) => {
      if (url === '/account/profile') return Promise.resolve({ data: profile });
      if (url === '/auth/me/export') return Promise.resolve({ data: exportData });
      return Promise.reject(new Error('Unexpected request: ' + url));
    });
    URL.createObjectURL = jest.fn(() => 'blob:account-download');
    URL.revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('offers a download, never the site-wide admin export, using authenticated online API', async () => {
    renderSettings();
    const download = await screen.findByTestId('export-account-data-btn');
    fireEvent.click(download);
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me/export', { timeout: 45000 });
    });
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalledWith('Your account data export has been downloaded.');
    expect(apiClient.get).not.toHaveBeenCalledWith(expect.stringContaining('/admin'));
  });

  test('refuses a response belonging to a different user after an account switch', async () => {
    let resolveExport;
    apiClient.get.mockImplementation((url) => {
      if (url === '/account/profile') return Promise.resolve({ data: profile });
      return new Promise((resolve) => { resolveExport = resolve; });
    });
    renderSettings();
    fireEvent.click(await screen.findByTestId('export-account-data-btn'));
    await waitFor(() => expect(typeof resolveExport).toBe('function'));
    getStoredAuthUsername.mockReturnValue('PlayerTwo');
    resolveExport({ data: exportData });
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  test('does not claim success for an invalid or partial response', async () => {
    apiClient.get.mockImplementation((url) =>
      Promise.resolve({ data: url === '/account/profile' ? profile : { broken: true } })
    );
    renderSettings();
    fireEvent.click(await screen.findByTestId('export-account-data-btn'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not verify the downloaded account data.'));
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
