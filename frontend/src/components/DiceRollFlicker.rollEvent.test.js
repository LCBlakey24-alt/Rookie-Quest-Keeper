/**
 * A character-sheet animation and its remote campaign event must share the
 * same physical dice. The 2026-11 roll endpoint accepts structured DieResult
 * objects, not the numeric damage arrays used inside the sheet.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DiceRollFlicker from './DiceRollFlicker';
import apiClient from '@/lib/apiClient';
import { recordRemoteRoll } from '@/lib/sessionRollStats';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
jest.mock('@/lib/sessionRollStats', () => ({
  recordRemoteRoll: jest.fn(() => Promise.resolve({ id: 'recorded' })),
}));

let originalMatchMedia;

beforeEach(() => {
  jest.clearAllMocks();
  originalMatchMedia = window.matchMedia;
  window.matchMedia = () => ({
    matches: true, addEventListener: () => {}, removeEventListener: () => {},
  });
  apiClient.get.mockImplementation(url => Promise.resolve({
    data: { id: url.split('/').pop(), name: 'Test Hero', campaign_id: 'test-campaign' },
  }));
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  window.history.replaceState({}, '', '/');
});

function showCharacterRoll(id, props) {
  window.history.replaceState({}, '', `/characters/${id}`);
  return render(
    <DiceRollFlicker isOpen rollId={id} theme="player" onClose={() => {}} {...props} />
  );
}

test('damage rolls send exactly the structured dice faces shown to the player', async () => {
  showCharacterRoll('damage-structured-1', {
    label: 'Longsword Damage',
    modifier: 4,
    total: 9,
    rolls: [{ sides: 8, result: 5 }],
  });

  await waitFor(() => expect(recordRemoteRoll).toHaveBeenCalledTimes(1));
  const [campaignId, event] = recordRemoteRoll.mock.calls[0];
  expect(campaignId).toBe('test-campaign');
  expect(event.total).toBe(9);
  expect(event.rolls).toEqual([{
    sides: 8, result: 5, sign: 1, dropped: false, exploded: false,
  }]);
  expect(event.visibleRolls).toEqual(event.rolls);
  expect(screen.getByTestId('flat-dice-overlay')).toBeInTheDocument();
});

test('a dropped advantage die remains recorded but does not count as visible', async () => {
  showCharacterRoll('advantage-structured-2', {
    label: 'Attack',
    modifier: 3,
    total: 20,
    rolls: [
      { sides: 20, result: 3, dropped: true },
      { sides: 20, result: 17, dropped: false },
    ],
  });

  await waitFor(() => expect(recordRemoteRoll).toHaveBeenCalledTimes(1));
  const event = recordRemoteRoll.mock.calls[0][1];
  expect(event.rolls).toHaveLength(2);
  expect(event.rolls[0]).toMatchObject({ sides: 20, result: 3, dropped: true });
  expect(event.visibleRolls).toEqual([
    { sides: 20, result: 17, sign: 1, dropped: false, exploded: false },
  ]);
});

test('fixed Unarmed Strike damage has no fabricated d2 and no invalid d1 wire die', async () => {
  showCharacterRoll('fixed-damage-3', {
    label: 'Unarmed Damage',
    modifier: 4,
    total: 5,
    rolls: [{ sides: 1, result: 1 }],
  });

  await waitFor(() => expect(recordRemoteRoll).toHaveBeenCalledTimes(1));
  const event = recordRemoteRoll.mock.calls[0][1];
  expect(event.notation).toBe('Fixed damage');
  expect(event.total).toBe(5);
  expect(event.rolls).toEqual([]);
  expect(event.visibleRolls).toEqual([]);
  expect(screen.getByText(/Fixed damage: 1 \+ 4 = 5/)).toBeInTheDocument();
  expect(screen.queryByText(/d2:/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Individual dice results')).not.toBeInTheDocument();
});
