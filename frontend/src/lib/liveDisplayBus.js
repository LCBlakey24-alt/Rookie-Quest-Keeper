import { isLocalPreview } from '@/preview/previewMode';
import { BACKEND_URL } from '@/lib/api';
import { AUTH_TOKEN_KEY, getAuthToken } from '@/lib/auth';
import {
  accountFromToken,
  isLegacyDisplayKey,
  ownedChannelName,
  ownedEventName,
  ownedStorageKey,
} from '@/lib/liveDisplayScope';

/*
 * Account isolation (see lib/liveDisplayScope.js).
 *
 * Every same-browser transport -- the localStorage cache, BroadcastChannel,
 * the same-tab custom event and cross-tab storage events -- is named for the
 * account AND the campaign, and every record it carries is stamped with its
 * owner. A reader drops anything not stamped for the account signed in at
 * that moment, so a message, stored value or late HTTP/socket response
 * belonging to account A cannot reach account B's screen after a switch.
 * Unowned v1 records are never read; they are removed on sight.
 */

// The local preview / read-only demo is one in-browser sample workspace with
// no server account; it gets one fixed scope of its own.
const LOCAL_PREVIEW_ACCOUNT = 'local-preview';

/** The account Player Display content may be shown to right now, or ''. */
export function currentDisplayAccount() {
  if (isLocalPreview()) return LOCAL_PREVIEW_ACCOUNT;
  return accountFromToken(getAuthToken() || '');
}

const envelope = (account, campaignId, state) => ({ owner: account, campaign_id: String(campaignId || ''), state });

/** The state inside an envelope, only if it is this account's and campaign's. */
function openEnvelope(value, account, campaignId) {
  if (!account || !value || typeof value !== 'object') return null;
  if (value.owner !== account || value.campaign_id !== String(campaignId || '')) return null;
  if (!value.state || typeof value.state !== 'object') return null;
  // The account must still be the signed-in one when the record arrives.
  if (currentDisplayAccount() !== account) return null;
  return value.state;
}

/** Thrown when a response arrives for an account that is no longer signed in. */
class StaleAccountError extends Error {}

/** HTTP status of a failed request, or 0 for no response (offline/timeout). */
function failureStatus(error) {
  return Number(error?.response?.status) || 0;
}

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

function readStoredDisplayState(campaignId, account = currentDisplayAccount()) {
  const runtimeWindow = getWindow();
  if (!runtimeWindow?.localStorage || !account || !campaignId) return null;
  try {
    // A v1 record has no owner, so it cannot be shown to anyone or adopted
    // by whoever happens to be signed in. It only ever mirrored server state.
    const legacyKey = `rqk.liveDisplay.${campaignId}`;
    if (isLegacyDisplayKey(legacyKey) && runtimeWindow.localStorage.getItem(legacyKey) !== null) {
      runtimeWindow.localStorage.removeItem(legacyKey);
    }
    const raw = runtimeWindow.localStorage.getItem(ownedStorageKey(account, campaignId));
    if (!raw) return null;
    const stored = openEnvelope(JSON.parse(raw), account, campaignId);
    return stored ? normaliseDisplayState(stored) : null;
  } catch {
    return null;
  }
}

