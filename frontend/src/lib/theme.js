/**
 * Rookie Quest Keeper shared presentation tokens.
 * Deep navy surfaces, warm cream hierarchy, antique-gold actions and restrained
 * blue support. Status colours keep semantic meaning instead of doubling as brand decoration.
 */

export const theme = {
  bg: {
    primary: 'var(--rq-bg-main, #0a2342)',
    surface: 'var(--rq-bg-panel, #0a2342)',
    elevated: 'var(--rq-card-hover, #0a2342)',
    deep: 'var(--rq-bg-rail, #0a2342)',
    panel: 'var(--rq-bg-panel, #0a2342)',
    card: 'var(--rq-bg-panel-alt, #0a2342)',
  },
  text: {
    primary: 'var(--rq-text-primary, #ffffff)',
    secondary: 'var(--rq-text-secondary, rgba(255, 255, 255,0.78))',
    muted: 'var(--rq-text-muted, rgba(255, 255, 255,0.60))',
    accent: 'var(--rq-accent-hover, #ffb066)',
  },
  accent: {
    primary: 'var(--rq-accent-primary, #f2892f)',
    hover: 'var(--rq-accent-hover, #ffb066)',
    soft: 'var(--rq-accent-soft, rgba(242, 137, 47,0.12))',
    line: 'var(--rq-accent-border, rgba(242, 137, 47,0.30))',
    secondary: 'var(--rq-secondary, #3C92E0)',
    highlight: 'var(--rq-secondary, #3C92E0)',
    // Legacy property name retained for older components.
    pink: 'var(--rq-accent-primary, #f2892f)',
  },
  border: 'var(--rq-border-default, rgba(137,157,176,0.14))',
  borderActive: 'var(--rq-accent-primary, #f2892f)',
  success: 'var(--rq-success, #5FA67A)',
  danger: 'var(--rq-danger, #B94A4F)',
  warning: 'var(--rq-warning, #D39A43)',
  info: 'var(--rq-info, #3C92E0)',

  // Compatibility aliases deliberately resolve to the current flat system.
  sunset: {
    purple: 'var(--rq-secondary, #3C92E0)',
    pink: 'var(--rq-accent-primary, #f2892f)',
    gold: 'var(--rq-accent-primary, #f2892f)',
  },
  gradient: 'var(--rq-accent-primary, #f2892f)',
  glow: 'none',
  player: {
    primary: 'var(--rq-secondary, #3C92E0)',
    hover: 'var(--rq-accent-hover, #ffb066)',
    secondary: 'var(--rq-secondary, #3C92E0)',
  },
  gm: {
    primary: 'var(--rq-accent-primary, #f2892f)',
    hover: 'var(--rq-accent-hover, #ffb066)',
    secondary: 'var(--rq-secondary, #3C92E0)',
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

const BLUE = { tint: 'rgba(121,188,232,0.18)', icon: '#3C92E0' };
const GOLD = { tint: 'rgba(242, 137, 47,0.18)', icon: '#f2892f' };

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
