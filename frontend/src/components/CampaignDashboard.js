import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, Backpack, Book, CalendarDays, ChevronDown, ChevronRight, Church, Clock, Compass, FileJson, FileText, Globe, Mail, Map, Menu, Monitor, RefreshCw, ScrollText, Swords, Upload, UserCircle, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/apiClient';
import CampaignSettingTab from '@/components/tabs/CampaignSettingTab';
import CampaignRulesTab from '@/components/tabs/CampaignRulesTab';
import GodsTab from '@/components/tabs/GodsTab';
import PlayersTab from '@/components/tabs/PlayersTab';
import InGameNotesTab from '@/components/tabs/InGameNotesTab';
import MapsTab from '@/components/tabs/MapsTab';
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

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "Germania One", Georgia, serif)';
const theme = {
  bg: { black: '#242424', panel: '#2f2f2f', card: '#3a3a3a', hover: '#444444' },
  accent: { primary: '#d00000', subtle: 'rgba(208,0,0,0.18)', hover: '#ff3b3b' },
  text: { white: '#ffffff', primary: '#ffffff', secondary: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)' },
  border: 'rgba(255,255,255,0.16)',
};

const tabGroups = [
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
    { id: 'uploads', icon: Upload, label: 'Uploads' },
    { id: 'campaign-rules', icon: Book, label: 'Campaign Setup' },
    { id: 'world-builder', icon: Globe, label: 'World Builder' },
    { id: 'tools', icon: ScrollText, label: 'Optional Tools' },
    { id: 'playtest-packs', icon: FileJson, label: 'Playtest Packs' },
  ] },
];

const allTabs = tabGroups.flatMap(group => group.tabs.map(tab => ({ ...tab, groupId: group.id, groupLabel: group.label })));
const validTabIds = new Set(allTabs.map(tab => tab.id));

function tabFromHash() {
  if (typeof window === 'undefined') return 'command-centre';
  const raw = window.location.hash.replace('#tab-', '').replace('#', '');
  return validTabIds.has(raw) ? raw : 'command-centre';
}

