import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Copy, Image as ImageIcon, Monitor, RefreshCw, Send, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { getLiveBootstrapExtras } from '@/data/livePlayLoaders';
import { createDisplayState, loadDisplayState, subscribeDisplayState, subscribeRemoteDisplayState } from '@/lib/liveDisplayBus';
import { publishCampaignDisplayStateWithStatus } from '@/lib/liveDisplayPublishStatus';
import tiaKartaSecondScreenPresets from '@/data/tiaKartaSecondScreenPresets';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const theme = {
  panel: 'var(--rq-bg-panel)',
  card: 'var(--rq-card)',
  bg: 'var(--rq-bg-main)',
  line: 'var(--rq-border-default)',
  pink: 'var(--rq-accent-primary)',
  blue: 'var(--rq-secondary)',
  red: 'var(--rq-accent-primary)',
  text: 'var(--rq-text-primary)',
  soft: 'var(--rq-text-primary)',
  muted: 'var(--rq-text-primary)',
};

function imageFrom(item) {
  return item?.image_url || item?.map_url || item?.url || item?.attachment_url || item?.avatar_url || item?.portrait_url || item?.token_url || item?.image_data || '';
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
  if (state?.mode === 'npc-grid') return `${payload.npcs?.length || 0} NPC${payload.npcs?.length === 1 ? '' : 's'} showing`;
  if (state?.mode === 'image') return payload.image_url ? 'Map or image showing' : 'Image mode is open';
  return 'Ready for the next reveal.';
}

