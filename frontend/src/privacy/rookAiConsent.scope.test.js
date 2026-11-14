import {
  ROOK_AI_CONSENT_KEY,
  getRookAiConsent,
  grantRookAiConsent,
  revokeRookAiConsent,
  requiresExternalAiConsent,
} from './rookAiConsent';
import { getStoredAuthUsername } from '@/lib/auth';

jest.mock('@/lib/auth', () => ({
  getStoredAuthUsername: jest.fn(),
  getAuthToken: jest.fn(),
  clearAuthToken: jest.fn(),
}));

describe('Rook AI permission is scoped to the signed-in account', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    getStoredAuthUsername.mockReturnValue('PlayerOne');
  });

  test('one player granting external AI does not silently grant another player permission', () => {
    grantRookAiConsent();
    expect(getRookAiConsent()).toBe('granted');

    getStoredAuthUsername.mockReturnValue('PlayerTwo');
    expect(getRookAiConsent()).toBe('');
    grantRookAiConsent();
    expect(getRookAiConsent()).toBe('granted');

    getStoredAuthUsername.mockReturnValue('PlayerOne');
    expect(getRookAiConsent()).toBe('granted');
    revokeRookAiConsent();
    expect(getRookAiConsent()).toBe('');

    getStoredAuthUsername.mockReturnValue('PlayerTwo');
    expect(getRookAiConsent()).toBe('granted');
  });

  test('legacy device-wide grant does not count as user permission', () => {
    localStorage.setItem(ROOK_AI_CONSENT_KEY, 'granted');
    expect(getRookAiConsent()).toBe('');
    grantRookAiConsent();
    expect(getRookAiConsent()).toBe('granted');
    revokeRookAiConsent();
    expect(localStorage.getItem(ROOK_AI_CONSENT_KEY)).toBeNull();
  });

  test('permission cannot be granted without an authenticated account scope', () => {
    getStoredAuthUsername.mockReturnValue('');
    grantRookAiConsent();
    expect(getRookAiConsent()).toBe('');
    expect(localStorage.length).toBe(0);
  });

  test('both Rook chat and form fill are in the explicit AI permission gate', () => {
    expect(requiresExternalAiConsent({ method: 'post', url: '/rook/chat' })).toBe(true);
    expect(requiresExternalAiConsent({ method: 'post', url: '/rook/form-fill' })).toBe(true);
    expect(requiresExternalAiConsent({ method: 'post', url: '/rook/draft/save' })).toBe(false);
  });
});
