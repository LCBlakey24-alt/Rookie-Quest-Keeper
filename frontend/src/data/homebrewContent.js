export const HOMEBREW_VISIBILITY = Object.freeze({
  private: 'private',
  campaign: 'campaign',
  sharedCopy: 'shared_copy',
  public: 'public',
});

export const HOMEBREW_CONTENT_TYPES = Object.freeze({
  subclass: 'subclass',
  class: 'class',
  race: 'race',
  spell: 'spell',
  feat: 'feat',
  background: 'background',
  magicItem: 'magic_item',
  monster: 'monster',
  npc: 'npc',
  customRule: 'custom_rule',
});

function normalizeKey(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function normalizeContentType(value = '') {
  const key = normalizeKey(value);
  if (key === 'species' || key === 'ancestry' || key === 'origin') return HOMEBREW_CONTENT_TYPES.race;
  if (key === 'item' || key === 'magicitem') return HOMEBREW_CONTENT_TYPES.magicItem;
  if (key === 'customrule' || key === 'rule') return HOMEBREW_CONTENT_TYPES.customRule;
  return key;
}

function normalizeRuleset(value = '2014') {
  return String(value || '').includes('2024') ? '2024' : '2014';
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstText(...values) {
  return values.find(value => String(value || '').trim().length > 0) || '';
}

export function normalizeHomebrewContent(content = {}) {
  const contentType = normalizeContentType(content.contentType || content.content_type || content.type);
  const name = String(content.name || '').trim();
  const baseClass = String(content.baseClass || content.base_class || content.parent_class || content.className || content.class || '').trim();
  const visibility = Object.values(HOMEBREW_VISIBILITY).includes(content.visibility)
    ? content.visibility
    : HOMEBREW_VISIBILITY.private;
  const ownerUserId = content.ownerUserId || content.owner_user_id || content.userId || content.user_id || content.createdByUserId || null;
  const createdByUserId = content.createdByUserId || content.created_by_user_id || ownerUserId;

  return {
    ...content,
    id: content.id || `${contentType || 'homebrew'}-${normalizeKey(name) || 'unnamed'}`,
    contentType,
    content_type: contentType,
    name,
    baseClass,
    baseClassKey: normalizeKey(baseClass),
    ruleset: normalizeRuleset(content.ruleset || content.edition || content.rules_edition),
    visibility,
    sourceType: content.sourceType || content.source_type || 'user_homebrew',
    source_type: content.source_type || content.sourceType || 'user_homebrew',
    license: content.license || 'user_provided_private_use',
    ownerUserId,
    createdByUserId,
    sharePolicy: {
      allowPrivateShare: content.sharePolicy?.allowPrivateShare ?? content.share_policy?.allowPrivateShare ?? true,
      allowCampaignUse: content.sharePolicy?.allowCampaignUse ?? content.share_policy?.allowCampaignUse ?? true,
      allowPublicListing: content.sharePolicy?.allowPublicListing ?? content.share_policy?.allowPublicListing ?? false,
      ...(content.sharePolicy || content.share_policy || {}),
    },
    resources: asArray(content.resources),
    actions: asArray(content.actions),
    passive_effects: asArray(content.passive_effects),
    scaling: asArray(content.scaling),
    upgrades: asArray(content.upgrades),
    provenance: asArray(content.provenance),
  };
}

export function filterHomebrewContent(contents = [], { contentType, baseClass, ruleset, ownerUserId, campaignId, includePublic = false } = {}) {
  const typeKey = contentType ? normalizeContentType(contentType) : '';
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
      if (campaignId && (content.campaignId === campaignId || content.campaign_id === campaignId) && content.visibility === HOMEBREW_VISIBILITY.campaign) return true;
      return false;
    });
}

