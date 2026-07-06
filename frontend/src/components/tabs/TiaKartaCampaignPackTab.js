import React, { useMemo, useState } from 'react';
import { BookOpen, Check, Copy, Save, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import tiaKartaCampaignPack from '@/data/tiaKartaCampaignPack';
import { buildTextHandoutPayload } from '@/components/gm/UploadTabUtils';

const rq = {
  panel: 'var(--rq-bg-panel, #242424)',
  card: 'var(--rq-bg-elevated, #323232)',
  border: 'var(--rq-accent-border, rgba(193,18,31,0.35))',
  text: 'var(--rq-text-primary, #fff)',
  muted: 'var(--rq-text-muted, #a0a0a0)',
  secondary: 'var(--rq-text-secondary, #d6d6d6)',
  accent: 'var(--rq-accent-primary, #C1121F)',
  accentSoft: 'var(--rq-accent-soft, rgba(193,18,31,0.12))',
};

export default function TiaKartaCampaignPackTab({ campaignId }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(tiaKartaCampaignPack.sections[0]?.id || '');
  const [savingId, setSavingId] = useState('');
  const [savedIds, setSavedIds] = useState(() => new Set());

  const filteredSections = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return tiaKartaCampaignPack.sections;
    return tiaKartaCampaignPack.sections.filter(section => (
      `${section.title} ${section.category} ${section.summary} ${section.content}`.toLowerCase().includes(term)
    ));
  }, [query]);

  const selected = tiaKartaCampaignPack.sections.find(section => section.id === selectedId) || filteredSections[0] || tiaKartaCampaignPack.sections[0];

  const copySection = async (section) => {
    try {
      await navigator.clipboard.writeText(`${section.title}\n\n${section.content}`);
      toast.success(`${section.title} copied`);
    } catch {
      toast.info('Copy failed on this device. You can select the text manually.');
    }
  };

  const saveSection = async (section) => {
    if (!campaignId) {
      toast.error('Open a campaign before saving pack sections.');
      return;
    }

    try {
      setSavingId(section.id);
      await apiClient.post(`/campaigns/${campaignId}/handouts`, buildTextHandoutPayload({
        title: `Tia Karta — ${section.title}`,
        content: `${section.category}\n\n${section.summary}\n\n${section.content}`,
      }));
      setSavedIds(prev => new Set([...prev, section.id]));
      toast.success(`${section.title} saved to Secrets & Handouts`);
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || `Could not save ${section.title}`);
    } finally {
      setSavingId('');
    }
  };

  const saveAllFiltered = async () => {
    if (!filteredSections.length) return;
    for (const section of filteredSections) {
      // eslint-disable-next-line no-await-in-loop
      await saveSection(section);
    }
  };

  return (
    <div style={shellStyle}>
      <section style={heroStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}>Built-in campaign pack</p>
          <h2 style={titleStyle}>{tiaKartaCampaignPack.title}</h2>
          <p style={subtitleStyle}>{tiaKartaCampaignPack.subtitle}</p>
        </div>
        <div style={heroActionsStyle}>
          <button type="button" onClick={() => saveAllFiltered()} style={primaryButtonStyle} disabled={Boolean(savingId)}>
            <Save size={16} />
            Save visible sections
          </button>
        </div>
      </section>

      <section style={noticeStyle}>
        <Sparkles size={18} />
        <p>
          This is not a file upload. These are coded-in GM notes from the Tia Karta / Tiamina setting work, ready to copy or save into this campaign as handout drafts.
        </p>
      </section>

      <label style={searchStyle}>
        <Search size={16} />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search gods, Balderin, Koltoro, Neremore, session hooks..."
          style={searchInputStyle}
        />
      </label>

      <div style={layoutStyle}>
        <aside style={listStyle}>
          {filteredSections.map(section => {
            const active = selected?.id === section.id;
            const saved = savedIds.has(section.id);
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setSelectedId(section.id)}
                style={sectionButtonStyle(active)}
              >
                <span style={sectionButtonTopStyle}>
                  <BookOpen size={15} />
                  <strong>{section.title}</strong>
                </span>
                <span style={sectionCategoryStyle}>{section.category}</span>
                {saved && <span style={savedPillStyle}><Check size={12} /> Saved</span>}
              </button>
            );
          })}
        </aside>

        {selected && (
          <article style={detailStyle}>
            <div style={detailHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>{selected.category}</p>
                <h3 style={detailTitleStyle}>{selected.title}</h3>
                <p style={detailSummaryStyle}>{selected.summary}</p>
              </div>
              <div style={detailActionsStyle}>
                <button type="button" onClick={() => copySection(selected)} style={secondaryButtonStyle}>
                  <Copy size={15} /> Copy
                </button>
                <button type="button" onClick={() => saveSection(selected)} style={primaryButtonStyle} disabled={savingId === selected.id}>
                  <Save size={15} /> {savingId === selected.id ? 'Saving...' : 'Save to Handouts'}
                </button>
              </div>
            </div>
            <pre style={contentStyle}>{selected.content}</pre>
          </article>
        )}
      </div>
    </div>
  );
}

