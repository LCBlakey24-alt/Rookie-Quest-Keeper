import apiClient, {
  applyCharacterCreationReadinessPolicy,
  applyLegacyApiCompatibility,
  applyLoginTimeoutPolicy,
  LOGIN_TIMEOUT_MS,
  wakeBackend,
} from './apiClient';

function mockStorage(values = {}) {
  return {
    getItem: jest.fn((key) => values[key] ?? null),
  };
}

test('spell-slot updates stay partial PATCH requests', async () => {
  const adapter = jest.fn(async config => ({ data: {}, status: 200, headers: {}, config }));
  await apiClient.patch('/characters/character-1', { spell_slots_remaining: { '1': 0 } }, { adapter });
  expect(adapter).toHaveBeenCalledWith(expect.objectContaining({
    method: 'patch',
    url: '/characters/character-1',
    data: JSON.stringify({ spell_slots_remaining: { '1': 0 } }),
  }));
});

describe('legacy account API compatibility', () => {
  test.each([
    ['get', '/account/profile', 'get', '/auth/me'],
    ['put', '/account/update', 'patch', '/auth/me'],
    ['post', '/account/change-password', 'post', '/auth/change-password'],
    ['delete', '/account/delete', 'delete', '/auth/me'],
  ])('%s %s maps to %s %s', (method, url, expectedMethod, expectedUrl) => {
    const mapped = applyLegacyApiCompatibility({ method, url, headers: {} });
    expect(mapped.method).toBe(expectedMethod);
    expect(mapped.url).toBe(expectedUrl);
  });

  test('leaves current routes unchanged', () => {
    const original = { method: 'get', url: '/campaigns/c1', headers: {} };
    expect(applyLegacyApiCompatibility(original)).toBe(original);
  });
});

describe('login timeout policy', () => {
  test('gives a sleeping backend a bounded wake-up window instead of waiting forever', () => {
    const configured = applyLoginTimeoutPolicy({ method: 'post', url: '/auth/login', timeout: 20000 });
    expect(LOGIN_TIMEOUT_MS).toBe(30000);
    expect(configured.timeout).toBe(LOGIN_TIMEOUT_MS);
    expect(configured.timeout).toBeGreaterThan(0);
  });

  test('keeps the normal timeout policy for other requests', () => {
    const original = { method: 'get', url: '/campaigns', timeout: 20000 };
    expect(applyLoginTimeoutPolicy(original)).toBe(original);
  });

  test('turns a login timeout into a useful retry message', async () => {
    const adapter = jest.fn(async config => {
      const error = new Error(`timeout of ${config.timeout}ms exceeded`);
      error.code = 'ECONNABORTED';
      error.config = config;
      throw error;
    });

    await expect(apiClient.post('/auth/login', { username: 'Rook', password: 'test' }, { adapter }))
      .rejects.toMatchObject({
        formattedDetail: expect.stringMatching(/server is taking longer than expected.*waking up.*try signing in again/i),
      });
  });
});

describe('higher-level character creation request guard', () => {
  const payload = {
    creation_mode: 'full',
    level: 4,
    character_class: 'Fighter',
    subclass: 'Champion',
    edition: '2014',
  };

  test('blocks a full higher-level character when required choices are missing', async () => {
    const storage = mockStorage({
      'rqk.full_character_creator_v2.level_choices': '{}',
      'rqk.full_character_creator_v2.detail_choices': '{}',
    });

    await expect(applyCharacterCreationReadinessPolicy(
      { method: 'post', url: '/characters', data: payload },
      storage,
    )).rejects.toThrow(/Complete the required starting-level choices/i);
  });

  test('allows the request once the required choices are complete', async () => {
    const storage = mockStorage({
      'rqk.full_character_creator_v2.level_choices': JSON.stringify({
        'asi-4': { mode: 'asi', abilityOne: 'strength', abilityTwo: 'constitution' },
      }),
      'rqk.full_character_creator_v2.detail_choices': JSON.stringify({
        classSpecific: { fightingStyles: ['Defense'] },
      }),
    });
    const config = { method: 'post', url: '/characters', data: payload };

    await expect(applyCharacterCreationReadinessPolicy(config, storage)).resolves.toBe(config);
  });

  test('does not affect imports, edits, or level 1 creation', async () => {
    const storage = mockStorage();
    const imported = { method: 'post', url: '/characters', data: { creation_mode: 'import', level: 10 } };
    const levelOne = { method: 'post', url: '/characters', data: { creation_mode: 'full', level: 1 } };
    const edit = { method: 'patch', url: '/characters/c1', data: payload };

    await expect(applyCharacterCreationReadinessPolicy(imported, storage)).resolves.toBe(imported);
    await expect(applyCharacterCreationReadinessPolicy(levelOne, storage)).resolves.toBe(levelOne);
    await expect(applyCharacterCreationReadinessPolicy(edit, storage)).resolves.toBe(edit);
  });
});

describe('backend wake-up', () => {
  test('pings the health endpoint without surfacing a failure', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    await expect(wakeBackend()).resolves.toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/health$/),
      expect.objectContaining({ method: 'GET', cache: 'no-store' })
    );

    global.fetch = originalFetch;
  });
});
