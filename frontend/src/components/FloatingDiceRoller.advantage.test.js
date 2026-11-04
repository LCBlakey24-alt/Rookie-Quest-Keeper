import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { rollDiceNotation } from '@/data/diceRoller';
import FloatingDiceRoller from './FloatingDiceRoller';

// This project sets jest `resetMocks: true`, which strips an implementation
// passed to jest.fn(), so the real engine is reattached before each test.
const engine = jest.requireActual('@/data/diceRoller');

// The real engine is kept, so these assertions describe real roll behaviour;
// the spy only records what notation the panel asked it to roll.
jest.mock('@/data/diceRoller', () => {
  const actual = jest.requireActual('@/data/diceRoller');
  return {
    __esModule: true,
    ...actual,
    rollDiceNotation: jest.fn((...args) => actual.rollDiceNotation(...args)),
  };
});

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(() => new Promise(() => {})) },
}));

jest.mock('sonner', () => {
  const toast = jest.fn();
  toast.error = jest.fn();
  return { __esModule: true, toast };
});

jest.mock('@/components/DiceRollFlicker', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-flicker" />,
}));

jest.mock('@/lib/liveDisplayBus', () => ({
  __esModule: true,
  loadDisplayState: jest.fn(() => null),
  subscribeDisplayState: jest.fn(() => () => {}),
  subscribeRemoteDisplayState: jest.fn(() => () => {}),
}));

function openPanel() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <FloatingDiceRoller />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByTestId('dice-roller-toggle'));
}

function setFormula(value) {
  fireEvent.change(screen.getByTestId('custom-dice-input'), { target: { value } });
}

const lastCall = () => rollDiceNotation.mock.calls[rollDiceNotation.mock.calls.length - 1];

describe('advantage and disadvantage use the formula on screen', () => {
  beforeEach(() => {
    rollDiceNotation.mockImplementation((...args) => engine.rollDiceNotation(...args));
  });

  test('advantage keeps the modifier the player typed', () => {
    // A check at the table is almost never a bare d20: rolling 1d20 with
    // advantage and silently dropping the +5 gives the wrong number.
    openPanel();
    setFormula('1d20+5');
    fireEvent.click(screen.getByTestId('roll-advantage-btn'));

    const [notation, options] = lastCall();
    expect(notation).toBe('1d20+5');
    expect(options).toMatchObject({ rollType: 'advantage' });
  });

  test('disadvantage keeps a negative modifier', () => {
    openPanel();
    setFormula('1d20-2');
    fireEvent.click(screen.getByTestId('roll-disadvantage-btn'));

    const [notation, options] = lastCall();
    expect(notation).toBe('1d20-2');
    expect(options).toMatchObject({ rollType: 'disadvantage' });
  });

  test('the rolled total includes the typed modifier', () => {
    openPanel();
    // A modifier larger than the die makes this unambiguous: a plain d20
    // cannot reach 101, so a passing range here cannot overlap the bug.
    setFormula('1d20+100');
    fireEvent.click(screen.getByTestId('roll-advantage-btn'));

    const total = Number(screen.getByTestId('roll-result').querySelector('strong').textContent);
    expect(total).toBeGreaterThanOrEqual(101);
    expect(total).toBeLessThanOrEqual(120);
  });

  test('a formula that cannot take advantage falls back to a plain d20', () => {
    // The engine rejects advantage on anything but a single d20, so the panel
    // must not hand it 2d6+3 and surface an error the player cannot act on.
    openPanel();
    setFormula('2d6+3');
    fireEvent.click(screen.getByTestId('roll-advantage-btn'));

    const [notation, options] = lastCall();
    expect(notation).toBe('1d20');
    expect(options).toMatchObject({ rollType: 'advantage' });
    expect(screen.getByTestId('roll-result')).toBeInTheDocument();
  });

  test('an empty formula still rolls a plain d20 with advantage', () => {
    openPanel();
    setFormula('');
    fireEvent.click(screen.getByTestId('roll-disadvantage-btn'));

    expect(lastCall()[0]).toBe('1d20');
  });
});
