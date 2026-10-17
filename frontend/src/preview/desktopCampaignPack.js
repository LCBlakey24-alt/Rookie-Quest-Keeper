import { DESKTOP_STORAGE_KEY, isOfflineDesktop } from './previewMode';

const PACK_FORMAT = 'rookie-quest-keeper-campaign-pack';

function emptyWorkspace() {
  return {
    version: 1,
    campaigns: [],
    characters: [],
    collections: {},
    notes: [],
    recaps: [],
    receipts: {},
    objects: {},
    homebrew: [],
  };
}

function validWorkspace(value) {
  return Boolean(
    value
    && value.version === 1
    && Array.isArray(value.campaigns)
    && Array.isArray(value.characters)
    && value.collections && typeof value.collections === 'object'
    && Array.isArray(value.notes)
    && Array.isArray(value.recaps)
    && value.receipts && typeof value.receipts === 'object'
    && value.objects && typeof value.objects === 'object'
    && Array.isArray(value.homebrew),
  );
}

function mergeRecords(existing = [], incoming = [], options = {}) {
  const { preserveExisting = false, preserveFields = [] } = options;
  const result = [...existing];
  const indexById = new Map(
    result
      .map((record, index) => [record?.id || record?._id || '', index])
      .filter(([id]) => id),
  );

  for (const record of incoming) {
    if (!record || typeof record !== 'object') continue;
    const id = record.id || record._id || '';
    if (id && indexById.has(id)) {
      const index = indexById.get(id);
      // Existing live state must not be reset by a source-library update.
      if (preserveExisting) continue;
      const combined = { ...result[index], ...record };
      for (const field of preserveFields) {
        if (Object.prototype.hasOwnProperty.call(result[index], field)) {
          combined[field] = result[index][field];
        }
      }
      result[index] = combined;
    } else {
      result.push(record);
      if (id) indexById.set(id, result.length - 1);
    }
  }
  return result;
}

function applyAttachmentUrls(workspace, attachmentUrls = {}) {
  const copy = JSON.parse(JSON.stringify(workspace));
  for (const campaignCollections of Object.values(copy.collections || {})) {
    const handouts = campaignCollections?.handouts;
    if (!Array.isArray(handouts)) continue;
    for (const handout of handouts) {
      if (!handout?.attachment_ref) continue;
      const url = attachmentUrls[handout.attachment_ref];
      if (!url) continue;
      handout.attachment_url = url;
      if (String(handout.attachment_type || '').startsWith('image/')) {
        handout.image_url = url;
      }
    }
  }
  return copy;
}

const CAMPAIGN_LIVE_FIELDS = [
  'players', 'party', 'player_character_ids', 'linked_character_ids',
  'session_number', 'current_session', 'session_count', 'current_date',
  'party_gold', 'treasury', 'combat_state', 'progress',
];
const RECORD_LIVE_FIELDS = [
  'current_hp', 'current_hit_points', 'temporary_hit_points', 'conditions',
  'status', 'progress', 'completed', 'resource_uses', 'inventory',
  'session_notes',
];

// Content updates can refresh GM references without undoing actions performed
// during play. Existing characters and player-authored logs are retained.
// Newly introduced characters, notes and recaps still import normally.
export function mergeDesktopWorkspace(existingState, incomingState, options = {}) {
  const campaignUpdate = options.campaignUpdate === true;
  const existing = validWorkspace(existingState) ? existingState : emptyWorkspace();
  if (!validWorkspace(incomingState)) throw new Error('Campaign pack workspace is invalid.');

  const next = {
    ...existing,
    version: 1,
    campaigns: mergeRecords(existing.campaigns, incomingState.campaigns, {
      preserveFields: campaignUpdate ? CAMPAIGN_LIVE_FIELDS : [],
    }),
    characters: mergeRecords(existing.characters, incomingState.characters, {
      preserveExisting: campaignUpdate,
    }),
    notes: mergeRecords(existing.notes, incomingState.notes, {
      preserveExisting: campaignUpdate,
    }),
    recaps: mergeRecords(existing.recaps, incomingState.recaps, {
      preserveExisting: campaignUpdate,
    }),
    homebrew: mergeRecords(existing.homebrew, incomingState.homebrew, {
      preserveExisting: campaignUpdate,
    }),
    receipts: campaignUpdate
      ? { ...incomingState.receipts, ...existing.receipts }
      : { ...existing.receipts, ...incomingState.receipts },
    objects: campaignUpdate
      ? { ...incomingState.objects, ...existing.objects }
      : { ...existing.objects, ...incomingState.objects },
    collections: { ...existing.collections },
  };

  for (const [campaignId, incomingCollections] of Object.entries(incomingState.collections || {})) {
    const currentCollections = next.collections[campaignId] || {};
    const mergedCollections = { ...currentCollections };
    for (const [collectionName, incomingRecords] of Object.entries(incomingCollections || {})) {
      if (Array.isArray(incomingRecords)) {
        mergedCollections[collectionName] = mergeRecords(currentCollections[collectionName] || [], incomingRecords, {
          preserveFields: campaignUpdate ? RECORD_LIVE_FIELDS : [],
        });
      } else if (incomingRecords && typeof incomingRecords === 'object') {
        mergedCollections[collectionName] = {
          ...(currentCollections[collectionName] || {}),
          ...incomingRecords,
        };
      }
    }
    next.collections[campaignId] = mergedCollections;
  }

  return next;
}

export async function importDesktopCampaignPack(runtime = typeof window === 'undefined' ? null : window) {
  if (!runtime || !isOfflineDesktop(runtime) || typeof runtime.rookieDesktop?.importCampaignPack !== 'function') {
    throw new Error('Campaign packs can only be imported in Rookie Quest Keeper Desktop.');
  }

  const result = await runtime.rookieDesktop.importCampaignPack(runtime.localStorage?.getItem(DESKTOP_STORAGE_KEY));
  if (result?.canceled) return { canceled: true };
  const pack = result?.pack;
  if (!pack || pack.format !== PACK_FORMAT || pack.version !== 1 || !pack.workspace) {
    throw new Error('That file is not a supported Rookie Quest Keeper campaign pack.');
  }

  const incoming = applyAttachmentUrls(pack.workspace, pack.attachment_urls || {});
  let existing = null;
  try {
    existing = JSON.parse(runtime.localStorage?.getItem(DESKTOP_STORAGE_KEY) || 'null');
  } catch {
    existing = null;
  }

  const merged = mergeDesktopWorkspace(existing, incoming, { campaignUpdate: pack.pack_type === 'campaign-update' });
  runtime.localStorage?.setItem(DESKTOP_STORAGE_KEY, JSON.stringify(merged));

  return {
    canceled: false,
    pack_name: pack.pack_name || result.file_name || 'Campaign Pack',
    pack_type: pack.pack_type || 'campaign-pack',
    campaign_count: incoming.campaigns.length,
    character_count: incoming.characters.length,
    attachment_count: Object.keys(pack.attachment_urls || {}).length,
  };
}
