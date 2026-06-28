import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Filter, PlaySquare, Plus, RefreshCw, Save, Search, Skull, Swords, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiClient from '@/lib/apiClient';
import MonsterLookup from '@/components/MonsterLookup';
import CustomCreatureManager from '@/components/CustomCreatureManager';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "Germania One", Georgia, serif)';
const rq = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  red: '#d00000',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.74)',
  muted: 'rgba(255,255,255,0.58)',
  line: 'rgba(255,255,255,0.16)',
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function crValue(cr) {
  const raw = String(cr || '0').trim();
  if (raw.includes('/')) {
    const [top, bottom] = raw.split('/').map(Number);
    return bottom ? top / bottom : 0;
  }
  return Number(raw) || 0;
}

function dexMod(creature) {
  const stats = creature.stats || creature.abilities || {};
  const dex = toNumber(stats.dexterity ?? creature.dexterity ?? creature.dex, 10);
  return Math.floor((dex - 10) / 2);
}

function normaliseCreatures(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.creatures)) return data.creatures;
  return [];
}

function creatureId(creature, index = 0) {
  return creature.id || creature.name || `creature-${index}`;
}

function creatureToCombatant(creature, copyIndex = 0) {
  const maxHp = toNumber(creature.hp ?? creature.maxHp ?? creature.hit_points, 10);
  const name = creature.name || 'Creature';
  const actions = Array.isArray(creature.actions) ? creature.actions : creature.abilities ? [{ name: 'Actions', description: creature.abilities }] : [];
  return {
    id: `${creature.id || name}-${copyIndex}-${Date.now()}`,
    name: copyIndex > 0 ? `${name} ${copyIndex + 1}` : name,
    type: 'monster',
    hp: maxHp,
    maxHp,
    ac: toNumber(creature.ac ?? creature.armor_class, 10),
    initiativeMod: toNumber(creature.initiativeMod, dexMod(creature)),
    conditions: [],
    description: creature.description || creature.notes || creature.abilities || '',
    actions,
    reactions: creature.reactions || [],
    bonus_actions: creature.bonus_actions || [],
    cr: creature.cr || creature.challenge_rating || '',
    creature_type: creature.type || 'creature',
    tokenColor: '#EF4444',
    tokenSize: 40,
  };
}

