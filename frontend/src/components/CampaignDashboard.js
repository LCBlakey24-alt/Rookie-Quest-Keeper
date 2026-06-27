import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft, Backpack, Book, CalendarDays, ChevronDown, ChevronRight, Church, Clock, Compass, FileJson, FileText, Globe, Mail, Map, MapPin, Menu, Monitor, RefreshCw, ScrollText, Sparkles, Swords, Upload, UserCircle, Users, Wand2, X } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import CampaignSettingTab from '@/components/tabs/CampaignSettingTab';
import CampaignRulesTab from '@/components/tabs/CampaignRulesTab';
import GodsTab from '@/components/tabs/GodsTab';
import LocationsTab from '@/components/tabs/LocationsTab';
import PlayersTab from '@/components/tabs/PlayersTab';
import InGameNotesTab from '@/components/tabs/InGameNotesTab';
import MapsTab from '@/components/tabs/MapsTab';
import SessionRecapAI from '@/components/SessionRecapAI';
import AISessionPlanner from '@/components/gm/AISessionPlanner';
import StoryArcTracker from '@/components/gm/StoryArcTracker';
import WorldBuilderTab from '@/components/tabs/WorldBuilderTab';
import MapsConsolidatedTab from '@/components/tabs/MapsConsolidatedTab';
import NPCsConsolidatedTab from '@/components/tabs/NPCsConsolidatedTab';
import InventoryConsolidatedTab from '@/components/tabs/InventoryConsolidatedTab';
import ChronicleConsolidatedTab from '@/components/tabs/ChronicleConsolidatedTab';
import CombatConsolidatedTab from '@/components/tabs/CombatConsolidatedTab';
import ToolsConsolidatedTab from '@/components/tabs/ToolsConsolidatedTab';
import UploadTab from '@/components/gm/UploadTab';
import PlayerInvitePanel from '@/components/gm/PlayerInvitePanel';
import PrivatePlaytestPacksTab from '@/components/tabs/PrivatePlaytestPacksTab';
import { GMHandoutsTab } from '@/components/tabs/HandoutsTab';
import TonightsSessionTab from '@/components/tabs/TonightsSessionTab';

const fontStack = 'var(--rq-body-font, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

const theme = {
  bg: { black: '#242424', panel: '#2f2f2f', card: '#3a3a3a', hover: '#444444' },
  accent: { primary: '#d00000', subtle: 'rgba(208,0,0,0.18)', red: '#d00000', redSubtle: 'rgba(208,0,0,0.18)', hover: '#ff3b3b' },
  text: { white: '#ffffff', primary: '#ffffff', secondary: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)' },
  border: 'rgba(255,255,255,0.16)',
  gradient: '#d00000',
};

const sessionPrepTheme = {
  bg: { primary: '#242424', surface: '#2f2f2f', elevated: '#3a3a3a', panel: '#2f2f2f', card: '#3a3a3a', hover: '#444444' },
  accent: { primary: '#d00000', secondary: '#d00000', gold: '#d00000', orange: '#ff3b3b', hover: '#ff3b3b', subtle: 'rgba(208,0,0,0.18)', glow: 'none', gm: '#d00000', gmSubtle: 'rgba(208,0,0,0.18)' },
  text: { primary: '#ffffff', secondary: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)' },
  border: 'rgba(255,255,255,0.16)',
  gradient: '#d00000',
};

const workspacePanelStyle = { background: theme.bg.panel, border: `1px solid ${theme.border}`, borderRadius: 0, padding: 'clamp(14px, 2vw, 24px)', minHeight: 500, minWidth: 0, boxShadow: 'none' };
const desktopContextStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 14, padding: '14px 16px', background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: 0, minWidth: 0 };
const desktopEyebrowStyle = { margin: '0 0 4px', color: theme.text.muted, fontSize: 11, fontWeight: 900, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: fontStack };
const desktopTitleStyle = { margin: 0, color: theme.text.primary, fontSize: 'clamp(20px, 2vw, 28px)', fontWeight: 950, overflowWrap: 'anywhere', fontFamily: fontStack };
const desktopPillStyle = { color: theme.text.secondary, border: `1px solid ${theme.border}`, background: theme.bg.panel, padding: '6px 10px', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7, whiteSpace: 'nowrap', fontFamily: fontStack };

