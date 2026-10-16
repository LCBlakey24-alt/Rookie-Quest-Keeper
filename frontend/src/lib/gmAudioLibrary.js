import { DESKTOP_STORAGE_KEY } from '@/preview/previewMode';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const META_PREFIX = 'rqk.gm-audio.tracks.v2.';
const DB_NAME = 'rqk-gm-audio';
const DB_STORE = 'mp3-files';
let playback = null;
const listeners = new Set();
let playing = { campaignId: null, trackId: null, status: 'stopped', volume: 0.7, loop: true, error: '' };
let temporaryUrl = '';
let hydrated = false;
const notify = () => listeners.forEach(fn => fn(getAudioState()));

function metaKey(campaignId) { return META_PREFIX + encodeURIComponent(String(campaignId || 'campaign')); }
function readLocal(campaignId, storage = typeof localStorage === 'undefined' ? null : localStorage) {
  try {
    const records = JSON.parse(storage?.getItem(metaKey(campaignId)) || '[]');
    return Array.isArray(records) ? records.filter(entry => entry && typeof entry.id === 'string' && typeof entry.name === 'string').slice(0, 150) : [];
  } catch { return []; }
}
function writeLocal(campaignId, records, storage = localStorage) {
  storage.setItem(metaKey(campaignId), JSON.stringify(records));
}

export function importedCampaignAudio(campaignId, storage = typeof localStorage === 'undefined' ? null : localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(DESKTOP_STORAGE_KEY) || 'null');
    const records = parsed?.collections?.[String(campaignId)]?.['audio-tracks'];
    if (!Array.isArray(records)) return [];
    return records.filter(item => item?.attachment_url && typeof item.attachment_url === 'string')
      .map(item => ({ id: String(item.id), name: String(item.name || item.title || 'Audio recording'), url: item.attachment_url, source: 'campaign', campaign_id: campaignId, category: item.category || 'Voices' }));
  } catch { return []; }
}

export function listCampaignAudio(campaignId, storage) {
  const entries = [...importedCampaignAudio(campaignId, storage), ...readLocal(campaignId, storage)];
  const seen = new Set();
  return entries.filter(entry => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

function openAudioDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Audio storage is not available in this browser.'));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DB_STORE)) request.result.createObjectStore(DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open audio storage'));
  });
}

async function putMp3(id, file) {
  const db = await openAudioDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(file, id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not store MP3'));
      tx.onabort = () => reject(tx.error || new Error('MP3 storage interrupted'));
    });
  } finally { db.close(); }
}

async function getMp3(id) {
  const db = await openAudioDb();
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error('Could not load MP3'));
    });
  } finally { db.close(); }
}

async function deleteMp3(id) {
  const db = await openAudioDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not delete MP3'));
    });
  } finally { db.close(); }
}

function asDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read MP3'));
    reader.readAsDataURL(file);
  });
}

export function validAudioFile(file) {
  return !!file && file.size > 0 && file.size <= MAX_AUDIO_BYTES
    && (/\.mp3$/i.test(file.name || '') || file.type === 'audio/mpeg' || file.type === 'audio/mp3');
}

export async function importAudioFiles(campaignId, files) {
  const entries = [];
  const existing = readLocal(campaignId);
  for (const file of Array.from(files || [])) {
    if (!validAudioFile(file)) throw new Error('Choose MP3 files no larger than 25 MB each.');
    const id = 'gm-audio-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
    const entry = { id, name: String(file.name || 'Track').replace(/\.mp3$/i, ''), category: 'Music', source: 'uploaded', size: file.size, campaign_id: campaignId };
    if (window.rookieDesktop?.storeLocalAudioFile) {
      const result = await window.rookieDesktop.storeLocalAudioFile(await asDataUrl(file));
      if (!result?.url) throw new Error('Could not save MP3 to offline laptop.');
      entry.url = result.url;
    } else {
      await putMp3(id, file);
      entry.indexedDb = true;
    }
    entries.push(entry);
  }
  writeLocal(campaignId, [...existing, ...entries]);
  notify();
  return entries;
}

export async function removeAudioTrack(campaignId, trackId) {
  const tracks = readLocal(campaignId);
  const track = tracks.find(item => item.id === trackId);
  if (!track) return false; // Bundled campaign files cannot be deleted from GM library.
  if (playing.trackId === trackId) stopAudio();
  if (track.indexedDb) await deleteMp3(trackId);
  writeLocal(campaignId, tracks.filter(item => item.id !== trackId));
  notify();
  return true;
}

function audioElement() {
  if (!playback) {
    playback = new Audio();
    playback.preload = 'metadata';
    playback.addEventListener('ended', () => {
      if (!playback.loop) {
        playing = { ...playing, status: 'stopped', trackId: null };
        notify();
      }
    });
    playback.addEventListener('error', () => {
      playing = { ...playing, status: 'stopped', error: 'The audio file could not be played.' };
      notify();
    });
  }
  return playback;
}

export function getAudioState() { return { ...playing }; }
export function subscribeAudio(fn) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export async function playAudio(campaignId, track) {
  if (!track?.id) throw new Error('Choose a track first');
  const audio = audioElement();
  if (playing.trackId === track.id && playing.status === 'paused') {
    await audio.play();
    playing = { ...playing, status: 'playing', error: '' };
    notify(); return;
  }
  audio.pause();
  if (temporaryUrl) { URL.revokeObjectURL(temporaryUrl); temporaryUrl = ''; }
  let url = track.url;
  if (track.indexedDb) {
    const file = await getMp3(track.id);
    if (!file) throw new Error('That MP3 is no longer in offline storage.');
    temporaryUrl = URL.createObjectURL(file);
    url = temporaryUrl;
  }
  if (!url) throw new Error('This audio track has no playable file.');
  audio.src = url;
  audio.volume = playing.volume;
  audio.loop = playing.loop;
  await audio.play();
  playing = { ...playing, status: 'playing', trackId: track.id, campaignId, error: '' };
  notify();
}
export function pauseAudio() {
  if (playback) playback.pause();
  playing = { ...playing, status: playing.trackId ? 'paused' : 'stopped' }; notify();
}
export function stopAudio() {
  if (playback) { playback.pause(); playback.removeAttribute('src'); playback.load(); }
  if (temporaryUrl) { URL.revokeObjectURL(temporaryUrl); temporaryUrl = ''; }
  playing = { ...playing, trackId: null, campaignId: null, status: 'stopped', error: '' }; notify();
}
export function setAudioVolume(value) {
  const volume = Math.min(1, Math.max(0, Number(value) || 0));
  if (playback) playback.volume = volume;
  playing = { ...playing, volume }; notify();
}
export function setAudioLoop(loop) {
  if (playback) playback.loop = !!loop;
  playing = { ...playing, loop: !!loop }; notify();
}
