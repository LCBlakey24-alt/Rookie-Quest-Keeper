import React, { useMemo, useState } from 'react';
import { Copy, Save, Search, Shield, Sparkles, Swords } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { buildTextHandoutPayload } from '@/components/gm/UploadTabUtils';
import tiaKartaNpcRoster from '@/data/tiaKartaNpcRoster';

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

export default function TiaKartaNpcRosterPanel({ campaignId }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(tiaKartaNpcRoster[0]?.id || '');
  const [savingId, setSavingId] = useState('');

  const filteredNpcs = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return tiaKartaNpcRoster;
    return tiaKartaNpcRoster.filter(npc => [
      npc.name,
      npc.category,
      npc.race,
      npc.classType,
      npc.role,
      npc.alignment,
      npc.location,
      npc.description,
      npc.gmSecrets,
      ...(npc.skills || []),
      ...(npc.savingThrows || []),
      ...(npc.actions || []).map(action => `${action.name} ${action.description}`),
      ...(npc.abilities || []).map(ability => `${ability.name} ${ability.description}`),
      npc.tbd,
    ].join(' ').toLowerCase().includes(term));
  }, [query]);

  const selected = filteredNpcs.find(npc => npc.id === selectedId) || filteredNpcs[0] || tiaKartaNpcRoster[0];

  const copyNpc = async (npc) => {
    try {
      await navigator.clipboard.writeText(formatNpc(npc));
      toast.success(`${npc.name} copied`);
    } catch {
      toast.info('Copy failed on this device. You can select the text manually.');
    }
  };

  const saveNpc = async (npc) => {
    if (!campaignId) {
      toast.error('Open a campaign before saving this NPC.');
      return;
    }
    try {
      setSavingId(npc.id);
      await apiClient.post(`/campaigns/${campaignId}/handouts`, buildTextHandoutPayload({
        title: `Tia Karta NPC — ${npc.name}`,
        content: formatNpc(npc),
      }));
      toast.success(`${npc.name} saved to Secrets & Handouts`);
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || `Could not save ${npc.name}`);
    } finally {
      setSavingId('');
    }
  };

  if (!tiaKartaNpcRoster.length) return null;

  return (
    <section style={panelStyle} data-testid="tia-karta-npc-roster-panel">
      <div style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}><Sparkles size={13} /> Tia Karta NPC roster</p>
          <h3 style={titleStyle}>Stat-ready NPCs & Figures</h3>
          <p style={helperStyle}>Suggested table-use stat blocks for your campaign. Gods and primordials are marked as narrative-scale until you decide they should be fightable.</p>
        </div>
        <span style={countPillStyle}>{filteredNpcs.length} / {tiaKartaNpcRoster.length}</span>
      </div>

      <label style={searchStyle}>
        <Search size={14} />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search NPCs, stats, locations, Akara, Hollowmere..." style={searchInputStyle} />
      </label>

      <div style={layoutStyle}>
        <aside style={listStyle}>
          {filteredNpcs.map(npc => (
            <button key={npc.id} type="button" onClick={() => setSelectedId(npc.id)} style={listButtonStyle(selected?.id === npc.id)}>
              <strong>{npc.name}</strong>
              <span>{npc.category}</span>
              <small>{npc.race} · Level {npc.level} · {npc.role}</small>
            </button>
          ))}
        </aside>

        {selected && (
          <article style={cardStyle}>
            <div style={detailHeaderStyle}>
              <div style={{ minWidth: 0 }}>
                <p style={eyebrowStyle}>{selected.category}</p>
                <h4 style={npcTitleStyle}>{selected.name}</h4>
                <p style={helperStyle}>{selected.race} · {selected.classType} · Level {selected.level} · {selected.alignment}</p>
                <p style={locationStyle}>{selected.location}</p>
              </div>
              <div style={actionsStyle}>
                <button type="button" onClick={() => copyNpc(selected)} style={secondaryButtonStyle}><Copy size={14} /> Copy</button>
                <button type="button" onClick={() => saveNpc(selected)} disabled={savingId === selected.id} style={primaryButtonStyle}><Save size={14} /> {savingId === selected.id ? 'Saving...' : 'Save'}</button>
              </div>
            </div>

            <p style={bodyStyle}>{selected.description}</p>
            <p style={secretStyle}><strong>GM Secret:</strong> {selected.gmSecrets}</p>

            <div style={statsGridStyle}>
              <Stat label="AC" value={selected.stats.ac} />
              <Stat label="HP" value={selected.stats.hp} />
              <Stat label="Speed" value={selected.stats.speed} wide />
              <Stat label="PB" value={`+${selected.stats.proficiencyBonus}`} />
            </div>

            <div style={abilityGridStyle}>
              {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(key => <Stat key={key} label={key.toUpperCase()} value={selected.stats[key]} />)}
            </div>

            {!!selected.savingThrows?.length && <Meta label="Saving Throws" values={selected.savingThrows} />}
            {!!selected.skills?.length && <Meta label="Skills" values={selected.skills} />}

            {!!selected.actions?.length && (
              <Block title="Combat Actions" icon={Swords} items={selected.actions} />
            )}
            {!!selected.abilities?.length && (
              <Block title="Abilities" icon={Shield} items={selected.abilities} />
            )}
            {selected.spells && <SpellBlock spells={selected.spells} />}
            {selected.tbd && <p style={tbdStyle}><strong>TBD:</strong> {selected.tbd}</p>}
          </article>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, wide = false }) {
  return <div style={{ ...statStyle, gridColumn: wide ? 'span 2' : undefined }}><span>{label}</span><strong>{value ?? '—'}</strong></div>;
}

