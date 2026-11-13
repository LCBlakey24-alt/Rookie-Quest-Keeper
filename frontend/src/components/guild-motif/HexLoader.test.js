import React from 'react';
import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

import HexLoader from './HexLoader';

describe('HexLoader', () => {
  test('draws a hexagon with a six-wedge wheel inside, hidden from assistive technology', () => {
    const { container } = render(<HexLoader />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.rq-hex-loader__case')).toBeInTheDocument();
    expect(container.querySelectorAll('.rq-hex-loader__wheel .rq-hex-loader__wedge')).toHaveLength(6);
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('a label makes it a polite status with visible text', () => {
    render(<HexLoader label="Loading NPCs…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading NPCs…');
  });

  test('withLogo puts the Rookie mark in the centre', () => {
    const { container } = render(<HexLoader size="lg" withLogo />);
    expect(container.querySelector('image')).toHaveAttribute('href', '/brand/rqk-hex-logo-360.png');
    expect(container.firstChild).toHaveClass('rq-hex-loader--lg');
  });

  test('two loaders on one page keep their own gradient ids', () => {
    const { container } = render(<><HexLoader /><HexLoader /></>);
    const ids = [...container.querySelectorAll('linearGradient')].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('the hexagon and the wheel turn opposite ways and stop for reduced motion', () => {
    const css = fs.readFileSync(path.join(__dirname, 'HexLoader.css'), 'utf8');
    expect(css).toMatch(/\.rq-hex-loader__case \{ animation: rq-hex-loader-turn [\d.]+s linear infinite; \}/);
    expect(css).toMatch(/\.rq-hex-loader__wheel \{ animation: rq-hex-loader-turn [\d.]+s linear infinite reverse; \}/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*animation: none/);
  });
});
