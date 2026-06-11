import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, ClipboardList, FileText, Mail, Map, RefreshCw, Sparkles, Swords, UserCircle, Users, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { Button } from '@/components/ui/button';

const rq = {
  bg: '#1F1F23',
  panel: 'rgba(39,39,43,0.96)',
  card: 'rgba(31,31,35,0.92)',
  elevated: '#323235',
  border: 'rgba(124,58,237,0.36)',
  borderSoft: 'rgba(255,255,255,0.10)',
  accent: '#7C3AED',
  accentSoft: 'rgba(124,58,237,0.12)',
  good: '#22C55E',
  warn: '#F59E0B',
  text: '#FFFFFF',
  secondary: '#D1D5DB',
  muted: '#9CA3AF',
};

const checklistLabels = {
  players: 'Players linked or added',
  notes: 'Session notes ready',
  npcs: 'NPCs prepared',
  encounters: 'Combat/encounter option ready',
  handouts: 'Handouts/clues ready',
  maps: 'Map or battle map ready',
  prep: 'Rook prep checklist started',
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

  const checklistItems = Object.entries(readiness.checks).map(([key, done]) => ({ key, done, label: checklistLabels[key] }));
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
  const checklistProgress = topChecklist?.items?.length
    ? Math.round((topChecklist.items.filter(item => item.completed).length / topChecklist.items.length) * 100)
    : 0;

  if (loading) return <div style={loadingStyle}>Loading tonight's session sheet…</div>;

  return (
    <div data-testid="tonights-session-tab" style={tonightPageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>Friday table cockpit</p>
          <h2 style={titleStyle}><Sparkles size={24} /> Tonight's Session</h2>
          <p style={subtitleStyle}>A quick GM run sheet for the things you need at the table: players, notes, NPCs, encounters, maps, handouts, and prep tasks.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button onClick={() => loadRunSheet(true)} disabled={refreshing} style={secondaryButtonStyle} data-testid="refresh-run-sheet"><RefreshCw size={15} /> {refreshing ? 'Refreshing…' : 'Refresh'}</Button>
          <Button onClick={() => window.open(`/gm-screen/${campaignId}`, '_blank')} style={primaryButtonStyle}><Swords size={15} /> Live Play Mode</Button>
        </div>
      </section>


      <section style={quickNoteStyle}>
        <div style={{ minWidth: 0 }}>
          <h3 style={quickNoteTitleStyle}><FileText size={17} /> Quick session note</h3>
          <p style={quickNoteHelpStyle}>Capture rulings, player choices, NPC improvisation, loot, and cliffhangers without leaving the run sheet.</p>
        </div>
        <textarea
          value={quickNote}
          onChange={(event) => setQuickNote(event.target.value)}
          placeholder="Type a quick note from the table, then save it to Session Notes..."
          style={quickNoteInputStyle}
          data-testid="tonight-quick-note"
        />
        <Button onClick={saveQuickNote} disabled={savingQuickNote || !quickNote.trim()} style={primaryButtonStyle} data-testid="save-tonight-quick-note">
          <FileText size={15} /> {savingQuickNote ? 'Saving…' : 'Save Note'}
        </Button>
      </section>

      <section style={summaryGridStyle}>
        <ReadinessCard score={readiness.score} complete={readiness.complete} total={readiness.total} />
        <MetricCard icon={Users} label="Players" value={readiness.playerCount} helper={`${data.recipients.length} handout recipient(s)`} onClick={() => onOpenTab?.('players')} />
        <MetricCard icon={Swords} label="Encounters" value={data.scenarios.length} helper="Saved combat options" onClick={() => onOpenTab?.('combat')} />
        <MetricCard icon={Mail} label="Handouts" value={data.handouts.length} helper="Clues and reveals" onClick={() => onOpenTab?.('handouts')} />
      </section>

      <div style={mainGridStyle}>
        <section style={panelStyle}>
          <PanelHeader icon={ClipboardList} title="Pre-session health check" actionLabel="Open Session Prep" onAction={() => onOpenTab?.('session-prep')} />
          <div style={{ display: 'grid', gap: 8 }}>
            {checklistItems.map(item => (
              <div key={item.key} style={healthRowStyle(item.done)}>
                {item.done ? <CheckCircle2 size={16} color={rq.good} /> : <AlertTriangle size={16} color={rq.warn} />}
                <span>{item.label}</span>
                <small>{item.done ? 'Ready' : 'Needs attention'}</small>
              </div>
            ))}
          </div>
          {topChecklist ? (
            <div style={prepBoxStyle}>
              <strong>Latest Rook checklist</strong>
              <span>{checklistProgress}% complete · {topChecklist.items?.length || 0} items</span>
              <div style={prepChecklistListStyle}>
                {(topChecklist.items || []).slice(0, 5).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => togglePrepChecklistItem(item)}
                    disabled={togglingChecklistItem === item.id}
                    style={prepChecklistItemStyle(item.completed)}
                  >
                    {item.completed ? <CheckCircle2 size={14} color={rq.good} /> : <AlertTriangle size={14} color={rq.warn} />}
                    <span>{item.text}</span>
                    <small>{item.priority || 'medium'}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={prepBoxStyle}>
              <strong>No prep checklist yet</strong>
              <span>Open Session Prep and ask Rook for a checklist if you want a guided prep pass.</span>
            </div>
          )}
        </section>

        <section style={panelStyle}>
          <PanelHeader icon={FileText} title="Recent session notes" actionLabel="Open Notes" onAction={() => onOpenTab?.('ingame-notes')} />
          <ListPreview items={latest(data.notes)} empty="No session notes yet." getTitle={(item) => item.title || item.content?.slice(0, 80) || 'Session note'} getMeta={(item) => item.content || item.created_at || ''} />
        </section>
      </div>

      <div style={fourGridStyle}>
        <ResourcePanel icon={UserCircle} title="NPCs ready" items={latest(data.npcs)} empty="No NPCs prepared yet." getTitle={(item) => item.name || 'NPC'} getMeta={(item) => item.role || item.description || item.notes || ''} onOpen={() => onOpenTab?.('npcs')} />
        <ResourcePanel icon={Swords} title="Encounters" items={latest(data.scenarios)} empty="No saved encounters yet." getTitle={(item) => item.name || 'Encounter'} getMeta={(item) => `${item.combatants?.length || 0} combatants`} onOpen={() => onOpenTab?.('combat')} />
        <ResourcePanel icon={Mail} title="Handouts" items={latest(data.handouts)} empty="No handouts yet." getTitle={(item) => item.title || 'Handout'} getMeta={(item) => item.shared_with?.length ? 'Shared' : 'Draft'} onOpen={() => onOpenTab?.('handouts')} />
        <ResourcePanel icon={Map} title="Maps" items={latest(data.maps)} empty="No maps uploaded yet." getTitle={(item) => item.name || item.title || 'Map'} getMeta={(item) => item.description || item.map_type || ''} onOpen={() => onOpenTab?.('maps')} />
      </div>

      <section style={quickActionsStyle}>
        <QuickAction icon={Wand2} label="Session Prep" onClick={() => onOpenTab?.('session-prep')} />
        <QuickAction icon={Mail} label="Create Handout" onClick={() => onOpenTab?.('handouts')} />
        <QuickAction icon={Swords} label="Build Combat" onClick={() => onOpenTab?.('combat')} />
        <QuickAction icon={BookOpen} label="Rules / Tools" onClick={() => onOpenTab?.('tools')} />
      </section>
    </div>
  );
}

function ReadinessCard({ score, complete, total }) {
  const color = score >= 75 ? rq.good : score >= 45 ? rq.warn : rq.accent;
  return (
    <article style={metricCardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={metricLabelStyle}>Ready score</span>
        <CheckCircle2 size={18} color={color} />
      </div>
      <strong style={{ ...metricValueStyle, color }}>{score}%</strong>
      <span style={metricHelperStyle}>{complete}/{total} prep signals ready</span>
    </article>
  );
}

function MetricCard({ icon: Icon, label, value, helper, onClick }) {
  return (
    <button type="button" onClick={onClick} style={metricButtonStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={metricLabelStyle}>{label}</span>
        <Icon size={18} color={rq.accent} />
      </div>
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

function ListPreview({ items, empty, getTitle, getMeta }) {
  if (!items.length) return <p style={emptyStyle}>{empty}</p>;
  return <div style={{ display: 'grid', gap: 8 }}>{items.map((item, index) => <PreviewRow key={item.id || index} title={getTitle(item)} meta={getMeta(item)} />)}</div>;
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

const loadingStyle = { padding: 18, color: rq.secondary, background: rq.panel, border: `1px solid ${rq.border}` };
const tonightPageStyle = { display: 'grid', gap: 10, alignContent: 'start' };
const heroStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '12px 14px', border: `1px solid ${rq.border}`, background: rq.panel, flexWrap: 'wrap' };
const eyebrowStyle = { margin: '0 0 6px', color: rq.accent, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.4 };
const titleStyle = { margin: 0, color: rq.text, fontSize: 'clamp(19px, 3vw, 22px)', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const subtitleStyle = { margin: '5px 0 0', color: rq.secondary, fontSize: 12, lineHeight: 1.4, maxWidth: 760 };
const primaryButtonStyle = { background: rq.accent, color: '#fff', border: 'none', borderRadius: 0, fontWeight: 900, display: 'inline-flex', gap: 7, alignItems: 'center', minHeight: 34, padding: '7px 11px', fontSize: 12 };
const secondaryButtonStyle = { background: rq.accentSoft, color: rq.text, border: `1px solid ${rq.border}`, borderRadius: 0, fontWeight: 900, display: 'inline-flex', gap: 7, alignItems: 'center', minHeight: 34, padding: '7px 11px', fontSize: 12 };
const quickNoteStyle = { display: 'grid', gridTemplateColumns: 'minmax(190px, 0.8fr) minmax(260px, 1.7fr) auto', gap: 10, alignItems: 'center', padding: 10, background: rq.panel, border: `1px solid ${rq.borderSoft}`, minWidth: 0 };
const quickNoteTitleStyle = { margin: 0, color: rq.text, fontSize: 13, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 7 };
const quickNoteHelpStyle = { margin: '3px 0 0', color: rq.muted, fontSize: 11, lineHeight: 1.35 };
const quickNoteInputStyle = { minHeight: 42, maxHeight: 84, width: '100%', resize: 'vertical', background: rq.bg, color: rq.text, border: `1px solid ${rq.borderSoft}`, padding: 8, fontSize: 12, lineHeight: 1.35, outline: 'none' };
const summaryGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 };
const metricCardStyle = { background: rq.card, border: `1px solid ${rq.borderSoft}`, padding: 10, textAlign: 'left' };
const metricButtonStyle = { ...metricCardStyle, cursor: 'pointer', color: 'inherit' };
const metricLabelStyle = { color: rq.muted, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8 };
const metricValueStyle = { display: 'block', color: rq.text, fontSize: 22, fontWeight: 950, marginTop: 6 };
const metricHelperStyle = { display: 'block', color: rq.secondary, fontSize: 12, marginTop: 4 };
const mainGridStyle = { display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 10, minWidth: 0 };
const fourGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, minWidth: 0 };
const panelStyle = { background: rq.panel, border: `1px solid ${rq.borderSoft}`, padding: 10, minWidth: 0 };
const panelHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 };
const panelTitleStyle = { margin: 0, color: rq.text, fontSize: 13, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 7 };
const linkButtonStyle = { background: 'transparent', color: rq.accent, border: `1px solid ${rq.border}`, padding: '5px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 900 };
const healthRowStyle = (done) => ({ display: 'grid', gridTemplateColumns: '16px minmax(0, 1fr) auto', gap: 7, alignItems: 'center', padding: '6px 8px', background: done ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${done ? 'rgba(34,197,94,0.22)' : 'rgba(245,158,11,0.22)'}`, color: rq.secondary, fontSize: 12 });
const prepBoxStyle = { marginTop: 8, padding: 8, background: rq.bg, border: `1px solid ${rq.borderSoft}`, color: rq.secondary, display: 'grid', gap: 6, fontSize: 11 };
const prepChecklistListStyle = { display: 'grid', gap: 6, marginTop: 4 };
const prepChecklistItemStyle = (completed) => ({ display: 'grid', gridTemplateColumns: '14px minmax(0, 1fr) auto', gap: 7, alignItems: 'center', textAlign: 'left', background: completed ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)', color: completed ? rq.secondary : rq.text, border: `1px solid ${completed ? 'rgba(34,197,94,0.25)' : rq.borderSoft}`, padding: '5px 7px', cursor: 'pointer', fontSize: 11 });
const emptyStyle = { margin: 0, color: rq.muted, fontSize: 12, padding: 9, border: `1px dashed ${rq.borderSoft}` };
const previewRowStyle = { display: 'grid', gap: 3, padding: 8, background: rq.bg, border: `1px solid ${rq.borderSoft}`, color: rq.text, fontSize: 12 };
const quickActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', padding: 10, background: rq.panel, border: `1px solid ${rq.borderSoft}` };
const quickActionStyle = { display: 'inline-flex', alignItems: 'center', gap: 7, background: rq.accentSoft, color: rq.text, border: `1px solid ${rq.border}`, padding: '7px 10px', cursor: 'pointer', fontWeight: 900, fontSize: 12 };