function Meta({ label, values }) {
  return <p style={metaStyle}><strong>{label}:</strong> {values.join(', ')}</p>;
}

function Block({ title, icon: Icon, items }) {
  return (
    <section style={blockStyle}>
      <h5 style={blockTitleStyle}><Icon size={15} /> {title}</h5>
      <div style={blockGridStyle}>{items.map(item => <p key={`${title}-${item.name}`} style={blockItemStyle}><strong>{item.name}:</strong> {item.description}</p>)}</div>
    </section>
  );
}

function SpellBlock({ spells }) {
  return (
    <section style={blockStyle}>
      <h5 style={blockTitleStyle}>Spells / Narrative Magic</h5>
      <p style={blockItemStyle}><strong>Casting:</strong> {spells.castingAbility || '—'} · DC {spells.saveDc || '—'} · Attack {spells.attackBonus ? `+${spells.attackBonus}` : '—'}</p>
      {spells.slotLevel && <p style={blockItemStyle}><strong>Slots:</strong> Level {spells.slotLevel} × {spells.slotCount || 0}</p>}
      {!!spells.cantrips?.length && <p style={blockItemStyle}><strong>Cantrips:</strong> {spells.cantrips.join(', ')}</p>}
      {!!spells.knownSpells?.length && <p style={blockItemStyle}><strong>Known Spells:</strong> {spells.knownSpells.join(', ')}</p>}
    </section>
  );
}

function formatNpc(npc) {
  const lines = [
    npc.name,
    `Category: ${npc.category}`,
    `Race: ${npc.race}`,
    `Class/Type: ${npc.classType}`,
    `Level: ${npc.level}`,
    `Role: ${npc.role}`,
    `Alignment: ${npc.alignment}`,
    `Location: ${npc.location}`,
    '',
    `Description:\n${npc.description}`,
    '',
    `GM Secrets:\n${npc.gmSecrets}`,
    '',
    'Stats:',
    `AC: ${npc.stats.ac}`,
    `HP: ${npc.stats.hp}`,
    `Speed: ${npc.stats.speed}`,
    `Proficiency Bonus: +${npc.stats.proficiencyBonus}`,
    `STR ${npc.stats.str}`,
    `DEX ${npc.stats.dex}`,
    `CON ${npc.stats.con}`,
    `INT ${npc.stats.int}`,
    `WIS ${npc.stats.wis}`,
    `CHA ${npc.stats.cha}`,
  ];
  if (npc.savingThrows?.length) lines.push('', `Saving Throws: ${npc.savingThrows.join(', ')}`);
  if (npc.skills?.length) lines.push(`Skills: ${npc.skills.join(', ')}`);
  if (npc.actions?.length) lines.push('', 'Combat Actions:', ...npc.actions.map(action => `- ${action.name}: ${action.description}`));
  if (npc.abilities?.length) lines.push('', 'Abilities:', ...npc.abilities.map(ability => `- ${ability.name}: ${ability.description}`));
  if (npc.spells) {
    lines.push('', 'Spells / Narrative Magic:');
    lines.push(`Casting Ability: ${npc.spells.castingAbility || '—'}`);
    lines.push(`Spell Save DC: ${npc.spells.saveDc || '—'}`);
    lines.push(`Spell Attack Bonus: ${npc.spells.attackBonus ? `+${npc.spells.attackBonus}` : '—'}`);
    if (npc.spells.slotLevel) lines.push(`Slot Level: ${npc.spells.slotLevel}`, `Slot Count: ${npc.spells.slotCount || 0}`);
    if (npc.spells.cantrips?.length) lines.push(`Cantrips: ${npc.spells.cantrips.join(', ')}`);
    if (npc.spells.knownSpells?.length) lines.push(`Known Spells: ${npc.spells.knownSpells.join(', ')}`);
  }
  if (npc.tbd) lines.push('', `TBD:\n${npc.tbd}`);
  return lines.join('\n');
}

