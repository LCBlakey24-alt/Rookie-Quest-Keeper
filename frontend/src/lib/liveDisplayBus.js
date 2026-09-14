import { isLocalPreview } from '@/preview/previewMode';
import { BACKEND_URL } from '@/lib/api';
import { getAuthToken } from '@/lib/auth';

const channelName = (campaignId) => `rqk-live-display-${campaignId}`;
const storageKey = (campaignId) => `rqk.liveDisplay.${campaignId}`;
const localEventName = (campaignId) => `rqk-live-display-local-${campaignId}`;

const sourceTabId = (() => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    // Fall back below.
  }
  return `display-tab-${Date.now()}-${Math.random().toString(16).slice(2)}`;
})();

const getWindow = () => (typeof window !== 'undefined' ? window : null);
const getDocument = () => (typeof document !== 'undefined' ? document : null);
const safeNoop = () => {};

let apiClientPromise;
async function getApiClient() {
  if (!apiClientPromise) apiClientPromise = import('./apiClient');
  const module = await apiClientPromise;
  return module.default;
}

export function isPlayerDisplayPath(pathname = '') {
  return /\/player-display(?:\/|$)/.test(String(pathname || ''));
}

export async function acknowledgePlayerDisplayState(campaignId, state, runtimeWindow = getWindow()) {
  if (!campaignId || !state?.sync_id || !isPlayerDisplayPath(runtimeWindow?.location?.pathname)) {
    return { acknowledged: false, skipped: true };
  }

  try {
    const apiClient = await getApiClient();
    const response = await apiClient.post(`/campaigns/${campaignId}/display-state/ack`, {
      sync_id: state.sync_id,
      display_target: state.payload?.display_target || '',
      mode: state.mode || 'blank',
    });
    return response?.data || { acknowledged: true, sync_id: state.sync_id };
  } catch (error) {
    return { acknowledged: false, error };
  }
}

function websocketUrl(campaignId) {
  const runtimeWindow = getWindow();
  if (!campaignId || !runtimeWindow) return '';
  const token = getAuthToken();
  if (!token) return '';
  const base = String(BACKEND_URL || runtimeWindow.location.origin).replace(/\/+$/, '').replace(/^http/i, 'ws');
  return `${base}/ws/campaign/${encodeURIComponent(campaignId)}?token=${encodeURIComponent(token)}`;
}

