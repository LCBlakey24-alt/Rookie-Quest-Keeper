import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Flag, RefreshCw, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import LiveSecondScreenDock from '@/components/gm/LiveSecondScreenDock';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const rq = {
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
    if (typeof item === 'string') return { id: `checkpoint-${index + 1}`, title: item, status: 'upcoming' };
    return {
      id: item.id || `checkpoint-${index + 1}`,
      title: item.title || item.name || `Checkpoint ${index + 1}`,
      status: item.status || 'upcoming',
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

  return (
    <div style={stackStyle}>
      <section style={shellStyle} data-testid="live-story-focus-panel">
        <div style={iconTileStyle}><Flag size={18} /></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={eyebrowStyle}>Story Focus</p>
          <strong style={titleStyle}>{loading ? 'Loading story focus…' : focus.arc?.title || 'No active story chapter'}</strong>
          <p style={textStyle}><ScrollText size={13} /> {focus.chapter?.title || 'Prep an arc in Story Arcs'} · {reachedCount}/{focus.points.length} reached</p>
          <p style={nextStyle}>{focus.next ? `Next: ${focus.next.title}` : 'Second screen dock is ready on this page.'}</p>
        </div>
        <button type="button" onClick={loadArcs} style={secondaryButtonStyle}><RefreshCw size={14} /> Refresh</button>
      </section>
      <LiveSecondScreenDock campaignId={campaignId} />
    </div>
  );
}

const stackStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 8, alignItems: 'start' };
const shellStyle = { display: 'flex', alignItems: 'center', gap: 10, background: rq.panel, border: `1px solid ${rq.line}`, borderLeft: `6px solid ${rq.red}`, padding: '8px 10px', color: rq.text, fontFamily: fontStack, flexWrap: 'wrap', minHeight: 96 };
const iconTileStyle = { width: 34, height: 34, display: 'grid', placeItems: 'center', background: rq.card, color: rq.red, flex: '0 0 auto' };
const eyebrowStyle = { margin: '0 0 2px', color: rq.muted, fontSize: 10, fontWeight: 950, letterSpacing: '0.11em', textTransform: 'uppercase' };
const titleStyle = { display: 'block', color: rq.text, fontSize: 15, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const textStyle = { margin: '3px 0 0', color: rq.soft, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5, lineHeight: 1.3 };
const nextStyle = { margin: '5px 0 0', color: rq.text, fontSize: 13, fontWeight: 900, lineHeight: 1.3 };
const secondaryButtonStyle = { minHeight: 34, border: 0, background: rq.card, color: rq.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
