import React from 'react';
import { Copy, KeyRound, RefreshCw } from 'lucide-react';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

const theme = {
  bg: 'var(--rq-bg-panel, #21150e)',
  panel: 'rgba(18, 12, 8, 0.58)',
  card: 'var(--rq-button, #2e1d13)',
  line: 'var(--rq-line, rgba(255,248,239,0.16))',
  lineStrong: 'var(--rq-line-strong, rgba(255,248,239,0.24))',
  primary: 'var(--rq-primary, #c08a3d)',
  primaryHover: 'var(--rq-primary-hover, #e0b15c)',
  text: 'var(--rq-text, #f5e6c8)',
  soft: 'var(--rq-muted, rgba(255,248,239,0.74))',
  muted: 'rgba(255,248,239,0.58)',
  gradient: 'var(--rq-sunset-gradient, linear-gradient(135deg, #a45a32, #c08a3d, #e0b15c))',
};

export default function CampaignJoinCodeCard({
  code = '',
  loading = false,
  rotating = false,
  copying = false,
  title = 'Campaign join code',
  description = 'Share this 6-character code with players so they can join the campaign and link a character.',
  uses = null,
  createdAt = '',
  onFetch,
  onRotate,
  onCopy,
  fetchLabel = 'Get Code',
  rotateLabel = 'Rotate',
  copyLabel = 'Copy',
  compact = false,
}) {
  const safeCode = code || '';
  const disabled = loading || rotating;
  const copyDisabled = !safeCode || disabled;
  const createdLabel = formatCreatedAt(createdAt);
  const busy = loading || rotating;

  return (
    <section style={cardStyle(compact)} data-testid="campaign-join-code-card" aria-busy={busy ? 'true' : 'false'}>
      <div style={headerStyle}>
        <div style={iconStyle} aria-hidden="true"><KeyRound size={18} /></div>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}>Player access</p>
          <h3 style={titleStyle}>{title}</h3>
          {description && <p style={descriptionStyle}>{description}</p>}
        </div>
      </div>

      <div style={codeRowStyle(compact, loading)} role="status" aria-live="polite">
        <strong style={codeStyle(loading)} aria-label={safeCode ? `Campaign join code ${safeCode}` : 'Campaign join code not loaded'}>
          {loading ? 'Fetching' : safeCode || '------'}
        </strong>
        {loading && <span style={loadingHelperStyle}>Preparing a fresh code for your players…</span>}
        {!loading && (
          <div style={metaStyle}>
            {uses !== null && uses !== undefined && <span>{uses} use{Number(uses) === 1 ? '' : 's'}</span>}
            {createdLabel && <span>Created {createdLabel}</span>}
          </div>
        )}
      </div>

      <div style={buttonRowStyle}>
        {onFetch && (
          <button type="button" onClick={onFetch} disabled={disabled} style={railButtonStyle({ disabled })}>
            <RefreshCw size={14} style={loading ? spinIconStyle : undefined} /> {loading ? 'Loading code…' : fetchLabel}
          </button>
        )}
        {onRotate && (
          <button type="button" onClick={onRotate} disabled={disabled} style={railButtonStyle({ disabled })}>
            <RefreshCw size={14} style={rotating ? spinIconStyle : undefined} /> {rotating ? 'Rotating…' : rotateLabel}
          </button>
        )}
        {onCopy && (
          <button type="button" onClick={onCopy} disabled={copyDisabled} style={railButtonStyle({ accent: true, disabled: copyDisabled })}>
            <Copy size={14} /> {copying ? 'Copied' : copyLabel}
          </button>
        )}
      </div>
      <style>{joinCodeLoadingCss}</style>
    </section>
  );
}

function formatCreatedAt(value) {
  if (!value) return '';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

const cardStyle = (compact) => ({
  display: 'grid',
  gap: compact ? 8 : 12,
  minWidth: compact ? 230 : 280,
  background: theme.bg,
  border: '1px solid transparent',
  borderLeft: `6px solid ${theme.primary}`,
  borderImage: 'none',
  color: theme.text,
  padding: compact ? 12 : 16,
  fontFamily: fontStack,
  boxShadow: '0 18px 42px rgba(0,0,0,0.2)',
});
const headerStyle = { display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr)', gap: 10, alignItems: 'start' };
const iconStyle = { width: 34, height: 34, display: 'grid', placeItems: 'center', background: theme.panel, color: theme.primaryHover, border: `1px solid ${theme.line}` };
const eyebrowStyle = { margin: '0 0 4px', color: theme.muted, fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.1em' };
const titleStyle = { margin: 0, color: theme.text, fontSize: 18, fontWeight: 950, lineHeight: 1.15 };
const descriptionStyle = { margin: '6px 0 0', color: theme.soft, fontSize: 12, lineHeight: 1.4 };
const codeRowStyle = (compact, loading) => ({
  display: 'grid',
  gap: loading ? 6 : 4,
  background: compact ? 'transparent' : theme.panel,
  border: compact ? 0 : `1px solid ${loading ? theme.primary : theme.line}`,
  padding: compact ? 0 : '10px 12px',
  position: 'relative',
  overflow: 'hidden',
});
const codeStyle = (loading) => ({ color: loading ? theme.primaryHover : theme.text, fontSize: loading ? 20 : 30, fontWeight: 950, letterSpacing: loading ? '0.12em' : '0.14em', lineHeight: 1.1, textTransform: loading ? 'uppercase' : 'none' });
const loadingHelperStyle = { color: theme.soft, fontSize: 12, lineHeight: 1.35 };
const metaStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', color: theme.muted, fontSize: 11, lineHeight: 1.3 };
const buttonRowStyle = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const spinIconStyle = { animation: 'rqJoinCodeSpin 0.9s linear infinite' };

const railButtonStyle = ({ accent = false, disabled = false } = {}) => ({
  minHeight: 34,
  border: `1px solid ${accent ? theme.lineStrong : theme.line}`,
  borderLeft: accent ? `4px solid ${theme.primary}` : `1px solid ${theme.line}`,
  borderRadius: 0,
  background: theme.card,
  color: disabled ? theme.muted : theme.text,
  padding: accent ? '0 10px 0 8px' : '0 10px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  fontWeight: accent ? 950 : 900,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: fontStack,
  opacity: disabled ? 0.62 : 1,
});

const joinCodeLoadingCss = `
  @keyframes rqJoinCodeSpin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    [data-testid="campaign-join-code-card"] svg { animation: none !important; }
  }
`;
