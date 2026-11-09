import { accountDraftStorageKey } from './accountDraftStorage';
import { clearAuthToken, setAuthToken } from './auth';

function tokenFor(subject) {
  const encode = object => btoa(JSON.stringify(object))
    .replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_');
  return `${encode({ alg: 'HS256' })}.${encode({ sub: subject })}.fixture`;
}

beforeEach(() => {
  clearAuthToken();
  localStorage.clear();
});

afterEach(() => {
  clearAuthToken();
});

test('different signed-in accounts use different character builder and selection keys', () => {
  setAuthToken(tokenFor('alice'));
  const builderA = accountDraftStorageKey('rqk.full_character_creator_v2.safe');
  const choicesA = accountDraftStorageKey('rqk.full_character_creator_v2.level_choices');

  setAuthToken(tokenFor('bob'));
  const builderB = accountDraftStorageKey('rqk.full_character_creator_v2.safe');
  const choicesB = accountDraftStorageKey('rqk.full_character_creator_v2.level_choices');

  expect(builderA).not.toBe(builderB);
  expect(choicesA).not.toBe(choicesB);
  expect(builderB).toContain('bob');
});

test('a fresh account never reads an old unscoped character draft', () => {
  localStorage.setItem('rqk.full_character_creator_v2.safe', JSON.stringify({ name: 'Previous GM secret' }));
  setAuthToken(tokenFor('new-keeper'));
  const scoped = accountDraftStorageKey('rqk.full_character_creator_v2.safe');
  expect(scoped).not.toBe('rqk.full_character_creator_v2.safe');
  expect(localStorage.getItem(scoped)).toBeNull();
  expect(localStorage.getItem('rqk.full_character_creator_v2.safe')).not.toBeNull();
});

test('a user returning to their own account gets the same draft key', () => {
  setAuthToken(tokenFor('alice'));
  const initial = accountDraftStorageKey('rqk.full_character_creator_v2.safe');
  localStorage.setItem(initial, 'my unfinished character');

  clearAuthToken();
  setAuthToken(tokenFor('bob'));
  expect(localStorage.getItem(accountDraftStorageKey('rqk.full_character_creator_v2.safe'))).toBeNull();
  clearAuthToken();
  setAuthToken(tokenFor('alice'));
  expect(localStorage.getItem(accountDraftStorageKey('rqk.full_character_creator_v2.safe'))).toBe('my unfinished character');
});
