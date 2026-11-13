/**
 * An Undo toast outlives the sheet it came from. Pressing it after opening
 * another character (A -> B), or after reopening the same one (A -> B -> A),
 * must never change a different character or a newer session.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

import HexCharacterSheet from './HexCharacterSheet';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), patch: jest.fn(), post: jest.fn(), put: jest.fn() },
}));
jest.mock('sonner', () => {
  const toast = Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() });
  return { toast, Toaster: () => null };
});
jest.mock('@/components/DiceRollFlicker', () => () => null);
jest.mock('@/components/LevelUpWizard', () => () => null);

const apiClient = require('@/lib/apiClient').default;
const { toast } = require('sonner');

const wizard = (id, name) => ({
  id, name, level: 3, character_class: 'Wizard', intelligence: 16, dexterity: 12, constitution: 12,
  max_hit_points: 14, current_hit_points: 14,
  spells_prepared: [{ name: 'Magic Missile' }],
  spell_slots: { 1: 4, 2: 2 }, spell_slots_remaining: { 1: 4, 2: 2 },
});
const A = wizard('char-a', 'Ash');
// B has spent slots, so a misdirected Undo would have something to give back.
const B = { ...wizard('char-b', 'Bram'), spell_slots_remaining: { 1: 2, 2: 2 } };

let goTo;
function Navigator() { goTo = useNavigate(); return null; }

async function openA() {
  // A tiny server: each character keeps what was saved to it.
  const server = { 'char-a': { ...A }, 'char-b': { ...B } };
  const idOf = (url) => url.split('/').pop();
  apiClient.get.mockImplementation((url) => Promise.resolve({ data: { ...server[idOf(url)] } }));
  apiClient.patch.mockImplementation((url, updates) => {
    server[idOf(url)] = { ...server[idOf(url)], ...updates };
    return Promise.resolve({ data: { ...server[idOf(url)] } });
  });
  render(
    <MemoryRouter initialEntries={['/characters/char-a/hex']}>
      <Navigator />
      <Routes><Route path="/characters/:characterId/hex" element={<HexCharacterSheet />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: 'Ash' });
}

async function castOnA() {
  await act(async () => { fireEvent.click(screen.getByTestId('hex-wedge-magic')); });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cast Magic Missile, using a 1st-level slot' })); });
  expect(apiClient.patch).toHaveBeenLastCalledWith('/characters/char-a', expect.objectContaining({ spell_slots_remaining: expect.objectContaining({ 1: 3 }) }));
  const [, options] = toast.success.mock.calls.find(([message]) => message === 'Magic Missile cast');
  return options.action.onClick;
}

beforeEach(() => jest.clearAllMocks());

test('A -> B: the old Undo does not touch B', async () => {
  await openA();
  const undo = await castOnA();
  await act(async () => { goTo('/characters/char-b/hex'); });
  await screen.findByRole('heading', { name: 'Bram' });
  apiClient.patch.mockClear();
  await act(async () => { await undo(); });
  expect(apiClient.patch).not.toHaveBeenCalled();
});

test('A -> B -> A: the old Undo does not touch the reopened sheet either', async () => {
  await openA();
  const undo = await castOnA();
  await act(async () => { goTo('/characters/char-b/hex'); });
  await screen.findByRole('heading', { name: 'Bram' });
  await act(async () => { goTo('/characters/char-a/hex'); });
  await screen.findByRole('heading', { name: 'Ash' });
  apiClient.patch.mockClear();
  await act(async () => { await undo(); });
  expect(apiClient.patch).not.toHaveBeenCalled();
});

test('on the same sheet, Undo still gives the slot back', async () => {
  await openA();
  const undo = await castOnA();
  await act(async () => { await undo(); });
  expect(apiClient.patch).toHaveBeenLastCalledWith('/characters/char-a', expect.objectContaining({ spell_slots_remaining: expect.objectContaining({ 1: 4 }) }));
});

test('Combat: a Ki Undo from A does not give B a Ki point', async () => {
  const monk = (id, name, ki) => ({ id, name, level: 5, character_class: 'Monk', dexterity: 16, wisdom: 14, max_hit_points: 30, current_hit_points: 30, resources: { ki: { current: ki, max: 5 } } });
  const server = { 'char-a': monk('char-a', 'Ash', 5), 'char-b': monk('char-b', 'Bram', 1) };
  const idOf = (url) => url.split('/').pop();
  apiClient.get.mockImplementation((url) => Promise.resolve({ data: { ...server[idOf(url)] } }));
  apiClient.patch.mockImplementation((url, updates) => {
    server[idOf(url)] = { ...server[idOf(url)], ...updates };
    return Promise.resolve({ data: { ...server[idOf(url)] } });
  });
  render(
    <MemoryRouter initialEntries={['/characters/char-a/hex']}>
      <Navigator />
      <Routes><Route path="/characters/:characterId/hex" element={<HexCharacterSheet />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: 'Ash' });
  await act(async () => { fireEvent.click(screen.getByTestId('hex-wedge-combat')); });
  const kiRow = screen.getAllByTestId(/^uses-left-resource-/).find((row) => /ki/i.test(row.textContent));
  await act(async () => { fireEvent.click(kiRow.querySelector('[data-testid^="uses-left-spend-"]')); });
  const [, options] = toast.success.mock.calls.find(([, opts]) => opts?.action?.label === 'Undo');
  await act(async () => { goTo('/characters/char-b/hex'); });
  await screen.findByRole('heading', { name: 'Bram' });
  apiClient.patch.mockClear();
  await act(async () => { await options.action.onClick(); });
  expect(apiClient.patch).not.toHaveBeenCalled();
});
