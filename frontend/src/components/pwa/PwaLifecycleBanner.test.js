import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PwaLifecycleBanner from './PwaLifecycleBanner';
import { getPendingInstallPrompt, promptInstall } from '@/pwa/registerServiceWorker';

jest.mock('@/components/pwa/CampaignOfflineControl', () => () => null);
jest.mock('@/components/pwa/OfflineSyncManager', () => () => null);
jest.mock('@/components/privacy/PrivacyDataSettings', () => () => null);
jest.mock('@/pwa/registerServiceWorker', () => ({
  PWA_EVENTS: {
    UPDATE_READY_EVENT: 'rqk:pwa-update-ready',
    OFFLINE_READY_EVENT: 'rqk:pwa-offline-ready',
    INSTALL_AVAILABLE_EVENT: 'rqk:pwa-install-available',
  },
  applyWaitingServiceWorker: jest.fn(),
  getPendingInstallPrompt: jest.fn(() => null),
  promptInstall: jest.fn(() => Promise.resolve(true)),
}));

describe('PWA installation availability across devices', () => {
  const previousWidth = window.innerWidth;

  beforeEach(() => {
    localStorage.removeItem('rqk.pwa.install.dismissed');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    getPendingInstallPrompt.mockReturnValue({ prompt: () => {} });
    promptInstall.mockClear();
  });

  afterEach(() => {
    window.innerWidth = previousWidth;
  });

  test.each([390, 768, 1440])('offers installation on a %ipx device when the browser supports it', async (width) => {
    window.innerWidth = width;
    render(<PwaLifecycleBanner />);
    expect(screen.getByText('Install Keeper')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Install', exact: true }));
    await waitFor(() => expect(promptInstall).toHaveBeenCalledTimes(1));
  });

  test('does not offer install after dismissal', () => {
    localStorage.setItem('rqk.pwa.install.dismissed', '1');
    render(<PwaLifecycleBanner />);
    expect(screen.queryByText('Install Keeper')).not.toBeInTheDocument();
  });

  test('does not offer install until the browser advertises availability', () => {
    getPendingInstallPrompt.mockReturnValue(null);
    render(<PwaLifecycleBanner />);
    expect(screen.queryByText('Install Keeper')).not.toBeInTheDocument();
    fireEvent(window, new Event('rqk:pwa-install-available'));
    expect(screen.getByText('Install Keeper')).toBeInTheDocument();
  });
});
