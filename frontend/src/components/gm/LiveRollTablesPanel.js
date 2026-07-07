import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Copy, Dice6, Plus, RefreshCw, Save, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
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
  ['potions', 'Potions'],
  ['prices', 'Costs & Shops'],
  ['npc', 'NPCs'],
  ['lore', 'Lore'],
  ['rules', 'Rules Reference'],
];

const DEFAULT_TABLES = [
  {
    id: 'travel-d20',
    name: 'Travel Results',
    category: 'travel',
    description: 'Roll when the party travels and you need a quick prompt for how the journey goes.',
    die: 'd20',
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
    name: 'Quirks of Fate',
    category: 'fate',
    description: 'Roll when fate bends, luck twists, omens appear, or destiny needs a strange little push.',
    die: 'd20',
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

function rangeMin(range) {
  const match = String(range).match(/\d+/);
  return match ? Number(match[0]) : 1;
}

function rangeMax(range) {
  const numbers = String(range).match(/\d+/g)?.map(Number) || [rangeMin(range)];
  return Math.max(...numbers);
}

function rollMatches(range, roll) {
  const min = rangeMin(range);
  const max = rangeMax(range);
  return roll >= min && roll <= max;
}

function normaliseEntries(entries) {
  return (entries || [])
    .map((entry, index) => {
      const range = Array.isArray(entry) ? entry[0] : entry?.range ?? entry?.roll ?? index + 1;
      const text = Array.isArray(entry) ? entry[1] : entry?.text ?? entry?.result ?? entry?.description ?? '';
      return { range: String(range || index + 1).replace(/\s/g, ''), text: String(text || '').trim() };
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
      const explicit = trimmed.match(/^(\d+(?:\s*-\s*\d+)?)\s*[:.)-]\s*(.+)$/);
      if (explicit) return { range: explicit[1].replace(/\s/g, ''), text: explicit[2].trim() };
      return { range: String(index + 1), text: trimmed };
    })
    .filter(Boolean)
    .slice(0, 200);
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

function entriesToText(entries) {
  return normaliseEntries(entries).map(entry => `${entry.range}: ${entry.text}`).join('\n');
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
  const [savingTable, setSavingTable] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newDescription, setNewDescription] = useState('');
  const [newLines, setNewLines] = useState('1: Something goes badly wrong\n2: A difficult complication appears\n3: The party finds a clue\n4: The party gets a small advantage');

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
    ...DEFAULT_TABLES.map(table => ({ ...table, entries: normaliseEntries(table.entries), locked: true, source: 'starter' })),
    ...campaignTables.map(table => ({ ...table, entries: normaliseEntries(table.entries), locked: false, source: table.source || (table.localOnly ? 'local' : 'campaign') })),
  ], [campaignTables]);

  const activeTable = tables.find(table => table.id === activeTableId) || tables[0];

  const rollTable = (table = activeTable) => {
    if (!table?.entries?.length) return;
    const sides = Math.max(20, ...table.entries.map(entry => rangeMax(entry.range)));
    const roll = Math.floor(Math.random() * sides) + 1;
    const entry = table.entries.find(item => rollMatches(item.range, roll)) || table.entries[table.entries.length - 1];
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
    if (entries.length < 2) {
      toast.error('Add at least two table results');
      return;
    }
    const sides = Math.max(20, ...entries.map(entry => rangeMax(entry.range)));
    const payload = {
      name,
      category: newCategory,
      description: newDescription.trim() || 'Custom campaign table',
      die: `d${sides}`,
      entries,
      source: 'campaign',
    };

    setSavingTable(true);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/tables`, payload);
      const saved = response.data;
      setCampaignTables(prev => [saved, ...prev.filter(table => table.id !== saved.id)]);
      setActiveTableId(saved.id);
      setApiReady(true);
      toast.success('Table saved to campaign');
    } catch (error) {
      const fallback = { ...payload, id: `local-${Date.now()}`, entries, localOnly: true };
      const nextTables = [fallback, ...campaignTables];
      setCampaignTables(nextTables);
      saveLocalCustomTables(campaignId, nextTables.filter(table => table.localOnly));
      setActiveTableId(fallback.id);
      setApiReady(false);
      toast.error(error?.response?.data?.detail || 'Saved locally only — campaign API was not available');
    } finally {
      setSavingTable(false);
      setNewName('');
      setNewCategory('general');
      setNewDescription('');
      setNewLines('');
      setShowCreate(false);
    }
  };

  const duplicateStarterToCampaign = async (table) => {
    setNewName(table.name);
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
          <button type="button" onClick={() => setShowCreate(prev => !prev)} style={secondaryButtonStyle}><Plus size={15} /> {showCreate ? 'Close' : 'Add Table'}</button>
        </div>
      </header>

      <div style={statusStyle(apiReady)}>
        <strong>{apiReady ? 'Campaign saved' : 'Local fallback'}</strong>
        <span>{apiReady ? 'New tables are saved to this campaign and available from Live Play Mode.' : 'Tables are available in this browser, but the campaign table API did not respond.'}</span>
      </div>

      {showCreate && (
        <section style={createBoxStyle}>
          <div style={formGridStyle}>
            <label style={fieldStyle}><span style={labelStyle}>Table name</span><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Quirks of Fate, Basic Weapons, Potion Prices..." style={inputStyle} /></label>
            <label style={fieldStyle}><span style={labelStyle}>Category</span><select value={newCategory} onChange={(event) => setNewCategory(event.target.value)} style={inputStyle}>{CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <label style={fieldStyle}><span style={labelStyle}>Short use note</span><input value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder="When should you use this table?" style={inputStyle} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Results</span><textarea value={newLines} onChange={(event) => setNewLines(event.target.value)} placeholder="1: Bad result\n2-4: Complication\n5-15: Normal result\n16-20: Good result" style={textareaStyle} /></label>
          <div style={buttonRowStyle}><button type="button" onClick={saveTable} disabled={savingTable} style={primaryButtonStyle}><Save size={14} /> {savingTable ? 'Saving...' : 'Save Table'}</button></div>
        </section>
      )}

      <div style={layoutStyle}>
        <aside style={tableListStyle} aria-label="Available campaign tables">
          {loadingTables && <p style={mutedTextStyle}>Loading campaign tables...</p>}
          {tables.map(table => {
            const active = table.id === activeTable.id;
            return (
              <button key={table.id} type="button" onClick={() => setActiveTableId(table.id)} style={tableButtonStyle(active)}>
                <BookOpen size={15} />
                <span style={{ minWidth: 0 }}>
                  <strong>{table.name}</strong>
                  <small>{categoryLabel(table.category)} · {table.locked ? 'Starter table' : table.localOnly ? 'Local only' : 'Campaign table'}</small>
                </span>
              </button>
            );
          })}
        </aside>

        <main style={rollerStyle}>
          <div style={activeHeaderStyle}>
            <div style={{ minWidth: 0 }}>
              <p style={eyebrowStyle}>{categoryLabel(activeTable.category)} · {activeTable.die || 'd20'}</p>
              <h4 style={activeTitleStyle}>{activeTable.name}</h4>
              <p style={subtitleStyle}>{activeTable.description}</p>
            </div>
            <div style={buttonRowStyle}>
              {activeTable.locked && <button type="button" onClick={() => duplicateStarterToCampaign(activeTable)} style={secondaryButtonStyle}><Save size={14} /> Save Copy</button>}
              {!activeTable.locked && <button type="button" onClick={() => deleteCustomTable(activeTable.id)} style={dangerButtonStyle}><Trash2 size={14} /> Delete</button>}
            </div>
          </div>

          <button type="button" onClick={() => rollTable(activeTable)} style={rollButtonStyle}><Dice6 size={22} /> Roll {activeTable.die || 'd20'}</button>

          {lastRoll ? (
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
          ) : (
            <section style={emptyResultStyle}>
              <p>Pick a table and roll. Results stay private until you copy, save, or send them to the player display.</p>
            </section>
          )}
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
const layoutStyle = { display: 'grid', gridTemplateColumns: 'minmax(220px, 0.35fr) minmax(0, 1fr)', gap: 10 };
const tableListStyle = { display: 'grid', gap: 7, alignSelf: 'start' };
const tableButtonStyle = (active) => ({ minHeight: 66, display: 'flex', alignItems: 'flex-start', gap: 8, textAlign: 'left', border: `1px solid ${active ? theme.red : theme.line}`, background: active ? 'rgba(208,0,0,0.18)' : theme.card, color: theme.text, padding: 10, cursor: 'pointer', fontFamily: fontStack });
const rollerStyle = { display: 'grid', gap: 10, background: theme.panel, border: `1px solid ${theme.line}`, padding: 10, minWidth: 0 };
const activeHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' };
const activeTitleStyle = { margin: '2px 0 5px', color: theme.text, fontSize: 20, fontWeight: 950 };
const rollButtonStyle = { minHeight: 74, border: 0, background: theme.red, color: theme.text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 18, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const resultStyle = { display: 'grid', gap: 8, background: theme.bg, border: `1px solid ${theme.lineStrong}`, padding: 14 };
const resultMetaStyle = { margin: 0, color: theme.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const rollNumberStyle = { display: 'inline-grid', placeItems: 'center', width: 58, height: 58, background: theme.red, color: theme.text, fontSize: 30, fontWeight: 950 };
const resultTextStyle = { margin: 0, color: theme.text, fontSize: 17, lineHeight: 1.45, fontWeight: 850 };
const emptyResultStyle = { minHeight: 150, display: 'grid', placeItems: 'center', textAlign: 'center', background: theme.bg, border: `1px dashed ${theme.line}`, color: theme.soft, padding: 20 };
const createBoxStyle = { display: 'grid', gap: 8, background: theme.panel, border: `1px solid ${theme.line}`, padding: 10 };
const formGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 };
const fieldStyle = { display: 'grid', gap: 5 };
const labelStyle = { color: theme.muted, fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const inputStyle = { minHeight: 36, background: theme.bg, color: theme.text, border: `1px solid ${theme.lineStrong}`, padding: '0 9px', outline: 'none', fontFamily: fontStack };
const textareaStyle = { minHeight: 130, background: theme.bg, color: theme.text, border: `1px solid ${theme.lineStrong}`, padding: 9, outline: 'none', fontFamily: fontStack, resize: 'vertical' };
const buttonRowStyle = { display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' };
const primaryButtonStyle = { minHeight: 34, border: 0, background: theme.red, color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 34, border: 0, background: theme.bg, color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const dangerButtonStyle = { minHeight: 32, border: 0, background: '#661111', color: theme.text, padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const mutedTextStyle = { margin: 0, color: theme.muted, fontSize: 12 };

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
