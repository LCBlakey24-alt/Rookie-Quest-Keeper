import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { LATEST_RELEASE_NOTE_ID, RELEASE_NOTES } from '@/components/updates/releaseNotes';
import { ROADMAP_NOTES } from '@/components/updates/roadmapNotes';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "Germania One", Georgia, serif)';
const rq = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  red: '#d00000',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.76)',
  muted: 'rgba(255,255,255,0.58)',
  line: 'rgba(255,255,255,0.16)',
};

const seenKey = 'rqk.updates.latestSeen';

function getSeenId() {
  try { return localStorage.getItem(seenKey) || ''; } catch { return ''; }
}

function setSeenId(id) {
  try { localStorage.setItem(seenKey, id); } catch { /* ignore */ }
}

export default function GlobalUpdatesPanel({ isAuthenticated = false }) {
  const [open, setOpen] = useState(false);
  const [seenId, setSeenIdState] = useState(() => getSeenId());
  const hasUnread = Boolean(LATEST_RELEASE_NOTE_ID && seenId !== LATEST_RELEASE_NOTE_ID);
  const latestNotes = useMemo(() => RELEASE_NOTES.slice(0, 9), []);
  const roadmapNotes = useMemo(() => ROADMAP_NOTES.slice(0, 5), []);

  useEffect(() => {
    if (!isAuthenticated || !hasUnread) return;
    const timer = window.setTimeout(() => setOpen(true), 6500);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, hasUnread]);

  if (!isAuthenticated) return null;

  const markRead = () => {
    setSeenId(LATEST_RELEASE_NOTE_ID);
    setSeenIdState(LATEST_RELEASE_NOTE_ID);
  };

  const close = () => {
    markRead();
    setOpen(false);
  };

  return (
    <div style={wrapStyle} data-testid="global-updates-panel">
      <button type="button" onClick={() => setOpen(prev => !prev)} style={launcherStyle(hasUnread)} aria-label="Open updates panel">
        <Bell size={15} /> Updates {hasUnread && <span style={unreadDotStyle} />}
      </button>
      {open && (
        <section style={panelStyle} role="dialog" aria-modal="false" aria-labelledby="updates-title">
          <header style={headerStyle}>
            <div>
              <p style={eyebrowStyle}>What’s New</p>
              <h2 id="updates-title" style={titleStyle}>Recent Updates</h2>
              <p style={subtitleStyle}>Quick notes so GMs and players know what changed, plus what is planned next.</p>
            </div>
            <button type="button" onClick={close} style={closeButtonStyle} aria-label="Close updates"><X size={18} /></button>
          </header>

          <div style={sectionLabelStyle}>Released</div>
          <div style={listStyle}>
            {latestNotes.map(note => <UpdateNote key={note.id} note={note} />)}
          </div>

          {roadmapNotes.length > 0 && (
            <>
              <div style={sectionLabelStyle}>Planned / Roadmap</div>
              <div style={listStyle}>
                {roadmapNotes.map(note => <UpdateNote key={note.id} note={{ ...note, date: note.status || 'Planned' }} planned />)}
              </div>
            </>
          )}

          <footer style={footerStyle}>
            <button type="button" onClick={markRead} style={secondaryButtonStyle}><Check size={14} /> Mark read</button>
            <button type="button" onClick={close} style={primaryButtonStyle}>Done</button>
          </footer>
        </section>
      )}
    </div>
  );
}

function UpdateNote({ note, planned = false }) {
  return (
    <article style={noteStyle(planned)}>
      <div style={noteTopStyle}>
        <strong style={noteTitleStyle}>{note.title}</strong>
        <span style={audienceStyle}>{note.audience}</span>
      </div>
      <p style={noteSummaryStyle}>{note.summary}</p>
      <div style={tagRowStyle}>
        <span style={dateStyle}>{note.date}</span>
        {(note.tags || []).map(tag => <span key={tag} style={tagStyle}>{tag}</span>)}
      </div>
    </article>
  );
}

const wrapStyle = { position: 'fixed', right: 14, bottom: 14, zIndex: 4400, fontFamily: fontStack };
const launcherStyle = (unread) => ({ minHeight: 36, border: 0, background: unread ? rq.red : rq.card, color: rq.text, padding: '0 11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack, position: 'relative' });
const unreadDotStyle = { position: 'absolute', top: -4, right: -4, width: 11, height: 11, background: '#ffffff', border: `2px solid ${rq.red}` };
const panelStyle = { position: 'absolute', right: 0, bottom: 44, width: 'min(440px, calc(100vw - 28px))', maxHeight: 'min(680px, calc(100dvh - 76px))', overflowY: 'auto', background: rq.panel, color: rq.text, border: `1px solid ${rq.line}`, borderLeft: `7px solid ${rq.red}`, boxShadow: '0 24px 80px rgba(0,0,0,0.55)' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', padding: 14, borderBottom: `1px solid ${rq.line}` };
const eyebrowStyle = { margin: '0 0 4px', color: rq.red, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.12em' };
const titleStyle = { margin: 0, color: rq.text, fontFamily: titleFont, fontSize: 34, lineHeight: 0.95 };
const subtitleStyle = { margin: '7px 0 0', color: rq.soft, fontSize: 13, lineHeight: 1.4 };
const closeButtonStyle = { width: 34, height: 34, display: 'grid', placeItems: 'center', background: rq.card, color: rq.text, border: 0, cursor: 'pointer' };
const sectionLabelStyle = { padding: '10px 12px 0', color: rq.text, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.12em' };
const listStyle = { display: 'grid', gap: 8, padding: 12 };
const noteStyle = (planned) => ({ display: 'grid', gap: 7, background: rq.card, border: `1px solid ${rq.line}`, borderLeft: planned ? `5px solid ${rq.red}` : `1px solid ${rq.line}`, padding: 11 });
const noteTopStyle = { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' };
const noteTitleStyle = { color: rq.text, lineHeight: 1.2, fontSize: 14 };
const audienceStyle = { color: rq.text, background: rq.bg, border: `1px solid ${rq.line}`, padding: '3px 6px', fontSize: 10, fontWeight: 950, whiteSpace: 'nowrap' };
const noteSummaryStyle = { margin: 0, color: rq.soft, lineHeight: 1.42, fontSize: 13 };
const tagRowStyle = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' };
const dateStyle = { color: rq.muted, fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 2 };
const tagStyle = { color: rq.text, background: 'rgba(208,0,0,0.18)', padding: '3px 6px', fontSize: 10, fontWeight: 900 };
const footerStyle = { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: 12, borderTop: `1px solid ${rq.line}` };
const primaryButtonStyle = { minHeight: 36, border: 0, background: rq.red, color: rq.text, padding: '0 11px', fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 36, border: 0, background: rq.card, color: rq.text, padding: '0 11px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
