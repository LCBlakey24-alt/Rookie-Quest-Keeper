import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, ChevronRight, Clock, Flag, Monitor, Plus, ScrollText, Swords, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "Germania One", Georgia, serif)';

const rq = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  hover: '#444444',
  red: '#d00000',
  redSoft: 'rgba(208,0,0,0.2)',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.74)',
  muted: 'rgba(255,255,255,0.58)',
  line: 'rgba(255,255,255,0.16)',
};

const ARC_TYPES = [
  { id: 'main', label: 'Main Arc' },
  { id: 'side', label: 'Side Arc' },
  { id: 'character', label: 'Character Arc' },
  { id: 'faction', label: 'Faction Arc' },
  { id: 'mystery', label: 'Mystery' },
];

const ARC_STATUS = [
  { id: 'planning', label: 'Planning' },
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'completed', label: 'Completed' },
];

const CHAPTER_STATUS = [
  { id: 'planned', label: 'Planned' },
  { id: 'prepped', label: 'Prepped' },
  { id: 'played', label: 'Played' },
  { id: 'skipped', label: 'Skipped' },
];

const COMBAT_STATUS = [
  { id: 'planned', label: 'Planned' },
  { id: 'ready', label: 'Ready' },
  { id: 'ran', label: 'Ran' },
  { id: 'skipped', label: 'Skipped' },
];

const emptyArc = {
  title: '',
  description: '',
  arc_type: 'main',
  status: 'planning',
  gm_notes: '',
};

const emptyChapter = {
  title: '',
  session_number: '',
  status: 'planned',
  summary: '',
  prep_notes: '',
  scenes: [],
  combats: [],
};

const emptyCombat = {
  title: '',
  status: 'planned',
  trigger: '',
  enemy_notes: '',
  map_notes: '',
  scenario_id: '',
};

function getSessionFocus(arcs) {
  const activeArc = arcs.find(arc => arc.status === 'active') || arcs.find(arc => arc.status !== 'completed') || arcs[0] || null;
  if (!activeArc) return { arc: null, chapter: null, scenes: 0, combats: 0, readyCombats: 0 };
  const chapters = activeArc.chapters || [];
  const chapter = chapters.find(item => item.status === 'prepped') || chapters.find(item => item.status === 'planned') || chapters[0] || null;
  const combats = chapter?.combats || [];
  return {
    arc: activeArc,
    chapter,
    scenes: chapter?.scenes?.length || 0,
    combats: combats.length,
    readyCombats: combats.filter(combat => combat.status === 'ready').length,
  };
}