export default function LiveSecondScreenDock({ campaignId }) {
  const initialExtras = getLiveBootstrapExtras(campaignId);
  const [state, setState] = useState(() => initialExtras?.displayState || loadDisplayState(campaignId));
  const [maps, setMaps] = useState(() => Array.isArray(initialExtras?.maps) ? initialExtras.maps : []);
  const [worldMaps, setWorldMaps] = useState([]);
  const [npcs, setNpcs] = useState(() => Array.isArray(initialExtras?.npcs) ? initialExtras.npcs : []);
  const [selectedNpcIds, setSelectedNpcIds] = useState([]);
  const [npcQuery, setNpcQuery] = useState('');
  const [target, setTarget] = useState('standing-tv');
  const [busy, setBusy] = useState('');
  const [refreshingAssets, setRefreshingAssets] = useState(false);
  const [assetWarning, setAssetWarning] = useState('');

  useEffect(() => {
    const cachedState = getLiveBootstrapExtras(campaignId)?.displayState;
    setState(cachedState || loadDisplayState(campaignId));
    const local = subscribeDisplayState(campaignId, setState);
    // Keep the existing remote freshness read/WebSocket path for safety. The
    // bootstrap state paints immediately while this connection comes online.
    const remote = subscribeRemoteDisplayState(campaignId, setState, { intervalMs: 1000 });
    return () => { local(); remote(); };
  }, [campaignId]);

  const refreshAssets = useCallback(async ({ silent = false } = {}) => {
    if (!campaignId) return { ok: false, failures: ['campaign'] };
    setRefreshingAssets(true);
    try {
      const [mapsResult, npcsResult, worldMapsResult] = await Promise.allSettled([
        apiClient.get(`/campaigns/${campaignId}/maps`),
        apiClient.get(`/campaigns/${campaignId}/npcs`),
        apiClient.get(`/campaigns/${campaignId}/world-maps`),
      ]);
      const failures = [];

      if (mapsResult.status === 'fulfilled') {
        setMaps(Array.isArray(mapsResult.value?.data) ? mapsResult.value.data : []);
      } else {
        failures.push('maps');
      }
      if (npcsResult.status === 'fulfilled') {
        setNpcs(Array.isArray(npcsResult.value?.data) ? npcsResult.value.data : []);
      } else {
        failures.push('NPCs');
      }

      if (worldMapsResult.status === 'fulfilled') {
        setWorldMaps(Array.isArray(worldMapsResult.value?.data) ? worldMapsResult.value.data : []);
      } else {
        failures.push('world maps');
      }

      const warning = failures.length
        ? `Could not refresh ${failures.join(' and ')}. Keeping the last known assets for anything that failed.`
        : '';
      setAssetWarning(warning);

      if (!silent) {
        if (failures.length) toast.warning('Second screen assets only partly refreshed', { description: warning });
        else toast.success('Second screen assets refreshed');
      }
      return { ok: failures.length === 0, failures };
    } finally {
      setRefreshingAssets(false);
    }
  }, [campaignId]);

  useEffect(() => {
    const cached = getLiveBootstrapExtras(campaignId);
    setAssetWarning('');
    setSelectedNpcIds([]);
    setNpcQuery('');
    setWorldMaps([]);
    if (Array.isArray(cached?.maps)) setMaps(cached.maps);
    else setMaps([]);
    if (Array.isArray(cached?.npcs)) setNpcs(cached.npcs);
    else setNpcs([]);
    // The live bootstrap carries battle maps, not the separately stored world maps.
    // Always fetch both media collections so old image_data maps are discoverable.
    refreshAssets({ silent: true });
  }, [campaignId, refreshAssets]);

  const visibleMaps = useMemo(() => [...maps, ...worldMaps].filter(imageFrom), [maps, worldMaps]);
  // Portraits are optional; a name-and-initials card still makes a valid reveal.
  const visibleNpcs = npcs;
  const selectedNpcs = useMemo(() => visibleNpcs.filter(npc => selectedNpcIds.includes(String(npc.id))), [visibleNpcs, selectedNpcIds]);
  const matchingNpcs = useMemo(() => {
    const search = npcQuery.trim().toLocaleLowerCase();
    return search ? visibleNpcs.filter(npc => String(npc.name || '').toLocaleLowerCase().includes(search)) : visibleNpcs;
  }, [visibleNpcs, npcQuery]);
  const currentTarget = normaliseTarget(state?.payload?.display_target || target);

  const publish = async (mode, payload, actionId) => {
    try {
      setBusy(actionId || mode);
      const nextState = createDisplayState(mode, { display_target: currentTarget, ...payload });
      const result = await publishCampaignDisplayStateWithStatus(campaignId, nextState);
      if (result.remoteSynced) {
        toast.success('Second screen updated', { description: payload?.title || mode });
      } else {
        toast.warning('Updated locally — remote display not synced', {
          description: 'Same-browser display is updated. Another device will catch up when sync reconnects.',
        });
      }
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

  const showSelectedNpcs = () => {
    if (!selectedNpcs.length) return;
    return publish('npc-grid', {
      eyebrow: 'Who you can see',
      title: selectedNpcs.length === 1 ? selectedNpcs[0].name || 'NPC' : 'People before you',
      npcs: selectedNpcs.map(npc => ({
        id: npc.id,
        name: npc.name || 'NPC',
        subtitle: npc.role || npc.race || npc.location || '',
        image_url: imageFrom(npc),
      })),
    }, 'npc-gallery');
  };

  const openDisplay = () => {
    const url = `${window.location.origin}/player-display/${campaignId}?target=${encodeURIComponent(currentTarget)}`;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened && !window.rookieDesktop?.offline) toast.error('Pop-up blocked. Copy the display link instead.');
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

      {assetWarning && (
        <div data-testid="second-screen-asset-warning" role="status" style={warningStyle}>
          <AlertTriangle size={13} /> <span>{assetWarning}</span>
        </div>
      )}

      <section style={buttonGroupStyle}>
        <p style={sectionLabelStyle}>Quick reveals</p>
        {tiaKartaSecondScreenPresets.slice(0, 10).map(preset => <button key={preset.id} type="button" onClick={() => sendPreset(preset)} disabled={busy === preset.id} style={revealButtonStyle}><Send size={13} /> {preset.title}</button>)}
      </section>

      <section style={buttonGroupStyle}>
        <p style={sectionLabelStyle}>NPCs · select multiple</p>
        <button type="button" onClick={showSelectedNpcs} disabled={!selectedNpcs.length || Boolean(busy)} style={revealButtonStyle}><Users size={13} /> Show selected NPCs ({selectedNpcs.length})</button>
        <label style={{ display: 'grid', gap: 4, fontSize: 12, color: theme.soft }}>
          Search NPCs
          <input type="search" aria-label="Search second screen NPCs" value={npcQuery} onChange={event => setNpcQuery(event.target.value)} placeholder="Find an NPC by name" style={npcSearchStyle} />
        </label>
        <span role="status" style={mutedStyle}>{selectedNpcs.length} selected · {matchingNpcs.length} of {visibleNpcs.length} NPCs shown</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setSelectedNpcIds(visibleNpcs.map(npc => String(npc.id)))} style={smallButtonStyle}>Select all</button>
          <button type="button" onClick={() => setSelectedNpcIds([])} style={smallButtonStyle}>Clear selection</button>
        </div>
        <div style={{ display: 'grid', gap: 5, maxHeight: 280, overflowY: 'auto' }}>
          {matchingNpcs.map(npc => (
            <label key={npc.id} style={{ ...mediaButtonStyle, cursor: 'pointer', minHeight: 44 }}>
              <input type="checkbox" aria-label={`Reveal ${npc.name || 'Unnamed NPC'}`} checked={selectedNpcIds.includes(String(npc.id))} onChange={() => setSelectedNpcIds(previous => previous.includes(String(npc.id)) ? previous.filter(id => id !== String(npc.id)) : [...previous, String(npc.id)])} />
              <Users size={13} /> {npc.name || 'NPC'}{!imageFrom(npc) && <span style={noPortraitStyle}>Initials</span>}
            </label>
          ))}
          {!visibleNpcs.length && <p style={mutedStyle}>No NPCs saved in this campaign yet.</p>}
          {visibleNpcs.length > 0 && !matchingNpcs.length && <p style={mutedStyle}>No NPCs match. Clear the search to see everyone.</p>}
        </div>
      </section>

      <section style={buttonGroupStyle}>
        <p style={sectionLabelStyle}>Maps / world maps</p>
        <button type="button" onClick={() => refreshAssets({ silent: false })} disabled={refreshingAssets} style={smallButtonStyle}><RefreshCw size={13} /> {refreshingAssets ? 'Refreshing…' : 'Refresh assets'}</button>
        {visibleMaps.length ? visibleMaps.map(map => <button key={map.id} type="button" onClick={() => sendMap(map)} style={mediaButtonStyle}><ImageIcon size={13} /> {map.name || map.title || 'Map'}</button>) : <p style={mutedStyle}>Upload maps/images to show them here.</p>}
      </section>
    </aside>
  );
}

