import axios from 'axios';
import apiClient, { wakeBackend } from '@/lib/apiClient';
import { getAuthToken } from '@/lib/auth';
import * as mode from './previewMode';
import { installPreviewTransport } from './previewTransport';

const originalAdapter = axios.defaults.adapter;
afterEach(() => { jest.restoreAllMocks(); axios.defaults.adapter = originalAdapter; });

test.each(['rookiequestkeeper.com', 'www.rookiequestkeeper.com', 'localhost', `fake-${mode.PREVIEW_HOST}`, `${mode.PREVIEW_HOST}.example.com`])('does not activate on %s', hostname => {
  const fetch = jest.fn();
  expect(mode.isLocalPreview(hostname)).toBe(false);
  const runtime = { location: { hostname }, fetch };
  installPreviewTransport(runtime);
  expect(runtime.fetch).toBe(fetch);
  expect(axios.defaults.adapter).toBe(originalAdapter);
});

test('activates only on the exact staging hostname', () => {
  expect(mode.isLocalPreview(mode.PREVIEW_HOST)).toBe(true);
});

test('preview has no real auth token and skips the backend wake request', async () => {
  jest.spyOn(mode, 'isLocalPreview').mockReturnValue(true);
  localStorage.setItem('dm_token', 'existing-account-token');
  const originalFetch = global.fetch;
  const fetch = jest.fn().mockResolvedValue({});
  global.fetch = fetch;
  expect(getAuthToken()).toBe(mode.PREVIEW_TOKEN);
  expect(localStorage.getItem('dm_token')).toBe('existing-account-token');
  await expect(wakeBackend()).resolves.toBe(false);
  expect(fetch).not.toHaveBeenCalled();
  localStorage.removeItem('dm_token');
  global.fetch = originalFetch;
});

test('apiClient cannot forward a preview request to a custom network adapter', async () => {
  jest.spyOn(mode, 'isLocalPreview').mockReturnValue(true);
  const network = jest.fn();
  const response = await apiClient.get('/characters', { adapter: network });
  expect(response.data[0].name).toBe('Demo Fighter');
  await expect(apiClient.post('/auth/login', {}, { adapter: network })).rejects.toMatchObject({ response: { status: 501 } });
  expect(network).not.toHaveBeenCalled();
});

test('legacy fetch API calls terminate locally while static assets use normal fetch', async () => {
  class Response {
    constructor(body, options) { this.body = body; this.status = options.status; }
    async json() { return JSON.parse(this.body); }
  }
  const fetch = jest.fn().mockResolvedValue('asset');
  const runtime = { location: { hostname: mode.PREVIEW_HOST, origin: `https://${mode.PREVIEW_HOST}` }, fetch, Response };
  installPreviewTransport(runtime);
  const response = await runtime.fetch('https://backend.example/api/campaigns');
  expect((await response.json())[0].name).toBe('Preview campaign');
  const unsupported = await runtime.fetch('https://backend.example/api/unsupported', { method: 'POST', body: '{}' });
  expect(unsupported.status).toBe(501);
  expect(fetch).not.toHaveBeenCalled();
  await expect(runtime.fetch('/static/js/example.js')).resolves.toBe('asset');
  expect(fetch).toHaveBeenCalledTimes(1);
});
