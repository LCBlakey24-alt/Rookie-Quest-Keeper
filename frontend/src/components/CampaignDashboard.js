import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  Map,
  Monitor,
  ScrollText,
  Swords,
  UserCircle,
  Users,
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import CampaignJoinCodeCard from '@/components/gm/CampaignJoinCodeCard';

const CampaignSettingTab = React.lazy(() => import('@/components/tabs/CampaignSettingTab'));
const CampaignRulesTab = React.lazy(() => import('@/components/tabs/CampaignRulesTab'));
const GodsTab = React.lazy(() => import('@/components/tabs/GodsTab'));
const InGameNotesTab = React.lazy(() => import('@/components/tabs/InGameNotesTab'));
const StoryArcTracker = React.lazy(() => import('@/components/gm/StoryArcTracker'));
const WorldBuilderTab = React.lazy(() => import('@/components/tabs/WorldBuilderTab'));
const MapsConsolidatedTab = React.lazy(() => import('@/components/tabs/MapsConsolidatedTab'));
const NPCsConsolidatedTab = React.lazy(() => import('@/components/tabs/NPCsConsolidatedTab'));
const InventoryConsolidatedTab = React.lazy(() => import('@/components/tabs/InventoryConsolidatedTab'));
const ChronicleConsolidatedTab = React.lazy(() => import('@/components/tabs/ChronicleConsolidatedTab'));
const CombatConsolidatedTab = React.lazy(() => import('@/components/tabs/CombatConsolidatedTab'));
const ToolsConsolidatedTab = React.lazy(() => import('@/components/tabs/ToolsConsolidatedTab'));
const UploadTab = React.lazy(() => import('@/components/gm/UploadTab'));
const PlayerInvitePanel = React.lazy(() => import('@/components/gm/PlayerInvitePanel'));
const GMPartyWorkspace = React.lazy(() => import('@/components/gm/GMPartyWorkspace'));
const GMHandoutsWorkspace = React.lazy(() => import('@/components/gm/GMHandoutsWorkspace'));
const TiaKartaCampaignPackPanel = React.lazy(() => import('@/components/gm/TiaKartaCampaignPackPanel'));
const PrivatePlaytestPacksTab = React.lazy(() => import('@/components/tabs/PrivatePlaytestPacksTab'));
import { allTabs, tabGroups, validTabIds } from '@/components/gm/dashboard/campaignDashboardTabs';
import './CampaignDashboard.css';

