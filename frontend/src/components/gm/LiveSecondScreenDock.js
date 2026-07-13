import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Image as ImageIcon, Monitor, RefreshCw, Send, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { createDisplayState, loadDisplayState, publishCampaignDisplayState, subscribeDisplayState, subscribeRemoteDisplayState } from '@/lib/liveDisplayBus';
import tiaKartaSecondScreenPresets from '@/data/tiaKartaSecondScreenPresets';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const theme = {
  panel: '#2f2f2f',
  card: '#3a3a3a',
  bg: '#242424',
  line: 'rgba(255,255,255,0.16)',
  red: '#d00000',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.74)',
  muted: 'rgba(255,255,255,0.58)',
};

function imageFrom(item) {
  return item?.image_url || item?.map_url || item?.url || item?.attachment_url || item?.avatar_url || item?.portrait_url || item?.token_url || '';
}

function normaliseTarget(target) {
  return target === 'virtual-table' ? 'virtual-table' : 'standing-tv';
}

function displayTitle(state) {
  const payload = state?.payload || {};
  return payload.title || (state?.mode === 'blank' ? 'Waiting for the GM' : 'Player Display');
}

function displaySubtitle(state) {
  const payload = state?.payload || {};
  if (payload.subtitle) return payload.subtitle;
  if (payload.caption) return payload.caption;
  if (state?.mode === 'npc-grid') return `${payload.npcs?.length || 0} NPC picture${payload.npcs?.length === 1 ? '' : 's'} showing`;
  if (state?.mode === 'image') return payload.image_url ? 'Map or image showing' : 'Image mode is open';
  return 'Ready for the next reveal.';
}

