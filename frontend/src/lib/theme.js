/**
 * ROOK shared design theme.
 * Sunset Gradient: very dark blue-purple backgrounds, deep panels,
 * white text, sunset-gradient actions, and meaningful state colours.
 * Import via: import { theme } from '@/lib/theme';
 */

export const theme = {
  // Backgrounds
  bg: {
    primary: 'var(--rq-bg-main)',
    surface: 'var(--rq-bg-panel)',
    elevated: 'var(--rq-card-hover)',
    deep: 'rgba(7, 7, 19, 0.92)',
    panel: 'var(--rq-bg-panel)',
    card: 'var(--rq-bg-panel-alt)',
  },
  // Text
  text: {
    primary: 'var(--rq-text-primary)',
    secondary: 'var(--rq-text-secondary)',
    muted: 'var(--rq-text-muted)',
    accent: 'var(--rq-accent-primary)'
  },
  // Accents - sunset-gradient theme
  accent: {
    primary: 'var(--rq-accent-primary)',
    hover: 'var(--rq-accent-hover)',
    soft: 'var(--rq-accent-soft)',
    line: 'var(--rq-accent-border)',
    secondary: 'var(--rq-accent-active)',
    highlight: 'var(--rq-accent-hover)',
    pink: 'var(--rq-accent-primary)'
  },
  // Borders use subtle pale/sunset tint
  border: 'var(--rq-border-default)',
  borderActive: 'var(--rq-accent-primary)',
  // State colors (kept meaningful)
  success: 'var(--rq-success, #7A9B66)',
  danger: 'var(--rq-danger, #B44732)',
  warning: 'var(--rq-warning, #D4953C)',
  // Legacy compatibility shims (so existing `theme.sunset.xxx` lookups keep rendering)
  sunset: {
    purple: 'var(--rq-accent-active)',
    pink: 'var(--rq-accent-primary)',
    gold: 'var(--rq-accent-hover)'
  },
  gradient: 'var(--rq-sunset-gradient, linear-gradient(135deg, #7357ff, #d84df1, #ff4f81, #ff9542))',
  glow: '0 12px 34px rgba(255, 79, 129, 0.20)',
  player:  { primary: 'var(--rq-accent-primary)', hover: 'var(--rq-accent-hover)', secondary: 'var(--rq-accent-active)' },
  gm:      { primary: 'var(--rq-accent-primary)', hover: 'var(--rq-accent-hover)', secondary: 'var(--rq-accent-active)' },
};

/** Common panel style: dark panel surface + subtle outline. */
export const panelStyle = {
  background: theme.bg.surface,
  border: `1px solid ${theme.accent.line}`,
  borderRadius: 10,
  padding: 16,
};

export const buttonStyle = {
  background: theme.gradient,
  border: `1px solid ${theme.accent.hover}`,
  borderRadius: 8,
  color: 'var(--rq-text-primary, #ffffff)',
  padding: '8px 14px',
  fontWeight: 800,
  cursor: 'pointer',
};

/**
 * Per-class accent palette - subtle border / icon tint within Sunset Gradient.
 * `tint` = used as a soft border-shadow / left-border accent
 * `icon` = used for the class crest dot next to character name + section headers
 */
export const CLASS_ACCENTS = {
  Barbarian: { tint: 'rgba(255, 149, 66, 0.34)',  icon: '#ff9542', label: 'Barbarian' },
  Bard:      { tint: 'rgba(216, 77, 241, 0.34)', icon: '#d84df1', label: 'Bard' },
  Cleric:    { tint: 'rgba(255, 255, 255, 0.28)',icon: '#ffffff', label: 'Cleric' },
  Druid:     { tint: 'rgba(122, 155, 102, 0.42)', icon: '#7A9B66', label: 'Druid' },
  Fighter:   { tint: 'rgba(255, 79, 129, 0.34)',icon: '#ff4f81', label: 'Fighter' },
  Monk:      { tint: 'rgba(255, 149, 66, 0.30)', icon: '#ff9542', label: 'Monk' },
  Paladin:   { tint: 'rgba(255, 255, 255, 0.32)', icon: '#ffffff', label: 'Paladin' },
  Ranger:    { tint: 'rgba(122, 155, 102, 0.40)',  icon: '#7A9B66', label: 'Ranger' },
  Rogue:     { tint: 'rgba(115, 87, 255, 0.34)',   icon: '#7357ff', label: 'Rogue' },
  Sorcerer:  { tint: 'rgba(235, 63, 233, 0.34)', icon: '#eb3fe9', label: 'Sorcerer' },
  Warlock:   { tint: 'rgba(115, 87, 255, 0.38)', icon: '#7357ff', label: 'Warlock' },
  Wizard:    { tint: 'rgba(216, 77, 241, 0.34)', icon: '#d84df1', label: 'Wizard' },
};

/**
 * Helper: returns class accent object for a character (handles multiclass — picks primary class).
 * Falls back to sunset-gradient accent when class is unknown.
 */
export function getClassAccent(character) {
  if (!character) return { tint: theme.border, icon: theme.accent.primary, label: '' };
  // Multiclass: pick the highest-level class as primary
  const ml = character.multiclass_levels || character.class_levels;
  let primary = character.character_class;
  if (ml && Object.keys(ml).length > 1) {
    primary = Object.entries(ml).sort((a, b) => b[1] - a[1])[0][0];
  }
  return CLASS_ACCENTS[primary] || { tint: theme.border, icon: theme.accent.primary, label: primary || '' };
}
