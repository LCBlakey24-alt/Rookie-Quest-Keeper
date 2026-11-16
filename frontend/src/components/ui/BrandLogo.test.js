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
      expect.objectContaining({ src: '/icons/keeper-192.png?v=20261116-1', sizes: '192x192', purpose: 'any' }),
      expect.objectContaining({ src: '/icons/keeper-512.png?v=20261116-1', sizes: '512x512', purpose: 'any' }),
      expect.objectContaining({ src: '/icons/keeper-maskable-512.png?v=20261116-1', sizes: '512x512', purpose: 'maskable' }),
    ]));
    for (const { src, sizes, type } of manifest.icons) {
      // Android may retain a previous icon until the manifest URL changes.
      // Only the query string is cache-busted; the underlying PNG must exist.
      expect(src).toMatch(/\?v=20261116-1$/);
      expect(type).toBe('image/png');
      const filePath = path.join(publicDir, src.slice(1).split('?')[0]);
      expect(fs.existsSync(filePath)).toBe(true);
      const png = fs.readFileSync(filePath);
      expect(png.length).toBeGreaterThan(4000);
      expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      const [width, height] = sizes.split('x').map(Number);
      expect(png.readUInt32BE(16)).toBe(width);
      expect(png.readUInt32BE(20)).toBe(height);
    }
    const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
    expect(html).toContain('/site.webmanifest?v=20261116-1');
    // Shortcuts that use the favicon rather than the PWA manifest must use
    // the approved hexagon badge, not a stale legacy mark.
    expect(html).toContain('/brand/rqk-hex-logo-360.png?v=20261116-1');
  });
});
