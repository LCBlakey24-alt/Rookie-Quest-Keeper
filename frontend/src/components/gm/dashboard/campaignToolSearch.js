import { allTabs } from './campaignDashboardTabs';

// A GM should find a tool by the words used at the table, not only
// by the navigation label. These aliases never create new campaign routes.
const TOOL_ALIASES = {
  'command-centre': ['home', 'dashboard', 'overview', 'campaign', 'session summary'],
  'story-arcs': ['quest', 'story', 'scene', 'missions', 'objectives', 'plot'],
  'players': ['party', 'characters', 'character sheets', 'players', 'join'],
  'npcs': ['npc', 'relationships', 'family tree', 'connections', 'people', 'stat blocks', 'characters', 'lore'],
  'maps': ['atlas', 'world map', 'locations', 'vtt maps', 'battle maps', 'places'],
  'gods': ['gods', 'deities', 'factions', 'powers', 'guilds'],
  'setting': ['world lore', 'world notes', 'history', 'setting'],
  'chronicle': ['calendar', 'custom calendar', 'date', 'timeline', 'time', 'months', 'events'],
  'combat': ['fight', 'encounter', 'initiative', 'battle', 'monsters', 'bestiary', 'beasts', 'combat'],
  'inventory': ['loot', 'rewards', 'items', 'gold', 'treasure', 'equipment'],
  'ingame-notes': ['notes', 'session notes', 'gm notes', 'journal', 'recap'],
  'handouts': ['handouts', 'player clues', 'sharing', 'documents'],
  'tools': ['tables', 'reference', 'generators', 'dice', 'chaos tokens', 'fate tokens'],
  'campaign-rules': ['rules', 'homebrew', 'rest rules', 'settings', 'exhaustion'],
  'world-builder': ['build world', 'worldbuilder', 'world design'],
  'uploads': ['uploads', 'files', 'media', 'images', 'music', 'mp3'],
  'playtest-packs': ['playtest', 'test pack', 'export'],
};

const FREQUENT_TOOL_IDS = [
  'npcs', 'combat', 'chronicle', 'players',
  'maps', 'ingame-notes', 'story-arcs', 'handouts',
];

const normalise = value => String(value || '').trim().toLocaleLowerCase();

export function findCampaignTools(query, limit = 10) {
  const phrase = normalise(query);
  if (!phrase) {
    return FREQUENT_TOOL_IDS.map(id => allTabs.find(tab => tab.id === id)).filter(Boolean).slice(0, limit);
  }

  const parts = phrase.split(/\s+/).filter(Boolean);
  return allTabs
    .map(tab => {
      const label = normalise(tab.label);
      const group = normalise(tab.groupLabel);
      const aliases = TOOL_ALIASES[tab.id] || [];
      const words = [label, group, ...aliases];
      if (!parts.every(part => words.some(word => word.includes(part)))) return null;
      const score = label === phrase ? 100 : label.startsWith(phrase) ? 80
        : aliases.some(word => word === phrase) ? 70
        : aliases.some(word => word.startsWith(phrase)) ? 60
        : label.includes(phrase) ? 50 : 20;
      return { tab, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.tab.label.localeCompare(b.tab.label))
    .slice(0, Math.max(0, limit))
    .map(item => item.tab);
}
