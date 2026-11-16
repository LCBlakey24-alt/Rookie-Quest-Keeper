import {
  ROOK_AI_CONSENT_KEY,
  getRookAiConsent,
  grantRookAiConsent,
  refreshRookAiConsent,
  revokeRookAiConsent,
  requiresExternalAiConsent,
} from './rookAiConsent';
import { getStoredAuthUsername } from '@/lib/auth';
import apiClient from '@/lib/apiClient';

jest.mock('@/lib/auth', () => ({
  getStoredAuthUsername: jest.fn(),
  getAuthToken: jest.fn(),
  clearAuthToken: jest.fn(),
}));
jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    interceptors: { request: { use: jest.fn() } },
  },
}));

describe('Rook AI permission is scoped to the signed-in account', () => {
  let serverConsent;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    getStoredAuthUsername.mockReturnValue('PlayerOne');
    serverConsent = {};
    apiClient.get.mockImplementation(async () => ({
      data: { granted: serverConsent[getStoredAuthUsername()] === true, required: true, policy_version: 'test-v1' },
    }));
    apiClient.put.mockImplementation(async (_url, { granted }) => {
      serverConsent[getStoredAuthUsername()] = granted;
      return { data: { granted, required: true, policy_version: 'test-v1' } };
    });
  });

  test('one player granting external AI does not silently grant another player permission', async () => {
    await grantRookAiConsent();
    expect(getRookAiConsent()).toBe('granted');

    getStoredAuthUsername.mockReturnValue('PlayerTwo');
    expect(getRookAiConsent()).toBe('');
    await grantRookAiConsent();
    expect(getRookAiConsent()).toBe('granted');

    getStoredAuthUsername.mockReturnValue('PlayerOne');
    expect(getRookAiConsent()).toBe('granted');
    await revokeRookAiConsent();
    expect(getRookAiConsent()).toBe('');
    expect(serverConsent.PlayerOne).toBe(false);

    getStoredAuthUsername.mockReturnValue('PlayerTwo');
    expect(getRookAiConsent()).toBe('granted');
    expect(serverConsent.PlayerTwo).toBe(true);
  });

  test('legacy device-wide grant does not count as user permission', async () => {
    localStorage.setItem(ROOK_AI_CONSENT_KEY, 'granted');
    expect(getRookAiConsent()).toBe('');
    await grantRookAiConsent();
    expect(getRookAiConsent()).toBe('granted');
    await revokeRookAiConsent();
    expect(localStorage.getItem(ROOK_AI_CONSENT_KEY)).toBeNull();
  });

  test('permission cannot be granted without an authenticated account scope', async () => {
    getStoredAuthUsername.mockReturnValue('');
    await expect(grantRookAiConsent()).rejects.toThrow(/sign in/i);
    expect(getRookAiConsent()).toBe('');
    expect(localStorage.length).toBe(0);
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  test('does not show a successful local choice when the server update fails', async () => {
    apiClient.put.mockRejectedValueOnce(new Error('network failed'));
    await expect(grantRookAiConsent()).rejects.toThrow('network failed');
    expect(getRookAiConsent()).toBe('');
  });

  test('refresh uses the signed-in account server record as the authority', async () => {
    serverConsent.PlayerOne = true;
    await refreshRookAiConsent();
    expect(getRookAiConsent()).toBe('granted');

    getStoredAuthUsername.mockReturnValue('PlayerTwo');
    await refreshRookAiConsent();
    expect(getRookAiConsent()).toBe('');
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });

  test('both Rook chat and form fill are in the explicit AI permission gate', () => {
    expect(requiresExternalAiConsent({ method: 'post', url: '/rook/chat' })).toBe(true);
    expect(requiresExternalAiConsent({ method: 'post', url: '/rook/form-fill' })).toBe(true);
    expect(requiresExternalAiConsent({ method: 'post', url: '/rook/draft/save' })).toBe(false);
  });
});
