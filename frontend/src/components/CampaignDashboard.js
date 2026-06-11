import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft, Backpack, Book, CalendarDays, ChevronDown, ChevronRight, Church, Clock, Compass, FileJson, FileText, Globe, Mail, Map, MapPin, Menu, Monitor, RefreshCw, ScrollText, Sparkles, Swords, Upload, UserCircle, Users, Wand2, X } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import CampaignSettingTab from '@/components/tabs/CampaignSettingTab';
import GodsTab from '@/components/tabs/GodsTab';
import LocationsTab from '@/components/tabs/LocationsTab';
import PlayersTab from '@/components/tabs/PlayersTab';
import InGameNotesTab from '@/components/tabs/InGameNotesTab';
import MapsTab from '@/components/tabs/MapsTab';
import SessionRecapAI from '@/components/SessionRecapAI';
import AISessionPlanner from '@/components/gm/AISessionPlanner';
import WorldBuilderTab from '@/components/tabs/WorldBuilderTab';
import MapsConsolidatedTab from '@/components/tabs/MapsConsolidatedTab';
import NPCsConsolidatedTab from '@/components/tabs/NPCsConsolidatedTab';
import InventoryConsolidatedTab from '@/components/tabs/InventoryConsolidatedTab';
import ChronicleConsolidatedTab from '@/components/tabs/ChronicleConsolidatedTab';
import CombatConsolidatedTab from '@/components/tabs/CombatConsolidatedTab';
import ToolsConsolidatedTab from '@/components/tabs/ToolsConsolidatedTab';
import UploadTab from '@/components/gm/UploadTab';
import PrivatePlaytestPacksTab from '@/components/tabs/PrivatePlaytestPacksTab';
import { GMHandoutsTab } from '@/components/tabs/HandoutsTab';
import TonightsSessionTab from '@/components/tabs/TonightsSessionTab';

const theme = {
  bg: { black: '#080B1A', panel: 'rgba(18,23,42,0.96)', card: 'rgba(23,30,51,0.96)' },
  accent: { primary: '#7C3AED', subtle: 'rgba(124,58,237,0.12)', red: '#7C3AED', redSubtle: 'rgba(124,58,237,0.12)' },
  text: { white: '#FFFFFF', primary: '#FFFFFF', secondary: '#D1D5DB', muted: '#9CA3AF' },
  border: 'rgba(124,58,237,0.42)',
  gradient: '#7C3AED',
};


const sessionPrepTheme = {
  bg: {
    primary: '#080B1A',
    surface: '#12172A',
    elevated: '#202A46',
    panel: '#12172A',
    card: '#171E33',
    hover: 'rgba(124, 58, 237, 0.12)',
  },
  accent: {
    primary: '#7C3AED',
    secondary: '#B91C1C',
    gold: '#7C3AED',
    orange: '#A78BFA',
    hover: '#A78BFA',
    subtle: 'rgba(124, 58, 237, 0.12)',
    glow: 'none',
    gm: '#7C3AED',
    gmSubtle: 'rgba(124, 58, 237, 0.12)',
  },
  text: { primary: '#FFFFFF', secondary: '#D1D5DB', muted: '#9CA3AF' },
  border: 'rgba(124, 58, 237, 0.42)',
  gradient: '#7C3AED',
};


const workspacePanelStyle = {
  background: 'linear-gradient(180deg, rgba(18,23,42,0.94), rgba(8,11,26,0.96))',
  border: `1px solid ${theme.border}`,
  borderRadius: 8,
  padding: 'clamp(14px, 2vw, 24px)',
  minHeight: 500,
  minWidth: 0,
  boxShadow: '0 18px 50px rgba(0,0,0,0.28)',
};

const desktopContextStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  marginBottom: 14,
  padding: '14px 16px',
  background: 'rgba(255,255,255,0.035)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  minWidth: 0,
};
const desktopEyebrowStyle = { margin: '0 0 4px', color: theme.accent.primary, fontSize: 11, fontWeight: 900, letterSpacing: 1.2, textTransform: 'uppercase' };
const desktopTitleStyle = { margin: 0, color: theme.text.primary, fontSize: 'clamp(20px, 2vw, 28px)', fontWeight: 900, overflowWrap: 'anywhere' };
const desktopPillStyle = { color: theme.text.secondary, border: `1px solid ${theme.border}`, background: theme.accent.subtle, padding: '6px 10px', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7, whiteSpace: 'nowrap' };

const tabGroups = [
  { id: 'overview', label: 'Overview', icon: Book, tabs: [
    { id: 'setting', icon: Book, label: 'Campaign Overview' },
    { id: 'players', icon: Users, label: 'Players' },
    { id: 'ingame-notes', icon: FileText, label: 'Session Notes' },
  ] },
  { id: 'world', label: 'World', icon: Globe, tabs: [
    { id: 'world', icon: Globe, label: 'World Builder' },
    { id: 'maps', icon: Compass, label: 'Maps' },
    { id: 'gods', icon: Church, label: 'Gods & Factions' },
    { id: 'locations', icon: MapPin, label: 'Locations' },
    { id: 'chronicle', icon: Clock, label: 'Chronicle' },
  ] },
  { id: 'people', label: 'People', icon: UserCircle, tabs: [
    { id: 'npcs', icon: UserCircle, label: 'NPCs' },
  ] },
  { id: 'sessions', label: 'Sessions', icon: Sparkles, tabs: [
    { id: 'tonight', icon: CalendarDays, label: "Tonight's Session" },
    { id: 'session-prep', icon: Wand2, label: 'Session Prep' },
    { id: 'session-recap', icon: Sparkles, label: 'Rook Recap' },
    { id: 'handouts', icon: Mail, label: 'Handouts' },
    { id: 'tools', icon: ScrollText, label: 'Rook Tools' },
  ] },
  { id: 'combat', label: 'Combat', icon: Swords, tabs: [
    { id: 'combat', icon: Swords, label: 'Encounters' },
    { id: 'battle-maps', icon: Map, label: 'Battle Maps' },
  ] },
  { id: 'assets', label: 'Assets', icon: Backpack, tabs: [
    { id: 'inventory', icon: Backpack, label: 'Inventory' },
    { id: 'uploads', icon: Upload, label: 'Uploads' },
    { id: 'playtest-packs', icon: FileJson, label: 'Playtest Packs' },
  ] },
];

