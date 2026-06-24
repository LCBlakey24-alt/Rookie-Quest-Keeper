import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
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

export default function LatestUpdatesPanel({ limit = 5, publicOnly = false, compact = false }) {
  const updates = getLatestUpdates({ limit, publicOnly });
  const defaultCollapsed = useMemo(() => {
    if (compact) return true;
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 760px)').matches;
  }, [compact]);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  if (!updates.length) return null;

  const latest = updates[0];
  const toggleDetails = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section data-testid="latest-updates-panel" style={panelStyle(compact, collapsed)}>
      <header style={headerStyle(collapsed)}>
        <div style={titleWrapStyle}>
          <Sparkles size={18} color={theme.accentHover} />
          <div style={{ minWidth: 0 }}>
            <p style={eyebrowStyle}>Latest Updates</p>
            <h2 style={titleStyle}>{collapsed ? latest.title : 'What’s new'}</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(prev => !prev)}
          style={toggleButtonStyle}
          aria-expanded={!collapsed}
          aria-controls="latest-updates-timeline"
        >
          {collapsed ? 'Open timeline' : 'Collapse'}
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </header>

      {collapsed ? (
        <p style={collapsedSummaryStyle}>{formatDate(latest.date)} · {latest.summary}</p>
      ) : (
        <div id="latest-updates-timeline" style={timelineStyle}>
          {updates.map((update, index) => {
            const isExpanded = expandedIds.has(update.id);
            const hasDetails = Array.isArray(update.details) && update.details.length > 0;
            return (
              <article key={update.id} style={timelineItemStyle}>
                <div style={timelineRailStyle}>
                  <span style={timelineDotStyle(index === 0)} />
                  {index !== updates.length - 1 && <span style={timelineLineStyle} />}
                </div>
                <div style={updateStyle(index === 0)}>
                  <div style={updateToplineStyle}>
                    <span style={badgeStyle(update.badge)}>{update.badge}</span>
                    <span style={categoryStyle}>{update.category}</span>
                    <time style={dateStyle} dateTime={update.date}>{formatDate(update.date)}</time>
                  </div>
                  <h3 style={updateTitleStyle}>{update.title}</h3>
                  <p style={summaryStyle}>{update.summary}</p>

                  {hasDetails && (
                    <>
                      <button type="button" onClick={() => toggleDetails(update.id)} style={detailsButtonStyle}>
                        {isExpanded ? 'Hide details' : 'Read more'}
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {isExpanded && (
                        <ul style={detailsListStyle}>
                          {update.details.map(detail => <li key={detail}>{detail}</li>)}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
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

const panelStyle = (compact, collapsed) => ({
  background: theme.panel,
  border: `1px solid ${theme.border}`,
  borderRadius: collapsed ? 999 : 14,
  padding: collapsed ? '10px 12px' : compact ? 16 : 18,
  margin: compact ? '18px auto' : '0 0 16px',
  maxWidth: compact ? 1180 : '100%',
  color: theme.text,
  boxShadow: '0 18px 50px rgba(0,0,0,0.24)',
});

const headerStyle = (collapsed) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: collapsed ? 'nowrap' : 'wrap',
  marginBottom: collapsed ? 0 : 12,
});

const titleWrapStyle = { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 };
const eyebrowStyle = { color: theme.accentHover, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 900, margin: '0 0 3px' };
const titleStyle = { color: theme.text, fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 900, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const toggleButtonStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, border: `1px solid ${theme.border}`, borderRadius: 999, background: 'var(--rq-accent-soft, rgba(192, 138, 61, 0.14))', color: theme.accentHover, padding: '7px 10px', fontSize: 11, fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.7 };
const collapsedSummaryStyle = { color: theme.textSecondary, fontSize: 12, lineHeight: 1.45, margin: '8px 4px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' };
const timelineStyle = { display: 'grid', gap: 0 };
const timelineItemStyle = { display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr)', gap: 10, position: 'relative' };
const timelineRailStyle = { position: 'relative', display: 'grid', justifyItems: 'center' };
const timelineDotStyle = (featured) => ({ width: featured ? 13 : 10, height: featured ? 13 : 10, marginTop: 18, borderRadius: 999, border: `2px solid ${theme.accentHover}`, background: featured ? theme.accent : theme.panelSoft, boxShadow: featured ? '0 0 18px rgba(224,180,111,0.45)' : 'none', zIndex: 1 });
const timelineLineStyle = { position: 'absolute', top: 32, bottom: -6, width: 2, background: 'var(--rq-border-muted, rgba(255,248,236,0.12))' };
const updateStyle = (featured) => ({ background: theme.panelSoft, border: `1px solid ${featured ? theme.border : 'var(--rq-border-muted, rgba(255,248,236,0.08))'}`, borderRadius: 12, padding: 13, minWidth: 0, marginBottom: 10 });
const updateToplineStyle = { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 8 };
const badgeStyle = (badge) => ({ color: badge === 'Complete' ? 'var(--rq-success-text, #BBF7D0)' : 'var(--rq-text-on-accent, #2A160F)', background: badge === 'Fixed' ? 'var(--rq-success, #0F766E)' : badge === 'Complete' ? 'var(--rq-success-soft, rgba(34,197,94,0.18))' : theme.accent, border: '1px solid var(--rq-border-subtle, rgba(255,248,236,0.14))', borderRadius: 999, padding: '3px 8px', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7 });
const categoryStyle = { color: theme.accentHover, fontSize: 11, fontWeight: 900 };
const dateStyle = { color: theme.muted, fontSize: 11, fontWeight: 800 };
const updateTitleStyle = { color: theme.text, fontSize: 15, fontWeight: 900, margin: '0 0 6px' };
const summaryStyle = { color: theme.textSecondary, fontSize: 13, lineHeight: 1.5, margin: 0 };
const detailsButtonStyle = { marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: 999, color: theme.accentHover, padding: '6px 10px', fontSize: 11, fontWeight: 900, cursor: 'pointer' };
const detailsListStyle = { margin: '10px 0 0', paddingLeft: 18, color: theme.textSecondary, fontSize: 12, lineHeight: 1.55 };