export default function CampaignDashboard() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState(tabFromHash);
  const [workspaceKey, setWorkspaceKey] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(() => ({ command: true, [allTabs.find(tab => tab.id === tabFromHash())?.groupId || 'command']: true }));
  const [invite, setInvite] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const activeTabMeta = useMemo(() => allTabs.find(tab => tab.id === activeTab) || allTabs[0], [activeTab]);
  const activeGroup = useMemo(() => tabGroups.find(group => group.id === activeTabMeta?.groupId) || tabGroups[0], [activeTabMeta?.groupId]);

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

  useEffect(() => {
    const onHashChange = () => {
      const nextTab = tabFromHash();
      if (!validTabIds.has(nextTab)) return;
      const tab = allTabs.find(item => item.id === nextTab);
      setActiveTab(nextTab);
      setWorkspaceKey(prev => prev + 1);
      setExpandedGroups(prev => ({ ...prev, [tab?.groupId || 'command']: true }));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!activeTabMeta?.groupId) return;
    setExpandedGroups(prev => ({ ...prev, [activeTabMeta.groupId]: true }));
  }, [activeTabMeta?.groupId]);

  const handleOpenGMScreen = () => navigate(`/gm-screen/${campaignId}`);

  const handleTabClick = useCallback((tabId) => {
    if (!validTabIds.has(tabId)) return;
    const tab = allTabs.find(item => item.id === tabId);
    setActiveTab(tabId);
    setWorkspaceKey(prev => prev + 1);
    setExpandedGroups(prev => ({ ...prev, [tab?.groupId || 'command']: true }));
    setMobileMenuOpen(false);
    setHoveredTab(null);
    if (typeof window !== 'undefined') {
      const nextHash = `#tab-${tabId}`;
      if (window.location.hash !== nextHash) window.history.pushState(null, '', `${window.location.pathname}${nextHash}`);
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
  }, []);

  const handleGroupClick = (group) => {
    setExpandedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }));
  };

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

  const renderTabButton = (tab) => {
    const isActive = activeTab === tab.id;
    const isHovered = hoveredTab === tab.id && !isActive;
    const Icon = tab.icon;
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => handleTabClick(tab.id)}
        onMouseEnter={() => setHoveredTab(tab.id)}
        onMouseLeave={() => setHoveredTab(null)}
        data-testid={`${tab.id}-tab`}
        data-active={isActive ? 'true' : 'false'}
        aria-current={isActive ? 'page' : undefined}
        style={{ ...tabButtonStyle, background: isActive ? theme.accent.primary : (isHovered ? theme.bg.hover : 'transparent'), color: isActive ? theme.text.white : theme.text.secondary }}
      >
        <Icon size={16} style={{ color: theme.text.white, opacity: isActive ? 1 : 0.72 }} />
        <span style={{ flex: 1 }}>{tab.label}</span>
      </button>
    );
  };

  const renderGroupHeader = (group) => {
    const isExpanded = Boolean(expandedGroups[group.id]);
    const hasActiveTab = group.tabs.some(tab => tab.id === activeTab);
    const Icon = group.icon;
    const ArrowIcon = isExpanded ? ChevronDown : ChevronRight;
    return (
      <button
        key={`group-${group.id}`}
        type="button"
        onClick={() => handleGroupClick(group)}
        data-testid={`group-${group.id}`}
        aria-expanded={isExpanded ? 'true' : 'false'}
        style={{ ...groupHeaderStyle, background: hasActiveTab ? theme.accent.subtle : (isExpanded ? theme.bg.card : 'transparent'), color: hasActiveTab ? theme.text.white : theme.text.muted, borderLeft: hasActiveTab ? `5px solid ${theme.accent.primary}` : '5px solid transparent' }}
      >
        <ArrowIcon size={15} style={{ color: hasActiveTab ? theme.text.white : theme.text.muted }} />
        <Icon size={15} style={{ color: hasActiveTab ? theme.text.white : theme.text.muted }} />
        <span>{group.label}</span>
      </button>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'command-centre': return <GMCommandCentre campaign={campaign} invite={invite} inviteLoading={inviteLoading} onOpenTab={handleTabClick} onOpenLive={handleOpenGMScreen} onFetchInvite={fetchInviteCode} onRotateInvite={rotateInviteCode} onCopyInvite={copyInviteCode} />;
      case 'story-arcs': return <StoryArcTracker campaignId={campaignId} onOpenTab={handleTabClick} />;
      case 'setting': return <CampaignSettingTab campaignId={campaignId} />;
      case 'world-builder': return <WorldBuilderTab campaignId={campaignId} />;
      case 'maps': return <MapsConsolidatedTab campaignId={campaignId} />;
      case 'gods': return <GodsTab campaignId={campaignId} />;
      case 'npcs': return <NPCsConsolidatedTab campaignId={campaignId} />;
      case 'chronicle': return <ChronicleConsolidatedTab campaignId={campaignId} />;
      case 'combat': return <CombatConsolidatedTab campaignId={campaignId} />;
      case 'battle-maps': return <MapsTab campaignId={campaignId} />;
      case 'tools': return <ToolsConsolidatedTab campaignId={campaignId} />;
      case 'uploads': return <UploadTab theme={theme} campaignId={campaignId} />;
      case 'playtest-packs': return <PrivatePlaytestPacksTab campaignId={campaignId} />;
      case 'inventory': return <InventoryConsolidatedTab campaignId={campaignId} />;
      case 'campaign-rules': return <CampaignRulesTab campaignId={campaignId} />;
      case 'tonight': return <TonightsSessionTab campaignId={campaignId} onOpenTab={handleTabClick} />;
      case 'handouts': return <GMHandoutsTab campaignId={campaignId} />;
      case 'players': return <><PlayerInvitePanel campaignId={campaignId} /><PlayersTab campaignId={campaignId} /></>;
      case 'ingame-notes': return <InGameNotesTab campaignId={campaignId} />;
      default: return <GMCommandCentre campaign={campaign} invite={invite} inviteLoading={inviteLoading} onOpenTab={handleTabClick} onOpenLive={handleOpenGMScreen} onFetchInvite={fetchInviteCode} onRotateInvite={rotateInviteCode} onCopyInvite={copyInviteCode} />;
    }
  };

  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>;

  if (!campaign) {
    return (
      <main style={errorPageStyle}>
        <section style={errorCardStyle}>
          <AlertTriangle size={40} color={theme.accent.primary} style={{ marginBottom: 12 }} />
          <h1 style={errorTitleStyle}>Campaign could not be loaded</h1>
          <p style={errorTextStyle}>{loadError}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button onClick={fetchCampaign} style={primaryButtonStyle}><RefreshCw size={16} /> Retry</Button>
            <Button onClick={() => navigate('/home')} style={secondaryButtonStyle}><ArrowLeft size={16} /> Back to Home</Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className={`gm-dashboard-shell ${mobileMenuOpen ? 'gm-menu-open' : ''}`} style={dashboardShellStyle} data-active-tab={activeTab}>
      <header className="gm-dashboard-header" style={headerStyle}>
        <div className="gm-header-main" style={headerMainStyle}>
          <div className="gm-header-left" style={headerLeftStyle}>
            <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="mobile-menu-toggle" aria-label={mobileMenuOpen ? 'Close campaign tools' : 'Open campaign tools'} style={mobileMenuButtonStyle}>{mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}</button>
            <Button data-testid="back-to-home-btn" onClick={() => navigate('/home')} style={squareIconButtonStyle}><ArrowLeft size={20} color={theme.text.white} /></Button>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <h1 className="gm-campaign-title" style={campaignTitleStyle}>{campaign.name}</h1>
              <div className="gm-campaign-meta" style={campaignMetaStyle}><span style={redTagStyle}>{activeTabMeta.label}</span><span style={systemTextStyle}>{campaign.system || '5e Campaign'}</span></div>
            </div>
          </div>
          <div className="gm-header-actions" style={headerActionsStyle}>
            <Button onClick={copyInviteCode} style={secondaryButtonStyle}>{inviteLoading ? 'Loading Code...' : 'Copy Join Code'}</Button>
            <Button data-testid="open-dm-screen-btn" onClick={handleOpenGMScreen} style={primaryButtonStyle}><Monitor size={18} /> <span className="desktop-only">Open </span>Live Play Mode</Button>
          </div>
        </div>
      </header>

      <div style={layoutStyle}>
        <aside className={`sidebar gm-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`} style={sidebarStyle}>
          <div className="gm-sidebar-mobile-top" style={sidebarMobileTopStyle}>
            <strong style={sidebarMobileTitleStyle}>Campaign Tools</strong>
            <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Close campaign tools" style={sidebarCloseButtonStyle}><X size={22} /></button>
          </div>
          <h3 className="gm-sidebar-title" style={sidebarTitleStyle}>Campaign Tools</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {tabGroups.map(group => {
              const isExpanded = Boolean(expandedGroups[group.id]);
              return <div key={group.id}>{renderGroupHeader(group)}{isExpanded && group.tabs.map(tab => renderTabButton(tab))}</div>;
            })}
          </div>
        </aside>
        {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} style={mobileOverlayStyle} />}
        <main style={mainStyle}>
          {activeTabMeta && activeTab !== 'command-centre' && (
            <div className="desktop-context" style={desktopContextStyle}>
              <div style={{ minWidth: 0 }}>
                <p style={desktopEyebrowStyle}>{activeGroup.label}</p>
                <h2 style={desktopTitleStyle}>{activeTabMeta.label}</h2>
              </div>
              <span style={desktopPillStyle}>GM workspace</span>
            </div>
          )}
          <section key={`${activeTab}-${workspaceKey}`} style={workspacePanelStyle} data-testid="gm-active-workspace" data-active-tab={activeTab}>{renderActiveTab()}</section>
        </main>
      </div>

      <style>{mobileCss}</style>
    </div>
  );
}

