import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, Image as ImageIcon, RefreshCw, Swords } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const ACTIVE_POLL_MS = 4000;
const IDLE_POLL_MS = 12000;

const toArray = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const text = (value) => String(value || '').trim();

function canonicalCombatantId(value = '') {
  return text(value)
    .replace(/^player-/i, '')
    .replace(/^character-/i, '')
    .replace(/^pc-/i, '');
}

function idsMatch(left, right) {
  const a = canonicalCombatantId(left);
  const b = canonicalCombatantId(right);
  return Boolean(a && b && a === b);
}

export function buildPlayerNowPlayingSummary(displayState = {}, playerCharacterIds = []) {
  const mode = text(displayState?.mode || 'blank').toLowerCase();
  const payload = displayState?.payload && typeof displayState.payload === 'object'
    ? displayState.payload
    : {};

  if (!mode || mode === 'blank') return null;

  if (mode === 'combat') {
    const party = toArray(payload.party);
    const tokens = toArray(payload.tokens);
    const roster = [...party, ...tokens];
    const activeId = payload.active_id || payload.activeId || '';
    const active = roster.find((entry) => idsMatch(entry?.id, activeId)) || null;
    const playerIds = toArray(playerCharacterIds).map(canonicalCombatantId);
    const activeCanonical = canonicalCombatantId(active?.id || activeId);
    const isPlayersTurn = Boolean(activeCanonical && playerIds.includes(activeCanonical));
    const turnText = active
      ? (isPlayersTurn ? 'Your turn' : String(active.name || 'Combatant') + "'s turn")
      : '';
    const roundText = payload.round ? ' · Round ' + payload.round : '';

    return {
      mode,
      kind: 'combat',
      eyebrow: 'Live combat',
      title: text(payload.title) || 'Combat',
      subtitle: turnText ? turnText + roundText : payload.round ? 'Round ' + payload.round : 'Combat is active',
      round: Math.max(0, Number(payload.round) || 0),
      activeName: text(active?.name),
      isPlayersTurn,
      mapUrl: text(payload.map_url || payload.mapUrl),
      visibleEnemies: tokens.filter((entry) => String(entry?.type || '').toLowerCase() !== 'npc').length,
      partyCount: party.length,
    };
  }

  if (mode === 'image') {
    return {
      mode,
      kind: 'image',
      eyebrow: text(payload.eyebrow) || 'Shared scene',
      title: text(payload.title) || 'Shared image',
      subtitle: text(payload.caption || payload.subtitle),
      mapUrl: text(payload.image_url || payload.imageUrl || payload.map_url || payload.mapUrl || payload.url),
    };
  }

  if (mode === 'title') {
    return {
      mode,
      kind: 'title',
      eyebrow: text(payload.eyebrow) || 'Now playing',
      title: text(payload.title) || 'Live update',
      subtitle: text(payload.subtitle || payload.caption),
      mapUrl: '',
    };
  }

  if (mode === 'group-check') {
    return {
      mode,
      kind: 'group-check',
      eyebrow: text(payload.eyebrow) || 'Group check',
      title: text(payload.title || payload.label || payload.skill) || 'Group check',
      subtitle: text(payload.subtitle || payload.prompt || payload.description),
      mapUrl: '',
    };
  }

  if (mode === 'npc-grid') {
    const npcs = toArray(payload.npcs || payload.items || payload.characters);
    return {
      mode,
      kind: 'npc-grid',
      eyebrow: text(payload.eyebrow) || 'Revealed characters',
      title: text(payload.title) || (npcs.length === 1 ? '1 character revealed' : String(npcs.length) + ' characters revealed'),
      subtitle: text(payload.subtitle || payload.caption),
      mapUrl: '',
    };
  }

  if (mode === 'end-session-stats') {
    return {
      mode,
      kind: 'end-session-stats',
      eyebrow: 'Session recap',
      title: text(payload.title || payload.campaignName) || 'Session complete',
      subtitle: text(payload.subtitle) || 'The GM has shared the session recap.',
      mapUrl: '',
    };
  }

  return {
    mode,
    kind: 'generic',
    eyebrow: 'Now playing',
    title: text(payload.title) || 'Live table update',
    subtitle: text(payload.subtitle || payload.caption),
    mapUrl: '',
  };
}

