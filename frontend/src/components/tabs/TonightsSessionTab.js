import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, ClipboardList, FileText, Mail, Map, Monitor, RefreshCw, Sparkles, Swords, UserCircle, Users, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { Button } from '@/components/ui/button';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

const rq = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  line: 'rgba(255,255,255,0.16)',
  lineStrong: 'rgba(255,255,255,0.22)',
  accent: '#d00000',
  accentSoft: 'rgba(208,0,0,0.18)',
  good: '#1f9d66',
  warn: '#d99222',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.74)',
  muted: 'rgba(255,255,255,0.62)',
};

const checklistLabels = {
  players: 'Players linked or added',
  notes: 'Session notes ready',
  npcs: 'NPCs prepared',
  encounters: 'Encounter option ready',
  handouts: 'Handouts or clues ready',
  maps: 'Map or battle map ready',
  prep: 'Prep checklist started',
};

function normalizeArray(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  return [];
}

function latest(items, count = 4) {
  return [...items]
    .sort((a, b) => String(b.updated_at || b.created_at || b.sent_at || '').localeCompare(String(a.updated_at || a.created_at || a.sent_at || '')))
    .slice(0, count);
}

export default function TonightsSessionTab({ campaignId, onOpenTab }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [savingQuickNote, setSavingQuickNote] = useState(false);
  const [togglingChecklistItem, setTogglingChecklistItem] = useState(null);
  const [data, setData] = useState({
    players: [], recipients: [], npcs: [], handouts: [], scenarios: [], maps: [], notes: [], checklists: [],
  });

  const loadRunSheet = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [playersRes, recipientsRes, npcsRes, handoutsRes, scenariosRes, mapsRes, notesRes, checklistsRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/players`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/handout-recipients`).catch(() => ({ data: { recipients: [] } })),
        apiClient.get(`/campaigns/${campaignId}/npcs`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/handouts`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/combat-scenarios`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/maps`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/ingame-notes`).catch(() => ({ data: [] })),
        apiClient.get(`/ai/session-checklists/${campaignId}`).catch(() => ({ data: { checklists: [] } })),
      ]);

      setData({
        players: normalizeArray(playersRes.data, 'players'),
        recipients: normalizeArray(recipientsRes.data, 'recipients'),
        npcs: normalizeArray(npcsRes.data, 'npcs'),
        handouts: normalizeArray(handoutsRes.data, 'handouts'),
        scenarios: normalizeArray(scenariosRes.data, 'scenarios'),
        maps: normalizeArray(mapsRes.data, 'maps'),
        notes: normalizeArray(notesRes.data, 'notes'),
        checklists: normalizeArray(checklistsRes.data, 'checklists'),
      });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load tonight\'s session sheet');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campaignId]);

  useEffect(() => { loadRunSheet(); }, [loadRunSheet]);

  const readiness = useMemo(() => {
    const playerCount = Math.max(data.players.length, data.recipients.length);
    const checks = {
      players: playerCount > 0,
      notes: data.notes.length > 0,
      npcs: data.npcs.length > 0,
      encounters: data.scenarios.length > 0,
      handouts: data.handouts.length > 0,
      maps: data.maps.length > 0,
      prep: data.checklists.length > 0,
    };
    const complete = Object.values(checks).filter(Boolean).length;
    return {
      checks,
      complete,
      total: Object.keys(checks).length,
      score: Math.round((complete / Object.keys(checks).length) * 100),
      playerCount,
    };
  }, [data]);

  const saveQuickNote = async () => {
    const content = quickNote.trim();
    if (!content) {
      toast.error('Write a quick note before saving');
      return;
    }
    setSavingQuickNote(true);
    try {
      const res = await apiClient.post(`/campaigns/${campaignId}/ingame-notes`, { content });
      setData(prev => ({ ...prev, notes: [res.data, ...prev.notes] }));
      setQuickNote('');
      toast.success('Quick session note saved');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not save quick note');
    } finally {
      setSavingQuickNote(false);
    }
  };

  const topChecklist = data.checklists[0];

  const togglePrepChecklistItem = async (item) => {
    if (!topChecklist?.id || !item?.id) return;
    const completed = !item.completed;
    setTogglingChecklistItem(item.id);
    const previousChecklists = data.checklists;
    const nextChecklists = data.checklists.map(checklist => {
      if (checklist.id !== topChecklist.id) return checklist;
      return {
        ...checklist,
        items: (checklist.items || []).map(existing => existing.id === item.id ? { ...existing, completed } : existing),
      };
    });
    setData(prev => ({ ...prev, checklists: nextChecklists }));
    try {
      const res = await apiClient.patch(`/ai/session-checklist/${topChecklist.id}`, { item_id: item.id, completed });
      setData(prev => ({
        ...prev,
        checklists: prev.checklists.map(checklist => checklist.id === topChecklist.id ? res.data : checklist),
      }));
    } catch (error) {
      setData(prev => ({ ...prev, checklists: previousChecklists }));
      toast.error(error?.response?.data?.detail || 'Could not update prep checklist item');
    } finally {
      setTogglingChecklistItem(null);
    }
  };

  const checklistItems = Object.entries(readiness.checks).map(([key, done]) => ({ key, done, label: checklistLabels[key] }));
  const checklistProgress = topChecklist?.items?.length
    ? Math.round((topChecklist.items.filter(item => item.completed).length / topChecklist.items.length) * 100)
    : 0;

  if (loading) return <section style={loadingStyle}>Loading tonight's session sheet…</section>;

  return (
    <section data-testid="tonights-session-tab" style={shellStyle}>
      <header style={heroStyle}>
        <div style={heroIconStyle}><Sparkles size={24} /></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={eyebrowStyle}>GM Run Sheet</p>
          <h2 style={titleStyle}>Tonight's Session</h2>
          <p style={subtitleStyle}>A table-ready command panel for players, quick notes, reveals, encounters, maps, handouts, and prep tasks.</p>
        </div>
        <div style={heroActionsStyle}>
          <Button onClick={() => loadRunSheet(true)} disabled={refreshing} style={secondaryButtonStyle} data-testid="refresh-run-sheet"><RefreshCw size={15} /> {refreshing ? 'Refreshing…' : 'Refresh'}</Button>
          <Button onClick={() => window.open(`/gm-screen/${campaignId}`, '_blank')} style={primaryButtonStyle}><Monitor size={15} /> Live Play Mode</Button>
        </div>
      </header>

      <section style={runStripStyle}>
        <RunStep label="1. Check prep" detail={`${readiness.complete}/${readiness.total} signals ready`} />
        <RunStep label="2. Capture notes" detail={`${data.notes.length} saved`} />
        <RunStep label="3. Reveal clues" detail={`${data.handouts.length} handout(s)`} />
        <RunStep label="4. Run table" detail={`${readiness.playerCount} player(s)`} />
      </section>

      <section style={summaryGridStyle}>
        <ReadinessCard score={readiness.score} complete={readiness.complete} total={readiness.total} />
        <MetricCard icon={Users} label="Players" value={readiness.playerCount} helper={`${data.recipients.length} handout recipient(s)`} onClick={() => onOpenTab?.('players')} />
        <MetricCard icon={Swords} label="Encounters" value={data.scenarios.length} helper="Saved combat options" onClick={() => onOpenTab?.('combat')} />
        <MetricCard icon={Mail} label="Handouts" value={data.handouts.length} helper="Clues and reveals" onClick={() => onOpenTab?.('handouts')} />
      </section>

      <section style={quickNoteStyle}>
        <div style={{ minWidth: 0 }}>
          <h3 style={quickNoteTitleStyle}><FileText size={17} /> Quick session note</h3>
          <p style={quickNoteHelpStyle}>Capture rulings, player choices, improvised NPCs, loot, cliffhangers, and consequences without leaving the run sheet.</p>
        </div>
        <textarea
          value={quickNote}
          onChange={(event) => setQuickNote(event.target.value)}
          placeholder="Type a quick table note, then save it to Session Notes..."
          style={quickNoteInputStyle}
          data-testid="tonight-quick-note"
        />
        <Button onClick={saveQuickNote} disabled={savingQuickNote || !quickNote.trim()} style={primaryButtonStyle} data-testid="save-tonight-quick-note">
          <FileText size={15} /> {savingQuickNote ? 'Saving…' : 'Save Note'}
        </Button>
      </section>

      <div style={mainGridStyle}>
        <section style={panelStyle}>
          <PanelHeader icon={ClipboardList} title="Pre-session health check" actionLabel="Open Prep" onAction={() => onOpenTab?.('session-prep')} />
          <div style={healthListStyle}>
            {checklistItems.map(item => <HealthRow key={item.key} item={item} />)}
          </div>
          <PrepChecklist checklist={topChecklist} progress={checklistProgress} togglingId={togglingChecklistItem} onToggle={togglePrepChecklistItem} />
        </section>

        <section style={panelStyle}>
          <PanelHeader icon={FileText} title="Recent session notes" actionLabel="Open Notes" onAction={() => onOpenTab?.('ingame-notes')} />
          <ListPreview items={latest(data.notes)} empty="No session notes yet." getTitle={(item) => item.title || item.content?.slice(0, 80) || 'Session note'} getMeta={(item) => item.content || item.created_at || ''} />
        </section>
      </div>

      <div style={resourceGridStyle}>
        <ResourcePanel icon={UserCircle} title="NPCs & figures" items={latest(data.npcs)} empty="No NPCs prepared yet." getTitle={(item) => item.name || 'NPC'} getMeta={(item) => item.role || item.description || item.notes || ''} onOpen={() => onOpenTab?.('npcs')} />
        <ResourcePanel icon={Swords} title="Encounters" items={latest(data.scenarios)} empty="No saved encounters yet." getTitle={(item) => item.name || 'Encounter'} getMeta={(item) => `${item.combatants?.length || 0} combatants`} onOpen={() => onOpenTab?.('combat')} />
        <ResourcePanel icon={Mail} title="Handouts & secrets" items={latest(data.handouts)} empty="No handouts yet." getTitle={(item) => item.title || 'Handout'} getMeta={(item) => item.shared_with?.length ? 'Shared' : 'Draft'} onOpen={() => onOpenTab?.('handouts')} />
        <ResourcePanel icon={Map} title="Maps" items={latest(data.maps)} empty="No maps uploaded yet." getTitle={(item) => item.name || item.title || 'Map'} getMeta={(item) => item.description || item.map_type || ''} onOpen={() => onOpenTab?.('maps')} />
      </div>

      <section style={quickActionsStyle}>
        <QuickAction icon={Wand2} label="Session Prep" onClick={() => onOpenTab?.('session-prep')} />
        <QuickAction icon={Mail} label="Handouts" onClick={() => onOpenTab?.('handouts')} />
        <QuickAction icon={Swords} label="Encounters" onClick={() => onOpenTab?.('combat')} />
        <QuickAction icon={BookOpen} label="GM Tools" onClick={() => onOpenTab?.('tools')} />
      </section>
    </section>
  );
}