const tabGroups = [
  { id: 'command', label: 'Command', icon: Monitor, tabs: [
    { id: 'command-centre', icon: Monitor, label: 'Command Centre' },
    { id: 'tonight', icon: CalendarDays, label: "Tonight's Session" },
    { id: 'players', icon: Users, label: 'Players & Invites' },
  ] },
  { id: 'prep', label: 'Prep', icon: CalendarDays, tabs: [
    { id: 'story-arcs', icon: ScrollText, label: 'Story Arcs' },
    { id: 'session-prep', icon: Wand2, label: 'Session Prep' },
    { id: 'ingame-notes', icon: FileText, label: 'Session Notes' },
    { id: 'handouts', icon: Mail, label: 'Lore / Secrets / Handouts' },
    { id: 'session-recap', icon: Sparkles, label: 'Session Recap' },
  ] },
  { id: 'world', label: 'World Bible', icon: Globe, tabs: [
    { id: 'campaign-rules', icon: Book, label: 'Campaign Setup' },
    { id: 'setting', icon: Book, label: 'World Overview' },
    { id: 'world', icon: Globe, label: 'World Builder' },
    { id: 'locations', icon: MapPin, label: 'Locations' },
    { id: 'maps', icon: Compass, label: 'Maps' },
    { id: 'chronicle', icon: Clock, label: 'Chronicle' },
    { id: 'gods', icon: Church, label: 'Powers & Factions' },
  ] },
  { id: 'cast', label: 'Cast', icon: UserCircle, tabs: [
    { id: 'npcs', icon: UserCircle, label: 'NPCs & Figures' },
    { id: 'players', icon: Users, label: 'Players' },
  ] },
  { id: 'live', label: 'Live Table', icon: Swords, tabs: [
    { id: 'combat', icon: Swords, label: 'Encounters' },
    { id: 'battle-maps', icon: Map, label: 'Battle Maps' },
    { id: 'tools', icon: ScrollText, label: 'GM Tools' },
  ] },
  { id: 'library', label: 'Library', icon: Backpack, tabs: [
    { id: 'inventory', icon: Backpack, label: 'Inventory & Items' },
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
  const [activeTab, setActiveTab] = useState('command-centre');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [invite, setInvite] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);

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

  const fetchInviteCode = async () => {
    try {
      setInviteLoading(true);
      const response = await apiClient.get(`/campaign-invites/${campaignId}`);
      setInvite(response.data);
      return response.data;
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Could not load join code');
      return null;
    } finally {
      setInviteLoading(false);
    }
  };

  const rotateInviteCode = async () => {
    try {
      setInviteLoading(true);
      const response = await apiClient.post(`/campaign-invites/${campaignId}`);
      setInvite(response.data);
      toast.success('New join code generated');
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Could not generate join code');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInviteCode = async () => {
    const loadedInvite = invite || await fetchInviteCode();
    const code = loadedInvite?.join_code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Join code copied');
    } catch {
      toast.info(`Join code: ${code}`);
    }
  };

  const renderTabButton = (tab, isNested = false) => {
    const isActive = activeTab === tab.id;
    const isHovered = hoveredTab === tab.id && !isActive;
    const Icon = tab.icon;
    return (
      <button key={tab.id} onClick={() => handleTabClick(tab.id)} onMouseEnter={() => setHoveredTab(tab.id)} onMouseLeave={() => setHoveredTab(null)} data-testid={`${tab.id}-tab`} style={{ position: 'relative', padding: isNested ? '10px 16px 10px 32px' : '12px 16px', border: 'none', background: isActive ? theme.accent.primary : (isHovered ? theme.accent.primary : 'transparent'), color: theme.text.white, fontWeight: 850, fontSize: isNested ? 13 : 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%', minHeight: isNested ? 40 : 44, borderRadius: 0, margin: 0, maxWidth: '100%', fontFamily: fontStack }}>
        <Icon size={isNested ? 16 : 18} style={{ color: theme.text.white, opacity: isActive ? 1 : 0.9 }} />
        <span style={{ flex: 1 }}>{tab.label}</span>
      </button>
    );
  };

  const renderGroupHeader = (group) => {
    const isExpanded = !collapsedGroups[group.id];
    const hasActiveTab = group.tabs.some(tab => tab.id === activeTab);
    const Icon = group.icon;
    return (
      <button key={`group-${group.id}`} onClick={() => toggleGroup(group.id)} data-testid={`group-${group.id}`} aria-expanded={isExpanded ? 'true' : 'false'} style={{ padding: '11px 16px', border: 'none', borderTop: `1px solid ${theme.border}`, background: hasActiveTab ? theme.bg.card : 'transparent', color: hasActiveTab ? theme.text.white : theme.text.muted, fontWeight: 950, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginTop: 0, fontFamily: fontStack }}>
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Icon size={14} />
        <span>{group.label}</span>
      </button>
    );
  };

  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>;

  if (!campaign) {
    return (
      <main style={{ minHeight: '100dvh', background: theme.bg.black, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: fontStack }}>
        <section style={{ maxWidth: 520, width: '100%', background: theme.bg.panel, border: `1px solid ${theme.border}`, padding: 24, textAlign: 'center' }}>
          <AlertTriangle size={40} color={theme.accent.primary} style={{ marginBottom: 12 }} />
          <h1 style={{ color: theme.text.primary, fontSize: 24, fontWeight: 950, margin: '0 0 8px' }}>Campaign could not be loaded</h1>
          <p style={{ color: theme.text.secondary, lineHeight: 1.55, margin: '0 0 18px' }}>{loadError}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button onClick={fetchCampaign} style={primaryButtonStyle}><RefreshCw size={16} /> Retry</Button>
            <Button onClick={() => navigate('/home')} style={secondaryButtonStyle}><ArrowLeft size={16} /> Back to Home</Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: theme.bg.black, display: 'flex', flexDirection: 'column', overflow: 'visible', fontFamily: fontStack, color: theme.text.white }}>
      <header style={{ background: theme.bg.panel, borderBottom: `1px solid ${theme.border}`, padding: '10px 14px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="mobile-menu-toggle" style={{ background: theme.bg.card, border: 'none', cursor: 'pointer', color: theme.text.white, display: 'none', padding: 8 }}>{mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}</button>
            <Button data-testid="back-to-home-btn" onClick={() => navigate('/home')} style={squareIconButtonStyle}><ArrowLeft size={20} color={theme.text.white} /></Button>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <h1 style={{ fontSize: 'clamp(18px, 4vw, 25px)', color: theme.text.primary, margin: '0 0 4px', fontWeight: 950, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 'min(58vw, 720px)', fontFamily: fontStack }}>{campaign.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><span style={redTagStyle}>GM Command Centre</span><span style={{ fontSize: 11, color: theme.text.muted, fontWeight: 850 }}>{campaign.system || '5e Campaign'}</span></div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button onClick={copyInviteCode} style={secondaryButtonStyle}>{inviteLoading ? 'Loading Code...' : 'Copy Join Code'}</Button>
            <Button data-testid="open-dm-screen-btn" onClick={handleOpenGMScreen} style={primaryButtonStyle}><Monitor size={18} /> <span className="desktop-only">Open </span>Live Play Mode</Button>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'visible', position: 'relative' }}>
        <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`} style={{ width: 280, minWidth: 280, background: theme.bg.panel, borderRight: `1px solid ${theme.border}`, padding: '0 0 16px', overflowY: 'auto', transition: 'transform 0.3s ease' }}>
          <h3 style={{ color: theme.text.muted, fontSize: 11, fontWeight: 950, letterSpacing: '1.5px', textTransform: 'uppercase', margin: 0, padding: '16px' }}>Campaign Tools</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>{tabGroups.map(group => { const isExpanded = !collapsedGroups[group.id]; return <div key={group.id}>{renderGroupHeader(group)}{isExpanded && group.tabs.map(tab => renderTabButton(tab, true))}</div>; })}</div>
        </aside>
        {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 39, display: 'none' }} />}
        <main style={{ flex: 1, overflowY: 'visible', padding: 'clamp(12px, 2vw, 28px)', minWidth: 0 }}>
          {activeTabMeta && activeTab !== 'command-centre' && (
            <div className="desktop-context" style={desktopContextStyle}>
              <div style={{ minWidth: 0 }}>
                <p style={desktopEyebrowStyle}>{activeTabMeta.group.label}</p>
                <h2 style={desktopTitleStyle}>{activeTabMeta.tab.label}</h2>
              </div>
              <span style={desktopPillStyle}>GM workspace</span>
            </div>
          )}
          <section style={workspacePanelStyle}>
            {activeTab === 'command-centre' && (
              <GMCommandCentre campaign={campaign} invite={invite} inviteLoading={inviteLoading} onOpenTab={handleTabClick} onOpenLive={handleOpenGMScreen} onFetchInvite={fetchInviteCode} onRotateInvite={rotateInviteCode} onCopyInvite={copyInviteCode} />
            )}
            {activeTab === 'story-arcs' && <StoryArcTracker campaignId={campaignId} />}
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
            {activeTab === 'campaign-rules' && <CampaignRulesTab campaignId={campaignId} />}
            {activeTab === 'tonight' && <TonightsSessionTab campaignId={campaignId} onOpenTab={handleTabClick} />}
            {activeTab === 'session-prep' && <AISessionPlanner theme={sessionPrepTheme} campaignId={campaignId} />}
            {activeTab === 'session-recap' && <SessionRecapAI campaignId={campaignId} />}
            {activeTab === 'handouts' && <GMHandoutsTab campaignId={campaignId} />}
            {activeTab === 'players' && <><PlayerInvitePanel campaignId={campaignId} /><PlayersTab campaignId={campaignId} /></>}
            {activeTab === 'ingame-notes' && <InGameNotesTab campaignId={campaignId} />}
          </section>
        </main>
      </div>

      <style>{`@media (max-width: 640px) { .desktop-only { display: none !important; } } @media (max-width: 1024px) { .desktop-context { display: none !important; } .mobile-menu-toggle { display: block !important; } .sidebar { position: fixed !important; top: 0; left: 0; bottom: 0; z-index: 40; transform: translateX(-100%); } .sidebar { width: min(88vw, 300px) !important; min-width: min(88vw, 300px) !important; } .sidebar.mobile-open { transform: translateX(0); } .mobile-overlay { display: block !important; } } @media (hover: none) and (pointer: coarse) { button, .clickable-box { min-height: 44px !important; min-width: 44px !important; } }`}</style>
    </div>
  );
}

function GMCommandCentre({ campaign, invite, inviteLoading, onOpenTab, onOpenLive, onFetchInvite, onRotateInvite, onCopyInvite }) {
  const commandCards = [
    { title: "Tonight's Session", text: 'Plan what matters right now: scenes, hooks, reminders, and live table flow.', meta: 'Run tonight', icon: CalendarDays, tab: 'tonight' },
    { title: 'Story Arcs', text: 'Organise campaign arcs, chapters/sessions, scenes, and planned combat beats.', meta: 'Campaign structure', icon: ScrollText, tab: 'story-arcs' },
    { title: 'Players & Invites', text: 'Manage players, check joined characters, and share the campaign join code.', meta: 'Table access', icon: Users, tab: 'players' },
    { title: 'World Overview', text: 'Store the campaign premise, tone, big truths, and public world context.', meta: 'World bible', icon: Globe, tab: 'setting' },
    { title: 'Locations', text: 'Cities, regions, dungeons, travel points, bases, and important places.', meta: 'Places', icon: MapPin, tab: 'locations' },
    { title: 'NPCs & Figures', text: 'Allies, rivals, villains, patrons, rulers, shopkeepers, and recurring faces.', meta: 'Cast', icon: UserCircle, tab: 'npcs' },
    { title: 'Encounters', text: 'Build and manage combat encounters, enemies, and live table fight tools.', meta: 'Combat', icon: Swords, tab: 'combat' },
    { title: 'Powers & Factions', text: 'Gods, guilds, orders, governments, cults, houses, and power groups.', meta: 'Influence', icon: Church, tab: 'gods' },
    { title: 'Chronicle', text: 'Campaign timeline, session history, consequences, and what has changed.', meta: 'History', icon: Clock, tab: 'chronicle' },
    { title: 'Inventory & Items', text: 'Magic items, loot, equipment, rewards, and anything you may hand to players.', meta: 'Loot', icon: Backpack, tab: 'inventory' },
    { title: 'Lore / Secrets / Handouts', text: 'Player-facing reveals, private information, letters, clues, and shared material.', meta: 'Reveal control', icon: Mail, tab: 'handouts' },
    { title: 'Uploads', text: 'Maps, reference files, images, notes, and imported campaign material.', meta: 'Files', icon: Upload, tab: 'uploads' },
  ];

  return (
    <div style={commandShellStyle}>
      <section style={commandHeroStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={desktopEyebrowStyle}>Campaign Command Centre</p>
          <h2 style={commandTitleStyle}>{campaign?.name || 'Campaign'}</h2>
          <p style={commandSubtitleStyle}>Build the campaign from reusable GM tools: structure the arc, prep sessions, organise lore, then run the table from Live Play.</p>
        </div>
        <div style={heroActionsStyle}>
          <button type="button" onClick={() => onOpenTab('story-arcs')} style={secondaryButtonStyle}><ScrollText size={18} /> Story Arcs</button>
          <button type="button" onClick={onOpenLive} style={primaryButtonStyle}><Monitor size={18} /> Live Play Mode</button>
          <button type="button" onClick={onCopyInvite} style={secondaryButtonStyle}>{inviteLoading ? 'Loading...' : 'Copy Join Code'}</button>
        </div>
      </section>

      <section style={quickStatusStyle}>
        <StatusBox label="Rules" value={campaign?.system || campaign?.rules_edition || 'Campaign'} />
        <StatusBox label="World" value={campaign?.world_name || campaign?.setting || 'Not set'} />
        <StatusBox label="Join Code" value={invite?.join_code || 'Not loaded'} />
        <StatusBox label="Mode" value="GM" />
      </section>

      <section style={invitePanelStyle}>
        <div>
          <p style={desktopEyebrowStyle}>Player access</p>
          <h3 style={sectionHeadingStyle}>Campaign join code</h3>
          <p style={commandSubtitleStyle}>Generate or copy a code so players can join with their own characters.</p>
        </div>
        <div style={joinCodeActionStyle}>
          <div style={compactCodeStyle}>{invite?.join_code || '------'}</div>
          <button type="button" onClick={onFetchInvite} disabled={inviteLoading} style={secondaryButtonStyle}>{inviteLoading ? 'Loading...' : 'Get Code'}</button>
          <button type="button" onClick={onRotateInvite} disabled={inviteLoading} style={secondaryButtonStyle}>New Code</button>
          <button type="button" onClick={onCopyInvite} disabled={inviteLoading} style={primaryButtonStyle}>Copy</button>
        </div>
      </section>

      <section style={commandGridStyle}>{commandCards.map(card => <CommandCard key={card.title} {...card} onOpenTab={onOpenTab} />)}</section>
    </div>
  );
}

function StatusBox({ label, value }) {
  return <div style={statusBoxStyle}><span style={statusValueStyle}>{value}</span><span style={statusLabelStyle}>{label}</span></div>;
}

function CommandCard({ title, text, meta, icon: Icon, tab, onOpenTab }) {
  return (
    <button type="button" onClick={() => onOpenTab(tab)} style={commandCardStyle}>
      <span style={commandAccentStyle} />
      <span style={commandCardBodyStyle}>
        <span style={commandCardTopStyle}><Icon size={18} /> <strong>{title}</strong></span>
        <span style={commandCardTextStyle}>{text}</span>
        <span style={commandCardMetaStyle}>{meta}</span>
      </span>
      <span style={commandArrowStyle}>›</span>
    </button>
  );
}

const primaryButtonStyle = { minHeight: 42, border: 0, borderRadius: 0, background: '#d00000', color: '#ffffff', padding: '0 14px', fontWeight: 950, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: fontStack, textDecoration: 'none' };
const secondaryButtonStyle = { minHeight: 42, border: 0, borderRadius: 0, background: '#3a3a3a', color: '#ffffff', padding: '0 14px', fontWeight: 900, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: fontStack };
const squareIconButtonStyle = { minWidth: 44, minHeight: 44, background: theme.bg.card, border: 0, borderRadius: 0, display: 'grid', placeItems: 'center' };
const redTagStyle = { fontSize: 11, color: '#ffffff', background: '#d00000', padding: '4px 8px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.06em' };
const commandShellStyle = { display: 'grid', gap: 18 };
const commandHeroStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', borderBottom: `1px solid ${theme.border}`, paddingBottom: 16 };
const commandTitleStyle = { margin: '2px 0 8px', color: '#ffffff', fontSize: 'clamp(30px, 5vw, 54px)', lineHeight: 1, fontWeight: 950, letterSpacing: '-0.04em', fontFamily: fontStack };
const commandSubtitleStyle = { margin: 0, color: theme.text.secondary, lineHeight: 1.48, maxWidth: 720, fontFamily: fontStack };
const heroActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' };
const quickStatusStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}` };
const statusBoxStyle = { minHeight: 70, display: 'grid', alignContent: 'center', gap: 4, padding: '12px 14px', borderRight: `1px solid ${theme.border}` };
const statusValueStyle = { color: '#ffffff', fontSize: 20, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: fontStack };
const statusLabelStyle = { color: theme.text.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 900, fontFamily: fontStack };
const invitePanelStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', background: theme.bg.card, border: `1px solid ${theme.border}`, padding: 16 };
const sectionHeadingStyle = { margin: '2px 0 6px', color: '#ffffff', fontSize: 22, fontWeight: 950, fontFamily: fontStack };
const joinCodeActionStyle = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' };
const compactCodeStyle = { minHeight: 42, display: 'grid', placeItems: 'center', background: '#242424', border: `1px solid ${theme.border}`, color: '#ffffff', padding: '0 14px', fontSize: 22, fontWeight: 950, letterSpacing: '0.14em', fontFamily: fontStack };
const commandGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 0, borderTop: `1px solid ${theme.border}` };
const commandCardStyle = { minHeight: 156, display: 'flex', gap: 12, alignItems: 'flex-start', textAlign: 'left', border: 0, borderBottom: `1px solid ${theme.border}`, background: 'transparent', color: '#ffffff', padding: '18px 16px 18px 0', cursor: 'pointer', borderRadius: 0, fontFamily: fontStack };
const commandAccentStyle = { width: 6, height: 48, background: '#d00000', flex: '0 0 auto' };
const commandCardBodyStyle = { display: 'grid', gap: 8, minWidth: 0, flex: 1 };
const commandCardTopStyle = { display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff', fontSize: 17, fontWeight: 950, fontFamily: fontStack };
const commandCardTextStyle = { color: theme.text.secondary, lineHeight: 1.42, fontSize: 14, fontFamily: fontStack };
const commandCardMetaStyle = { color: theme.text.muted, fontSize: 11, fontWeight: 950, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: fontStack };
const commandArrowStyle = { color: '#ffffff', opacity: 0.72, fontSize: 28, lineHeight: 1 };

export default CampaignDashboard;
