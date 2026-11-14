/** @jest-environment node */
import fs from 'fs';
import path from 'path';
import vm from 'vm';

function makeWorker({ clientScope, missingAsset } = {}) {
  const handlers = {};
  const stores = new Map();
  const open = async name => {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    const key = request => typeof request === 'string' ? request : request.url;
    return {
      match: async request => entries.get(key(request)),
      put: async (request, response) => entries.set(key(request), response),
      add: async request => {
        if (request === missingAsset) throw new Error('asset unavailable');
        entries.set(key(request), { url: request });
      },
      addAll: async requests => {
        if (requests.includes(missingAsset)) throw new Error('asset unavailable');
        requests.forEach(request => entries.set(key(request), { url: request }));
      },
    };
  };
  const fetch = jest.fn();
  const networkError = { type: 'error' };
  const self = {
    location: { origin: 'https://keeper.example' },
    addEventListener: (name, handler) => { handlers[name] = handler; },
    clients: clientScope ? { get: async () => ({
      postMessage: (_message, [port]) => port.reply({ cacheName: clientScope }),
    }) } : undefined,
  };
  class FakeMessageChannel {
    constructor() {
      this.port1 = { close() {} };
      this.port2 = { reply: data => this.port1.onmessage({ data }) };
    }
  }
  const source = fs.readFileSync(path.join(process.cwd(), 'public/service-worker.js'), 'utf8');
  vm.runInNewContext(source, {
    self, fetch, URL, caches: { open }, Response: { error: () => networkError },
    MessageChannel: FakeMessageChannel, setTimeout, clearTimeout,
  });
  const setScope = (clientId, cacheName) => handlers.message({
    source: { id: clientId }, data: { type: 'SET_MEDIA_CACHE', cacheName },
  });
  const request = async (clientId, url, options = {}) => {
    let response;
    handlers.fetch({
      clientId,
      request: { method: 'GET', url, destination: '', mode: 'cors', ...options },
      respondWith: value => { response = value; },
    });
    return response;
  };
  const install = async () => {
    let work;
    handlers.install({ waitUntil: promise => { work = promise; } });
    await work;
  };
  return { open, fetch, networkError, request, setScope, install };
}

test('an unavailable optional shell asset does not prevent offline app installation', async () => {
  const worker = makeWorker({ missingAsset: '/favicon.png' });
  worker.fetch.mockResolvedValue({ ok: false });
  await worker.install();
  const shellCache = await worker.open('rqk-shell-v5');
  expect(await shellCache.match('/')).toEqual({ url: '/' });
  expect(await shellCache.match('/favicon.png')).toBeUndefined();
  expect(await shellCache.match('/site.webmanifest')).toEqual({ url: '/site.webmanifest' });
});

test('offline media is isolated per tab and never falls back to another account', async () => {
  const worker = makeWorker();
  const url = 'https://keeper.example/map.png';
  const alice = { owner: 'alice' };
  const bob = { owner: 'bob' };
  await (await worker.open('rqk-media-v1-alice')).put(url, alice);
  await (await worker.open('rqk-media-v1-bob')).put(url, bob);
  worker.fetch.mockRejectedValue(new Error('offline'));
  worker.setScope('tab-a', 'rqk-media-v1-alice');
  worker.setScope('tab-b', 'rqk-media-v1-bob');

  expect(await worker.request('tab-a', url, { destination: 'image' })).toBe(alice);
  expect(await worker.request('tab-b', url, { destination: 'image' })).toBe(bob);
  worker.setScope('tab-a', '');
  expect(await worker.request('tab-a', url, { destination: 'image' })).toBe(worker.networkError);
  expect(await worker.request('tab-b', url, { destination: 'image' })).toBe(bob);
});

test('an open tab supplies its scope after a worker restart', async () => {
  const worker = makeWorker({ clientScope: 'rqk-media-v1-alice' });
  const url = 'https://keeper.example/map.png';
  const alice = { owner: 'alice' };
  await (await worker.open('rqk-media-v1-alice')).put(url, alice);
  worker.fetch.mockRejectedValue(new Error('offline'));
  expect(await worker.request('tab-a', url, { destination: 'image' })).toBe(alice);
});

test('an uncached static request returns a network error response offline', async () => {
  const worker = makeWorker();
  worker.fetch.mockRejectedValue(new Error('offline'));
  expect(await worker.request('tab-a', 'https://keeper.example/app.js', { destination: 'script' })).toBe(worker.networkError);
});

test('a downloaded document cannot replace the offline application shell', async () => {
  const worker = makeWorker();
  const shell = { name: 'shell' };
  const pdf = { ok: true, headers: { get: () => 'application/pdf' }, clone() { return this; } };
  await (await worker.open('rqk-shell-v5')).put('/', shell);
  worker.fetch.mockResolvedValue(pdf);
  await worker.request('tab-a', 'https://keeper.example/handout.pdf', { mode: 'navigate' });
  expect(await (await worker.open('rqk-shell-v5')).match('/')).toBe(shell);
});
