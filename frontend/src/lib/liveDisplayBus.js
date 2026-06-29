const channelName = (campaignId) => `rqk-live-display-${campaignId}`;
const storageKey = (campaignId) => `rqk.liveDisplay.${campaignId}`;

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
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(channelName(campaignId));
      channel.postMessage(state);
      channel.close();
    }
  } catch {
    // Older browsers can still pick up the saved state when refreshed or polled.
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

  const interval = window.setInterval(readSavedState, 1500);
  handlers.push(() => window.clearInterval(interval));

  readSavedState();

  return () => handlers.forEach(cleanup => cleanup());
}
