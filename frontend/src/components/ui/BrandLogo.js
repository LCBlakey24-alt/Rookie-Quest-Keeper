export const BRAND_MAIN_LOGO_PNG_SRC = '/brand/keeper-primary-logo.png';
export const BRAND_MINI_LOGO_PNG_SRC = '/brand/keeper-symbol.png';
export const BRAND_COMPACT_LOGO_SRC = '/brand/keeper-compact-wordmark.png';
export const BRAND_APP_ICON_SRC = '/brand/keeper-app-icon.png';
export const BRAND_MAIN_LOGO_SRC = BRAND_MAIN_LOGO_PNG_SRC;
export const BRAND_MINI_LOGO_SRC = BRAND_MINI_LOGO_PNG_SRC;

export function BrandMiniLogo({ className = '', alt = 'Rookie Quest Keeper', size = 44, style = {} }) {
  return (
    <img
      src={BRAND_MINI_LOGO_SRC}
      alt={alt}
      className={className}
      width={size}
      height={size}
      decoding="async"
      style={{ display: 'block', objectFit: 'contain', ...style }}
    />
  );
}

export function BrandMainLogo({
  className = '',
  alt = 'Rookie Quest Keeper',
  width,
  height,
  style = {},
}) {
  return (
    <img
      src={BRAND_MAIN_LOGO_SRC}
      alt={alt}
      className={className}
      width={width}
      height={height}
      decoding="async"
      style={{
        display: 'block',
        maxWidth: '100%',
        width: width || 'auto',
        height: height || 'auto',
        objectFit: 'contain',
        ...style,
      }}
    />
  );
}

export function BrandCompactLogo({
  className = '',
  alt = 'Rookie Quest Keeper',
  width,
  height,
  style = {},
}) {
  return (
    <img
      src={BRAND_COMPACT_LOGO_SRC}
      alt={alt}
      className={className}
      width={width}
      height={height}
      decoding="async"
      style={{
        display: 'block',
        maxWidth: '100%',
        width: width || 'auto',
        height: height || 'auto',
        objectFit: 'contain',
        ...style,
      }}
    />
  );
}

export default BrandMainLogo;
