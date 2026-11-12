import React from 'react';
import { render, screen } from '@testing-library/react';

import LandingWheelPreview from './LandingWheelPreview';

test('the landing picture is the sheet wheel: six ring wedges and the dice centre, hidden from assistive tech', () => {
  render(<LandingWheelPreview />);
  const wheel = screen.getByTestId('landing-wheel-preview');
  expect(wheel).toHaveAttribute('aria-hidden', 'true');
  expect(wheel.querySelectorAll('.landing-wheel__wedge')).toHaveLength(6);
  expect(wheel.querySelectorAll('.landing-wheel__wedge.is-chosen')).toHaveLength(1);
  expect(wheel.textContent).toContain('Core Abilities');
  expect(wheel.querySelector('.landing-wheel__centre-label').textContent).toBe('D20');
});
