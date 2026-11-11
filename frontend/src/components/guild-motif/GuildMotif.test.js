import React from 'react';
import { render, screen } from '@testing-library/react';

import GuildMotif, { litTicks } from './GuildMotif';

test('the ring lights in proportion to progress, and any progress lights at least one tick', () => {
  expect(litTicks(0)).toBe(0);
  expect(litTicks(0.01)).toBe(1);
  expect(litTicks(0.5)).toBe(18);
  expect(litTicks(1)).toBe(36);
  expect(litTicks(7)).toBe(36);
  expect(litTicks('nope')).toBe(0);
});

test('it is decorative unless given a label', () => {
  const { rerender } = render(<GuildMotif caption="LEVEL" value={5} progress={0.5} />);
  expect(screen.getByTestId('guild-motif')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByTestId('guild-motif')).toHaveAttribute('data-lit', '18');
  rerender(<GuildMotif caption="LEVEL" value={5} label="Level 5, step 2 of 4" />);
  expect(screen.getByRole('img', { name: 'Level 5, step 2 of 4' })).toBeInTheDocument();
});
