import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Copy, Dice6, Plus, RefreshCw, Save, Search, Send, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { GM_REFERENCE_PACK_TABLES_BY_EDITION } from '@/data/gmReferenceTablesByEdition';
import { createDisplayState, publishCampaignDisplayState } from '@/lib/liveDisplayBus';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const theme = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  hover: '#444444',
  line: 'rgba(255,255,255,0.16)',
  lineStrong: 'rgba(255,255,255,0.26)',
  red: '#d00000',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.74)',
  muted: 'rgba(255,255,255,0.58)',
};

const CATEGORY_OPTIONS = [
  ['general', 'General'],
  ['travel', 'Travel'],
  ['fate', 'Fate'],
  ['encounter', 'Encounter'],
  ['weapons', 'Weapons'],
  ['armour', 'Armour'],
  ['potions', 'Potions'],
  ['prices', 'Costs & Shops'],
  ['npc', 'NPCs'],
  ['lore', 'Lore'],
  ['rules', 'Rules Reference'],
];

const EDITION_FILTERS = [
  ['all', 'All'],
  ['2014', '2014'],
  ['2024', '2024'],
  ['campaign', 'Campaign'],
  ['starter', 'Starter'],
];

const CORE_STARTER_TABLES = [
  {
    id: 'travel-d20',
    name: 'Travel Results',
    category: 'travel',
    description: 'Roll when the party travels and you need a quick prompt for how the journey goes.',
    die: 'd20',
    rollable: true,
    entries: [
      { range: '1', text: 'A hard complication: danger, delay, injury, lost supplies, or a hostile encounter.' },
      { range: '2', text: 'The route is worse than expected. Travel takes longer and the party is tired or exposed.' },
      { range: '3', text: 'Bad weather, broken ground, or poor visibility makes the journey miserable.' },
      { range: '4', text: 'The party spots signs of a threat before it spots them. They can avoid it or prepare.' },
      { range: '5', text: 'A minor obstacle blocks the path: fallen tree, broken bridge, flooded road, or locked gate.' },
      { range: '6', text: 'They meet nervous travellers with a warning, rumour, or request.' },
      { range: '7', text: 'The journey is slow but safe. Add a small mood detail from the landscape.' },
      { range: '8', text: 'A useful landmark confirms they are going the right way.' },
      { range: '9', text: 'They find signs of recent activity: tracks, campfire, dropped item, blood, or strange markings.' },
      { range: '10', text: 'Quiet travel. Ask one character what they are thinking about on the road.' },
      { range: '11', text: 'A calm moment: good food, clear skies, a pretty view, or a rare chance to talk.' },
      { range: '12', text: 'They make better time than expected. Give them a small advantage before arrival.' },
      { range: '13', text: 'A helpful stranger, guide, animal, or local points them toward something useful.' },
      { range: '14', text: 'They discover a small optional scene: shrine, ruin, hidden path, camp, or old battlefield.' },
      { range: '15', text: 'A clue about the next location appears before they arrive.' },
      { range: '16', text: 'They find useful supplies, safe shelter, or a shortcut.' },
      { range: '17', text: 'A friendly encounter offers trade, information, healing, or transport.' },
      { range: '18', text: 'They arrive early or from an unexpected angle. Reward clever planning or good navigation.' },
      { range: '19', text: 'A strong positive twist: rare clue, ally, valuable find, or major shortcut.' },
      { range: '20', text: 'Best possible travel beat: safe arrival plus a reward, secret, advantage, or cinematic moment.' },
    ],
  },
  {
    id: 'fate-quirks-d20',
    name: 'Quirks of Fate — Quick d20',
    category: 'fate',
    description: 'A faster d20 Fate table for a quick Opian-style nudge. The full d100 table is also included in the reference pack.',
    die: 'd20',
    rollable: true,
    entries: [
      { range: '1', text: 'A bad omen appears: broken mirror, black feather, blood-red moon, cracked symbol, or cold wind.' },
      { range: '2', text: 'Someone repeats a phrase the party heard earlier, but they should not know it.' },
      { range: '3', text: 'A small object falls, breaks, or rolls toward the next clue.' },
      { range: '4', text: 'A stranger mistakes one character for someone from a prophecy, debt, or old story.' },
      { range: '5', text: 'The same symbol appears in three places within a few minutes.' },
      { range: '6', text: 'A lucky near-miss saves someone from harm but creates a new problem.' },
      { range: '7', text: 'A dream, memory, or déjà vu gives one character a warning.' },
      { range: '8', text: 'An ordinary choice suddenly feels heavy, as if something is watching.' },
      { range: '9', text: 'An NPC says exactly the wrong thing at exactly the right time.' },
      { range: '10', text: 'Nothing dramatic happens, but the silence feels meaningful.' },
      { range: '11', text: 'A small coincidence helps the party notice a hidden detail.' },
      { range: '12', text: 'A failed plan leaves behind one useful advantage.' },
      { range: '13', text: 'A lost item, name, or memory briefly resurfaces.' },
      { range: '14', text: 'Someone gets a chance to undo a tiny mistake, but not without cost.' },
      { range: '15', text: 'A clue arrives through chance: spilled ink, shuffled cards, birds taking flight, or dice landing oddly.' },
      { range: '16', text: 'A future danger reveals its shape through an omen.' },
      { range: '17', text: 'An ally appears earlier than expected, or an enemy arrives too late.' },
      { range: '18', text: 'A character’s bond, flaw, or past becomes immediately relevant.' },
      { range: '19', text: 'A strong twist of luck gives the party a useful opening.' },
      { range: '20', text: 'Fate intervenes clearly: prophecy beat, impossible coincidence, divine nudge, or major reveal.' },
    ],
  },
  {
    id: 'random-encounter-d20',
    name: 'Random Encounter',
    category: 'encounter',
    description: 'Roll when you need something to happen now without derailing the session.',
    die: 'd20',
    rollable: true,
    entries: [
      { range: '1', text: 'Hard combat encounter. The danger is immediate and already moving.' },
      { range: '2', text: 'Ambush signs. The party can spot the danger if they pay attention.' },
      { range: '3', text: 'A wounded creature or NPC is fleeing something worse.' },
      { range: '4', text: 'A patrol, guards, scouts, or hunters block the way.' },
      { range: '5', text: 'A territorial beast warns the party before attacking.' },
      { range: '6', text: 'A suspicious stranger wants to trade information.' },
      { range: '7', text: 'Environmental hazard: unstable ground, fire, flood, fog, magical surge, or falling debris.' },
      { range: '8', text: 'A lost traveller, child, animal, or messenger needs help.' },
      { range: '9', text: 'The party finds evidence of a nearby threat.' },
      { range: '10', text: 'A social encounter: merchant, pilgrim, rival, performer, guide, or noble.' },
      { range: '11', text: 'Strange tracks, symbols, lights, sounds, or dreams point toward hidden lore.' },
      { range: '12', text: 'A choice appears: safe slow path or risky fast path.' },
      { range: '13', text: 'A useful discovery: supplies, shelter, map scrap, old cache, or healing herbs.' },
      { range: '14', text: 'A faction agent, spy, cultist, courier, or informant crosses paths with the party.' },
      { range: '15', text: 'A roleplay scene tied to one character’s fear, flaw, bond, or backstory.' },
      { range: '16', text: 'A puzzle-like obstacle that rewards creativity over combat.' },
      { range: '17', text: 'A friendly NPC offers help, but wants something small in return.' },
      { range: '18', text: 'A rare sight or omen gives a clue about the wider campaign.' },
      { range: '19', text: 'A strong opportunity: shortcut, treasure lead, ally, or tactical advantage.' },
      { range: '20', text: 'Major twist encounter: recurring villain, powerful ally, prophecy beat, or campaign clue.' },
    ],
  },
];

