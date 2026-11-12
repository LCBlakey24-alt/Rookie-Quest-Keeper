import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import HexRecovery, { DEATH_WEDGES } from './HexRecovery';

const centreOf = (points) => {
  const pairs = points.split(' ').map((pair) => pair.split(',').map(Number));
  return pairs.reduce(([x, y], [px, py]) => [x + px / pairs.length, y + py / pairs.length], [0, 0]);
};

describe('the death-save wheel', () => {
  test('successes fill the right side and failures the left, each from the top down', () => {
    ['success', 'failure'].forEach((type) => {
      const centres = DEATH_WEDGES.filter((wedge) => wedge.type === type)
        .sort((a, b) => a.index - b.index)
        .map((wedge) => centreOf(wedge.points));
      centres.forEach(([x]) => expect(type === 'success' ? x > 0 : x < 0).toBe(true));
      expect(centres[0][1]).toBeLessThan(centres[1][1]);
      expect(centres[1][1]).toBeLessThan(centres[2][1]);
    });
  });

  test('marks the first success at the top and saves a tapped wedge', () => {
    const onPatch = jest.fn();
    render(
      <HexRecovery
        character={{ max_hit_points: 20, current_hit_points: 0, death_saves_successes: 1, death_saves_failures: 0 }}
        onRest={jest.fn()} onSpendHitDie={jest.fn()} onRollDeathSave={jest.fn()} onPatch={onPatch}
      />,
    );
    expect(screen.getByTestId('hex-death-success-1')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('hex-death-success-2')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByTestId('hex-death-failure-1'));
    expect(onPatch).toHaveBeenCalledWith({ death_saves_failures: 1 }, expect.anything());
    fireEvent.keyDown(screen.getByTestId('hex-death-success-2'), { key: 'Enter' });
    expect(onPatch).toHaveBeenLastCalledWith({ death_saves_successes: 2 }, expect.anything());
  });
});
