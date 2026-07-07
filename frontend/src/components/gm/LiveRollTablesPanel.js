import React, { useMemo, useState } from 'react';
import { BookOpen, Copy, Dice6, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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

const DEFAULT_TABLES = [
  {
    id: 'travel-d20',
    name: 'Travel Results',
    description: 'Roll when the party travels and you need a quick prompt for how the journey goes.',
    die: 'd20',
    entries: [
      ['1', 'A hard complication: danger, delay, injury, lost supplies, or a hostile encounter.'],
      ['2', 'The route is worse than expected. Travel takes longer and the party is tired or exposed.'],
      ['3', 'Bad weather, broken ground, or poor visibility makes the journey miserable.'],
      ['4', 'The party spots signs of a threat before it spots them. They can avoid it or prepare.'],
      ['5', 'A minor obstacle blocks the path: fallen tree, broken bridge, flooded road, or locked gate.'],
      ['6', 'They meet nervous travellers with a warning, rumour, or request.'],
      ['7', 'The journey is slow but safe. Add a small mood detail from the landscape.'],
      ['8', 'A useful landmark confirms they are going the right way.'],
      ['9', 'They find signs of recent activity: tracks, campfire, dropped item, blood, or strange markings.'],
      ['10', 'Quiet travel. Ask one character what they are thinking about on the road.'],
      ['11', 'A calm moment: good food, clear skies, a pretty view, or a rare chance to talk.'],
      ['12', 'They make better time than expected. Give them a small advantage before arrival.'],
      ['13', 'A helpful stranger, guide, animal, or local points them toward something useful.'],
      ['14', 'They discover a small optional scene: shrine, ruin, hidden path, camp, or old battlefield.'],
      ['15', 'A clue about the next location appears before they arrive.'],
      ['16', 'They find useful supplies, safe shelter, or a shortcut.'],
      ['17', 'A friendly encounter offers trade, information, healing, or transport.'],
      ['18', 'They arrive early or from an unexpected angle. Reward clever planning or good navigation.'],
      ['19', 'A strong positive twist: rare clue, ally, valuable find, or major shortcut.'],
      ['20', 'Best possible travel beat: safe arrival plus a reward, secret, advantage, or cinematic moment.'],
    ],
  },
  {
    id: 'fey-quirks-d20',
    name: 'Quirks of Fey',
    description: 'Roll when fey magic, strange bargains, or odd woodland behaviour needs flavour.',
    die: 'd20',
    entries: [
      ['1', 'A creature cannot tell a lie, but answers every question sideways.'],
      ['2', 'A bargain is offered, but the price is a memory, name, shadow, or favourite song.'],
      ['3', 'Flowers bloom where someone steps, then whisper what they overheard.'],
      ['4', 'A door, arch, tree, or puddle leads somewhere it absolutely should not.'],
      ['5', 'A tiny court demands formal manners before giving any help.'],
      ['6', 'Someone becomes convinced an ordinary object is deeply important.'],
      ['7', 'Time slips. A few minutes feel like hours, or hours pass like minutes.'],
      ['8', 'A local animal speaks with unsettling politeness and asks for a favour.'],
      ['9', 'Music drifts through the air; following it reveals a clue or trap.'],
      ['10', 'A fey offers a gift that is useful now but awkward later.'],
      ['11', 'One person’s reflection moves independently and gestures toward something hidden.'],
      ['12', 'Names have power here. Speaking a full name draws attention.'],
      ['13', 'A path rearranges itself unless the party follows a strange rule.'],
      ['14', 'A harmless prank reveals a useful secret by accident.'],
      ['15', 'A promise made aloud becomes magically important.'],
      ['16', 'A fey noble watches from nearby and is entertained by boldness.'],
      ['17', 'The area reacts to emotion: anger sharpens thorns, kindness opens flowers.'],
      ['18', 'A lost item returns, but it brings a message, curse, or clue with it.'],
      ['19', 'A fey shortcut appears for someone who gives a sincere compliment.'],
      ['20', 'A powerful fey moment: boon, prophecy, impossible invitation, or dramatic reveal.'],
    ],
  },
  {
    id: 'random-encounter-d20',
    name: 'Random Encounter',
    description: 'Roll when you need something to happen now without derailing the session.',
    die: 'd20',
    entries: [
      ['1', 'Hard combat encounter. The danger is immediate and already moving.'],
      ['2', 'Ambush signs. The party can spot the danger if they pay attention.'],
      ['3', 'A wounded creature or NPC is fleeing something worse.'],
      ['4', 'A patrol, guards, scouts, or hunters block the way.'],
      ['5', 'A territorial beast warns the party before attacking.'],
      ['6', 'A suspicious stranger wants to trade information.'],
      ['7', 'Environmental hazard: unstable ground, fire, flood, fog, magical surge, or falling debris.'],
      ['8', 'A lost traveller, child, animal, or messenger needs help.'],
      ['9', 'The party finds evidence of a nearby threat.'],
      ['10', 'A social encounter: merchant, pilgrim, rival, performer, guide, or noble.'],
      ['11', 'Strange tracks, symbols, lights, sounds, or dreams point toward hidden lore.'],
      ['12', 'A choice appears: safe slow path or risky fast path.'],
      ['13', 'A useful discovery: supplies, shelter, map scrap, old cache, or healing herbs.'],
      ['14', 'A faction agent, spy, cultist, courier, or informant crosses paths with the party.'],
      ['15', 'A roleplay scene tied to one character’s fear, flaw, bond, or backstory.'],
      ['16', 'A puzzle-like obstacle that rewards creativity over combat.'],
      ['17', 'A friendly NPC offers help, but wants something small in return.'],
      ['18', 'A rare sight or omen gives a clue about the wider campaign.'],
      ['19', 'A strong opportunity: shortcut, treasure lead, ally, or tactical advantage.'],
      ['20', 'Major twist encounter: recurring villain, powerful ally, prophecy beat, or campaign clue.'],
    ],
  },
];

function storageKey(campaignId) {
  return `rqk.liveRollTables.${campaignId || 'default'}`;
}

function normaliseEntries(entries) {
  return entries
    .map(([range, text], index) => ({ range: String(range || index + 1), text: String(text || '').trim() }))
    .filter(entry => entry.text)
    .sort((a, b) => rangeMin(a.range) - rangeMin(b.range));
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

function parseTableLines(rawText) {
  return rawText
    .split('\n')
    .map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      const explicit = trimmed.match(/^(\d+(?:\s*-\s*\d+)?)\s*[:.)-]\s*(.+)$/);
      if (explicit) return [explicit[1].replace(/\s/g, ''), explicit[2].trim()];
      return [String(index + 1), trimmed];
    })
    .filter(Boolean)
    .slice(0, 100);
}