function localStorageKey(campaignId) {
  return `rqk.liveRollTables.${campaignId || 'default'}`;
}

function normaliseDash(value) {
  return String(value || '').replace(/–/g, '-');
}

function rangeMin(range) {
  const match = normaliseDash(range).match(/\d+/);
  return match ? Number(match[0]) : 1;
}

function rangeMax(range) {
  const numbers = normaliseDash(range).match(/\d+/g)?.map(Number) || [rangeMin(range)];
  return Math.max(...numbers);
}

function rollMatches(range, roll) {
  const min = rangeMin(range);
  const max = rangeMax(range);
  return roll >= min && roll <= max;
}

function hasNumericRange(range) {
  return /^\d+(?:\s*[–-]\s*\d+)?$/.test(String(range || '').trim());
}

function isRollableTable(table) {
  if (!table || table.rollable === false) return false;
  if (!/^d\d+$/i.test(String(table.die || ''))) return false;
  const entries = normaliseEntries(table.entries);
  return entries.length > 0 && entries.every(entry => hasNumericRange(entry.range));
}

function normaliseEntries(entries) {
  return (entries || [])
    .map((entry, index) => {
      const range = Array.isArray(entry) ? entry[0] : entry?.range ?? entry?.roll ?? index + 1;
      const text = Array.isArray(entry) ? entry[1] : entry?.text ?? entry?.result ?? entry?.description ?? '';
      return { ...entry, range: String(range || index + 1).trim(), text: String(text || '').trim() };
    })
    .filter(entry => entry.text)
    .sort((a, b) => rangeMin(a.range) - rangeMin(b.range));
}

