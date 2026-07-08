import { GM_REFERENCE_PACK_TABLES as BASE_GM_REFERENCE_PACK_TABLES } from './gmReferenceTables';

const EDITION_LABELS = {
  '2014': '2014 Reference',
  '2024': '2024 Reference',
};

function cloneEntry(entry) {
  return {
    ...entry,
    cells: entry.cells ? { ...entry.cells } : undefined,
  };
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

function updateWeaponTablesForEdition(table, edition) {
  const isWeaponTable = /weapon/i.test(table.name) && !/property|bonus/i.test(table.name);
  if (!isWeaponTable) return table;
  return {
    ...table,
    description: edition === '2024'
      ? `${table.description} 2024 note: weapon mastery exists in the 2024 rules and should be checked against your campaign's rule source.`
      : `${table.description} 2014 note: this table uses the older no-mastery weapon reference style.`,
    entries: table.entries.map(entry => ({
      ...entry,
      text: edition === '2024'
        ? `${entry.text} | 2024 Mastery: check campaign rule source`
        : entry.text,
    })),
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

export const GM_REFERENCE_PACK_TABLES_2014 = BASE_GM_REFERENCE_PACK_TABLES.map(table => applyEditionOverrides(table, '2014'));
export const GM_REFERENCE_PACK_TABLES_2024 = BASE_GM_REFERENCE_PACK_TABLES.map(table => applyEditionOverrides(table, '2024'));
export const GM_REFERENCE_PACK_TABLES_BY_EDITION = [
  ...GM_REFERENCE_PACK_TABLES_2014,
  ...GM_REFERENCE_PACK_TABLES_2024,
];

export default GM_REFERENCE_PACK_TABLES_BY_EDITION;
