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

function mergeRecords(existing = [], incoming = []) {
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
      result[index] = { ...result[index], ...record };
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

export function mergeDesktopWorkspace(existingState, incomingState) {
  const existing = validWorkspace(existingState) ? existingState : emptyWorkspace();
  if (!validWorkspace(incomingState)) throw new Error('Campaign pack workspace is invalid.');

  const next = {
    ...existing,
    version: 1,
    campaigns: mergeRecords(existing.campaigns, incomingState.campaigns),
    characters: mergeRecords(existing.characters, incomingState.characters),
    notes: mergeRecords(existing.notes, incomingState.notes),
    recaps: mergeRecords(existing.recaps, incomingState.recaps),
    homebrew: mergeRecords(existing.homebrew, incomingState.homebrew),
    receipts: { ...existing.receipts, ...incomingState.receipts },
    objects: { ...existing.objects, ...incomingState.objects },
    collections: { ...existing.collections },
  };

  for (const [campaignId, incomingCollections] of Object.entries(incomingState.collections || {})) {
    const currentCollections = next.collections[campaignId] || {};
    const mergedCollections = { ...currentCollections };
    for (const [collectionName, incomingRecords] of Object.entries(incomingCollections || {})) {
      if (Array.isArray(incomingRecords)) {
        mergedCollections[collectionName] = mergeRecords(currentCollections[collectionName] || [], incomingRecords);
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

  const result = await runtime.rookieDesktop.importCampaignPack();
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

  const merged = mergeDesktopWorkspace(existing, incoming);
  runtime.localStorage?.setItem(DESKTOP_STORAGE_KEY, JSON.stringify(merged));

  return {
    canceled: false,
    pack_name: pack.pack_name || result.file_name || 'Campaign Pack',
    campaign_count: incoming.campaigns.length,
    character_count: incoming.characters.length,
    attachment_count: Object.keys(pack.attachment_urls || {}).length,
  };
}
