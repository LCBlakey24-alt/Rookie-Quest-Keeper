export const HOMEBREW_VISIBILITY = Object.freeze({
  private: 'private',
  campaign: 'campaign',
  sharedCopy: 'shared_copy',
  public: 'public',
});

export const HOMEBREW_CONTENT_TYPES = Object.freeze({
  subclass: 'subclass',
  monster: 'monster',
  spell: 'spell',
  feat: 'feat',
  item: 'item',
});

function normalizeKey(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function normalizeRuleset(value = '2014') {
  return String(value || '').includes('2024') ? '2024' : '2014';
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeHomebrewContent(content = {}) {
  const contentType = normalizeKey(content.contentType || content.type);
  const name = String(content.name || '').trim();
  const baseClass = String(content.baseClass || content.className || content.class || '').trim();
  const visibility = Object.values(HOMEBREW_VISIBILITY).includes(content.visibility)
    ? content.visibility
    : HOMEBREW_VISIBILITY.private;
  const ownerUserId = content.ownerUserId || content.userId || content.createdByUserId || null;
  const createdByUserId = content.createdByUserId || ownerUserId;

  return {
    ...content,
    id: content.id || `${contentType || 'homebrew'}-${normalizeKey(name) || 'unnamed'}`,
    contentType,
    name,
    baseClass,
    baseClassKey: normalizeKey(baseClass),
    ruleset: normalizeRuleset(content.ruleset || content.edition || content.rules_edition),
    visibility,
    sourceType: content.sourceType || 'user_homebrew',
    license: content.license || 'user_provided_private_use',
    ownerUserId,
    createdByUserId,
    sharePolicy: {
      allowPrivateShare: content.sharePolicy?.allowPrivateShare !== false,
      allowCampaignUse: content.sharePolicy?.allowCampaignUse !== false,
      allowPublicListing: content.sharePolicy?.allowPublicListing === true,
      ...(content.sharePolicy || {}),
    },
    provenance: asArray(content.provenance),
  };
}

export function filterHomebrewContent(contents = [], { contentType, baseClass, ruleset, ownerUserId, campaignId, includePublic = false } = {}) {
  const typeKey = contentType ? normalizeKey(contentType) : '';
  const classKey = baseClass ? normalizeKey(baseClass) : '';
  const normalizedRuleset = ruleset ? normalizeRuleset(ruleset) : '';

  return asArray(contents)
    .map(normalizeHomebrewContent)
    .filter(content => !typeKey || content.contentType === typeKey)
    .filter(content => !classKey || content.baseClassKey === classKey)
    .filter(content => !normalizedRuleset || content.ruleset === normalizedRuleset)
    .filter(content => {
      if (includePublic && content.visibility === HOMEBREW_VISIBILITY.public) return true;
      if (ownerUserId && content.ownerUserId === ownerUserId) return true;
      if (campaignId && content.campaignId === campaignId && content.visibility === HOMEBREW_VISIBILITY.campaign) return true;
      return false;
    });
}

export function getHomebrewSubclassOptions(contents = [], { baseClass, ruleset, ownerUserId, campaignId } = {}) {
  return filterHomebrewContent(contents, {
    contentType: HOMEBREW_CONTENT_TYPES.subclass,
    baseClass,
    ruleset,
    ownerUserId,
    campaignId,
  }).map(content => ({
    value: content.name,
    label: content.name,
    key: content.id,
    summary: content.summary || content.description || 'User-provided subclass content.',
    ruleset: content.ruleset,
    custom: true,
    homebrew: true,
    supportedAutomation: Boolean(content.features?.length),
    visibility: content.visibility,
    ownerUserId: content.ownerUserId,
    originContentId: content.originContentId || null,
  }));
}

export function canShareHomebrewContent(content = {}, shareTarget = 'private') {
  const normalized = normalizeHomebrewContent(content);
  if (shareTarget === 'campaign') return normalized.sharePolicy.allowCampaignUse;
  if (shareTarget === 'public') return normalized.sharePolicy.allowPublicListing;
  return normalized.sharePolicy.allowPrivateShare;
}

export function createSharedHomebrewCopy(content = {}, { recipientUserId, sharedFromUserId, targetVisibility = HOMEBREW_VISIBILITY.sharedCopy } = {}) {
  const normalized = normalizeHomebrewContent(content);
  const ownerUserId = recipientUserId || normalized.ownerUserId;
  const senderUserId = sharedFromUserId || normalized.ownerUserId;
  const originContentId = normalized.originContentId || normalized.id;

  return normalizeHomebrewContent({
    ...normalized,
    id: `${normalized.id}-copy-${normalizeKey(ownerUserId || 'recipient')}`,
    visibility: targetVisibility,
    ownerUserId,
    createdByUserId: normalized.createdByUserId,
    originContentId,
    parentContentId: normalized.id,
    sharedFromUserId: senderUserId,
    provenance: [
      ...normalized.provenance,
      { userId: senderUserId, action: 'shared_to', target: ownerUserId },
      { userId: ownerUserId, action: 'accepted_copy' },
    ],
  });
}
