export const BRAND_MAIN_LOGO_PNG_SRC = '/brand/keeper-primary-logo.png'; // Legacy/social fallback.
export const BRAND_MAIN_LOGO_SVG_SRC = '/brand/rookie-quest-keeper-main-logo.svg'; // Previous wordmark, kept for old links.
// The owner-supplied hexagon badge (12 November 2026): the RQK monogram in a
// Neon Coast hexagon, with ROOKIE QUEST / KEEPER around it. It carries the
// name itself, so it is the main logo and the mark everywhere.
export const BRAND_BADGE_SRC = '/brand/rqk-hex-logo-360.png';
export const BRAND_MINI_LOGO_PNG_SRC = '/brand/keeper-symbol.png'; // Legacy raster fallback.
export const BRAND_MINI_LOGO_SVG_SRC = '/brand/rookie-quest-keeper-app-icon.svg';
export const BRAND_COMPACT_LOGO_SRC = BRAND_BADGE_SRC;
export const BRAND_APP_ICON_SRC = BRAND_BADGE_SRC;
export const BRAND_MAIN_LOGO_SRC = BRAND_BADGE_SRC;
export const BRAND_MINI_LOGO_SRC = BRAND_BADGE_SRC;

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
