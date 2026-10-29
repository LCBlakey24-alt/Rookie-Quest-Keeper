import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  FileText,
  Flag,
  Heart,
  Shield,
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
import { eventCountdownLabel, nextCampaignEvent } from '@/components/gm/dashboard/campaignHomeCalendar';
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
import CampaignMobileNavigator from '@/components/gm/dashboard/CampaignMobileNavigator';
import { normaliseHomeData } from '@/components/gm/dashboard/campaignHomeData';
import { normalizeCampaignCharacter } from '@/data/campaignCharacterBridge';
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
  const [inviteCampaignId, setInviteCampaignId] = useState(null);
  const tabRowRef = useRef(null);
  const activeCampaignIdRef = useRef(campaignId);
  const campaignLoadSeqRef = useRef(0);
  activeCampaignIdRef.current = campaignId;
  const currentInvite = inviteCampaignId === campaignId ? invite : null;

  const activeTabMeta = useMemo(
    () => allTabs.find((tab) => tab.id === activeTab) || allTabs[0],
    [activeTab]
  );

  const activeGroup = useMemo(
    () => tabGroups.find((group) => group.id === activeTabMeta?.groupId) || tabGroups[0],
    [activeTabMeta]
  );

  const fetchCampaign = useCallback(async () => {
    const requestId = ++campaignLoadSeqRef.current;
    const stillCurrent = () => requestId === campaignLoadSeqRef.current &&
      activeCampaignIdRef.current === campaignId;
    setLoading(true);
    setLoadError('');
    setCampaign(null);
    setHomeBootstrap(null);
    try {
      // The ordinary GM Home route can paint its header and focus cards from
      // one ownership-scoped response. Deep links to other tabs stay lean and
      // use the normal campaign detail endpoint instead of fetching Home data.
      if (initialTab === 'command-centre') {
        try {
          const bootstrapResponse = await apiClient.get(`/campaigns/${campaignId}/home-bootstrap`);
          if (!stillCurrent()) return;
          const bootstrapPayload = bootstrapResponse.data || {};
          if (bootstrapPayload.campaign) {
            setCampaign(bootstrapPayload.campaign);
            setHomeBootstrap(bootstrapPayload);
            return;
          }
        } catch (bootstrapError) {
          if (!stillCurrent()) return;
          const status = bootstrapError?.response?.status;
          if (status === 401 || status === 403) throw bootstrapError;
          // Older/mid-deploy backends or a partial Home failure can still open
          // the campaign through the established detail endpoint below.
        }
      }

      const response = await apiClient.get(`/campaigns/${campaignId}`);
      if (!stillCurrent()) return;
      setCampaign(response.data);
      setHomeBootstrap(null);
    } catch (error) {
      if (!stillCurrent()) return;
      setCampaign(null);
      setHomeBootstrap(null);
      setLoadError(error?.response?.data?.detail || 'Campaign could not be loaded.');
      toast.error('Failed to load campaign');
    } finally {
      if (stillCurrent()) setLoading(false);
    }
  }, [campaignId, initialTab]);

  useEffect(() => {
    fetchCampaign();
    return () => { campaignLoadSeqRef.current += 1; };
  }, [fetchCampaign]);

  useEffect(() => {
    // An invite code from Friday must never appear in Wednesday.
    setInvite(null);
    setInviteCampaignId(null);
    setInviteLoading(false);
  }, [campaignId]);

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
    const strip = row.getBoundingClientRect();
    const item = selected.getBoundingClientRect();
    // Reveal the active tool inside the horizontal strip without making
    // the entire page scroll or stealing keyboard focus.
    if (item.left < strip.left) row.scrollLeft = row.scrollLeft + item.left - strip.left - 8;
    else if (item.right > strip.right) row.scrollLeft = row.scrollLeft + item.right - strip.right + 8;
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
    const requestedCampaign = campaignId;
    try {
      setInviteLoading(true);
      const response = await apiClient.get(`/campaign-invites/${requestedCampaign}`);
      if (activeCampaignIdRef.current !== requestedCampaign) return null;
      setInvite(response.data);
      setInviteCampaignId(requestedCampaign);
      return response.data;
    } catch (error) {
      if (activeCampaignIdRef.current === requestedCampaign)
        toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Could not load join code');
      return null;
    } finally {
      if (activeCampaignIdRef.current === requestedCampaign) setInviteLoading(false);
    }
  };

  const rotateInviteCode = async () => {
    const requestedCampaign = campaignId;
    try {
      setInviteLoading(true);
      const response = await apiClient.post(`/campaign-invites/${requestedCampaign}`);
      if (activeCampaignIdRef.current !== requestedCampaign) return;
      setInvite(response.data);
      setInviteCampaignId(requestedCampaign);
      toast.success('New join code generated');
    } catch (error) {
      if (activeCampaignIdRef.current === requestedCampaign)
        toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Could not generate join code');
    } finally {
      if (activeCampaignIdRef.current === requestedCampaign) setInviteLoading(false);
    }
  };

  const copyInviteCode = async () => {
    const requestedCampaign = campaignId;
    const loadedInvite = currentInvite || await fetchInviteCode();
    if (activeCampaignIdRef.current !== requestedCampaign) return;
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
            invite={currentInvite}
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
            invite={currentInvite}
            inviteLoading={inviteLoading}
            onOpenTab={handleTabClick}
            onFetchInvite={fetchInviteCode}
            onRotateInvite={rotateInviteCode}
            onCopyInvite={copyInviteCode}
          />
        );
    }
  };

  // Route params change before effects run. Never flash the previous party's
  // campaign header, join code or GM Home while the new route is loading.
  if (loading || (campaign && campaign.id !== campaignId)) {
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
    <div className="gm-dashboard-shell campaign-dashboard-simple guild-command-layout" data-active-tab={activeTab}>
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

      <div className="guild-command-frame">
      <nav className="campaign-dashboard-nav guild-command-sidebar" aria-label="Campaign workspace">
        <CampaignMobileNavigator activeTab={activeTab} onOpenTab={handleTabClick} />
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

      <main className="campaign-dashboard-workspace guild-command-main">
        <section className="campaign-dashboard-panel" data-testid="gm-active-workspace">
          <Suspense fallback={<div className="campaign-dashboard-loading" role="status">Loading workspace…</div>}>
            {renderActiveTab()}
          </Suspense>
        </section>
      </main>
      </div>
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

function GMHome({ campaignId, campaign, initialData, invite, inviteLoading, onOpenTab, onFetchInvite, onRotate, onCopyInvite, onRotateInvite }) {
  const [data, setData] = useState(() => normaliseHomeData(initialData));
  const [homeLoading, setHomeLoading] = useState(!initialData);
  const [unavailableSections, setUnavailableSections] = useState([]);
  // Party is loaded from the existing GM-owned roster endpoint. Never invent
  // characters, portraits, HP or counts to match the design mockup.
  const [partySnapshot, setPartySnapshot] = useState({ status: 'loading', members: [] });
  const [partyRefreshNonce, setPartyRefreshNonce] = useState(0);
  const homeRequestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    // Keep previously loaded rows visible on a refresh failure for this
    // campaign, rather than claiming the party is empty or deleting data.
    setPartySnapshot(previous => ({
      members: previous.members,
      status: previous.members.length ? 'refreshing' : 'loading',
    }));
    if (!campaignId) return () => { cancelled = true; };

    apiClient.get(`/campaigns/${campaignId}/players`).then(response => {
      if (cancelled) return;
      const rows = Array.isArray(response.data) ? response.data :
        Array.isArray(response.data?.players) ? response.data.players : [];
      setPartySnapshot({
        status: 'ready',
        members: rows.map(normalizeCampaignCharacter).filter(member => member?.name),
      });
    }).catch(() => {
      if (!cancelled) {
        setPartySnapshot(previous => ({
          ...previous,
          status: previous.members.length ? 'stale' : 'unavailable',
        }));
      }
    });
    return () => { cancelled = true; };
  }, [campaignId, partyRefreshNonce]);

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
    // Keep manual refreshes from updating a remounted campaign or newer read.
    homeRequestRef.current += 1;
    if (initialData) {
      setData(normaliseHomeData(initialData));
      setUnavailableSections([]);
      setHomeLoading(false);
    } else {
      loadHome();
    }
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

  const nextEvent = useMemo(() => nextCampaignEvent(data.events, data.calendar),
    [data.events, data.calendar]);

  const calendarLabel = useMemo(() => {
    if (!data.calendar) return 'Calendar not set';
    const month = data.calendar.custom_months?.[(data.calendar.current_month || 1) - 1]?.name || `Month ${data.calendar.current_month || 1}`;
    return `${month} ${data.calendar.current_day || 1}, Year ${data.calendar.current_year || 1}`;
  }, [data.calendar]);

  const overview = [
    { id: 'players', label: 'Adventurers', key: 'party', count: partySnapshot.members.length, icon: Users },
    { id: 'story-arcs', label: 'Quests', key: 'quests', count: data.quests.length, icon: ScrollText },
    { id: 'npcs', label: 'NPCs', key: 'npcs', count: data.npcs.length, icon: UserCircle },
    { id: 'maps', label: 'Places', key: 'locations', count: data.locations.length, icon: MapPin },
    { id: 'ingame-notes', label: 'Session notes', key: 'notes', count: data.notes.length, icon: FileText },
  ];

  // No duplicate links or nested menus: put the five tools used at the table
  // above the fold, and keep secondary prep work in a separate section.
  const atTable = [
    { id: 'npcs', label: 'NPCs & stats', icon: UserCircle },
    { id: 'combat', label: 'Combat', icon: Swords },
    { id: 'chronicle', label: 'Calendar', icon: CalendarDays },
    { id: 'ingame-notes', label: 'Session notes', icon: FileText },
    { id: 'maps', label: 'Maps', icon: Map },
  ];
  const quick = [
    { id: 'story-arcs', label: 'Quests & story', icon: ScrollText },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'handouts', label: 'Handouts', icon: FileText },
    { id: 'inventory', label: 'Loot & rewards', icon: Swords },
    { id: 'setting', label: 'World notes', icon: Map },
    { id: 'campaign-rules', label: 'Rules & settings', icon: ScrollText },
  ];

  return (
    <div className="campaign-home-simple guild-command-home">
      <section className="campaign-home-command" aria-labelledby="campaign-home-title">
        <div className="campaign-home-command-copy">
          <p>GUILD COMMAND · GM WORKSPACE</p>
          <h2 id="campaign-home-title">Campaign Command Centre</h2>
          <span>{homeLoading ? 'Loading your campaign notes and quests…' : 'The next scene, key characters and everything you need during play.'}</span>
        </div>
        <div className="campaign-home-command-actions">
          <button type="button" className="campaign-button"
            onClick={() => { loadHome(); setPartyRefreshNonce(value => value + 1); }}
            disabled={homeLoading}>
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

      <nav className="campaign-home-session-rail" aria-label="Quick tools for a live session">
        <div className="campaign-home-session-rail__heading">
          <span>At the table</span>
          <small>Quick access · choose a tool</small>
        </div>
        <div className="campaign-home-session-rail__actions">
          {atTable.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" className="campaign-home-session-rail__action"
                onClick={() => onOpenTab(item.id)} aria-label={`Open ${item.label}`}>
                <Icon size={19} strokeWidth={1.8} aria-hidden="true"/>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <section className="campaign-home-overview" aria-label="Campaign library at a glance">
        {overview.map(item => {
          const Icon = item.icon;
          return (
            <button type="button" key={item.id} className="campaign-home-overview-item"
              onClick={() => onOpenTab(item.id)} aria-label={`Open ${item.label}`}>
              <Icon size={19} aria-hidden="true" />
              <strong>{(item.key === 'party' ? partySnapshot.status === 'loading' || partySnapshot.status === 'unavailable' : homeLoading || unavailableSections.includes(item.key)) ? '—' : item.count}</strong>
              <span>{item.label}</span>
            </button>
          );
        })}
      </section>

      <div className="campaign-home-workbench">
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
          <p>{nextEvent ? `Next: ${nextEvent.name} · ${eventCountdownLabel(nextEvent.daysUntil)}` :
            unavailableSections.includes('events') || unavailableSections.includes('calendar')
              ? 'Calendar events unavailable. Refresh to try again.'
              : 'No upcoming event scheduled.'}</p>
        </button>
      </section>

      <section className="guild-command-party" aria-labelledby="guild-command-party-title">
        <div className="guild-command-party__heading">
          <div>
            <span className="guild-command-party__eyebrow">YOUR ADVENTURERS</span>
            <h3 id="guild-command-party-title">Party at a Glance</h3>
          </div>
          <button type="button" onClick={() => onOpenTab('players')}>Manage party →</button>
        </div>
        {partySnapshot.members.length ? (
          <ul className="guild-command-party__list">
            {partySnapshot.members.slice(0, 5).map((member, index) => (
              <li key={String(member.id || member.name || index)} className="guild-command-party__member">
                <span className="guild-command-party__avatar" aria-hidden="true">
                  {String(member.name || '?').trim().charAt(0).toUpperCase()}
                </span>
                <div className="guild-command-party__identity">
                  <strong>{member.name}</strong>
                  <span>{[member.race, member.className !== 'Class' ? member.className : '', member.level ? `Lv ${member.level}` : ''].filter(Boolean).join(' · ')}</span>
                </div>
                {member.maxHp > 0 ? (
                  <span className="guild-command-party__stat" title="Current and maximum hit points">
                    <Heart size={15} aria-hidden="true" />
                    {member.currentHp} / {member.maxHp}
                  </span>
                ) : (
                  <span className="guild-command-party__stat guild-command-party__stat--muted">
                    <Shield size={15} aria-hidden="true" /> AC {member.armorClass || '—'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="guild-command-party__empty" role="status">
            {partySnapshot.status === 'loading' ? 'Loading party…' :
              partySnapshot.status === 'unavailable' ? 'Party records are unavailable. Refresh to try again.' :
              'No adventurers linked yet. Open Players to build your party.'}
          </p>
        )}
        {partySnapshot.status === 'stale' && (
          <p className="guild-command-party__status" role="status">Showing the last loaded party; refresh was unsuccessful.</p>
        )}
        {partySnapshot.members.length > 5 && (
          <button type="button" className="guild-command-party__more" onClick={() => onOpenTab('players')}>
            View all {partySnapshot.members.length} adventurers
          </button>
        )}
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

      <section className="campaign-home-section" aria-labelledby="campaign-quick-start-title">
        <div className="campaign-home-section-heading">
          <h2 id="campaign-quick-start-title">More ways to prepare</h2>
          <span>Campaign administration, world-building and supporting materials.</span>
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

      </div>

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
