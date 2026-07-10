import { FEATS, getFeatsByEdition } from '../../levelUpData';

const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
export const canonicalFeatId = (name = '') => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const withMetadata = (feat = {}) => ({
  ...feat,
  id: feat.id || canonicalFeatId(feat.name),
  rulesets: toArray(feat.rulesets || feat.editions || ['2014', '2024']),
  source: feat.source || 'app-data',
});

export function buildFeatRegistry(feats = FEATS) {
  return Object.fromEntries(toArray(feats).map(feat => {
    const entry = withMetadata(feat);
    return [entry.id, entry];
  }));
}

export const FEAT_REGISTRY = buildFeatRegistry();

export function getFeatById(featId = '') {
  return FEAT_REGISTRY[canonicalFeatId(featId)] || null;
}

export function getFeatsForRuleset({ edition = '2014', category = null } = {}) {
  return getFeatsByEdition(edition, category).map(feat => FEAT_REGISTRY[canonicalFeatId(feat.name)] || withMetadata(feat));
}