function GMCommandCentre({ campaign, invite, inviteLoading, onOpenTab, onOpenLive, onFetchInvite, onRotateInvite, onCopyInvite }) {
  const commandCards = [
    { title: 'Story Arcs', text: 'Build the campaign spine: arcs, chapters, checkpoints, and combat beats.', meta: 'Plan', icon: ScrollText, tab: 'story-arcs' },
    { title: "Tonight's Session", text: 'Open the live prep checklist for the next table session.', meta: 'Prep', icon: CalendarDays, tab: 'tonight' },
    { title: 'Live Play Mode', text: 'Launch the focused table screen with combat, notes, handouts, and display controls.', meta: 'Run', icon: Monitor, action: onOpenLive },
    { title: 'World Atlas', text: 'Build world maps, place locations as markers, and organise local points of interest.', meta: 'World', icon: Compass, tab: 'maps' },
    { title: 'Inventory & Rewards', text: 'Track party loot and grant rewards directly to character sheets.', meta: 'Rewards', icon: Backpack, tab: 'inventory' },
    { title: 'Encounters', text: 'Build combat encounters, enemies, and table fight tools.', meta: 'Combat', icon: Swords, tab: 'combat' },
    { title: 'Session Notes', text: 'Capture what happened at the table and sync useful changes into the campaign.', meta: 'Record', icon: FileText, tab: 'ingame-notes' },
    { title: 'Secrets & Handouts', text: 'Prepare lore, clues, letters, and reveal-only-when-ready player information.', meta: 'Reveal', icon: Mail, tab: 'handouts' },
    { title: 'Players & Invites', text: 'Manage players, joined characters, and the campaign join code.', meta: 'Access', icon: Users, tab: 'players' },
    { title: 'NPCs & Figures', text: 'Allies, rivals, villains, patrons, rulers, shopkeepers, and recurring faces.', meta: 'People', icon: UserCircle, tab: 'npcs' },
    { title: 'Chronicle', text: 'Turn played sessions into campaign history, consequences, and timeline entries.', meta: 'History', icon: Clock, tab: 'chronicle' },
  ];

  return (
    <div style={commandShellStyle}>
      <section style={commandHeroStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={desktopEyebrowStyle}>Campaign Command Centre</p>
          <h2 style={commandTitleStyle}>{campaign?.name || 'Campaign'}</h2>
          <p style={commandSubtitleStyle}>Simple GM flow: plan the story, prep tonight, run the table, then record what changed.</p>
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
        <StatusBox label="Flow" value="Plan → Prep → Run → Record" />
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

function CommandCard({ title, text, meta, icon: Icon, tab, action, onOpenTab }) {
  return (
    <button type="button" onClick={() => action ? action() : onOpenTab(tab)} style={commandCardStyle}>
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

const dashboardShellStyle = { minHeight: '100dvh', background: theme.bg.black, display: 'flex', flexDirection: 'column', overflow: 'visible', fontFamily: fontStack, color: theme.text.white };
const headerStyle = { background: theme.bg.panel, borderBottom: `1px solid ${theme.border}`, padding: '10px 14px', position: 'sticky', top: 0, zIndex: 40 };
const headerMainStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 };
const headerLeftStyle = { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 };
const headerActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const layoutStyle = { display: 'flex', flex: 1, overflow: 'visible', position: 'relative' };
const sidebarStyle = { width: 280, minWidth: 280, background: theme.bg.panel, borderRight: `1px solid ${theme.border}`, padding: '0 0 16px', overflowY: 'auto', transition: 'transform 0.25s ease' };
const mainStyle = { flex: 1, overflowY: 'visible', padding: 'clamp(12px, 2vw, 28px)', minWidth: 0 };
const workspacePanelStyle = { background: theme.bg.panel, border: `1px solid ${theme.border}`, borderRadius: 0, padding: 'clamp(14px, 2vw, 24px)', minHeight: 500, minWidth: 0, boxShadow: 'none' };
const desktopContextStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 14, padding: '14px 16px', background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: 0, minWidth: 0 };
const desktopEyebrowStyle = { margin: '0 0 4px', color: theme.text.muted, fontSize: 11, fontWeight: 900, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: fontStack };
const desktopTitleStyle = { margin: 0, color: theme.text.primary, fontSize: 'clamp(20px, 2vw, 28px)', fontWeight: 950, overflowWrap: 'anywhere', fontFamily: fontStack };
const desktopPillStyle = { color: theme.text.secondary, border: `1px solid ${theme.border}`, background: theme.bg.panel, padding: '6px 10px', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7, whiteSpace: 'nowrap', fontFamily: fontStack };
const campaignTitleStyle = { fontSize: 'clamp(18px, 4vw, 25px)', color: theme.text.primary, margin: '0 0 4px', fontWeight: 950, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 'min(58vw, 720px)', fontFamily: titleFont };
const campaignMetaStyle = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const systemTextStyle = { fontSize: 11, color: theme.text.muted, fontWeight: 850 };
const primaryButtonStyle = { minHeight: 42, border: 0, borderRadius: 0, background: '#d00000', color: '#ffffff', padding: '0 14px', fontWeight: 950, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: fontStack, textDecoration: 'none' };
const secondaryButtonStyle = { minHeight: 42, border: 0, borderRadius: 0, background: '#3a3a3a', color: '#ffffff', padding: '0 14px', fontWeight: 900, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: fontStack };
const squareIconButtonStyle = { width: 44, minWidth: 44, height: 44, minHeight: 44, background: theme.bg.card, border: 0, borderRadius: 0, display: 'grid', placeItems: 'center', flex: '0 0 44px' };
const mobileMenuButtonStyle = { width: 44, height: 44, background: theme.bg.card, border: 'none', cursor: 'pointer', color: theme.text.white, display: 'none', padding: 8, placeItems: 'center', flex: '0 0 44px' };
const sidebarMobileTopStyle = { display: 'none', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 8, borderBottom: `1px solid ${theme.border}` };
const sidebarMobileTitleStyle = { color: theme.text.white, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' };
const sidebarCloseButtonStyle = { width: 40, height: 40, border: 0, background: theme.bg.card, color: theme.text.white, display: 'grid', placeItems: 'center' };
const sidebarTitleStyle = { color: theme.text.muted, fontSize: 11, fontWeight: 950, letterSpacing: '1.5px', textTransform: 'uppercase', margin: 0, padding: '16px' };
const mobileOverlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 180, display: 'none' };
const groupHeaderStyle = { padding: '11px 16px 11px 11px', border: 'none', borderTop: `1px solid ${theme.border}`, fontWeight: 950, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginTop: 0, fontFamily: fontStack, textAlign: 'left' };
const tabButtonStyle = { position: 'relative', border: 'none', color: theme.text.white, fontWeight: 850, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%', borderRadius: 0, margin: 0, maxWidth: '100%', fontFamily: fontStack, padding: '10px 16px 10px 34px', minHeight: 42, fontSize: 13 };
const redTagStyle = { fontSize: 11, color: '#ffffff', background: '#d00000', padding: '4px 8px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.06em' };
const errorPageStyle = { minHeight: '100dvh', background: theme.bg.black, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: fontStack };
const errorCardStyle = { maxWidth: 520, width: '100%', background: theme.bg.panel, border: `1px solid ${theme.border}`, padding: 24, textAlign: 'center' };
const errorTitleStyle = { color: theme.text.primary, fontSize: 24, fontWeight: 950, margin: '0 0 8px' };
const errorTextStyle = { color: theme.text.secondary, lineHeight: 1.55, margin: '0 0 18px' };
const commandShellStyle = { display: 'grid', gap: 18 };
const commandHeroStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', borderBottom: `1px solid ${theme.border}`, paddingBottom: 16 };
const commandTitleStyle = { margin: '2px 0 8px', color: '#ffffff', fontSize: 'clamp(30px, 5vw, 54px)', lineHeight: 1, fontWeight: 950, letterSpacing: '0.02em', fontFamily: titleFont };
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

const mobileCss = `
  @media (max-width: 640px) { .desktop-only { display: none !important; } }
  @media (max-width: 1024px) {
    .desktop-context { display: none !important; }
    .gm-dashboard-header { padding: 6px 8px !important; min-height: 56px !important; position: sticky !important; z-index: 120 !important; }
    .gm-dashboard-shell.gm-menu-open .gm-dashboard-header { z-index: 80 !important; }
    .gm-header-main { flex-wrap: nowrap !important; gap: 8px !important; }
    .gm-header-actions { display: none !important; }
    .gm-campaign-meta { display: none !important; }
    .gm-campaign-title { max-width: calc(100vw - 126px) !important; margin: 0 !important; font-size: 20px !important; line-height: 1.05 !important; }
    .mobile-menu-toggle { display: grid !important; }
    .gm-sidebar { position: fixed !important; top: 0 !important; left: 0 !important; bottom: 0 !important; z-index: 240 !important; transform: translateX(-100%); width: min(78vw, 310px) !important; min-width: min(78vw, 310px) !important; max-width: 310px !important; box-shadow: none !important; padding-bottom: env(safe-area-inset-bottom, 12px) !important; }
    .gm-sidebar.mobile-open { transform: translateX(0); }
    .gm-sidebar-mobile-top { display: flex !important; min-height: 48px !important; }
    .gm-sidebar-title { display: none !important; }
    .mobile-overlay { display: block !important; }
  }
  @media (hover: none) and (pointer: coarse) { button, .clickable-box { min-height: 44px !important; min-width: 44px !important; } }
`;
