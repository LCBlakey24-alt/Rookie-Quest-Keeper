import { Backpack, Book, CalendarDays, Church, Clock, FileJson, FileText, Globe, Mail, Map, Monitor, ScrollText, Swords, Upload, UserCircle, Users } from 'lucide-react';

export const tabGroups = [
  { id: 'start', label: 'Start Here', icon: Monitor, tabs: [
    { id: 'command-centre', icon: Monitor, label: 'GM Home' },
    { id: 'tonight', icon: CalendarDays, label: "Tonight's Session" },
    { id: 'players', icon: Users, label: 'Players & Join Code' },
  ] },
  { id: 'world', label: 'My World', icon: Globe, tabs: [
    { id: 'maps', icon: Map, label: 'Maps & Locations' },
    { id: 'setting', icon: Book, label: 'World Notes' },
    { id: 'chronicle', icon: Clock, label: 'Timeline' },
  ] },
  { id: 'people', label: 'NPCs', icon: UserCircle, tabs: [
    { id: 'npcs', icon: UserCircle, label: 'NPCs' },
    { id: 'gods', icon: Church, label: 'Factions & Powers' },
  ] },
  { id: 'combat', label: 'Combat', icon: Swords, tabs: [
    { id: 'combat', icon: Swords, label: 'Premade Combat' },
    { id: 'battle-maps', icon: Map, label: 'Battle Maps' },
    { id: 'inventory', icon: Backpack, label: 'Loot & Rewards' },
  ] },
  { id: 'sessions', label: 'Notes & Handouts', icon: FileText, tabs: [
    { id: 'ingame-notes', icon: FileText, label: 'Session Notes' },
    { id: 'handouts', icon: Mail, label: 'Handouts & Secrets' },
    { id: 'uploads', icon: Upload, label: 'Uploads' },
  ] },
  { id: 'setup', label: 'Setup', icon: Book, tabs: [
    { id: 'campaign-rules', icon: Book, label: 'Campaign Settings' },
    { id: 'world-builder', icon: Globe, label: 'World Builder' },
    { id: 'tools', icon: ScrollText, label: 'Extra Tools' },
    { id: 'playtest-packs', icon: FileJson, label: 'Playtest Packs' },
  ] },
];

export const allTabs = tabGroups.flatMap(group => group.tabs.map(tab => ({ ...tab, groupId: group.id, groupLabel: group.label })));
export const validTabIds = new Set(allTabs.map(tab => tab.id));