import { GM_REFERENCE_PACK_TABLES as BASE_GM_REFERENCE_PACK_TABLES } from './gmReferenceTables';

const EDITION_LABELS = {
  '2014': '2014 Reference',
  '2024': '2024 Reference',
};

const WEAPON_MASTERY_2024 = {
  club: { damage: '1d4 Bludgeoning', properties: 'Light', mastery: 'Slow', weight: '2 lb.', cost: '1 SP' },
  dagger: { damage: '1d4 Piercing', properties: 'Finesse, Light, Thrown 20/60', mastery: 'Nick', weight: '1 lb.', cost: '2 GP' },
  greatclub: { damage: '1d8 Bludgeoning', properties: 'Two-Handed', mastery: 'Push', weight: '10 lb.', cost: '2 SP' },
  handaxe: { damage: '1d6 Slashing', properties: 'Light, Thrown 20/60', mastery: 'Vex', weight: '2 lb.', cost: '5 GP' },
  javelin: { damage: '1d6 Piercing', properties: 'Thrown 30/120', mastery: 'Slow', weight: '2 lb.', cost: '5 SP' },
  'light hammer': { damage: '1d4 Bludgeoning', properties: 'Light, Thrown 20/60', mastery: 'Nick', weight: '2 lb.', cost: '2 GP' },
  mace: { damage: '1d6 Bludgeoning', properties: '—', mastery: 'Sap', weight: '4 lb.', cost: '5 GP' },
  quarterstaff: { damage: '1d6 Bludgeoning', properties: 'Versatile 1d8', mastery: 'Topple', weight: '4 lb.', cost: '2 SP' },
  sickle: { damage: '1d4 Slashing', properties: 'Light', mastery: 'Nick', weight: '2 lb.', cost: '1 GP' },
  spear: { damage: '1d6 Piercing', properties: 'Thrown 20/60, Versatile 1d8', mastery: 'Sap', weight: '3 lb.', cost: '1 GP' },
  dart: { damage: '1d4 Piercing', properties: 'Finesse, Thrown 20/60', mastery: 'Vex', weight: '1/4 lb.', cost: '5 CP' },
  'light crossbow': { damage: '1d8 Piercing', properties: 'Ammunition 80/320, Loading, Two-Handed', mastery: 'Slow', weight: '5 lb.', cost: '25 GP' },
  shortbow: { damage: '1d6 Piercing', properties: 'Ammunition 80/320, Two-Handed', mastery: 'Vex', weight: '2 lb.', cost: '25 GP' },
  sling: { damage: '1d4 Bludgeoning', properties: 'Ammunition 30/120', mastery: 'Slow', weight: '—', cost: '1 SP' },
  battleaxe: { damage: '1d8 Slashing', properties: 'Versatile 1d10', mastery: 'Topple', weight: '4 lb.', cost: '10 GP' },
  flail: { damage: '1d8 Bludgeoning', properties: '—', mastery: 'Sap', weight: '2 lb.', cost: '10 GP' },
  glaive: { damage: '1d10 Slashing', properties: 'Heavy, Reach, Two-Handed', mastery: 'Graze', weight: '6 lb.', cost: '20 GP' },
  greataxe: { damage: '1d12 Slashing', properties: 'Heavy, Two-Handed', mastery: 'Cleave', weight: '7 lb.', cost: '30 GP' },
  greatsword: { damage: '2d6 Slashing', properties: 'Heavy, Two-Handed', mastery: 'Graze', weight: '6 lb.', cost: '50 GP' },
  halberd: { damage: '1d10 Slashing', properties: 'Heavy, Reach, Two-Handed', mastery: 'Cleave', weight: '6 lb.', cost: '20 GP' },
  lance: { damage: '1d10 Piercing', properties: 'Heavy, Reach, Two-Handed unless mounted', mastery: 'Topple', weight: '6 lb.', cost: '10 GP' },
  longsword: { damage: '1d8 Slashing', properties: 'Versatile 1d10', mastery: 'Sap', weight: '3 lb.', cost: '15 GP' },
  maul: { damage: '2d6 Bludgeoning', properties: 'Heavy, Two-Handed', mastery: 'Topple', weight: '10 lb.', cost: '10 GP' },
  morningstar: { damage: '1d8 Piercing', properties: '—', mastery: 'Sap', weight: '4 lb.', cost: '15 GP' },
  pike: { damage: '1d10 Piercing', properties: 'Heavy, Reach, Two-Handed', mastery: 'Push', weight: '18 lb.', cost: '5 GP' },
  rapier: { damage: '1d8 Piercing', properties: 'Finesse', mastery: 'Vex', weight: '2 lb.', cost: '25 GP' },
  scimitar: { damage: '1d6 Slashing', properties: 'Finesse, Light', mastery: 'Nick', weight: '3 lb.', cost: '25 GP' },
  shortsword: { damage: '1d6 Piercing', properties: 'Finesse, Light', mastery: 'Vex', weight: '2 lb.', cost: '10 GP' },
  trident: { damage: '1d8 Piercing', properties: 'Thrown 20/60, Versatile 1d10', mastery: 'Topple', weight: '4 lb.', cost: '5 GP' },
  'war pick': { damage: '1d8 Piercing', properties: 'Versatile 1d10', mastery: 'Sap', weight: '2 lb.', cost: '5 GP' },
  warhammer: { damage: '1d8 Bludgeoning', properties: 'Versatile 1d10', mastery: 'Push', weight: '5 lb.', cost: '15 GP' },
  whip: { damage: '1d4 Slashing', properties: 'Finesse, Reach', mastery: 'Slow', weight: '3 lb.', cost: '2 GP' },
  blowgun: { damage: '1 Piercing', properties: 'Ammunition 25/100, Loading', mastery: 'Vex', weight: '1 lb.', cost: '10 GP' },
  'hand crossbow': { damage: '1d6 Piercing', properties: 'Ammunition 30/120, Light, Loading', mastery: 'Vex', weight: '3 lb.', cost: '75 GP' },
  'heavy crossbow': { damage: '1d10 Piercing', properties: 'Ammunition 100/400, Heavy, Loading, Two-Handed', mastery: 'Push', weight: '18 lb.', cost: '50 GP' },
  longbow: { damage: '1d8 Piercing', properties: 'Ammunition 150/600, Heavy, Two-Handed', mastery: 'Slow', weight: '2 lb.', cost: '50 GP' },
  musket: { damage: '1d12 Piercing', properties: 'Ammunition 40/120, Loading, Two-Handed', mastery: 'Slow', weight: '10 lb.', cost: '500 GP' },
  pistol: { damage: '1d10 Piercing', properties: 'Ammunition 30/90, Loading', mastery: 'Vex', weight: '3 lb.', cost: '250 GP' },
};