export default function LiveSecondScreenDock({ campaignId }) {
  const [state, setState] = useState(() => loadDisplayState(campaignId));
  const [maps, setMaps] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [target, setTarget] = useState('standing-tv');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    setState(loadDisplayState(campaignId));
    const local = subscribeDisplayState(campaignId, setState);
    const remote = subscribeRemoteDisplayState(campaignId, setState, { intervalMs: 1000 });
    return () => { local(); remote(); };
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId) return;
    Promise.all([
      apiClient.get(`/campaigns/${campaignId}/maps`).catch(() => ({ data: [] })),
      apiClient.get(`/campaigns/${campaignId}/npcs`).catch(() => ({ data: [] })),
    ]).then(([mapsRes, npcsRes]) => {
      setMaps(Array.isArray(mapsRes.data) ? mapsRes.data : []);
      setNpcs(Array.isArray(npcsRes.data) ? npcsRes.data : []);
    });
  }, [campaignId]);

  const visibleMaps = useMemo(() => maps.filter(imageFrom).slice(0, 8), [maps]);
  const visibleNpcs = useMemo(() => npcs.filter(imageFrom).slice(0, 8), [npcs]);
  const currentTarget = normaliseTarget(state?.payload?.display_target || target);

  const publish = async (mode, payload, actionId) => {
    try {
      setBusy(actionId || mode);
      const nextState = createDisplayState(mode, { display_target: currentTarget, ...payload });
      await publishCampaignDisplayState(campaignId, nextState);
      toast.success('Second screen updated', { description: payload?.title || mode });
    } catch {
      toast.error('Could not update the second screen');
    } finally {
      setBusy('');
    }
  };

  const sendPreset = (preset) => publish('title', {
    eyebrow: preset.eyebrow,
    title: preset.title,
    subtitle: preset.subtitle,
  }, preset.id);

  const sendMap = (map) => publish('image', {
    title: map.name || map.title || 'Map',
    image_url: imageFrom(map),
    caption: map.description || map.notes || '',
  }, `map-${map.id}`);

  const sendNpc = (npc) => publish('npc-grid', {
    eyebrow: 'Who you can see',
    title: npc.name || 'NPC',
    npcs: [{
      id: npc.id,
      name: npc.name || 'NPC',
      subtitle: npc.role || npc.race || npc.location || '',
      image_url: imageFrom(npc),
    }],
  }, `npc-${npc.id}`);

  const openDisplay = () => {
    const url = `${window.location.origin}/player-display/${campaignId}?target=${encodeURIComponent(currentTarget)}`;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) toast.error('Pop-up blocked. Copy the display link instead.');
  };

  const copyDisplayLink = async () => {
    const url = `${window.location.origin}/player-display/${campaignId}?target=${encodeURIComponent(currentTarget)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Second screen link copied');
    } catch {
      toast.info(url);
    }
  };

  return (
    <aside style={dockStyle} data-testid="live-second-screen-dock">
      <header style={dockHeaderStyle}>
        <div>
          <p style={eyebrowStyle}>Always-on second screen</p>
          <h2 style={titleStyle}><Monitor size={17} /> Live Display</h2>
        </div>
        <button type="button" onClick={() => publish('blank', { title: 'Waiting for the GM', subtitle: 'The next reveal will appear here.' }, 'blank')} style={iconButtonStyle} title="Clear display"><X size={15} /></button>
      </header>

      <section style={previewStyle}>
        <span style={modePillStyle}>{state?.mode || 'blank'} · {currentTarget === 'virtual-table' ? 'table' : 'tv'}</span>
        {state?.mode === 'image' && state?.payload?.image_url ? <img src={state.payload.image_url} alt="Second screen preview" style={previewImageStyle} /> : null}
        {state?.mode === 'npc-grid' && Array.isArray(state?.payload?.npcs) ? <div style={previewNpcRowStyle}>{state.payload.npcs.slice(0, 3).map(npc => imageFrom(npc) ? <img key={npc.id || npc.name} src={imageFrom(npc)} alt={npc.name} style={previewNpcImageStyle} /> : <span key={npc.id || npc.name} style={previewInitialStyle}>{String(npc.name || '?').slice(0, 1)}</span>)}</div> : null}
        <strong style={previewTitleStyle}>{displayTitle(state)}</strong>
        <p style={previewTextStyle}>{displaySubtitle(state)}</p>
      </section>

      <section style={targetRowStyle}>
        <button type="button" onClick={() => setTarget('standing-tv')} style={targetButtonStyle(currentTarget === 'standing-tv')}>TV</button>
        <button type="button" onClick={() => setTarget('virtual-table')} style={targetButtonStyle(currentTarget === 'virtual-table')}>Table</button>
        <button type="button" onClick={openDisplay} style={smallButtonStyle}>Open</button>
        <button type="button" onClick={copyDisplayLink} style={smallButtonStyle}><Copy size={13} /> Link</button>
      </section>

      <section style={buttonGroupStyle}>
        <p style={sectionLabelStyle}>Quick reveals</p>
        {tiaKartaSecondScreenPresets.slice(0, 10).map(preset => <button key={preset.id} type="button" onClick={() => sendPreset(preset)} disabled={busy === preset.id} style={revealButtonStyle}><Send size={13} /> {preset.title}</button>)}
      </section>

      <section style={buttonGroupStyle}>
        <p style={sectionLabelStyle}>NPC pictures</p>
        {visibleNpcs.length ? visibleNpcs.map(npc => <button key={npc.id} type="button" onClick={() => sendNpc(npc)} style={mediaButtonStyle}><Users size={13} /> {npc.name || 'NPC'}</button>) : <p style={mutedStyle}>Upload NPC portraits to show them here.</p>}
      </section>

      <section style={buttonGroupStyle}>
        <p style={sectionLabelStyle}>Maps / images</p>
        <button type="button" onClick={() => Promise.all([apiClient.get(`/campaigns/${campaignId}/maps`).catch(() => ({ data: [] })), apiClient.get(`/campaigns/${campaignId}/npcs`).catch(() => ({ data: [] }))]).then(([mapsRes, npcsRes]) => { setMaps(Array.isArray(mapsRes.data) ? mapsRes.data : []); setNpcs(Array.isArray(npcsRes.data) ? npcsRes.data : []); toast.success('Second screen assets refreshed'); })} style={smallButtonStyle}><RefreshCw size={13} /> Refresh assets</button>
        {visibleMaps.length ? visibleMaps.map(map => <button key={map.id} type="button" onClick={() => sendMap(map)} style={mediaButtonStyle}><ImageIcon size={13} /> {map.name || map.title || 'Map'}</button>) : <p style={mutedStyle}>Upload maps/images to show them here.</p>}
      </section>
    </aside>
  );
}

const dockStyle = { width: 320, minWidth: 280, maxHeight: 'calc(100dvh - 106px)', position: 'sticky', top: 86, alignSelf: 'start', overflowY: 'auto', display: 'grid', gap: 8, background: theme.panel, border: `1px solid ${theme.line}`, borderLeft: `6px solid ${theme.red}`, padding: 9, color: theme.text, fontFamily: fontStack };
const dockHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 };
const eyebrowStyle = { margin: '0 0 3px', color: theme.muted, fontSize: 10, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' };
const titleStyle = { margin: 0, color: theme.text, fontSize: 16, fontWeight: 950, display: 'flex', alignItems: 'center', gap: 6 };
const iconButtonStyle = { width: 32, height: 32, border: 0, background: theme.card, color: theme.text, display: 'grid', placeItems: 'center', cursor: 'pointer' };
const previewStyle = { display: 'grid', gap: 7, background: theme.bg, border: `1px solid ${theme.line}`, padding: 8, minHeight: 170 };
const modePillStyle = { justifySelf: 'start', background: theme.card, color: theme.muted, fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 6px' };
const previewImageStyle = { width: '100%', maxHeight: 115, objectFit: 'cover', background: '#000' };
const previewNpcRowStyle = { display: 'flex', gap: 6, overflow: 'hidden' };
const previewNpcImageStyle = { width: 64, height: 64, objectFit: 'cover', border: `1px solid ${theme.line}` };
const previewInitialStyle = { width: 64, height: 64, display: 'grid', placeItems: 'center', background: theme.card, color: theme.text, fontWeight: 950 };
const previewTitleStyle = { color: theme.text, fontSize: 15, lineHeight: 1.2 };
const previewTextStyle = { margin: 0, color: theme.soft, fontSize: 12, lineHeight: 1.35, whiteSpace: 'pre-line' };
const targetRowStyle = { display: 'flex', gap: 6, flexWrap: 'wrap' };
const targetButtonStyle = (active) => ({ minHeight: 30, border: `1px solid ${active ? theme.red : theme.line}`, background: active ? theme.red : theme.card, color: theme.text, padding: '0 8px', fontWeight: 900, cursor: 'pointer' });
const smallButtonStyle = { minHeight: 30, border: 0, background: theme.card, color: theme.text, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 900, cursor: 'pointer' };
const buttonGroupStyle = { display: 'grid', gap: 6, borderTop: `1px solid ${theme.line}`, paddingTop: 8 };
const sectionLabelStyle = { margin: 0, color: theme.muted, fontSize: 10, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' };
const revealButtonStyle = { minHeight: 34, border: 0, background: theme.red, color: theme.text, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 6, textAlign: 'left', justifyContent: 'flex-start', fontSize: 12, fontWeight: 900, cursor: 'pointer' };
const mediaButtonStyle = { minHeight: 32, border: 0, background: theme.card, color: theme.text, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 6, textAlign: 'left', justifyContent: 'flex-start', fontSize: 12, fontWeight: 850, cursor: 'pointer', overflow: 'hidden' };
const mutedStyle = { margin: 0, color: theme.muted, fontSize: 12, lineHeight: 1.35 };