export default function PlayerNowPlayingPanel({ campaignId, characters = [] }) {
  const [displayState, setDisplayState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const characterIds = useMemo(
    () => toArray(characters).map((character) => character?.id || character?.character_id).filter(Boolean),
    [characters],
  );

  const summary = useMemo(
    () => buildPlayerNowPlayingSummary(displayState, characterIds),
    [characterIds, displayState],
  );

  const refresh = useCallback(async () => {
    if (!campaignId) return false;
    try {
      const response = await apiClient.get('/campaigns/' + campaignId + '/display-state');
      setDisplayState(response?.data || { mode: 'blank', payload: {} });
      setLoadError('');
      return true;
    } catch (error) {
      setLoadError(error?.response?.data?.detail || 'Could not refresh the live table state.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!campaignId) return undefined;
    const pollMs = summary?.kind === 'combat' ? ACTIVE_POLL_MS : IDLE_POLL_MS;
    const poll = () => {
      if (document.visibilityState !== 'hidden') refresh();
    };
    const timer = window.setInterval(poll, pollMs);
    const wake = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('online', wake);
    window.addEventListener('focus', wake);
    document.addEventListener('visibilitychange', wake);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', wake);
      window.removeEventListener('focus', wake);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [campaignId, refresh, summary?.kind]);

  if (loading && !displayState && !loadError) return null;

  if (!summary) {
    if (!loadError) return null;
    return (
      <section className="player-now-playing player-now-playing-warning" role="status" data-testid="player-live-status-unavailable">
        <AlertTriangle size={17} />
        <div>
          <strong>Live table status unavailable</strong>
          <span>{loadError} Your saved campaign information is still available.</span>
        </div>
        <button type="button" onClick={refresh} aria-label="Retry live table status"><RefreshCw size={15} /></button>
      </section>
    );
  }

  const Icon = summary.kind === 'combat'
    ? Swords
    : summary.kind === 'image'
      ? ImageIcon
      : Clock3;

  return (
    <section
      className={'player-now-playing ' + (summary.isPlayersTurn ? 'is-your-turn' : '')}
      data-testid="player-now-playing"
      aria-live="polite"
    >
      {loadError && (
        <div className="player-now-playing-stale" role="status">
          <AlertTriangle size={14} />
          Live refresh failed. Showing the last confirmed table state.
        </div>
      )}
      <div className="player-now-playing-main">
        <span className="player-now-playing-icon" aria-hidden="true"><Icon size={19} /></span>
        <div className="player-now-playing-copy">
          <span className="player-now-playing-eyebrow">{summary.eyebrow}</span>
          <strong>{summary.title}</strong>
          {summary.subtitle && <p>{summary.subtitle}</p>}
        </div>
        <button type="button" onClick={refresh} aria-label="Refresh live table status"><RefreshCw size={15} /></button>
      </div>
      {summary.kind === 'combat' && (
        <div className="player-now-playing-combat-meta">
          {summary.round > 0 && <span>Round <strong>{summary.round}</strong></span>}
          {summary.activeName && <span>Turn <strong>{summary.isPlayersTurn ? 'You' : summary.activeName}</strong></span>}
          <span>Party <strong>{summary.partyCount}</strong></span>
          <span>Visible foes <strong>{summary.visibleEnemies}</strong></span>
        </div>
      )}
      {summary.mapUrl && (
        <div className="player-now-playing-map">
          <img src={summary.mapUrl} alt={summary.title || 'Shared scene'} />
        </div>
      )}
    </section>
  );
}
