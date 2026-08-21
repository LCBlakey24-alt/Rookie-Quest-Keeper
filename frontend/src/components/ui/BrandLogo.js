export const BRAND_MAIN_LOGO_PNG_SRC = '/brand/rqk-logo-main.png';
export const BRAND_MINI_LOGO_PNG_SRC = '/brand/rqk-app-icon.png';
export const BRAND_MAIN_LOGO_SRC = '/brand/rqk-logo-main.svg';
export const BRAND_MINI_LOGO_SRC = '/brand/rqk-app-icon.svg';

export function BrandMiniLogo({ size = 40, className = '', alt = 'Rookie Quest Keeper' }) {
  return (
    <img
      src={BRAND_MINI_LOGO_SRC}
      width={size}
      height={size}
      className={className}
      alt={alt}
      draggable="false"
    />
  );
}

export function BrandMainLogo({ height = 120, className = '', alt = 'Rookie Quest Keeper' }) {
  return (
    <img
      src={BRAND_MAIN_LOGO_SRC}
      height={height}
      className={className}
      alt={alt}
      draggable="false"
      style={{ width: 'auto', maxWidth: '100%' }}
    />
  );
}

export default BrandMainLogo;