const panelStyle = { display: 'grid', gap: 12, padding: 14, marginBottom: 16, background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.text };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' };
const eyebrowStyle = { margin: '0 0 6px', color: rq.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6 };
const titleStyle = { margin: 0, fontSize: 20, color: rq.text, fontWeight: 950 };
const npcTitleStyle = { margin: 0, fontSize: 'clamp(24px, 4vw, 38px)', lineHeight: 1, color: rq.text, fontWeight: 950 };
const helperStyle = { margin: '6px 0 0', color: rq.secondary, fontSize: 13, lineHeight: 1.45, maxWidth: 900 };
const locationStyle = { margin: '6px 0 0', color: rq.muted, fontSize: 12, fontWeight: 850 };
const countPillStyle = { border: `1px solid ${rq.border}`, background: rq.panel, color: rq.text, padding: '7px 10px', fontSize: 12, fontWeight: 900 };
const searchStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', background: rq.panel, border: `1px solid ${rq.border}` };
const searchInputStyle = { flex: 1, border: 0, outline: 0, background: 'transparent', color: rq.text, minWidth: 120 };
const layoutStyle = { display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) minmax(0, 1fr)', gap: 12 };
const listStyle = { display: 'grid', alignContent: 'start', gap: 7, maxHeight: 680, overflowY: 'auto' };
const listButtonStyle = (active) => ({ display: 'grid', gap: 4, textAlign: 'left', width: '100%', border: `1px solid ${active ? rq.accent : rq.border}`, background: active ? rq.accentSoft : rq.panel, color: rq.text, padding: 10, cursor: 'pointer' });
const cardStyle = { display: 'grid', gap: 12, background: rq.panel, border: `1px solid ${rq.border}`, padding: 14, minWidth: 0 };
const detailHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', borderBottom: `1px solid ${rq.border}`, paddingBottom: 12 };
const actionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const primaryButtonStyle = { minHeight: 36, border: 0, background: rq.accent, color: '#fff', padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer' };
const secondaryButtonStyle = { minHeight: 36, border: `1px solid ${rq.border}`, background: rq.card, color: '#fff', padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer' };
const bodyStyle = { margin: 0, color: rq.secondary, lineHeight: 1.5, fontSize: 14 };
const secretStyle = { margin: 0, color: '#FDE68A', lineHeight: 1.5, fontSize: 13 };
const statsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8 };
const abilityGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(6, minmax(58px, 1fr))', gap: 8 };
const statStyle = { display: 'grid', gap: 3, background: rq.card, border: `1px solid ${rq.border}`, padding: 9, minHeight: 58 };
const metaStyle = { margin: 0, color: rq.secondary, fontSize: 13, lineHeight: 1.4 };
const blockStyle = { display: 'grid', gap: 8, borderTop: `1px solid ${rq.border}`, paddingTop: 10 };
const blockTitleStyle = { margin: 0, color: rq.text, fontSize: 14, fontWeight: 950, display: 'flex', alignItems: 'center', gap: 6 };
const blockGridStyle = { display: 'grid', gap: 7 };
const blockItemStyle = { margin: 0, color: rq.secondary, lineHeight: 1.45, fontSize: 13 };
const tbdStyle = { margin: 0, color: '#FCA5A5', lineHeight: 1.45, fontSize: 13, borderTop: `1px solid ${rq.border}`, paddingTop: 10 };
