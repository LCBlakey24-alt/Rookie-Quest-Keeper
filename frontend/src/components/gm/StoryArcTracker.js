import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, ChevronRight, Clock, Flag, Plus, ScrollText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "New Rocker", Georgia, serif)';

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
};

export default function StoryArcTracker({ campaignId }) {
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
    return { arcs: arcs.length, chapters: chapterCount, played: playedCount, active: arcs.filter(arc => arc.status === 'active').length };
  }, [arcs]);

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
          <p style={subtitleStyle}>Organise the campaign like Fight Club style books: big story arcs, chapters as sessions, and scene notes inside each chapter.</p>
        </div>
        <button type="button" onClick={() => setShowArcForm(prev => !prev)} style={primaryButtonStyle}><Plus size={16} /> New Arc</button>
      </header>

      <section style={statsGridStyle}>
        <StatCard icon={BookOpen} label="Arcs" value={stats.arcs} />
        <StatCard icon={ScrollText} label="Chapters" value={stats.chapters} />
        <StatCard icon={Flag} label="Active" value={stats.active} />
        <StatCard icon={Check} label="Played" value={stats.played} />
      </section>

      <section style={ruleBoxStyle}>
        <strong>Import rule:</strong> Use this for campaign structure. Lore goes in World Overview/Handouts, people go in NPCs & Figures, places go in Locations, and events that already happened go in Chronicle.
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

function ArcCard({ arc, expanded, onToggle, onUpdate, onDelete, chapterDraft, updateChapterDraft, addChapter, updateChapter, deleteChapter }) {
  const chapters = arc.chapters || [];
  const played = chapters.filter(chapter => chapter.status === 'played').length;
  const typeLabel = ARC_TYPES.find(type => type.id === arc.arc_type)?.label || arc.arc_type || 'Arc';
  const statusLabel = ARC_STATUS.find(status => status.id === arc.status)?.label || arc.status || 'Planning';

  return (
    <article style={arcCardStyle}>
      <button type="button" onClick={onToggle} style={arcHeaderStyle}>
        {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={arcTitleStyle}>{arc.title}</strong>
          <span style={arcMetaStyle}>{typeLabel} · {statusLabel} · {played}/{chapters.length} chapters played</span>
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

  useEffect(() => {
    setSummary(chapter.summary || '');
    setPrepNotes(chapter.prep_notes || '');
    setScenesText((chapter.scenes || []).map(scene => scene.title || scene).join('\n'));
  }, [chapter]);

  const saveScenes = () => {
    const scenes = scenesText.split('\n').map(line => line.trim()).filter(Boolean).map((title, index) => ({ id: `scene-${index + 1}`, title }));
    onUpdate({ scenes });
  };

  return (
    <article style={chapterCardStyle}>
      <button type="button" onClick={() => setOpen(prev => !prev)} style={chapterTopStyle}>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong>{chapter.title}</strong>
          <span>{chapter.session_number ? `Session ${chapter.session_number}` : 'Unnumbered session'} · {chapter.status || 'planned'} · {(chapter.scenes || []).length} scenes</span>
        </div>
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
          <button type="button" onClick={onDelete} style={dangerButtonStyle}><Trash2 size={14} /> Delete Chapter</button>
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
const ruleBoxStyle = { background: rq.bg, border: `1px solid ${rq.line}`, borderLeft: `6px solid ${rq.red}`, padding: 12, color: rq.soft, lineHeight: 1.45 };
const toolbarStyle = { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' };
const inputStyle = { width: '100%', minHeight: 40, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 10px', fontFamily: fontStack, colorScheme: 'dark' };
const textareaStyle = { width: '100%', minHeight: 82, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: 10, resize: 'vertical', fontFamily: fontStack, colorScheme: 'dark' };
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