export function getHomebrewContentOptions(contents = [], { contentType, baseClass, ruleset, ownerUserId, campaignId } = {}) {
  return filterHomebrewContent(contents, {
    contentType,
    baseClass,
    ruleset,
    ownerUserId,
    campaignId,
  }).map(content => ({
    value: content.name,
    label: content.name,
    key: content.id,
    summary: content.summary || content.description || `User-provided ${content.contentType || 'homebrew'} content.`,
    ruleset: content.ruleset,
    custom: true,
    homebrew: true,
    supportedAutomation: Boolean(content.features?.length || content.resources?.length || content.actions?.length || content.passive_effects?.length),
    visibility: content.visibility,
    ownerUserId: content.ownerUserId,
    originContentId: content.originContentId || content.origin_content_id || null,
    contentType: content.contentType,
    source: 'Homebrew',
    raw: content,
  }));
}

export function getHomebrewSubclassOptions(contents = [], { baseClass, ruleset, ownerUserId, campaignId } = {}) {
  return getHomebrewContentOptions(contents, {
    contentType: HOMEBREW_CONTENT_TYPES.subclass,
    baseClass,
    ruleset,
    ownerUserId,
    campaignId,
  });
}

export function extractHomebrewCollection(responseOrData = {}, contentType = '') {
  const data = responseOrData?.data || responseOrData;
  const homebrew = data?.homebrew || data || {};
  const typeKey = contentType ? normalizeContentType(contentType) : '';

  if (Array.isArray(homebrew)) return homebrew.map(normalizeHomebrewContent);
  if (typeKey && Array.isArray(homebrew[typeKey])) return homebrew[typeKey].map(normalizeHomebrewContent);

  return Object.values(homebrew)
    .flatMap(value => asArray(value))
    .map(normalizeHomebrewContent);
}

export function mergeOfficialAndHomebrewOptions(officialOptions = [], homebrewOptions = []) {
  const seen = new Set();
  const official = asArray(officialOptions).map(option => {
    const value = typeof option === 'string' ? option : option?.value || option?.name || option?.label || '';
    const label = typeof option === 'string' ? option : option?.label || option?.name || option?.value || value;
    seen.add(normalizeKey(value || label));
    return typeof option === 'string'
      ? { value, label, source: 'Official' }
      : { ...option, value, label, source: option?.source || 'Official' };
  });

  const custom = asArray(homebrewOptions)
    .filter(option => {
      const key = normalizeKey(option?.value || option?.label || option?.name);
      return key && !seen.has(key);
    })
    .map(option => ({
      ...option,
      label: option.homebrew ? `${option.label || option.value} (Homebrew)` : option.label || option.value,
      source: option.source || 'Homebrew',
    }));

  return [...official, ...custom];
}

export function buildHomebrewFeatureEntries(content = {}, { characterLevel = 1, fallbackType = 'passive' } = {}) {
  const normalized = normalizeHomebrewContent(content);
  const level = Number(characterLevel || 1);

  return asArray(normalized.features)
    .map((feature, index) => {
      const featureLevel = Number(feature?.level || feature?.subclass_level || normalized.subclass_level || normalized.level || 1);
      return {
        ...feature,
        name: firstText(feature?.name, feature?.title, `${normalized.name} Feature ${index + 1}`),
        description: firstText(feature?.description, feature?.text, feature?.rules, normalized.description, 'Homebrew feature saved from the Homebrew Workshop.'),
        level: featureLevel,
        type: feature?.type || feature?.action_type || fallbackType,
        source: 'homebrew',
        homebrew: true,
        homebrewContentId: normalized.id,
        homebrewContentName: normalized.name,
        homebrewContentType: normalized.contentType,
        visibility: normalized.visibility,
      };
    })
    .filter(feature => !feature.level || feature.level <= level);
}

export function buildHomebrewSelectionReference(content = {}) {
  const normalized = normalizeHomebrewContent(content);
  return {
    id: normalized.id,
    name: normalized.name,
    contentType: normalized.contentType,
    source: 'Homebrew Workshop',
    ruleset: normalized.ruleset,
    visibility: normalized.visibility,
    ownerUserId: normalized.ownerUserId,
  };
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
  const originContentId = normalized.originContentId || normalized.origin_content_id || normalized.id;

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
