// Shared armour rules for character sheet and equipment handling.
// Basic/SRD-compatible data only.

export const ARMOR_RULES = {
  Padded: { category: 'light', baseAc: 11, dex: 'full', stealthDisadvantage: true, weight: 8 },
  Leather: { category: 'light', baseAc: 11, dex: 'full', stealthDisadvantage: false, weight: 10 },
  StuddedLeather: { name: 'Studded Leather', category: 'light', baseAc: 12, dex: 'full', stealthDisadvantage: false, weight: 13 },

  Hide: { category: 'medium', baseAc: 12, dex: 'max2', stealthDisadvantage: false, weight: 12 },
  ChainShirt: { name: 'Chain Shirt', category: 'medium', baseAc: 13, dex: 'max2', stealthDisadvantage: false, weight: 20 },
  ScaleMail: { name: 'Scale Mail', category: 'medium', baseAc: 14, dex: 'max2', stealthDisadvantage: true, weight: 45 },
  Breastplate: { category: 'medium', baseAc: 14, dex: 'max2', stealthDisadvantage: false, weight: 20 },
  HalfPlate: { name: 'Half Plate', category: 'medium', baseAc: 15, dex: 'max2', stealthDisadvantage: true, weight: 40 },

  RingMail: { name: 'Ring Mail', category: 'heavy', baseAc: 14, dex: 'none', stealthDisadvantage: true, weight: 40 },
  ChainMail: { name: 'Chain Mail', category: 'heavy', baseAc: 16, dex: 'none', stealthDisadvantage: true, strengthRequired: 13, weight: 55 },
  Splint: { category: 'heavy', baseAc: 17, dex: 'none', stealthDisadvantage: true, strengthRequired: 15, weight: 60 },
  Plate: { category: 'heavy', baseAc: 18, dex: 'none', stealthDisadvantage: true, strengthRequired: 15, weight: 65 },

  Shield: { category: 'shield', acBonus: 2, weight: 6 },
};

export function normaliseArmorName(name = '') {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function findArmorRule(itemOrName) {
  const rawName = typeof itemOrName === 'string'
    ? itemOrName
    : itemOrName?.name || itemOrName?.item_name || itemOrName?.label || itemOrName?.title || '';
  const normalised = normaliseArmorName(rawName);
  const entries = Object.entries(ARMOR_RULES);
  const exact = entries.find(([key, value]) => normaliseArmorName(value.name || key) === normalised);
  if (exact) return { key: exact[0], ...exact[1], name: exact[1].name || exact[0] };
  const fuzzy = entries.find(([key, value]) => normalised.includes(normaliseArmorName(value.name || key)));
  if (fuzzy) return { key: fuzzy[0], ...fuzzy[1], name: fuzzy[1].name || fuzzy[0] };
  return null;
}

export function calculateArmorAc({ armor, shield, dexMod = 0, unarmoredAc = 10 }) {
  const armorRule = findArmorRule(armor);
  const shieldRule = findArmorRule(shield);
  let ac = Number(unarmoredAc) || 10;

  if (armorRule?.category === 'light') ac = armorRule.baseAc + dexMod;
  else if (armorRule?.category === 'medium') ac = armorRule.baseAc + Math.min(2, dexMod);
  else if (armorRule?.category === 'heavy') ac = armorRule.baseAc;

  if (shieldRule?.category === 'shield') ac += shieldRule.acBonus || 2;
  return ac;
}
