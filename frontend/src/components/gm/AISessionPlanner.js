import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  FileText,
  ListChecks,
  Loader,
  ScrollText,
  Sparkles,
  Square,
} from 'lucide-react';
import apiClient from '@/lib/apiClient';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

const rq = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  input: '#242424',
  line: 'rgba(255,255,255,0.16)',
  lineStrong: 'rgba(255,255,255,0.22)',
  accent: '#d00000',
  good: '#1f9d66',
  warn: '#d99222',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.74)',
  muted: 'rgba(255,255,255,0.62)',
};

const CATEGORY_CONFIG = {
  npcs: { label: 'NPCs', color: rq.accent },
  maps: { label: 'Maps', color: rq.soft },
  encounters: { label: 'Encounters', color: rq.accent },
  loot: { label: 'Loot', color: rq.soft },
  story: { label: 'Story', color: rq.text },
  atmosphere: { label: 'Atmosphere', color: rq.muted },
  handouts: { label: 'Handouts', color: rq.soft },
  rules: { label: 'Rules', color: rq.muted },
};

const PRIORITY_BADGE = {
  high: { bg: 'rgba(208,0,0,0.22)', color: rq.text, label: 'HIGH' },
  medium: { bg: 'rgba(217,146,34,0.2)', color: rq.text, label: 'MED' },
  low: { bg: 'rgba(255,255,255,0.09)', color: rq.soft, label: 'LOW' },
};

const MODES = [
  { id: 'outline', icon: FileText, label: 'Outline', helper: 'Build the shape of next session' },
  { id: 'replay', icon: ScrollText, label: 'Replay', helper: 'Write a recap from previous play' },
  { id: 'checklist', icon: ListChecks, label: 'Checklist', helper: 'Turn prep into tasks' },
];

