/**
 * Homebrew items: one simple draft shape for the builder, and the
 * inventory item the character sheet reads.
 *
 * The builder edits a draft (kind, dice, AC, defences...). toSheetItem()
 * turns it into the field names the sheet already understands
 * (damage, damage_type, attack_ability, attack_bonus, armor_category,
 * base_ac, magic_ac_bonus ...), so the preview and the real sheet use the
 * same derivation code.
 */

export const ITEM_KINDS = [
  { id: 'weapon', label: 'Weapon', help: 'Swords, bows, axes. Rolls to hit and damage.' },
  { id: 'armour', label: 'Armour', help: 'Worn armour that sets your AC.' },
  { id: 'shield', label: 'Shield', help: 'Held in the off hand. Adds to AC.' },
  { id: 'wearable', label: 'Wearable', help: 'Rings, cloaks, boots, amulets.' },
  { id: 'consumable', label: 'Consumable', help: 'Potions, scrolls, bombs. Used up.' },
  { id: 'gear', label: 'Gear', help: 'Tools and anything else.' },
];

export const DAMAGE_TYPES = [
  'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic',
  'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder',
];

export const CONDITIONS = [
  'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened', 'grappled',
  'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned',
  'prone', 'restrained', 'stunned', 'unconscious',
];

export const WEAPON_PROPERTIES = [
  { id: 'finesse', label: 'Finesse', help: 'Uses Strength or Dexterity, whichever is higher.' },
  { id: 'light', label: 'Light', help: 'Good for fighting with two weapons.' },
  { id: 'heavy', label: 'Heavy', help: 'Small creatures attack with disadvantage.' },
  { id: 'two-handed', label: 'Two-handed', help: 'Needs both hands.' },
  { id: 'versatile', label: 'Versatile', help: 'Bigger damage die when held in two hands.' },
  { id: 'thrown', label: 'Thrown', help: 'Can be thrown for a ranged attack.' },
  { id: 'reach', label: 'Reach', help: 'Adds 5 ft. to your melee reach.' },
  { id: 'ammunition', label: 'Ammunition', help: 'Needs arrows, bolts or similar.' },
  { id: 'loading', label: 'Loading', help: 'One shot per action.' },
];

export const DIE_SIZES = [4, 6, 8, 10, 12, 20];
export const RARITIES = ['mundane', 'common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'];

export const ARMOUR_TYPES = [
  { id: 'light', label: 'Light', baseAc: 11, help: 'Adds your full Dexterity modifier.' },
  { id: 'medium', label: 'Medium', baseAc: 13, help: 'Adds Dexterity, up to +2.' },
  { id: 'heavy', label: 'Heavy', baseAc: 16, help: 'No Dexterity bonus.' },
];

export const ABILITIES = [
  { id: 'strength', label: 'STR' }, { id: 'dexterity', label: 'DEX' }, { id: 'constitution', label: 'CON' },
  { id: 'intelligence', label: 'INT' }, { id: 'wisdom', label: 'WIS' }, { id: 'charisma', label: 'CHA' },
];

export function emptyItemDraft(kind = 'weapon') {
  return {
    kind,
    name: '',
    rarity: 'common',
    requires_attunement: false,
    attunement_requirement: '',
    description: '',
    weight: '',
    cost: '',
    image_url: '',
    weapon: {
      category: 'martial',
      reach: 'melee',
      dice_count: 1,
      dice_sides: 8,
      damage_type: 'slashing',
      properties: [],
      versatile_sides: 10,
      range_normal: '',
      range_long: '',
      magic_bonus: 0,
      extra_damage: [],
    },
    armour: { armour_type: 'medium', base_ac: 14, magic_bonus: 0, stealth_disadvantage: false, strength_requirement: '' },
    shield: { ac_bonus: 2, magic_bonus: 0 },
    bonuses: { ac: 0, saves: 0, abilities: {} },
    defences: { resistances: [], immunities: [], vulnerabilities: [], condition_immunities: [] },
    charges: { max: 0, recharge: '' },
  };
}

const int = (value, fallback = 0) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const signed = n => (n >= 0 ? `+${n}` : `${n}`);
const list = value => (Array.isArray(value) ? value.filter(Boolean) : []);

