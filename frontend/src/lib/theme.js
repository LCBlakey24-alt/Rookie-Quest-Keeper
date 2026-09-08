/**
 * Rookie Quest Keeper 1.0 shared theme.
 * Flat deep navy surfaces, flat white type, light-blue secondary UI,
 * and neon-pink hairline accents. No gradients or glow effects.
 */

export const theme = {
  bg: {
    primary: 'var(--rq-bg-main, #071522)',
    surface: 'var(--rq-bg-panel, #0C2234)',
    elevated: 'var(--rq-card-hover, #14344C)',
    deep: 'var(--rq-bg-rail, #06111C)',
    panel: 'var(--rq-bg-panel, #0C2234)',
    card: 'var(--rq-bg-panel-alt, #102B40)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#FFFFFF',
    muted: '#FFFFFF',
    accent: '#FFFFFF',
  },
  accent: {
    primary: 'var(--rq-accent-primary, #FF2DAA)',
    hover: 'var(--rq-accent-primary, #FF2DAA)',
    soft: 'var(--rq-accent-soft, rgba(255,45,170,0.08))',
    line: 'var(--rq-accent-border, rgba(255,45,170,0.28))',
    secondary: 'var(--rq-secondary, #7CCBFF)',
    highlight: 'var(--rq-secondary, #7CCBFF)',
    pink: 'var(--rq-accent-primary, #FF2DAA)',
  },
  border: 'var(--rq-border-default, rgba(255,45,170,0.18))',
  borderActive: 'var(--rq-accent-primary, #FF2DAA)',
  success: 'var(--rq-secondary, #7CCBFF)',
  danger: 'var(--rq-accent-primary, #FF2DAA)',
  warning: '#FFFFFF',

  // Compatibility aliases for older components. These deliberately resolve to
  // flat RQK 1.0 colours so legacy lookups cannot restore the old palette.
  sunset: {
    purple: 'var(--rq-secondary, #7CCBFF)',
    pink: 'var(--rq-accent-primary, #FF2DAA)',
    gold: 'var(--rq-secondary, #7CCBFF)',
  },
  gradient: 'var(--rq-accent-primary, #FF2DAA)',
  glow: 'none',
  player: {
    primary: 'var(--rq-accent-primary, #FF2DAA)',
    hover: 'var(--rq-secondary, #7CCBFF)',
    secondary: 'var(--rq-secondary, #7CCBFF)',
  },
  gm: {
    primary: 'var(--rq-accent-primary, #FF2DAA)',
    hover: 'var(--rq-secondary, #7CCBFF)',
    secondary: 'var(--rq-secondary, #7CCBFF)',
  },
};

export const panelStyle = {
  background: theme.bg.surface,
  border: `1px solid ${theme.accent.line}`,
  borderRadius: 7,
  padding: 16,
  boxShadow: 'none',
};

export const buttonStyle = {
  background: theme.bg.card,
  border: `1px solid ${theme.accent.primary}`,
  borderRadius: 5,
  color: '#FFFFFF',
  padding: '8px 14px',
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: 'none',
};

const BLUE = { tint: 'rgba(124,203,255,0.24)', icon: '#7CCBFF' };
const PINK = { tint: 'rgba(255,45,170,0.22)', icon: '#FF2DAA' };

export const CLASS_ACCENTS = {
  Barbarian: { ...PINK, label: 'Barbarian' },
  Bard:      { ...BLUE, label: 'Bard' },
  Cleric:    { ...BLUE, label: 'Cleric' },
  Druid:     { ...BLUE, label: 'Druid' },
  Fighter:   { ...PINK, label: 'Fighter' },
  Monk:      { ...BLUE, label: 'Monk' },
  Paladin:   { ...PINK, label: 'Paladin' },
  Ranger:    { ...BLUE, label: 'Ranger' },
  Rogue:     { ...PINK, label: 'Rogue' },
  Sorcerer:  { ...PINK, label: 'Sorcerer' },
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