function parseTableLines(rawText) {
  return rawText
    .split('\n')
    .map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      const pipeParts = trimmed.split('|').map(part => part.trim()).filter(Boolean);
      if (pipeParts.length > 1) return { range: pipeParts[0], text: pipeParts.slice(1).join(' | ') };
      const explicit = trimmed.match(/^(\d+(?:\s*[–-]\s*\d+)?)\s*[:.)-]\s*(.+)$/);
      if (explicit) return { range: explicit[1].replace(/\s/g, ''), text: explicit[2].trim() };
      return { range: String(index + 1), text: trimmed };
    })
    .filter(Boolean)
    .slice(0, 200);
}

function inferCategoryFromName(name) {
  const lower = String(name || '').toLowerCase();
  if (lower.includes('weapon') || lower.includes('ammunition')) return 'weapons';
  if (lower.includes('armour') || lower.includes('armor')) return 'armour';
  if (lower.includes('potion') || lower.includes('poison') || lower.includes('herb')) return 'potions';
  if (lower.includes('cost') || lower.includes('value') || lower.includes('expense') || lower.includes('service') || lower.includes('food') || lower.includes('mount')) return 'prices';
  if (lower.includes('travel') || lower.includes('watch') || lower.includes('rest')) return 'travel';
  if (lower.includes('quirk') || lower.includes('fate') || lower.includes('opian')) return 'fate';
  if (lower.includes('combat') || lower.includes('action') || lower.includes('reaction') || lower.includes('cover') || lower.includes('condition') || lower.includes('damage') || lower.includes('death')) return 'rules';
  return 'general';
}

function parseBulkTables(rawText) {
  const normalised = String(rawText || '').replace(/\r/g, '').trim();
  if (!normalised) return [];
  const sections = /^Table Name:/im.test(normalised)
    ? normalised.split(/(?=^Table Name:)/gim)
    : normalised.split(/\n\s*---+\s*\n/g);

  return sections
    .map(section => section.trim())
    .filter(Boolean)
    .map(section => {
      const lines = section.split('\n').map(line => line.trim()).filter(Boolean);
      if (!lines.length) return null;
      const nameLine = lines.find(line => /^Table Name:/i.test(line));
      const categoryLine = lines.find(line => /^Category:/i.test(line));
      const name = nameLine
        ? nameLine.replace(/^Table Name:\s*/i, '').trim()
        : lines[0].replace(/#+/g, '').trim();
      const category = categoryLine
        ? categoryLine.replace(/^Category:\s*/i, '').trim().toLowerCase()
        : inferCategoryFromName(name);
      const bodyLines = lines.filter((line, index) => {
        if (nameLine && /^Table Name:/i.test(line)) return false;
        if (categoryLine && /^Category:/i.test(line)) return false;
        if (!nameLine && index === 0) return false;
        return true;
      });
      const headerIndex = bodyLines.findIndex(line => line.includes('|'));
      let description = '';
      let entries = [];
      if (headerIndex >= 0) {
        description = bodyLines.slice(0, headerIndex).join(' ');
        const columns = bodyLines[headerIndex].split('|').map(part => part.trim()).filter(Boolean);
        entries = bodyLines.slice(headerIndex + 1).map(line => {
          const row = line.split('|').map(part => part.trim());
          if (!row[0]) return null;
          return {
            range: row[0],
            text: columns.slice(1).map((column, index) => `${column}: ${row[index + 1] || '—'}`).join(' | '),
          };
        }).filter(Boolean);
      } else {
        entries = parseTableLines(bodyLines.join('\n'));
      }
      entries = entries.slice(0, 200);
      if (!name || entries.length < 1) return null;
      const allNumeric = entries.every(entry => hasNumericRange(entry.range));
      const sides = allNumeric ? Math.max(20, ...entries.map(entry => rangeMax(entry.range))) : 0;
      return {
        name,
        category: category || 'general',
        description: description || 'Imported campaign table',
        die: allNumeric ? `d${sides}` : 'reference',
        entries,
        source: 'campaign',
        is_player_safe: false,
      };
    })
    .filter(Boolean)
    .slice(0, 40);
}

function loadLocalCustomTables(campaignId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(localStorageKey(campaignId)) || '[]');
    return Array.isArray(parsed) ? parsed.filter(table => table?.id && table?.name && Array.isArray(table.entries)).map(table => ({ ...table, localOnly: true })) : [];
  } catch {
    return [];
  }
}

function saveLocalCustomTables(campaignId, tables) {
  try { localStorage.setItem(localStorageKey(campaignId), JSON.stringify(tables)); } catch { /* ignore */ }
}

function copyText(text) {
  navigator.clipboard?.writeText(text)
    .then(() => toast.success('Copied'))
    .catch(() => toast.info(text));
}

function categoryLabel(category) {
  return CATEGORY_OPTIONS.find(([value]) => value === category)?.[1] || 'General';
}

function sourceLabel(table) {
  if (table?.editionLabel) return table.editionLabel;
  if (table?.source === 'gm-reference-pack' || String(table?.source || '').startsWith('gm-reference-pack')) return 'GM Reference Pack';
  if (table?.locked) return 'Starter table';
  if (table?.localOnly) return 'Local only';
  return 'Campaign table';
}