function stateTime(state = {}) {
  const parsed = Date.parse(state.updated_at || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function stateSequence(state = {}) {
  const parsed = Number(state.sequence || state.seq || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fallbackStateSequence(state = {}, updatedAt = '') {
  const explicitSequence = stateSequence(state);
  if (explicitSequence) return explicitSequence;
  const parsedTime = Date.parse(updatedAt || state.updated_at || '');
  if (Number.isFinite(parsedTime) && parsedTime > 0) return parsedTime;
  return Date.now();
}

function stableStateId(state = {}, updatedAt = '', sequence = 0) {
  if (state.sync_id || state.id) return state.sync_id || state.id;
  return `${state.mode || 'blank'}-${updatedAt || 'unknown'}-${sequence}`;
}

export function displayStateRevisionIdentity(state = {}) {
  const syncId = state.sync_id || state.id || state.mode || 'blank';
  return `${syncId}-${state.updated_at || ''}-${stateSequence(state)}`;
}

function isNewerState(candidate, current) {
  if (!candidate) return false;
  if (!current) return true;
  const candidateTime = stateTime(candidate);
  const currentTime = stateTime(current);
  if (candidateTime !== currentTime) return candidateTime > currentTime;
  return stateSequence(candidate) >= stateSequence(current);
}

function normaliseDisplayState(state = {}) {
  const updatedAt = state.updated_at || new Date().toISOString();
  const sequence = fallbackStateSequence(state, updatedAt);
  return {
    sync_id: stableStateId(state, updatedAt, sequence),
    mode: state.mode || 'blank',
    payload: state.payload || {},
    updated_at: updatedAt,
    sequence,
    source_tab: state.source_tab || sourceTabId,
  };
}

function sameLogicalState(left = {}, right = {}) {
  return left.mode === right.mode && stateTime(left) === stateTime(right) && stateSequence(left) === stateSequence(right);
}

function reconcileRemoteState(rawRemoteState = {}, normalizedRemoteState, localState) {
  if (!localState || rawRemoteState?.sync_id || rawRemoteState?.id) return normalizedRemoteState;
  if (!sameLogicalState(normalizedRemoteState, localState)) return normalizedRemoteState;
  return {
    ...normalizedRemoteState,
    sync_id: localState.sync_id,
    source_tab: localState.source_tab || normalizedRemoteState.source_tab,
  };
}

function readStoredDisplayState(campaignId) {
  const runtimeWindow = getWindow();
  if (!runtimeWindow?.localStorage) return null;
  try {
    const raw = runtimeWindow.localStorage.getItem(storageKey(campaignId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const normalized = normaliseDisplayState(parsed);
    if (!parsed.sync_id || !parsed.sequence) {
      runtimeWindow.localStorage.setItem(storageKey(campaignId), JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return null;
  }
}

export function createDisplayState(mode = 'blank', payload = {}) {
  const now = new Date().toISOString();
  const sequence = Date.now();
  return {
    sync_id: `${now}-${sequence}-${Math.random().toString(16).slice(2)}`,
    mode,
    payload,
    updated_at: now,
    sequence,
    source_tab: sourceTabId,
  };
}

export function loadDisplayState(campaignId) {
  return readStoredDisplayState(campaignId) || createDisplayState('blank', {});
}

export async function loadRemoteDisplayState(campaignId) {
  if (!campaignId) return createDisplayState('blank', {});
  const apiClient = await getApiClient();
  const response = await apiClient.get(`/campaigns/${campaignId}/display-state`);
  const rawState = response.data || createDisplayState('blank', {});
  const localState = readStoredDisplayState(campaignId);
  const state = reconcileRemoteState(rawState, normaliseDisplayState(rawState), localState);
  if (!localState || isNewerState(state, localState)) saveDisplayState(campaignId, state);
  return state;
}

export function saveDisplayState(campaignId, state) {
  const runtimeWindow = getWindow();
  if (!runtimeWindow?.localStorage) return;
  try {
    runtimeWindow.localStorage.setItem(storageKey(campaignId), JSON.stringify(normaliseDisplayState(state)));
  } catch {
    // Ignore storage failures. BroadcastChannel may still work.
  }
}

export function publishDisplayState(campaignId, state) {
  const runtimeWindow = getWindow();
  const safeState = normaliseDisplayState(state);
  saveDisplayState(campaignId, safeState);
  if (!runtimeWindow) return;
  try {
    runtimeWindow.dispatchEvent(new CustomEvent(localEventName(campaignId), { detail: safeState }));
  } catch {
    // Ignore local event failures; BroadcastChannel/storage polling still apply.
  }
  try {
    if (runtimeWindow.BroadcastChannel) {
      const channel = new runtimeWindow.BroadcastChannel(channelName(campaignId));
      channel.postMessage(safeState);
      channel.close();
    }
  } catch {
    // Older browsers can still pick up the saved state when refreshed or polled.
  }
}

export async function publishCampaignDisplayState(campaignId, state) {
  const localState = normaliseDisplayState(state);
  publishDisplayState(campaignId, localState);
  try {
    const apiClient = await getApiClient();
    const response = await apiClient.put(`/campaigns/${campaignId}/display-state`, localState);
    const rawRemoteState = response.data || localState;
    const latestLocalState = readStoredDisplayState(campaignId) || localState;
    const remoteState = reconcileRemoteState(rawRemoteState, normaliseDisplayState(rawRemoteState), latestLocalState);
    if (isNewerState(remoteState, latestLocalState)) {
      publishDisplayState(campaignId, remoteState);
      return remoteState;
    }
    return latestLocalState;
  } catch {
    return localState;
  }
}

export function subscribeDisplayState(campaignId, onState) {
  const runtimeWindow = getWindow();
  if (!runtimeWindow) return safeNoop;

  const handlers = [];
  let lastIdentity = '';

  const applyState = (state) => {
    const safeState = normaliseDisplayState(state);
    const identity = displayStateRevisionIdentity(safeState);
    if (identity === lastIdentity) return;
    const current = readStoredDisplayState(campaignId);
    if (current && !isNewerState(safeState, current) && displayStateRevisionIdentity(current) !== identity) return;
    lastIdentity = identity;
    onState(safeState);
  };

  const readSavedState = () => {
    try {
      const state = readStoredDisplayState(campaignId);
      if (!state) return;
      applyState(state);
    } catch {
      // Ignore malformed values.
    }
  };

  try {
    if (runtimeWindow.BroadcastChannel) {
      const channel = new runtimeWindow.BroadcastChannel(channelName(campaignId));
      channel.onmessage = (event) => {
        if (!event.data) return;
        applyState(event.data);
      };
      handlers.push(() => channel.close());
    }
  } catch {
    // Continue with storage fallback.
  }

  const onStorage = (event) => {
    if (event.key !== storageKey(campaignId) || !event.newValue) return;
    try {
      applyState(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed values.
    }
  };
  runtimeWindow.addEventListener('storage', onStorage);
  handlers.push(() => runtimeWindow.removeEventListener('storage', onStorage));

  const onLocalDisplayEvent = (event) => {
    if (!event.detail) return;
    applyState(event.detail);
  };
  runtimeWindow.addEventListener(localEventName(campaignId), onLocalDisplayEvent);
  handlers.push(() => runtimeWindow.removeEventListener(localEventName(campaignId), onLocalDisplayEvent));

  const interval = runtimeWindow.setInterval(readSavedState, 500);
  handlers.push(() => runtimeWindow.clearInterval(interval));

  readSavedState();

  return () => handlers.forEach(cleanup => cleanup());
}

export function subscribeRemoteDisplayState(campaignId, onState, { intervalMs = 5000, acknowledgementIntervalMs = 10000 } = {}) {
  const runtimeWindow = getWindow();
  if (!runtimeWindow) return safeNoop;

  let cancelled = false;
  let lastRemoteIdentity = '';
  let lastAcknowledgementState = null;
  let acknowledgementInFlight = false;
  let acknowledgementTimer = null;
  let socket = null;
  let reconnectTimer = null;
  let pingTimer = null;
  let pollingTimer = null;
  let reconnectAttempts = 0;
  let remoteReadInFlight = false;
  let socketReady = false;

  const acknowledgeCurrentState = async (state = lastAcknowledgementState) => {
    if (cancelled || acknowledgementInFlight || !state?.sync_id || !isPlayerDisplayPath(runtimeWindow.location?.pathname)) return;
    acknowledgementInFlight = true;
    try {
      await acknowledgePlayerDisplayState(campaignId, state, runtimeWindow);
    } finally {
      acknowledgementInFlight = false;
    }
  };

  const applyRemoteState = (state) => {
    if (cancelled || !state?.updated_at) return;
    const localState = readStoredDisplayState(campaignId);
    const safeState = reconcileRemoteState(state, normaliseDisplayState(state), localState);
    const identity = displayStateRevisionIdentity(safeState);
    if (identity === lastRemoteIdentity) {
      lastAcknowledgementState = safeState;
      void acknowledgeCurrentState(safeState);
      return;
    }
    if (localState && !isNewerState(safeState, localState)) return;
    lastRemoteIdentity = identity;
    lastAcknowledgementState = safeState;
    saveDisplayState(campaignId, safeState);
    onState(safeState);
    void acknowledgeCurrentState(safeState);
  };

  const readRemoteState = async () => {
    if (cancelled || remoteReadInFlight) return;
    remoteReadInFlight = true;
    try {
      const state = await loadRemoteDisplayState(campaignId);
      applyRemoteState(state);
    } catch {
      // Same-browser local display sync remains available when remote sync fails.
    } finally {
      remoteReadInFlight = false;
    }
  };

  const stopPolling = () => {
    if (pollingTimer) runtimeWindow.clearInterval(pollingTimer);
    pollingTimer = null;
  };

  const startPolling = () => {
    if (cancelled || pollingTimer || socketReady) return;
    readRemoteState();
    pollingTimer = runtimeWindow.setInterval(() => {
      if (!socketReady) readRemoteState();
    }, Math.max(2500, intervalMs));
  };

  const clearSocketTimers = () => {
    if (pingTimer) runtimeWindow.clearInterval(pingTimer);
    pingTimer = null;
  };

  const scheduleReconnect = () => {
    if (cancelled || reconnectTimer) return;
    startPolling();
    const delay = Math.min(15000, 1500 * (2 ** Math.min(reconnectAttempts, 3)));
    reconnectAttempts += 1;
    reconnectTimer = runtimeWindow.setTimeout(() => {
      reconnectTimer = null;
      connectSocket();
    }, delay);
  };

  const connectSocket = () => {
    if (cancelled) return;
    if (isLocalPreview() || !runtimeWindow.WebSocket) {
      startPolling();
      return;
    }

    const url = websocketUrl(campaignId);
    if (!url) {
      startPolling();
      return;
    }

    try {
      socket = new runtimeWindow.WebSocket(url);
      socket.onopen = () => {
        socketReady = true;
        reconnectAttempts = 0;
        stopPolling();
        clearSocketTimers();
        pingTimer = runtimeWindow.setInterval(() => {
          try { socket?.send(JSON.stringify({ type: 'ping' })); } catch { /* ignore */ }
        }, 25000);
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type === 'player_display_update' && message.data) {
            applyRemoteState(message.data);
          }
        } catch {
          // Ignore non-display websocket messages.
        }
      };
      socket.onerror = () => {
        try { socket?.close(); } catch { /* ignore */ }
      };
      socket.onclose = () => {
        socketReady = false;
        clearSocketTimers();
        scheduleReconnect();
      };
    } catch {
      socketReady = false;
      scheduleReconnect();
    }
  };

  // One initial read hydrates state for a fresh tab. After that, WebSocket is
  // authoritative while healthy; HTTP polling is only a reconnect fallback.
  readRemoteState();
  connectSocket();

  if (isPlayerDisplayPath(runtimeWindow.location?.pathname)) {
    acknowledgementTimer = runtimeWindow.setInterval(() => {
      void acknowledgeCurrentState();
    }, Math.max(5000, acknowledgementIntervalMs));
  }

  const runtimeDocument = getDocument();
  const onWake = () => {
    if (!socketReady) readRemoteState();
    else void acknowledgeCurrentState();
  };
  runtimeWindow.addEventListener('focus', onWake);
  runtimeWindow.addEventListener('online', onWake);
  if (runtimeDocument) runtimeDocument.addEventListener('visibilitychange', onWake);

  return () => {
    cancelled = true;
    stopPolling();
    if (acknowledgementTimer) runtimeWindow.clearInterval(acknowledgementTimer);
    if (reconnectTimer) runtimeWindow.clearTimeout(reconnectTimer);
    clearSocketTimers();
    try { socket?.close(); } catch { /* ignore */ }
    runtimeWindow.removeEventListener('focus', onWake);
    runtimeWindow.removeEventListener('online', onWake);
    if (runtimeDocument) runtimeDocument.removeEventListener('visibilitychange', onWake);
  };
}
