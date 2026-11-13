import React from 'react';
import { render } from '@testing-library/react';

import DisplayHexPortrait, { healthTone } from './DisplayHexPortrait';

describe('DisplayHexPortrait', () => {
  test('crops the portrait to a hexagon, decoratively', () => {
    const { container } = render(<DisplayHexPortrait imageUrl="/hero.png" name="Ash" />);
    const image = container.querySelector('image');
    expect(image).toHaveAttribute('href', '/hero.png');
    expect(image.getAttribute('clip-path')).toMatch(/^url\(#/);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  test('shows initials without artwork', () => {
    const { container } = render(<DisplayHexPortrait name="Mira Vale" />);
    expect(container.querySelector('text')).toHaveTextContent('MV');
  });

  test('the edge tone follows the turn and the side', () => {
    const { getAllByTestId } = render(<>
      <DisplayHexPortrait name="A" tone="hot" />
      <DisplayHexPortrait name="B" tone="danger" />
    </>);
    expect(getAllByTestId('display-hex-portrait').map((node) => node.dataset.tone)).toEqual(['hot', 'danger']);
  });

  test('a player carries a health ring sized to their HP', () => {
    const { container, getByTestId } = render(<DisplayHexPortrait name="Ash" hpPercent={50} hpStatus="hurt" />);
    expect(getByTestId('display-hex-portrait').dataset.health).toBe('hurt');
    const ring = container.querySelector('.rqk-display-hex__ring');
    expect(Number(ring.getAttribute('stroke-dasharray').split(' ')[0])).toBeCloseTo(132, 0);
  });

  test('health tones: healthy, hurt, bloodied, down', () => {
    expect(healthTone(90, 'healthy')).toBe('healthy');
    expect(healthTone(60)).toBe('hurt');
    expect(healthTone(20)).toBe('bloodied');
    expect(healthTone(0)).toBe('down');
  });
});
