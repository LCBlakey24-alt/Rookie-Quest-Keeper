import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import LevelUpGrantWatcher, { LEVEL_UP_POLL_MS } from './LevelUpGrantWatcher';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
const apiClient = require('@/lib/apiClient').default;

const GRANT = { character_id: 'char-1', character_name: 'Punch', campaign_name: 'Tia-Karta', from_level: 4, to_level: 5, grant_id: 'g1', seen: false };

function Where() {
  const location = useLocation();
  return <output data-testid="where">{location.pathname}{location.search}</output>;
}

function renderWatcher() {
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <LevelUpGrantWatcher />
      <Routes><Route path="*" element={<Where />} /></Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  apiClient.post.mockResolvedValue({ data: { ok: true } });
});

test('a new grant shows "Level up ready!" once and is marked seen straight away', async () => {
  apiClient.get.mockResolvedValue({ data: [GRANT] });
  renderWatcher();
  expect(await screen.findByRole('dialog', { name: 'Level up ready!' })).toHaveTextContent('Punch can now reach level 5');
  expect(apiClient.get).toHaveBeenCalledWith('/characters/level-up-grants/mine');
  expect(apiClient.post).toHaveBeenCalledWith('/characters/char-1/level-up-grant/seen', { grant_id: 'g1' });
});

test('"Level up now" opens that character with the wizard flag', async () => {
  apiClient.get.mockResolvedValue({ data: [GRANT] });
  renderWatcher();
  fireEvent.click(await screen.findByTestId('level-up-now'));
  expect(screen.getByTestId('where')).toHaveTextContent('/characters/char-1?levelup=1');
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('"Later" and Escape close it', async () => {
  apiClient.get.mockResolvedValue({ data: [GRANT] });
  renderWatcher();
  fireEvent.click(await screen.findByTestId('level-up-later'));
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('grants already seen do not play again, and a failed check stays quiet', async () => {
  apiClient.get.mockResolvedValueOnce({ data: [{ ...GRANT, seen: true }] }).mockRejectedValueOnce(new Error('offline'));
  renderWatcher();
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(apiClient.post).not.toHaveBeenCalled();
});

test('it checks again about once a minute', async () => {
  jest.useFakeTimers();
  apiClient.get.mockResolvedValue({ data: [] });
  renderWatcher();
  await act(async () => { jest.advanceTimersByTime(LEVEL_UP_POLL_MS); });
  expect(apiClient.get).toHaveBeenCalledTimes(2);
  jest.useRealTimers();
});
