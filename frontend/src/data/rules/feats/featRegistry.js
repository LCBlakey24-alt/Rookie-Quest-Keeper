import {
  FEATS,
  featCategoryForEdition,
  featDescriptionForEdition,
  featNameAliases,
  getFeatsByEdition,
} from '../../levelUpData';

const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
export const canonicalFeatId = (name = '') => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const withMetadata = (feat = {}) => ({
  ...feat,
  id: feat.id || canonicalFeatId(feat.name),
  rulesets: toArray(feat.rulesets || feat.editions || ['2014', '2024']),
  source: feat.source || 'app-data',
});

export function buildFeatRegistry(feats = FEATS) {
  const registry = {};
  const entries = toArray(feats).map(withMetadata);

  // Canonical ids first, so an alias can never displace a real feat.
  entries.forEach((entry) => {
    registry[entry.id] = entry;
  });

  // Alias ids let characters saved under an older feat name still resolve.
  // Alert, Healer, Lucky and Savage Attacker each used to have a duplicate
  // "<name> (Origin)" entry for 2024; those are now one feat with a
  // per-edition category, so the old id would otherwise stop resolving.
  entries.forEach((entry) => {
    featNameAliases(entry)
      .map(canonicalFeatId)
      .filter((id) => id && !registry[id])
      .forEach((id) => {
        registry[id] = entry;
      });
  });

  return registry;
}

export const FEAT_REGISTRY = buildFeatRegistry();

export function getFeatById(featId = '') {
  return FEAT_REGISTRY[canonicalFeatId(featId)] || null;
}

/**
 * Feats legal in an edition, with that edition's category and wording applied.
 *
 * The overlay matters: a feat such as Tough is a 2014 General feat and a 2024
 * Origin feat, and callers filter and label by `category`, so the registry's
 * base value would be wrong for one of the two editions.
 */
export function getFeatsForRuleset({ edition = '2014', category = null } = {}) {
  return getFeatsByEdition(edition, category).map((feat) => {
    const entry = FEAT_REGISTRY[canonicalFeatId(feat.name)] || withMetadata(feat);
    return {
      ...entry,
      category: featCategoryForEdition(feat, edition),
      description: featDescriptionForEdition(feat, edition),
    };
  });
}
