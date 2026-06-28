import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, Flag, RefreshCw, RotateCcw, ScrollText, SkipForward } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const rq = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  red: '#d00000',
  good: '#1f9d66',
  warn: '#d99222',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.74)',
  muted: 'rgba(255,255,255,0.58)',
  line: 'rgba(255,255,255,0.16)',
};

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function checkpoints(chapter) {
  return asList(chapter?.scenes).map((item, index) => {
    if (typeof item === 'string') return { id: `checkpoint-${index + 1}`, title: item, status: 'upcoming', notes: '' };
    return {
      id: item.id || `checkpoint-${index + 1}`,
      title: item.title || item.name || `Checkpoint ${index + 1}`,
      status: item.status || 'upcoming',
      notes: item.notes || item.description || '',
    };
  });
}

function findFocus(arcs) {
  const arc = arcs.find(item => item.status === 'active') || arcs.find(item => item.status !== 'completed') || arcs[0] || null;
  if (!arc) return { arc: null, chapter: null, chapterIndex: -1, nextChapter: null, points: [], next: null, lastDone: null };
  const chapters = asList(arc.chapters);
  const chapter = chapters.find(item => item.status === 'prepped') || chapters.find(item => item.status === 'planned') || chapters.find(item => item.status !== 'played') || chapters[0] || null;
  const chapterIndex = chapters.findIndex(item => item.id === chapter?.id);
  const nextChapter = chapters.slice(Math.max(chapterIndex + 1, 0)).find(item => item.status !== 'played') || null;
  const points = checkpoints(chapter);
  const next = points.find(point => !['reached', 'skipped'].includes(point.status)) || null;
  const lastDone = [...points].reverse().find(point => ['reached', 'skipped'].includes(point.status)) || null;
  return { arc, chapter, chapterIndex, nextChapter, points, next, lastDone };
}