const shellStyle = { display: 'grid', gap: 16, color: rq.text };
const heroStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', paddingBottom: 16, borderBottom: `1px solid ${rq.border}` };
const heroActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const eyebrowStyle = { margin: '0 0 6px', color: rq.muted, fontSize: 11, fontWeight: 950, letterSpacing: 1.1, textTransform: 'uppercase' };
const titleStyle = { margin: 0, fontSize: 'clamp(28px, 5vw, 48px)', lineHeight: 1, fontWeight: 950, color: rq.text };
const subtitleStyle = { margin: '8px 0 0', color: rq.secondary, lineHeight: 1.5, maxWidth: 780 };
const noticeStyle = { display: 'flex', gap: 10, alignItems: 'flex-start', padding: 14, background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.secondary, lineHeight: 1.5 };
const searchStyle = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: rq.card, border: `1px solid ${rq.border}` };
const searchInputStyle = { flex: 1, background: 'transparent', border: 0, outline: 0, color: rq.text, fontSize: 14 };
const layoutStyle = { display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) minmax(0, 1fr)', gap: 16 };
const listStyle = { display: 'grid', alignContent: 'start', gap: 8 };
const sectionButtonStyle = (active) => ({ width: '100%', border: `1px solid ${active ? rq.accent : rq.border}`, background: active ? rq.accentSoft : rq.card, color: rq.text, textAlign: 'left', padding: 12, cursor: 'pointer', display: 'grid', gap: 6 });
const sectionButtonTopStyle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 };
const sectionCategoryStyle = { color: rq.muted, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8 };
const savedPillStyle = { display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content', color: '#fff', background: rq.accent, padding: '3px 7px', fontSize: 11, fontWeight: 900 };
const detailStyle = { background: rq.card, border: `1px solid ${rq.border}`, padding: 'clamp(14px, 2vw, 22px)', minWidth: 0 };
const detailHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', borderBottom: `1px solid ${rq.border}`, paddingBottom: 14, marginBottom: 14 };
const detailTitleStyle = { margin: 0, color: rq.text, fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 950 };
const detailSummaryStyle = { margin: '8px 0 0', color: rq.secondary, lineHeight: 1.5 };
const detailActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' };
const primaryButtonStyle = { minHeight: 40, border: 0, background: rq.accent, color: '#fff', padding: '0 12px', fontWeight: 950, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 };
const secondaryButtonStyle = { minHeight: 40, border: `1px solid ${rq.border}`, background: rq.panel, color: '#fff', padding: '0 12px', fontWeight: 900, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 };
const contentStyle = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: rq.secondary, fontFamily: 'inherit', lineHeight: 1.6, margin: 0, fontSize: 14 };
