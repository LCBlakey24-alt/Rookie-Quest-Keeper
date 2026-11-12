import React from 'react';
import { render, screen } from '@testing-library/react';

import HexBackdrop, { BACKDROP_HEXES } from './HexBackdrop';

test('the backdrop is decorative: hidden from assistive technology', () => {
  render(<HexBackdrop />);
  const backdrop = screen.getByTestId('hex-backdrop');
  expect(backdrop).toHaveAttribute('aria-hidden', 'true');
  expect(backdrop.querySelectorAll('svg')).toHaveLength(BACKDROP_HEXES.length);
});

test('each hexagon carries the motif: a hexagon, a ring and an inner hexagon', () => {
  render(<HexBackdrop />);
  const first = screen.getByTestId('hex-backdrop').querySelector('svg');
  expect(first.querySelectorAll('polygon')).toHaveLength(2);
  expect(first.querySelectorAll('circle')).toHaveLength(1);
  expect(first).toHaveAttribute('focusable', 'false');
});