const dockStyle = { width: 320, minWidth: 280, maxHeight: 'calc(100dvh - 106px)', position: 'sticky', top: 86, alignSelf: 'start', overflowY: 'auto', display: 'grid', gap: 8, background: theme.panel, border: `1px solid ${theme.line}`, borderLeft: `1px solid ${theme.pink}`, padding: 9, color: theme.text, fontFamily: fontStack };
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
const warningStyle = { display: 'flex', alignItems: 'flex-start', gap: 6, padding: 7, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.45)', color: theme.soft, fontSize: 10, lineHeight: 1.4 };
const buttonGroupStyle = { display: 'grid', gap: 6, borderTop: `1px solid ${theme.line}`, paddingTop: 8 };
const sectionLabelStyle = { margin: 0, color: theme.muted, fontSize: 10, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' };
const revealButtonStyle = { minHeight: 34, border: `1px solid ${theme.pink}`, background: theme.card, color: theme.text, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 6, textAlign: 'left', justifyContent: 'flex-start', fontSize: 12, fontWeight: 900, cursor: 'pointer' };
const mediaButtonStyle = { minHeight: 32, border: 0, background: theme.card, color: theme.text, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 6, textAlign: 'left', justifyContent: 'flex-start', fontSize: 12, fontWeight: 850, cursor: 'pointer', overflow: 'hidden' };
const mutedStyle = { margin: 0, color: theme.muted, fontSize: 12, lineHeight: 1.35 };
const npcSearchStyle = { boxSizing: 'border-box', width: '100%', minHeight: 46, fontSize: 16, background: theme.bg, color: theme.text, border: `1px solid ${theme.line}`, borderRadius: 5, padding: '0 10px' };
const noPortraitStyle = { marginLeft: 'auto', color: 'var(--rq-text-secondary, #EADFC8)', fontSize: 10 };
