/**
 * ROOK — Shared design theme.
 * Block A design reset: dark navy background + gold outlines. No gradients, no glow.
 * Import via:  import { theme } from '@/lib/theme';
 */

export const theme = {
  // Backgrounds
  bg: {
    primary: '#1F1F23',     // main dark grey page bg
    surface: '#27272B',     // panel/card bg (slightly lighter)
    elevated: '#323235',    // hover / elevated panel
    deep: '#0B0B0C',        // deepest (modal backdrop)
    panel: '#27272B'
  },
  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#D1D5DB',
    muted: '#9CA3AF',
    accent: '#EF4444'
  },
  // Accents — gold-only palette
  accent: {
    primary: '#EF4444',     // main red accent
    hover: '#F87171',       // lighter red hover
    soft: 'rgba(239,68,68,0.12)',
    line: 'rgba(239,68,68,0.28)',
    secondary: '#B91C1C',
    highlight: '#F87171',
    pink: '#EF4444'
  },
  // Border uses soft red tint
  border: 'rgba(239,68,68,0.18)',
  borderActive: '#EF4444',
  // State colors (kept meaningful)
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  // Legacy compatibility shims (so existing `theme.sunset.xxx` lookups don't explode)
  sunset: { purple: '#D4A017', pink: '#D4A017', gold: '#D4A017' },
  gradient: '#EF4444',
  glow: 'none',         // Disable glows
  player:  { primary: '#EF4444', hover: '#F87171', secondary: '#B91C1C' },
  gm:      { primary: '#EF4444', hover: '#F87171', secondary: '#B91C1C' },
};

/** Common panel style: navy surface + gold 1px outline. */
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
 * Per-class accent palette — subtle border / icon tint within the Navy/Gold theme.
 * Keep saturation LOW so it never overpowers the gold outline.
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
