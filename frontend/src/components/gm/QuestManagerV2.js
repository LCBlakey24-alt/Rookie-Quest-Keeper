import React, { useEffect, useMemo, useState } from 'react';
import {
  Check, ChevronDown, ChevronRight, Circle, FileText, Gift, Link2, Map,
  MapPin, Monitor, Pin, Plus, Search, SkipForward, Swords, Trash2, UserCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const STATUS_OPTIONS = ['draft', 'available', 'active', 'completed', 'failed', 'archived'];
const OPEN_STATUSES = new Set(['draft', 'available', 'active']);
const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const rq = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', hover: '#444444', red: '#d00000',
  text: '#ffffff', soft: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.16)',
};

const EMPTY_QUEST = {
  title: '', summary: '', hook: '', status: 'available', gm_notes: '', objectives: [],
  linked_npc_ids: [], linked_location_ids: [], linked_encounter_ids: [], linked_map_ids: [],
  linked_handout_ids: [], linked_reward_ids: [], is_pinned: false,
};

const LINK_TYPES = [
  { key: 'linked_npc_ids', resourceKey: 'npcs', label: 'NPCs', icon: UserCircle, tab: 'npcs', liveTool: 'npcs', name: item => item.name },
  { key: 'linked_location_ids', resourceKey: 'locations', label: 'Locations', icon: MapPin, tab: 'maps', liveTool: 'maps', name: item => item.name },
  { key: 'linked_encounter_ids', resourceKey: 'encounters', label: 'Encounters', icon: Swords, tab: 'combat', liveTool: 'combat', name: item => item.name },
  { key: 'linked_map_ids', resourceKey: 'maps', label: 'Maps', icon: Map, tab: 'maps', liveTool: 'maps', name: item => item.name },
  { key: 'linked_handout_ids', resourceKey: 'handouts', label: 'Handouts', icon: FileText, tab: 'handouts', liveTool: 'handouts', name: item => item.title || item.name },
  { key: 'linked_reward_ids', resourceKey: 'rewards', label: 'Loot / Rewards', icon: Gift, tab: 'inventory', liveTool: 'loot', name: item => item.name },
];

