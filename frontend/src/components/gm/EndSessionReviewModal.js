import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Monitor, RefreshCw, ScrollText, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { createDisplayState, publishCampaignDisplayState } from '@/lib/liveDisplayBus';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "Germania One", Georgia, serif)';
const rq = { bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', red: '#d00000', good: '#1f9d66', warn: '#d99222', text: '#ffffff', soft: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.16)' };

function number(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeArray(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  return [];
}

function checkpoints(chapter) {
  return asList(chapter?.scenes).map((item, index) => {
    if (typeof item === 'string') return { id: `checkpoint-${index + 1}`, title: item, status: 'upcoming', notes: '' };
    return {
      id: item?.id || `checkpoint-${index + 1}`,
      title: item?.title || item?.name || `Checkpoint ${index + 1}`,
      status: item?.status || 'upcoming',
      notes: item?.notes || item?.description || '',
    };
  });
}

function findStoryFocus(arcs = []) {
  const arc = arcs.find(item => item.status === 'active') || arcs.find(item => item.status !== 'completed') || arcs[0] || null;
  if (!arc) return { arc: null, chapter: null, nextChapter: null, points: [], reached: [], skipped: [], upcoming: [], next: null };
  const chapters = asList(arc.chapters);
  const chapter = chapters.find(item => item.status === 'prepped') || chapters.find(item => item.status === 'planned') || chapters.find(item => item.status !== 'played') || chapters[0] || null;
  const chapterIndex = chapters.findIndex(item => item.id === chapter?.id);
  const nextChapter = chapters.slice(Math.max(chapterIndex + 1, 0)).find(item => item.status !== 'played') || null;
  const points = checkpoints(chapter);
  const reached = points.filter(point => point.status === 'reached');
  const skipped = points.filter(point => point.status === 'skipped');
  const upcoming = points.filter(point => !['reached', 'skipped'].includes(point.status));
  return { arc, chapter, chapterIndex, nextChapter, points, reached, skipped, upcoming, next: upcoming[0] || null };
}

function buildRecapNote(summary, storyFocus, options) {
  const session = summary?.session || {};
  const awards = Array.isArray(session.awards) ? session.awards : [];
  const actors = Array.isArray(session.actors) ? session.actors : [];
  const awardLines = awards.length ? awards.map(award => `- ${award.title}: ${award.name} (${award.value})`).join('\n') : '- No awards generated.';
  const actorLines = actors.length ? actors.slice(0, 8).map(actor => `- ${actor.name}: ${actor.rolls} rolls, ${actor.nat20s} Nat 20s, ${actor.nat1s} Nat 1s`).join('\n') : '- No player rolls captured.';
  const reachedLines = storyFocus?.reached?.length ? storyFocus.reached.map(point => `- ${point.title}`).join('\n') : '- No checkpoints marked reached.';
  const skippedLines = storyFocus?.skipped?.length ? storyFocus.skipped.map(point => `- ${point.title}`).join('\n') : '- No checkpoints skipped.';
  const upcomingLines = storyFocus?.upcoming?.length ? storyFocus.upcoming.slice(0, 5).map(point => `- ${point.title}`).join('\n') : '- No unresolved checkpoints.';
  const storyActionLines = [
    options?.markChapterPlayed ? '- Current chapter marked played.' : null,
    options?.prepNextChapter ? `- Next chapter prepped: ${storyFocus?.nextChapter?.title || 'None available'}.` : null,
  ].filter(Boolean).join('\n') || '- No chapter status changes selected.';

  return [
    'GM-Only End Session Recap',
    '',
    'GM-only story wrap-up:',
    `Arc: ${storyFocus?.arc?.title || 'No active arc'}`,
    `Chapter: ${storyFocus?.chapter?.title || 'No active chapter'}`,
    '',
    'Checkpoints reached:',
    reachedLines,
    '',
    'Checkpoints skipped:',
    skippedLines,
    '',
    'Still unresolved:',
    upcomingLines,
    '',
    'Story wrap-up actions:',
    storyActionLines,
    '',
    'Public player recap data:',
    `Player rolls: ${number(session.playerRolls ?? session.totalRolls)}`,
    `GM/table rolls hidden from player focus: ${number(session.gmRolls)}`,
    `Dice rolled: ${number(session.totalDice)}`,
    `Nat 20s: ${number(session.nat20s)}`,
    `Nat 1s: ${number(session.nat1s)}`,
    '',
    'Awards:',
    awardLines,
    '',
    'Player Roll Board:',
    actorLines,
  ].join('\n');
}

export default function EndSessionReviewModal({ campaignId, campaignName = 'Campaign', onClose }) {
  const [summary, setSummary] = useState(null);
  const [storyArcs, setStoryArcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAllTime, setShowAllTime] = useState(true);
  const [saveRecapNote, setSaveRecapNote] = useState(true);
  const [markChapterPlayed, setMarkChapterPlayed] = useState(false);
  const [prepNextChapter, setPrepNextChapter] = useState(false);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const [rollResponse, arcsResponse] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/roll-events/summary`),
        apiClient.get(`/campaigns/${campaignId}/story-arcs`).catch(() => ({ data: [] })),
      ]);
      setSummary(rollResponse.data);
      setStoryArcs(normalizeArray(arcsResponse.data, 'story_arcs'));
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not preview session stats');
      setSummary({ campaignName, session: { playerRolls: 0, gmRolls: 0, totalRolls: 0, totalDice: 0, nat20s: 0, nat1s: 0, actors: [], awards: [] }, allTime: {} });
      setStoryArcs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPreview(); }, [campaignId]);

  const storyFocus = useMemo(() => findStoryFocus(storyArcs), [storyArcs]);
  const session = summary?.session || {};
  const awards = Array.isArray(session.awards) ? session.awards : [];
  const actors = Array.isArray(session.actors) ? session.actors : [];
  const topActor = actors[0];
  const playerRollCount = number(session.playerRolls ?? session.totalRolls);
  const gmRollCount = number(session.gmRolls);
  const storyTotal = storyFocus.points.length;
  const storyDone = storyFocus.reached.length + storyFocus.skipped.length;
  const storyProgress = storyTotal ? Math.round((storyDone / storyTotal) * 100) : 0;

  const displaySummary = useMemo(() => {
    if (!summary) return null;
    return showAllTime ? summary : { ...summary, allTime: { totalRolls: 0, totalDice: 0, nat20s: 0, nat1s: 0, actors: [] } };
  }, [summary, showAllTime]);

  const applyStoryWrapUp = async () => {
    if (!storyFocus.arc || !storyFocus.chapter || (!markChapterPlayed && !prepNextChapter)) return;
    const nextChapters = asList(storyFocus.arc.chapters).map(chapter => {
      if (chapter.id === storyFocus.chapter.id && (markChapterPlayed || prepNextChapter)) return { ...chapter, status: 'played' };
      if (prepNextChapter && storyFocus.nextChapter && chapter.id === storyFocus.nextChapter.id) return { ...chapter, status: 'prepped' };
      return chapter;
    });
    const response = await apiClient.put(`/campaigns/${campaignId}/story-arcs/${storyFocus.arc.id}`, { chapters: nextChapters });
    setStoryArcs(prev => prev.map(arc => arc.id === response.data.id ? response.data : arc));
  };

  const sendEndSessionShow = async () => {
    setSending(true);
    try {
      const closedChapterStory = storyFocus;
      await applyStoryWrapUp();
      const response = await apiClient.post(`/campaigns/${campaignId}/roll-events/end-session`);
      const finalSummary = showAllTime ? response.data : { ...response.data, allTime: { totalRolls: 0, totalDice: 0, nat20s: 0, nat1s: 0, actors: [] } };
      publishCampaignDisplayState(campaignId, createDisplayState('end-session-stats', finalSummary));
      if (saveRecapNote) {
        await apiClient.post(`/campaigns/${campaignId}/ingame-notes`, { content: buildRecapNote(response.data, closedChapterStory, { markChapterPlayed, prepNextChapter }) }).catch(() => null);
      }
      const rolls = response.data?.session?.playerRolls ?? response.data?.session?.totalRolls ?? 0;
      if (rolls > 0) toast.success('Dice-only end session show sent to player display', { description: 'Roll stats were archived. GM-only story wrap-up was applied separately.' });
      else toast.info('Dice-only end session show sent', { description: 'GM-only story wrap-up was applied. No player rolls were captured.' });
      onClose?.();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not end session');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={overlayStyle} role="presentation">
      <section style={modalStyle} role="dialog" aria-modal="true" aria-labelledby="end-session-title">
        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>GM Review</p>
            <h2 id="end-session-title" style={titleStyle}>End Session Control</h2>
            <p style={subtitleStyle}>Check player dice stats, handle GM-only story wrap-up, then send a dice-only recap to the extended player display.</p>
          </div>
          <button type="button" onClick={onClose} disabled={sending} style={closeButtonStyle} aria-label="Close end session review"><X size={20} /></button>
        </header>

        {loading ? (
          <div style={loadingStyle}>Loading session stats and GM story progress…</div>
        ) : (
          <>
            <section style={metricGridStyle}>
              <Metric label="Player Rolls" value={playerRollCount} hot />
              <Metric label="Nat 20s" value={number(session.nat20s)} />
              <Metric label="Nat 1s" value={number(session.nat1s)} />
              <Metric label="Dice Rolled" value={number(session.totalDice)} />
              <Metric label="GM/Table Rolls" value={gmRollCount} muted />
              <Metric label="Top Roller" value={topActor?.name || 'None'} text />
            </section>

            {playerRollCount === 0 && (
              <section style={warningStyle}>
                No player rolls have been captured yet. The public player show can still play, but it will mostly say the dice were quiet. Players can use virtual sheet rolls or the optional physical roll logger.
              </section>
            )}

            <section style={storyWrapStyle} data-testid="end-session-story-wrapup">
              <div style={storyHeaderStyle}>
                <div style={{ minWidth: 0 }}>
                  <p style={eyebrowStyle}>GM-only Story Wrap-Up</p>
                  <h3 style={storyTitleStyle}>{storyFocus.arc?.title || 'No active story arc'}</h3>
                  <p style={storyMetaStyle}>{storyFocus.chapter ? `Chapter: ${storyFocus.chapter.title}` : 'No prepped/planned chapter found.'}</p>
                </div>
                <div style={storyMetricStyle}>
                  <strong>{storyTotal ? `${storyDone}/${storyTotal}` : '0/0'}</strong>
                  <span>checkpoints done</span>
                </div>
              </div>
              <p style={gmOnlyNoticeStyle}>This section is for the GM’s campaign tracking and notes only. It is not sent to the player display.</p>
              <div style={progressTrackStyle}><span style={progressBarStyle(storyProgress)} /></div>
              <div style={storyPreviewGridStyle}>
                <StoryCount title="Reached" value={storyFocus.reached.length} tone="good" />
                <StoryCount title="Skipped" value={storyFocus.skipped.length} tone="warn" />
                <StoryCount title="Unresolved" value={storyFocus.upcoming.length} tone="red" />
                <StoryCount title="Next Chapter" value={storyFocus.nextChapter?.title || 'None'} text />
              </div>
              <div style={splitStyle}>
                <div style={panelStyle}>
                  <h3 style={sectionTitleStyle}>GM checkpoint preview</h3>
                  {storyFocus.points.length ? storyFocus.points.slice(0, 6).map(point => <PreviewRow key={point.id} title={point.title} text={point.status || 'upcoming'} />) : <p style={mutedStyle}>No checkpoints found for this chapter.</p>}
                </div>
                <div style={panelStyle}>
                  <h3 style={sectionTitleStyle}>GM story options</h3>
                  <label style={checkRowStyle}><input type="checkbox" checked={markChapterPlayed} onChange={event => setMarkChapterPlayed(event.target.checked)} disabled={!storyFocus.chapter || prepNextChapter} /> Mark current chapter played</label>
                  <label style={checkRowStyle}><input type="checkbox" checked={prepNextChapter} onChange={event => { setPrepNextChapter(event.target.checked); if (event.target.checked) setMarkChapterPlayed(true); }} disabled={!storyFocus.nextChapter} /> Mark current chapter played and prep next chapter</label>
                  {!storyFocus.nextChapter && <p style={mutedStyle}>No next chapter is available yet. Add one in Story Arcs to prep it from here.</p>}
                </div>
              </div>
            </section>

            <section style={splitStyle}>
              <div style={panelStyle}>
                <h3 style={sectionTitleStyle}>Awards preview</h3>
                {awards.length ? awards.slice(0, 4).map(award => <PreviewRow key={`${award.title}-${award.name}`} title={award.title} text={`${award.name} · ${award.value}`} />) : <p style={mutedStyle}>No awards yet.</p>}
              </div>
              <div style={panelStyle}>
                <h3 style={sectionTitleStyle}>Player board preview</h3>
                {actors.length ? actors.slice(0, 5).map(actor => <PreviewRow key={actor.name} title={actor.name} text={`${actor.rolls} rolls · ${actor.nat20s} Nat 20s · ${actor.nat1s} Nat 1s`} />) : <p style={mutedStyle}>No player rolls captured.</p>}
              </div>
            </section>

            <section style={optionsStyle}>
              <label style={checkRowStyle}><input type="checkbox" checked={showAllTime} onChange={event => setShowAllTime(event.target.checked)} /> Show all-time campaign dice stats in the player presentation</label>
              <label style={checkRowStyle}><input type="checkbox" checked={saveRecapNote} onChange={event => setSaveRecapNote(event.target.checked)} /> Save a GM-only roll and story recap note to Session Notes</label>
              <p style={mutedStyle}>The player display receives dice and roll stats only. Story wrap-up choices only affect GM campaign tracking.</p>
            </section>
          </>
        )}

        <footer style={actionsStyle}>
          <button type="button" onClick={loadPreview} disabled={loading || sending} style={secondaryButtonStyle}><RefreshCw size={15} /> Refresh Preview</button>
          <button type="button" onClick={onClose} disabled={sending} style={secondaryButtonStyle}>Cancel</button>
          <button type="button" onClick={sendEndSessionShow} disabled={loading || sending || !displaySummary} style={primaryButtonStyle}><Monitor size={15} /> {sending ? 'Sending…' : 'Send Dice-Only Player Show'}</button>
        </footer>
      </section>
    </div>
  );
}

function Metric({ label, value, hot = false, muted = false, text = false }) {
  return <article style={metricStyle(hot, muted)}><strong style={{ fontSize: text ? 22 : 34 }}>{value}</strong><span>{label}</span></article>;
}

function StoryCount({ title, value, tone = 'red', text = false }) {
  return <article style={storyCountStyle(tone)}><strong style={{ fontSize: text ? 15 : 26 }}>{value}</strong><span>{title}</span></article>;
}

function PreviewRow({ title, text }) {
  return <div style={previewRowStyle}><strong>{title}</strong><span>{text}</span></div>;
}

const overlayStyle = { position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,0.78)', display: 'grid', placeItems: 'center', padding: 16 };
const modalStyle = { width: 'min(1040px, 100%)', maxHeight: '92dvh', overflowY: 'auto', background: rq.panel, border: `1px solid ${rq.line}`, color: rq.text, padding: 18, fontFamily: fontStack, boxShadow: 'none' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', borderBottom: `1px solid ${rq.line}`, paddingBottom: 14, marginBottom: 14 };
const eyebrowStyle = { margin: '0 0 4px', color: rq.red, fontSize: 11, fontWeight: 950, letterSpacing: '0.12em', textTransform: 'uppercase' };
const titleStyle = { margin: 0, color: rq.text, fontFamily: titleFont, fontSize: 'clamp(34px, 5vw, 62px)', lineHeight: 0.95 };
const subtitleStyle = { margin: '7px 0 0', color: rq.soft, lineHeight: 1.45 };
const closeButtonStyle = { width: 40, height: 40, display: 'grid', placeItems: 'center', background: rq.card, color: rq.text, border: 0, cursor: 'pointer' };
const loadingStyle = { minHeight: 180, display: 'grid', placeItems: 'center', color: rq.soft, background: rq.bg, border: `1px dashed ${rq.line}` };
const metricGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 };
const metricStyle = (hot, muted) => ({ minHeight: 92, display: 'grid', alignContent: 'center', gap: 5, padding: 12, background: hot ? rq.red : muted ? rq.bg : rq.card, border: `1px solid ${rq.line}`, color: rq.text, textAlign: 'center' });
const warningStyle = { background: rq.bg, border: `1px solid ${rq.line}`, borderLeft: `6px solid ${rq.red}`, padding: 12, color: rq.soft, marginTop: 12, lineHeight: 1.45 };
const storyWrapStyle = { display: 'grid', gap: 12, background: rq.card, border: `1px solid ${rq.line}`, borderLeft: `7px solid ${rq.red}`, padding: 12, marginTop: 12 };
const storyHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' };
const storyTitleStyle = { margin: 0, color: rq.text, fontSize: 22, fontWeight: 950, lineHeight: 1.1 };
const storyMetaStyle = { margin: '5px 0 0', color: rq.soft, lineHeight: 1.35, fontSize: 13 };
const gmOnlyNoticeStyle = { margin: 0, color: rq.text, background: rq.bg, border: `1px solid ${rq.line}`, borderLeft: `5px solid ${rq.red}`, padding: '8px 10px', fontSize: 12, fontWeight: 850, lineHeight: 1.4 };
const storyMetricStyle = { minWidth: 132, display: 'grid', gap: 3, justifyItems: 'center', background: rq.bg, border: `1px solid ${rq.line}`, padding: 10, textTransform: 'uppercase', fontSize: 10, fontWeight: 950, color: rq.muted };
const progressTrackStyle = { height: 12, background: rq.bg, border: `1px solid ${rq.line}`, overflow: 'hidden' };
const progressBarStyle = (progress) => ({ display: 'block', width: `${Math.max(0, Math.min(100, progress))}%`, height: '100%', background: rq.red, transition: 'width 240ms ease' });
const storyPreviewGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 };
const storyCountStyle = (tone) => ({ minHeight: 72, display: 'grid', gap: 4, alignContent: 'center', padding: 10, background: rq.bg, border: `1px solid ${rq.line}`, borderLeft: `5px solid ${tone === 'good' ? rq.good : tone === 'warn' ? rq.warn : rq.red}`, color: rq.text });
const splitStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 12 };
const panelStyle = { background: rq.card, border: `1px solid ${rq.line}`, padding: 12 };
const sectionTitleStyle = { margin: '0 0 10px', color: rq.text, fontSize: 16, fontWeight: 950 };
const previewRowStyle = { display: 'grid', gap: 3, background: rq.bg, borderLeft: `5px solid ${rq.red}`, padding: 9, marginTop: 7 };
const optionsStyle = { display: 'grid', gap: 8, background: rq.bg, border: `1px solid ${rq.line}`, padding: 12, marginTop: 12 };
const checkRowStyle = { display: 'flex', alignItems: 'center', gap: 9, color: rq.soft, fontWeight: 850, lineHeight: 1.35 };
const mutedStyle = { margin: 0, color: rq.muted, lineHeight: 1.45 };
const actionsStyle = { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', borderTop: `1px solid ${rq.line}`, paddingTop: 14, marginTop: 14 };
const primaryButtonStyle = { minHeight: 40, border: 0, background: rq.red, color: rq.text, padding: '0 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 40, border: 0, background: rq.card, color: rq.text, padding: '0 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
