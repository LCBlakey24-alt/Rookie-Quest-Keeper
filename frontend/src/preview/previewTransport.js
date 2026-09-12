import axios from 'axios';
import { isLocalPreview } from './previewMode';

function previewPath(url = '') {
  return new URL(url, 'https://preview.invalid').pathname
    .replace(/^\/api(?=\/|$)/, '')
    .replace(/\/$/, '') || '/';
}

async function dispatchCharacterProgressionPreview({ method, url, body, previewRequest }) {
  const path = previewPath(url);
  const match = path.match(/^\/characters\/([^/]+)\/(level-up-options|level-up|multiclass)$/);
  if (!match) return { handled: false, data: null };

  const [, rawCharacterId, action] = match;
  const characterId = decodeURIComponent(rawCharacterId);
  const character = previewRequest('get', `/characters/${characterId}`);
  const {
    applyPreviewCharacterLevelUp,
    getPreviewLevelUpOptions,
  } = await import('./previewCharacterProgression');

  if (action === 'level-up-options' && method === 'get') {
    return { handled: true, data: getPreviewLevelUpOptions(character) };
  }

  if (action === 'level-up' && method === 'post') {
    const updated = applyPreviewCharacterLevelUp(character, body, { multiclass: false });
    return { handled: true, data: previewRequest('patch', `/characters/${characterId}`, updated) };
  }

  if (action === 'multiclass' && method === 'post') {
    const updated = applyPreviewCharacterLevelUp(character, body, { multiclass: true });
    return { handled: true, data: previewRequest('patch', `/characters/${characterId}`, updated) };
  }

  return { handled: false, data: null };
}

// Every preview API call terminates locally. Unsupported routes fail explicitly;
// there is deliberately no fallback to a real API or shared account.
export async function previewAdapter(config) {
  const { previewRequest } = await import('./previewApi');
  try {
    const method = String(config.method || 'get').toLowerCase();
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {};
    const progression = await dispatchCharacterProgressionPreview({ method, url: config.url, body, previewRequest });
    const data = progression.handled
      ? progression.data
      : previewRequest(method, config.url, body);
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  } catch (error) {
    const response = { data: { detail: error.message }, status: error.status || 400, statusText: 'Preview request failed', headers: {}, config };
    throw new axios.AxiosError(error.message, 'ERR_BAD_RESPONSE', config, null, response);
  }
}

export function installPreviewTransport(runtime = window) {
  if (!isLocalPreview(runtime.location.hostname)) return;
  // Set this before App and its legacy axios clients are evaluated.
  axios.defaults.adapter = previewAdapter;
  const originalFetch = runtime.fetch?.bind(runtime);
  if (!originalFetch) return;
  runtime.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, runtime.location.origin);
    if (!/^\/api(?:\/|$)/.test(url.pathname)) return originalFetch(input, options);
    const method = options.method || input?.method || 'GET';
    const body = options.body ?? (typeof input?.clone === 'function' ? await input.clone().text() : undefined);
    try {
      const response = await previewAdapter({ url: url.href, method, data: body });
      return new runtime.Response(JSON.stringify(response.data), { status: response.status, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      return new runtime.Response(JSON.stringify(error.response?.data || { detail: error.message }), { status: error.response?.status || 400, headers: { 'Content-Type': 'application/json' } });
    }
  };
}