const WEAPON_MASTERY_PROPERTIES_2024 = [
  ['Cleave', 'After hitting one creature with a melee attack, make one extra attack against a second creature within 5 feet of it and within your reach; once per turn.'],
  ['Graze', 'When you miss, deal damage equal to the ability modifier used for the attack.'],
  ['Nick', 'The extra attack from the Light property can be made as part of the Attack action instead of as a Bonus Action; once per turn.'],
  ['Push', 'On a hit, push a Large or smaller target up to 10 feet straight away from you.'],
  ['Sap', 'On a hit, the target has Disadvantage on its next attack roll before your next turn.'],
  ['Slow', 'On a damaging hit, reduce the target’s Speed by 10 feet until your next turn; multiple Slow hits do not stack.'],
  ['Topple', 'On a hit, force a Constitution save against 8 + your attack ability modifier + Proficiency Bonus; failure knocks the target Prone.'],
  ['Vex', 'On a damaging hit, you have Advantage on your next attack roll against that creature before the end of your next turn.'],
];

function cloneEntry(entry) {
  return {
    ...entry,
    cells: entry.cells ? { ...entry.cells } : undefined,
  };
}

function weaponKey(value) {
  return String(value || '').toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ').trim();
}

function withUseText(entry, useText) {
  const next = cloneEntry(entry);
  if (next.cells?.Use) next.cells.Use = useText;
  const parts = next.text.split(' | ');
  const useIndex = parts.findIndex(part => part.startsWith('Use:'));
  if (useIndex >= 0) {
    parts[useIndex] = `Use: ${useText}`;
    next.text = parts.join(' | ');
  }
  return next;
}