export default function StoryArcTracker({ campaignId, onOpenTab }) {
  const [arcs, setArcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [arcDraft, setArcDraft] = useState(emptyArc);
  const [chapterDrafts, setChapterDrafts] = useState({});
  const [showArcForm, setShowArcForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadArcs = async () => {
    if (!campaignId) return;
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/story-arcs`);
      setArcs(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load story arcs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadArcs(); }, [campaignId]);

  const filteredArcs = useMemo(() => {
    if (filter === 'all') return arcs;
    return arcs.filter(arc => arc.status === filter || arc.arc_type === filter);
  }, [arcs, filter]);

  const stats = useMemo(() => {
    const chapterCount = arcs.reduce((sum, arc) => sum + (arc.chapters?.length || 0), 0);
    const playedCount = arcs.reduce((sum, arc) => sum + (arc.chapters || []).filter(chapter => chapter.status === 'played').length, 0);
    const combatCount = arcs.reduce((sum, arc) => sum + (arc.chapters || []).reduce((chapterSum, chapter) => chapterSum + (chapter.combats?.length || 0), 0), 0);
    return { arcs: arcs.length, chapters: chapterCount, played: playedCount, active: arcs.filter(arc => arc.status === 'active').length, combats: combatCount };
  }, [arcs]);

  const focus = useMemo(() => getSessionFocus(arcs), [arcs]);

  const goToTab = (tabId) => {
    if (onOpenTab) {
      onOpenTab(tabId);
      return;
    }
    if (typeof document !== 'undefined') {
      document.querySelector(`[data-testid="${tabId}-tab"]`)?.click();
    }
  };

  const openLivePlay = () => {
    if (typeof window !== 'undefined' && campaignId) window.location.assign(`/gm-screen/${campaignId}`);
  };

  const createArc = async () => {
    if (!arcDraft.title.trim()) return;
    setSaving(true);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/story-arcs`, arcDraft);
      setArcs(prev => [...prev, response.data]);
      setExpanded(prev => ({ ...prev, [response.data.id]: true }));
      setArcDraft(emptyArc);
      setShowArcForm(false);
      toast.success('Story arc created');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not create story arc');
    } finally {
      setSaving(false);
    }
  };

  const updateArc = async (arcId, updates) => {
    try {
      const response = await apiClient.put(`/campaigns/${campaignId}/story-arcs/${arcId}`, updates);
      setArcs(prev => prev.map(arc => arc.id === arcId ? response.data : arc));
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update story arc');
    }
  };

  const deleteArc = async (arcId) => {
    if (!window.confirm('Delete this story arc and its chapters?')) return;
    try {
      await apiClient.delete(`/campaigns/${campaignId}/story-arcs/${arcId}`);
      setArcs(prev => prev.filter(arc => arc.id !== arcId));
      toast.success('Story arc deleted');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not delete story arc');
    }
  };

  const addChapter = async (arcId) => {
    const draft = chapterDrafts[arcId] || emptyChapter;
    if (!draft.title.trim()) return;
    try {
      await apiClient.post(`/campaigns/${campaignId}/story-arcs/${arcId}/chapters`, draft);
      setChapterDrafts(prev => ({ ...prev, [arcId]: emptyChapter }));
      await loadArcs();
      toast.success('Chapter added');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not add chapter');
    }
  };

  const updateChapter = async (arcId, chapterId, updates) => {
    try {
      const response = await apiClient.put(`/campaigns/${campaignId}/story-arcs/${arcId}/chapters/${chapterId}`, updates);
      setArcs(prev => prev.map(arc => arc.id === arcId ? response.data : arc));
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update chapter');
    }
  };

  const deleteChapter = async (arcId, chapterId) => {
    if (!window.confirm('Delete this chapter/session?')) return;
    try {
      await apiClient.delete(`/campaigns/${campaignId}/story-arcs/${arcId}/chapters/${chapterId}`);
      await loadArcs();
      toast.success('Chapter deleted');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not delete chapter');
    }
  };

  const updateChapterDraft = (arcId, updates) => {
    setChapterDrafts(prev => ({ ...prev, [arcId]: { ...(prev[arcId] || emptyChapter), ...updates } }));
  };

  return (
    <div style={shellStyle} data-testid="story-arcs-tab">
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>GM Campaign Structure</p>
          <h2 style={titleStyle}>Story Arcs</h2>
          <p style={subtitleStyle}>Organise the campaign like Fight Club style books: story arcs, chapters as sessions, scene notes, and planned combat beats inside each chapter.</p>
        </div>
        <button type="button" onClick={() => setShowArcForm(prev => !prev)} style={primaryButtonStyle}><Plus size={16} /> New Arc</button>
      </header>

      <section style={statsGridStyle}>
        <StatCard icon={BookOpen} label="Arcs" value={stats.arcs} />
        <StatCard icon={ScrollText} label="Chapters" value={stats.chapters} />
        <StatCard icon={Swords} label="Combats" value={stats.combats} />
        <StatCard icon={Check} label="Played" value={stats.played} />
      </section>

      <SessionFocusPanel
        focus={focus}
        onNewArc={() => setShowArcForm(true)}
        onTonight={() => goToTab('tonight')}
        onEncounters={() => goToTab('combat')}
        onLive={openLivePlay}
      />

      <section style={ruleBoxStyle}>
        <strong>Import rule:</strong> Use this for campaign structure and session combat planning. Detailed stat blocks still belong in Encounters/Combat; this section stores when, why, and how each fight fits the chapter.
      </section>

      <div style={toolbarStyle}>
        <select value={filter} onChange={event => setFilter(event.target.value)} style={inputStyle}>
          <option value="all">All arcs</option>
          {ARC_STATUS.map(status => <option key={status.id} value={status.id}>{status.label}</option>)}
          {ARC_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
        </select>
        <button type="button" onClick={loadArcs} style={secondaryButtonStyle}>Refresh</button>
      </div>

      {showArcForm && (
        <section style={formStyle}>
          <h3 style={sectionTitleStyle}>Create story arc</h3>
          <input value={arcDraft.title} onChange={event => setArcDraft(prev => ({ ...prev, title: event.target.value }))} placeholder="Arc title, e.g. The Balderin Secret" style={inputStyle} />
          <textarea value={arcDraft.description} onChange={event => setArcDraft(prev => ({ ...prev, description: event.target.value }))} placeholder="What is this arc about?" style={textareaStyle} />
          <div style={twoColumnStyle}>
            <select value={arcDraft.arc_type} onChange={event => setArcDraft(prev => ({ ...prev, arc_type: event.target.value }))} style={inputStyle}>{ARC_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}</select>
            <select value={arcDraft.status} onChange={event => setArcDraft(prev => ({ ...prev, status: event.target.value }))} style={inputStyle}>{ARC_STATUS.map(status => <option key={status.id} value={status.id}>{status.label}</option>)}</select>
          </div>
          <textarea value={arcDraft.gm_notes} onChange={event => setArcDraft(prev => ({ ...prev, gm_notes: event.target.value }))} placeholder="Private GM notes, secrets, open questions..." style={textareaStyle} />
          <div style={buttonRowStyle}>
            <button type="button" onClick={() => setShowArcForm(false)} style={secondaryButtonStyle}>Cancel</button>
            <button type="button" onClick={createArc} disabled={saving || !arcDraft.title.trim()} style={primaryButtonStyle}>Create Arc</button>
          </div>
        </section>
      )}

      <section style={arcListStyle}>
        {loading && <div style={emptyStyle}>Loading story arcs...</div>}
        {!loading && filteredArcs.length === 0 && <div style={emptyStyle}>No story arcs yet. Create one for your next campaign thread.</div>}
        {filteredArcs.map(arc => (
          <ArcCard
            key={arc.id}
            arc={arc}
            expanded={Boolean(expanded[arc.id])}
            onToggle={() => setExpanded(prev => ({ ...prev, [arc.id]: !prev[arc.id] }))}
            onUpdate={updates => updateArc(arc.id, updates)}
            onDelete={() => deleteArc(arc.id)}
            chapterDraft={chapterDrafts[arc.id] || emptyChapter}
            updateChapterDraft={updates => updateChapterDraft(arc.id, updates)}
            addChapter={() => addChapter(arc.id)}
            updateChapter={(chapterId, updates) => updateChapter(arc.id, chapterId, updates)}
            deleteChapter={(chapterId) => deleteChapter(arc.id, chapterId)}
          />
        ))}
      </section>
    </div>
  );
}

function SessionFocusPanel({ focus, onNewArc, onTonight, onEncounters, onLive }) {
  if (!focus.arc) {
    return (
      <section style={focusPanelStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}>Current Session Focus</p>
          <h3 style={focusTitleStyle}>No story arc selected yet</h3>
          <p style={focusTextStyle}>Create your first arc, then add chapters/sessions inside it. Tonight's Session will use the active arc and next planned/prepped chapter.</p>
        </div>
        <button type="button" onClick={onNewArc} style={primaryButtonStyle}><Plus size={15} /> Create Arc</button>
      </section>
    );
  }

  return (
    <section style={focusPanelStyle}>
      <div style={focusMainStyle}>
        <p style={eyebrowStyle}>Current Session Focus</p>
        <h3 style={focusTitleStyle}>{focus.arc.title}</h3>
        <p style={focusTextStyle}>{focus.chapter ? `Next chapter: ${focus.chapter.title}` : 'No chapter selected yet. Add a chapter/session to this arc.'}</p>
      </div>
      <div style={focusMetricsStyle}>
        <FocusMetric icon={ScrollText} label="Scenes" value={focus.scenes} />
        <FocusMetric icon={Swords} label="Combats" value={focus.combats} />
        <FocusMetric icon={Check} label="Ready" value={focus.readyCombats} />
      </div>
      <div style={focusActionsStyle}>
        <button type="button" onClick={onTonight} style={secondaryButtonStyle}><Clock size={15} /> Tonight</button>
        <button type="button" onClick={onEncounters} style={secondaryButtonStyle}><Swords size={15} /> Encounters</button>
        <button type="button" onClick={onLive} style={primaryButtonStyle}><Monitor size={15} /> Live Play</button>
      </div>
    </section>
  );
}

function FocusMetric({ icon: Icon, label, value }) {
  return <div style={focusMetricStyle}><Icon size={16} /><strong>{value}</strong><span>{label}</span></div>;
}

function ArcCard({ arc, expanded, onToggle, onUpdate, onDelete, chapterDraft, updateChapterDraft, addChapter, updateChapter, deleteChapter }) {
  const chapters = arc.chapters || [];
  const played = chapters.filter(chapter => chapter.status === 'played').length;
  const combatCount = chapters.reduce((sum, chapter) => sum + (chapter.combats?.length || 0), 0);
  const typeLabel = ARC_TYPES.find(type => type.id === arc.arc_type)?.label || arc.arc_type || 'Arc';
  const statusLabel = ARC_STATUS.find(status => status.id === arc.status)?.label || arc.status || 'Planning';

  return (
    <article style={arcCardStyle}>
      <button type="button" onClick={onToggle} style={arcHeaderStyle}>
        {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={arcTitleStyle}>{arc.title}</strong>
          <span style={arcMetaStyle}>{typeLabel} · {statusLabel} · {played}/{chapters.length} chapters played · {combatCount} combats</span>
        </div>
        <span style={arcStatusStyle}>{statusLabel}</span>
      </button>

      {expanded && (
        <div style={arcBodyStyle}>
          <div style={twoColumnStyle}>
            <label style={fieldStyle}>Arc status<select value={arc.status || 'planning'} onChange={event => onUpdate({ status: event.target.value })} style={inputStyle}>{ARC_STATUS.map(status => <option key={status.id} value={status.id}>{status.label}</option>)}</select></label>
            <label style={fieldStyle}>Arc type<select value={arc.arc_type || 'main'} onChange={event => onUpdate({ arc_type: event.target.value })} style={inputStyle}>{ARC_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label>
          </div>

          <EditableText label="Arc summary" value={arc.description || ''} onSave={value => onUpdate({ description: value })} placeholder="Arc summary..." />
          <EditableText label="GM notes" value={arc.gm_notes || ''} onSave={value => onUpdate({ gm_notes: value })} placeholder="Private notes, secrets, clues, unresolved questions..." />

          <section style={chapterShellStyle}>
            <div style={chapterHeaderStyle}>
              <h3 style={sectionTitleStyle}>Chapters / Sessions</h3>
              <button type="button" onClick={onDelete} style={dangerButtonStyle}><Trash2 size={14} /> Delete Arc</button>
            </div>

            <div style={chapterFormStyle}>
              <input value={chapterDraft.title} onChange={event => updateChapterDraft({ title: event.target.value })} placeholder="Chapter/session title" style={inputStyle} />
              <div style={twoColumnStyle}>
                <input value={chapterDraft.session_number} onChange={event => updateChapterDraft({ session_number: event.target.value })} placeholder="Session #" style={inputStyle} />
                <select value={chapterDraft.status} onChange={event => updateChapterDraft({ status: event.target.value })} style={inputStyle}>{CHAPTER_STATUS.map(status => <option key={status.id} value={status.id}>{status.label}</option>)}</select>
              </div>
              <textarea value={chapterDraft.summary} onChange={event => updateChapterDraft({ summary: event.target.value })} placeholder="What should happen in this chapter/session?" style={textareaStyle} />
              <button type="button" onClick={addChapter} disabled={!chapterDraft.title.trim()} style={primaryButtonStyle}><Plus size={14} /> Add Chapter</button>
            </div>

            {chapters.length === 0 && <div style={emptyStyle}>No chapters yet. Add sessions inside this arc.</div>}
            {chapters.map(chapter => <ChapterCard key={chapter.id} chapter={chapter} onUpdate={updates => updateChapter(chapter.id, updates)} onDelete={() => deleteChapter(chapter.id)} />)}
          </section>
        </div>
      )}
    </article>
  );
}

function EditableText({ label, value, onSave, placeholder }) {
  const [draft, setDraft] = useState(value || '');
  useEffect(() => setDraft(value || ''), [value]);
  return (
    <label style={fieldStyle}>{label}
      <textarea value={draft} onChange={event => setDraft(event.target.value)} onBlur={() => onSave(draft)} placeholder={placeholder} style={textareaStyle} />
    </label>
  );
}

function ChapterCard({ chapter, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState(chapter.summary || '');
  const [prepNotes, setPrepNotes] = useState(chapter.prep_notes || '');
  const [scenesText, setScenesText] = useState((chapter.scenes || []).map(scene => scene.title || scene).join('\n'));
  const [combatDraft, setCombatDraft] = useState(emptyCombat);

  useEffect(() => {
    setSummary(chapter.summary || '');
    setPrepNotes(chapter.prep_notes || '');
    setScenesText((chapter.scenes || []).map(scene => scene.title || scene).join('\n'));
  }, [chapter]);

  const saveScenes = () => {
    const scenes = scenesText.split('\n').map(line => line.trim()).filter(Boolean).map((title, index) => ({ id: `scene-${index + 1}`, title }));
    onUpdate({ scenes });
  };

  const addCombat = () => {
    if (!combatDraft.title.trim()) return;
    const nextCombat = {
      ...combatDraft,
      id: `combat-${Date.now()}`,
      title: combatDraft.title.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onUpdate({ combats: [...(chapter.combats || []), nextCombat] });
    setCombatDraft(emptyCombat);
  };

  const updateCombat = (combatId, updates) => {
    const combats = (chapter.combats || []).map(combat => combat.id === combatId ? { ...combat, ...updates, updated_at: new Date().toISOString() } : combat);
    onUpdate({ combats });
  };

  const deleteCombat = (combatId) => {
    const combats = (chapter.combats || []).filter(combat => combat.id !== combatId);
    onUpdate({ combats });
  };

  const readyCombats = (chapter.combats || []).filter(combat => combat.status === 'ready').length;

  return (
    <article style={chapterCardStyle}>
      <button type="button" onClick={() => setOpen(prev => !prev)} style={chapterTopStyle}>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong>{chapter.title}</strong>
          <span>{chapter.session_number ? `Session ${chapter.session_number}` : 'Unnumbered session'} · {chapter.status || 'planned'} · {(chapter.scenes || []).length} scenes · {(chapter.combats || []).length} combats</span>
        </div>
        {readyCombats > 0 && <span style={miniReadyBadgeStyle}>{readyCombats} ready</span>}
      </button>
      {open && (
        <div style={chapterBodyStyle}>
          <div style={twoColumnStyle}>
            <label style={fieldStyle}>Session #<input value={chapter.session_number || ''} onChange={event => onUpdate({ session_number: event.target.value })} style={inputStyle} /></label>
            <label style={fieldStyle}>Status<select value={chapter.status || 'planned'} onChange={event => onUpdate({ status: event.target.value })} style={inputStyle}>{CHAPTER_STATUS.map(status => <option key={status.id} value={status.id}>{status.label}</option>)}</select></label>
          </div>
          <label style={fieldStyle}>Chapter summary<textarea value={summary} onChange={event => setSummary(event.target.value)} onBlur={() => onUpdate({ summary })} style={textareaStyle} /></label>
          <label style={fieldStyle}>Prep notes<textarea value={prepNotes} onChange={event => setPrepNotes(event.target.value)} onBlur={() => onUpdate({ prep_notes: prepNotes })} placeholder="NPCs present, clues, maps, combats, reminders..." style={textareaStyle} /></label>
          <label style={fieldStyle}>Scenes, one per line<textarea value={scenesText} onChange={event => setScenesText(event.target.value)} onBlur={saveScenes} placeholder="Opening recap\nTravel complication\nNPC meeting\nCombat\nCliffhanger" style={textareaStyle} /></label>

          <section style={combatShellStyle}>
            <div style={chapterHeaderStyle}>
              <h4 style={combatTitleStyle}><Swords size={15} /> Combat Beats</h4>
              <span style={combatHintStyle}>Plan the fight here; build full stat details in Encounters.</span>
            </div>

            <div style={combatFormStyle}>
              <input value={combatDraft.title} onChange={event => setCombatDraft(prev => ({ ...prev, title: event.target.value }))} placeholder="Combat title, e.g. Vampire spawn ambush" style={inputStyle} />
              <div style={twoColumnStyle}>
                <select value={combatDraft.status} onChange={event => setCombatDraft(prev => ({ ...prev, status: event.target.value }))} style={inputStyle}>{COMBAT_STATUS.map(status => <option key={status.id} value={status.id}>{status.label}</option>)}</select>
                <input value={combatDraft.scenario_id} onChange={event => setCombatDraft(prev => ({ ...prev, scenario_id: event.target.value }))} placeholder="Linked encounter/scenario ID optional" style={inputStyle} />
              </div>
              <textarea value={combatDraft.trigger} onChange={event => setCombatDraft(prev => ({ ...prev, trigger: event.target.value }))} placeholder="Trigger: what starts this fight?" style={smallTextareaStyle} />
              <div style={twoColumnStyle}>
                <textarea value={combatDraft.enemy_notes} onChange={event => setCombatDraft(prev => ({ ...prev, enemy_notes: event.target.value }))} placeholder="Enemies / tactics / waves" style={smallTextareaStyle} />
                <textarea value={combatDraft.map_notes} onChange={event => setCombatDraft(prev => ({ ...prev, map_notes: event.target.value }))} placeholder="Map / terrain / visibility notes" style={smallTextareaStyle} />
              </div>
              <button type="button" onClick={addCombat} disabled={!combatDraft.title.trim()} style={primaryButtonStyle}><Plus size={14} /> Add Combat Beat</button>
            </div>

            {(chapter.combats || []).length === 0 && <div style={emptyCombatStyle}>No combat planned for this chapter yet.</div>}
            {(chapter.combats || []).map(combat => (
              <CombatBeatCard key={combat.id} combat={combat} onUpdate={updates => updateCombat(combat.id, updates)} onDelete={() => deleteCombat(combat.id)} />
            ))}
          </section>

          <button type="button" onClick={onDelete} style={dangerButtonStyle}><Trash2 size={14} /> Delete Chapter</button>
        </div>
      )}
    </article>
  );
}

function CombatBeatCard({ combat, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <article style={combatCardStyle}>
      <button type="button" onClick={() => setOpen(prev => !prev)} style={combatTopStyle}>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong>{combat.title}</strong>
          <span>{combat.status || 'planned'}{combat.scenario_id ? ` · linked: ${combat.scenario_id}` : ''}</span>
        </div>
      </button>
      {open && (
        <div style={combatBodyStyle}>
          <div style={twoColumnStyle}>
            <label style={fieldStyle}>Status<select value={combat.status || 'planned'} onChange={event => onUpdate({ status: event.target.value })} style={inputStyle}>{COMBAT_STATUS.map(status => <option key={status.id} value={status.id}>{status.label}</option>)}</select></label>
            <label style={fieldStyle}>Encounter/scenario ID<input value={combat.scenario_id || ''} onChange={event => onUpdate({ scenario_id: event.target.value })} style={inputStyle} /></label>
          </div>
          <label style={fieldStyle}>Trigger<textarea value={combat.trigger || ''} onChange={event => onUpdate({ trigger: event.target.value })} placeholder="What starts this fight?" style={smallTextareaStyle} /></label>
          <div style={twoColumnStyle}>
            <label style={fieldStyle}>Enemy notes<textarea value={combat.enemy_notes || ''} onChange={event => onUpdate({ enemy_notes: event.target.value })} placeholder="Enemies, tactics, waves, reinforcements..." style={smallTextareaStyle} /></label>
            <label style={fieldStyle}>Map notes<textarea value={combat.map_notes || ''} onChange={event => onUpdate({ map_notes: event.target.value })} placeholder="Map, terrain, cover, light, hazards..." style={smallTextareaStyle} /></label>
          </div>
          <button type="button" onClick={onDelete} style={dangerButtonStyle}><Trash2 size={14} /> Delete Combat</button>
        </div>
      )}
    </article>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return <div style={statStyle}><Icon size={17} /><strong>{value}</strong><span>{label}</span></div>;
}

const shellStyle = { display: 'grid', gap: 14, color: rq.text, fontFamily: fontStack };
const headerStyle = { display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start', borderBottom: `1px solid ${rq.line}`, paddingBottom: 14 };
const eyebrowStyle = { margin: '0 0 5px', color: rq.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.12em' };
const titleStyle = { margin: 0, fontFamily: titleFont, fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 0.95, letterSpacing: '0.03em', color: rq.text };
const subtitleStyle = { margin: '8px 0 0', color: rq.soft, lineHeight: 1.45, maxWidth: 820 };
const statsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 };
const statStyle = { display: 'grid', gap: 4, background: rq.card, border: `1px solid ${rq.line}`, padding: 12, color: rq.text };
const focusPanelStyle = { display: 'grid', gridTemplateColumns: 'minmax(240px, 1.4fr) minmax(220px, 0.9fr) auto', gap: 12, alignItems: 'center', background: rq.card, border: `1px solid ${rq.line}`, borderLeft: `6px solid ${rq.red}`, padding: 14 };
const focusMainStyle = { minWidth: 0 };
const focusTitleStyle = { margin: '2px 0 5px', color: rq.text, fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 950, lineHeight: 1.05 };
const focusTextStyle = { margin: 0, color: rq.soft, fontSize: 13, lineHeight: 1.45 };
const focusMetricsStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 };
const focusMetricStyle = { minHeight: 64, background: rq.bg, border: `1px solid ${rq.line}`, display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 3, padding: 8, color: rq.text, textAlign: 'center' };
const focusActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' };
const ruleBoxStyle = { background: rq.bg, border: `1px solid ${rq.line}`, borderLeft: `6px solid ${rq.red}`, padding: 12, color: rq.soft, lineHeight: 1.45 };
const toolbarStyle = { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' };
const inputStyle = { width: '100%', minHeight: 40, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 10px', fontFamily: fontStack, colorScheme: 'dark' };
const textareaStyle = { width: '100%', minHeight: 82, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: 10, resize: 'vertical', fontFamily: fontStack, colorScheme: 'dark' };
const smallTextareaStyle = { ...textareaStyle, minHeight: 64 };
const primaryButtonStyle = { minHeight: 40, border: 0, background: rq.red, color: rq.text, padding: '0 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 40, border: 0, background: rq.card, color: rq.text, padding: '0 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const dangerButtonStyle = { minHeight: 34, border: 0, background: '#5f1111', color: rq.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const formStyle = { display: 'grid', gap: 10, background: rq.card, border: `1px solid ${rq.line}`, padding: 14 };
const sectionTitleStyle = { margin: 0, color: rq.text, fontSize: 17, fontWeight: 950 };
const twoColumnStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 };
const buttonRowStyle = { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' };
const arcListStyle = { display: 'grid', gap: 10 };
const emptyStyle = { padding: 20, background: rq.card, border: `1px dashed ${rq.line}`, color: rq.muted, textAlign: 'center' };
const arcCardStyle = { background: rq.card, border: `1px solid ${rq.line}` };
const arcHeaderStyle = { width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 0, color: rq.text, padding: 14, textAlign: 'left', cursor: 'pointer', fontFamily: fontStack };
const arcTitleStyle = { display: 'block', fontSize: 17, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const arcMetaStyle = { display: 'block', color: rq.muted, fontSize: 12, marginTop: 3 };
const arcStatusStyle = { background: rq.redSoft, border: `1px solid rgba(208,0,0,0.45)`, color: rq.text, padding: '5px 8px', fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.06em' };
const arcBodyStyle = { display: 'grid', gap: 12, padding: '0 14px 14px' };
const fieldStyle = { display: 'grid', gap: 6, color: rq.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const chapterShellStyle = { display: 'grid', gap: 10, background: rq.panel, border: `1px solid ${rq.line}`, padding: 12 };
const chapterHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' };
const chapterFormStyle = { display: 'grid', gap: 8, background: rq.bg, border: `1px solid ${rq.line}`, padding: 10 };
const chapterCardStyle = { background: rq.bg, border: `1px solid ${rq.line}` };
const chapterTopStyle = { width: '100%', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', border: 0, background: 'transparent', color: rq.text, padding: 10, cursor: 'pointer', fontFamily: fontStack };
const chapterBodyStyle = { display: 'grid', gap: 8, padding: '0 10px 10px' };
const combatShellStyle = { display: 'grid', gap: 9, background: rq.panel, border: `1px solid ${rq.line}`, borderLeft: `6px solid ${rq.red}`, padding: 10 };
const combatTitleStyle = { margin: 0, color: rq.text, display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 15, fontWeight: 950 };
const combatHintStyle = { color: rq.muted, fontSize: 12 };
const combatFormStyle = { display: 'grid', gap: 8, background: rq.bg, border: `1px solid ${rq.line}`, padding: 10 };
const emptyCombatStyle = { padding: 14, background: rq.bg, border: `1px dashed ${rq.line}`, color: rq.muted, textAlign: 'center', fontSize: 13 };
const combatCardStyle = { background: rq.bg, border: `1px solid ${rq.line}` };
const combatTopStyle = { width: '100%', border: 0, background: 'transparent', color: rq.text, display: 'flex', alignItems: 'center', gap: 8, padding: 10, textAlign: 'left', cursor: 'pointer', fontFamily: fontStack };
const combatBodyStyle = { display: 'grid', gap: 8, padding: '0 10px 10px' };
const miniReadyBadgeStyle = { background: rq.redSoft, border: `1px solid rgba(208,0,0,0.45)`, color: rq.text, padding: '4px 7px', fontSize: 11, fontWeight: 950 };

if (typeof document !== 'undefined' && !document.getElementById('story-arc-focus-css')) {
  const style = document.createElement('style');
  style.id = 'story-arc-focus-css';
  style.textContent = `
    @media (max-width: 900px) {
      [data-testid="story-arcs-tab"] section[style*="grid-template-columns: minmax(240px"] {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(style);
}