const uploadTheme = {
  bg: { black: '#0a1728', panel: '#102238', card: '#142a43', hover: '#19324e' },
  accent: { primary: '#d11f2a', subtle: 'rgba(209,31,42,0.16)' },
  text: { white: '#f8fbff', primary: '#f8fbff', secondary: '#b8c7d8', muted: '#8295aa' },
  border: '#213a54',
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
  const [invite, setInvite] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const activeTabMeta = useMemo(
    () => allTabs.find((tab) => tab.id === activeTab) || allTabs[0],
    [activeTab]
  );

  const activeGroup = useMemo(
    () => tabGroups.find((group) => group.id === activeTabMeta?.groupId) || tabGroups[0],
    [activeTabMeta]
  );

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

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  useEffect(() => {
    const onHashChange = () => {
      const nextTab = tabFromHash();
      if (!validTabIds.has(nextTab)) return;
      setActiveTab(nextTab);
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleOpenGMScreen = () => navigate(`/gm-screen/${campaignId}`);

  const handleTabClick = useCallback((tabId) => {
    if (!validTabIds.has(tabId)) return;
    setActiveTab(tabId);

    if (typeof window !== 'undefined') {
      const nextHash = `#tab-${tabId}`;
      if (window.location.hash !== nextHash) {
        window.history.pushState(null, '', `${window.location.pathname}${nextHash}`);
      }
      window.requestAnimationFrame?.(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
  }, []);

  const handleGroupClick = (group) => {
    if (!group?.tabs?.length) return;
    if (group.id === activeGroup?.id) return;
    handleTabClick(group.tabs[0].id);
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

  const withTiaKarta = (destination, children) => (
    <>
      <TiaKartaCampaignPackPanel campaignId={campaignId} destination={destination} />
      {children}
    </>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'command-centre':
        return (
          <GMHome
            invite={invite}
            inviteLoading={inviteLoading}
            onOpenTab={handleTabClick}
            onFetchInvite={fetchInviteCode}
            onRotateInvite={rotateInviteCode}
            onCopyInvite={copyInviteCode}
          />
        );
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
      case 'uploads': return <UploadTab theme={uploadTheme} campaignId={campaignId} />;
      case 'playtest-packs': return <PrivatePlaytestPacksTab campaignId={campaignId} />;
      default:
        return (
          <GMHome
            invite={invite}
            inviteLoading={inviteLoading}
            onOpenTab={handleTabClick}
            onFetchInvite={fetchInviteCode}
            onRotateInvite={rotateInviteCode}
            onCopyInvite={copyInviteCode}
          />
        );
    }
  };

  if (loading) {
    return (
      <main className="campaign-dashboard-loading" role="status" aria-live="polite">
        <div className="loading-spinner" aria-hidden="true" />
        <span>Opening campaign…</span>
      </main>
    );
  }

  if (!campaign) {
    return (
      <main className="campaign-dashboard-error">
        <section className="campaign-dashboard-error-card">
          <AlertTriangle size={34} aria-hidden="true" />
          <h1>Campaign could not be loaded</h1>
          <p>{loadError}</p>
          <div className="campaign-dashboard-error-actions">
            <button type="button" onClick={fetchCampaign} className="campaign-button campaign-button-primary">Retry</button>
            <button type="button" onClick={() => navigate('/campaigns')} className="campaign-button">Back to Campaigns</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="gm-dashboard-shell campaign-dashboard-simple" data-active-tab={activeTab}>
      <header className="gm-dashboard-header campaign-dashboard-header">
        <div className="campaign-dashboard-title-row">
          <button type="button" onClick={() => navigate('/campaigns')} className="campaign-icon-button" aria-label="Back to campaigns">
            <ArrowLeft size={18} aria-hidden="true" />
          </button>

          <div className="campaign-dashboard-title-copy">
            <h1 className="gm-campaign-title">{campaign.name}</h1>
            <span>{activeTabMeta?.label || 'GM Home'}</span>
          </div>

          <div className="gm-header-actions campaign-dashboard-actions">
            <button type="button" onClick={copyInviteCode} className="campaign-button">
              {inviteLoading ? 'Loading…' : 'Join Code'}
            </button>
            <button type="button" onClick={handleOpenGMScreen} className="campaign-button campaign-button-primary">
              <Monitor size={16} aria-hidden="true" />
              Live Play
            </button>
          </div>
        </div>
      </header>

      <nav className="campaign-dashboard-nav" aria-label="Campaign workspace">
        <div className="campaign-dashboard-group-row" aria-label="Campaign tool groups">
          {tabGroups.map((group) => {
            const GroupIcon = group.icon;
            const active = group.id === activeGroup?.id;
            return (
              <button
                key={group.id}
                type="button"
                className={`campaign-dashboard-group${active ? ' is-active' : ''}`}
                onClick={() => handleGroupClick(group)}
                aria-current={active ? 'page' : undefined}
              >
                <GroupIcon size={15} aria-hidden="true" />
                <span>{group.label}</span>
              </button>
            );
          })}
        </div>

        <div className="campaign-dashboard-tab-row" aria-label={`${activeGroup?.label || 'Campaign'} tools`}>
          {activeGroup?.tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                className={`campaign-dashboard-tab${active ? ' is-active' : ''}`}
                onClick={() => handleTabClick(tab.id)}
                aria-current={active ? 'page' : undefined}
                data-testid={`${tab.id}-tab`}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <main className="campaign-dashboard-workspace">
        <section className="campaign-dashboard-panel" data-testid="gm-active-workspace">
          <Suspense fallback={<div className="campaign-dashboard-loading" role="status">Loading workspace…</div>}>
            {renderActiveTab()}
          </Suspense>
        </section>
      </main>
    </div>
  );
}

function GMHome({ invite, inviteLoading, onOpenTab, onFetchInvite, onRotate, onCopyInvite, onRotateInvite }) {
  const quick = [
    { id: 'story-arcs', label: 'Quests', icon: ScrollText },
    { id: 'combat', label: 'Encounters', icon: Swords },
    { id: 'npcs', label: 'NPCs', icon: UserCircle },
    { id: 'maps', label: 'Maps & Locations', icon: Map },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'ingame-notes', label: 'Notes', icon: FileText },
  ];

  return (
    <div className="campaign-home-simple">
      <section className="campaign-home-section" aria-labelledby="campaign-quick-start-title">
        <h2 id="campaign-quick-start-title">Quick start</h2>
        <div className="campaign-home-quick-grid">
          {quick.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" onClick={() => onOpenTab(item.id)} className="campaign-home-quick-card">
                <Icon size={18} aria-hidden="true" />
                <strong>{item.label}</strong>
              </button>
            );
          })}
        </div>
      </section>

      <details className="campaign-home-join-code">
        <summary>Player Join Code</summary>
        <div>
          <CampaignJoinCodeCard
            code={invite?.join_code || invite?.code || ''}
            loading={inviteLoading}
            uses={invite?.uses}
            createdAt={invite?.created_at}
            description="Players use this code to join the campaign with their characters."
            onFetch={onFetchInvite}
            onRotate={onRotateInvite || onRotate}
            onCopy={onCopyInvite}
            rotateLabel="New Code"
            copyLabel="Copy Code"
          />
        </div>
      </details>
    </div>
  );
}