function updateCommonPotionsForEdition(table, edition) {
  if (table.name !== 'Common Potions') return table;
  return {
    ...table,
    description: edition === '2024'
      ? '2024 reference: healing potions are treated as Bonus Actions here; other potions still follow their item text or the GM ruling.'
      : '2014 reference: potions are listed as Actions. Bonus Action drinking is treated as a house rule.',
    entries: table.entries.map(entry => {
      const name = String(entry.range || '');
      const isHealingPotion = /Potion of (Greater |Superior |Supreme )?Healing/i.test(name);
      if (edition === '2014') {
        return withUseText(entry, isHealingPotion ? 'Action (Bonus Action only if house ruled)' : 'Action / item text');
      }
      if (isHealingPotion) return withUseText(entry, 'Bonus Action');
      return withUseText(entry, 'Action unless item text says otherwise');
    }),
  };
}

function updateBonusActionsForEdition(table, edition) {
  if (table.name !== 'Bonus Actions') return table;
  return {
    ...table,
    entries: table.entries.map(entry => {
      if (entry.range !== 'Drink Potion') return entry;
      return {
        ...entry,
        text: edition === '2024'
          ? 'Use: Potion of Healing can be drunk or administered as a Bonus Action; other potions follow item text or GM ruling'
          : 'Use: Optional house rule only: drinking your own potion can be a bonus action',
        cells: entry.cells ? {
          ...entry.cells,
          Use: edition === '2024'
            ? 'Potion of Healing can be drunk or administered as a Bonus Action; other potions follow item text or GM ruling'
            : 'Optional house rule only: drinking your own potion can be a bonus action',
        } : entry.cells,
      };
    }),
  };
}

function format2024WeaponText(weapon) {
  return `Damage: ${weapon.damage} | Properties: ${weapon.properties} | Mastery: ${weapon.mastery} | Weight: ${weapon.weight} | Cost: ${weapon.cost}`;
}

function updateWeaponTablesForEdition(table, edition) {
  const baseName = table.name.replace(/^\d{4}\s+—\s+/, '');
  const isWeaponTable = /weapon/i.test(baseName) && !/property|bonus/i.test(baseName);
  if (!isWeaponTable) return table;

  if (edition === '2014') {
    return {
      ...table,
      description: `${table.description} 2014 note: this table uses the older no-mastery weapon reference style.`,
    };
  }

  const entries = table.entries.map(entry => {
    const weapon = WEAPON_MASTERY_2024[weaponKey(entry.range)];
    if (!weapon) {
      return {
        ...entry,
        text: `${entry.text} | 2024 note: not part of the standard 2024 weapons table, or needs a campaign ruling.`,
      };
    }
    return {
      ...entry,
      text: format2024WeaponText(weapon),
      cells: entry.cells ? {
        ...entry.cells,
        Damage: weapon.damage.replace(/\s+(Bludgeoning|Piercing|Slashing)$/i, ''),
        'Damage Type': weapon.damage.match(/(Bludgeoning|Piercing|Slashing)$/i)?.[1] || entry.cells['Damage Type'],
        Properties: weapon.properties,
        Weight: weapon.weight,
        Cost: weapon.cost,
        Mastery: weapon.mastery,
      } : entry.cells,
    };
  });

  if (baseName === 'Martial Ranged Weapons') {
    ['musket', 'pistol'].forEach(name => {
      const weapon = WEAPON_MASTERY_2024[name];
      entries.push({
        range: name.replace(/^\w/, letter => letter.toUpperCase()),
        text: format2024WeaponText(weapon),
        cells: {
          Weapon: name.replace(/^\w/, letter => letter.toUpperCase()),
          Cost: weapon.cost,
          Damage: weapon.damage.replace(/\s+(Bludgeoning|Piercing|Slashing)$/i, ''),
          'Damage Type': weapon.damage.match(/(Bludgeoning|Piercing|Slashing)$/i)?.[1] || '',
          Weight: weapon.weight,
          Properties: weapon.properties,
          Mastery: weapon.mastery,
          Use: '2024 optional firearm weapon; only include if firearms exist in the campaign.',
        },
      });
    });
  }

  return {
    ...table,
    description: `${table.description} 2024 note: this table includes the 2024 Mastery property for each standard weapon. A character still needs a feature such as Weapon Mastery to use it.`,
    entries,
  };
}

