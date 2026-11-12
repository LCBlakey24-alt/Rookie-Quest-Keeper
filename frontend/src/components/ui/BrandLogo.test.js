import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  BRAND_MAIN_LOGO_SRC,
  BRAND_COMPACT_LOGO_SRC,
  BRAND_MINI_LOGO_SRC,
  BRAND_APP_ICON_SRC,
  BrandMainLogo,
  BrandCompactLogo,
  BrandMiniLogo,
} from './BrandLogo';

describe('Keeper owner-supplied logo rollout', () => {
  it('uses the owner\'s hexagon badge as the main logo', () => {
    expect(BRAND_MAIN_LOGO_SRC).toBe('/brand/rqk-hex-logo-360.png');
    expect(BRAND_COMPACT_LOGO_SRC).toBe(BRAND_MAIN_LOGO_SRC);
    render(<><BrandMainLogo width={210} /><BrandCompactLogo width={140} /></>);
    const logos = screen.getAllByRole('img', { name: 'Rookie Quest Keeper' });
    expect(logos).toHaveLength(2);
    logos.forEach((logo) => expect(logo).toHaveAttribute('src', BRAND_MAIN_LOGO_SRC));
  });

  it('uses the same badge as the small mark (it already carries the name)', () => {
    expect(BRAND_MINI_LOGO_SRC).toBe('/brand/rqk-hex-logo-360.png');
    expect(BRAND_APP_ICON_SRC).toBe(BRAND_MINI_LOGO_SRC);
    render(<BrandMiniLogo size={36} />);
    const mini = screen.getByRole('img', { name: 'Rookie Quest Keeper' });
    expect(mini).toHaveAttribute('src', BRAND_MINI_LOGO_SRC);
    expect(mini).toHaveAttribute('width', '36');
    expect(mini).toHaveAttribute('height', '36');
  });
});

describe('Keeper installed-app asset references', () => {
  it('keeps real vector paths and declares correctly sized PNG fallbacks', () => {
    const fs = require('fs');
    const path = require('path');
    const publicDir = path.join(__dirname, '..', '..', '..', 'public');
    const svg = fs.readFileSync(path.join(publicDir, 'brand', 'rookie-quest-keeper-app-icon.svg'), 'utf8');
    expect(svg).toContain('<path ');
    expect(svg).toContain('linearGradient');
    expect(svg).not.toMatch(/<image\b|data:image\/|<script\b/i);
    const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, 'site.webmanifest'), 'utf8'));
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: '/icons/keeper-192.png', sizes: '192x192', purpose: 'any' }),
      expect.objectContaining({ src: '/icons/keeper-512.png', sizes: '512x512', purpose: 'any' }),
      expect.objectContaining({ src: '/icons/keeper-maskable-512.png', sizes: '512x512', purpose: 'maskable' }),
    ]));
    for (const { src } of manifest.icons) {
      expect(fs.existsSync(path.join(publicDir, src.slice(1)))).toBe(true);
    }
  });
});