/** Fill any missing parts so older saved items still open in the builder. */
export function inferItemKind(value = {}) {
  if (ITEM_KINDS.some(k => k.id === value.kind)) return value.kind;
  const text = `${value.type || ''} ${value.item_type || ''}`.toLowerCase();
  if (/shield/.test(text)) return 'shield';
  if (/armou?r/.test(text)) return 'armour';
  if (/weapon/.test(text)) return 'weapon';
  if (/potion|scroll|consumable|ammunition/.test(text)) return 'consumable';
  if (/tool|gear/.test(text)) return 'gear';
  // Older saved magic items were mostly wondrous items: rings, cloaks...
  return value.name || value.type ? 'wearable' : 'weapon';
}

export function normaliseItemDraft(value = {}) {
  const base = emptyItemDraft(inferItemKind(value));
  return {
    ...base,
    ...value,
    kind: base.kind,
    weapon: { ...base.weapon, ...(value.weapon || {}) },
    armour: { ...base.armour, ...(value.armour || {}) },
    shield: { ...base.shield, ...(value.shield || {}) },
    bonuses: { ...base.bonuses, ...(value.bonuses || {}), abilities: { ...(value.bonuses?.abilities || {}) } },
    defences: { ...base.defences, ...(value.defences || {}) },
    charges: { ...base.charges, ...(value.charges || {}) },
  };
}

export function weaponDice(weapon = {}) {
  return `${clamp(int(weapon.dice_count, 1), 1, 20)}d${int(weapon.dice_sides, 8)}`;
}

/** "Melee", "Ranged (80/320 ft.)", "Melee or thrown (20/60 ft.)" */
export function weaponRangeText(weapon = {}) {
  const props = list(weapon.properties);
  const near = int(weapon.range_normal, 0);
  const far = int(weapon.range_long, 0);
  const span = near ? ` (${near}${far ? `/${far}` : ''} ft.)` : '';
  if (weapon.reach === 'ranged') return `Ranged${span}`;
  if (props.includes('thrown')) return `Melee or thrown${span}`;
  return props.includes('reach') ? 'Melee (reach 10 ft.)' : 'Melee';
}

export function weaponAttackAbility(weapon = {}) {
  if (list(weapon.properties).includes('finesse')) return 'finesse';
  return weapon.reach === 'ranged' ? 'dexterity' : 'strength';
}

function cleanExtraDamage(extra) {
  return list(extra)
    .map(row => ({ dice: String(row?.dice || '').trim(), type: String(row?.type || '').trim() }))
    .filter(row => /^\d+d\d+(\s*[+-]\s*\d+)?$/i.test(row.dice));
}

function kindToType(kind) {
  return { weapon: 'Weapon', armour: 'Armor', shield: 'Shield', wearable: 'Wondrous Item', consumable: 'Consumable', gear: 'Gear' }[kind] || 'Gear';
}

/**
 * The inventory item the sheet stores and reads. Field names match the
 * existing sheet derivations so a homebrew item behaves like any other.
 */
