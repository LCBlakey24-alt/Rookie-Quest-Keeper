const channelName = (campaignId) => `rqk-live-display-${campaignId}`;
const storageKey = (campaignId) => `rqk.liveDisplay.${campaignId}`;
const localEventName = (campaignId) => `rqk-live-display-local-${campaignId}`;

let apiClientPromise;
async function getApiClient() {
  if (!apiClientPromise) apiClientPromise = import('./apiClient');
  const module = await apiClientPromise;
  return module.default;
}

export function createDisplayState(mode = 'blank', payload = {}) {
  return {
    mode,
    payload,
    updated_at: new Date().toISOString(),
  };
}

export function loadDisplayState(campaignId) {
  try {
    const raw = localStorage.getItem(storageKey(campaignId));
    if (!raw) return createDisplayState('blank', {});
    return JSON.parse(raw);
  } catch {
    return createDisplayState('blank', {});
  }
}

export async function loadRemoteDisplayState(campaignId) {
  if (!campaignId) return createDisplayState('blank', {});
  const apiClient = await getApiClient();
  const response = await apiClient.get(`/campaigns/${campaignId}/display-state`);
  const state = response.data || createDisplayState('blank', {});
  saveDisplayState(campaignId, state);
  return state;
}

export function saveDisplayState(campaignId, state) {
  try {
    localStorage.setItem(storageKey(campaignId), JSON.stringify(state));
  } catch {
    // Ignore storage failures. BroadcastChannel may still work.
  }
}

export function publishDisplayState(campaignId, state) {
  saveDisplayState(campaignId, state);
  try {
    window.dispatchEvent(new CustomEvent(localEventName(campaignId), { detail: state }));
  } catch {
    // Ignore local event failures; BroadcastChannel/storage polling still apply.
  }
  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(channelName(campaignId));
      channel.postMessage(state);
      channel.close();
    }
  } catch {
    // Older browsers can still pick up the saved state when refreshed or polled.
  }
}

export async function publishCampaignDisplayState(campaignId, state) {
  publishDisplayState(campaignId, state);
  try {
    const apiClient = await getApiClient();
    const response = await apiClient.put(`/campaigns/${campaignId}/display-state`, state);
    const remoteState = response.data || state;
    publishDisplayState(campaignId, remoteState);
    return remoteState;
  } catch {
    return state;
  }
}

export function subscribeDisplayState(campaignId, onState) {
  const handlers = [];
  let lastRaw = '';

  const readSavedState = () => {
    try {
      const raw = localStorage.getItem(storageKey(campaignId)) || '';
      if (!raw || raw === lastRaw) return;
      lastRaw = raw;
      onState(JSON.parse(raw));
    } catch {
      // Ignore malformed values.
    }
  };

  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(channelName(campaignId));
      channel.onmessage = (event) => {
        if (!event.data) return;
        try { lastRaw = JSON.stringify(event.data); } catch { /* ignore */ }
        onState(event.data);
      };
      handlers.push(() => channel.close());
    }
  } catch {
    // Continue with storage fallback.
  }

  const onStorage = (event) => {
    if (event.key !== storageKey(campaignId) || !event.newValue) return;
    try {
      lastRaw = event.newValue;
      onState(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed values.
    }
  };
  window.addEventListener('storage', onStorage);
  handlers.push(() => window.removeEventListener('storage', onStorage));

  const onLocalDisplayEvent = (event) => {
    if (!event.detail) return;
    try { lastRaw = JSON.stringify(event.detail); } catch { /* ignore */ }
    onState(event.detail);
  };
  window.addEventListener(localEventName(campaignId), onLocalDisplayEvent);
  handlers.push(() => window.removeEventListener(localEventName(campaignId), onLocalDisplayEvent));

  const interval = window.setInterval(readSavedState, 500);
  handlers.push(() => window.clearInterval(interval));

  readSavedState();

  return () => handlers.forEach(cleanup => cleanup());
}

export function subscribeRemoteDisplayState(campaignId, onState, { intervalMs = 2000 } = {}) {
  let cancelled = false;
  let lastRemoteUpdatedAt = '';

  const readRemoteState = async () => {
    try {
      const state = await loadRemoteDisplayState(campaignId);
      if (cancelled || !state?.updated_at || state.updated_at === lastRemoteUpdatedAt) return;
      lastRemoteUpdatedAt = state.updated_at;
      onState(state);
    } catch {
      // Same-browser local display sync remains available when remote sync fails.
    }
  };

  readRemoteState();
  const interval = window.setInterval(readRemoteState, intervalMs);

  return () => {
    cancelled = true;
    window.clearInterval(interval);
  };
}
