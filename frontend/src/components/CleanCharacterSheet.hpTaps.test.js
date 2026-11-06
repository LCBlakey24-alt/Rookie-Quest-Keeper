/**
 * HP taps on a slow server.
 *
 * Production saves take a second or more (the API and database sit on
 * different continents, and the host sleeps when idle). The sheet used to
 * disable its HP buttons and ignore taps until each save came back, so a
 * player tapping "- HP" three times saw one point of damage and concluded HP
 * could not be changed. Every tap must count, show at once, and be saved in
 * order, without the server answering in between.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CleanCharacterSheet from './CleanCharacterSheet';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), patch: jest.fn(), post: jest.fn(), put: jest.fn() },
}));
jest.mock('sonner', () => {
  const toast = Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() });
  return { toast, Toaster: () => null };
});
const apiClient = require('@/lib/apiClient').default;

const CHARACTER = {
  id: 'hero-1', user_id: 'synthetic-player', name: 'Aria', level: 3, character_class: 'Rogue', race: 'Human',
  edition: '2014', strength: 10, dexterity: 16, constitution: 12, intelligence: 10, wisdom: 12, charisma: 10,
  max_hit_points: 20, current_hit_points: 20, temporary_hit_points: 0, armor_class: 14, hit_dice: '3d8',
};

function slowServer() {
  let stored = { ...CHARACTER };
  const pending = [];
  apiClient.get.mockImplementation(url => Promise.resolve({ data: url === `/characters/${CHARACTER.id}` ? stored : [] }));
  apiClient.post.mockResolvedValue({ data: {} });
  apiClient.patch.mockImplementation((url, updates) => new Promise(resolve => {
    pending.push(() => { stored = { ...stored, ...updates }; resolve({ data: stored }); });
  }));
  return {
    sent: () => apiClient.patch.mock.calls.map(([, body]) => body),
    stored: () => stored,
    // Let the server answer whatever has reached it, one request at a time.
    // The queue sends its next save a few ticks after the previous reply,
    // so keep answering until a full tick passes with nothing new sent.
    async answerAll() {
      for (let idle = 0; idle < 3;) {
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
        if (pending.length) { idle = 0; await act(async () => { pending.shift()(); }); } else idle += 1;
      }
    },
  };
}

async function openSheet() {
  render(
    <MemoryRouter initialEntries={[`/characters/${CHARACTER.id}`]}>
      <Routes><Route path="/characters/:characterId" element={<CleanCharacterSheet />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('button', { name: /Take 1 hit point of damage/ });
}

const hpMeter = () => screen.getByRole('meter', { name: 'Hit points remaining' });
const tempLabel = () => screen.getByText(/^TEMP\s*\d+$/i);

beforeEach(() => jest.clearAllMocks());

test('three quick damage taps all count, show at once, and save in order', async () => {
  const server = slowServer();
  await openSheet();
  const damage = screen.getByRole('button', { name: /Take 1 hit point of damage/ });
  fireEvent.click(damage);
  fireEvent.click(damage);
  fireEvent.click(damage);

  // Nothing has come back from the server yet, and the sheet already shows 17.
  expect(hpMeter()).toHaveAttribute('aria-valuenow', '17');
  expect(damage).toBeEnabled();
  expect(screen.getByTestId('hp-save-status')).toHaveTextContent('Saving…');

  await server.answerAll();
  expect(server.sent().map(body => body.current_hit_points)).toEqual([19, 18, 17]);
  expect(server.stored().current_hit_points).toBe(17);
  expect(hpMeter()).toHaveAttribute('aria-valuenow', '17');
  await waitFor(() => expect(screen.getByTestId('hp-save-status')).toHaveTextContent(''));
});

test('healing and damage taps interleave correctly while saves are slow', async () => {
  const server = slowServer();
  await openSheet();
  fireEvent.click(screen.getByRole('button', { name: /Take 1 hit point of damage/ }));
  fireEvent.click(screen.getByRole('button', { name: /Take 1 hit point of damage/ }));
  fireEvent.click(screen.getByRole('button', { name: /Heal 1 hit point/ }));
  expect(hpMeter()).toHaveAttribute('aria-valuenow', '19');
  await server.answerAll();
  expect(server.sent()).toHaveLength(3);
  expect(server.stored().current_hit_points).toBe(19);
});

test('quick temp HP taps all count and save in order', async () => {
  const server = slowServer();
  await openSheet();
  const add = screen.getByRole('button', { name: /Add 1 temporary hit point/ });
  fireEvent.click(add);
  fireEvent.click(add);
  fireEvent.click(add);
  expect(tempLabel()).toHaveTextContent('3');
  fireEvent.click(screen.getByRole('button', { name: /Remove 1 temporary hit point/ }));
  expect(tempLabel()).toHaveTextContent('2');
  await server.answerAll();
  expect(server.sent().map(body => body.temporary_hit_points)).toEqual([1, 2, 3, 2]);
  expect(server.stored().temporary_hit_points).toBe(2);
});

test('damage taken while temp HP is still saving comes off the temp HP first', async () => {
  const server = slowServer();
  await openSheet();
  fireEvent.click(screen.getByRole('button', { name: /Add 1 temporary hit point/ }));
  fireEvent.click(screen.getByRole('button', { name: /Take 1 hit point of damage/ }));
  expect(hpMeter()).toHaveAttribute('aria-valuenow', '20');
  expect(tempLabel()).toHaveTextContent('0');
  await server.answerAll();
  expect(server.sent()).toHaveLength(2);
  expect(server.stored()).toMatchObject({ current_hit_points: 20, temporary_hit_points: 0 });
});