const AISessionPlanner = ({ campaignId }) => {
  const [mode, setMode] = useState('outline');
  const [generating, setGenerating] = useState(false);
  const [focus, setFocus] = useState('balanced');
  const [tone, setTone] = useState('classic fantasy');
  const [gmNotes, setGmNotes] = useState('');
  const [outlines, setOutlines] = useState([]);
  const [style, setStyle] = useState('narrative');
  const [sessionNumber, setSessionNumber] = useState('');
  const [extraContext, setExtraContext] = useState('');
  const [replays, setReplays] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchOutlines();
    fetchReplays();
    fetchChecklists();
  }, [campaignId]);

  const fetchOutlines = async () => {
    try {
      const res = await apiClient.get(`/ai/session-outlines/${campaignId}`);
      setOutlines(res.data.outlines || []);
    } catch {}
  };

  const fetchReplays = async () => {
    try {
      const res = await apiClient.get(`/ai/session-replays/${campaignId}`);
      setReplays(res.data.replays || []);
    } catch {}
  };

  const fetchChecklists = async () => {
    try {
      const res = await apiClient.get(`/ai/session-checklists/${campaignId}`);
      setChecklists(res.data.checklists || []);
    } catch {}
  };

  const generateOutline = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.post(`/ai/session-outline/${campaignId}`, { focus, tone, gm_notes: gmNotes });
      setOutlines(prev => [res.data, ...prev]);
      setExpandedId(res.data.id);
      toast.success('Rook drafted a session outline');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Rook could not draft the outline');
    } finally {
      setGenerating(false);
    }
  };

  const generateReplay = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.post(`/ai/session-replay/${campaignId}`, { style, session_number: sessionNumber, extra_context: extraContext });
      setReplays(prev => [res.data, ...prev]);
      setExpandedId(res.data.id);
      toast.success('Rook drafted a session replay');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Rook could not draft the replay');
    } finally {
      setGenerating(false);
    }
  };

  const generateChecklist = useCallback(async (outlineId) => {
    setGenerating(true);
    try {
      const res = await apiClient.post(`/ai/session-checklist/${campaignId}`, { outline_id: outlineId || null });
      setChecklists(prev => [res.data, ...prev]);
      setExpandedId(res.data.id);
      setMode('checklist');
      toast.success('Rook drafted a prep checklist');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Rook could not draft the checklist');
    } finally {
      setGenerating(false);
    }
  }, [campaignId]);

  const toggleChecklistItem = async (checklistId, itemId, completed) => {
    try {
      const res = await apiClient.patch(`/ai/session-checklist/${checklistId}`, { item_id: itemId, completed });
      setChecklists(prev => prev.map(checklist => checklist.id === checklistId ? res.data : checklist));
    } catch {
      toast.error('Failed to update checklist');
    }
  };

  const items = mode === 'outline' ? outlines : mode === 'replay' ? replays : checklists;

  return (
    <section data-testid="ai-session-planner" style={shellStyle}>
      <header style={headerStyle}>
        <div style={iconTileStyle}><Sparkles size={22} /></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={eyebrowStyle}>Rook Prep Assistant</p>
          <h3 style={titleStyle}>Session Prep</h3>
          <p style={subtitleStyle}>Draft an outline, recap a previous session, or turn your plan into a practical prep checklist.</p>
        </div>
      </header>

      <nav style={modeGridStyle} aria-label="Session prep modes">
        {MODES.map(item => {
          const Icon = item.icon;
          const active = mode === item.id;
          return (
            <button key={item.id} data-testid={`planner-mode-${item.id}`} onClick={() => setMode(item.id)} style={modeButtonStyle(active)}>
              <Icon size={17} />
              <span style={{ display: 'grid', gap: 2, textAlign: 'left' }}>
                <strong>{item.label}</strong>
                <small>{item.helper}</small>
              </span>
            </button>
          );
        })}
      </nav>

      <section style={formStyle}>
        {mode === 'outline' && (
          <>
            <div style={twoColumnStyle}>
              <label style={fieldStyle}>
                <span style={labelStyle}>Focus</span>
                <select data-testid="outline-focus" value={focus} onChange={event => setFocus(event.target.value)} style={inputStyle}>
                  <option value="balanced">Balanced</option>
                  <option value="combat-heavy">Combat Heavy</option>
                  <option value="roleplay-heavy">Roleplay Heavy</option>
                  <option value="exploration">Exploration</option>
                  <option value="mystery">Mystery / Investigation</option>
                  <option value="political">Political Intrigue</option>
                </select>
              </label>
              <label style={fieldStyle}>
                <span style={labelStyle}>Tone</span>
                <select data-testid="outline-tone" value={tone} onChange={event => setTone(event.target.value)} style={inputStyle}>
                  <option value="classic fantasy">Classic Fantasy</option>
                  <option value="dark and gritty">Dark & Gritty</option>
                  <option value="lighthearted">Lighthearted</option>
                  <option value="horror">Horror</option>
                  <option value="epic heroic">Epic / Heroic</option>
                </select>
              </label>
            </div>
            <label style={fieldStyle}>
              <span style={labelStyle}>GM notes</span>
              <textarea data-testid="outline-gm-notes" value={gmNotes} onChange={event => setGmNotes(event.target.value)} placeholder="What needs to happen, what might happen, and what loose threads should Rook consider?" rows={4} style={textareaStyle} />
            </label>
          </>
        )}

        {mode === 'replay' && (
          <>
            <div style={twoColumnStyle}>
              <label style={fieldStyle}>
                <span style={labelStyle}>Replay style</span>
                <select data-testid="replay-style" value={style} onChange={event => setStyle(event.target.value)} style={inputStyle}>
                  <option value="narrative">Epic Narrative</option>
                  <option value="chronicle">Historical Chronicle</option>
                  <option value="comedic">Comedic Retelling</option>
                  <option value="dark">Dark Fantasy</option>
                </select>
              </label>
              <label style={fieldStyle}>
                <span style={labelStyle}>Session #</span>
                <input data-testid="replay-session-number" type="text" value={sessionNumber} onChange={event => setSessionNumber(event.target.value)} placeholder="e.g. 12" style={inputStyle} />
              </label>
            </div>
            <label style={fieldStyle}>
              <span style={labelStyle}>Extra context</span>
              <textarea data-testid="replay-extra-context" value={extraContext} onChange={event => setExtraContext(event.target.value)} placeholder="Key moments to highlight, funny quotes, epic dice rolls, consequences, cliffhangers..." rows={4} style={textareaStyle} />
            </label>
          </>
        )}

        {mode === 'checklist' && (
          <div style={helperBoxStyle}>
            <strong>Prep checklist mode</strong>
            <span>Ask Rook to draft a checklist from campaign context, or create one directly from a saved outline.</span>
          </div>
        )}

        <button data-testid="generate-ai-btn" onClick={mode === 'outline' ? generateOutline : mode === 'replay' ? generateReplay : () => generateChecklist(null)} disabled={generating} style={generateButtonStyle(generating)}>
          {generating ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : mode === 'checklist' ? <ClipboardList size={16} /> : <Sparkles size={16} />}
          {generating ? 'Rook is drafting...' : mode === 'outline' ? 'Ask Rook for Session Outline' : mode === 'replay' ? 'Ask Rook for Session Replay' : 'Ask Rook for Prep Checklist'}
        </button>
      </section>

      <section style={itemsStyle}>
        {items.length === 0 ? (
          <div style={emptyStyle}>
            <Sparkles size={38} />
            <strong>{mode === 'outline' ? 'No outlines yet' : mode === 'replay' ? 'No replays yet' : 'No prep checklists yet'}</strong>
            <span>{mode === 'outline' ? 'Ask Rook to draft your first session outline above.' : mode === 'replay' ? 'Ask Rook to write a recap above.' : 'Ask Rook to draft one above, or generate one from a saved outline.'}</span>
          </div>
        ) : items.map(item => (
          <PlannerItem key={item.id} item={item} mode={mode} expanded={expandedId === item.id} generating={generating} onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)} onGenerateChecklist={() => generateChecklist(item.id)} onToggleChecklist={toggleChecklistItem} />
        ))}
      </section>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </section>
  );
};