export default function LiveStoryFocusPanel({ campaignId }) {
  const [arcs, setArcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState('');

  const loadArcs = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/story-arcs`);
      setArcs(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load story focus');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { loadArcs(); }, [loadArcs]);

  const focus = useMemo(() => findFocus(arcs), [arcs]);
  const reachedCount = focus.points.filter(point => point.status === 'reached').length;
  const skippedCount = focus.points.filter(point => point.status === 'skipped').length;
  const doneCount = reachedCount + skippedCount;
  const complete = focus.points.length > 0 && doneCount === focus.points.length;
  const busy = Boolean(savingAction);

  const updateArcInState = (updatedArc) => setArcs(prev => prev.map(arc => arc.id === updatedArc.id ? updatedArc : arc));

  const updateCheckpointStatus = async (pointId, status, actionLabel, toastTitle) => {
    if (!focus.arc || !focus.chapter || !pointId) return;
    setSavingAction(actionLabel);
    try {
      const nextPoints = focus.points.map(point => point.id === pointId ? { ...point, status } : point);
      const response = await apiClient.put(`/campaigns/${campaignId}/story-arcs/${focus.arc.id}/chapters/${focus.chapter.id}`, { scenes: nextPoints });
      updateArcInState(response.data);
      toast.success(toastTitle, { description: nextPoints.find(point => point.id === pointId)?.title });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update checkpoint');
    } finally {
      setSavingAction('');
    }
  };

  const updateChapterStatuses = async (nextChapters, toastTitle, description = '') => {
    if (!focus.arc) return;
    setSavingAction(toastTitle);
    try {
      const response = await apiClient.put(`/campaigns/${campaignId}/story-arcs/${focus.arc.id}`, { chapters: nextChapters });
      updateArcInState(response.data);
      toast.success(toastTitle, description ? { description } : undefined);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update chapter flow');
    } finally {
      setSavingAction('');
    }
  };

  const markNextReached = () => updateCheckpointStatus(focus.next?.id, 'reached', 'reached', 'Checkpoint marked reached');
  const skipNextCheckpoint = () => updateCheckpointStatus(focus.next?.id, 'skipped', 'skip', 'Checkpoint skipped');
  const undoLastCheckpoint = () => updateCheckpointStatus(focus.lastDone?.id, 'upcoming', 'undo', 'Checkpoint moved back to upcoming');

  const markChapterPlayed = () => {
    if (!focus.arc || !focus.chapter) return;
    const nextChapters = asList(focus.arc.chapters).map(chapter => chapter.id === focus.chapter.id ? { ...chapter, status: 'played' } : chapter);
    updateChapterStatuses(nextChapters, 'Chapter marked played', focus.chapter.title);
  };

  const loadNextChapter = () => {
    if (!focus.arc || !focus.chapter || !focus.nextChapter) return;
    const nextChapters = asList(focus.arc.chapters).map(chapter => {
      if (chapter.id === focus.chapter.id) return { ...chapter, status: 'played' };
      if (chapter.id === focus.nextChapter.id) return { ...chapter, status: 'prepped' };
      return chapter;
    });
    updateChapterStatuses(nextChapters, 'Next chapter loaded', focus.nextChapter.title);
  };

  if (loading) {
    return <section style={shellStyle}><div style={mutedBlockStyle}>Loading story focus…</div></section>;
  }

  if (!focus.arc || !focus.chapter) {
    return (
      <section style={shellStyle} data-testid="live-story-focus-panel">
        <div style={iconTileStyle}><Flag size={18} /></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={eyebrowStyle}>Story Focus</p>
          <strong style={titleStyle}>No active story chapter</strong>
          <p style={textStyle}>Prep an arc and chapter in Story Arcs to show the next checkpoint here during Live Play.</p>
        </div>
        <button type="button" onClick={loadArcs} style={secondaryButtonStyle}><RefreshCw size={14} /> Refresh</button>
      </section>
    );
  }

  return (
    <section style={shellStyle} data-testid="live-story-focus-panel">
      <div style={iconTileStyle}><Flag size={18} /></div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={eyebrowStyle}>Story Focus</p>
        <strong style={titleStyle}>{focus.arc.title}</strong>
        <p style={textStyle}><ScrollText size={13} /> {focus.chapter.title} · {reachedCount}/{focus.points.length} reached · {skippedCount} skipped</p>
        {focus.next ? <p style={nextStyle}>Next: {focus.next.title}</p> : <p style={nextStyle}>{complete ? 'All checkpoints reached or skipped. The party is officially ahead of the rails.' : 'No checkpoint added yet.'}</p>}
      </div>
      <div style={actionStyle}>
        <button type="button" onClick={loadArcs} disabled={busy} style={secondaryButtonStyle}><RefreshCw size={14} /> Refresh</button>
        <button type="button" onClick={undoLastCheckpoint} disabled={busy || !focus.lastDone} style={secondaryButtonStyle}><RotateCcw size={14} /> Undo</button>
        <button type="button" onClick={skipNextCheckpoint} disabled={busy || !focus.next} style={secondaryButtonStyle}><SkipForward size={14} /> Skip</button>
        <button type="button" onClick={markNextReached} disabled={busy || !focus.next} style={primaryButtonStyle}><Check size={14} /> {savingAction === 'reached' ? 'Saving…' : 'Reached'}</button>
        <button type="button" onClick={markChapterPlayed} disabled={busy} style={secondaryButtonStyle}><CheckCircle2 size={14} /> Played</button>
        <button type="button" onClick={loadNextChapter} disabled={busy || !focus.nextChapter} style={primaryButtonStyle}><ArrowRight size={14} /> Next Chapter</button>
      </div>
    </section>
  );
}

const shellStyle = { display: 'flex', alignItems: 'center', gap: 10, background: rq.panel, border: `1px solid ${rq.line}`, borderLeft: `6px solid ${rq.red}`, padding: '8px 10px', color: rq.text, fontFamily: fontStack, flexWrap: 'wrap' };
const iconTileStyle = { width: 34, height: 34, display: 'grid', placeItems: 'center', background: rq.card, color: rq.red, flex: '0 0 auto' };
const eyebrowStyle = { margin: '0 0 2px', color: rq.muted, fontSize: 10, fontWeight: 950, letterSpacing: '0.11em', textTransform: 'uppercase' };
const titleStyle = { display: 'block', color: rq.text, fontSize: 15, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const textStyle = { margin: '3px 0 0', color: rq.soft, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5, lineHeight: 1.3 };
const nextStyle = { margin: '5px 0 0', color: rq.text, fontSize: 13, fontWeight: 900, lineHeight: 1.3 };
const actionStyle = { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginLeft: 'auto' };
const primaryButtonStyle = { minHeight: 34, border: 0, background: rq.red, color: rq.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 34, border: 0, background: rq.card, color: rq.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const mutedBlockStyle = { width: '100%', color: rq.muted, fontSize: 12, fontWeight: 850 };
