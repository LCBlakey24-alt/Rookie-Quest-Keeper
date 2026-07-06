import { Backpack, Book, CalendarDays, Church, Clock, Compass, FileJson, FileText, Globe, Mail, Map, Monitor, ScrollText, Sparkles, Swords, Upload, UserCircle, Users } from 'lucide-react';

export const tabGroups = [
  { id: 'command', label: 'Command', icon: Monitor, tabs: [
    { id: 'command-centre', icon: Monitor, label: 'Command Centre' },
    { id: 'tonight', icon: CalendarDays, label: "Tonight's Session" },
    { id: 'players', icon: Users, label: 'Players & Invites' },
  ] },
  { id: 'prep', label: 'Prep', icon: CalendarDays, tabs: [
    { id: 'story-arcs', icon: ScrollText, label: 'Story Arcs' },
    { id: 'ingame-notes', icon: FileText, label: 'Session Notes' },
    { id: 'handouts', icon: Mail, label: 'Secrets & Handouts' },
  ] },
  { id: 'world', label: 'World', icon: Globe, tabs: [
    { id: 'setting', icon: Book, label: 'World Overview' },
    { id: 'maps', icon: Compass, label: 'World Atlas' },
    { id: 'chronicle', icon: Clock, label: 'Chronicle' },
  ] },
  { id: 'people', label: 'People', icon: UserCircle, tabs: [
    { id: 'npcs', icon: UserCircle, label: 'NPCs & Figures' },
    { id: 'gods', icon: Church, label: 'Powers & Factions' },
  ] },
  { id: 'table', label: 'Table', icon: Swords, tabs: [
    { id: 'combat', icon: Swords, label: 'Encounters' },
    { id: 'battle-maps', icon: Map, label: 'Combat Maps' },
    { id: 'inventory', icon: Backpack, label: 'Inventory & Rewards' },
  ] },
  { id: 'library', label: 'Library', icon: Backpack, tabs: [
    { id: 'playtest-packs', icon: Sparkles, label: 'Tia Karta Pack' },
    { id: 'uploads', icon: Upload, label: 'Uploads' },
    { id: 'campaign-rules', icon: Book, label: 'Campaign Setup' },
    { id: 'world-builder', icon: Globe, label: 'World Builder' },
    { id: 'tools', icon: ScrollText, label: 'Optional Tools' },
    { id: 'rules-packs', icon: FileJson, label: 'Rules Packs' },
  ] },
];

export const allTabs = tabGroups.flatMap(group => group.tabs.map(tab => ({ ...tab, groupId: group.id, groupLabel: group.label })));
export const validTabIds = new Set(allTabs.map(tab => tab.id));