function loadCustomTables(campaignId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(campaignId)) || '[]');
    return Array.isArray(parsed) ? parsed.filter(table => table?.id && table?.name && Array.isArray(table.entries)) : [];
  } catch {
    return [];
  }
}

function saveCustomTables(campaignId, tables) {
  try { localStorage.setItem(storageKey(campaignId), JSON.stringify(tables)); } catch { /* ignore */ }
}

function copyText(text) {
  navigator.clipboard?.writeText(text)
    .then(() => toast.success('Copied'))
    .catch(() => toast.info(text));
}

export default function LiveRollTablesPanel({ campaignId, onSaveAsNote }) {
  const [customTables, setCustomTables] = useState(() => loadCustomTables(campaignId));
  const [activeTableId, setActiveTableId] = useState('travel-d20');
  const [lastRoll, setLastRoll] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLines, setNewLines] = useState('1: Something goes badly wrong\n2: A difficult complication appears\n3: The party finds a clue\n4: The party gets a small advantage');

  const tables = useMemo(() => [
    ...DEFAULT_TABLES.map(table => ({ ...table, entries: normaliseEntries(table.entries), locked: true })),
    ...customTables.map(table => ({ ...table, entries: normaliseEntries(table.entries), locked: false })),
  ], [customTables]);

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

  const saveTable = () => {
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
    const nextTable = {
      id: `custom-${Date.now()}`,
      name,
      description: newDescription.trim() || 'Custom live table',
      die: `d${Math.max(20, ...entries.map(([range]) => rangeMax(range)))}`,
      entries,
    };
    const nextTables = [nextTable, ...customTables];
    setCustomTables(nextTables);
    saveCustomTables(campaignId, nextTables);
    setActiveTableId(nextTable.id);
    setNewName('');
    setNewDescription('');
    setNewLines('');
    setShowCreate(false);
    toast.success('Table added to Live Play Mode');
  };

  const deleteCustomTable = (tableId) => {
    const nextTables = customTables.filter(table => table.id !== tableId);
    setCustomTables(nextTables);
    saveCustomTables(campaignId, nextTables);
    if (activeTableId === tableId) setActiveTableId('travel-d20');
    toast.success('Custom table removed from this browser');
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
          <p style={eyebrowStyle}>Live tables</p>
          <h3 style={titleStyle}>Roll tables you can actually use mid-session</h3>
          <p style={subtitleStyle}>Use travel, fey quirks, random encounters, or add your own d20 table. Nothing here deletes or changes your campaign lore.</p>
        </div>
        <button type="button" onClick={() => setShowCreate(prev => !prev)} style={secondaryButtonStyle}><Plus size={15} /> {showCreate ? 'Close' : 'Add Table'}</button>
      </header>

      {showCreate && (
        <section style={createBoxStyle}>
          <label style={fieldStyle}><span style={labelStyle}>Table name</span><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Quirks of Fey, Travel Results, City Trouble..." style={inputStyle} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Short use note</span><input value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder="When should you roll this?" style={inputStyle} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Results</span><textarea value={newLines} onChange={(event) => setNewLines(event.target.value)} placeholder="1: Bad result\n2-4: Complication\n5-15: Normal result\n16-20: Good result" style={textareaStyle} /></label>
          <div style={buttonRowStyle}><button type="button" onClick={saveTable} style={primaryButtonStyle}>Save Table</button></div>
        </section>
      )}

      <div style={layoutStyle}>
        <aside style={tableListStyle} aria-label="Available live tables">
          {tables.map(table => {
            const active = table.id === activeTable.id;
            return (
              <button key={table.id} type="button" onClick={() => setActiveTableId(table.id)} style={tableButtonStyle(active)}>
                <BookOpen size={15} />
                <span style={{ minWidth: 0 }}>
                  <strong>{table.name}</strong>
                  <small>{table.description}</small>
                </span>
              </button>
            );
          })}
        </aside>

        <main style={rollerStyle}>
          <div style={activeHeaderStyle}>
            <div style={{ minWidth: 0 }}>
              <p style={eyebrowStyle}>{activeTable.die || 'd20'} table</p>
              <h4 style={activeTitleStyle}>{activeTable.name}</h4>
              <p style={subtitleStyle}>{activeTable.description}</p>
            </div>
            {!activeTable.locked && <button type="button" onClick={() => deleteCustomTable(activeTable.id)} style={dangerButtonStyle}><Trash2 size={14} /> Delete</button>}
          </div>

          <button type="button" onClick={() => rollTable(activeTable)} style={rollButtonStyle}><Dice6 size={22} /> Roll {activeTable.die || 'd20'}</button>

          {lastRoll ? (
            <section style={resultStyle}>
              <p style={resultMetaStyle}>{lastRoll.tableName} · {lastRoll.die} result</p>
              <strong style={rollNumberStyle}>{lastRoll.roll}</strong>
              <p style={resultTextStyle}>{lastRoll.text}</p>
              <div style={buttonRowStyle}>
                <button type="button" onClick={() => copyText(resultText)} style={secondaryButtonStyle}><Copy size={14} /> Copy</button>
                <button type="button" onClick={() => onSaveAsNote?.(resultText)} style={secondaryButtonStyle}>Add to Notes</button>
                <button type="button" onClick={sendResultToDisplay} style={primaryButtonStyle}><Send size={14} /> Send to TV</button>
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
const fieldStyle = { display: 'grid', gap: 5 };
const labelStyle = { color: theme.muted, fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const inputStyle = { minHeight: 36, background: theme.bg, color: theme.text, border: `1px solid ${theme.lineStrong}`, padding: '0 9px', outline: 'none', fontFamily: fontStack };
const textareaStyle = { minHeight: 130, background: theme.bg, color: theme.text, border: `1px solid ${theme.lineStrong}`, padding: 9, outline: 'none', fontFamily: fontStack, resize: 'vertical' };
const buttonRowStyle = { display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' };
const primaryButtonStyle = { minHeight: 34, border: 0, background: theme.red, color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 34, border: 0, background: theme.bg, color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const dangerButtonStyle = { minHeight: 32, border: 0, background: '#661111', color: theme.text, padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };

if (typeof document !== 'undefined' && !document.getElementById('live-roll-tables-panel-css')) {
  const style = document.createElement('style');
  style.id = 'live-roll-tables-panel-css';
  style.textContent = `
    @media (max-width: 860px) {
      [data-testid="live-roll-tables-panel"] > div {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(style);
}