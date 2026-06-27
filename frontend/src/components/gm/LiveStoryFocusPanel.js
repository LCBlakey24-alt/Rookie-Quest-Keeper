import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Flag, RefreshCw, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const rq = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  red: '#d00000',
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
  if (!arc) return { arc: null, chapter: null, points: [], next: null };
  const chapters = asList(arc.chapters);
  const chapter = chapters.find(item => item.status === 'prepped') || chapters.find(item => item.status === 'planned') || chapters.find(item => item.status !== 'played') || chapters[0] || null;
  const points = checkpoints(chapter);
  const next = points.find(point => !['reached', 'skipped'].includes(point.status)) || null;
  return { arc, chapter, points, next };
}

export default function LiveStoryFocusPanel({ campaignId }) {
  const [arcs, setArcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  const complete = focus.points.length > 0 && reachedCount === focus.points.length;

  const markNextReached = async () => {
    if (!focus.arc || !focus.chapter || !focus.next) return;
    setSaving(true);
    try {
      const nextPoints = focus.points.map(point => point.id === focus.next.id ? { ...point, status: 'reached' } : point);
      const response = await apiClient.put(`/campaigns/${campaignId}/story-arcs/${focus.arc.id}/chapters/${focus.chapter.id}`, { scenes: nextPoints });
      setArcs(prev => prev.map(arc => arc.id === focus.arc.id ? response.data : arc));
      toast.success('Checkpoint marked reached', { description: focus.next.title });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update checkpoint');
    } finally {
      setSaving(false);
    }
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
        <p style={textStyle}><ScrollText size={13} /> {focus.chapter.title} · {reachedCount}/{focus.points.length} checkpoints reached</p>
        {focus.next ? <p style={nextStyle}>Next: {focus.next.title}</p> : <p style={nextStyle}>{complete ? 'All checkpoints reached. The party is officially ahead of the rails.' : 'No checkpoint added yet.'}</p>}
      </div>
      <div style={actionStyle}>
        <button type="button" onClick={loadArcs} disabled={saving} style={secondaryButtonStyle}><RefreshCw size={14} /> Refresh</button>
        <button type="button" onClick={markNextReached} disabled={saving || !focus.next} style={primaryButtonStyle}><Check size={14} /> {saving ? 'Saving…' : 'Mark Reached'}</button>
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