function matchesEditionFilter(table, filter) {
  if (filter === 'all') return true;
  if (filter === '2014' || filter === '2024') return table?.edition === filter;
  if (filter === 'campaign') return !table?.locked;
  if (filter === 'starter') return table?.source === 'starter';
  return true;
}

function entriesToText(entries) {
  return normaliseEntries(entries).map(entry => `${entry.range}: ${entry.text}`).join('\n');
}

function cleanCopyName(name) {
  return String(name || '').replace(/^\d{4}\s+—\s+/, '').trim();
}

export default function LiveRollTablesPanel({
  campaignId,
  onSaveAsNote,
  allowDisplay = true,
  allowAddNote = true,
  heading = 'Tables',
  subheading = 'Use travel, fate, random encounters, rules references, equipment costs, weapons, potions, or your own campaign tables.',
}) {
  const [campaignTables, setCampaignTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [apiReady, setApiReady] = useState(true);
  const [activeTableId, setActiveTableId] = useState('travel-d20');
  const [lastRoll, setLastRoll] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [savingTable, setSavingTable] = useState(false);
  const [importingTables, setImportingTables] = useState(false);
  const [editingTableId, setEditingTableId] = useState(null);
  const [tableSearch, setTableSearch] = useState('');
  const [editionFilter, setEditionFilter] = useState('all');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newDescription, setNewDescription] = useState('');
  const [newLines, setNewLines] = useState('1: Something goes badly wrong\n2: A difficult complication appears\n3: The party finds a clue\n4: The party gets a small advantage');
  const [bulkText, setBulkText] = useState('');

  const fetchTables = async () => {
    if (!campaignId) return;
    setLoadingTables(true);
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/tables`);
      setCampaignTables(Array.isArray(response.data) ? response.data : []);
      setApiReady(true);
    } catch (error) {
      setCampaignTables(loadLocalCustomTables(campaignId));
      setApiReady(false);
      toast.error(error?.response?.data?.detail || 'Could not load campaign tables');
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => { fetchTables(); }, [campaignId]);

  const tables = useMemo(() => [
    ...CORE_STARTER_TABLES.map(table => ({ ...table, entries: normaliseEntries(table.entries), locked: true, source: 'starter' })),
    ...GM_REFERENCE_PACK_TABLES_BY_EDITION.map(table => ({ ...table, entries: normaliseEntries(table.entries), locked: true })),
    ...campaignTables.map(table => ({ ...table, entries: normaliseEntries(table.entries), locked: false, source: table.source || (table.localOnly ? 'local' : 'campaign') })),
  ], [campaignTables]);

  const filteredTables = useMemo(() => {
    const needle = tableSearch.trim().toLowerCase();
    return tables.filter(table => {
      if (!matchesEditionFilter(table, editionFilter)) return false;
      if (!needle) return true;
      return `${table.name} ${table.category} ${table.description} ${table.editionLabel || ''} ${table.source || ''}`.toLowerCase().includes(needle);
    });
  }, [editionFilter, tableSearch, tables]);

  const activeTable = tables.find(table => table.id === activeTableId) || filteredTables[0] || tables[0];
  const activeEntries = normaliseEntries(activeTable?.entries || []);
  const activeIsRollable = isRollableTable(activeTable);
  const bulkPreviewCount = parseBulkTables(bulkText).length;

  const resetTableForm = () => {
    setEditingTableId(null);
    setNewName('');
    setNewCategory('general');
    setNewDescription('');
    setNewLines('');
    setShowCreate(false);
  };

  const startCreateTable = () => {
    setEditingTableId(null);
    setNewName('');
    setNewCategory('general');
    setNewDescription('');
    setNewLines('1: Something goes badly wrong\n2: A difficult complication appears\n3: The party finds a clue\n4: The party gets a small advantage');
    setShowCreate(true);
  };

  const startEditTable = (table) => {
    if (!table || table.locked) return;
    setEditingTableId(table.id);
    setNewName(table.name || '');
    setNewCategory(table.category || 'general');
    setNewDescription(table.description || '');
    setNewLines(entriesToText(table.entries));
    setShowCreate(true);
  };

  const rollTable = (table = activeTable) => {
    if (!isRollableTable(table)) return;
    const entries = normaliseEntries(table.entries);
    const sides = Number(String(table.die || 'd20').replace(/\D/g, '')) || Math.max(20, ...entries.map(entry => rangeMax(entry.range)));
    const roll = Math.floor(Math.random() * sides) + 1;
    const entry = entries.find(item => rollMatches(item.range, roll)) || entries[entries.length - 1];
    const result = {
      id: Date.now(),
      tableId: table.id,
      tableName: table.name,
      die: `d${sides}`,
      roll,
      range: entry.range,
      text: entry.text,
      createdAt: new Date().toISOString(),
    };
    setActiveTableId(table.id);
    setLastRoll(result);
  };

  const saveTable = async () => {
    const name = newName.trim();
    const entries = parseTableLines(newLines);
    if (!name) {
      toast.error('Give the table a name');
      return;
    }
    if (entries.length < 1) {
      toast.error('Add at least one table row');
      return;
    }
    const allNumeric = entries.every(entry => hasNumericRange(entry.range));
    const sides = allNumeric ? Math.max(20, ...entries.map(entry => rangeMax(entry.range))) : 0;
    const payload = {
      name,
      category: newCategory,
      description: newDescription.trim() || 'Custom campaign table',
      die: allNumeric ? `d${sides}` : 'reference',
      entries,
      source: 'campaign',
      is_player_safe: false,
    };

    setSavingTable(true);
    try {
      if (editingTableId) {
        const target = campaignTables.find(table => table.id === editingTableId);
        if (target?.localOnly) {
          const updated = { ...target, ...payload, entries, updated_at: new Date().toISOString(), localOnly: true };
          const nextTables = campaignTables.map(table => table.id === editingTableId ? updated : table);
          setCampaignTables(nextTables);
          saveLocalCustomTables(campaignId, nextTables.filter(table => table.localOnly));
          setActiveTableId(updated.id);
          toast.success('Local table updated');
        } else {
          const response = await apiClient.put(`/campaigns/${campaignId}/tables/${editingTableId}`, payload);
          const saved = response.data;
          setCampaignTables(prev => prev.map(table => table.id === editingTableId ? saved : table));
          setActiveTableId(saved.id);
          setApiReady(true);
          toast.success('Table updated');
        }
      } else {
        const response = await apiClient.post(`/campaigns/${campaignId}/tables`, payload);
        const saved = response.data;
        setCampaignTables(prev => [saved, ...prev.filter(table => table.id !== saved.id)]);
        setActiveTableId(saved.id);
        setApiReady(true);
        toast.success('Table saved to campaign');
      }
      resetTableForm();
    } catch (error) {
      if (editingTableId) {
        toast.error(error?.response?.data?.detail || 'Could not update table');
      } else {
        const fallback = { ...payload, id: `local-${Date.now()}`, entries, localOnly: true };
        const nextTables = [fallback, ...campaignTables];
        setCampaignTables(nextTables);
        saveLocalCustomTables(campaignId, nextTables.filter(table => table.localOnly));
        setActiveTableId(fallback.id);
        setApiReady(false);
        toast.error(error?.response?.data?.detail || 'Saved locally only — campaign API was not available');
        resetTableForm();
      }
    } finally {
      setSavingTable(false);
    }
  };

  const importBulkTables = async () => {
    const parsedTables = parseBulkTables(bulkText);
    if (!parsedTables.length) {
      toast.error('No importable tables found');
      return;
    }
    setImportingTables(true);
    try {
      const created = [];
      for (const table of parsedTables) {
        const response = await apiClient.post(`/campaigns/${campaignId}/tables`, table);
        created.push(response.data);
      }
      setCampaignTables(prev => [...created, ...prev]);
      setActiveTableId(created[0]?.id || activeTableId);
      setBulkText('');
      setShowBulkImport(false);
      setApiReady(true);
      toast.success(`Imported ${created.length} table${created.length === 1 ? '' : 's'}`);
    } catch (error) {
      const fallbackTables = parsedTables.map((table, index) => ({ ...table, id: `local-import-${Date.now()}-${index}`, localOnly: true }));
      const nextTables = [...fallbackTables, ...campaignTables];
      setCampaignTables(nextTables);
      saveLocalCustomTables(campaignId, nextTables.filter(table => table.localOnly));
      setApiReady(false);
      toast.error(error?.response?.data?.detail || 'Imported locally only — campaign API was not available');
    } finally {
      setImportingTables(false);
    }
  };

  const duplicateStarterToCampaign = (table) => {
    setEditingTableId(null);
    setNewName(cleanCopyName(table.name));
    setNewCategory(table.category || 'general');
    setNewDescription(table.description || '');
    setNewLines(entriesToText(table.entries));
    setShowCreate(true);
  };

  const deleteCustomTable = async (tableId) => {
    const target = campaignTables.find(table => table.id === tableId);
    if (!target) return;
    try {
      if (!target.localOnly) await apiClient.delete(`/campaigns/${campaignId}/tables/${tableId}`);
      const nextTables = campaignTables.filter(table => table.id !== tableId);
      setCampaignTables(nextTables);
      saveLocalCustomTables(campaignId, nextTables.filter(table => table.localOnly));
      if (activeTableId === tableId) setActiveTableId('travel-d20');
      if (editingTableId === tableId) resetTableForm();
      toast.success('Table removed');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not delete table');
    }
  };

  const resultText = lastRoll ? `${lastRoll.tableName}: ${lastRoll.die} rolled ${lastRoll.roll} — ${lastRoll.text}` : '';

  const sendResultToDisplay = () => {
    if (!lastRoll) return;
    publishCampaignDisplayState(campaignId, createDisplayState('table-result', {
      eyebrow: 'Table Roll',
      title: lastRoll.tableName,
      roll: lastRoll.roll,
      die: lastRoll.die,
      result: lastRoll.text,
      display_target: 'standing-tv',
    }));
    toast.success('Table result sent to player display');
  };

  return (
    <section style={shellStyle} data-testid="live-roll-tables-panel">
      <header style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}>Campaign reference</p>
          <h3 style={titleStyle}>{heading}</h3>
          <p style={subtitleStyle}>{subheading}</p>
        </div>
        <div style={buttonRowStyle}>
          <button type="button" onClick={fetchTables} style={secondaryButtonStyle}><RefreshCw size={15} /> Refresh</button>
          <button type="button" onClick={() => setShowBulkImport(prev => !prev)} style={secondaryButtonStyle}><Upload size={15} /> {showBulkImport ? 'Close Import' : 'Bulk Import'}</button>
          <button type="button" onClick={() => showCreate ? resetTableForm() : startCreateTable()} style={secondaryButtonStyle}><Plus size={15} /> {showCreate ? 'Close' : 'Add Table'}</button>
        </div>
      </header>

      <div style={statusStyle(apiReady)}>
        <strong>{apiReady ? 'Campaign saved' : 'Local fallback'}</strong>
        <span>{apiReady ? 'Custom tables save to this campaign. Built-in reference tables are separated into 2014 and 2024 sets.' : 'Custom tables are available in this browser, but the campaign table API did not respond.'}</span>
      </div>

      {showBulkImport && (
        <section style={createBoxStyle}>
          <p style={subtitleStyle}>Paste several tables at once. Separate tables with <strong>---</strong>, or use <strong>Table Name:</strong> and <strong>Category:</strong> headings.</p>
          <label style={fieldStyle}><span style={labelStyle}>Bulk table text</span><textarea value={bulkText} onChange={(event) => setBulkText(event.target.value)} placeholder={'Table Name: Basic Weapons\nCategory: Weapons\n\nWeapon| Cost| Damage| Use\nClub| 1 sp| 1d4 bludgeoning| Basic blunt weapon\n---\nTable Name: Travel Results\nCategory: Travel\n\n1: Bad weather slows travel\n2: Signs of nearby monsters'} style={bulkTextareaStyle} /></label>
          <div style={buttonRowStyle}>
            <button type="button" onClick={importBulkTables} disabled={importingTables} style={primaryButtonStyle}><Upload size={14} /> {importingTables ? 'Importing...' : `Import ${bulkPreviewCount || ''} Table${bulkPreviewCount === 1 ? '' : 's'}`}</button>
            <span style={mutedTextStyle}>{bulkPreviewCount ? `${bulkPreviewCount} table${bulkPreviewCount === 1 ? '' : 's'} detected` : 'No tables detected yet'}</span>
          </div>
        </section>
      )}

      {showCreate && (
        <section style={createBoxStyle}>
          <div style={formTitleRowStyle}>
            <strong>{editingTableId ? 'Edit campaign table' : 'Create campaign table'}</strong>
            {editingTableId && <span>Editing saved campaign content only.</span>}
          </div>
          <div style={formGridStyle}>
            <label style={fieldStyle}><span style={labelStyle}>Table name</span><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Quirks of Fate, Basic Weapons, Potion Prices..." style={inputStyle} /></label>
            <label style={fieldStyle}><span style={labelStyle}>Category</span><select value={newCategory} onChange={(event) => setNewCategory(event.target.value)} style={inputStyle}>{CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <label style={fieldStyle}><span style={labelStyle}>Short use note</span><input value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder="When should you use this table?" style={inputStyle} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Rows or roll results</span><textarea value={newLines} onChange={(event) => setNewLines(event.target.value)} placeholder="1: Bad result\n2-4: Complication\nClub | 1 sp | 1d4 bludgeoning" style={textareaStyle} /></label>
          <div style={buttonRowStyle}>
            <button type="button" onClick={saveTable} disabled={savingTable} style={primaryButtonStyle}><Save size={14} /> {savingTable ? 'Saving...' : editingTableId ? 'Update Table' : 'Save Table'}</button>
            <button type="button" onClick={resetTableForm} style={secondaryButtonStyle}>Cancel</button>
          </div>
        </section>
      )}

      <div style={layoutStyle}>
        <aside style={tableListStyle} aria-label="Available campaign tables">
          <div style={filterRowStyle}>{EDITION_FILTERS.map(([value, label]) => <button key={value} type="button" onClick={() => setEditionFilter(value)} style={filterChipStyle(editionFilter === value)}>{label}</button>)}</div>
          <label style={searchBoxStyle}><Search size={14} /><input value={tableSearch} onChange={(event) => setTableSearch(event.target.value)} placeholder="Search tables, weapons, potions..." style={searchInputStyle} /></label>
          {loadingTables && <p style={mutedTextStyle}>Loading campaign tables...</p>}
          {filteredTables.map(table => {
            const active = table.id === activeTable.id;
            return (
              <button key={table.id} type="button" onClick={() => setActiveTableId(table.id)} style={tableButtonStyle(active)}>
                <BookOpen size={15} />
                <span style={{ minWidth: 0 }}>
                  <strong>{table.name}</strong>
                  <small>{categoryLabel(table.category)} · {sourceLabel(table)}</small>
                </span>
              </button>
            );
          })}
        </aside>

        <main style={rollerStyle}>
          <div style={activeHeaderStyle}>
            <div style={{ minWidth: 0 }}>
              <p style={eyebrowStyle}>{categoryLabel(activeTable.category)} · {activeIsRollable ? activeTable.die : 'Reference table'}{activeTable.editionLabel ? ` · ${activeTable.editionLabel}` : ''}</p>
              <h4 style={activeTitleStyle}>{activeTable.name}</h4>
              <p style={subtitleStyle}>{activeTable.description}</p>
            </div>
            <div style={buttonRowStyle}>
              {activeTable.locked && activeTable.source !== 'starter' && <button type="button" onClick={() => duplicateStarterToCampaign(activeTable)} style={secondaryButtonStyle}><Save size={14} /> Save Copy</button>}
              {!activeTable.locked && <button type="button" onClick={() => startEditTable(activeTable)} style={secondaryButtonStyle}>Edit</button>}
              {!activeTable.locked && <button type="button" onClick={() => deleteCustomTable(activeTable.id)} style={dangerButtonStyle}><Trash2 size={14} /> Delete</button>}
            </div>
          </div>

          {activeIsRollable ? <button type="button" onClick={() => rollTable(activeTable)} style={rollButtonStyle}><Dice6 size={22} /> Roll {activeTable.die || 'd20'}</button> : <div style={referenceOnlyStyle}>Reference only — use this table for quick lookup during prep or live play.</div>}

          {lastRoll && lastRoll.tableId === activeTable.id ? (
            <section style={resultStyle}>
              <p style={resultMetaStyle}>{lastRoll.tableName} · {lastRoll.die} result</p>
              <strong style={rollNumberStyle}>{lastRoll.roll}</strong>
              <p style={resultTextStyle}>{lastRoll.text}</p>
              <div style={buttonRowStyle}>
                <button type="button" onClick={() => copyText(resultText)} style={secondaryButtonStyle}><Copy size={14} /> Copy</button>
                {allowAddNote && onSaveAsNote && <button type="button" onClick={() => onSaveAsNote(resultText)} style={secondaryButtonStyle}>Add to Notes</button>}
                {allowDisplay && <button type="button" onClick={sendResultToDisplay} style={primaryButtonStyle}><Send size={14} /> Send to TV</button>}
              </div>
            </section>
          ) : activeIsRollable ? (
            <section style={emptyResultStyle}>
              <p>Roll this table when you need a live result. It stays private until you copy, save, or send it to the player display.</p>
            </section>
          ) : null}

          <section style={entriesStyle}>
            <div style={entriesHeaderStyle}><strong>{activeEntries.length} rows</strong><span>{activeIsRollable ? 'Roll results' : 'Quick reference'}</span></div>
            <div style={entriesListStyle}>
              {activeEntries.map((entry, index) => <article key={`${entry.range}-${index}`} style={entryRowStyle}><strong>{entry.range}</strong><span>{entry.text}</span></article>)}
            </div>
          </section>
        </main>
      </div>
    </section>
  );
}

const shellStyle = { display: 'grid', gap: 10, color: theme.text, fontFamily: fontStack };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', background: theme.card, border: `1px solid ${theme.line}`, borderLeft: `6px solid ${theme.red}`, padding: 12 };
const eyebrowStyle = { margin: 0, color: theme.red, fontSize: 10, fontWeight: 950, letterSpacing: '0.12em', textTransform: 'uppercase' };
const titleStyle = { margin: '3px 0 4px', color: theme.text, fontSize: 22, lineHeight: 1.08, fontWeight: 950 };
const subtitleStyle = { margin: 0, color: theme.soft, fontSize: 12, lineHeight: 1.45 };
const statusStyle = (ready) => ({ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: ready ? 'rgba(22, 101, 52, 0.16)' : 'rgba(180, 83, 9, 0.16)', border: `1px solid ${ready ? 'rgba(74, 222, 128, 0.35)' : 'rgba(251, 191, 36, 0.35)'}`, color: theme.soft, padding: '8px 10px', fontSize: 12 });
const layoutStyle = { display: 'grid', gridTemplateColumns: 'minmax(240px, 0.36fr) minmax(0, 1fr)', gap: 10 };
const tableListStyle = { display: 'grid', gap: 7, alignSelf: 'start', maxHeight: '72vh', overflowY: 'auto', paddingRight: 4 };
const tableButtonStyle = (active) => ({ minHeight: 66, display: 'flex', alignItems: 'flex-start', gap: 8, textAlign: 'left', border: `1px solid ${active ? theme.red : theme.line}`, background: active ? 'rgba(208,0,0,0.18)' : theme.card, color: theme.text, padding: 10, cursor: 'pointer', fontFamily: fontStack });
const rollerStyle = { display: 'grid', gap: 10, background: theme.panel, border: `1px solid ${theme.line}`, padding: 10, minWidth: 0 };
const activeHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' };
const activeTitleStyle = { margin: '2px 0 5px', color: theme.text, fontSize: 20, fontWeight: 950 };
const rollButtonStyle = { minHeight: 74, border: 0, background: theme.red, color: theme.text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 18, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const referenceOnlyStyle = { minHeight: 46, display: 'flex', alignItems: 'center', background: theme.bg, border: `1px solid ${theme.line}`, color: theme.soft, padding: '0 12px', fontSize: 13, fontWeight: 800 };
const resultStyle = { display: 'grid', gap: 8, background: theme.bg, border: `1px solid ${theme.lineStrong}`, padding: 14 };
const resultMetaStyle = { margin: 0, color: theme.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const rollNumberStyle = { display: 'inline-grid', placeItems: 'center', width: 58, height: 58, background: theme.red, color: theme.text, fontSize: 30, fontWeight: 950 };
const resultTextStyle = { margin: 0, color: theme.text, fontSize: 17, lineHeight: 1.45, fontWeight: 850 };
const emptyResultStyle = { minHeight: 100, display: 'grid', placeItems: 'center', textAlign: 'center', background: theme.bg, border: `1px dashed ${theme.line}`, color: theme.soft, padding: 20 };
const createBoxStyle = { display: 'grid', gap: 8, background: theme.panel, border: `1px solid ${theme.line}`, padding: 10 };
const formTitleRowStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap', color: theme.soft, fontSize: 12 };
const formGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 };
const fieldStyle = { display: 'grid', gap: 5 };
const labelStyle = { color: theme.muted, fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const inputStyle = { minHeight: 36, background: theme.bg, color: theme.text, border: `1px solid ${theme.lineStrong}`, padding: '0 9px', outline: 'none', fontFamily: fontStack };
const textareaStyle = { minHeight: 130, background: theme.bg, color: theme.text, border: `1px solid ${theme.lineStrong}`, padding: 9, outline: 'none', fontFamily: fontStack, resize: 'vertical' };
const bulkTextareaStyle = { ...textareaStyle, minHeight: 210 };
const filterRowStyle = { display: 'flex', gap: 5, flexWrap: 'wrap' };
const filterChipStyle = (active) => ({ minHeight: 30, border: `1px solid ${active ? theme.red : theme.line}`, background: active ? 'rgba(208,0,0,0.22)' : theme.bg, color: theme.text, padding: '0 9px', fontSize: 11, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack });
const searchBoxStyle = { display: 'flex', alignItems: 'center', gap: 7, minHeight: 38, background: theme.bg, border: `1px solid ${theme.line}`, color: theme.muted, padding: '0 9px' };
const searchInputStyle = { flex: 1, minWidth: 0, background: 'transparent', border: 0, outline: 'none', color: theme.text, fontFamily: fontStack };
const buttonRowStyle = { display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' };
const primaryButtonStyle = { minHeight: 34, border: 0, background: theme.red, color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 34, border: 0, background: theme.bg, color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const dangerButtonStyle = { minHeight: 32, border: 0, background: '#661111', color: theme.text, padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const mutedTextStyle = { margin: 0, color: theme.muted, fontSize: 12 };
const entriesStyle = { display: 'grid', gap: 8, background: theme.bg, border: `1px solid ${theme.line}`, padding: 10 };
const entriesHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', color: theme.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' };
const entriesListStyle = { display: 'grid', gap: 5, maxHeight: 360, overflowY: 'auto' };
const entryRowStyle = { display: 'grid', gridTemplateColumns: 'minmax(72px, 0.22fr) minmax(0, 1fr)', gap: 8, background: theme.card, borderLeft: `4px solid ${theme.red}`, padding: '7px 9px', color: theme.soft, fontSize: 12, lineHeight: 1.35 };

if (typeof document !== 'undefined' && !document.getElementById('live-roll-tables-panel-css')) {
  const style = document.createElement('style');
  style.id = 'live-roll-tables-panel-css';
  style.textContent = `
    @media (max-width: 860px) {
      [data-testid="live-roll-tables-panel"] > div:last-child {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(style);
}
