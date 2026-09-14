import axios from 'axios';
import {
  DEMO_SESSION_KEY,
  exitReadOnlyDemo,
  isLocalPreview,
  isReadOnlyDemo,
  syncDemoSessionFromLocation,
} from './previewMode';
import { installPreviewTransport, previewAdapter } from './previewTransport';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: jest.fn(key => values.get(key) || null),
    setItem: jest.fn((key, value) => values.set(key, value)),
    removeItem: jest.fn(key => values.delete(key)),
  };
}

function demoRuntime(search = '?demo=1') {
  const sessionStorage = memoryStorage();
  const localStorage = memoryStorage();
  const assign = jest.fn();
  const replaceState = jest.fn();
  return {
    location: {
      hostname: 'rookiequestkeeper.com',
      origin: 'https://rookiequestkeeper.com',
      pathname: '/home',
      search,
      hash: '',
      href: `https://rookiequestkeeper.com/home${search}`,
      assign,
    },
    history: { state: null, replaceState },
    sessionStorage,
    localStorage,
    fetch: jest.fn(),
    Response: class Response {},
  };
}

const originalAdapter = axios.defaults.adapter;
afterEach(() => {
  axios.defaults.adapter = originalAdapter;
  jest.restoreAllMocks();
});

test('demo query starts a tab-scoped read-only session and removes the marker from the URL', () => {
  const runtime = demoRuntime();

  expect(syncDemoSessionFromLocation(runtime)).toBe(true);
  expect(runtime.sessionStorage.setItem).toHaveBeenCalledWith(DEMO_SESSION_KEY, '1');
  expect(runtime.history.replaceState).toHaveBeenCalledWith(null, '', '/home');
  expect(isReadOnlyDemo(runtime)).toBe(true);
  expect(isLocalPreview('rookiequestkeeper.com', runtime)).toBe(true);
});

test('a production hostname only gets the local preview transport while Demo Mode is active', () => {
  const runtime = demoRuntime('');
  expect(isLocalPreview(runtime.location.hostname, runtime)).toBe(false);

  runtime.sessionStorage.setItem(DEMO_SESSION_KEY, '1');
  installPreviewTransport(runtime);

  expect(axios.defaults.adapter).toBe(previewAdapter);
});

test('exiting Demo Mode clears the local demo session and returns to sign in', () => {
  const runtime = demoRuntime('');
  runtime.sessionStorage.setItem(DEMO_SESSION_KEY, '1');

  exitReadOnlyDemo(runtime);

  expect(runtime.sessionStorage.removeItem).toHaveBeenCalledWith(DEMO_SESSION_KEY);
  expect(runtime.location.assign).toHaveBeenCalledWith('/auth');
});