function PlannerItem({ item, mode, expanded, generating, onToggle, onGenerateChecklist, onToggleChecklist }) {
  const title = mode === 'outline'
    ? `Outline - ${item.focus || 'Balanced'}`
    : mode === 'replay'
      ? `Replay${item.session_number ? ` #${item.session_number}` : ''} - ${item.style || 'Narrative'}`
      : `Prep Checklist${item.outline_id ? ' from outline' : ''}`;
  const Icon = mode === 'checklist' ? ListChecks : mode === 'outline' ? FileText : ScrollText;

  return (
    <article data-testid={`planner-item-${item.id}`} style={plannerItemStyle(expanded)}>
      <button onClick={onToggle} style={plannerHeaderStyle}>
        <span style={plannerTitleWrapStyle}>
          <Icon size={15} />
          <strong>{title}</strong>
          {mode === 'checklist' && item.items && <span style={countBadgeStyle}>{item.items.filter(row => row.completed).length}/{item.items.length}</span>}
        </span>
        <span style={dateWrapStyle}>
          <Clock size={11} /> {item.generated_at ? new Date(item.generated_at).toLocaleDateString() : 'Saved'}
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      {expanded && mode !== 'checklist' && (
        <section style={markdownPanelStyle}>
          <div dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(item.content || '') }} />
          {mode === 'outline' && (
            <button data-testid={`generate-checklist-from-${item.id}`} onClick={(event) => { event.stopPropagation(); onGenerateChecklist(); }} disabled={generating} style={secondaryActionStyle}>
              <ClipboardList size={14} /> Ask Rook for Prep Checklist from this Outline
            </button>
          )}
        </section>
      )}

      {expanded && mode === 'checklist' && item.items && (
        <ChecklistPanel items={item.items} checklistId={item.id} onToggle={onToggleChecklist} />
      )}
    </article>
  );
}

