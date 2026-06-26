import React from 'react';

export const BRAND_MAIN_LOGO_SRC = '/brand/rqk-logo-main.svg';
export const BRAND_MINI_LOGO_SRC = '/brand/rqk-logo-mini.svg';

export function BrandMiniLogo({ size = 24, className = '', style = {}, alt = 'RQK' }) {
  const numericSize = Number(size) || 24;
  return (
    <img
      src={BRAND_MINI_LOGO_SRC}
      alt={alt}
      className={className}
      style={{
        width: numericSize,
        height: numericSize,
        display: 'inline-block',
        objectFit: 'contain',
        background: 'transparent',
        ...style,
      }}
    />
  );
}

export function BrandMainLogo({ height = 54, className = '', style = {}, alt = 'Rookie Quest Keeper' }) {
  const numericHeight = Number(height) || 54;
  return (
    <img
      src={BRAND_MAIN_LOGO_SRC}
      alt={alt}
      className={className}
      style={{
        height: numericHeight,
        width: 'auto',
        maxWidth: '100%',
        display: 'inline-block',
        objectFit: 'contain',
        background: 'transparent',
        ...style,
      }}
    />
  );
}

export default BrandMainLogo;
