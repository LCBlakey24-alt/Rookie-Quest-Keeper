import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Copy, Save, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { buildTextHandoutPayload } from '@/components/gm/UploadTabUtils';
import TiaKartaNpcRosterPanel from '@/components/gm/TiaKartaNpcRosterPanel';
import TiaKartaSessionTwoPackPanel from '@/components/gm/TiaKartaSessionTwoPackPanel';
import { getTiaKartaEntriesForDestination, tiaKartaDashboardDestinations } from '@/data/tiaKartaCampaignPack';

const rq = {
  card: 'var(--rq-bg-elevated, #323232)',
  panel: 'var(--rq-bg-panel, #242424)',
  border: 'var(--rq-accent-border, rgba(193,18,31,0.35))',
  accent: 'var(--rq-accent-primary, #C1121F)',
  accentSoft: 'var(--rq-accent-soft, rgba(193,18,31,0.12))',
  text: 'var(--rq-text-primary, #fff)',
  secondary: 'var(--rq-text-secondary, #d6d6d6)',
  muted: 'var(--rq-text-muted, #a0a0a0)',
};

export default function TiaKartaCampaignPackPanel({ campaignId, destination, compact = true }) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [openEntries, setOpenEntries] = useState({});

  const entries = useMemo(() => getTiaKartaEntriesForDestination(destination), [destination]);
  const filteredEntries = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter(entry => [
      entry.title,
      entry.category,
      entry.playerSummary,
      entry.gmSecrets,
      ...(entry.names || []),
      ...(entry.locations || []),
      ...(entry.hooks || []),
      entry.tbd,
    ].join(' ').toLowerCase().includes(term));
  }, [entries, query]);

  if (!entries.length && destination !== 'npcs') return null;

  const copyEntry = async (entry) => {
    try {
      await navigator.clipboard.writeText(formatEntry(entry));
      toast.success(`${entry.title} copied`);
    } catch {
      toast.info('Copy failed on this device. You can select the text manually.');
    }
  };

  const saveEntry = async (entry) => {
    if (!campaignId) {
      toast.error('Open a campaign before saving this lore.');
      return;
    }
    try {
      setSavingId(entry.id);
      await apiClient.post(`/campaigns/${campaignId}/handouts`, buildTextHandoutPayload({
        title: `Tia Karta — ${entry.title}`,
        content: formatEntry(entry),
      }));
      toast.success(`${entry.title} saved to Secrets & Handouts`);
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || `Could not save ${entry.title}`);
    } finally {
      setSavingId('');
    }
  };

  const shownEntries = expanded || !compact ? filteredEntries : filteredEntries.slice(0, 3);
  const destinationLabel = tiaKartaDashboardDestinations[destination] || destination;

  return (
    <>
      <TiaKartaSessionTwoPackPanel campaignId={campaignId} destination={destination} />
      <section className="tia-karta-lore-panel" style={panelStyle} data-testid={`tia-karta-pack-${destination}`}>
        <div style={headerStyle}>
          <div style={{ minWidth: 0 }}>
            <p style={eyebrowStyle}><Sparkles size={13} /> Tia Karta campaign material</p>
            <h3 style={titleStyle}>{destinationLabel}</h3>
            <p style={helperStyle}>Coded-in campaign notes that belong in this existing GM tab. Save any entry to Secrets & Handouts when you want a persistent draft.</p>
          </div>
          <button type="button" onClick={() => setExpanded(prev => !prev)} style={toggleStyle}>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {expanded ? 'Show less' : `Show all ${filteredEntries.length}`}
          </button>
        </div>

        <label style={searchStyle}>
          <Search size={14} />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search this tab’s Tia Karta notes..."
            style={searchInputStyle}
          />
        </label>

        <div style={gridStyle}>
          {shownEntries.map(entry => {
            const isOpen = Boolean(openEntries[entry.id]);
            return (
              <article key={entry.id} className="tia-lore-card" data-open={isOpen ? 'true' : 'false'} style={entryStyle}>
                <button type="button" className="tia-lore-card-toggle" onClick={() => setOpenEntries(prev => ({ ...prev, [entry.id]: !prev[entry.id] }))} aria-expanded={isOpen ? 'true' : 'false'}>
                  <span style={entryTopStyle}>
                    <BookOpen size={16} />
                    <span style={{ minWidth: 0 }}>
                      <strong style={entryTitleStyle}>{entry.title}</strong>
                      <span style={categoryStyle}>{entry.category}</span>
                    </span>
                  </span>
                  <span className="tia-lore-mobile-open">{isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
                </button>
                <div className="tia-lore-card-details">
                  <p style={textStyle}>{entry.playerSummary}</p>
                  {entry.gmSecrets && <p style={secretStyle}><strong>GM secret:</strong> {entry.gmSecrets}</p>}
                  {!!entry.names?.length && <Meta label="Names" values={entry.names} />}
                  {!!entry.locations?.length && <Meta label="Locations" values={entry.locations} />}
                  {!!entry.hooks?.length && <Meta label="Hooks" values={entry.hooks} />}
                  {entry.tbd && <p style={tbdStyle}><strong>TBD:</strong> {entry.tbd}</p>}
                  <div style={actionsStyle}>
                    <button type="button" onClick={() => copyEntry(entry)} style={secondaryButtonStyle}><Copy size={14} /> Copy</button>
                    <button type="button" onClick={() => saveEntry(entry)} disabled={savingId === entry.id} style={primaryButtonStyle}><Save size={14} /> {savingId === entry.id ? 'Saving...' : 'Save'}</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <style>{tileLoreCss}</style>
      </section>
      {destination === 'npcs' && <TiaKartaNpcRosterPanel campaignId={campaignId} />}
    </>
  );
}

function Meta({ label, values }) {
  return <p style={metaStyle}><strong>{label}:</strong> {values.join(', ')}</p>;
}

function formatEntry(entry) {
  return [
    entry.title,
    `Category: ${entry.category}`,
    `Dashboard destination: ${tiaKartaDashboardDestinations[entry.destination] || entry.destination}`,
    '',
    `Player-facing summary:\n${entry.playerSummary}`,
    entry.gmSecrets ? `\nGM-only secrets:\n${entry.gmSecrets}` : '',
    entry.names?.length ? `\nImportant names:\n${entry.names.join(', ')}` : '',
    entry.locations?.length ? `\nImportant locations:\n${entry.locations.join(', ')}` : '',
    entry.hooks?.length ? `\nAdventure hooks:\n${entry.hooks.join('\n- ')}` : '',
    entry.tbd ? `\nTBD:\n${entry.tbd}` : '',
  ].filter(Boolean).join('\n');
}

const panelStyle = { display: 'grid', gap: 12, padding: 14, marginBottom: 16, background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.text };
const headerStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' };
const eyebrowStyle = { margin: '0 0 6px', color: rq.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6 };
const titleStyle = { margin: 0, fontSize: 20, color: rq.text, fontWeight: 950 };
const helperStyle = { margin: '6px 0 0', color: rq.secondary, fontSize: 13, lineHeight: 1.45, maxWidth: 840 };
const toggleStyle = { minHeight: 36, border: `1px solid ${rq.border}`, background: rq.card, color: rq.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 900 };
const searchStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', background: rq.panel, border: `1px solid ${rq.border}` };
const searchInputStyle = { flex: 1, border: 0, outline: 0, background: 'transparent', color: rq.text, minWidth: 120 };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 };
const entryStyle = { display: 'grid', gap: 0, background: rq.panel, border: `1px solid ${rq.border}`, padding: 0, minWidth: 0 };
const entryTopStyle = { display: 'flex', gap: 8, alignItems: 'flex-start', minWidth: 0 };
const entryTitleStyle = { display: 'block', color: rq.text, fontSize: 15, lineHeight: 1.25, textAlign: 'left' };
const categoryStyle = { display: 'block', color: rq.muted, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 3, textAlign: 'left' };
const textStyle = { color: rq.secondary, lineHeight: 1.45, fontSize: 13, margin: 0 };
const secretStyle = { color: '#FDE68A', lineHeight: 1.45, fontSize: 13, margin: 0 };
const metaStyle = { color: rq.muted, lineHeight: 1.4, fontSize: 12, margin: 0 };
const tbdStyle = { color: '#FCA5A5', lineHeight: 1.4, fontSize: 12, margin: 0 };
const actionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 };
const primaryButtonStyle = { minHeight: 34, border: 0, background: rq.accent, color: '#fff', padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer' };
const secondaryButtonStyle = { minHeight: 34, border: `1px solid ${rq.border}`, background: rq.card, color: '#fff', padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer' };

const tileLoreCss = `
  .tia-lore-card-toggle {
    border: 0;
    background: transparent;
    color: inherit;
    padding: 12px;
    margin: 0;
    width: 100%;
    min-height: 72px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    cursor: pointer;
    font: inherit;
  }
  .tia-lore-mobile-open {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex: 0 0 auto;
    background: ${rq.card};
    border: 1px solid ${rq.border};
    color: ${rq.text};
  }
  .tia-lore-card-details {
    display: none;
    gap: 9px;
    padding: 0 12px 12px;
    border-top: 1px solid ${rq.border};
  }
  .tia-lore-card[data-open="true"] .tia-lore-card-details {
    display: grid;
  }
  .tia-lore-card[data-open="true"] {
    outline: 1px solid ${rq.accent};
  }
  @media (max-width: 760px) {
    .tia-karta-lore-panel { padding: 10px !important; gap: 10px !important; }
    .tia-karta-lore-panel > div:first-child p:not(:first-child) { display: none !important; }
  }
`;
