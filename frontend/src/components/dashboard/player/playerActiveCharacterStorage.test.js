import { AUTH_USERNAME_KEY } from '@/lib/auth';
import { readActiveCharacterId, storeActiveCharacterId } from './playerActiveCharacterStorage';

beforeEach(() => localStorage.clear());

test('different signed-in accounts cannot inherit another player’s active character', () => {
  localStorage.setItem(AUTH_USERNAME_KEY, 'first-player');
  storeActiveCharacterId('hero-first');
  expect(readActiveCharacterId()).toBe('hero-first');

  localStorage.setItem(AUTH_USERNAME_KEY, 'second-player');
  expect(readActiveCharacterId()).toBe('');
  storeActiveCharacterId('hero-second');
  expect(readActiveCharacterId()).toBe('hero-second');

  localStorage.setItem(AUTH_USERNAME_KEY, 'first-player');
  expect(readActiveCharacterId()).toBe('hero-first');
});

test('no account never uses the old global character ID key', () => {
  localStorage.setItem('rqk.player.active-character', 'previous-user-character');
  expect(readActiveCharacterId()).toBe('');
  storeActiveCharacterId('new-character');
  expect(readActiveCharacterId()).toBe('');
});

test('clearing the selected character affects only current account', () => {
  localStorage.setItem(AUTH_USERNAME_KEY, 'one');
  storeActiveCharacterId('one-hero');
  localStorage.setItem(AUTH_USERNAME_KEY, 'two');
  storeActiveCharacterId('two-hero');
  storeActiveCharacterId('');
  expect(readActiveCharacterId()).toBe('');
  localStorage.setItem(AUTH_USERNAME_KEY, 'one');
  expect(readActiveCharacterId()).toBe('one-hero');
});
