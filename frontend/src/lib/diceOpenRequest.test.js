import { consumePendingDiceOpen, DICE_OPEN_EVENT, requestDiceOpen } from './diceOpenRequest';

afterEach(() => { consumePendingDiceOpen(); });

test('the open event fires immediately while the lazy-loaded consumer can still claim it later', () => {
  const listener = jest.fn();
  window.addEventListener(DICE_OPEN_EVENT, listener);
  requestDiceOpen('/home');
  expect(listener).toHaveBeenCalledTimes(1);
  expect(consumePendingDiceOpen('/home')).toBe(true);
  expect(consumePendingDiceOpen('/home')).toBe(false);
  window.removeEventListener(DICE_OPEN_EVENT, listener);
});

test('an old Home request is discarded if the user has navigated elsewhere before loading', () => {
  requestDiceOpen('/home');
  expect(consumePendingDiceOpen('/campaign/camp-1')).toBe(false);
  expect(consumePendingDiceOpen('/home')).toBe(false);
});