function ChecklistPanel({ items, checklistId, onToggle }) {
  const categories = [...new Set(items.map(item => item.category || 'prep'))];
  const completedCount = items.filter(item => item.completed).length;
  const pct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <section style={checklistPanelStyle}>
      <div style={progressHeaderStyle}>
        <span>Prep progress</span>
        <strong>{pct}%</strong>
      </div>
      <div style={progressTrackStyle}>
        <div style={{ ...progressFillStyle, width: `${pct}%`, background: pct === 100 ? rq.good : rq.accent }} />
      </div>

      {categories.map(category => {
        const categoryItems = items.filter(item => (item.category || 'prep') === category);
        const cfg = CATEGORY_CONFIG[category] || { label: category, color: rq.muted };
        return (
          <div key={category} style={categoryGroupStyle}>
            <div style={{ ...categoryTitleStyle, color: cfg.color }}>{cfg.label}</div>
            {categoryItems.map(row => {
              const priority = PRIORITY_BADGE[row.priority] || PRIORITY_BADGE.medium;
              return (
                <button key={row.id} data-testid={`checklist-item-${row.id}`} onClick={() => onToggle(checklistId, row.id, !row.completed)} style={checklistItemStyle(row.completed)}>
                  {row.completed ? <CheckSquare size={16} color={rq.good} /> : <Square size={16} color={rq.muted} />}
                  <span style={{ textDecoration: row.completed ? 'line-through' : 'none', color: row.completed ? rq.muted : rq.soft }}>{row.text}</span>
                  <strong style={{ background: priority.bg, color: priority.color }}>{priority.label}</strong>
                </button>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderSafeMarkdown(text) {
  return escapeHtml(text)
    .replace(/^### (.*)$/gm, '<h4 style="color:#FFFFFF;margin:12px 0 6px;font-size:14px">$1</h4>')
    .replace(/^## (.*)$/gm, '<h3 style="color:#FFFFFF;margin:16px 0 8px;font-size:15px;font-weight:800">$1</h3>')
    .replace(/^# (.*)$/gm, '<h2 style="color:#FFFFFF;margin:20px 0 10px;font-size:17px;font-weight:900">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#FFFFFF">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*)$/gm, '<li style="margin-left:16px;list-style:disc">$1</li>')
    .replace(/\n/g, '<br/>');
}

const shellStyle = { display: 'grid', gap: 14, fontFamily: fontStack };
const headerStyle = { display: 'flex', gap: 12, alignItems: 'flex-start', padding: 16, background: rq.card, border: `1px solid ${rq.line}` };
const iconTileStyle = { width: 44, height: 44, display: 'grid', placeItems: 'center', background: rq.bg, color: rq.text, borderLeft: `6px solid ${rq.accent}`, flex: '0 0 auto' };
const eyebrowStyle = { margin: '0 0 5px', color: rq.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.1em' };
const titleStyle = { margin: 0, color: rq.text, fontSize: 26, fontWeight: 950, letterSpacing: '-0.03em' };
const subtitleStyle = { margin: '6px 0 0', color: rq.soft, fontSize: 13, lineHeight: 1.45 };
const modeGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', borderTop: `1px solid ${rq.line}`, borderLeft: `1px solid ${rq.line}` };
const modeButtonStyle = (active) => ({ display: 'flex', alignItems: 'flex-start', gap: 9, minHeight: 64, padding: 12, background: active ? rq.accent : rq.panel, color: rq.text, border: 0, borderRight: `1px solid ${rq.line}`, borderBottom: `1px solid ${rq.line}`, cursor: 'pointer', fontFamily: fontStack });
const formStyle = { display: 'grid', gap: 12, background: rq.card, border: `1px solid ${rq.line}`, padding: 14 };
const twoColumnStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 };
const fieldStyle = { display: 'grid', gap: 6 };
const labelStyle = { color: rq.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const inputStyle = { width: '100%', minHeight: 42, background: rq.input, border: `1px solid ${rq.lineStrong}`, color: rq.text, padding: '0 11px', fontFamily: fontStack, outline: 'none', borderRadius: 0, colorScheme: 'dark' };
const textareaStyle = { ...inputStyle, minHeight: 96, padding: 11, resize: 'vertical', lineHeight: 1.45 };
const helperBoxStyle = { display: 'grid', gap: 5, background: rq.bg, borderLeft: `6px solid ${rq.accent}`, padding: 12, color: rq.soft, fontSize: 13 };
const generateButtonStyle = (disabled) => ({ minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 0, borderRadius: 0, background: disabled ? rq.panel : rq.accent, color: rq.text, fontWeight: 950, cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.72 : 1, fontFamily: fontStack });
const itemsStyle = { display: 'grid', gap: 10 };
const emptyStyle = { display: 'grid', justifyItems: 'center', gap: 8, textAlign: 'center', background: rq.panel, border: `1px dashed ${rq.lineStrong}`, padding: 32, color: rq.muted };
const plannerItemStyle = (expanded) => ({ background: rq.card, border: `1px solid ${expanded ? rq.accent : rq.line}`, color: rq.text });
const plannerHeaderStyle = { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'transparent', border: 0, color: rq.text, cursor: 'pointer', fontFamily: fontStack };
const plannerTitleWrapStyle = { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, textAlign: 'left' };
const dateWrapStyle = { display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, color: rq.muted, fontSize: 11 };
const countBadgeStyle = { fontSize: 10, padding: '3px 6px', background: rq.good, color: rq.text, fontWeight: 950 };
const markdownPanelStyle = { padding: '12px 14px 14px', borderTop: `1px solid ${rq.line}`, color: rq.soft, fontSize: 13, lineHeight: 1.65, maxHeight: 520, overflowY: 'auto' };
const secondaryActionStyle = { marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 36, border: 0, background: rq.good, color: rq.text, padding: '0 10px', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const checklistPanelStyle = { display: 'grid', gap: 12, borderTop: `1px solid ${rq.line}`, padding: 14 };
const progressHeaderStyle = { display: 'flex', justifyContent: 'space-between', color: rq.text, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 950 };
const progressTrackStyle = { height: 7, background: rq.bg, overflow: 'hidden' };
const progressFillStyle = { height: '100%' };
const categoryGroupStyle = { display: 'grid', gap: 6 };
const categoryTitleStyle = { fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const checklistItemStyle = (completed) => ({ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr) auto', alignItems: 'flex-start', gap: 8, background: completed ? 'rgba(31,157,102,0.12)' : rq.bg, border: 0, borderLeft: `5px solid ${completed ? rq.good : rq.lineStrong}`, color: rq.soft, padding: '8px 10px', textAlign: 'left', cursor: 'pointer', fontFamily: fontStack });

export default AISessionPlanner;
