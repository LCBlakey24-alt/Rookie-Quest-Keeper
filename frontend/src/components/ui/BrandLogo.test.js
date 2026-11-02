import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  BRAND_MAIN_LOGO_SRC,
  BRAND_COMPACT_LOGO_SRC,
  BRAND_MINI_LOGO_SRC,
  BrandMainLogo,
  BrandCompactLogo,
  BrandMiniLogo,
} from './BrandLogo';

describe('Keeper owner-supplied logo rollout', () => {
  it('uses the new vector wordmark for full and compact branding', () => {
    expect(BRAND_MAIN_LOGO_SRC).toBe('/brand/rookie-quest-keeper-main-logo.svg');
    expect(BRAND_COMPACT_LOGO_SRC).toBe(BRAND_MAIN_LOGO_SRC);
    render(<><BrandMainLogo width={210} /><BrandCompactLogo width={140} /></>);
    const logos = screen.getAllByRole('img', { name: 'Rookie Quest Keeper' });
    expect(logos).toHaveLength(2);
    logos.forEach((logo) => expect(logo).toHaveAttribute('src', BRAND_MAIN_LOGO_SRC));
  });

  it('keeps the separate square mark instead of squashing a horizontal wordmark', () => {
    expect(BRAND_MINI_LOGO_SRC).toBe('/brand/keeper-symbol.png');
    render(<BrandMiniLogo size={36} />);
    const mini = screen.getByRole('img', { name: 'Rookie Quest Keeper' });
    expect(mini).toHaveAttribute('src', BRAND_MINI_LOGO_SRC);
    expect(mini).toHaveAttribute('width', '36');
    expect(mini).toHaveAttribute('height', '36');
  });
});
