/**
 * Navigation and rendering must list the same tools.
 *
 * They had drifted. LiveSessionGridPage's switch renders eighteen tools;
 * LIVE_GRID_TOOLS listed fourteen and marked six as primary, so the
 * bestiary, party location tracker, environment control, session planner,
 * soundboard, world events and the NPC relationship map were reachable by
 * no control at all. Built, working, and invisible.
 */
import fs from 'fs';
import path from 'path';
import {
  PINNED_TOOLS,
  TOOL_CATEGORIES,
  allLiveToolIds,
  categoryForTool,
  filterCategories,
  initialExpandedCategories,
  isPinnedTool,
  liveToolLabel,
} from './liveToolRegistry';

const GM_DIR = __dirname;

function renderableToolIds() {
  const page = fs.readFileSync(path.join(GM_DIR, 'LiveSessionGridPage.js'), 'utf8');
  const mode = fs.readFileSync(path.join(GM_DIR, 'LiveSessionGridMode.js'), 'utf8');
  const fromSwitch = [...page.matchAll(/case '([a-z-]+)':/g)].map(match => match[1]);
  // Mode renders these itself rather than through renderTool.
  const fromMode = [...mode.matchAll(/activeTool === '([a-z-]+)'/g)].map(match => match[1]);
  return new Set([...fromSwitch, ...fromMode]);
}

describe('the menu only offers what the app can actually open', () => {
  test('every listed tool is rendered somewhere', () => {
    const renderable = renderableToolIds();
    const missing = allLiveToolIds().filter(id => !renderable.has(id));
    expect(missing).toEqual([]);
  });

  test('no tool id is listed twice', () => {
    const ids = allLiveToolIds();
    expect(ids).toHaveLength(new Set(ids).size);
  });

  test('the tools that used to be unreachable are now in the menu', () => {
    const ids = allLiveToolIds();
    ['monsters', 'location', 'environment', 'planner', 'sound', 'events', 'network']
      .forEach(id => expect(ids).toContain(id));
  });

  test('the existing tool ids are preserved, not renamed', () => {
    const ids = allLiveToolIds();
    ['overview', 'combat', 'party', 'npcs', 'monsters', 'story', 'maps', 'location',
      'environment', 'events', 'notes', 'handouts', 'loot', 'tables', 'reference-hub',
      'quick-dice', 'player-display', 'planner', 'sound', 'network']
      .forEach(id => expect(ids).toContain(id));
  });
});

describe('the eight categories the GM was promised', () => {
  test('in order', () => {
    expect(TOOL_CATEGORIES.map(category => category.label))
      .toEqual(['Players', 'NPCs', 'Beasts', 'World', 'Rules', 'Items', 'Session', 'Tools & Display']);
  });

  test('Run Overview, Encounters and Quick Notes are pinned, not buried in a category', () => {
    expect(PINNED_TOOLS.map(tool => tool.id)).toEqual(['overview', 'combat', 'notes']);
    PINNED_TOOLS.forEach(tool => {
      expect(isPinnedTool(tool.id)).toBe(true);
      expect(categoryForTool(tool.id)).toBeNull();
    });
  });

  test('every category has at least one tool', () => {
    TOOL_CATEGORIES.forEach(category => expect(category.tools.length).toBeGreaterThan(0));
  });

  test('Beasts holds the bestiary, not only animals', () => {
    const beasts = TOOL_CATEGORIES.find(category => category.id === 'beasts');
    expect(beasts.label).toBe('Beasts');
    expect(beasts.tools.map(tool => tool.id)).toContain('monsters');
  });
});

describe('finding the current tool', () => {
  test('a tool reports the category holding it', () => {
    expect(categoryForTool('monsters').id).toBe('beasts');
    expect(categoryForTool('network').id).toBe('npcs');
    expect(categoryForTool('tables').id).toBe('rules');
  });

  test('the group holding the active tool starts open even when nothing is remembered', () => {
    expect(initialExpandedCategories('monsters', [])).toContain('beasts');
  });

  test('remembered groups are kept, and the active one is added', () => {
    expect(initialExpandedCategories('loot', ['world'])).toEqual(['world', 'items']);
  });

  test('a remembered group that no longer exists is dropped', () => {
    expect(initialExpandedCategories('loot', ['ghosts'])).toEqual(['items']);
  });

  test('a pinned tool needs no group opened', () => {
    expect(initialExpandedCategories('combat', [])).toEqual([]);
  });

  test('tools have readable names for the drawer header', () => {
    expect(liveToolLabel('monsters')).toBe('Bestiary');
    expect(liveToolLabel('combat')).toBe('Encounters');
    expect(liveToolLabel('nonsense')).toBe('Live Play');
  });
});

describe('filtering', () => {
  test('an empty filter shows everything', () => {
    expect(filterCategories('')).toHaveLength(TOOL_CATEGORIES.length);
  });

  test('a tool name narrows to its category', () => {
    const result = filterCategories('bestiary');
    expect(result).toHaveLength(1);
    expect(result[0].tools.map(tool => tool.id)).toEqual(['monsters']);
  });

  test('a category name keeps all of its tools', () => {
    const result = filterCategories('world');
    expect(result[0].tools.length).toBeGreaterThan(1);
  });

  test('no match is empty rather than everything', () => {
    expect(filterCategories('zzzz')).toEqual([]);
  });

  test('matching ignores case', () => {
    expect(filterCategories('MAPS')[0].tools.map(tool => tool.id)).toContain('maps');
  });
});
