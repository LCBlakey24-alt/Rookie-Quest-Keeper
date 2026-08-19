import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, Backpack, ChevronDown, ChevronRight, Clock, FileText, Mail, Map, Menu, Monitor, RefreshCw, ScrollText, Swords, UserCircle, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/apiClient';
import CampaignSettingTab from '@/components/tabs/CampaignSettingTab';
import CampaignRulesTab from '@/components/tabs/CampaignRulesTab';
import GodsTab from '@/components/tabs/GodsTab';
import InGameNotesTab from '@/components/tabs/InGameNotesTab';
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
import GMPartyWorkspace from '@/components/gm/GMPartyWorkspace';
import GMHandoutsWorkspace from '@/components/gm/GMHandoutsWorkspace';
import CampaignJoinCodeCard from '@/components/gm/CampaignJoinCodeCard';
import TiaKartaCampaignPackPanel from '@/components/gm/TiaKartaCampaignPackPanel';
import PrivatePlaytestPacksTab from '@/components/tabs/PrivatePlaytestPacksTab';
import { allTabs, tabGroups, validTabIds } from '@/components/gm/dashboard/campaignDashboardTabs';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "Germania One", Georgia, serif)';
const theme = {
  bg: { black: '#242424', panel: '#2f2f2f', card: '#3a3a3a', hover: '#444444' },
  accent: { primary: '#d00000', subtle: 'rgba(208,0,0,0.18)' },
  text: { white: '#ffffff', primary: '#ffffff', secondary: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)' },
  border: 'rgba(255,255,255,0.16)',
};

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
  const [expandedGroup, setExpandedGroup] = useState(() => allTabs.find(tab => tab.id === tabFromHash())?.groupId || 'campaign');
  const [invite, setInvite] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const activeTabMeta = useMemo(() => allTabs.find(tab => tab.id === activeTab) || allTabs[0], [activeTab]);

  const fetchCampaign = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}`);
      setCampaign(response.data);
    } catch (error) {
      setCampaign(null);
      setLoadError(error?.response?.data?.detail || 'Campaign could not be loaded.');
      toast.error('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { fetchCampaign(); }, [fetchCampaign]);

  useEffect(() => {
    const onHashChange = () => {
      const nextTab = tabFromHash();
      const tab = allTabs.find(item => item.id === nextTab);
      if (!tab) return;
      setActiveTab(nextTab);
      setWorkspaceKey(prev => prev + 1);
      setExpandedGroup(tab.groupId);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleOpenGMScreen = () => navigate(`/gm-screen/${campaignId}`);

  const handleTabClick = useCallback(tabId => {
    if (!validTabIds.has(tabId)) return;
    const tab = allTabs.find(item => item.id === tabId);
    setActiveTab(tabId);
    setWorkspaceKey(prev => prev + 1);
    setExpandedGroup(tab?.groupId || 'campaign');
    setMobileMenuOpen(false);
    setHoveredTab(null);
    if (typeof window !== 'undefined') {
      const nextHash = `#tab-${tabId}`;
      if (window.location.hash !== nextHash) window.history.pushState(null, '', `${window.location.pathname}${nextHash}`);
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
  }, []);

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

  const withTiaKarta = (destination, children) => (
    <>
      <TiaKartaCampaignPackPanel campaignId={campaignId} destination={destination} />
      {children}
    </>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'command-centre':
        return <GMHome campaign={campaign} invite={invite} inviteLoading={inviteLoading} onOpenTab={handleTabClick} onOpenLive={handleOpenGMScreen} onFetchInvite={fetchInviteCode} onRotateInvite={rotateInviteCode} onCopyInvite={copyInviteCode} />;
      case 'story-arcs': return withTiaKarta('storyArcs', <StoryArcTracker campaignId={campaignId} onOpenTab={handleTabClick} />);
      case 'players': return <><PlayerInvitePanel campaignId={campaignId} /><GMPartyWorkspace campaignId={campaignId} /></>;
      case 'npcs': return withTiaKarta('npcs', <NPCsConsolidatedTab campaignId={campaignId} />);
      case 'maps': return withTiaKarta('worldAtlas', <MapsConsolidatedTab campaignId={campaignId} />);
      case 'gods': return withTiaKarta('powers', <GodsTab campaignId={campaignId} />);
      case 'setting': return withTiaKarta('worldOverview', <CampaignSettingTab campaignId={campaignId} />);
      case 'chronicle': return withTiaKarta('chronicle', <ChronicleConsolidatedTab campaignId={campaignId} />);
      case 'combat': return withTiaKarta('encounters', <CombatConsolidatedTab campaignId={campaignId} />);
      case 'inventory': return withTiaKarta('inventory', <InventoryConsolidatedTab campaignId={campaignId} />);
      case 'ingame-notes': return withTiaKarta('sessionNotes', <InGameNotesTab campaignId={campaignId} />);
      case 'handouts': return withTiaKarta('handouts', <GMHandoutsWorkspace campaignId={campaignId} />);
      case 'tools': return <ToolsConsolidatedTab campaignId={campaignId} />;
      case 'campaign-rules': return withTiaKarta('campaignRules', <CampaignRulesTab campaignId={campaignId} />);
      case 'world-builder': return <WorldBuilderTab campaignId={campaignId} />;
      case 'uploads': return <UploadTab theme={theme} campaignId={campaignId} />;
      case 'playtest-packs': return <PrivatePlaytestPacksTab campaignId={campaignId} />;
      default:
        return <GMHome campaign={campaign} invite={invite} inviteLoading={inviteLoading} onOpenTab={handleTabClick} onOpenLive={handleOpenGMScreen} onFetchInvite={fetchInviteCode} onRotateInvite={rotateInviteCode} onCopyInvite={copyInviteCode} />;
    }
  };

  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>;

  if (!campaign) {
    return (
      <main style={errorPageStyle}>
        <section style={errorCardStyle}>
          <AlertTriangle size={38} color={theme.accent.primary} />
          <h1 style={errorTitleStyle}>Campaign could not be loaded</h1>
          <p style={errorTextStyle}>{loadError}</p>
          <div style={buttonRowStyle}>
            <Button onClick={fetchCampaign} style={primaryButtonStyle}><RefreshCw size={16} /> Retry</Button>
            <Button onClick={() => navigate('/home')} style={secondaryButtonStyle}><ArrowLeft size={16} /> Home</Button>
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
            <button type="button" onClick={() => setMobileMenuOpen(prev => !prev)} className="mobile-menu-toggle" aria-label="Open campaign tools" style={mobileMenuButtonStyle}><Menu size={22} /></button>
            <Button onClick={() => navigate('/home')} style={squareIconButtonStyle}><ArrowLeft size={20} /></Button>
            <div style={{ minWidth: 0 }}>
              <h1 className="gm-campaign-title" style={campaignTitleStyle}>{campaign.name}</h1>
              <div className="gm-campaign-meta" style={campaignMetaStyle}><span style={redTagStyle}>{activeTabMeta?.label || 'GM Home'}</span><span style={systemTextStyle}>{campaign.system || '5e Campaign'}</span></div>
            </div>
          </div>
          <div className="gm-header-actions" style={headerActionsStyle}>
            <Button onClick={copyInviteCode} style={secondaryButtonStyle}>{inviteLoading ? 'Loading…' : 'Join Code'}</Button>
            <Button onClick={handleOpenGMScreen} style={primaryButtonStyle}><Monitor size={17} /> Live Play</Button>
          </div>
        </div>
      </header>

      <div style={layoutStyle}>
        <aside className={`gm-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`} style={sidebarStyle}>
          <div className="gm-sidebar-mobile-top" style={sidebarMobileTopStyle}>
            <strong>Campaign</strong>
            <button type="button" onClick={() => setMobileMenuOpen(false)} style={sidebarCloseButtonStyle}><X size={21} /></button>
          </div>
          <div style={sidebarGroupsStyle}>
            {tabGroups.map(group => {
              const open = expandedGroup === group.id;
              const GroupIcon = group.icon;
              return (
                <div key={group.id}>
                  <button type="button" onClick={() => setExpandedGroup(open ? '' : group.id)} style={groupHeaderStyle(open)} aria-expanded={open}>
                    {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    <GroupIcon size={15} />
                    <span>{group.label}</span>
                  </button>
                  {open && group.tabs.map(tab => {
                    const Icon = tab.icon;
                    const active = tab.id === activeTab;
                    const hovered = hoveredTab === tab.id && !active;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleTabClick(tab.id)}
                        onMouseEnter={() => setHoveredTab(tab.id)}
                        onMouseLeave={() => setHoveredTab(null)}
                        style={tabButtonStyle(active, hovered)}
                        data-testid={`${tab.id}-tab`}
                      >
                        <Icon size={15} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </aside>

        {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} style={mobileOverlayStyle} />}

        <main style={mainStyle}>
          <section key={`${activeTab}-${workspaceKey}`} style={workspacePanelStyle} data-testid="gm-active-workspace">{renderActiveTab()}</section>
        </main>
      </div>
      <style>{mobileCss}</style>
    </div>
  );
}

function GMHome({ campaign, invite, inviteLoading, onOpenTab, onOpenLive, onFetchInvite, onRotateInvite, onCopyInvite }) {
  const quick = [
    { id: 'story-arcs', label: 'Quests', meta: 'Plan', icon: ScrollText },
    { id: 'combat', label: 'Encounters', meta: 'Prep', icon: Swords },
    { id: 'npcs', label: 'NPCs', meta: 'People', icon: UserCircle },
    { id: 'maps', label: 'Maps & Locations', meta: 'World', icon: Map },
    { id: 'ingame-notes', label: 'Notes', meta: 'Record', icon: FileText },
    { id: 'handouts', label: 'Handouts', meta: 'Reveal', icon: Mail },
    { id: 'players', label: 'Players', meta: 'Party', icon: Users },
    { id: 'inventory', label: 'Loot & Rewards', meta: 'Items', icon: Backpack },
    { id: 'chronicle', label: 'Timeline & Calendar', meta: 'History', icon: Clock },
  ];

  return (
    <div style={homeShellStyle}>
      <section style={homeHeroStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}>GM Home</p>
          <h2 style={homeTitleStyle}>{campaign?.name || 'Campaign'}</h2>
          <p style={homeSubtitleStyle}>Build the campaign here. Use Live Play when the table starts.</p>
        </div>
        <div style={buttonRowStyle}>
          <button type="button" onClick={() => onOpenTab('story-arcs')} style={secondaryButtonStyle}><ScrollText size={16} /> Quests</button>
          <button type="button" onClick={onOpenLive} style={primaryButtonStyle}><Monitor size={16} /> Live Play</button>
        </div>
      </section>

      <section style={quickGridStyle}>
        {quick.map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" onClick={() => onOpenTab(item.id)} style={quickCardStyle}>
              <Icon size={18} />
              <strong>{item.label}</strong>
              <span>{item.meta}</span>
            </button>
          );
        })}
      </section>

      <details style={detailsStyle}>
        <summary style={detailsSummaryStyle}>Player Join Code</summary>
        <div style={detailsBodyStyle}>
          <CampaignJoinCodeCard
            code={invite?.join_code || invite?.code || ''}
            loading={inviteLoading}
            uses={invite?.uses}
            createdAt={invite?.created_at}
            description="Players use this code to join the campaign with their characters."
            onFetch={onFetchInvite}
            onRotate={onRotateInvite}
            onCopy={onCopyInvite}
            rotateLabel="New Code"
            copyLabel="Copy Code"
          />
        </div>
      </details>
    </div>
  );
}

const dashboardShellStyle = { minHeight: '100dvh', background: theme.bg.black, display: 'flex', flexDirection: 'column', fontFamily: fontStack, color: theme.text.white };
const headerStyle = { background: theme.bg.panel, borderBottom: `1px solid ${theme.border}`, padding: '8px 12px', position: 'sticky', top: 0, zIndex: 40 };
const headerMainStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 };
const headerLeftStyle = { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 };
const headerActionsStyle = { display: 'flex', gap: 6 };
const layoutStyle = { display: 'flex', flex: 1, minHeight: 0, position: 'relative' };
const sidebarStyle = { width: 232, minWidth: 232, background: theme.bg.panel, borderRight: `1px solid ${theme.border}`, overflowY: 'auto', transition: 'transform 0.2s ease' };
const sidebarGroupsStyle = { display: 'grid', gap: 0, paddingBottom: 12 };
const mainStyle = { flex: 1, minWidth: 0, padding: 'clamp(8px, 1.4vw, 18px)', overflow: 'visible' };
const workspacePanelStyle = { minWidth: 0, minHeight: 500 };
const campaignTitleStyle = { margin: 0, color: theme.text.primary, fontFamily: titleFont, fontSize: 'clamp(18px, 3vw, 24px)', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 'min(52vw, 650px)' };
const campaignMetaStyle = { display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 };
const redTagStyle = { fontSize: 9, color: '#fff', background: theme.accent.primary, padding: '3px 6px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.06em' };
const systemTextStyle = { fontSize: 10, color: theme.text.muted, fontWeight: 800 };
const primaryButtonStyle = { minHeight: 38, border: 0, background: theme.accent.primary, color: '#fff', padding: '0 11px', fontWeight: 950, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 38, border: `1px solid ${theme.border}`, background: theme.bg.card, color: '#fff', padding: '0 11px', fontWeight: 900, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: fontStack };
const squareIconButtonStyle = { width: 40, minWidth: 40, height: 40, border: `1px solid ${theme.border}`, background: theme.bg.card, color: '#fff', display: 'grid', placeItems: 'center' };
const mobileMenuButtonStyle = { width: 40, height: 40, border: `1px solid ${theme.border}`, background: theme.bg.card, color: '#fff', display: 'none', placeItems: 'center' };
const groupHeaderStyle = open => ({ width: '100%', minHeight: 42, border: 0, borderTop: `1px solid ${theme.border}`, borderLeft: open ? `4px solid ${theme.accent.primary}` : '4px solid transparent', background: open ? theme.bg.card : theme.bg.panel, color: open ? theme.text.primary : theme.text.muted, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 950, fontSize: 10, textAlign: 'left' });
const tabButtonStyle = (active, hovered) => ({ width: '100%', minHeight: 40, border: 0, background: active ? theme.accent.primary : hovered ? theme.bg.hover : 'transparent', color: active ? '#fff' : theme.text.secondary, padding: '0 12px 0 31px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left', fontWeight: 850, fontSize: 12, fontFamily: fontStack });
const sidebarMobileTopStyle = { display: 'none', minHeight: 48, alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', borderBottom: `1px solid ${theme.border}` };
const sidebarCloseButtonStyle = { width: 38, height: 38, border: 0, background: theme.bg.card, color: '#fff', display: 'grid', placeItems: 'center' };
const mobileOverlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 180 };
const homeShellStyle = { display: 'grid', gap: 10 };
const homeHeroStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: theme.bg.panel, border: `1px solid ${theme.border}`, borderLeft: `5px solid ${theme.accent.primary}`, padding: 12 };
const eyebrowStyle = { margin: 0, color: theme.text.muted, fontSize: 9, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.1em' };
const homeTitleStyle = { margin: '2px 0 0', color: '#fff', fontFamily: titleFont, fontSize: 'clamp(28px, 5vw, 48px)', lineHeight: 1 };
const homeSubtitleStyle = { margin: '5px 0 0', color: theme.text.secondary, fontSize: 12 };
const quickGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 5 };
const quickCardStyle = { minHeight: 76, border: `1px solid ${theme.border}`, borderLeft: `4px solid ${theme.accent.primary}`, background: theme.bg.card, color: '#fff', padding: 9, display: 'grid', justifyItems: 'start', alignContent: 'center', gap: 3, cursor: 'pointer', textAlign: 'left', fontFamily: fontStack };
const detailsStyle = { border: `1px solid ${theme.border}`, background: theme.bg.panel };
const detailsSummaryStyle = { minHeight: 40, padding: '0 10px', display: 'flex', alignItems: 'center', color: theme.text.secondary, cursor: 'pointer', fontWeight: 900, fontSize: 11 };
const detailsBodyStyle = { padding: 8, borderTop: `1px solid ${theme.border}` };
const buttonRowStyle = { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' };
const errorPageStyle = { minHeight: '100dvh', background: theme.bg.black, display: 'grid', placeItems: 'center', padding: 20, fontFamily: fontStack };
const errorCardStyle = { maxWidth: 480, width: '100%', background: theme.bg.panel, border: `1px solid ${theme.border}`, padding: 20, textAlign: 'center', display: 'grid', justifyItems: 'center', gap: 8 };
const errorTitleStyle = { margin: 0, color: '#fff', fontSize: 22 };
const errorTextStyle = { margin: 0, color: theme.text.secondary };

const mobileCss = `
  @media (max-width: 1024px) {
    .gm-dashboard-header { padding: 6px 8px !important; }
    .gm-header-main { gap: 6px !important; }
    .gm-header-actions { display: none !important; }
    .gm-campaign-meta { display: none !important; }
    .gm-campaign-title { max-width: calc(100vw - 108px) !important; font-size: 19px !important; }
    .mobile-menu-toggle { display: grid !important; }
    .gm-sidebar { position: fixed !important; top: 0 !important; left: 0 !important; bottom: 0 !important; z-index: 240 !important; transform: translateX(-100%); width: min(82vw, 290px) !important; min-width: min(82vw, 290px) !important; }
    .gm-sidebar.mobile-open { transform: translateX(0); }
    .gm-sidebar-mobile-top { display: flex !important; }
  }
  @media (max-width: 640px) {
    .gm-dashboard-shell button { min-height: 42px; }
  }
`;
