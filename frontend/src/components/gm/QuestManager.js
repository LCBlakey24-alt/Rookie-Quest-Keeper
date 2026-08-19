import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Circle, Link2, Monitor, Pin, Plus, Search, SkipForward, Swords, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const STATUS_OPTIONS = ['draft', 'available', 'active', 'completed', 'failed', 'archived'];
const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const rq = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', hover: '#444444', red: '#d00000',
  text: '#ffffff', soft: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.16)',
};

const emptyQuest = { title: '', summary: '', hook: '', status: 'available', gm_notes: '', objectives: [], linked_encounter_ids: [], is_pinned: false };

function nice(value = '') {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function objectiveProgress(quest) {
  const objectives = Array.isArray(quest?.objectives) ? quest.objectives : [];
  const completed = objectives.filter(item => item.status === 'completed').length;
  const skipped = objectives.filter(item => item.status === 'skipped').length;
  return { total: objectives.length, completed, skipped, resolved: completed + skipped };
}

export default function QuestManager({ campaignId, onOpenTab }) {
  const [quests, setQuests] = useState([]);
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState(emptyQuest);
  const [objectiveDrafts, setObjectiveDrafts] = useState({});
  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!campaignId) return;
    try {
      const [questRes, encounterRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/quests`),
        apiClient.get(`/campaigns/${campaignId}/combat-scenarios`).catch(() => ({ data: [] })),
      ]);
      setQuests(Array.isArray(questRes.data) ? questRes.data : []);
      setEncounters(Array.isArray(encounterRes.data) ? encounterRes.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load quests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [campaignId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return quests.filter(quest => {
      if (filter === 'open' && ['completed', 'failed', 'archived'].includes(quest.status)) return false;
      if (filter !== 'all' && filter !== 'open' && quest.status !== filter) return false;
      if (!term) return true;
      return [quest.title, quest.summary, quest.hook, quest.gm_notes].some(value => String(value || '').toLowerCase().includes(term));
    });
  }, [filter, quests, search]);

  const createQuest = async () => {
    if (!draft.title.trim()) return;
    setSaving(true);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/quests`, { ...draft, title: draft.title.trim() });
      setQuests(prev => [response.data, ...prev]);
      setExpanded(prev => ({ ...prev, [response.data.id]: true }));
      setDraft(emptyQuest);
      setShowCreate(false);
      toast.success('Quest created');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not create quest');
    } finally {
      setSaving(false);
    }
  };

  const updateQuest = async (questId, patch) => {
    try {
      const response = await apiClient.put(`/campaigns/${campaignId}/quests/${questId}`, patch);
      setQuests(prev => prev.map(quest => quest.id === questId ? response.data : quest));
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
    const title = (objectiveDrafts[questId] || '').trim();
    if (!title) return;
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/quests/${questId}/objectives`, { title, status: 'upcoming', optional: false });
      setQuests(prev => prev.map(quest => quest.id === questId ? { ...quest, objectives: [...(quest.objectives || []), response.data] } : quest));
      setObjectiveDrafts(prev => ({ ...prev, [questId]: '' }));
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not add objective');
    }
  };

  const setObjectiveStatus = async (questId, objectiveId, nextStatus) => {
    try {
      const response = await apiClient.put(`/campaigns/${campaignId}/quests/${questId}/objectives/${objectiveId}`, { status: nextStatus });
      setQuests(prev => prev.map(quest => quest.id === questId ? response.data : quest));
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update objective');
    }
  };

  const removeObjective = async (questId, objectiveId) => {
    try {
      await apiClient.delete(`/campaigns/${campaignId}/quests/${questId}/objectives/${objectiveId}`);
      setQuests(prev => prev.map(quest => quest.id === questId ? { ...quest, objectives: (quest.objectives || []).filter(item => item.id !== objectiveId) } : quest));
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not remove objective');
    }
  };

  const addEncounterLink = async (quest, encounterId) => {
    if (!encounterId) return;
    const links = [...new Set([...(quest.linked_encounter_ids || []), encounterId])];
    await updateQuest(quest.id, { linked_encounter_ids: links });
  };

  const removeEncounterLink = async (quest, encounterId) => {
    await updateQuest(quest.id, { linked_encounter_ids: (quest.linked_encounter_ids || []).filter(id => id !== encounterId) });
  };

  const openEncounter = (encounterId) => {
    try { localStorage.setItem(`gm.questEncounter.${campaignId}`, encounterId); } catch { /* ignore */ }
    if (onOpenTab) onOpenTab('combat');
    else if (typeof window !== 'undefined') window.location.assign(`/gm-screen/${campaignId}`);
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
          <p style={subtitleStyle}>Build what can happen. During play, open any quest and keep going as long as the table does.</p>
        </div>
        <div style={headerActionsStyle}>
          <button type="button" onClick={openLive} style={secondaryButtonStyle}><Monitor size={15} /> Live Play</button>
          <button type="button" onClick={() => setShowCreate(prev => !prev)} style={primaryButtonStyle}><Plus size={15} /> New Quest</button>
        </div>
      </header>

      <div style={toolbarStyle}>
        <label style={searchStyle}><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search quests" style={searchInputStyle} /></label>
        <select value={filter} onChange={event => setFilter(event.target.value)} style={selectStyle}>
          <option value="open">Open quests</option>
          <option value="all">All quests</option>
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
          <input value={draft.hook} onChange={event => setDraft(prev => ({ ...prev, hook: event.target.value }))} placeholder="Hook / how the party discovers it" style={inputStyle} />
          <div style={buttonRowStyle}><button type="button" onClick={() => setShowCreate(false)} style={secondaryButtonStyle}>Cancel</button><button type="button" disabled={saving || !draft.title.trim()} onClick={createQuest} style={primaryButtonStyle}>Create Quest</button></div>
        </section>
      )}

      <section style={listStyle}>
        {loading && <div style={emptyStyle}>Loading quests…</div>}
        {!loading && filtered.length === 0 && <div style={emptyStyle}>{quests.length ? 'No quests match this filter.' : 'No quests yet. Create one when the party has something they can pursue.'}</div>}
        {filtered.map(quest => (
          <QuestCard
            key={quest.id}
            quest={quest}
            encounters={encounters}
            expanded={Boolean(expanded[quest.id])}
            objectiveDraft={objectiveDrafts[quest.id] || ''}
            onToggle={() => setExpanded(prev => ({ ...prev, [quest.id]: !prev[quest.id] }))}
            onUpdate={patch => updateQuest(quest.id, patch)}
            onDelete={() => deleteQuest(quest)}
            onObjectiveDraft={value => setObjectiveDrafts(prev => ({ ...prev, [quest.id]: value }))}
            onAddObjective={() => addObjective(quest.id)}
            onObjectiveStatus={(objectiveId, nextStatus) => setObjectiveStatus(quest.id, objectiveId, nextStatus)}
            onRemoveObjective={objectiveId => removeObjective(quest.id, objectiveId)}
            onAddEncounter={encounterId => addEncounterLink(quest, encounterId)}
            onRemoveEncounter={encounterId => removeEncounterLink(quest, encounterId)}
            onOpenEncounter={openEncounter}
          />
        ))}
      </section>
    </div>
  );
}

function QuestCard({ quest, encounters, expanded, objectiveDraft, onToggle, onUpdate, onDelete, onObjectiveDraft, onAddObjective, onObjectiveStatus, onRemoveObjective, onAddEncounter, onRemoveEncounter, onOpenEncounter }) {
  const progress = objectiveProgress(quest);
  const linkedEncounters = (quest.linked_encounter_ids || []).map(id => encounters.find(item => item.id === id)).filter(Boolean);
  const availableEncounters = encounters.filter(item => !(quest.linked_encounter_ids || []).includes(item.id));

  return (
    <article style={questCardStyle} data-testid={`quest-${quest.id}`}>
      <button type="button" onClick={onToggle} style={questHeaderStyle}>
        <span style={expandIconStyle}>{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
        <span style={{ minWidth: 0, display: 'grid', gap: 3 }}>
          <strong style={questTitleStyle}>{quest.title}</strong>
          <span style={questMetaStyle}>{nice(quest.status)} · {progress.completed}/{progress.total} objectives · {linkedEncounters.length} encounter{linkedEncounters.length === 1 ? '' : 's'}</span>
        </span>
        {quest.is_pinned && <Pin size={15} style={{ color: rq.red, marginLeft: 'auto' }} />}
      </button>

      {expanded && (
        <div style={questBodyStyle}>
          <div style={compactActionsStyle}>
            <select value={quest.status || 'draft'} onChange={event => onUpdate({ status: event.target.value })} style={smallSelectStyle}>{STATUS_OPTIONS.map(status => <option key={status} value={status}>{nice(status)}</option>)}</select>
            <button type="button" onClick={() => onUpdate({ is_pinned: !quest.is_pinned })} style={compactButtonStyle}><Pin size={13} /> {quest.is_pinned ? 'Unpin' : 'Pin'}</button>
            <button type="button" onClick={onDelete} style={dangerButtonStyle}><Trash2 size={13} /> Delete</button>
          </div>

          {(quest.summary || quest.hook) && <section style={infoStripStyle}>{quest.summary && <p style={infoTextStyle}><strong>Summary:</strong> {quest.summary}</p>}{quest.hook && <p style={infoTextStyle}><strong>Hook:</strong> {quest.hook}</p>}</section>}

          <section style={sectionStyle}>
            <div style={sectionHeaderStyle}><strong>Objectives</strong><span>{progress.resolved}/{progress.total} resolved</span></div>
            <div style={objectiveListStyle}>
              {(quest.objectives || []).map(objective => (
                <div key={objective.id} style={objectiveRowStyle(objective.status)}>
                  <button type="button" title="Toggle complete" onClick={() => onObjectiveStatus(objective.id, objective.status === 'completed' ? 'upcoming' : 'completed')} style={objectiveCheckStyle}>
                    {objective.status === 'completed' ? <Check size={15} /> : objective.status === 'skipped' ? <SkipForward size={15} /> : <Circle size={15} />}
                  </button>
                  <span style={objectiveTitleStyle(objective.status)}>{objective.title}{objective.optional ? ' (optional)' : ''}</span>
                  <button type="button" onClick={() => onObjectiveStatus(objective.id, objective.status === 'skipped' ? 'upcoming' : 'skipped')} style={iconButtonStyle} title="Skip objective"><SkipForward size={13} /></button>
                  <button type="button" onClick={() => onRemoveObjective(objective.id)} style={iconButtonStyle} title="Remove objective"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
            <div style={addRowStyle}><input value={objectiveDraft} onChange={event => onObjectiveDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); onAddObjective(); } }} placeholder="Add objective…" style={inputStyle} /><button type="button" onClick={onAddObjective} style={compactButtonStyle}><Plus size={14} /> Add</button></div>
          </section>

          <section style={sectionStyle}>
            <div style={sectionHeaderStyle}><strong>Linked Encounters</strong><span>{linkedEncounters.length}</span></div>
            <div style={linkListStyle}>
              {linkedEncounters.map(encounter => (
                <div key={encounter.id} style={linkedRowStyle}>
                  <Swords size={14} />
                  <strong style={{ flex: 1 }}>{encounter.name || encounter.title || 'Encounter'}</strong>
                  <button type="button" onClick={() => onOpenEncounter(encounter.id)} style={runButtonStyle}><Swords size={13} /> Open</button>
                  <button type="button" onClick={() => onRemoveEncounter(encounter.id)} style={iconButtonStyle}><Trash2 size={13} /></button>
                </div>
              ))}
              {!linkedEncounters.length && <span style={mutedTextStyle}>No encounters linked yet.</span>}
            </div>
            {availableEncounters.length > 0 && <div style={addRowStyle}><select defaultValue="" onChange={event => { onAddEncounter(event.target.value); event.target.value = ''; }} style={selectStyle}><option value="">Link an encounter…</option>{availableEncounters.map(encounter => <option key={encounter.id} value={encounter.id}>{encounter.name || encounter.title || 'Encounter'}</option>)}</select><Link2 size={15} style={{ color: rq.muted }} /></div>}
          </section>

          <label style={notesLabelStyle}>GM Notes<textarea defaultValue={quest.gm_notes || ''} onBlur={event => { if (event.target.value !== (quest.gm_notes || '')) onUpdate({ gm_notes: event.target.value }); }} placeholder="Private notes…" style={textareaStyle} /></label>
        </div>
      )}
    </article>
  );
}

const shellStyle = { display: 'grid', gap: 12, color: rq.text, fontFamily: fontStack };
const headerStyle = { background: rq.card, border: `1px solid ${rq.line}`, borderLeft: `6px solid ${rq.red}`, padding: 14, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' };
const eyebrowStyle = { margin: 0, color: rq.muted, fontSize: 10, fontWeight: 950, letterSpacing: '0.11em', textTransform: 'uppercase' };
const titleStyle = { margin: '2px 0 0', color: rq.text, fontSize: 'clamp(26px, 4vw, 40px)', lineHeight: 1, fontWeight: 950 };
const subtitleStyle = { margin: '6px 0 0', color: rq.soft, fontSize: 13, lineHeight: 1.4 };
const headerActionsStyle = { display: 'flex', gap: 7, flexWrap: 'wrap' };
const toolbarStyle = { display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(150px, 220px)', gap: 8 };
const searchStyle = { background: rq.panel, border: `1px solid ${rq.line}`, display: 'flex', gap: 8, alignItems: 'center', padding: '0 10px', color: rq.muted };
const searchInputStyle = { width: '100%', minHeight: 38, border: 0, outline: 0, background: 'transparent', color: rq.text, fontFamily: fontStack };
const selectStyle = { minHeight: 38, background: rq.panel, color: rq.text, border: `1px solid ${rq.line}`, padding: '0 9px', fontFamily: fontStack };
const smallSelectStyle = { ...selectStyle, minHeight: 32, fontSize: 12 };
const inputStyle = { minHeight: 38, width: '100%', background: rq.bg, color: rq.text, border: `1px solid ${rq.line}`, padding: '0 10px', fontFamily: fontStack, boxSizing: 'border-box' };
const textareaStyle = { minHeight: 82, width: '100%', resize: 'vertical', background: rq.bg, color: rq.text, border: `1px solid ${rq.line}`, padding: 9, fontFamily: fontStack, boxSizing: 'border-box' };
const primaryButtonStyle = { minHeight: 36, border: 0, background: rq.red, color: '#fff', padding: '0 11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { ...primaryButtonStyle, background: rq.bg, border: `1px solid ${rq.line}` };
const createStyle = { background: rq.panel, border: `1px solid ${rq.line}`, padding: 12, display: 'grid', gap: 8 };
const twoColumnStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(140px, 200px)', gap: 8 };
const buttonRowStyle = { display: 'flex', justifyContent: 'flex-end', gap: 7 };
const listStyle = { display: 'grid', gap: 7 };
const emptyStyle = { padding: 26, background: rq.panel, border: `1px solid ${rq.line}`, color: rq.muted, textAlign: 'center' };
const questCardStyle = { background: rq.panel, border: `1px solid ${rq.line}` };
const questHeaderStyle = { width: '100%', minHeight: 58, background: 'transparent', color: rq.text, border: 0, padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', cursor: 'pointer', fontFamily: fontStack };
const expandIconStyle = { color: rq.muted, display: 'grid', placeItems: 'center' };
const questTitleStyle = { fontSize: 15, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const questMetaStyle = { color: rq.muted, fontSize: 11 };
const questBodyStyle = { borderTop: `1px solid ${rq.line}`, padding: 10, display: 'grid', gap: 10 };
const compactActionsStyle = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' };
const compactButtonStyle = { minHeight: 32, border: `1px solid ${rq.line}`, background: rq.card, color: rq.text, padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontWeight: 850, fontSize: 12, fontFamily: fontStack };
const dangerButtonStyle = { ...compactButtonStyle, marginLeft: 'auto', color: '#ffb2b2' };
const infoStripStyle = { background: rq.bg, borderLeft: `4px solid ${rq.red}`, padding: '8px 10px', display: 'grid', gap: 4 };
const infoTextStyle = { margin: 0, color: rq.soft, fontSize: 12, lineHeight: 1.4 };
const sectionStyle = { display: 'grid', gap: 7 };
const sectionHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 8, color: rq.text, fontSize: 12 };
const objectiveListStyle = { display: 'grid', gap: 4 };
const objectiveRowStyle = (status) => ({ minHeight: 36, display: 'flex', alignItems: 'center', gap: 7, padding: '0 7px', background: rq.bg, borderLeft: `4px solid ${status === 'completed' ? '#39a96b' : status === 'skipped' ? rq.muted : rq.red}` });
const objectiveCheckStyle = { width: 28, height: 28, display: 'grid', placeItems: 'center', border: 0, background: 'transparent', color: rq.text, cursor: 'pointer' };
const objectiveTitleStyle = (status) => ({ flex: 1, minWidth: 0, fontSize: 12, color: status === 'skipped' ? rq.muted : rq.text, textDecoration: status === 'completed' ? 'line-through' : 'none' });
const iconButtonStyle = { width: 28, height: 28, display: 'grid', placeItems: 'center', border: `1px solid ${rq.line}`, background: rq.card, color: rq.soft, cursor: 'pointer' };
const addRowStyle = { display: 'flex', gap: 6, alignItems: 'center' };
const linkListStyle = { display: 'grid', gap: 4 };
const linkedRowStyle = { minHeight: 36, display: 'flex', alignItems: 'center', gap: 7, background: rq.bg, padding: '0 7px', fontSize: 12 };
const runButtonStyle = { ...compactButtonStyle, minHeight: 28, background: rq.red, borderColor: rq.red };
const mutedTextStyle = { color: rq.muted, fontSize: 12 };
const notesLabelStyle = { color: rq.muted, fontSize: 10, fontWeight: 950, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'grid', gap: 5 };
