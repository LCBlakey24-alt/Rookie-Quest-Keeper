import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import HexRecovery from './HexRecovery';

const actions = () => ({ onRest: jest.fn(), onSpendHitDie: jest.fn(), onOpenDeathSaves: jest.fn() });

describe('the recovery panel', () => {
  test('at 0 HP it offers the Death Saves wheel with the current counts', () => {
    const handlers = actions();
    render(<HexRecovery character={{ max_hit_points: 20, current_hit_points: 0, death_saves_successes: 1, death_saves_failures: 2 }} {...handlers} />);
    const link = screen.getByTestId('hex-open-death-saves');
    expect(link).toHaveTextContent('1 pass · 2 fail');
    fireEvent.click(link);
    expect(handlers.onOpenDeathSaves).toHaveBeenCalled();
  });

  test('a character who is up with no saves marked has no death-save button', () => {
    render(<HexRecovery character={{ max_hit_points: 20, current_hit_points: 12 }} {...actions()} />);
    expect(screen.queryByTestId('hex-open-death-saves')).toBeNull();
  });
});