export function toSheetItem(rawDraft, { homebrewId = '' } = {}) {
  const draft = normaliseItemDraft(rawDraft);
  const defences = draft.defences;
  const abilityBonuses = Object.fromEntries(Object.entries(draft.bonuses.abilities || {})
    .map(([key, value]) => [key, int(value, 0)]).filter(([, value]) => value));
  const item = {
    name: String(draft.name || '').trim() || 'Unnamed item',
    type: kindToType(draft.kind),
    item_type: draft.kind,
    homebrew_kind: draft.kind,
    source: 'homebrew',
    ...(homebrewId ? { homebrew_id: homebrewId } : {}),
    rarity: draft.rarity,
    description: draft.description || '',
    requires_attunement: Boolean(draft.requires_attunement),
    attunement_required: Boolean(draft.requires_attunement),
    ...(draft.attunement_requirement ? { attunement_requirement: draft.attunement_requirement } : {}),
    weight: draft.weight === '' ? undefined : Number(draft.weight) || 0,
    cost: draft.cost || undefined,
    quantity: 1,
    damage_resistances: list(defences.resistances),
    damage_immunities: list(defences.immunities),
    damage_vulnerabilities: list(defences.vulnerabilities),
    condition_immunities: list(defences.condition_immunities),
    save_bonus: int(draft.bonuses.saves, 0),
    ability_bonuses: abilityBonuses,
  };
  if (draft.image_url) item.image_url = draft.image_url;
  const charges = int(draft.charges.max, 0);
  if (charges > 0) {
    item.charges = charges;
    item.charges_max = charges;
    if (draft.charges.recharge) item.charges_recharge = draft.charges.recharge;
  }

  if (draft.kind === 'weapon') {
    const w = draft.weapon;
    const props = list(w.properties);
    const magic = clamp(int(w.magic_bonus, 0), -5, 5);
    item.damage = weaponDice(w);
    item.damage_dice = item.damage;
    item.damage_type = w.damage_type || 'slashing';
    item.attack_ability = weaponAttackAbility(w);
    item.attack_bonus = magic;
    item.magic_attack_bonus = magic;
    item.weapon_category = `${w.category === 'simple' ? 'simple' : 'martial'}_${w.reach === 'ranged' ? 'ranged' : 'melee'}`;
    item.range = weaponRangeText(w);
    item.properties = props.map(p => (p === 'versatile' ? `versatile d${int(w.versatile_sides, 10)}` : p));
    if (props.includes('versatile')) item.versatile_damage = `${clamp(int(w.dice_count, 1), 1, 20)}d${int(w.versatile_sides, 10)}`;
    const extra = cleanExtraDamage(w.extra_damage);
    if (extra.length) item.extra_damage = extra;
  }
  if (draft.kind === 'armour') {
    const a = draft.armour;
    item.armor_category = ['light', 'medium', 'heavy'].includes(a.armour_type) ? a.armour_type : 'medium';
    item.base_ac = clamp(int(a.base_ac, 10), 0, 30);
    item.magic_ac_bonus = clamp(int(a.magic_bonus, 0), -5, 5);
    item.stealth_disadvantage = Boolean(a.stealth_disadvantage);
    if (int(a.strength_requirement, 0)) item.strength_requirement = int(a.strength_requirement, 0);
  }
  if (draft.kind === 'shield') {
    item.armor_category = 'shield';
    item.shield_ac = clamp(int(draft.shield.ac_bonus, 2), 0, 10);
    item.magic_ac_bonus = clamp(int(draft.shield.magic_bonus, 0), -5, 5);
  }
  if (draft.kind === 'wearable' || draft.kind === 'gear' || draft.kind === 'consumable') {
    const ac = int(draft.bonuses.ac, 0);
    if (ac) item.ac_bonus = ac;
  }
  Object.keys(item).forEach(key => item[key] === undefined && delete item[key]);
  return item;
}

/** Plain-English lines for everything the item changes on the sheet. */
export function sheetEffectLines(item = {}) {
  const lines = [];
  const join = values => values.join(', ');
  if (list(item.damage_resistances).length) lines.push(`Resistant to ${join(item.damage_resistances)} damage`);
  if (list(item.damage_immunities).length) lines.push(`Immune to ${join(item.damage_immunities)} damage`);
  if (list(item.damage_vulnerabilities).length) lines.push(`Vulnerable to ${join(item.damage_vulnerabilities)} damage`);
  if (list(item.condition_immunities).length) lines.push(`Can't be ${join(item.condition_immunities)}`);
  if (item.save_bonus) lines.push(`${signed(item.save_bonus)} to all saving throws`);
  Object.entries(item.ability_bonuses || {}).forEach(([key, value]) => {
    const label = ABILITIES.find(a => a.id === key)?.label || key;
    lines.push(`${signed(value)} ${label}`);
  });
  if (item.ac_bonus) lines.push(`${signed(item.ac_bonus)} AC while worn`);
  if (item.stealth_disadvantage) lines.push('Disadvantage on Stealth checks');
  if (item.strength_requirement) lines.push(`Needs Strength ${item.strength_requirement}`);
  if (item.charges_max) lines.push(`${item.charges_max} charges${item.charges_recharge ? ` · regains ${item.charges_recharge}` : ''}`);
  if (item.requires_attunement) lines.push(`Requires attunement${item.attunement_requirement ? ` ${item.attunement_requirement}` : ''}`);
  return lines;
}

/** Things that would confuse the sheet. Shown next to the field, not as errors on save. */
export function itemDraftWarnings(rawDraft) {
  const draft = normaliseItemDraft(rawDraft);
  const warnings = [];
  if (!String(draft.name || '').trim()) warnings.push({ field: 'name', text: 'Give it a name so you can find it on the sheet.' });
  if (draft.kind === 'weapon') {
    const props = list(draft.weapon.properties);
    if (props.includes('two-handed') && props.includes('versatile')) warnings.push({ field: 'properties', text: 'Two-handed and versatile do not go together: a versatile weapon can be used in one hand.' });
    if (props.includes('light') && props.includes('heavy')) warnings.push({ field: 'properties', text: 'A weapon cannot be both light and heavy.' });
    if (draft.weapon.reach === 'ranged' && !int(draft.weapon.range_normal, 0)) warnings.push({ field: 'range', text: 'Add a range for a ranged weapon, e.g. 80/320.' });
    if (Math.abs(int(draft.weapon.magic_bonus, 0)) > 3) warnings.push({ field: 'magic_bonus', text: 'Bonuses above +3 are much stronger than published items.' });
  }
  const { resistances, immunities } = draft.defences;
  const both = list(resistances).filter(type => list(immunities).includes(type));
  if (both.length) warnings.push({ field: 'defences', text: `${both.join(', ')}: immunity already covers resistance.` });
  return warnings;
}