function RunStep({ label, detail }) {
  return <div style={runStepStyle}><strong>{label}</strong><span>{detail}</span></div>;
}

function ReadinessCard({ score, complete, total }) {
  const color = score >= 75 ? rq.good : score >= 45 ? rq.warn : rq.accent;
  return (
    <article style={metricCardStyle}>
      <div style={metricTopStyle}><span style={metricLabelStyle}>Ready score</span><CheckCircle2 size={18} color={color} /></div>
      <strong style={{ ...metricValueStyle, color }}>{score}%</strong>
      <span style={metricHelperStyle}>{complete}/{total} prep signals ready</span>
    </article>
  );
}

function MetricCard({ icon: Icon, label, value, helper, onClick }) {
  return (
    <button type="button" onClick={onClick} style={metricButtonStyle}>
      <div style={metricTopStyle}><span style={metricLabelStyle}>{label}</span><Icon size={18} color={rq.text} /></div>
      <strong style={metricValueStyle}>{value}</strong>
      <span style={metricHelperStyle}>{helper}</span>
    </button>
  );
}

function PanelHeader({ icon: Icon, title, actionLabel, onAction }) {
  return (
    <div style={panelHeaderStyle}>
      <h3 style={panelTitleStyle}><Icon size={18} /> {title}</h3>
      {actionLabel && <button type="button" onClick={onAction} style={linkButtonStyle}>{actionLabel}</button>}
    </div>
  );
}

