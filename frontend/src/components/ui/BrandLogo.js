export const BRAND_MAIN_LOGO_PNG_SRC = '/brand/rqk-logo-main.png';
export const BRAND_MINI_LOGO_PNG_SRC = '/brand/rqk-logo-mini.png';
export const BRAND_MAIN_LOGO_SRC = '/brand/rqk-logo-main.svg';
export const BRAND_MINI_LOGO_SRC = '/brand/rqk-logo-mini.svg';

export function BrandMiniLogo({ className = '', alt = 'Rookie Quest Keeper', size = 44, style = {} }) {
  return (
    <img
      src={BRAND_MINI_LOGO_SRC}
      alt={alt}
      className={className}
      width={size}
      height={size}
      style={{ display: 'block', objectFit: 'contain', ...style }}
    />
  );
}

export function BrandMainLogo({ className = '', alt = 'Rookie Quest Keeper', width = 220, style = {} }) {
  return (
    <img
      src={BRAND_MAIN_LOGO_SRC}
      alt={alt}
      className={className}
      width={width}
      style={{ display: 'block', maxWidth: '100%', height: 'auto', objectFit: 'contain', ...style }}
    />
  );
}

export default BrandMainLogo;
