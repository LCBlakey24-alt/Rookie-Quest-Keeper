export const builderTheme = {
  bg: { primary: '#1F1F23', surface: '#27272B', elevated: '#323235' },
  sunset: { purple: '#EF4444', pink: '#EF4444', gold: '#EF4444' },
  text: { primary: '#FFFFFF', secondary: '#D1D5DB', muted: '#9CA3AF' },
  border: 'rgba(239, 68, 68, 0.35)',
  borderActive: '#EF4444',
  accent: { primary: '#EF4444', soft: 'rgba(239, 68, 68, 0.12)', line: 'rgba(239, 68, 68, 0.28)' },
  success: '#10B981'
};

export const traitChipStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '4px',
  padding: '4px 8px', borderRadius: '6px',
  background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)',
  fontSize: '11px', color: builderTheme.text.secondary
};

export const detailHeaderStyle = {
  fontSize: '11px', color: builderTheme.text.muted, marginBottom: '6px',
  letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600
};
