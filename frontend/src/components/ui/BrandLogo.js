import React, { useState } from 'react';

export const BRAND_MAIN_LOGO_PNG_SRC = '/brand/rqk-logo-main.png';
export const BRAND_MINI_LOGO_PNG_SRC = '/brand/rqk-logo-mini.png';
export const BRAND_MAIN_LOGO_SRC = '/brand/rqk-logo-main.svg';
export const BRAND_MINI_LOGO_SRC = '/brand/rqk-logo-mini.svg';

export function BrandMiniLogo({ size = 24, className = '', style = {}, alt = 'RQK' }) {
  const [src, setSrc] = useState(BRAND_MINI_LOGO_PNG_SRC);
  const numericSize = Number(size) || 24;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        if (src !== BRAND_MINI_LOGO_SRC) setSrc(BRAND_MINI_LOGO_SRC);
      }}
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
  const [src, setSrc] = useState(BRAND_MAIN_LOGO_PNG_SRC);
  const numericHeight = Number(height) || 54;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        if (src !== BRAND_MAIN_LOGO_SRC) setSrc(BRAND_MAIN_LOGO_SRC);
      }}
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
