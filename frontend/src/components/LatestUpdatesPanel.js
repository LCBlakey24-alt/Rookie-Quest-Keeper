import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { getLatestUpdates } from '@/data/latestUpdates';

const theme = {
  panel: 'transparent',
  panelSoft: 'transparent',
  border: 'rgba(216, 173, 79, 0.16)',
  borderStrong: 'rgba(216, 173, 79, 0.30)',
  accent: 'var(--rq-accent-primary, #D8AD4F)',
  accentHover: 'var(--rq-accent-hover, #E6C775)',
  text: 'var(--rq-text-primary, #F6EAD2)',
  textSecondary: 'var(--rq-text-secondary, #D9C8A5)',
  muted: 'var(--rq-text-muted, #AAA6C8)',
};

export default function LatestUpdatesPanel({ limit = 5, publicOnly = false, compact = false }) {
  const updates = getLatestUpdates({ limit, publicOnly });
  const isSmallScreen = typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches;
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
    <section data-testid="latest-updates-panel" style={panelStyle(compact, collapsed, isSmallScreen)}>
      <header style={headerStyle(collapsed, isSmallScreen)}>
        <div style={titleWrapStyle}>
          <Sparkles size={isSmallScreen ? 15 : 18} color={theme.accentHover} />
          <div style={{ minWidth: 0 }}>
            <p style={eyebrowStyle}>Latest Updates</p>
            <h2 style={titleStyle}>{collapsed ? latest.title : 'What’s new'}</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(prev => !prev)}
          style={toggleButtonStyle(isSmallScreen)}
          aria-expanded={!collapsed}
          aria-controls="latest-updates-timeline"
        >
          {isSmallScreen ? (collapsed ? 'Open' : 'Hide') : (collapsed ? 'Open timeline' : 'Collapse')}
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

const panelStyle = (compact, collapsed, isSmallScreen) => ({
  background: 'transparent',
  border: 0,
  borderTop: `1px solid ${theme.border}`,
  borderRadius: 0,
  padding: isSmallScreen ? '12px 0' : compact ? '14px 0' : '16px 0',
  margin: compact ? '16px auto' : isSmallScreen ? '0 0 10px' : '0 0 14px',
  maxWidth: compact ? 1180 : '100%',
  color: theme.text,
  boxShadow: 'none',
  overflow: 'hidden',
});

const headerStyle = (collapsed, isSmallScreen) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: isSmallScreen ? 8 : 12, flexWrap: 'nowrap', marginBottom: collapsed ? 0 : 12 });
const titleWrapStyle = { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 };
const eyebrowStyle = { color: theme.accentHover, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.1, fontWeight: 900, margin: '0 0 2px' };
const titleStyle = { color: theme.text, fontSize: 'clamp(14px, 4vw, 20px)', fontWeight: 900, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.12 };
const toggleButtonStyle = (isSmallScreen) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, border: `1px solid ${theme.borderStrong}`, borderRadius: 0, background: 'transparent', color: theme.accentHover, padding: isSmallScreen ? '6px 8px' : '7px 10px', fontSize: 10, fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.6 });
const collapsedSummaryStyle = { color: theme.textSecondary, fontSize: 12, lineHeight: 1.35, margin: '7px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' };
const timelineStyle = { display: 'grid', gap: 0 };
const timelineItemStyle = { display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: 8, position: 'relative' };
const timelineRailStyle = { position: 'relative', display: 'grid', justifyItems: 'center' };
const timelineDotStyle = (featured) => ({ width: featured ? 12 : 9, height: featured ? 12 : 9, marginTop: 16, borderRadius: 0, border: `2px solid ${theme.accentHover}`, background: featured ? theme.accent : 'transparent', boxShadow: 'none', zIndex: 1 });
const timelineLineStyle = { position: 'absolute', top: 30, bottom: -6, width: 1, background: theme.border };
const updateStyle = () => ({ background: 'transparent', border: 0, borderTop: `1px solid ${theme.border}`, borderRadius: 0, padding: '11px 0', minWidth: 0, marginBottom: 0 });
const updateToplineStyle = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 };
const badgeStyle = () => ({ color: theme.accentHover, background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: 0, padding: '3px 6px', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.6 });
const categoryStyle = { color: theme.accentHover, fontSize: 10, fontWeight: 900 };
const dateStyle = { color: theme.muted, fontSize: 10, fontWeight: 800 };
const updateTitleStyle = { color: theme.text, fontSize: 14, fontWeight: 900, margin: '0 0 5px' };
const summaryStyle = { color: theme.textSecondary, fontSize: 12, lineHeight: 1.4, margin: 0 };
const detailsButtonStyle = { marginTop: 9, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${theme.borderStrong}`, borderRadius: 0, color: theme.accentHover, padding: '6px 10px', fontSize: 11, fontWeight: 900, cursor: 'pointer' };
const detailsListStyle = { margin: '9px 0 0', paddingLeft: 18, color: theme.textSecondary, fontSize: 12, lineHeight: 1.45 };
