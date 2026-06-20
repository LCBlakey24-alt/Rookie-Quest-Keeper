/**
 * ROOK shared design theme.
 * Velvet Tabletop: espresso backgrounds, leather panels, cream text,
 * gold primary actions, copper warmth, and meaningful state colours.
 * Import via: import { theme } from '@/lib/theme';
 */

export const theme = {
  // Backgrounds
  bg: {
    primary: 'var(--rq-bg-main)',
    surface: 'var(--rq-bg-panel)',
    elevated: 'var(--rq-bg-elevated)',
    deep: 'rgba(18, 12, 8, 0.92)',
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
  // Accents - Velvet gold/copper theme
  accent: {
    primary: 'var(--rq-accent-primary)',
    hover: 'var(--rq-accent-hover)',
    soft: 'var(--rq-accent-soft)',
    line: 'var(--rq-accent-border)',
    secondary: 'var(--rq-accent-active)',
    highlight: 'var(--rq-accent-hover)',
    pink: 'var(--rq-accent-active)'
  },
  // Borders use warm gold/copper tint
  border: 'var(--rq-border-default)',
  borderActive: 'var(--rq-accent-primary)',
  // State colors (kept meaningful)
  success: 'var(--rq-success)',
  danger: 'var(--rq-danger)',
  warning: 'var(--rq-warning)',
  // Legacy compatibility shims (so existing `theme.sunset.xxx` lookups keep rendering)
  sunset: {
    purple: 'var(--rq-accent-active)',
    pink: 'var(--rq-accent-primary)',
    gold: 'var(--rq-accent-hover)'
  },
  gradient: 'linear-gradient(135deg, var(--rq-accent-primary), var(--rq-accent-active))',
  glow: '0 12px 34px rgba(192, 138, 61, 0.18)',
  player:  { primary: 'var(--rq-accent-primary)', hover: 'var(--rq-accent-hover)', secondary: 'var(--rq-accent-active)' },
  gm:      { primary: 'var(--rq-accent-primary)', hover: 'var(--rq-accent-hover)', secondary: 'var(--rq-accent-active)' },
};

/** Common panel style: leather surface + warm 1px outline. */
export const panelStyle = {
  background: theme.bg.surface,
  border: `1px solid ${theme.accent.line}`,
  borderRadius: 10,
  padding: 16,
};

export const buttonStyle = {
  background: theme.accent.primary,
  border: `1px solid ${theme.accent.hover}`,
  borderRadius: 8,
  color: 'var(--rq-text-inverse)',
  padding: '8px 14px',
  fontWeight: 800,
  cursor: 'pointer',
};

/**
 * Per-class accent palette - subtle border / icon tint within Velvet Tabletop.
 * `tint` = used as a soft border-shadow / left-border accent
 * `icon` = used for the class crest dot next to character name + section headers
 */
export const CLASS_ACCENTS = {
  Barbarian: { tint: 'rgba(164, 90, 50, 0.42)',  icon: '#A45A32', label: 'Barbarian' },
  Bard:      { tint: 'rgba(224, 177, 92, 0.38)', icon: '#E0B15C', label: 'Bard' },
  Cleric:    { tint: 'rgba(245, 230, 200, 0.38)',icon: '#F5E6C8', label: 'Cleric' },
  Druid:     { tint: 'rgba(122, 155, 102, 0.42)', icon: '#7A9B66', label: 'Druid' },
  Fighter:   { tint: 'rgba(192, 138, 61, 0.40)',icon: '#C08A3D', label: 'Fighter' },
  Monk:      { tint: 'rgba(224, 177, 92, 0.38)', icon: '#E0B15C', label: 'Monk' },
  Paladin:   { tint: 'rgba(245, 230, 200, 0.42)', icon: '#F5E6C8', label: 'Paladin' },
  Ranger:    { tint: 'rgba(122, 155, 102, 0.40)',  icon: '#7A9B66', label: 'Ranger' },
  Rogue:     { tint: 'rgba(205, 186, 152, 0.34)',   icon: '#CDBA98', label: 'Rogue' },
  Sorcerer:  { tint: 'rgba(180, 71, 50, 0.34)', icon: '#B44732', label: 'Sorcerer' },
  Warlock:   { tint: 'rgba(164, 90, 50, 0.42)', icon: '#A45A32', label: 'Warlock' },
  Wizard:    { tint: 'rgba(192, 138, 61, 0.38)', icon: '#C08A3D', label: 'Wizard' },
};

/**
 * Helper: returns class accent object for a character (handles multiclass — picks primary class).
 * Falls back to gold-only accent when class is unknown.
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
