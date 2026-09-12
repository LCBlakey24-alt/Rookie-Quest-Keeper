import apiClient, {
  applyCharacterCreationReadinessPolicy,
  applyLegacyApiCompatibility,
  applyLoginTimeoutPolicy,
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
  test('disables the client timeout for login so a sleeping backend can wake up', () => {
    const configured = applyLoginTimeoutPolicy({ method: 'post', url: '/auth/login', timeout: 20000 });
    expect(configured.timeout).toBe(0);
  });

  test('keeps the normal timeout policy for other requests', () => {
    const original = { method: 'get', url: '/campaigns', timeout: 20000 };
    expect(applyLoginTimeoutPolicy(original)).toBe(original);
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
