import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import CleanNotesTab from './CleanNotesTab';
import { accountDraftStorageKey } from '@/lib/accountDraftStorage';
import { setAuthToken } from '@/lib/auth';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { patch: jest.fn() },
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const character = { id: 'hero-1', notes: 'Old note' };
const draftKey = accountDraftStorageKey('rqk.character-notes-draft:hero-1');

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test('autosaves notes after a short pause and clears the local draft after confirmation', async () => {
  apiClient.patch.mockResolvedValue({ data: { ...character, notes: 'New clue' } });
  const onCharacterUpdate = jest.fn();
  render(<CleanNotesTab character={character} onCharacterUpdate={onCharacterUpdate} />);

  fireEvent.change(screen.getByPlaceholderText('Write live character notes here...'), {
    target: { value: 'New clue' },
  });

  expect(screen.getByTestId('character-notes-save-status')).toHaveTextContent('Unsaved changes');
  expect(localStorage.getItem(draftKey)).toBe('New clue');

  await act(async () => {
    jest.advanceTimersByTime(1200);
    await Promise.resolve();
  });

  await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/characters/hero-1', { notes: 'New clue' }));
  await waitFor(() => expect(screen.getByTestId('character-notes-save-status')).toHaveTextContent('Saved'));
  expect(onCharacterUpdate).toHaveBeenCalledWith({ notes: 'New clue' });
  expect(localStorage.getItem(draftKey)).toBeNull();
});

test('uses the parent live-save helper when the routed sheet provides one', async () => {
  const onSaveCharacter = jest.fn().mockResolvedValue(true);
  render(<CleanNotesTab character={character} onSaveCharacter={onSaveCharacter} />);

  fireEvent.change(screen.getByPlaceholderText('Write live character notes here...'), {
    target: { value: 'Shared save path' },
  });

  await act(async () => {
    jest.advanceTimersByTime(1200);
    await Promise.resolve();
  });

  await waitFor(() => expect(onSaveCharacter).toHaveBeenCalledWith(
    { notes: 'Shared save path' },
    { error: 'Could not save notes' },
  ));
  expect(apiClient.patch).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByTestId('character-notes-save-status')).toHaveTextContent('Saved'));
  expect(localStorage.getItem(draftKey)).toBeNull();
});

test('keeps a failed autosave draft locally and restores it when the Notes tab remounts', async () => {
  apiClient.patch.mockRejectedValue(new Error('offline'));
  const first = render(<CleanNotesTab character={character} onCharacterUpdate={jest.fn()} />);

  fireEvent.change(screen.getByPlaceholderText('Write live character notes here...'), {
    target: { value: 'Do not lose this clue' },
  });

  await act(async () => {
    jest.advanceTimersByTime(1200);
    await Promise.resolve();
  });

  await waitFor(() => expect(screen.getByTestId('character-notes-save-status')).toHaveTextContent('Save failed'));
  expect(localStorage.getItem(draftKey)).toBe('Do not lose this clue');

  first.unmount();
  render(<CleanNotesTab character={character} onCharacterUpdate={jest.fn()} />);

  expect(screen.getByPlaceholderText('Write live character notes here...')).toHaveValue('Do not lose this clue');
  expect(screen.getByTestId('character-notes-save-status')).toHaveTextContent('Unsaved changes');
});

test('a new signed-in account cannot read a previous account’s unsaved character notes', () => {
  const encode = value => window.btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\\+/g, '-').replace(/\\//g, '_');
  const tokenFor = sub => `${encode({ alg: 'HS256' })}.${encode({ sub })}.signature`;

  setAuthToken(tokenFor('account-a'));
  const accountAKey = accountDraftStorageKey('rqk.character-notes-draft:hero-1');
  localStorage.setItem(accountAKey, 'Secret draft for account A');

  setAuthToken(tokenFor('account-b'));
  const accountBKey = accountDraftStorageKey('rqk.character-notes-draft:hero-1');
  expect(accountAKey).not.toBe(accountBKey);

  const result = render(<CleanNotesTab character={character} />);
  expect(screen.getByPlaceholderText('Write live character notes here...')).toHaveValue('Old note');
  expect(localStorage.getItem(accountAKey)).toBe('Secret draft for account A');
  result.unmount();
  setAuthToken(tokenFor('account-a'));
  expect(accountDraftStorageKey('rqk.character-notes-draft:hero-1')).toBe(accountAKey);
});

test('blurring dirty notes triggers an immediate save without waiting for the debounce', async () => {
  apiClient.patch.mockResolvedValue({ data: { ...character, notes: 'Blur save' } });
  render(<CleanNotesTab character={character} onCharacterUpdate={jest.fn()} />);
  const textarea = screen.getByPlaceholderText('Write live character notes here...');

  fireEvent.change(textarea, { target: { value: 'Blur save' } });
  fireEvent.blur(textarea);

  await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/characters/hero-1', { notes: 'Blur save' }));
  expect(apiClient.patch).toHaveBeenCalledTimes(1);
});