export default function MonstersTab({ theme, campaignId }) {
  const [creatures, setCreatures] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [crFilter, setCrFilter] = useState('all');
  const [selected, setSelected] = useState({});
  const [encounterName, setEncounterName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadLibrary = async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const [creatureRes, scenarioRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/custom-creatures`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/combat-scenarios`).catch(() => ({ data: [] })),
      ]);
      setCreatures(normaliseCreatures(creatureRes.data));
      setScenarios(Array.isArray(scenarioRes.data) ? scenarioRes.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load monster library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLibrary(); }, [campaignId]);

  const creatureTypes = useMemo(() => [...new Set(creatures.map(creature => creature.type || 'creature'))].sort(), [creatures]);
  const filteredCreatures = useMemo(() => creatures.filter((creature, index) => {
    const term = query.trim().toLowerCase();
    const matchesSearch = !term || `${creature.name || ''} ${creature.type || ''} ${creature.description || ''} ${creature.abilities || ''}`.toLowerCase().includes(term);
    const matchesType = typeFilter === 'all' || (creature.type || 'creature') === typeFilter;
    const cr = crValue(creature.cr ?? creature.challenge_rating);
    const matchesCr = crFilter === 'all' || (crFilter === 'low' && cr <= 2) || (crFilter === 'mid' && cr > 2 && cr <= 8) || (crFilter === 'high' && cr > 8);
    return matchesSearch && matchesType && matchesCr && creatureId(creature, index);
  }), [creatures, query, typeFilter, crFilter]);

  const selectedCreatures = useMemo(() => creatures.flatMap((creature, index) => {
    const count = selected[creatureId(creature, index)] || 0;
    return count > 0 ? [{ creature, index, count }] : [];
  }), [creatures, selected]);

  const selectedCount = selectedCreatures.reduce((sum, entry) => sum + entry.count, 0);
  const selectedCr = Math.round(selectedCreatures.reduce((sum, entry) => sum + (crValue(entry.creature.cr ?? entry.creature.challenge_rating) * entry.count), 0) * 100) / 100;
  const selectedCombatants = useMemo(() => selectedCreatures.flatMap(entry => Array.from({ length: entry.count }, (_, copyIndex) => creatureToCombatant(entry.creature, copyIndex))), [selectedCreatures]);
  const recentScenarios = useMemo(() => [...scenarios].sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || ''))).slice(0, 5), [scenarios]);

  const adjustCreature = (id, delta) => {
    setSelected(prev => {
      const next = Math.max(0, (prev[id] || 0) + delta);
      const copy = { ...prev, [id]: next };
      if (next === 0) delete copy[id];
      return copy;
    });
  };

  const clearSelection = () => {
    setSelected({});
    setEncounterName('');
  };

  const saveEncounter = async () => {
    if (selectedCombatants.length === 0) {
      toast.error('Pick at least one creature first');
      return;
    }
    const fallbackName = selectedCreatures.length === 1 ? `${selectedCreatures[0].creature.name || 'Monster'} Encounter` : `Monster Encounter (${selectedCount} creatures)`;
    const name = (encounterName || fallbackName).trim();
    setSaving(true);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/combat-scenarios`, {
        name,
        description: `Seeded from Monsters tab. Estimated monster CR total: ${selectedCr}. Add players from Combat when ready.`,
        combatants: selectedCombatants,
        show_grid: true,
        grid_size: 40,
      });
      setScenarios(prev => [response.data, ...prev]);
      clearSelection();
      toast.success('Encounter saved from monster selection', { description: `${name} is now available in Combat.` });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not save encounter');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={shellStyle} data-testid="monsters-tab">
      <header style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>Monsters</p>
          <h2 style={titleStyle}><Skull size={32} /> Creature Library</h2>
          <p style={subtitleStyle}>Create, manage, and group monsters into encounter seeds that can be launched from Combat.</p>
        </div>
        <div style={statGridStyle}>
          <Stat label="Saved Creatures" value={creatures.length} />
          <Stat label="Selected" value={selectedCount} />
          <Stat label="Encounter Seeds" value={scenarios.length} />
        </div>
      </header>

      <section style={encounterBuilderStyle}>
        <div style={builderHeaderStyle}>
          <div>
            <h3 style={sectionTitleStyle}><Swords size={18} /> Build an encounter seed</h3>
            <p style={smallHelpStyle}>Pick monsters and quantities here, then save them as a Combat encounter. Players can be added from Combat when you run it.</p>
          </div>
          <div style={builderActionStyle}>
            <Button onClick={clearSelection} disabled={selectedCount === 0} style={secondaryButtonStyle}><X size={15} /> Clear</Button>
            <Button onClick={saveEncounter} disabled={saving || selectedCount === 0} style={primaryButtonStyle}><Save size={15} /> {saving ? 'Saving…' : 'Save Encounter'}</Button>
          </div>
        </div>

        <div style={filtersStyle}>
          <label style={searchWrapStyle}><Search size={16} /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search creatures, abilities, type…" style={inputStyle} /></label>
          <label style={selectWrapStyle}><Filter size={15} /><select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} style={selectStyle}><option value="all">All types</option>{creatureTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
          <select value={crFilter} onChange={event => setCrFilter(event.target.value)} style={selectStyle}><option value="all">All CR</option><option value="low">CR 0–2</option><option value="mid">CR 3–8</option><option value="high">CR 9+</option></select>
          <Input value={encounterName} onChange={event => setEncounterName(event.target.value)} placeholder="Encounter name, optional" style={inputStyle} />
          <Button onClick={loadLibrary} disabled={loading} style={secondaryButtonStyle}><RefreshCw size={15} /> Refresh</Button>
        </div>

        {selectedCount > 0 && (
          <div style={selectedPanelStyle}>
            <strong>{selectedCount} creature{selectedCount === 1 ? '' : 's'} selected</strong>
            <span>Estimated monster CR total: {selectedCr}</span>
            <div style={selectedChipRowStyle}>{selectedCreatures.map(entry => <span key={entry.creature.id || entry.creature.name} style={selectedChipStyle}>{entry.count}× {entry.creature.name}</span>)}</div>
          </div>
        )}

        {loading ? <p style={emptyStyle}>Loading creature library…</p> : filteredCreatures.length === 0 ? <p style={emptyStyle}>No matching creatures. Create one below or clear your filters.</p> : (
          <div style={creatureGridStyle}>{filteredCreatures.map((creature, index) => {
            const id = creatureId(creature, index);
            return <CreatureCard key={id} creature={creature} count={selected[id] || 0} onAdjust={(delta) => adjustCreature(id, delta)} />;
          })}</div>
        )}
      </section>

      <section style={lowerGridStyle}>
        <div style={panelStyle}>
          <h3 style={sectionTitleStyle}><PlaySquare size={18} /> Recent encounter seeds</h3>
          {recentScenarios.length === 0 ? <p style={emptyStyle}>No saved encounters yet. Build one from the creature library above.</p> : <div style={scenarioListStyle}>{recentScenarios.map(scenario => <article key={scenario.id} style={scenarioRowStyle}><strong>{scenario.name}</strong><span>{scenario.combatants?.length || 0} combatants</span></article>)}</div>}
        </div>
        <div style={panelStyle}>
          <h3 style={sectionTitleStyle}><BookOpen size={18} /> SRD Monster Lookup</h3>
          <p style={smallHelpStyle}>Use the reference lookup for official-style stat checks, then create reusable campaign creatures below.</p>
          <MonsterLookup />
        </div>
      </section>

      <section style={panelStyle}>
        <h3 style={sectionTitleStyle}><Plus size={18} /> Create and import custom creatures</h3>
        <CustomCreatureManager
          campaignId={campaignId}
          isOpen={true}
          onClose={() => {}}
          onSelectCreature={(creature) => {
            toast.success(`${creature.name} is in your creature library`, { description: 'Use the encounter builder above to seed combat.' });
            loadLibrary();
          }}
          embedded={true}
        />
      </section>
    </section>
  );
}

function Stat({ label, value }) {
  return <article style={statStyle}><strong>{value}</strong><span>{label}</span></article>;
}

function CreatureCard({ creature, count, onAdjust }) {
  const cr = creature.cr ?? creature.challenge_rating ?? '—';
  return (
    <article style={creatureCardStyle(count > 0)}>
      <div style={{ minWidth: 0 }}>
        <div style={creatureTopStyle}>
          <strong>{creature.name || 'Unnamed creature'}</strong>
          <span style={crPillStyle}>CR {cr}</span>
        </div>
        <p style={creatureMetaStyle}>{creature.size || 'Medium'} {creature.type || 'creature'} · AC {creature.ac || creature.armor_class || '—'} · HP {creature.hp || creature.hit_points || '—'}</p>
        {(creature.description || creature.abilities) && <p style={creatureDescStyle}>{String(creature.description || creature.abilities).slice(0, 150)}{String(creature.description || creature.abilities).length > 150 ? '…' : ''}</p>}
      </div>
      <div style={countControlStyle}>
        <button type="button" onClick={() => onAdjust(-1)} style={countButtonStyle}>−</button>
        <strong>{count}</strong>
        <button type="button" onClick={() => onAdjust(1)} style={countButtonStyle}>+</button>
      </div>
    </article>
  );
}

const shellStyle = { display: 'grid', gap: 14, color: rq.text, fontFamily: fontStack };
const heroStyle = { display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap', background: rq.card, border: `1px solid ${rq.line}`, padding: 16 };
const eyebrowStyle = { margin: '0 0 5px', color: rq.red, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.11em' };
const titleStyle = { margin: 0, color: rq.text, fontFamily: titleFont, fontSize: 'clamp(34px, 5vw, 58px)', lineHeight: 0.95, display: 'flex', gap: 10, alignItems: 'center' };
const subtitleStyle = { margin: '7px 0 0', color: rq.soft, lineHeight: 1.45, maxWidth: 760 };
const statGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(100px, 1fr))', gap: 8, minWidth: 'min(100%, 420px)' };
const statStyle = { background: rq.bg, border: `1px solid ${rq.line}`, padding: 10, display: 'grid', gap: 3, textAlign: 'center' };
const encounterBuilderStyle = { display: 'grid', gap: 12, background: rq.panel, border: `1px solid ${rq.line}`, borderLeft: `7px solid ${rq.red}`, padding: 14 };
const builderHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' };
const builderActionStyle = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const sectionTitleStyle = { margin: 0, color: rq.text, fontSize: 16, fontWeight: 950, display: 'flex', gap: 8, alignItems: 'center' };
const smallHelpStyle = { margin: '5px 0 0', color: rq.muted, fontSize: 12, lineHeight: 1.4 };
const primaryButtonStyle = { minHeight: 38, border: 0, borderRadius: 0, background: rq.red, color: rq.text, fontWeight: 950, display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 38, border: 0, borderRadius: 0, background: rq.card, color: rq.text, fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: fontStack };
const filtersStyle = { display: 'grid', gridTemplateColumns: 'minmax(220px, 1.4fr) minmax(140px, 0.6fr) 120px minmax(190px, 1fr) auto', gap: 8, alignItems: 'center' };
const searchWrapStyle = { display: 'flex', alignItems: 'center', gap: 7, background: rq.bg, border: `1px solid ${rq.line}`, padding: '0 8px' };
const selectWrapStyle = { display: 'flex', alignItems: 'center', gap: 7, background: rq.bg, border: `1px solid ${rq.line}`, padding: '0 8px' };
const inputStyle = { minHeight: 36, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, borderRadius: 0 };
const selectStyle = { minHeight: 36, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 8px', borderRadius: 0 };
const selectedPanelStyle = { display: 'grid', gap: 6, background: rq.bg, border: `1px solid ${rq.line}`, padding: 10, color: rq.soft };
const selectedChipRowStyle = { display: 'flex', gap: 6, flexWrap: 'wrap' };
const selectedChipStyle = { background: 'rgba(208,0,0,0.18)', color: rq.text, border: `1px solid ${rq.line}`, padding: '4px 7px', fontSize: 12, fontWeight: 900 };
const creatureGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 };
const creatureCardStyle = (active) => ({ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, background: active ? 'rgba(208,0,0,0.18)' : rq.card, border: `1px solid ${active ? rq.red : rq.line}`, borderLeft: `5px solid ${active ? rq.red : rq.line}`, padding: 10 });
const creatureTopStyle = { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' };
const crPillStyle = { background: rq.bg, border: `1px solid ${rq.line}`, padding: '3px 6px', fontSize: 11, fontWeight: 950, whiteSpace: 'nowrap' };
const creatureMetaStyle = { margin: '5px 0 0', color: rq.muted, fontSize: 12 };
const creatureDescStyle = { margin: '7px 0 0', color: rq.soft, fontSize: 12, lineHeight: 1.35 };
const countControlStyle = { display: 'grid', gridTemplateRows: '28px 24px 28px', alignItems: 'center', justifyItems: 'center' };
const countButtonStyle = { width: 30, height: 28, border: 0, background: rq.red, color: rq.text, fontWeight: 950, cursor: 'pointer' };
const emptyStyle = { margin: 0, color: rq.muted, background: rq.bg, border: `1px dashed ${rq.line}`, padding: 14, lineHeight: 1.4 };
const lowerGridStyle = { display: 'grid', gridTemplateColumns: 'minmax(min(320px, 100%), 0.85fr) minmax(min(320px, 100%), 1.15fr)', gap: 12 };
const panelStyle = { background: rq.card, border: `1px solid ${rq.line}`, padding: 14, minWidth: 0 };
const scenarioListStyle = { display: 'grid', gap: 8, marginTop: 12 };
const scenarioRowStyle = { display: 'flex', justifyContent: 'space-between', gap: 8, background: rq.bg, border: `1px solid ${rq.line}`, padding: 9, color: rq.soft };
