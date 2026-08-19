import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Copy, Save, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { buildTextHandoutPayload } from '@/components/gm/UploadTabUtils';
import TiaKartaNpcRosterPanel from '@/components/gm/TiaKartaNpcRosterPanel';
import TiaKartaSessionTwoPackPanel from '@/components/gm/TiaKartaSessionTwoPackPanel';
import TiaKartaJordanQuestImportV2 from '@/components/gm/TiaKartaJordanQuestImportV2';
import TiaKartaBalderinCoreImport from '@/components/gm/TiaKartaBalderinCoreImport';
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
  const [panelOpen, setPanelOpen] = useState(false);
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

  if (!entries.length && destination !== 'npcs' && destination !== 'storyArcs') return null;

  const copyEntry = async entry => {
    try {
      await navigator.clipboard.writeText(formatEntry(entry));
      toast.success(`${entry.title} copied`);
    } catch {
      toast.info('Copy failed on this device. You can select the text manually.');
    }
  };

  const saveEntry = async entry => {
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
      toast.success(`${entry.title} saved to Handouts`);
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || `Could not save ${entry.title}`);
    } finally {
      setSavingId('');
    }
  };

  const shownEntries = expanded || !compact ? filteredEntries : filteredEntries.slice(0, 3);
  const destinationLabel = tiaKartaDashboardDestinations[destination] || destination;

  if (!panelOpen) {
    return (
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        style={closedPanelStyle}
        data-testid={`tia-karta-pack-${destination}`}
      >
        <span style={closedLabelStyle}><Sparkles size={14} /> Tia-Karta Campaign Pack</span>
        <span style={closedMetaStyle}>{destinationLabel} <ChevronRight size={15} /></span>
      </button>
    );
  }

  return (
    <section style={openShellStyle} data-testid={`tia-karta-pack-${destination}`}>
      <button type="button" onClick={() => setPanelOpen(false)} style={openHeaderStyle}>
        <span style={closedLabelStyle}><Sparkles size={14} /> Tia-Karta Campaign Pack</span>
        <span style={closedMetaStyle}>Hide <ChevronDown size={15} /></span>
      </button>

      {destination === 'storyArcs' && (
        <section style={loadersStyle}>
          <TiaKartaBalderinCoreImport campaignId={campaignId} />
          <TiaKartaJordanQuestImportV2 campaignId={campaignId} />
        </section>
      )}

      <TiaKartaSessionTwoPackPanel campaignId={campaignId} destination={destination} />

      {!!entries.length && (
        <section className="tia-karta-lore-panel" style={panelStyle}>
          <div style={headerStyle}>
            <div style={{ minWidth: 0 }}>
              <h3 style={titleStyle}>{destinationLabel}</h3>
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
              placeholder="Search campaign pack…"
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
      )}

      {destination === 'npcs' && <TiaKartaNpcRosterPanel campaignId={campaignId} />}
    </section>
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

const closedPanelStyle = { width: '100%', minHeight: 42, marginBottom: 8, border: `1px solid ${rq.border}`, background: rq.panel, color: rq.text, padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer' };
const closedLabelStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 950, fontSize: 11 };
const closedMetaStyle = { display: 'inline-flex', alignItems: 'center', gap: 5, color: rq.muted, fontSize: 10, fontWeight: 850 };
const openShellStyle = { display: 'grid', gap: 8, marginBottom: 10 };
const openHeaderStyle = { minHeight: 42, border: `1px solid ${rq.border}`, background: rq.accentSoft, color: rq.text, padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer' };
const loadersStyle = { display: 'grid', gap: 6 };
const panelStyle = { display: 'grid', gap: 10, padding: 10, background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.text };
const headerStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' };
const titleStyle = { margin: 0, fontSize: 16, color: rq.text, fontWeight: 950 };
const toggleStyle = { minHeight: 32, border: `1px solid ${rq.border}`, background: rq.card, color: rq.text, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontWeight: 900, fontSize: 10 };
const searchStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', background: rq.panel, border: `1px solid ${rq.border}` };
const searchInputStyle = { flex: 1, border: 0, outline: 0, background: 'transparent', color: rq.text, minWidth: 120 };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 7 };
const entryStyle = { display: 'grid', gap: 0, background: rq.panel, border: `1px solid ${rq.border}`, padding: 0, minWidth: 0 };
const entryTopStyle = { display: 'flex', gap: 8, alignItems: 'flex-start', minWidth: 0 };
const entryTitleStyle = { display: 'block', color: rq.text, fontSize: 13, lineHeight: 1.25, textAlign: 'left' };
const categoryStyle = { display: 'block', color: rq.muted, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 2, textAlign: 'left' };
const textStyle = { color: rq.secondary, lineHeight: 1.4, fontSize: 12, margin: 0 };
const secretStyle = { color: '#FDE68A', lineHeight: 1.4, fontSize: 12, margin: 0 };
const metaStyle = { color: rq.muted, lineHeight: 1.35, fontSize: 11, margin: 0 };
const tbdStyle = { color: '#FCA5A5', lineHeight: 1.35, fontSize: 11, margin: 0 };
const actionsStyle = { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 };
const primaryButtonStyle = { minHeight: 30, border: 0, background: rq.accent, color: '#fff', padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 900, cursor: 'pointer', fontSize: 10 };
const secondaryButtonStyle = { minHeight: 30, border: `1px solid ${rq.border}`, background: rq.card, color: '#fff', padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 900, cursor: 'pointer', fontSize: 10 };

const tileLoreCss = `
  .tia-lore-card-toggle {
    border: 0;
    background: transparent;
    color: inherit;
    padding: 9px;
    margin: 0;
    width: 100%;
    min-height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    cursor: pointer;
    font: inherit;
  }
  .tia-lore-mobile-open {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex: 0 0 auto;
    background: ${rq.card};
    border: 1px solid ${rq.border};
    color: ${rq.text};
  }
  .tia-lore-card-details {
    display: none;
    gap: 7px;
    padding: 0 9px 9px;
    border-top: 1px solid ${rq.border};
  }
  .tia-lore-card[data-open="true"] .tia-lore-card-details { display: grid; }
  .tia-lore-card[data-open="true"] { outline: 1px solid ${rq.accent}; }
`;