function updateCastSpellActionForEdition(table, edition) {
  if (table.name !== 'Basic Actions In Combat') return table;
  return {
    ...table,
    entries: table.entries.map(entry => {
      if (entry.range !== 'Cast a Spell') return entry;
      return {
        ...entry,
        range: edition === '2024' ? 'Magic / Cast a Spell' : entry.range,
        text: edition === '2024'
          ? 'Use: Use the Magic action or cast a spell with a casting time of 1 action, depending on the rule text'
          : entry.text,
        cells: entry.cells ? {
          ...entry.cells,
          Action: edition === '2024' ? 'Magic / Cast a Spell' : entry.cells.Action,
          Use: edition === '2024' ? 'Use the Magic action or cast a spell with a casting time of 1 action, depending on the rule text' : entry.cells.Use,
        } : entry.cells,
      };
    }),
  };
}

function applyEditionOverrides(table, edition) {
  let next = {
    ...table,
    entries: table.entries.map(cloneEntry),
    edition,
    editionLabel: EDITION_LABELS[edition],
    source: `gm-reference-pack-${edition}`,
    id: `gm-ref-${edition}-${table.id.replace(/^gm-ref-/, '')}`,
    name: `${edition} — ${table.name}`,
    description: `${EDITION_LABELS[edition]}: ${table.description}`,
  };
  next = updateCommonPotionsForEdition(next, edition);
  next = updateBonusActionsForEdition(next, edition);
  next = updateWeaponTablesForEdition(next, edition);
  next = updateCastSpellActionForEdition(next, edition);
  return next;
}

const MASTERY_PROPERTIES_TABLE_2024 = {
  id: 'gm-ref-2024-weapon-mastery-properties',
  name: '2024 — Weapon Mastery Properties',
  category: 'weapons',
  description: '2024 Reference: quick lookup for the mastery properties used by the 2024 weapon tables. Use only when a character has a feature that unlocks Weapon Mastery.',
  die: 'reference',
  rollable: false,
  locked: true,
  source: 'gm-reference-pack-2024',
  edition: '2024',
  editionLabel: EDITION_LABELS['2024'],
  columns: ['Mastery', 'Meaning'],
  entries: WEAPON_MASTERY_PROPERTIES_2024.map(([mastery, meaning]) => ({
    range: mastery,
    text: `Meaning: ${meaning}`,
    cells: { Mastery: mastery, Meaning: meaning },
  })),
};

export const GM_REFERENCE_PACK_TABLES_2014 = BASE_GM_REFERENCE_PACK_TABLES.map(table => applyEditionOverrides(table, '2014'));
export const GM_REFERENCE_PACK_TABLES_2024 = [
  ...BASE_GM_REFERENCE_PACK_TABLES.map(table => applyEditionOverrides(table, '2024')),
  MASTERY_PROPERTIES_TABLE_2024,
];
export const GM_REFERENCE_PACK_TABLES_BY_EDITION = [
  ...GM_REFERENCE_PACK_TABLES_2014,
  ...GM_REFERENCE_PACK_TABLES_2024,
];

export default GM_REFERENCE_PACK_TABLES_BY_EDITION;