/* ----------------------------------------------------------------------- */
/* On the character                                                        */
/* ----------------------------------------------------------------------- */

const newItemId = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
  ? `homebrew-${crypto.randomUUID()}`
  : `homebrew-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

/** A fresh inventory copy of a saved homebrew item (its own id each time). */
export function inventoryItemFromHomebrew(doc = {}) {
  const base = doc.sheet_item && typeof doc.sheet_item === 'object' ? doc.sheet_item : toSheetItem(doc, { homebrewId: doc.id });
  const item = { ...base, id: newItemId(), homebrew_id: doc.id || base.homebrew_id || '', equipped: false, attuned: false };
  if (item.charges_max) item.charges = item.charges_max;
  return item;
}

/** One short line for a picker: "1d8+1 slashing + 1d6 fire · Resistant to fire". */
export function homebrewItemSummary(doc = {}) {
  const item = doc.sheet_item || toSheetItem(doc);
  const parts = [];
  if (item.damage) {
    const magic = Number(item.attack_bonus) || 0;
    parts.push(`${item.damage}${magic ? `${magic > 0 ? '+' : ''}${magic}` : ''} ${item.damage_type || ''}`.trim()
      + (Array.isArray(item.extra_damage) ? item.extra_damage.map(row => ` + ${row.dice} ${row.type}`).join('') : ''));
  }
  if (item.base_ac) parts.push(`AC ${item.base_ac}${item.magic_ac_bonus ? ` +${item.magic_ac_bonus}` : ''} (${item.armor_category})`);
  if (item.shield_ac !== undefined) parts.push(`+${Number(item.shield_ac) + (Number(item.magic_ac_bonus) || 0)} AC`);
  parts.push(...sheetEffectLines(item).slice(0, 2));
  return parts.filter(Boolean).join(' · ');
}

/** Is this carried item doing anything right now? */
export function itemIsActive(item, equipped = {}) {
  if (!item || typeof item !== 'object') return false;
  const id = item.id || item.item_id;
  const inSlot = Object.values(equipped || {}).some(worn => worn && typeof worn === 'object' && (worn === item || (id && (worn.id || worn.item_id) === id)));
  const needsAttunement = Boolean(item.requires_attunement || item.attunement_required);
  const attuned = Boolean(item.attuned || item.is_attuned);
  if (needsAttunement) return attuned;
  return inSlot || Boolean(item.worn || item.equipped || item.is_equipped);
}

const unique = values => [...new Set(values.map(v => String(v).toLowerCase()))];

/** Defences from every active item, with the items that give them. */
export function activeItemDefences(character = {}) {
  const equipped = character.equipped || {};
  const pool = [...(Array.isArray(character.inventory) ? character.inventory : []), ...Object.values(equipped)]
    .filter(item => item && typeof item === 'object');
  const seen = new Set();
  const active = pool.filter(item => {
    const key = item.id || item.item_id || item.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return itemIsActive(item, equipped);
  });
  const gather = field => unique(active.flatMap(item => list(item[field])));
  const out = {
    resistances: gather('damage_resistances'),
    immunities: gather('damage_immunities'),
    vulnerabilities: gather('damage_vulnerabilities'),
    conditionImmunities: gather('condition_immunities'),
    saveBonus: active.reduce((sum, item) => sum + (Number(item.save_bonus) || 0), 0),
    sources: active.filter(item => ['damage_resistances', 'damage_immunities', 'damage_vulnerabilities', 'condition_immunities']
      .some(field => list(item[field]).length) || Number(item.save_bonus)).map(item => item.name),
  };
  // Immunity covers resistance to the same type.
  out.resistances = out.resistances.filter(type => !out.immunities.includes(type));
  out.any = Boolean(out.resistances.length || out.immunities.length || out.vulnerabilities.length || out.conditionImmunities.length || out.saveBonus);
  return out;
}
