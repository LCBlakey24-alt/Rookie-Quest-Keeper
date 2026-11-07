/**
 * An end-session operation may complete on the server just before the
 * browser loses its response. Keep its opaque id across retries and page
 * refreshes, scoped to the signed-in account AND campaign.
 *
 * No private player/GM data is stored here, only the retry token and time.
 */
const MAX_AGE_MS = 8 * 60 * 60 * 1000;
const keyFor = (campaignId, account) => (
  campaignId && account ? \`rqk.endSessionAttempt.v1:\${encodeURIComponent(account)}:\${encodeURIComponent(campaignId)}\` : ''
);

function read(key) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (!saved || typeof saved.id !== 'string' || !Number.isFinite(saved.createdAt)) return null;
    if (Date.now() - saved.createdAt > MAX_AGE_MS || saved.createdAt > Date.now()) return null;
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(saved.id)) return null;
    return saved;
  } catch { return null; }
}

function write(key, value) {
  try { if (key) sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

function newId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return 'end-' + crypto.randomUUID();
  } catch { /* use fallback */ }
  return 'end-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

export function getSessionCloseAttempt(campaignId, account, activeRollCount = 0) {
  const key = keyFor(campaignId, account);
  const saved = key ? read(key) : null;
  // An already archived session has new rolls: this is a NEW session.
  if (saved && !(saved.archived && Number(activeRollCount) > 0)) return saved.id;
  const id = newId();
  write(key, { id, createdAt: Date.now(), archived: false });
  return id;
}

export function markSessionCloseArchived(campaignId, account, id) {
  const key = keyFor(campaignId, account);
  const saved = key ? read(key) : null;
  if (saved?.id === id) write(key, { ...saved, archived: true });
}

export function clearSessionCloseAttempt(campaignId, account, id) {
  const key = keyFor(campaignId, account);
  if (!key) return;
  const saved = read(key);
  if (saved?.id !== id) return;
  try { sessionStorage.removeItem(key); } catch { /* ignore */ }
}
