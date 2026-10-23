import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  FileText,
  Flag,
  Map,
  MapPin,
  Monitor,
  RefreshCw,
  ScrollText,
  Swords,
  UserCircle,
  Users,
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { daysUntilNextOccurrence } from '@/data/customCalendarUtilities';
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
import { normaliseHomeData } from '@/components/gm/dashboard/campaignHomeData';
import { summariseSessionNote } from '@/components/gm/dashboard/sessionNotePreview';
import CampaignToolFinder from '@/components/gm/dashboard/CampaignToolFinder';
import './CampaignDashboard.css';

const uploadTheme = {
  bg: { black: '#07131F', panel: '#1E2936', card: '#263748', hover: '#334155' },
  accent: { primary: '#C9A96B', secondary: '#6E91B4', subtle: 'rgba(201,169,107,0.12)' },
  text: { white: '#EADFC8', primary: '#EADFC8', secondary: '#D5C9B6', muted: '#AEAB9F' },
  border: 'rgba(201,169,107,0.26)',
};

function tabFromHash() {
  if (typeof window === 'undefined') return 'command-centre';
  const raw = window.location.hash.replace('#tab-', '').replace('#', '');
  return validTabIds.has(raw) ? raw : 'command-centre';
}

export default function CampaignDashboard() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [initialTab] = useState(tabFromHash);
  const [campaign, setCampaign] = useState(null);
  const [homeBootstrap, setHomeBootstrap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [invite, setInvite] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const tabRowRef = useRef(null);
  const campaignRequestRef = useRef(0);

  const activeTabMeta = useMemo(
    () => allTabs.find((tab) => tab.id === activeTab) || allTabs[0],
    [activeTab]
  );

  const activeGroup = useMemo(
    () => tabGroups.find((group) => group.id === activeTabMeta?.groupId) || tabGroups[0],
    [activeTabMeta]
  );

  const fetchCampaign = useCallback(async () => {
    const requestId = ++campaignRequestRef.current;
    setLoading(true);
    setLoadError('');
    try {
      // The ordinary GM Home route can paint its header and focus cards from
      // one ownership-scoped response. Deep links to other tabs stay lean and
      // use the normal campaign detail endpoint instead of fetching Home data.
      if (initialTab === 'command-centre') {
        try {
          const bootstrapResponse = await apiClient.get(`/campaigns/${campaignId}/home-bootstrap`);
          const bootstrapPayload = bootstrapResponse.data || {};
          if (bootstrapPayload.campaign) {
            if (requestId !== campaignRequestRef.current) return;
            setCampaign(bootstrapPayload.campaign);
            setHomeBootstrap(bootstrapPayload);
            return;
          }
        } catch (bootstrapError) {
          if (requestId !== campaignRequestRef.current) return;
          const status = bootstrapError?.response?.status;
          if (status === 401 || status === 403) throw bootstrapError;
          // Older/mid-deploy backends or a partial Home failure can still open
          // the campaign through the established detail endpoint below.
        }
      }

      const response = await apiClient.get(`/campaigns/${campaignId}`);
      if (requestId !== campaignRequestRef.current) return;
      setCampaign(response.data);
      setHomeBootstrap(null);
    } catch (error) {
      if (requestId !== campaignRequestRef.current) return;
      setCampaign(null);
      setHomeBootstrap(null);
      setLoadError(error?.response?.data?.detail || 'Campaign could not be loaded.');
      toast.error('Failed to load campaign');
    } finally {
      if (requestId === campaignRequestRef.current) setLoading(false);
    }
  }, [campaignId, initialTab]);

  useEffect(() => {
    // Route components can survive campaign switches. Invalidate all pending
    // reads so Eldritch Heralds can never paint over the Wednesday dashboard.
    setCampaign(null);
    setHomeBootstrap(null);
    setInvite(null);
    setActiveTab(tabFromHash());
    fetchCampaign();
    return () => { campaignRequestRef.current += 1; };
  }, [fetchCampaign, campaignId]);

  useEffect(() => {
    const onHashChange = () => {
      const nextTab = tabFromHash();
      if (!validTabIds.has(nextTab)) return;
      if (nextTab !== 'command-centre') setHomeBootstrap(null);
      setActiveTab(nextTab);
    };

    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('popstate', onHashChange);
    };
  }, []);

  // Deep links and the quick finder can select an off-screen tab. Bring its
  // button into the horizontal navigation viewport without stealing focus.
  useEffect(() => {
    const row = tabRowRef.current;
    const selected = row?.querySelector('.campaign-dashboard-tab.is-active');
    if (!row || !selected) return;
    // Scroll only the tool strip, not the document or its parent panels.
    const left = selected.offsetLeft - row.offsetLeft;
    const right = left + selected.offsetWidth;
    if (left < row.scrollLeft) row.scrollLeft = left;
    else if (right > row.scrollLeft + row.clientWidth) row.scrollLeft = right - row.clientWidth;
  }, [activeTab]);

  const handleOpenGMScreen = () => navigate(`/gm-screen/${campaignId}`);

  const handleTabClick = useCallback((tabId) => {
    if (!validTabIds.has(tabId)) return;
    if (tabId !== 'command-centre') setHomeBootstrap(null);
    setActiveTab(tabId);

    if (typeof window !== 'undefined') {
      const nextHash = `#tab-${tabId}`;
      if (window.location.hash !== nextHash) {
        window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
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
            key={campaignId}
            campaignId={campaignId}
            campaign={campaign}
            initialData={homeBootstrap}
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
            key={campaignId}
            campaignId={campaignId}
            campaign={campaign}
            initialData={homeBootstrap}
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
            <CampaignToolFinder
              key={campaignId}
              campaignName={campaign.name}
              activeTab={activeTab}
              onSelect={handleTabClick}
            />
            <button type="button" onClick={copyInviteCode} className="campaign-button">
              {inviteLoading ? 'Loading…' : 'Join Code'}
            </button>
            <button type="button" onClick={handleOpenGMScreen} className="campaign-button campaign-button-primary" aria-label="Open Live Play" title="Open Live Play">
              <Monitor size={16} aria-hidden="true" />
              <span className="campaign-live-play-label">Live Play</span>
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

        <div ref={tabRowRef} className="campaign-dashboard-tab-row" aria-label={`${activeGroup?.label || 'Campaign'} tools`}>
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

function safeList(value) {
  return Array.isArray(value) ? value : [];
}

function objectiveProgress(quest) {
  const objectives = safeList(quest?.objectives);
  const resolved = objectives.filter(item => ['completed', 'skipped'].includes(item.status)).length;
  return { resolved, total: objectives.length };
}

function chooseCurrentQuest(quests) {
  const open = safeList(quests).filter(quest => !['completed', 'failed', 'archived'].includes(quest.status));
  return open.find(quest => quest.status === 'active' && quest.is_pinned)
    || open.find(quest => quest.status === 'active')
    || open.find(quest => quest.is_pinned)
    || open[0]
    || null;
}

function chooseStoryFocus(arcs) {
  const list = safeList(arcs);
  const arc = list.find(item => item.status === 'active')
    || list.find(item => item.status !== 'completed')
    || list[0]
    || null;
  if (!arc) return { arc: null, chapter: null, nextScene: null };

  const chapters = safeList(arc.chapters);
  const chapter = chapters.find(item => item.status === 'prepped')
    || chapters.find(item => item.status === 'planned')
    || chapters.find(item => item.status !== 'played')
    || chapters[0]
    || null;

  const scenes = safeList(chapter?.scenes).map((scene, index) => (
    typeof scene === 'string'
      ? { id: `scene-${index + 1}`, title: scene, status: 'upcoming' }
      : { ...scene, title: scene?.title || scene?.name || `Scene ${index + 1}` }
  ));
  const nextScene = scenes.find(scene => !['reached', 'played', 'skipped', 'completed'].includes(scene.status)) || scenes[0] || null;
  return { arc, chapter, nextScene };
}

function daysUntilEvent(event, calendar) {
  const difference = daysUntilNextOccurrence(event, calendar);
  return difference === null ? Number.POSITIVE_INFINITY : difference;
}

function GMHome({ campaignId, campaign, initialData, invite, inviteLoading, onOpenTab, onFetchInvite, onRotate, onCopyInvite, onRotateInvite }) {
  const [data, setData] = useState(() => normaliseHomeData(initialData));
  const [homeLoading, setHomeLoading] = useState(!initialData);
  const [unavailableSections, setUnavailableSections] = useState([]);
  const homeRequestRef = useRef(0);

  const loadHome = useCallback(async () => {
    if (!campaignId) return;
    const requestId = ++homeRequestRef.current;
    setHomeLoading(true);

    // Modern path: one narrow GM-only payload instead of seven browser API
    // round trips. Keep the legacy fan-out as a rollout fallback so frontend
    // and backend deployments can arrive in either order safely.
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/home-bootstrap`);
      if (requestId !== homeRequestRef.current) return;
      setData(normaliseHomeData(response.data || {}));
      setUnavailableSections([]);
      setHomeLoading(false);
      return;
    } catch (error) {
      if (requestId !== homeRequestRef.current) return;
      const status = error?.response?.status;
      if (status !== 404 && status !== 405) {
        // A temporary bootstrap issue should not strand an existing campaign;
        // the established per-resource endpoints remain a safe fallback.
      }
    }

    // Do not translate failed requests into an apparently empty campaign.
    // Preserve previously loaded sections and identify unavailable ones.
    const sections = [
      ['quests', 'quests'], ['arcs', 'story-arcs'], ['npcs', 'npcs'],
      ['locations', 'locations'], ['notes', 'ingame-notes'],
      ['calendar', 'calendar'], ['events', 'calendar-events'],
    ];
    const results = await Promise.allSettled(sections.map(([, path]) =>
      apiClient.get(`/campaigns/${campaignId}/${path}`)));
    if (requestId !== homeRequestRef.current) return;
    const successful = {};
    const missing = [];
    results.forEach((result, index) => {
      const [key] = sections[index];
      if (result.status === 'fulfilled' && result.value?.data != null) {
        successful[key] = result.value.data;
      } else {
        missing.push(key);
      }
    });
    setData(previous => normaliseHomeData({ ...previous, ...successful }));
    setUnavailableSections(missing);
    setHomeLoading(false);
  }, [campaignId]);

  useEffect(() => {
    // New campaigns and old requests must never share visible GM Home cards.
    homeRequestRef.current += 1;
    setData(normaliseHomeData(initialData));
    setUnavailableSections([]);
    if (initialData) {
      setData(normaliseHomeData(initialData));
      setUnavailableSections([]);
      setHomeLoading(false);
      return;
    }
    loadHome();
    return () => { homeRequestRef.current += 1; };
  }, [initialData, loadHome]);

  const currentQuest = useMemo(() => chooseCurrentQuest(data.quests), [data.quests]);
  const questProgress = useMemo(() => objectiveProgress(currentQuest), [currentQuest]);
  const storyFocus = useMemo(() => chooseStoryFocus(data.arcs), [data.arcs]);

  const currentLocation = useMemo(() => {
    const linkedId = safeList(currentQuest?.linked_location_ids)[0];
    if (linkedId) return data.locations.find(item => item.id === linkedId) || null;
    return null;
  }, [currentQuest, data.locations]);

  const importantNpcs = useMemo(() => {
    const ids = safeList(currentQuest?.linked_npc_ids);
    return ids.map(id => data.npcs.find(npc => npc.id === id)).filter(Boolean).slice(0, 4);
  }, [currentQuest, data.npcs]);

  const latestNote = useMemo(() => {
    if (!data.notes.length) return null;
    return [...data.notes].sort((a, b) => String(b.created_at || b.updated_at || '').localeCompare(String(a.created_at || a.updated_at || '')))[0];
  }, [data.notes]);

  const nextEvent = useMemo(() => data.events
    .map(event => ({ ...event, daysUntil: daysUntilEvent(event, data.calendar) }))
    .filter(event => event.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)[0] || null, [data.events, data.calendar]);

  const calendarLabel = useMemo(() => {
    if (!data.calendar) return 'Calendar not set';
    const month = data.calendar.custom_months?.[(data.calendar.current_month || 1) - 1]?.name || `Month ${data.calendar.current_month || 1}`;
    return `${data.calendar.current_day || 1} ${month}, ${data.calendar.current_year || 1}${data.calendar.calendar_type === 'custom' ? ' PC' : ''}`;
  }, [data.calendar]);

  const overview = [
    { id: 'story-arcs', label: 'Quests', key: 'quests', count: data.quests.length, icon: ScrollText },
    { id: 'npcs', label: 'NPCs', key: 'npcs', count: data.npcs.length, icon: UserCircle },
    { id: 'maps', label: 'Places', key: 'locations', count: data.locations.length, icon: MapPin },
    { id: 'ingame-notes', label: 'Session notes', key: 'notes', count: data.notes.length, icon: FileText },
  ];

  const quick = [
    { id: 'story-arcs', label: 'Quests & Story', icon: ScrollText },
    { id: 'combat', label: 'Encounters', icon: Swords },
    { id: 'npcs', label: 'NPCs', icon: UserCircle },
    { id: 'maps', label: 'Maps & Locations', icon: Map },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'ingame-notes', label: 'Notes', icon: FileText },
    { id: 'chronicle', label: 'Calendar & Timeline', icon: CalendarDays },
  ];

  return (
    <div className="campaign-home-simple">
      <section className="campaign-home-command" aria-labelledby="campaign-home-title">
        <div className="campaign-home-command-copy">
          <p>Campaign command / GM workspace</p>
          <h2 id="campaign-home-title">{campaign?.name || 'Campaign'}</h2>
          <span>{homeLoading ? 'Loading campaign focus…' : 'Quests, characters, places and the next scene — ready for the table.'}</span>
        </div>
        <div className="campaign-home-command-actions">
          <button type="button" className="campaign-button" onClick={loadHome} disabled={homeLoading}>
            <RefreshCw size={15} aria-hidden="true" /> Refresh
          </button>
          <button type="button" className="campaign-button campaign-button-primary" onClick={() => onOpenTab('story-arcs')}>
            <Flag size={15} aria-hidden="true" /> Prep Next Session
          </button>
        </div>
      </section>

      {unavailableSections.length > 0 && (
        <p className="campaign-home-source-warning" role="status">
          Some campaign records could not be loaded: {unavailableSections.join(', ')}.
          Saved data has not been deleted. Select Refresh to try again.
        </p>
      )}

      <section className="campaign-home-overview" aria-label="Campaign library at a glance">
        {overview.map(item => {
          const Icon = item.icon;
          return (
            <button type="button" key={item.id} className="campaign-home-overview-item"
              onClick={() => onOpenTab(item.id)} aria-label={`Open ${item.label}`}>
              <Icon size={19} aria-hidden="true" />
              <strong>{homeLoading || unavailableSections.includes(item.key) ? '—' : item.count}</strong>
              <span>{item.label}</span>
            </button>
          );
        })}
      </section>

      <section className="campaign-home-section" aria-labelledby="campaign-quick-start-title">
        <div className="campaign-home-section-heading">
          <h2 id="campaign-quick-start-title">Session Toolbox</h2>
          <span>Jump straight into the tools you need at the table.</span>
        </div>
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

      <section className="campaign-home-focus-grid" aria-label="Campaign focus">
        <button type="button" className="campaign-home-focus-card campaign-home-focus-card--wide" onClick={() => onOpenTab('story-arcs')}>
          <span className="campaign-home-focus-label">Current Quest</span>
          <strong>{currentQuest?.title || 'No current quest selected'}</strong>
          <p>{currentQuest?.summary || currentQuest?.hook || 'Mark a quest active or pin it to bring it here.'}</p>
          <small>{currentQuest ? `${questProgress.resolved}/${questProgress.total} objectives resolved` : 'Open Quests'}</small>
        </button>

        <button type="button" className="campaign-home-focus-card" onClick={() => onOpenTab('maps')}>
          <MapPin size={17} aria-hidden="true" />
          <span className="campaign-home-focus-label">Current Location</span>
          <strong>{currentLocation?.name || 'Not linked yet'}</strong>
          <p>{currentLocation ? 'Linked from the current quest.' : 'Link a location to the current quest.'}</p>
        </button>

        <button type="button" className="campaign-home-focus-card" onClick={() => onOpenTab('story-arcs')}>
          <Flag size={17} aria-hidden="true" />
          <span className="campaign-home-focus-label">Next Scene</span>
          <strong>{storyFocus.nextScene?.title || storyFocus.chapter?.title || 'No scene prepped'}</strong>
          <p>{storyFocus.arc?.title || 'Open Story Arcs to prepare the next beat.'}</p>
        </button>

        <button type="button" className="campaign-home-focus-card" onClick={() => onOpenTab('chronicle')}>
          <CalendarDays size={17} aria-hidden="true" />
          <span className="campaign-home-focus-label">Campaign Date</span>
          <strong>{calendarLabel}</strong>
          <p>{nextEvent ? `Next: ${nextEvent.name} · ${nextEvent.daysUntil === 0 ? 'Today' : `${nextEvent.daysUntil} day(s)`}` : 'No upcoming event scheduled.'}</p>
        </button>
      </section>

      <section className="campaign-home-detail-grid">
        <article className="campaign-home-detail">
          <div className="campaign-home-detail-heading">
            <span>Latest Session Note</span>
            <button type="button" onClick={() => onOpenTab('ingame-notes')}>Open Notes</button>
          </div>
          <p className="campaign-home-note-preview">{latestNote ? summariseSessionNote(latestNote.content) : 'No session notes yet. Live notes will appear here after play.'}</p>
          {latestNote && <button type="button" className="campaign-home-note-link" onClick={() => onOpenTab('ingame-notes')}>Read the full note →</button>}
        </article>

        <article className="campaign-home-detail">
          <div className="campaign-home-detail-heading">
            <span>Important NPCs</span>
            <button type="button" onClick={() => onOpenTab('npcs')}>Open NPCs</button>
          </div>
          {importantNpcs.length ? (
            <div className="campaign-home-npc-list">
              {importantNpcs.map(npc => (
                <span key={npc.id}>{npc.name || 'Unnamed NPC'}</span>
              ))}
            </div>
          ) : (
            <p>Link NPCs to the current quest and they will stay visible here.</p>
          )}
        </article>
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
