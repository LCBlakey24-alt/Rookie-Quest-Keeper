import axios from 'axios';
import apiClient from './apiClient';
import { getAuthToken, setAuthToken } from './auth';

beforeEach(() => { localStorage.clear(); setAuthToken('current-token'); });
afterEach(() => localStorage.clear());

function unauthorized(config) {
  return new axios.AxiosError('Session expired', 'ERR_BAD_REQUEST', config, null, {
    status: 401, data: { detail: 'Session expired' }, config,
  });
}

test('a current-session 401 clears credentials and notifies the route gate', async () => {
  const changed = jest.fn();
  window.addEventListener('rqk:auth-scope-changed', changed);
  try {
    await expect(apiClient.get('/campaigns', { adapter: async config => { throw unauthorized(config); } })).rejects.toThrow('Session expired');
    expect(getAuthToken()).toBeNull();
    expect(changed).toHaveBeenCalledTimes(1);
  } finally {
    window.removeEventListener('rqk:auth-scope-changed', changed);
  }
});

test('a late 401 for an old request preserves a newer sign-in', async () => {
  await expect(apiClient.get('/campaigns', { adapter: async config => {
    setAuthToken('new-token');
    throw unauthorized(config);
  } })).rejects.toThrow('Session expired');
  expect(getAuthToken()).toBe('new-token');
});

test('a server outage preserves the current session', async () => {
  await expect(apiClient.get('/auth/me', { adapter: async config => {
    throw new axios.AxiosError('Unavailable', 'ERR_BAD_RESPONSE', config, null, { status: 503, data: {}, config });
  } })).rejects.toThrow('Unavailable');
  expect(getAuthToken()).toBe('current-token');
});
