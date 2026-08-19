import { Backpack, Book, Church, Clock, FileJson, FileText, Globe, Mail, Map, Monitor, ScrollText, Swords, Upload, UserCircle, Users } from 'lucide-react';

export const tabGroups = [
  { id: 'campaign', label: 'Campaign', icon: Monitor, tabs: [
    { id: 'command-centre', icon: Monitor, label: 'GM Home' },
    { id: 'story-arcs', icon: ScrollText, label: 'Quests' },
    { id: 'players', icon: Users, label: 'Players' },
  ] },
  { id: 'world', label: 'World', icon: Globe, tabs: [
    { id: 'npcs', icon: UserCircle, label: 'NPCs' },
    { id: 'maps', icon: Map, label: 'Maps & Locations' },
    { id: 'gods', icon: Church, label: 'Factions & Powers' },
    { id: 'setting', icon: Book, label: 'World Notes' },
    { id: 'chronicle', icon: Clock, label: 'Timeline & Calendar' },
  ] },
  { id: 'prep', label: 'Prep', icon: Swords, tabs: [
    { id: 'combat', icon: Swords, label: 'Encounters' },
    { id: 'inventory', icon: Backpack, label: 'Loot & Rewards' },
    { id: 'ingame-notes', icon: FileText, label: 'Notes' },
    { id: 'handouts', icon: Mail, label: 'Handouts' },
  ] },
  { id: 'more', label: 'More', icon: Book, tabs: [
    { id: 'tools', icon: ScrollText, label: 'Tables & References' },
    { id: 'campaign-rules', icon: Book, label: 'Rules & Settings' },
    { id: 'world-builder', icon: Globe, label: 'World Builder' },
    { id: 'uploads', icon: Upload, label: 'Uploads' },
    { id: 'playtest-packs', icon: FileJson, label: 'Playtest Packs' },
  ] },
];

export const allTabs = tabGroups.flatMap(group => group.tabs.map(tab => ({ ...tab, groupId: group.id, groupLabel: group.label })));
export const validTabIds = new Set(allTabs.map(tab => tab.id));
