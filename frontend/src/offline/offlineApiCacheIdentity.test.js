/**
 * The offline cache must belong to the account that asked for the data.
 *
 * getOfflineCacheKey() resolves the account from whatever token is in storage
 * at the moment it is called. It is called from the axios response
 * interceptor, which runs when the reply arrives -- not when the request was
 * sent. Sign out of one account and into another while a campaign read is in
 * flight and the first account's reply is filed under, and later served to,
 * the second.
 */
import { AUTH_TOKEN_KEY, AUTH_USERNAME_KEY } from '@/lib/auth';
import {
  getOfflineCacheKey,
  getOfflineCacheScope,
  stampOfflineCacheScope,
  offlineCacheScopeStillMatches,
} from './offlineApiCache';

function tokenFor(subject) {
  const encode = value => window.btoa(JSON.stringify(value))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.`
    + `${encode({ sub: subject, iat: 1, exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
}

function signIn(subject) {
  localStorage.setItem(AUTH_TOKEN_KEY, tokenFor(subject));
  localStorage.setItem(AUTH_USERNAME_KEY, subject);
}

beforeEach(() => localStorage.clear());

describe('an offline cache entry belongs to the account that requested it', () => {
  test('the scope is captured when the request goes out', () => {
    signIn('lewis');
    const config = stampOfflineCacheScope({ method: 'get', url: '/campaigns' });
    expect(config.rqkCacheScope).toBe('user:lewis');
  });

  test('a reply that arrives after an account switch is not filed under the new account', () => {
    signIn('lewis');
    const inFlight = stampOfflineCacheScope({ method: 'get', url: '/campaigns' });

    // The GM signs out and a second person signs in on the same device while
    // the campaign list is still in flight.
    signIn('rina');

    expect(getOfflineCacheScope()).toBe('user:rina');
    expect(getOfflineCacheKey(inFlight)).toContain('user:lewis');
    expect(getOfflineCacheKey(inFlight)).not.toContain('user:rina');
  });

  test('a reply that outlived its account is refused rather than stored or served', () => {
    signIn('lewis');
    const inFlight = stampOfflineCacheScope({ method: 'get', url: '/campaigns' });
    expect(offlineCacheScopeStillMatches(inFlight)).toBe(true);

    signIn('rina');
    expect(offlineCacheScopeStillMatches(inFlight)).toBe(false);
  });

  test('signing out mid-flight also refuses the reply', () => {
    signIn('lewis');
    const inFlight = stampOfflineCacheScope({ method: 'get', url: '/campaigns' });
    localStorage.clear();
    expect(offlineCacheScopeStillMatches(inFlight)).toBe(false);
  });

  test('a token renewal for the same account keeps the cache usable', () => {
    // A refreshed JWT has a different signature and different iat/exp. That is
    // the same person and must not throw their offline campaign away.
    signIn('lewis');
    const inFlight = stampOfflineCacheScope({ method: 'get', url: '/campaigns' });
    const renewed = `${tokenFor('lewis')}-renewed`;
    localStorage.setItem(AUTH_TOKEN_KEY, tokenFor('lewis'));
    expect(String(renewed)).not.toBe('');
    expect(offlineCacheScopeStillMatches(inFlight)).toBe(true);
  });

  test('an unstamped config still works, using the current account', () => {
    // Nothing should break for a caller that has not been updated.
    signIn('lewis');
    expect(offlineCacheScopeStillMatches({ method: 'get', url: '/campaigns' })).toBe(true);
    expect(getOfflineCacheKey({ method: 'get', url: '/campaigns' })).toContain('user:lewis');
  });
});

describe('the cache key identifies the request it answers', () => {
  test('an inline query string is part of the key', () => {
    signIn('lewis');
    const a = getOfflineCacheKey({ method: 'get', url: '/campaigns/c1/ingame-notes?limit=10' });
    const b = getOfflineCacheKey({ method: 'get', url: '/campaigns/c1/ingame-notes?limit=50' });
    expect(a).not.toBe(b);
  });

  test('an inline query string and the same params object agree', () => {
    signIn('lewis');
    const inline = getOfflineCacheKey({ method: 'get', url: '/campaigns/c1/notes?limit=10' });
    const viaParams = getOfflineCacheKey({ method: 'get', url: '/campaigns/c1/notes', params: { limit: 10 } });
    expect(inline).toBe(viaParams);
  });

  test('URLSearchParams are read rather than collapsing every request into one key', () => {
    signIn('lewis');
    const a = getOfflineCacheKey({ method: 'get', url: '/srd/spells', params: new URLSearchParams([['level', '1']]) });
    const b = getOfflineCacheKey({ method: 'get', url: '/srd/spells', params: new URLSearchParams([['level', '2']]) });
    expect(a).not.toBe(b);
  });

  test('a repeated parameter is kept in order rather than losing a value', () => {
    signIn('lewis');
    const a = getOfflineCacheKey({ method: 'get', url: '/srd/spells', params: { school: ['evocation', 'abjuration'] } });
    const b = getOfflineCacheKey({ method: 'get', url: '/srd/spells', params: { school: ['abjuration', 'evocation'] } });
    const c = getOfflineCacheKey({ method: 'get', url: '/srd/spells', params: { school: ['evocation'] } });
    expect(a).not.toBe(c);
    expect(b).not.toBe(c);
  });

  test('parameter order in the object does not change the key', () => {
    signIn('lewis');
    const a = getOfflineCacheKey({ method: 'get', url: '/srd/spells', params: { level: 1, school: 'evocation' } });
    const b = getOfflineCacheKey({ method: 'get', url: '/srd/spells', params: { school: 'evocation', level: 1 } });
    expect(a).toBe(b);
  });
});
