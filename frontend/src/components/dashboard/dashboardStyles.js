import { theme } from './dashboardConfig';

const openLine = 'var(--rq-line, rgba(255, 255, 255, 0.16))';
const tabBg = 'var(--rq-tab-bg, #3a3a3a)';
const tabHover = 'var(--rq-tab-hover, #444444)';
const tabActive = 'var(--rq-tab-active, #d00000)';

export const pageStyle = {
  minHeight: '100dvh',
  background: theme.bg,
  color: theme.text,
  padding: 'clamp(10px, 2.5vw, 22px)',
  overflowX: 'hidden',
  overflowY: 'auto'
};

export const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
  background: 'transparent',
  border: 0,
  borderBottom: `1px solid ${openLine}`,
  borderRadius: 0,
  padding: '0 0 12px',
  marginBottom: 12
};

export const eyebrowStyle = {
  color: theme.muted,
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: 1.2,
  fontWeight: 900,
  margin: '0 0 4px'
};

export const titleStyle = {
  color: theme.text,
  fontSize: 'clamp(24px, 6vw, 34px)',
  fontWeight: 400,
  margin: 0,
  lineHeight: 1,
  fontFamily: "var(--rq-title-font, 'Metal Mania', Georgia, serif)",
  letterSpacing: '0.045em',
  WebkitTextStroke: '0.35px var(--rq-bg, #303030)',
  paintOrder: 'stroke fill'
};

export const subtitleStyle = {
  color: theme.textSecondary,
  fontSize: 13,
  lineHeight: 1.35,
  margin: '4px 0 0'
};

export const headerActionsStyle = {
  display: 'flex',
  gap: 7,
  flexWrap: 'wrap',
  alignItems: 'center',
  maxWidth: '100%'
};

export const headerButtonStyle = (disabled) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  minHeight: 36,
  background: 'transparent',
  border: 0,
  borderRadius: 0,
  color: disabled ? theme.muted : theme.text,
  padding: '0 10px',
  fontWeight: 800,
  cursor: disabled ? 'not-allowed' : 'pointer'
});

export const quickGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
  gap: 0,
  marginBottom: 14
};

export const actionCardStyle = (primary, disabled) => ({
  minHeight: 76,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: 'transparent',
  border: 0,
  borderTop: `1px solid ${openLine}`,
  borderRadius: 0,
  color: theme.text,
  padding: '14px 0',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.55 : 1,
  textAlign: 'left',
  maxWidth: '100%'
});

export const actionIconStyle = () => ({
  width: 24,
  height: 24,
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  color: theme.accent,
  border: 0,
  borderRadius: 0
});

export const actionTitleStyle = {
  color: theme.text,
  fontSize: 16,
  fontWeight: 900,
  marginBottom: 3,
  lineHeight: 1.15
};

export const actionTextStyle = {
  color: theme.textSecondary,
  fontSize: 12,
  lineHeight: 1.35,
  marginBottom: 8
};

export const actionMetaStyle = (disabled) => ({
  display: 'inline-flex',
  color: disabled ? theme.muted : theme.accent,
  fontSize: 10,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: 0.8
});

export const summaryGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
  gap: 0,
  marginBottom: 12
};

export const panelStyle = {
  background: 'transparent',
  border: 0,
  borderTop: `1px solid ${openLine}`,
  borderRadius: 0,
  padding: '14px 0'
};

export const panelHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
  marginBottom: 10,
  flexWrap: 'wrap'
};

export const panelTitleStyle = {
  color: theme.text,
  fontSize: 17,
  fontWeight: 900,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  margin: 0,
  lineHeight: 1.1
};

export const smallLinkButtonStyle = {
  background: 'transparent',
  border: 0,
  borderRadius: 0,
  color: theme.text,
  padding: '7px 0',
  cursor: 'pointer',
  fontWeight: 800
};

export const listItemStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  background: 'transparent',
  border: 0,
  borderTop: `1px solid ${openLine}`,
  borderRadius: 0,
  padding: '11px 0',
  cursor: 'pointer',
  textAlign: 'left'
};

export const emptyStyle = {
  background: 'transparent',
  border: 0,
  borderTop: `1px solid ${openLine}`,
  borderRadius: 0,
  padding: '16px 0',
  textAlign: 'left'
};

export const noticeStyle = {
  display: 'flex',
  gap: 9,
  alignItems: 'flex-start',
  background: 'transparent',
  border: 0,
  borderTop: `1px solid ${openLine}`,
  borderRadius: 0,
  padding: '12px 0',
  fontSize: 12,
  lineHeight: 1.4
};

export const mobileTabsStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 0,
  marginBottom: 12,
  position: 'sticky',
  top: 0,
  zIndex: 5,
  background: theme.bg,
  paddingBottom: 8
};

export const mobileTabButtonStyle = (active) => ({
  minHeight: 44,
  background: active ? tabActive : tabBg,
  color: theme.text,
  border: 0,
  borderRadius: 0,
  fontWeight: 900,
  cursor: 'pointer',
  textAlign: 'left',
  padding: '0 12px',
  borderLeft: active ? `5px solid ${tabActive}` : '5px solid transparent'
});

export const mobileSectionStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 0,
  marginBottom: 12
};

export const modalBackdropStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.72)',
  zIndex: 1000,
  display: 'grid',
  placeItems: 'center',
  padding: 14
};

export const modalStyle = {
  width: 'min(760px, 100%)',
  maxHeight: '92dvh',
  overflowY: 'auto',
  background: theme.bg,
  border: 0,
  borderRadius: 0,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 10
};

export const modalTitleStyle = {
  color: theme.text,
  fontSize: 22,
  fontWeight: 900,
  margin: 0
};

export const compactFormGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
  gap: 10
};

export const fieldLabelStyle = {
  color: theme.textSecondary,
  fontSize: 12,
  fontWeight: 900,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  marginTop: 4
};

export const fieldStyle = {
  width: '100%',
  minHeight: 42,
  background: 'transparent',
  color: theme.text,
  border: 0,
  borderBottom: `1px solid ${openLine}`,
  borderRadius: 0,
  padding: '9px 0'
};

export const toggleGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
  gap: 10
};

export const toggleCardStyle = {
  display: 'flex',
  gap: 10,
  alignItems: 'flex-start',
  background: 'transparent',
  border: 0,
  borderTop: `1px solid ${openLine}`,
  borderRadius: 0,
  padding: '11px 0',
  color: theme.textSecondary,
  fontSize: 12
};

export const classGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: 8
};

export const classPillStyle = (active) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: active ? tabActive : 'transparent',
  border: 0,
  borderRadius: 0,
  padding: '8px 10px',
  color: theme.text,
  fontSize: 12,
  cursor: 'pointer'
});

export const modalActionsStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  flexWrap: 'wrap',
  marginTop: 4
};

export const loadingPanelStyle = {
  display: 'grid',
  placeItems: 'center',
  gap: 10,
  background: 'transparent',
  border: 0,
  borderTop: `1px solid ${openLine}`,
  borderRadius: 0,
  padding: 24,
  maxWidth: 520,
  textAlign: 'center'
};
