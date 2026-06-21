import React from 'react';
import { Sparkles } from 'lucide-react';
import { getLatestUpdates } from '@/data/latestUpdates';

const theme = {
  panel: 'var(--rq-bg-card, rgba(36, 24, 21, 0.96))',
  panelSoft: 'var(--rq-bg-elevated, rgba(48, 32, 27, 0.72))',
  border: 'var(--rq-border-default, rgba(192, 138, 61, 0.26))',
  accent: 'var(--rq-accent-primary, #C08A3D)',
  accentHover: 'var(--rq-accent-hover, #E0B46F)',
  text: 'var(--rq-text-primary, #FFF8EC)',
  textSecondary: 'var(--rq-text-secondary, #E5D3B7)',
  muted: 'var(--rq-text-muted, #BFA98C)',
};

export default function LatestUpdatesPanel({ limit = 3, publicOnly = false, compact = false }) {
  const updates = getLatestUpdates({ limit, publicOnly });

  if (!updates.length) return null;

  return (
    <section data-testid="latest-updates-panel" style={panelStyle(compact)}>
      <header style={headerStyle}>
        <div style={titleWrapStyle}>
          <Sparkles size={18} color={theme.accentHover} />
          <div>
            <p style={eyebrowStyle}>Latest Updates</p>
            <h2 style={titleStyle}>What’s new in ROOK</h2>
          </div>
        </div>
        <span style={countPillStyle}>{updates.length} update{updates.length === 1 ? '' : 's'}</span>
      </header>

      <div style={listStyle}>
        {updates.map(update => (
          <article key={update.id} style={updateStyle}>
            <div style={updateToplineStyle}>
              <span style={badgeStyle(update.badge)}>{update.badge}</span>
              <span style={categoryStyle}>{update.category}</span>
              <time style={dateStyle} dateTime={update.date}>{formatDate(update.date)}</time>
            </div>
            <h3 style={updateTitleStyle}>{update.title}</h3>
            <p style={summaryStyle}>{update.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatDate(date) {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));
  } catch {
    return date;
  }
}

const panelStyle = (compact) => ({
  background: theme.panel,
  border: `1px solid ${theme.border}`,
  borderRadius: 12,
  padding: compact ? 16 : 18,
  margin: compact ? '18px auto' : '0 0 16px',
  maxWidth: compact ? 1180 : '100%',
  color: theme.text,
  boxShadow: '0 18px 50px rgba(0,0,0,0.24)',
});

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  marginBottom: 12,
};

const titleWrapStyle = { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 };
const eyebrowStyle = { color: theme.accentHover, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 900, margin: '0 0 3px' };
const titleStyle = { color: theme.text, fontSize: 'clamp(18px, 2vw, 22px)', fontWeight: 900, margin: 0 };
const countPillStyle = { color: theme.accentHover, background: 'var(--rq-accent-soft, rgba(192, 138, 61, 0.14))', border: `1px solid ${theme.border}`, borderRadius: 999, padding: '6px 10px', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7 };
const listStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 10 };
const updateStyle = { background: theme.panelSoft, border: '1px solid var(--rq-border-muted, rgba(255,248,236,0.08))', borderRadius: 10, padding: 13, minWidth: 0 };
const updateToplineStyle = { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 8 };
const badgeStyle = (badge) => ({ color: badge === 'Complete' ? 'var(--rq-success-text, #BBF7D0)' : 'var(--rq-text-on-accent, #2A160F)', background: badge === 'Fixed' ? 'var(--rq-success, #0F766E)' : badge === 'Complete' ? 'var(--rq-success-soft, rgba(34,197,94,0.18))' : theme.accent, border: '1px solid var(--rq-border-subtle, rgba(255,248,236,0.14))', borderRadius: 999, padding: '3px 8px', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7 });
const categoryStyle = { color: theme.accentHover, fontSize: 11, fontWeight: 900 };
const dateStyle = { color: theme.muted, fontSize: 11, fontWeight: 800 };
const updateTitleStyle = { color: theme.text, fontSize: 15, fontWeight: 900, margin: '0 0 6px' };
const summaryStyle = { color: theme.textSecondary, fontSize: 13, lineHeight: 1.5, margin: 0 };
