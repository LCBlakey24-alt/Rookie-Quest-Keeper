import React from 'react';

export const ROOK_MASCOT_SRC = '/brand/rook-mascot.webp';

export default function RookMascot({
  size = 56,
  className = '',
  alt = 'Rook',
  decorative = false,
  style = {},
}) {
  const numericSize = Number(size) || 56;

  return (
    <img
      src={ROOK_MASCOT_SRC}
      alt={decorative ? '' : alt}
      aria-hidden={decorative ? 'true' : undefined}
      className={className}
      width={numericSize}
      height={numericSize}
      loading="lazy"
      decoding="async"
      style={{
        display: 'block',
        width: numericSize,
        height: numericSize,
        objectFit: 'contain',
        flex: '0 0 auto',
        ...style,
      }}
    />
  );
}
