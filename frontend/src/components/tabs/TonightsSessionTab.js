import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, FileText, Mail, Map, Monitor, RefreshCw, ScrollText, Swords, UserCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { Button } from '@/components/ui/button';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "Germania One", Georgia, serif)';

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

const readinessLabels = {
  story: 'Story arc/chapter chosen',
  players: 'Players linked or added',
  encounters: 'Combat option ready',
  handouts: 'Secrets or handouts prepared',
  maps: 'Map or battle map available',
  notes: 'Session notes started',
};

function normalizeArray(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  return [];
}

function latest(items, count = 3) {
  return [...items]
    .sort((a, b) => String(b.updated_at || b.created_at || b.sent_at || '').localeCompare(String(a.updated_at || a.created_at || a.sent_at || '')))
    .slice(0, count);
}

function findCurrentChapter(arcs) {
  const activeArc = arcs.find(arc => arc.status === 'active') || arcs[0];
  if (!activeArc) return { arc: null, chapter: null };
  const chapters = activeArc.chapters || [];
  const chapter = chapters.find(item => ['prepped', 'planned'].includes(item.status)) || chapters[0] || null;
  return { arc: activeArc, chapter };
}

export default function TonightsSessionTab({ campaignId, onOpenTab }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [savingQuickNote, setSavingQuickNote] = useState(false);
  const [data, setData] = useState({
    players: [], recipients: [], npcs: [], handouts: [], scenarios: [], maps: [], notes: [], arcs: [],
  });

  const loadLaunchpad = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [playersRes, recipientsRes, npcsRes, handoutsRes, scenariosRes, mapsRes, notesRes, arcsRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/players`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/handout-recipients`).catch(() => ({ data: { recipients: [] } })),
        apiClient.get(`/campaigns/${campaignId}/npcs`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/handouts`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/combat-scenarios`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/maps`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/ingame-notes`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/story-arcs`).catch(() => ({ data: [] })),
      ]);

      setData({
        players: normalizeArray(playersRes.data, 'players'),
        recipients: normalizeArray(recipientsRes.data, 'recipients'),
        npcs: normalizeArray(npcsRes.data, 'npcs'),
        handouts: normalizeArray(handoutsRes.data, 'handouts'),
        scenarios: normalizeArray(scenariosRes.data, 'scenarios'),
        maps: normalizeArray(mapsRes.data, 'maps'),
        notes: normalizeArray(notesRes.data, 'notes'),
        arcs: normalizeArray(arcsRes.data, 'story_arcs'),
      });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load tonight\'s session launchpad');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campaignId]);

  useEffect(() => { loadLaunchpad(); }, [loadLaunchpad]);

  const current = useMemo(() => findCurrentChapter(data.arcs), [data.arcs]);
  const currentCombats = current.chapter?.combats || [];
  const readyCombats = currentCombats.filter(combat => combat.status === 'ready').length;
  const playerCount = Math.max(data.players.length, data.recipients.length);

  const readiness = useMemo(() => {
    const checks = {
      story: Boolean(current.arc || current.chapter),
      players: playerCount > 0,
      encounters: data.scenarios.length > 0 || currentCombats.length > 0,
      handouts: data.handouts.length > 0,
      maps: data.maps.length > 0,
      notes: data.notes.length > 0,
    };
    const complete = Object.values(checks).filter(Boolean).length;
    return { checks, complete, total: Object.keys(checks).length, score: Math.round((complete / Object.keys(checks).length) * 100) };
  }, [current.arc, current.chapter, playerCount, data.scenarios.length, currentCombats.length, data.handouts.length, data.maps.length, data.notes.length]);

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

  const openLivePlay = () => navigate(`/gm-screen/${campaignId}`);
  const readinessItems = Object.entries(readiness.checks).map(([key, done]) => ({ key, done, label: readinessLabels[key] }));

  if (loading) return <section style={loadingStyle}>Loading tonight's session launchpad…</section>;

  return (
    <section data-testid="tonights-session-tab" style={shellStyle}>
      <header style={heroStyle}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={eyebrowStyle}>Session Launchpad</p>
          <h2 style={titleStyle}>Tonight's Session</h2>
          <p style={subtitleStyle}>Check what matters, capture last-minute notes, then open Live Play in this tab. Extended screens only open separately from Player Display.</p>
        </div>
        <div style={heroActionsStyle}>
          <Button onClick={() => loadLaunchpad(true)} disabled={refreshing} style={secondaryButtonStyle} data-testid="refresh-run-sheet"><RefreshCw size={15} /> {refreshing ? 'Refreshing…' : 'Refresh'}</Button>
          <Button onClick={openLivePlay} style={primaryButtonStyle}><Monitor size={15} /> Start Live Play</Button>
        </div>
      </header>

      <section style={flowStripStyle}>
        <FlowStep number="1" label="Plan" detail={current.arc?.title || 'Choose story arc'} done={Boolean(current.arc)} />
        <FlowStep number="2" label="Prep" detail={current.chapter?.title || 'Pick tonight\'s chapter'} done={Boolean(current.chapter)} />
        <FlowStep number="3" label="Run" detail={`${playerCount} player${playerCount === 1 ? '' : 's'} ready`} done={playerCount > 0} />
        <FlowStep number="4" label="Record" detail={`${data.notes.length} session note${data.notes.length === 1 ? '' : 's'}`} done={data.notes.length > 0} />
      </section>

      <section style={focusGridStyle}>
        <ReadinessCard score={readiness.score} complete={readiness.complete} total={readiness.total} />
        <FocusCard icon={ScrollText} title="Current Arc" value={current.arc?.title || 'No arc selected'} helper={current.chapter ? `Chapter: ${current.chapter.title}` : 'Create or open Story Arcs'} action="Story Arcs" onClick={() => onOpenTab?.('story-arcs')} />
        <FocusCard icon={Swords} title="Combat Beats" value={currentCombats.length || data.scenarios.length} helper={readyCombats ? `${readyCombats} ready in chapter` : 'Planned fights and saved encounters'} action="Encounters" onClick={() => onOpenTab?.('combat')} />
        <FocusCard icon={Mail} title="Reveals" value={data.handouts.length} helper="Secrets, clues, letters, lore" action="Handouts" onClick={() => onOpenTab?.('handouts')} />
      </section>

      <section style={launchGridStyle}>
        <section style={panelStyle}>
          <PanelHeader icon={CheckCircle2} title="Tonight check" actionLabel="Open Story Arcs" onAction={() => onOpenTab?.('story-arcs')} />
          <div style={healthListStyle}>{readinessItems.map(item => <HealthRow key={item.key} item={item} />)}</div>
        </section>

        <section style={quickNoteStyle}>
          <div>
            <h3 style={quickNoteTitleStyle}><FileText size={17} /> Quick session note</h3>
            <p style={quickNoteHelpStyle}>Use this for last-minute reminders, rulings, player choices, loot, consequences, or a cliffhanger.</p>
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
      </section>

      <section style={assetGridStyle}>
        <AssetPanel icon={UserCircle} title="NPCs for tonight" items={latest(data.npcs)} empty="No NPCs prepared yet." getTitle={(item) => item.name || 'NPC'} getMeta={(item) => item.role || item.description || item.notes || ''} onOpen={() => onOpenTab?.('npcs')} />
        <AssetPanel icon={Swords} title="Combats" items={latest([...currentCombats, ...data.scenarios])} empty="No combat beats or encounters yet." getTitle={(item) => item.title || item.name || 'Combat'} getMeta={(item) => item.trigger || item.status || `${item.combatants?.length || 0} combatants`} onOpen={() => onOpenTab?.('combat')} />
        <AssetPanel icon={Mail} title="Reveals" items={latest(data.handouts)} empty="No handouts yet." getTitle={(item) => item.title || 'Handout'} getMeta={(item) => item.shared_with?.length ? 'Shared' : 'Draft'} onOpen={() => onOpenTab?.('handouts')} />
        <AssetPanel icon={Map} title="Maps" items={latest(data.maps)} empty="No maps uploaded yet." getTitle={(item) => item.name || item.title || 'Map'} getMeta={(item) => item.description || item.map_type || ''} onOpen={() => onOpenTab?.('maps')} />
        <AssetPanel icon={FileText} title="Recent notes" items={latest(data.notes)} empty="No session notes yet." getTitle={(item) => item.title || item.content?.slice(0, 80) || 'Session note'} getMeta={(item) => item.content || item.created_at || ''} onOpen={() => onOpenTab?.('ingame-notes')} />
        <AssetPanel icon={Users} title="Players" items={latest(data.players.length ? data.players : data.recipients)} empty="No players linked yet." getTitle={(item) => item.character_name || item.username || item.name || 'Player'} getMeta={(item) => item.character_class || item.email || item.status || ''} onOpen={() => onOpenTab?.('players')} />
      </section>

      <section style={bottomActionStyle}>
        <button type="button" onClick={() => onOpenTab?.('story-arcs')} style={secondaryButtonStyle}><ScrollText size={15} /> Review Arc</button>
        <button type="button" onClick={() => onOpenTab?.('ingame-notes')} style={secondaryButtonStyle}><Clock size={15} /> Session Notes</button>
        <button type="button" onClick={openLivePlay} style={primaryButtonStyle}><Monitor size={15} /> Start Live Play</button>
      </section>
    </section>
  );
}

function FlowStep({ number, label, detail, done }) {
  return (
    <div style={flowStepStyle(done)}>
      <span style={flowNumberStyle(done)}>{number}</span>
      <strong>{label}</strong>
      <span>{detail}</span>
    </div>
  );
}

function ReadinessCard({ score, complete, total }) {
  const color = score >= 75 ? rq.good : score >= 45 ? rq.warn : rq.accent;
  return (
    <article style={readinessStyle}>
      <div style={metricTopStyle}><span style={metricLabelStyle}>Launch readiness</span><CheckCircle2 size={18} color={color} /></div>
      <strong style={{ ...metricValueStyle, color }}>{score}%</strong>
      <span style={metricHelperStyle}>{complete}/{total} signals ready</span>
    </article>
  );
}

function FocusCard({ icon: Icon, title, value, helper, action, onClick }) {
  return (
    <button type="button" onClick={onClick} style={focusCardStyle}>
      <div style={metricTopStyle}><span style={metricLabelStyle}>{title}</span><Icon size={18} color={rq.text} /></div>
      <strong style={focusValueStyle}>{value}</strong>
      <span style={metricHelperStyle}>{helper}</span>
      <small style={focusActionStyle}>{action}</small>
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

function AssetPanel({ icon, title, items, empty, getTitle, getMeta, onOpen }) {
  return (
    <section style={panelStyle}>
      <PanelHeader icon={icon} title={title} actionLabel="Open" onAction={onOpen} />
      <ListPreview items={items} empty={empty} getTitle={getTitle} getMeta={getMeta} />
    </section>
  );
}

function ListPreview({ items, empty, getTitle, getMeta }) {
  if (!items.length) return <p style={emptyStyle}>{empty}</p>;
  return <div style={listStyle}>{items.map((item, index) => <PreviewRow key={item.id || index} title={getTitle(item)} meta={getMeta(item)} />)}</div>;
}

function PreviewRow({ title, meta }) {
  return (
    <div style={previewRowStyle}>
      <strong>{title}</strong>
      {meta && <span>{String(meta).slice(0, 120)}{String(meta).length > 120 ? '…' : ''}</span>}
    </div>
  );
}

const shellStyle = { display: 'grid', gap: 14, fontFamily: fontStack };
const loadingStyle = { padding: 24, color: rq.soft, background: rq.panel, border: `1px solid ${rq.line}` };
const heroStyle = { display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', padding: 16, border: `1px solid ${rq.line}`, background: rq.card, flexWrap: 'wrap' };
const heroActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' };
const eyebrowStyle = { margin: '0 0 5px', color: rq.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.1em' };
const titleStyle = { margin: 0, color: rq.text, fontSize: 'clamp(34px, 5vw, 58px)', fontWeight: 950, letterSpacing: '0.025em', lineHeight: 0.95, fontFamily: titleFont };
const subtitleStyle = { margin: '7px 0 0', color: rq.soft, fontSize: 14, lineHeight: 1.45, maxWidth: 760 };
const primaryButtonStyle = { minHeight: 40, background: rq.accent, color: rq.text, border: 0, borderRadius: 0, fontWeight: 950, display: 'inline-flex', gap: 8, alignItems: 'center', justifyContent: 'center', padding: '0 13px', fontFamily: fontStack, cursor: 'pointer' };
const secondaryButtonStyle = { minHeight: 40, background: rq.panel, color: rq.text, border: 0, borderRadius: 0, fontWeight: 900, display: 'inline-flex', gap: 8, alignItems: 'center', justifyContent: 'center', padding: '0 13px', fontFamily: fontStack, cursor: 'pointer' };
const flowStripStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', borderTop: `1px solid ${rq.line}`, borderLeft: `1px solid ${rq.line}` };
const flowStepStyle = (done) => ({ minHeight: 78, display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr)', gridTemplateRows: 'auto auto', alignContent: 'center', columnGap: 10, rowGap: 2, padding: '11px 12px', borderRight: `1px solid ${rq.line}`, borderBottom: `1px solid ${rq.line}`, background: done ? rq.accentSoft : rq.card, color: rq.text });
const flowNumberStyle = (done) => ({ gridRow: '1 / span 2', width: 32, height: 32, display: 'grid', placeItems: 'center', background: done ? rq.accent : rq.bg, color: rq.text, fontWeight: 950 });
const focusGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 0, borderTop: `1px solid ${rq.line}`, borderLeft: `1px solid ${rq.line}` };
const readinessStyle = { background: rq.card, border: 0, borderRight: `1px solid ${rq.line}`, borderBottom: `1px solid ${rq.line}`, padding: 14, textAlign: 'left', color: rq.text };
const focusCardStyle = { ...readinessStyle, cursor: 'pointer', fontFamily: fontStack, display: 'grid', gap: 4, minWidth: 0 };
const metricTopStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 };
const metricLabelStyle = { color: rq.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const metricValueStyle = { display: 'block', color: rq.text, fontSize: 30, fontWeight: 950, marginTop: 9 };
const focusValueStyle = { display: 'block', color: rq.text, fontSize: 18, fontWeight: 950, marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const metricHelperStyle = { display: 'block', color: rq.soft, fontSize: 12, marginTop: 3 };
const focusActionStyle = { color: rq.text, background: rq.accent, justifySelf: 'start', padding: '4px 7px', marginTop: 6, fontWeight: 950, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' };
const launchGridStyle = { display: 'grid', gridTemplateColumns: 'minmax(min(320px, 100%), 0.9fr) minmax(min(320px, 100%), 1.4fr)', gap: 12, minWidth: 0 };
const panelStyle = { background: rq.card, border: `1px solid ${rq.line}`, padding: 14, minWidth: 0 };
const panelHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 };
const panelTitleStyle = { margin: 0, color: rq.text, fontSize: 15, fontWeight: 950, display: 'flex', alignItems: 'center', gap: 8 };
const linkButtonStyle = { background: rq.panel, color: rq.text, border: 0, padding: '7px 9px', cursor: 'pointer', fontSize: 11, fontWeight: 950, fontFamily: fontStack };
const healthListStyle = { display: 'grid', gap: 8 };
const healthRowStyle = (done) => ({ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr) auto', gap: 8, alignItems: 'center', padding: '8px 10px', background: rq.bg, borderLeft: `5px solid ${done ? rq.good : rq.warn}`, color: rq.soft, fontSize: 13 });
const quickNoteStyle = { display: 'grid', gridTemplateColumns: 'minmax(200px, 0.65fr) minmax(260px, 1.35fr) auto', gap: 12, alignItems: 'center', padding: 14, background: rq.card, border: `1px solid ${rq.line}`, minWidth: 0 };
const quickNoteTitleStyle = { margin: 0, color: rq.text, fontSize: 15, fontWeight: 950, display: 'flex', alignItems: 'center', gap: 8 };
const quickNoteHelpStyle = { margin: '5px 0 0', color: rq.muted, fontSize: 12, lineHeight: 1.45 };
const quickNoteInputStyle = { minHeight: 72, width: '100%', resize: 'vertical', background: rq.bg, color: rq.text, border: `1px solid ${rq.lineStrong}`, padding: 10, fontSize: 13, lineHeight: 1.45, outline: 'none', fontFamily: fontStack, colorScheme: 'dark' };
const assetGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 12, minWidth: 0 };
const emptyStyle = { margin: 0, color: rq.muted, fontSize: 13, padding: 12, border: `1px dashed ${rq.line}` };
const listStyle = { display: 'grid', gap: 8 };
const previewRowStyle = { display: 'grid', gap: 4, padding: 10, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, fontSize: 13 };
const bottomActionStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', padding: 12, background: rq.card, border: `1px solid ${rq.line}` };