function CampaignDashboard() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('setting');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const activeGroupId = useMemo(() => {
    const group = tabGroups.find(item => item.tabs.some(tab => tab.id === activeTab));
    return group?.id || null;
  }, [activeTab]);

  const activeTabMeta = useMemo(() => {
    for (const group of tabGroups) {
      const tab = group.tabs.find(item => item.id === activeTab);
      if (tab) return { group, tab };
    }
    return null;
  }, [activeTab]);

  const fetchCampaign = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}`);
      setCampaign(response.data);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setCampaign(null);
      setLoadError(detail || 'Campaign could not be loaded. You may not have access, or the campaign failed to fetch.');
      toast.error('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { fetchCampaign(); }, [fetchCampaign]);

  const handleOpenGMScreen = () => window.open(`/gm-screen/${campaignId}`, '_blank');
  const handleTabClick = (tabId) => { setActiveTab(tabId); setMobileMenuOpen(false); };
  const toggleGroup = (groupId) => setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));

  const renderTabButton = (tab, isNested = false) => {
    const isActive = activeTab === tab.id;
    const isHovered = hoveredTab === tab.id && !isActive;
    const Icon = tab.icon;
    return (
      <button key={tab.id} onClick={() => handleTabClick(tab.id)} onMouseEnter={() => setHoveredTab(tab.id)} onMouseLeave={() => setHoveredTab(null)} data-testid={`${tab.id}-tab`} style={{ position: 'relative', padding: isNested ? '10px 16px 10px 32px' : '12px 16px', border: 'none', background: isActive ? theme.gradient : (isHovered ? theme.accent.subtle : 'transparent'), color: isActive ? '#FFFFFF' : (isHovered ? theme.text.white : theme.text.secondary), fontWeight: 800, fontSize: isNested ? 13 : 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%', minHeight: isNested ? 40 : 44, borderRadius: 0, margin: '2px 8px', maxWidth: 'calc(100% - 16px)' }}>
        <Icon size={isNested ? 16 : 18} style={{ color: isActive ? '#FFFFFF' : theme.accent.primary }} />
        <span style={{ flex: 1 }}>{tab.label}</span>
        {isHovered && !isActive && <div style={{ position: 'absolute', right: 0, top: 4, bottom: 4, width: 3, background: theme.accent.primary }} />}
      </button>
    );
  };

  const renderGroupHeader = (group) => {
    const isExpanded = !collapsedGroups[group.id] || activeGroupId === group.id;
    const hasActiveTab = group.tabs.some(tab => tab.id === activeTab);
    const Icon = group.icon;
    return (
      <button key={`group-${group.id}`} onClick={() => { if (hasActiveTab) toggleGroup(group.id); else { setCollapsedGroups(prev => ({ ...prev, [group.id]: false })); setActiveTab(group.tabs[0].id); } }} data-testid={`group-${group.id}`} style={{ padding: '10px 16px', border: 'none', background: hasActiveTab ? theme.accent.redSubtle : 'transparent', color: hasActiveTab ? theme.accent.red : theme.text.muted, fontWeight: 800, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginTop: 8 }}>
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Icon size={14} />
        <span>{group.label}</span>
      </button>
    );
  };

  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>;

  if (!campaign) {
    return (
      <main style={{ minHeight: '100dvh', background: theme.bg.black, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <section style={{ maxWidth: 520, width: '100%', background: theme.bg.panel, border: `1px solid ${theme.border}`, padding: 24, textAlign: 'center' }}>
          <AlertTriangle size={40} color={theme.accent.primary} style={{ marginBottom: 12 }} />
          <h1 style={{ color: theme.text.primary, fontSize: 24, fontWeight: 900, margin: '0 0 8px' }}>Campaign could not be loaded</h1>
          <p style={{ color: theme.text.secondary, lineHeight: 1.55, margin: '0 0 18px' }}>{loadError}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button onClick={fetchCampaign} style={{ background: theme.accent.primary, color: '#FFFFFF', border: 'none', borderRadius: 0, fontWeight: 900 }}><RefreshCw size={16} /> Retry</Button>
            <Button onClick={() => navigate('/home')} style={{ background: theme.bg.card, color: theme.text.secondary, border: `1px solid ${theme.border}`, borderRadius: 0, fontWeight: 900 }}><ArrowLeft size={16} /> Back to Home</Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: theme.bg.black, display: 'flex', flexDirection: 'column', overflow: 'visible' }}>
      <header style={{ background: theme.bg.panel, borderBottom: `1px solid ${theme.border}`, padding: '8px 14px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="mobile-menu-toggle" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: theme.accent.red, display: 'none', padding: 8 }}>{mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}</button>
            <Button data-testid="back-to-home-btn" onClick={() => navigate('/home')} style={{ minWidth: 44, minHeight: 44, background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: 0 }}><ArrowLeft size={20} color={theme.text.secondary} /></Button>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <h1 style={{ fontSize: 'clamp(18px, 4vw, 24px)', color: theme.text.primary, margin: '0 0 4px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 'min(58vw, 720px)' }}>{campaign.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><span style={{ fontSize: 11, color: theme.accent.red, background: theme.accent.redSubtle, padding: '3px 8px', fontWeight: 800 }}>Campaign Prep</span><span style={{ fontSize: 11, color: theme.text.muted, fontWeight: 800 }}>{campaign.system || '5e 2024'}</span></div>
            </div>
          </div>
          <Button data-testid="open-dm-screen-btn" onClick={handleOpenGMScreen} style={{ display: 'flex', alignItems: 'center', gap: 8, background: theme.accent.red, border: 'none', color: theme.text.white, fontSize: 'clamp(12px, 2vw, 14px)', padding: '10px 16px', minHeight: 44, fontWeight: 800, borderRadius: 0 }}><Monitor size={18} /> <span className="desktop-only">Open </span>Live Play Mode</Button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'visible', position: 'relative' }}>
        <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`} style={{ width: 260, minWidth: 260, background: theme.bg.panel, borderRight: `1px solid ${theme.border}`, padding: '16px 0', overflowY: 'auto', transition: 'transform 0.3s ease' }}>
          <h3 style={{ color: theme.accent.primary, fontSize: 11, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 12, paddingLeft: 16 }}>Campaign Tools</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{tabGroups.map(group => { const isExpanded = !collapsedGroups[group.id] || activeGroupId === group.id; return <div key={group.id}>{renderGroupHeader(group)}{isExpanded && group.tabs.map(tab => renderTabButton(tab, true))}</div>; })}</div>
        </aside>
        {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 39, display: 'none' }} />}
        <main style={{ flex: 1, overflowY: 'visible', padding: 'clamp(10px, 1.8vw, 22px)', minWidth: 0 }}>
          {activeTabMeta && (
            <div className="desktop-context" style={desktopContextStyle}>
              <div style={{ minWidth: 0 }}>
                <p style={desktopEyebrowStyle}>{activeTabMeta.group.label}</p>
                <h2 style={desktopTitleStyle}>{activeTabMeta.tab.label}</h2>
              </div>
              <span style={desktopPillStyle}>Desktop workspace</span>
            </div>
          )}
          <section style={workspacePanelStyle}>
            {activeTab === 'setting' && <CampaignSettingTab campaignId={campaignId} />}
            {activeTab === 'world' && <WorldBuilderTab campaignId={campaignId} />}
            {activeTab === 'maps' && <MapsConsolidatedTab campaignId={campaignId} />}
            {activeTab === 'gods' && <GodsTab campaignId={campaignId} />}
            {activeTab === 'npcs' && <NPCsConsolidatedTab campaignId={campaignId} />}
            {activeTab === 'locations' && <LocationsTab campaignId={campaignId} />}
            {activeTab === 'chronicle' && <ChronicleConsolidatedTab campaignId={campaignId} />}
            {activeTab === 'combat' && <CombatConsolidatedTab campaignId={campaignId} />}
            {activeTab === 'battle-maps' && <MapsTab campaignId={campaignId} />}
            {activeTab === 'tools' && <ToolsConsolidatedTab campaignId={campaignId} />}
            {activeTab === 'uploads' && <UploadTab theme={theme} campaignId={campaignId} />}
            {activeTab === 'playtest-packs' && <PrivatePlaytestPacksTab campaignId={campaignId} />}
            {activeTab === 'inventory' && <InventoryConsolidatedTab campaignId={campaignId} />}
            {activeTab === 'tonight' && <TonightsSessionTab campaignId={campaignId} onOpenTab={handleTabClick} />}
            {activeTab === 'session-prep' && <AISessionPlanner theme={sessionPrepTheme} campaignId={campaignId} />}
            {activeTab === 'session-recap' && <SessionRecapAI campaignId={campaignId} />}
            {activeTab === 'handouts' && <GMHandoutsTab campaignId={campaignId} />}
            {activeTab === 'players' && <PlayersTab campaignId={campaignId} />}
            {activeTab === 'ingame-notes' && <InGameNotesTab campaignId={campaignId} />}
          </section>
        </main>
      </div>

      <style>{`@media (max-width: 640px) { .desktop-only { display: none !important; } } @media (max-width: 1024px) { .desktop-context { display: none !important; } .mobile-menu-toggle { display: block !important; } .sidebar { position: fixed !important; top: 0; left: 0; bottom: 0; z-index: 40; transform: translateX(-100%); } .sidebar { width: min(88vw, 280px) !important; min-width: min(88vw, 280px) !important; } .sidebar.mobile-open { transform: translateX(0); } .mobile-overlay { display: block !important; } } @media (hover: none) and (pointer: coarse) { button, .clickable-box { min-height: 44px !important; min-width: 44px !important; } }`}</style>
    </div>
  );
}

export default CampaignDashboard;
