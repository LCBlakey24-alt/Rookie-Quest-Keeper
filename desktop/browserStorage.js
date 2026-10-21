'use strict';

// Export only known Keeper campaign state and harmless display preferences.
// Never broaden these to rqk.*, gm.*, browser profiles, or arbitrary keys.
// The renderer must select supported key NAMES before reading any values.
const SUPPLEMENTAL_POLICY = Object.freeze({
  exactKeys: Object.freeze([
    'rook-theme',
    'players.search',
    'players.sort',
    'rqk.player.active-character',
    'rqk.updates.latestSeen',
    'rqk.pwa.install.dismissed',
    'rqk.full_character_creator_v2.safe',
    'rq_character_builder_draft_v2',
    'rq.prototype.tia-karta.gm-notes',
  ]),
  prefixKeys: Object.freeze([
    'gm.activeCombat.',
    'gm.pendingCombatDisplayClear.',
    'gm.questEncounter.',
    'gm.lastEncounter.',
    'gm.liveEncounterNpcQueue.',
    'gm.liveQuestFocus.',
    'gm.liveNpcSearch.',
    'gm.liveLocationFocus.',
    'gm.liveNotePrefill.',
    'gm.liveMode.focus.',
    'gm.liveMode.recent.',
    'gm.explodingDice.',
    'gm.returnToLive.',
    'rqk.gm.assets.',
    'rqk.liveRollTables.',
    'rqk.liveDisplay.',
    'rqk.playerDisplay.target.',
    'rqk.combat.stagedCreatures.',
    'rqk.rollStats.session.',
    'rqk.rollStats.allTime.',
    'rqk.rollStats.archive.',
    'rqk.character-notes-draft:',
    'rqk.tiaKarta.fridayRunner.',
    'rqk.tutorial.complete.',
    'rq.prototype.character.',
    'rook.player.dismissed.',
    'soundboard-custom-',
    'smart-sessions-',
    'npc-map-pos-',
    'npc-map-conn-',
    'quicktips_',
  ]),
});

const MAX_BROWSER_STORAGE_BYTES = 64 * 1024 * 1024;
const MAX_BROWSER_STORAGE_VALUE_BYTES = 40 * 1024 * 1024;
const MAX_BROWSER_STORAGE_KEYS = 10000;
const MAX_BROWSER_STORAGE_KEY_LENGTH = 512;

function isSupportedBrowserKey(key) {
  return typeof key === 'string' && key.length <= MAX_BROWSER_STORAGE_KEY_LENGTH
    && !/[\u0000-\u001f\u007f]/.test(key)
    && (SUPPLEMENTAL_POLICY.exactKeys.includes(key)
      || SUPPLEMENTAL_POLICY.prefixKeys.some(prefix => key.startsWith(prefix) && key.length > prefix.length));
}

function validateBrowserStorage(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
    throw new Error('Supplemental Keeper storage must be a map of supported keys and exact string values.');
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.length > MAX_BROWSER_STORAGE_KEYS) throw new Error('Supplemental Keeper storage has too many entries.');
  if (keys.some(key => typeof key !== 'string')) throw new Error('Supplemental backup contains an unsupported browser-storage key or property.');
  const result = {};
  let bytes = 2; // JSON object braces; count escaped JSON, not just raw strings.
  for (const key of keys.sort()) {
    const descriptor = descriptors[key];
    if (!isSupportedBrowserKey(key) || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new Error('Supplemental backup contains an unsupported browser-storage key or property.');
    }
    const value = descriptor.value;
    if (typeof value !== 'string') throw new Error('Supplemental browser-storage values must remain exact strings.');
    if (Buffer.byteLength(value, 'utf8') > MAX_BROWSER_STORAGE_VALUE_BYTES) {
      throw new Error('One supplemental browser-storage value exceeds the 40 MB backup limit.');
    }
    bytes += Buffer.byteLength(JSON.stringify(key), 'utf8') + Buffer.byteLength(JSON.stringify(value), 'utf8') + 2;
    if (bytes > MAX_BROWSER_STORAGE_BYTES) throw new Error('Supplemental browser storage exceeds the 64 MB backup limit.');
    result[key] = value; // Do not parse or normalise JSON, inline media, or drafts.
  }
  return result;
}

function categoryForKey(key) {
  if (key.startsWith('rqk.gm.assets.') || key.startsWith('soundboard-custom-')) return 'media';
  if (key.startsWith('gm.activeCombat.') || key.startsWith('gm.pendingCombatDisplayClear.')
      || key.startsWith('rqk.combat.stagedCreatures.') || key.startsWith('gm.liveEncounterNpcQueue.')) return 'combat';
  if (key.startsWith('smart-sessions-') || key.startsWith('rqk.rollStats.')
      || key.startsWith('rqk.liveRollTables.') || key.startsWith('rqk.tiaKarta.fridayRunner.')) return 'sessions';
  if (key === 'rqk.full_character_creator_v2.safe' || key === 'rq_character_builder_draft_v2'
      || key.startsWith('rqk.character-notes-draft:') || key.startsWith('rq.prototype.character.')) return 'drafts';
  if (key.startsWith('npc-map-') || key === 'rq.prototype.tia-karta.gm-notes'
      || key.startsWith('rqk.liveDisplay.') || key.startsWith('gm.liveQuestFocus.')) return 'campaign_state';
  return 'preferences';
}

function summarizeBrowserStorage(input) {
  const values = validateBrowserStorage(input);
  const categories = {};
  for (const key of Object.keys(values)) {
    const category = categoryForKey(key);
    categories[category] = (categories[category] || 0) + 1;
  }
  return categories;
}

module.exports = {
  SUPPLEMENTAL_POLICY, isSupportedBrowserKey, validateBrowserStorage, summarizeBrowserStorage,
  MAX_BROWSER_STORAGE_BYTES, MAX_BROWSER_STORAGE_VALUE_BYTES, MAX_BROWSER_STORAGE_KEYS,
};