function HealthRow({ item }) {
  return (
    <div style={healthRowStyle(item.done)}>
      {item.done ? <CheckCircle2 size={16} color={rq.good} /> : <AlertTriangle size={16} color={rq.warn} />}
      <span>{item.label}</span>
      <small>{item.done ? 'Ready' : 'Needs attention'}</small>
    </div>
  );
}

function PrepChecklist({ checklist, progress, togglingId, onToggle }) {
  if (!checklist) {
    return (
      <div style={prepBoxStyle}>
        <strong>No prep checklist yet</strong>
        <span>Open Session Prep and ask Rook for a checklist if you want a guided prep pass.</span>
      </div>
    );
  }

  return (
    <div style={prepBoxStyle}>
      <strong>Latest Rook checklist</strong>
      <span>{progress}% complete · {checklist.items?.length || 0} items</span>
      <div style={prepChecklistListStyle}>
        {(checklist.items || []).slice(0, 5).map(item => (
          <button key={item.id} type="button" onClick={() => onToggle(item)} disabled={togglingId === item.id} style={prepChecklistItemStyle(item.completed)}>
            {item.completed ? <CheckCircle2 size={14} color={rq.good} /> : <AlertTriangle size={14} color={rq.warn} />}
            <span>{item.text}</span>
            <small>{item.priority || 'medium'}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function ListPreview({ items, empty, getTitle, getMeta }) {
  if (!items.length) return <p style={emptyStyle}>{empty}</p>;
  return <div style={listStyle}>{items.map((item, index) => <PreviewRow key={item.id || index} title={getTitle(item)} meta={getMeta(item)} />)}</div>;
}

function ResourcePanel({ icon, title, items, empty, getTitle, getMeta, onOpen }) {
  return (
    <section style={panelStyle}>
      <PanelHeader icon={icon} title={title} actionLabel="Open" onAction={onOpen} />
      <ListPreview items={items} empty={empty} getTitle={getTitle} getMeta={getMeta} />
    </section>
  );
}

function PreviewRow({ title, meta }) {
  return (
    <div style={previewRowStyle}>
      <strong>{title}</strong>
      {meta && <span>{String(meta).slice(0, 120)}{String(meta).length > 120 ? '…' : ''}</span>}
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }) {
  return <button type="button" onClick={onClick} style={quickActionStyle}><Icon size={16} /> {label}</button>;
}

const shellStyle = { display: 'grid', gap: 16, fontFamily: fontStack };
const loadingStyle = { padding: 24, color: rq.soft, background: rq.panel, border: `1px solid ${rq.line}` };
const heroStyle = { display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', padding: 16, border: `1px solid ${rq.line}`, background: rq.card, flexWrap: 'wrap' };
const heroIconStyle = { width: 48, height: 48, display: 'grid', placeItems: 'center', background: rq.bg, color: rq.text, borderLeft: `6px solid ${rq.accent}`, flex: '0 0 auto' };
const heroActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' };
const eyebrowStyle = { margin: '0 0 5px', color: rq.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.1em' };
const titleStyle = { margin: 0, color: rq.text, fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 950, letterSpacing: '-0.04em', lineHeight: 1.02 };
const subtitleStyle = { margin: '7px 0 0', color: rq.soft, fontSize: 14, lineHeight: 1.45, maxWidth: 760 };
const primaryButtonStyle = { minHeight: 40, background: rq.accent, color: rq.text, border: 0, borderRadius: 0, fontWeight: 950, display: 'inline-flex', gap: 8, alignItems: 'center', justifyContent: 'center', padding: '0 13px', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 40, background: rq.panel, color: rq.text, border: 0, borderRadius: 0, fontWeight: 900, display: 'inline-flex', gap: 8, alignItems: 'center', justifyContent: 'center', padding: '0 13px', fontFamily: fontStack };
const runStripStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', borderTop: `1px solid ${rq.line}`, borderBottom: `1px solid ${rq.line}` };
const runStepStyle = { minHeight: 62, display: 'grid', alignContent: 'center', gap: 3, padding: '10px 12px', borderRight: `1px solid ${rq.line}`, color: rq.text };
const summaryGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 0, borderTop: `1px solid ${rq.line}`, borderLeft: `1px solid ${rq.line}` };
const metricCardStyle = { background: rq.card, border: 0, borderRight: `1px solid ${rq.line}`, borderBottom: `1px solid ${rq.line}`, padding: 14, textAlign: 'left', color: rq.text };
const metricButtonStyle = { ...metricCardStyle, cursor: 'pointer', fontFamily: fontStack };
const metricTopStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 };
const metricLabelStyle = { color: rq.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const metricValueStyle = { display: 'block', color: rq.text, fontSize: 30, fontWeight: 950, marginTop: 9 };
const metricHelperStyle = { display: 'block', color: rq.soft, fontSize: 12, marginTop: 4 };
const quickNoteStyle = { display: 'grid', gridTemplateColumns: 'minmax(220px, 0.8fr) minmax(260px, 1.5fr) auto', gap: 12, alignItems: 'center', padding: 14, background: rq.card, border: `1px solid ${rq.line}`, minWidth: 0 };
const quickNoteTitleStyle = { margin: 0, color: rq.text, fontSize: 15, fontWeight: 950, display: 'flex', alignItems: 'center', gap: 8 };
const quickNoteHelpStyle = { margin: '5px 0 0', color: rq.muted, fontSize: 12, lineHeight: 1.45 };
const quickNoteInputStyle = { minHeight: 72, width: '100%', resize: 'vertical', background: rq.bg, color: rq.text, border: `1px solid ${rq.lineStrong}`, padding: 10, fontSize: 13, lineHeight: 1.45, outline: 'none', fontFamily: fontStack, colorScheme: 'dark' };
const mainGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 12, minWidth: 0 };
const resourceGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 12, minWidth: 0 };
const panelStyle = { background: rq.card, border: `1px solid ${rq.line}`, padding: 14, minWidth: 0 };
const panelHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 };
const panelTitleStyle = { margin: 0, color: rq.text, fontSize: 15, fontWeight: 950, display: 'flex', alignItems: 'center', gap: 8 };
const linkButtonStyle = { background: rq.panel, color: rq.text, border: 0, padding: '7px 9px', cursor: 'pointer', fontSize: 11, fontWeight: 950, fontFamily: fontStack };
const healthListStyle = { display: 'grid', gap: 8 };
const healthRowStyle = (done) => ({ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr) auto', gap: 8, alignItems: 'center', padding: '8px 10px', background: rq.bg, borderLeft: `5px solid ${done ? rq.good : rq.warn}`, color: rq.soft, fontSize: 13 });
const prepBoxStyle = { marginTop: 12, padding: 10, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.soft, display: 'grid', gap: 8, fontSize: 12 };
const prepChecklistListStyle = { display: 'grid', gap: 6, marginTop: 4 };
const prepChecklistItemStyle = (completed) => ({ display: 'grid', gridTemplateColumns: '16px minmax(0, 1fr) auto', gap: 8, alignItems: 'center', textAlign: 'left', background: completed ? 'rgba(31,157,102,0.16)' : rq.panel, color: rq.text, border: 0, borderLeft: `5px solid ${completed ? rq.good : rq.warn}`, padding: '7px 8px', cursor: 'pointer', fontSize: 12, fontFamily: fontStack });
const emptyStyle = { margin: 0, color: rq.muted, fontSize: 13, padding: 12, border: `1px dashed ${rq.line}` };
const listStyle = { display: 'grid', gap: 8 };
const previewRowStyle = { display: 'grid', gap: 4, padding: 10, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, fontSize: 13 };
const quickActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', padding: 12, background: rq.card, border: `1px solid ${rq.line}` };
const quickActionStyle = { display: 'inline-flex', alignItems: 'center', gap: 7, background: rq.panel, color: rq.text, border: 0, padding: '10px 12px', cursor: 'pointer', fontWeight: 950, fontSize: 12, fontFamily: fontStack };
