/**
 * ROOK shared design theme.
 * Velvet Tabletop surfaces, cream text, gold actions, copper accents.
 * Import via: import { theme } from '@/lib/theme';
 */

export const theme = {
  // Backgrounds
  bg: {
    primary: 'var(--rq-bg-main)',     // espresso page bg
    surface: 'var(--rq-bg-panel)',     // leather panel/card bg
    elevated: 'var(--rq-bg-elevated)',    // hover / elevated panel
    deep: 'var(--rq-bg-main)',        // deepest (modal backdrop)
    panel: 'var(--rq-bg-panel)'
  },
  // Text
  text: {
    primary: 'var(--rq-text-primary)',
    secondary: 'var(--rq-text-secondary)',
    muted: 'var(--rq-text-muted)',
    accent: 'var(--rq-accent-primary)'
  },
  // Accents - Velvet gold/copper linework
  accent: {
    primary: 'var(--rq-accent-primary)',     // main gold accent
    hover: 'var(--rq-accent-hover)',       // warm gold hover
    soft: 'var(--rq-accent-soft)',
    line: 'var(--rq-accent-border)',
    secondary: 'var(--rq-accent-active)',
    highlight: 'var(--rq-accent-hover)',
    pink: 'var(--rq-accent-primary)'
  },
  // Border uses soft gold tint
  border: 'var(--rq-border-default)',
  borderActive: 'var(--rq-accent-primary)',
  // State colors (kept meaningful)
  success: 'var(--rq-success)',
  danger: 'var(--rq-danger)',
  warning: 'var(--rq-warning)',
  // Legacy compatibility shims (so existing `theme.sunset.xxx` lookups keep rendering)
  sunset: { purple: 'var(--rq-accent-active)', pink: 'var(--rq-accent-primary)', gold: 'var(--rq-accent-hover)' },
  gradient: 'linear-gradient(135deg, var(--rq-accent-primary), var(--rq-accent-active))',
  glow: 'none',         // Disable glows
  player:  { primary: 'var(--rq-accent-primary)', hover: 'var(--rq-accent-hover)', secondary: 'var(--rq-accent-active)' },
  gm:      { primary: 'var(--rq-accent-primary)', hover: 'var(--rq-accent-hover)', secondary: 'var(--rq-accent-active)' },
};

/** Common panel style: leather surface + gold 1px outline. */
export const panelStyle = {
  background: theme.bg.surface,
  border: `1px solid ${theme.accent.line}`,
  borderRadius: 0,
  padding: 16,
};

export const buttonStyle = {
  background: 'transparent',
  border: `1px solid ${theme.accent.primary}`,
  borderRadius: 0,
  color: theme.text.primary,
  padding: '8px 14px',
  fontWeight: 600,
  cursor: 'pointer',
};

/**
 * Per-class accent palette - subtle border / icon tint within the red-line theme.
 * Keep saturation low so it never overpowers the primary red outline.
 * `tint` = used as a soft border-shadow / left-border accent
 * `icon` = used for the class crest dot next to character name + section headers
 */
export const CLASS_ACCENTS = {
  Barbarian: { tint: 'rgba(180, 83, 9, 0.35)',  icon: '#B45309', label: 'Barbarian' },
  Bard:      { tint: 'rgba(217, 119, 6, 0.35)', icon: '#D97706', label: 'Bard' },
  Cleric:    { tint: 'rgba(229, 231, 235, 0.45)',icon: '#E5E7EB', label: 'Cleric' },
  Druid:     { tint: 'rgba(22, 101, 52, 0.45)', icon: '#16A34A', label: 'Druid' },
  Fighter:   { tint: 'rgba(100, 116, 139, 0.5)',icon: '#94A3B8', label: 'Fighter' },
  Monk:      { tint: 'rgba(214, 162, 74, 0.4)', icon: '#D6A24A', label: 'Monk' },
  Paladin:   { tint: 'rgba(245, 197, 66, 0.5)', icon: '#F5C542', label: 'Paladin' },
  Ranger:    { tint: 'rgba(22, 101, 52, 0.4)',  icon: '#22C55E', label: 'Ranger' },
  Rogue:     { tint: 'rgba(30, 41, 59, 0.7)',   icon: '#475569', label: 'Rogue' },
  Sorcerer:  { tint: 'rgba(220, 38, 38, 0.35)', icon: '#DC2626', label: 'Sorcerer' },
  Warlock:   { tint: 'rgba(127, 29, 29, 0.45)', icon: '#7F1D1D', label: 'Warlock' },
  Wizard:    { tint: 'rgba(30, 64, 175, 0.45)', icon: '#3B82F6', label: 'Wizard' },
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
