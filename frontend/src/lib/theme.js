/**
 * Rookie Quest Keeper shared presentation tokens.
 * Deep navy surfaces, warm cream hierarchy, antique-gold actions and restrained
 * blue support. Status colours keep semantic meaning instead of doubling as brand decoration.
 */

export const theme = {
  bg: {
    primary: 'var(--rq-bg-main, #0B1B2B)',
    surface: 'var(--rq-bg-panel, #1E2936)',
    elevated: 'var(--rq-card-hover, #334155)',
    deep: 'var(--rq-bg-rail, #07131F)',
    panel: 'var(--rq-bg-panel, #1E2936)',
    card: 'var(--rq-bg-panel-alt, #263748)',
  },
  text: {
    primary: 'var(--rq-text-primary, #EADFC8)',
    secondary: 'var(--rq-text-secondary, rgba(234,223,200,0.78))',
    muted: 'var(--rq-text-muted, rgba(234,223,200,0.60))',
    accent: 'var(--rq-accent-hover, #D9BC82)',
  },
  accent: {
    primary: 'var(--rq-accent-primary, #C9A96B)',
    hover: 'var(--rq-accent-hover, #D9BC82)',
    soft: 'var(--rq-accent-soft, rgba(201,169,107,0.12))',
    line: 'var(--rq-accent-border, rgba(201,169,107,0.30))',
    secondary: 'var(--rq-secondary, #6E91B4)',
    highlight: 'var(--rq-secondary, #6E91B4)',
    // Legacy property name retained for older components.
    pink: 'var(--rq-accent-primary, #C9A96B)',
  },
  border: 'var(--rq-border-default, rgba(137,157,176,0.14))',
  borderActive: 'var(--rq-accent-primary, #C9A96B)',
  success: 'var(--rq-success, #5FA67A)',
  danger: 'var(--rq-danger, #B94A4F)',
  warning: 'var(--rq-warning, #D39A43)',
  info: 'var(--rq-info, #6E91B4)',

  // Compatibility aliases deliberately resolve to the current flat system.
  sunset: {
    purple: 'var(--rq-secondary, #6E91B4)',
    pink: 'var(--rq-accent-primary, #C9A96B)',
    gold: 'var(--rq-accent-primary, #C9A96B)',
  },
  gradient: 'var(--rq-accent-primary, #C9A96B)',
  glow: 'none',
  player: {
    primary: 'var(--rq-secondary, #6E91B4)',
    hover: 'var(--rq-accent-hover, #D9BC82)',
    secondary: 'var(--rq-secondary, #6E91B4)',
  },
  gm: {
    primary: 'var(--rq-accent-primary, #C9A96B)',
    hover: 'var(--rq-accent-hover, #D9BC82)',
    secondary: 'var(--rq-secondary, #6E91B4)',
  },
};

export const panelStyle = {
  background: theme.bg.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 7,
  padding: 16,
  boxShadow: 'none',
};

export const buttonStyle = {
  background: theme.bg.card,
  border: `1px solid ${theme.accent.primary}`,
  borderRadius: 5,
  color: theme.text.primary,
  padding: '8px 14px',
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: 'none',
};

const BLUE = { tint: 'rgba(121,188,232,0.18)', icon: '#6E91B4' };
const GOLD = { tint: 'rgba(201,169,107,0.18)', icon: '#C9A96B' };

export const CLASS_ACCENTS = {
  Barbarian: { ...GOLD, label: 'Barbarian' },
  Bard:      { ...BLUE, label: 'Bard' },
  Cleric:    { ...BLUE, label: 'Cleric' },
  Druid:     { ...BLUE, label: 'Druid' },
  Fighter:   { ...GOLD, label: 'Fighter' },
  Monk:      { ...BLUE, label: 'Monk' },
  Paladin:   { ...GOLD, label: 'Paladin' },
  Ranger:    { ...BLUE, label: 'Ranger' },
  Rogue:     { ...GOLD, label: 'Rogue' },
  Sorcerer:  { ...GOLD, label: 'Sorcerer' },
  Warlock:   { ...BLUE, label: 'Warlock' },
  Wizard:    { ...BLUE, label: 'Wizard' },
};

export function getClassAccent(character) {
  if (!character) return { tint: theme.border, icon: theme.accent.secondary, label: '' };
  const ml = character.multiclass_levels || character.class_levels;
  let primary = character.character_class;
  if (ml && Object.keys(ml).length > 1) {
    primary = Object.entries(ml).sort((a, b) => b[1] - a[1])[0][0];
  }
  return CLASS_ACCENTS[primary] || { tint: theme.border, icon: theme.accent.secondary, label: primary || '' };
}