function nice(value = '') {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function progressFor(quest) {
  const objectives = Array.isArray(quest?.objectives) ? quest.objectives : [];
  const completed = objectives.filter(item => item.status === 'completed').length;
  const skipped = objectives.filter(item => item.status === 'skipped').length;
  return { total: objectives.length, completed, skipped, resolved: completed + skipped };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export default function QuestManagerV2({ campaignId, onOpenTab }) {
  const [quests, setQuests] = useState([]);
  const [resources, setResources] = useState({ npcs: [], locations: [], encounters: [], maps: [], handouts: [], rewards: [] });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState(EMPTY_QUEST);
  const [objectiveDrafts, setObjectiveDrafts] = useState({});
  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const [questRes, npcRes, locationRes, encounterRes, mapRes, handoutRes, rewardRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/quests`),
        apiClient.get(`/campaigns/${campaignId}/npcs`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/locations`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/combat-scenarios`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/maps`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/handouts`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/inventory`).catch(() => ({ data: [] })),
      ]);
      setQuests(safeArray(questRes.data));
      setResources({
        npcs: safeArray(npcRes.data), locations: safeArray(locationRes.data), encounters: safeArray(encounterRes.data),
        maps: safeArray(mapRes.data), handouts: safeArray(handoutRes.data), rewards: safeArray(rewardRes.data),
      });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load quests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return quests.filter(quest => {
      if (filter === 'open' && !OPEN_STATUSES.has(quest.status)) return false;
      if (filter !== 'all' && filter !== 'open' && quest.status !== filter) return false;
      if (!term) return true;
      return [quest.title, quest.summary, quest.hook, quest.gm_notes].some(value => String(value || '').toLowerCase().includes(term));
    });
  }, [filter, quests, search]);

  const createQuest = async () => {
    if (!draft.title.trim() || saving) return;
    setSaving(true);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/quests`, { ...draft, title: draft.title.trim() });
      setQuests(prev => [response.data, ...prev]);
      setExpanded(prev => ({ ...prev, [response.data.id]: true }));
      setDraft(EMPTY_QUEST);
      setShowCreate(false);
      toast.success('Quest created');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not create quest');
    } finally {
      setSaving(false);
    }
  };

  const updateQuest = async (questId, patch, quiet = false) => {
    try {
      const response = await apiClient.put(`/campaigns/${campaignId}/quests/${questId}`, patch);
      setQuests(prev => prev.map(quest => quest.id === questId ? response.data : quest));
      if (!quiet && (patch.status || patch.is_pinned !== undefined)) toast.success('Quest updated');
      return response.data;
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update quest');
      return null;
    }
  };

  const deleteQuest = async (quest) => {
    if (!window.confirm(`Delete quest “${quest.title}”?`)) return;
    try {
      await apiClient.delete(`/campaigns/${campaignId}/quests/${quest.id}`);
      setQuests(prev => prev.filter(item => item.id !== quest.id));
      toast.success('Quest deleted');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not delete quest');
    }
  };

  const addObjective = async (questId) => {
    const title = String(objectiveDrafts[questId] || '').trim();
    if (!title) return;
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/quests/${questId}/objectives`, { title, status: 'upcoming', optional: false });
      setQuests(prev => prev.map(quest => quest.id === questId ? { ...quest, objectives: [...safeArray(quest.objectives), response.data] } : quest));
      setObjectiveDrafts(prev => ({ ...prev, [questId]: '' }));
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not add objective');
    }
  };

  const setObjectiveStatus = async (questId, objectiveId, status) => {
    try {
      const response = await apiClient.put(`/campaigns/${campaignId}/quests/${questId}/objectives/${objectiveId}`, { status });
      setQuests(prev => prev.map(quest => quest.id === questId ? response.data : quest));
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update objective');
    }
  };

  const removeObjective = async (questId, objectiveId) => {
    try {
      await apiClient.delete(`/campaigns/${campaignId}/quests/${questId}/objectives/${objectiveId}`);
      setQuests(prev => prev.map(quest => quest.id === questId ? { ...quest, objectives: safeArray(quest.objectives).filter(item => item.id !== objectiveId) } : quest));
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not remove objective');
    }
  };

  const patchLink = async (quest, type, itemId, add) => {
    if (!itemId) return;
    const existing = safeArray(quest[type.key]);
    const next = add ? [...new Set([...existing, itemId])] : existing.filter(id => id !== itemId);
    await updateQuest(quest.id, { [type.key]: next }, true);
  };

  const openLinked = (type, itemId) => {
    if (type.key === 'linked_encounter_ids') {
      try { localStorage.setItem(`gm.questEncounter.${campaignId}`, itemId); } catch { /* ignore */ }
    }
    if (onOpenTab) {
      onOpenTab(type.tab);
      return;
    }
    if (typeof document !== 'undefined') {
      const button = document.querySelector(`[data-testid="live-tool-${type.liveTool}"]`);
      button?.click?.();
    }
  };

  const openLive = () => {
    if (typeof window !== 'undefined') window.location.assign(`/gm-screen/${campaignId}`);
  };

  return (
    <div data-testid="quests-tab" style={shellStyle}>
      <header style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}>Campaign Prep</p>
          <h2 style={titleStyle}>Quests</h2>
          <p style={subtitleStyle}>Build possibilities, link what matters, then run any of it in Live Play.</p>
        </div>
        <div style={headerActionsStyle}>
          <button type="button" onClick={openLive} style={secondaryButtonStyle}><Monitor size={15} /> Live Play</button>
          <button type="button" onClick={() => setShowCreate(prev => !prev)} style={primaryButtonStyle}><Plus size={15} /> New Quest</button>
        </div>
      </header>

      <div style={toolbarStyle}>
        <label style={searchStyle}><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search quests" style={searchInputStyle} /></label>
        <select value={filter} onChange={event => setFilter(event.target.value)} style={selectStyle}>
          <option value="open">Open</option><option value="all">All</option>
          {STATUS_OPTIONS.map(status => <option key={status} value={status}>{nice(status)}</option>)}
        </select>
      </div>

      {showCreate && (
        <section style={createStyle}>
          <div style={twoColumnStyle}>
            <input value={draft.title} onChange={event => setDraft(prev => ({ ...prev, title: event.target.value }))} placeholder="Quest title" style={inputStyle} />
            <select value={draft.status} onChange={event => setDraft(prev => ({ ...prev, status: event.target.value }))} style={selectStyle}>{STATUS_OPTIONS.map(status => <option key={status} value={status}>{nice(status)}</option>)}</select>
          </div>
          <input value={draft.summary} onChange={event => setDraft(prev => ({ ...prev, summary: event.target.value }))} placeholder="Short GM summary" style={inputStyle} />
          <input value={draft.hook} onChange={event => setDraft(prev => ({ ...prev, hook: event.target.value }))} placeholder="Hook / how players find it" style={inputStyle} />
          <div style={buttonRowStyle}><button type="button" onClick={() => setShowCreate(false)} style={secondaryButtonStyle}>Cancel</button><button type="button" disabled={saving || !draft.title.trim()} onClick={createQuest} style={primaryButtonStyle}>Create</button></div>
        </section>
      )}

      <section style={listStyle}>
        {loading && <div style={emptyStyle}>Loading quests…</div>}
        {!loading && filtered.length === 0 && <div style={emptyStyle}>{quests.length ? 'No quests match.' : 'No quests yet.'}</div>}
        {filtered.map(quest => {
          const progress = progressFor(quest);
          const linkedCount = LINK_TYPES.reduce((total, type) => total + safeArray(quest[type.key]).length, 0);
          const isOpen = Boolean(expanded[quest.id]);
          return (
            <article key={quest.id} style={questCardStyle} data-testid={`quest-${quest.id}`}>
              <button type="button" onClick={() => setExpanded(prev => ({ ...prev, [quest.id]: !prev[quest.id] }))} style={questHeaderStyle}>
                <span>{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                <span style={{ minWidth: 0, display: 'grid', gap: 2, textAlign: 'left' }}>
                  <strong style={questTitleStyle}>{quest.title}</strong>
                  <span style={questMetaStyle}>{nice(quest.status)} · {progress.completed}/{progress.total} objectives · {linkedCount} links</span>
                </span>
                {quest.is_pinned && <Pin size={15} style={{ color: rq.red, marginLeft: 'auto' }} />}
              </button>

              {isOpen && (
                <div style={questBodyStyle}>
                  <div style={compactActionsStyle}>
                    <select value={quest.status || 'draft'} onChange={event => updateQuest(quest.id, { status: event.target.value })} style={smallSelectStyle}>{STATUS_OPTIONS.map(status => <option key={status} value={status}>{nice(status)}</option>)}</select>
                    <button type="button" onClick={() => updateQuest(quest.id, { is_pinned: !quest.is_pinned })} style={compactButtonStyle}><Pin size={13} /> {quest.is_pinned ? 'Unpin' : 'Pin'}</button>
                    <button type="button" onClick={() => deleteQuest(quest)} style={dangerButtonStyle}><Trash2 size={13} /> Delete</button>
                  </div>

                  {(quest.summary || quest.hook) && <section style={infoStripStyle}>{quest.summary && <p style={infoTextStyle}><strong>{quest.summary}</strong></p>}{quest.hook && <p style={mutedTextStyle}>{quest.hook}</p>}</section>}

                  <section style={sectionStyle}>
                    <div style={sectionHeaderStyle}><strong>Objectives</strong><span>{progress.resolved}/{progress.total}</span></div>
                    <div style={objectiveListStyle}>
                      {safeArray(quest.objectives).map(objective => (
                        <div key={objective.id} style={objectiveRowStyle(objective.status)}>
                          <button type="button" onClick={() => setObjectiveStatus(quest.id, objective.id, objective.status === 'completed' ? 'upcoming' : 'completed')} style={objectiveCheckStyle} title="Complete">
                            {objective.status === 'completed' ? <Check size={15} /> : objective.status === 'skipped' ? <SkipForward size={15} /> : <Circle size={15} />}
                          </button>
                          <span style={objectiveTitleStyle(objective.status)}>{objective.title}</span>
                          <button type="button" onClick={() => setObjectiveStatus(quest.id, objective.id, objective.status === 'skipped' ? 'upcoming' : 'skipped')} style={iconButtonStyle} title="Skip"><SkipForward size={13} /></button>
                          <button type="button" onClick={() => removeObjective(quest.id, objective.id)} style={iconButtonStyle} title="Remove"><Trash2 size={13} /></button>
                        </div>
                      ))}
                    </div>
                    <div style={addRowStyle}><input value={objectiveDrafts[quest.id] || ''} onChange={event => setObjectiveDrafts(prev => ({ ...prev, [quest.id]: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addObjective(quest.id); } }} placeholder="Add objective…" style={inputStyle} /><button type="button" onClick={() => addObjective(quest.id)} style={compactButtonStyle}><Plus size={14} /> Add</button></div>
                  </section>

                  <QuestLinks quest={quest} resources={resources} onPatch={patchLink} onOpen={openLinked} />

                  <details style={notesDetailsStyle}>
                    <summary style={notesSummaryStyle}>GM Notes</summary>
                    <textarea defaultValue={quest.gm_notes || ''} onBlur={event => { if (event.target.value !== (quest.gm_notes || '')) updateQuest(quest.id, { gm_notes: event.target.value }, true); }} placeholder="Anything you need to remember…" style={notesInputStyle} />
                  </details>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}

function QuestLinks({ quest, resources, onPatch, onOpen }) {
  return (
    <section style={sectionStyle} data-testid={`quest-links-${quest.id}`}>
      <div style={sectionHeaderStyle}><strong><Link2 size={14} /> Linked Content</strong><span>Click to open</span></div>
      <div style={linksGridStyle}>
        {LINK_TYPES.map(type => {
          const Icon = type.icon;
          const items = safeArray(resources[type.resourceKey]);
          const linkedIds = safeArray(quest[type.key]);
          const linked = linkedIds.map(id => items.find(item => item.id === id)).filter(Boolean);
          const available = items.filter(item => !linkedIds.includes(item.id));
          return (
            <div key={type.key} style={linkGroupStyle}>
              <div style={linkGroupHeaderStyle}><Icon size={14} /><strong>{type.label}</strong><span>{linked.length}</span></div>
              <div style={chipWrapStyle}>
                {linked.map(item => (
                  <span key={item.id} style={chipStyle}>
                    <button type="button" onClick={() => onOpen(type, item.id)} style={chipOpenStyle}>{type.name(item) || 'Untitled'}</button>
                    <button type="button" onClick={() => onPatch(quest, type, item.id, false)} style={chipRemoveStyle} title="Unlink">×</button>
                  </span>
                ))}
                {!linked.length && <span style={emptyChipStyle}>None</span>}
              </div>
              <div style={linkAddRowStyle}>
                <select defaultValue="" onChange={event => { const value = event.target.value; if (value) { onPatch(quest, type, value, true); event.target.value = ''; } }} style={linkSelectStyle} disabled={!available.length}>
                  <option value="">{available.length ? `+ Link ${type.label}` : `No more ${type.label}`}</option>
                  {available.map(item => <option key={item.id} value={item.id}>{type.name(item) || 'Untitled'}</option>)}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const shellStyle = { display: 'grid', gap: 9, color: rq.text, fontFamily: fontStack, minWidth: 0 };
const headerStyle = { background: rq.card, border: `1px solid ${rq.line}`, borderLeft: `6px solid ${rq.red}`, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' };
const eyebrowStyle = { margin: 0, color: rq.muted, fontSize: 9, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' };
const titleStyle = { margin: '2px 0 0', fontSize: 'clamp(25px, 4vw, 38px)', lineHeight: 1, color: rq.text, fontWeight: 950 };
const subtitleStyle = { margin: '5px 0 0', color: rq.soft, fontSize: 12, lineHeight: 1.35 };
const headerActionsStyle = { display: 'flex', gap: 6, flexWrap: 'wrap' };
const primaryButtonStyle = { minHeight: 34, border: 0, background: rq.red, color: '#fff', padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 950, cursor: 'pointer' };
const secondaryButtonStyle = { minHeight: 34, border: `1px solid ${rq.line}`, background: rq.panel, color: rq.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer' };
const toolbarStyle = { display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) minmax(110px, 180px)', gap: 6 };
const searchStyle = { minHeight: 36, display: 'flex', alignItems: 'center', gap: 7, background: rq.panel, border: `1px solid ${rq.line}`, padding: '0 9px' };
const searchInputStyle = { flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', color: rq.text };
const selectStyle = { minHeight: 36, background: rq.panel, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 8px' };
const createStyle = { display: 'grid', gap: 6, background: rq.panel, border: `1px solid ${rq.line}`, padding: 9 };
const twoColumnStyle = { display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) minmax(120px, 180px)', gap: 6 };
const inputStyle = { minHeight: 35, width: '100%', boxSizing: 'border-box', background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 9px' };
const buttonRowStyle = { display: 'flex', justifyContent: 'flex-end', gap: 6 };
const listStyle = { display: 'grid', gap: 6 };
const emptyStyle = { minHeight: 80, display: 'grid', placeItems: 'center', background: rq.panel, border: `1px dashed ${rq.line}`, color: rq.muted, fontSize: 12 };
const questCardStyle = { background: rq.panel, border: `1px solid ${rq.line}` };
const questHeaderStyle = { width: '100%', minHeight: 54, border: 0, background: rq.card, color: rq.text, padding: '8px 10px', display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr) auto', alignItems: 'center', gap: 7, cursor: 'pointer', fontFamily: fontStack };
const questTitleStyle = { fontSize: 14, color: rq.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const questMetaStyle = { color: rq.muted, fontSize: 10 };
const questBodyStyle = { display: 'grid', gap: 8, padding: 8 };
const compactActionsStyle = { display: 'flex', gap: 5, flexWrap: 'wrap' };
const smallSelectStyle = { minHeight: 31, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 7px', fontSize: 11, fontWeight: 850 };
const compactButtonStyle = { minHeight: 31, border: `1px solid ${rq.line}`, background: rq.bg, color: rq.text, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, fontWeight: 850 };
const dangerButtonStyle = { ...compactButtonStyle, color: '#ffb4b4' };
const infoStripStyle = { background: rq.bg, borderLeft: `4px solid ${rq.red}`, padding: 8, display: 'grid', gap: 3 };
const infoTextStyle = { margin: 0, color: rq.text, fontSize: 12, lineHeight: 1.35 };
const mutedTextStyle = { margin: 0, color: rq.muted, fontSize: 11, lineHeight: 1.35 };
const sectionStyle = { display: 'grid', gap: 6, background: rq.panel, border: `1px solid ${rq.line}`, padding: 8 };
const sectionHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, color: rq.text, fontSize: 11 };
const objectiveListStyle = { display: 'grid', gap: 4 };
const objectiveRowStyle = status => ({ minHeight: 34, display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr) 28px 28px', alignItems: 'center', gap: 3, background: rq.bg, border: `1px solid ${rq.line}`, opacity: status === 'skipped' ? 0.6 : 1 });
const objectiveCheckStyle = { width: 28, height: 28, border: 0, background: 'transparent', color: rq.text, display: 'grid', placeItems: 'center', cursor: 'pointer' };
const objectiveTitleStyle = status => ({ fontSize: 11, color: status === 'completed' ? rq.muted : rq.text, textDecoration: status === 'completed' ? 'line-through' : 'none' });
const iconButtonStyle = { width: 28, height: 28, border: 0, background: 'transparent', color: rq.muted, display: 'grid', placeItems: 'center', cursor: 'pointer' };
const addRowStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 5 };
const linksGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 5 };
const linkGroupStyle = { minWidth: 0, background: rq.bg, border: `1px solid ${rq.line}`, padding: 7, display: 'grid', gap: 5 };
const linkGroupHeaderStyle = { display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr) auto', alignItems: 'center', gap: 4, fontSize: 10, color: rq.soft };
const chipWrapStyle = { display: 'flex', flexWrap: 'wrap', gap: 4, minHeight: 25 };
const chipStyle = { display: 'inline-flex', minWidth: 0, maxWidth: '100%', border: `1px solid ${rq.line}`, background: rq.card };
const chipOpenStyle = { minHeight: 25, maxWidth: 170, border: 0, background: 'transparent', color: rq.text, padding: '0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', fontSize: 10, fontWeight: 850 };
const chipRemoveStyle = { width: 24, minHeight: 25, border: 0, borderLeft: `1px solid ${rq.line}`, background: 'transparent', color: rq.muted, cursor: 'pointer' };
const emptyChipStyle = { color: rq.muted, fontSize: 10, alignSelf: 'center' };
const linkAddRowStyle = { display: 'grid' };
const linkSelectStyle = { minHeight: 29, width: '100%', background: rq.panel, border: `1px solid ${rq.line}`, color: rq.soft, padding: '0 6px', fontSize: 10 };
const notesDetailsStyle = { background: rq.panel, border: `1px solid ${rq.line}` };
const notesSummaryStyle = { cursor: 'pointer', padding: 8, color: rq.soft, fontSize: 11, fontWeight: 900 };
const notesInputStyle = { width: '100%', minHeight: 90, boxSizing: 'border-box', border: 0, borderTop: `1px solid ${rq.line}`, background: rq.bg, color: rq.text, padding: 8, resize: 'vertical', fontSize: 11 };
