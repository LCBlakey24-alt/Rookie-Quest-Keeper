/**
 * Rookie Quest Keeper shared presentation tokens.
 * Deep navy surfaces, warm cream hierarchy, antique-gold actions and restrained
 * blue support. Status colours keep semantic meaning instead of doubling as brand decoration.
 */

export const theme = {
  bg: {
    primary: 'var(--rq-bg-main, #071522)',
    surface: 'var(--rq-bg-panel, #0C2234)',
    elevated: 'var(--rq-card-hover, #17364F)',
    deep: 'var(--rq-bg-rail, #050E18)',
    panel: 'var(--rq-bg-panel, #0C2234)',
    card: 'var(--rq-bg-panel-alt, #112A40)',
  },
  text: {
    primary: 'var(--rq-text-primary, #F7F1E7)',
    secondary: 'var(--rq-text-secondary, rgba(247,241,231,0.78))',
    muted: 'var(--rq-text-muted, rgba(247,241,231,0.60))',
    accent: 'var(--rq-accent-hover, #E8C56E)',
  },
  accent: {
    primary: 'var(--rq-accent-primary, #D6A84F)',
    hover: 'var(--rq-accent-hover, #E8C56E)',
    soft: 'var(--rq-accent-soft, rgba(214,168,79,0.12))',
    line: 'var(--rq-accent-border, rgba(214,168,79,0.30))',
    secondary: 'var(--rq-secondary, #79BCE8)',
    highlight: 'var(--rq-secondary, #79BCE8)',
    // Legacy property name retained for older components.
    pink: 'var(--rq-accent-primary, #D6A84F)',
  },
  border: 'var(--rq-border-default, rgba(166,193,216,0.14))',
  borderActive: 'var(--rq-accent-primary, #D6A84F)',
  success: 'var(--rq-success, #59B982)',
  danger: 'var(--rq-danger, #D85C61)',
  warning: 'var(--rq-warning, #E3A746)',
  info: 'var(--rq-info, #79BCE8)',

  // Compatibility aliases deliberately resolve to the current flat system.
  sunset: {
    purple: 'var(--rq-secondary, #79BCE8)',
    pink: 'var(--rq-accent-primary, #D6A84F)',
    gold: 'var(--rq-accent-primary, #D6A84F)',
  },
  gradient: 'var(--rq-accent-primary, #D6A84F)',
  glow: 'none',
  player: {
    primary: 'var(--rq-secondary, #79BCE8)',
    hover: 'var(--rq-accent-hover, #E8C56E)',
    secondary: 'var(--rq-secondary, #79BCE8)',
  },
  gm: {
    primary: 'var(--rq-accent-primary, #D6A84F)',
    hover: 'var(--rq-accent-hover, #E8C56E)',
    secondary: 'var(--rq-secondary, #79BCE8)',
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

const BLUE = { tint: 'rgba(121,188,232,0.18)', icon: '#79BCE8' };
const GOLD = { tint: 'rgba(214,168,79,0.18)', icon: '#D6A84F' };

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