function clearStoredDisplayState(campaignId, account) {
  const runtimeWindow = getWindow();
  if (!runtimeWindow?.localStorage || !account) return;
  try { runtimeWindow.localStorage.removeItem(ownedStorageKey(account, campaignId)); } catch { /* ignore */ }
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

/** This account's last-known display for the campaign; blank without one. */
export function loadDisplayState(campaignId, account = currentDisplayAccount()) {
  return readStoredDisplayState(campaignId, account) || createDisplayState('blank', {});
}

export async function loadRemoteDisplayState(campaignId, account = currentDisplayAccount()) {
  if (!campaignId) return createDisplayState('blank', {});
  const apiClient = await getApiClient();
  const response = await apiClient.get(`/campaigns/${campaignId}/display-state`);
  // Answered for an account that has since signed out or been replaced.
  if (!account || currentDisplayAccount() !== account) throw new StaleAccountError();
  const rawState = response.data || createDisplayState('blank', {});
  const localState = readStoredDisplayState(campaignId, account);
  const state = reconcileRemoteState(rawState, normaliseDisplayState(rawState), localState);
  if (!localState || isNewerState(state, localState)) saveDisplayState(campaignId, state, account);
  return state;
}

export function saveDisplayState(campaignId, state, account = currentDisplayAccount()) {
  const runtimeWindow = getWindow();
  if (!runtimeWindow?.localStorage || !account || currentDisplayAccount() !== account) return;
  try {
    runtimeWindow.localStorage.setItem(
      ownedStorageKey(account, campaignId),
      JSON.stringify(envelope(account, campaignId, normaliseDisplayState(state))),
    );
  } catch {
    // Ignore storage failures. BroadcastChannel may still work.
  }
}

export function publishDisplayState(campaignId, state) {
  const runtimeWindow = getWindow();
  const account = currentDisplayAccount();
  const safeState = normaliseDisplayState(state);
  if (!account) return; // nobody to publish for in this browser
  saveDisplayState(campaignId, safeState, account);
  if (!runtimeWindow) return;
  const message = envelope(account, campaignId, safeState);
  try {
    runtimeWindow.dispatchEvent(new CustomEvent(ownedEventName(account, campaignId), { detail: message }));
  } catch {
    // Ignore local event failures; BroadcastChannel/storage polling still apply.
  }
  try {
    if (runtimeWindow.BroadcastChannel) {
      const channel = new runtimeWindow.BroadcastChannel(ownedChannelName(account, campaignId));
      channel.postMessage(message);
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
    if (!currentDisplayAccount()) return localState;
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

export function subscribeDisplayState(campaignId, onState, account = currentDisplayAccount()) {
  const runtimeWindow = getWindow();
  if (!runtimeWindow || !account) return safeNoop;

  const handlers = [];
  let lastIdentity = '';

  const applyState = (state) => {
    // Anything that reaches here after a sign-out or switch is not ours.
    if (!state || currentDisplayAccount() !== account) return;
    const safeState = normaliseDisplayState(state);
    const identity = displayStateRevisionIdentity(safeState);
    if (identity === lastIdentity) return;
    const current = readStoredDisplayState(campaignId, account);
    if (current && !isNewerState(safeState, current) && displayStateRevisionIdentity(current) !== identity) return;
    lastIdentity = identity;
    onState(safeState);
  };

  const readSavedState = () => {
    try {
      const state = readStoredDisplayState(campaignId, account);
      if (!state) return;
      applyState(state);
    } catch {
      // Ignore malformed values.
    }
  };

  try {
    if (runtimeWindow.BroadcastChannel) {
      const channel = new runtimeWindow.BroadcastChannel(ownedChannelName(account, campaignId));
      channel.onmessage = (event) => {
        applyState(openEnvelope(event.data, account, campaignId));
      };
      handlers.push(() => channel.close());
    }
  } catch {
    // Continue with storage fallback.
  }

  const onStorage = (event) => {
    if (event.key !== ownedStorageKey(account, campaignId) || !event.newValue) return;
    try {
      applyState(openEnvelope(JSON.parse(event.newValue), account, campaignId));
    } catch {
      // Ignore malformed values.
    }
  };
  runtimeWindow.addEventListener('storage', onStorage);
  handlers.push(() => runtimeWindow.removeEventListener('storage', onStorage));

  const onLocalDisplayEvent = (event) => {
    applyState(openEnvelope(event.detail, account, campaignId));
  };
  const eventName = ownedEventName(account, campaignId);
  runtimeWindow.addEventListener(eventName, onLocalDisplayEvent);
  handlers.push(() => runtimeWindow.removeEventListener(eventName, onLocalDisplayEvent));

  const interval = runtimeWindow.setInterval(readSavedState, 500);
  handlers.push(() => runtimeWindow.clearInterval(interval));

  readSavedState();

  return () => handlers.forEach(cleanup => cleanup());
}

/**
 * Follow the server's display state for this account.
 *
 * `onStatus` hears how the last read went, so the screen never claims to be
 * synced when it is not:
 *   'synced'     a successful response for this account;
 *   'offline'    no response (network down, timeout, 5xx) -- this account's
 *                own last-known state may still be shown, labelled as such;
 *   'denied'     403/404 -- the account may not see this campaign's display;
 *   'signed-out' 401 -- the session has ended.
 * On 'denied' and 'signed-out' this account's cached copy is deleted and a
 * blank state is sent, so nothing protected stays on screen while retrying.
 */
export function subscribeRemoteDisplayState(campaignId, onState, {
  intervalMs = 5000,
  acknowledgementIntervalMs = 10000,
  onStatus = safeNoop,
  account = currentDisplayAccount(),
} = {}) {
  const runtimeWindow = getWindow();
  if (!runtimeWindow) return safeNoop;
  if (!account) { onStatus('signed-out'); return safeNoop; }

  let cancelled = false;
  const stillOurs = () => !cancelled && currentDisplayAccount() === account;
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
    if (!stillOurs() || !state?.updated_at) return;
    const localState = readStoredDisplayState(campaignId, account);
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
    saveDisplayState(campaignId, safeState, account);
    onState(safeState);
    void acknowledgeCurrentState(safeState);
  };

  const refuse = (status) => {
    // Nothing this account may not see stays cached or on screen.
    clearStoredDisplayState(campaignId, account);
    lastRemoteIdentity = '';
    lastAcknowledgementState = null;
    onState(createDisplayState('blank', {}));
    onStatus(status);
  };

  const readRemoteState = async () => {
    if (cancelled || remoteReadInFlight) return;
    remoteReadInFlight = true;
    try {
      const state = await loadRemoteDisplayState(campaignId, account);
      if (!stillOurs()) return;
      applyRemoteState(state);
      onStatus('synced');
    } catch (error) {
      if (error instanceof StaleAccountError || !stillOurs()) return;
      const status = failureStatus(error);
      if (status === 401) refuse('signed-out');
      else if (status === 403 || status === 404) refuse('denied');
      // Anything else is an outage: this account's own last-known state may
      // stay, but it is reported as not synced.
      else onStatus('offline');
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
        if (!stillOurs()) return;
        try {
          const message = JSON.parse(event.data);
          if (message?.type === 'player_display_update' && message.data) {
            applyRemoteState(message.data);
            onStatus('synced');
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

  // Sign-out or a different account, in this tab or another: stop at once.
  // The socket was opened with this account's token and must not keep
  // delivering after it.
  const stop = () => {
    cancelled = true;
    stopPolling();
    if (acknowledgementTimer) runtimeWindow.clearInterval(acknowledgementTimer);
    if (reconnectTimer) runtimeWindow.clearTimeout(reconnectTimer);
    clearSocketTimers();
    try { socket?.close(); } catch { /* ignore */ }
    runtimeWindow.removeEventListener('focus', onWake);
    runtimeWindow.removeEventListener('online', onWake);
    if (runtimeDocument) runtimeDocument.removeEventListener('visibilitychange', onWake);
    runtimeWindow.removeEventListener('rqk:auth-scope-changed', onAccountMaybeChanged);
    runtimeWindow.removeEventListener('storage', onTokenStorage);
  };
  const onAccountMaybeChanged = () => {
    if (!cancelled && currentDisplayAccount() !== account) stop();
  };
  const onTokenStorage = (event) => {
    if (event.key === null || event.key === AUTH_TOKEN_KEY) onAccountMaybeChanged();
  };
  runtimeWindow.addEventListener('rqk:auth-scope-changed', onAccountMaybeChanged);
  runtimeWindow.addEventListener('storage', onTokenStorage);

  return () => {
    runtimeWindow.removeEventListener('rqk:auth-scope-changed', onAccountMaybeChanged);
    runtimeWindow.removeEventListener('storage', onTokenStorage);
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
