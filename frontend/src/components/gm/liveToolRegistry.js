/**
 * One list of what Live Play can open, and where it lives in the menu.
 *
 * Navigation and rendering had drifted apart. LiveSessionGridPage's switch
 * renders eighteen tools; LIVE_GRID_TOOLS listed fourteen and marked six as
 * primary, so the bestiary, the party location tracker, environment control,
 * the session planner, the soundboard, world events and the NPC relationship
 * map were reachable by no control at all. They were built, they worked, and
 * nothing in the interface pointed at them.
 *
 * Everything here maps to a tool the switch actually renders. Nothing is
 * listed that has not been implemented: a menu entry leading to an empty page
 * is worse than no entry, because the GM spends a turn of play finding out.
 */
import {
  BookOpen, Boxes, CalendarClock, Coins, Compass, Dices, FileText, Flame,
  Mail, Map, MapPin, Monitor, Music, PawPrint, Scale, ScrollText, Shield,
  Sparkles, Swords, Target, UserCircle, Users, Share2,
} from 'lucide-react';

/** Always visible, above the categories. The three a GM reaches for most. */
export const PINNED_TOOLS = [
  { id: 'overview', label: 'Run Overview', icon: Target },
  { id: 'combat', label: 'Encounters', icon: Swords },
  { id: 'notes', label: 'Quick Notes', icon: FileText },
];

/**
 * The grouped menu. Order is deliberate: who is at the table, who they meet,
 * what they fight, where they are, what the rules say, what they carry, how
 * the session is running, and the screen the players look at.
 */
export const TOOL_CATEGORIES = [
  {
    id: 'players',
    label: 'Players',
    icon: Users,
    tools: [
      { id: 'party', label: 'Party roster', icon: Users },
    ],
  },
  {
    id: 'npcs',
    label: 'NPCs',
    icon: UserCircle,
    tools: [
      { id: 'npcs', label: 'NPC roster', icon: UserCircle },
      { id: 'network', label: 'Relationships', icon: Share2 },
    ],
  },
  {
    id: 'beasts',
    label: 'Beasts',
    icon: PawPrint,
    tools: [
      // Monsters and creatures, not only animals.
      { id: 'monsters', label: 'Bestiary', icon: PawPrint },
    ],
  },
  {
    id: 'world',
    label: 'World',
    icon: Map,
    tools: [
      { id: 'story', label: 'Quests & story', icon: ScrollText },
      { id: 'maps', label: 'Maps', icon: Map },
      { id: 'location', label: 'Party location', icon: MapPin },
      { id: 'environment', label: 'Environment', icon: Flame },
      { id: 'events', label: 'World events', icon: Sparkles },
      { id: 'handouts', label: 'Handouts', icon: Mail },
    ],
  },
  {
    id: 'rules',
    label: 'Rules',
    icon: Scale,
    tools: [
      { id: 'reference-hub', label: 'Rules reference', icon: BookOpen },
      { id: 'tables', label: 'Roll tables', icon: Compass },
    ],
  },
  {
    id: 'items',
    label: 'Items',
    icon: Boxes,
    tools: [
      { id: 'loot', label: 'Loot & rewards', icon: Coins },
    ],
  },
  {
    id: 'session',
    label: 'Session',
    icon: CalendarClock,
    tools: [
      { id: 'planner', label: 'Session planner', icon: CalendarClock },
    ],
  },
  {
    id: 'tools',
    label: 'Tools & Display',
    icon: Monitor,
    tools: [
      { id: 'quick-dice', label: 'Dice roller', icon: Dices },
      { id: 'sound', label: 'Soundboard', icon: Music },
      { id: 'player-display', label: 'Player display', icon: Monitor },
    ],
  },
];

/** Shown only while a fight is unfinished; see combatCheckpoint. */
export const RESUME_COMBAT_ACTION = { id: '__resume-combat__', label: 'Resume Combat', icon: Shield };

const ALL_ENTRIES = [
  ...PINNED_TOOLS,
  ...TOOL_CATEGORIES.flatMap(category => category.tools),
];

export function allLiveToolIds() {
  return ALL_ENTRIES.map(tool => tool.id);
}

export function findLiveTool(toolId) {
  return ALL_ENTRIES.find(tool => tool.id === toolId) || null;
}

/** Which category a tool sits in, so a collapsed group can still be opened. */
export function categoryForTool(toolId) {
  return TOOL_CATEGORIES.find(category => category.tools.some(tool => tool.id === toolId)) || null;
}

export function isPinnedTool(toolId) {
  return PINNED_TOOLS.some(tool => tool.id === toolId);
}

/** A readable name for the current tool, for the phone drawer's header. */
export function liveToolLabel(toolId) {
  return findLiveTool(toolId)?.label || 'Live Play';
}

/**
 * Which groups start open.
 *
 * The group holding the current tool is always open, so the active tool is
 * discoverable even when the GM has collapsed everything else.
 */
export function initialExpandedCategories(activeToolId, remembered) {
  const base = Array.isArray(remembered) && remembered.length
    ? remembered.filter(id => TOOL_CATEGORIES.some(category => category.id === id))
    : [];
  const active = categoryForTool(activeToolId);
  if (active && !base.includes(active.id)) return [...base, active.id];
  return base;
}

/** Tools whose label or category matches a filter. Empty filter means all. */
export function filterCategories(term) {
  const needle = String(term || '').trim().toLowerCase();
  if (!needle) return TOOL_CATEGORIES;
  return TOOL_CATEGORIES
    .map(category => {
      if (category.label.toLowerCase().includes(needle)) return category;
      const tools = category.tools.filter(tool => tool.label.toLowerCase().includes(needle));
      return tools.length ? { ...category, tools } : null;
    })
    .filter(Boolean);
}
