import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Bookmark, MailOpen, Search } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

const rq = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  line: 'rgba(255,255,255,0.16)',
  lineStrong: 'rgba(255,255,255,0.22)',
  accent: '#d00000',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.74)',
  muted: 'rgba(255,255,255,0.62)',
};

export default function CleanLoreTab({ character }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadLore() {
      try {
        setLoading(true);
        const response = await apiClient.get('/player/handouts');
        const allHandouts = Array.isArray(response.data) ? response.data : [];
        const loreEntries = allHandouts.filter(item => String(item.category || '').toLowerCase() === 'lore');
        if (!cancelled) setEntries(loreEntries);
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadLore();
    return () => { cancelled = true; };
  }, [character?.id]);

  const visibleEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter(entry => [entry.title, entry.content, entry.shared_by, entry.sent_at]
      .some(value => String(value || '').toLowerCase().includes(query)));
  }, [entries, searchTerm]);

  const unreadCount = entries.filter(entry => !entry.read).length;
  const savedCount = entries.filter(entry => entry.saved).length;

  const markRead = async (entry) => {
    setExpandedId(prev => (prev === entry.id ? null : entry.id));
    if (entry.read) return;
    try {
      await apiClient.patch(`/player/handouts/${entry.handout_id}/read`);
      setEntries(prev => prev.map(item => item.handout_id === entry.handout_id ? { ...item, read: true } : item));
    } catch {}
  };

  const toggleSaved = async (entry, event) => {
    event.stopPropagation();
    const nextSaved = !entry.saved;
    try {
      await apiClient.patch(`/player/handouts/${entry.handout_id}/saved`, { saved: nextSaved });
      setEntries(prev => prev.map(item => item.handout_id === entry.handout_id ? { ...item, saved: nextSaved } : item));
    } catch {}
  };

  if (loading) {
    return <section style={loadingStyle}>Loading known lore...</section>;
  }

  return (
    <section style={shellStyle}>
      <header style={headerStyle}>
        <div style={iconTileStyle}><BookOpen size={24} /></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={eyebrowStyle}>Known information</p>
          <h2 style={titleStyle}>Lore</h2>
          <p style={subtitleStyle}>World lore, secrets, rumours, histories, and reveals your GM has chosen for you to know.</p>
        </div>
      </header>

      <section style={statsStyle}>
        <Stat label="Known lore" value={entries.length} />
        <Stat label="Unread" value={unreadCount} />
        <Stat label="Saved" value={savedCount} />
      </section>

      <div style={searchWrapStyle}>
        <Search size={17} style={searchIconStyle} />
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search your known lore..."
          style={searchInputStyle}
        />
      </div>

      {entries.length === 0 ? (
        <section style={emptyStyle}>
          <BookOpen size={42} />
          <h3>No lore revealed yet</h3>
          <p>When your GM marks that your character knows a lore entry, it will appear here.</p>
        </section>
      ) : visibleEntries.length === 0 ? (
        <section style={emptyStyle}>
          <Search size={38} />
          <h3>No matching lore</h3>
          <p>Clear the search to see all revealed lore.</p>
        </section>
      ) : (
        <div style={listStyle}>
          {visibleEntries.map(entry => (
            <LoreCard
              key={entry.id || entry.handout_id}
              entry={entry}
              expanded={expandedId === entry.id}
              onOpen={() => markRead(entry)}
              onToggleSaved={toggleSaved}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }) {
  return <div style={statStyle}><strong>{value}</strong><span>{label}</span></div>;
}

function LoreCard({ entry, expanded, onOpen, onToggleSaved }) {
  return (
    <article onClick={onOpen} style={cardStyle(!entry.read)}>
      <div style={cardTopStyle}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={cardTitleStyle}>{entry.title || 'Untitled Lore'}</h3>
          <p style={cardMetaStyle}>{entry.shared_by ? `Shared by ${entry.shared_by}` : 'GM revealed lore'}{entry.sent_at ? ` • ${new Date(entry.sent_at).toLocaleDateString()}` : ''}</p>
        </div>
        <div style={badgesStyle}>
          {!entry.read && <span style={newBadgeStyle}>New</span>}
          {entry.saved && <Bookmark size={15} style={{ color: '#ffffff', fill: '#ffffff' }} />}
          <MailOpen size={16} />
        </div>
      </div>
      {expanded && (
        <div style={contentStyle}>
          <p>{entry.content || 'No extra detail provided.'}</p>
          <button type="button" onClick={(event) => onToggleSaved(entry, event)} style={saveButtonStyle(entry.saved)}>
            <Bookmark size={14} /> {entry.saved ? 'Saved' : 'Save lore'}
          </button>
        </div>
      )}
    </article>
  );
}

const shellStyle = { display: 'grid', gap: 16, fontFamily: fontStack };
const loadingStyle = { minHeight: 180, display: 'grid', placeItems: 'center', color: rq.soft, background: rq.panel, border: `1px solid ${rq.line}`, fontFamily: fontStack };
const headerStyle = { display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16, background: rq.card, border: `1px solid ${rq.line}` };
const iconTileStyle = { width: 48, height: 48, display: 'grid', placeItems: 'center', background: rq.bg, color: rq.text, borderLeft: `6px solid ${rq.accent}`, flex: '0 0 auto' };
const eyebrowStyle = { margin: '0 0 5px', color: rq.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.1em' };
const titleStyle = { margin: 0, color: rq.text, fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 950, letterSpacing: '-0.04em', lineHeight: 1.02 };
const subtitleStyle = { margin: '7px 0 0', color: rq.soft, fontSize: 14, lineHeight: 1.45, maxWidth: 760 };
const statsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', borderTop: `1px solid ${rq.line}`, borderBottom: `1px solid ${rq.line}` };
const statStyle = { minHeight: 62, padding: '10px 12px', display: 'grid', alignContent: 'center', gap: 3, borderRight: `1px solid ${rq.line}`, color: rq.text };
const searchWrapStyle = { position: 'relative' };
const searchIconStyle = { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: rq.muted, zIndex: 1 };
const searchInputStyle = { width: '100%', minHeight: 44, background: rq.panel, border: `1px solid ${rq.lineStrong}`, color: rq.text, padding: '0 12px 0 40px', fontFamily: fontStack, outline: 'none', colorScheme: 'dark' };
const listStyle = { display: 'grid', gap: 10 };
const cardStyle = (unread) => ({ background: rq.card, border: `1px solid ${rq.line}`, borderLeft: `6px solid ${unread ? rq.accent : rq.lineStrong}`, padding: 14, color: rq.text, cursor: 'pointer' });
const cardTopStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 };
const cardTitleStyle = { margin: 0, color: rq.text, fontSize: 18, fontWeight: 950 };
const cardMetaStyle = { margin: '5px 0 0', color: rq.muted, fontSize: 12 };
const badgesStyle = { display: 'flex', gap: 7, alignItems: 'center', color: rq.text };
const newBadgeStyle = { background: rq.accent, color: rq.text, padding: '3px 7px', fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const contentStyle = { marginTop: 12, paddingTop: 12, borderTop: `1px solid ${rq.line}`, display: 'grid', gap: 12, color: rq.soft, lineHeight: 1.55, whiteSpace: 'pre-wrap' };
const saveButtonStyle = (saved) => ({ justifySelf: 'start', minHeight: 34, border: 0, background: saved ? rq.accent : rq.panel, color: rq.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack });
const emptyStyle = { display: 'grid', justifyItems: 'center', gap: 9, textAlign: 'center', background: rq.panel, border: `1px dashed ${rq.lineStrong}`, padding: 36, color: rq.muted };
