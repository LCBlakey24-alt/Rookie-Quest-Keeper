import React, { useMemo, useState } from 'react';
import { Copy, Save, ScrollText, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { buildTextHandoutPayload } from '@/components/gm/UploadTabUtils';
import { getTiaKartaUpdateSectionsForDestination, tiaKartaSessionTwoPack } from '@/data/tiaKartaSessionTwoPack';

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

export default function TiaKartaSessionTwoPackPanel({ campaignId, destination }) {
  const [query, setQuery] = useState('');
  const [savingKey, setSavingKey] = useState('');
  const sections = useMemo(() => getTiaKartaUpdateSectionsForDestination(destination), [destination]);

  const filteredSections = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return sections;
    return sections.map(section => ({
      ...section,
      cards: section.cards.filter(card => [
        section.title,
        section.eyebrow,
        section.summary,
        card.title,
        card.category,
        card.playerSummary,
        card.gmNotes,
        ...(card.bullets || []),
        ...(card.mechanics || []),
        card.tbd,
      ].join(' ').toLowerCase().includes(term)),
    })).filter(section => section.cards.length > 0 || [section.title, section.summary, section.eyebrow].join(' ').toLowerCase().includes(term));
  }, [query, sections]);

  if (!sections.length) return null;

  const copyCard = async (section, card) => {
    try {
      await navigator.clipboard.writeText(formatCard(section, card));
      toast.success(`${card.title} copied`);
    } catch {
      toast.info('Copy failed on this device. You can select the text manually.');
    }
  };

  const saveCard = async (section, card) => {
    if (!campaignId) {
      toast.error('Open a campaign before saving this update.');
      return;
    }
    const key = `${section.id}-${card.title}`;
    try {
      setSavingKey(key);
      await apiClient.post(`/campaigns/${campaignId}/handouts`, buildTextHandoutPayload({
        title: `Tia-Karta Update — ${card.title}`,
        content: formatCard(section, card),
      }));
      toast.success(`${card.title} saved to Secrets & Handouts`);
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || `Could not save ${card.title}`);
    } finally {
      setSavingKey('');
    }
  };

  return (
    <section style={panelStyle} data-testid={`tia-karta-session-two-pack-${destination}`}>
      <div style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}><Sparkles size={13} /> Current Tia-Karta update pack</p>
          <h3 style={titleStyle}>{tiaKartaSessionTwoPack.currentArc}</h3>
          <p style={helperStyle}>{tiaKartaSessionTwoPack.currentChapter} · {tiaKartaSessionTwoPack.sourceNote}</p>
        </div>
        <span style={pillStyle}>{filteredSections.reduce((total, section) => total + section.cards.length, 0)} cards</span>
      </div>

      <label style={searchStyle}>
        <Search size={14} />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search the current update pack..."
          style={searchInputStyle}
        />
      </label>

      <div style={sectionsStyle}>
        {filteredSections.map(section => (
          <section key={section.id} style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <p style={sectionEyebrowStyle}>{section.eyebrow}</p>
              <h4 style={sectionTitleStyle}><ScrollText size={17} /> {section.title}</h4>
              <p style={sectionSummaryStyle}>{section.summary}</p>
            </div>
            <div style={cardsGridStyle}>
              {section.cards.map(card => {
                const key = `${section.id}-${card.title}`;
                return (
                  <article key={key} style={cardStyle}>
                    <div>
                      <strong style={cardTitleStyle}>{card.title}</strong>
                      <span style={categoryStyle}>{card.category}</span>
                    </div>
                    {card.playerSummary && <p style={bodyStyle}>{card.playerSummary}</p>}
                    {card.gmNotes && <p style={gmStyle}><strong>GM note:</strong> {card.gmNotes}</p>}
                    {!!card.bullets?.length && <List title="Key points" items={card.bullets} />}
                    {!!card.mechanics?.length && <List title="Mechanics" items={card.mechanics} />}
                    {card.tbd && <p style={tbdStyle}><strong>TBD:</strong> {card.tbd}</p>}
                    <div style={actionsStyle}>
                      <button type="button" onClick={() => copyCard(section, card)} style={secondaryButtonStyle}><Copy size={14} /> Copy</button>
                      <button type="button" onClick={() => saveCard(section, card)} disabled={savingKey === key} style={primaryButtonStyle}><Save size={14} /> {savingKey === key ? 'Saving...' : 'Save'}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function List({ title, items }) {
  return (
    <div style={listBlockStyle}>
      <strong style={listTitleStyle}>{title}</strong>
      <ul style={listStyle}>{items.map(item => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}

function formatCard(section, card) {
  return [
    tiaKartaSessionTwoPack.campaignName,
    tiaKartaSessionTwoPack.currentArc,
    tiaKartaSessionTwoPack.currentChapter,
    '',
    `${section.eyebrow}: ${section.title}`,
    section.summary,
    '',
    card.title,
    `Category: ${card.category}`,
    card.playerSummary ? `\nPlayer-facing summary:\n${card.playerSummary}` : '',
    card.gmNotes ? `\nGM notes:\n${card.gmNotes}` : '',
    card.bullets?.length ? `\nKey points:\n- ${card.bullets.join('\n- ')}` : '',
    card.mechanics?.length ? `\nMechanics:\n- ${card.mechanics.join('\n- ')}` : '',
    card.tbd ? `\nTBD:\n${card.tbd}` : '',
  ].filter(Boolean).join('\n');
}

const panelStyle = { display: 'grid', gap: 12, padding: 14, marginBottom: 16, background: rq.panel, border: `1px solid ${rq.border}`, color: rq.text };
const headerStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' };
const eyebrowStyle = { margin: '0 0 6px', color: rq.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6 };
const titleStyle = { margin: 0, fontSize: 'clamp(22px, 4vw, 34px)', color: rq.text, fontWeight: 950, lineHeight: 1.05 };
const helperStyle = { margin: '7px 0 0', color: rq.secondary, fontSize: 13, lineHeight: 1.45, maxWidth: 900 };
const pillStyle = { border: `1px solid ${rq.border}`, background: rq.accentSoft, color: rq.text, padding: '7px 10px', fontSize: 12, fontWeight: 900 };
const searchStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', background: rq.card, border: `1px solid ${rq.border}` };
const searchInputStyle = { flex: 1, border: 0, outline: 0, background: 'transparent', color: rq.text, minWidth: 120 };
const sectionsStyle = { display: 'grid', gap: 12 };
const sectionStyle = { display: 'grid', gap: 10, paddingTop: 10, borderTop: `1px solid ${rq.border}` };
const sectionHeaderStyle = { display: 'grid', gap: 5 };
const sectionEyebrowStyle = { margin: 0, color: rq.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 950 };
const sectionTitleStyle = { margin: 0, color: rq.text, fontSize: 19, fontWeight: 950, display: 'flex', alignItems: 'center', gap: 7 };
const sectionSummaryStyle = { margin: 0, color: rq.secondary, fontSize: 13, lineHeight: 1.45 };
const cardsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 10 };
const cardStyle = { display: 'grid', gap: 9, background: rq.card, border: `1px solid ${rq.border}`, padding: 12, minWidth: 0 };
const cardTitleStyle = { display: 'block', color: rq.text, fontSize: 15, lineHeight: 1.25 };
const categoryStyle = { display: 'block', color: rq.muted, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 3 };
const bodyStyle = { color: rq.secondary, lineHeight: 1.45, fontSize: 13, margin: 0 };
const gmStyle = { color: '#FDE68A', lineHeight: 1.45, fontSize: 13, margin: 0 };
const tbdStyle = { color: '#FCA5A5', lineHeight: 1.4, fontSize: 12, margin: 0 };
const listBlockStyle = { display: 'grid', gap: 4 };
const listTitleStyle = { color: rq.text, fontSize: 12, fontWeight: 950 };
const listStyle = { margin: '0 0 0 18px', padding: 0, color: rq.secondary, fontSize: 12, lineHeight: 1.45 };
const actionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 };
const primaryButtonStyle = { minHeight: 34, border: 0, background: rq.accent, color: '#fff', padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer' };
const secondaryButtonStyle = { minHeight: 34, border: `1px solid ${rq.border}`, background: rq.panel, color: '#fff', padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer' };
