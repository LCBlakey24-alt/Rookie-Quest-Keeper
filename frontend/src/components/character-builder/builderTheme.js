export const builderTheme = {
  bg: {
    primary: 'var(--rq-bg-main)',
    surface: 'var(--rq-bg-panel)',
    elevated: 'var(--rq-bg-elevated)',
  },
  sunset: {
    purple: 'var(--rq-accent-active)',
    pink: 'var(--rq-accent-primary)',
    gold: 'var(--rq-accent-hover)',
  },
  text: {
    primary: 'var(--rq-text-primary)',
    secondary: 'var(--rq-text-secondary)',
    muted: 'var(--rq-text-muted)',
  },
  border: 'var(--rq-border-default)',
  borderActive: 'var(--rq-accent-primary)',
  accent: {
    primary: 'var(--rq-accent-primary)',
    soft: 'var(--rq-accent-soft)',
    line: 'var(--rq-accent-border)',
  },
  success: 'var(--rq-success)',
};

export const traitChipStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '4px',
  padding: '4px 8px', borderRadius: '6px',
  background: builderTheme.accent.soft, border: `1px solid ${builderTheme.accent.line}`,
  fontSize: '11px', color: builderTheme.text.secondary
};

export const detailHeaderStyle = {
  fontSize: '11px', color: builderTheme.text.muted, marginBottom: '6px',
  letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600
};
