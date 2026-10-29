import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, BookOpen, FileText, Mail, Shield, Users } from 'lucide-react';
import PlayerDashboardHeader from '@/components/dashboard/player/PlayerDashboardHeader';
import PlayerDashboardLoading from '@/components/dashboard/player/PlayerDashboardLoading';
import PlayerJoinStrip from '@/components/dashboard/player/PlayerJoinStrip';
import PlayerDashboardContext from '@/components/dashboard/player/PlayerDashboardContext';
import PlayerDashboardTabs from '@/components/dashboard/player/PlayerDashboardTabs';
import PlayerCharactersPanel from '@/components/dashboard/player/PlayerCharactersPanel';
import PlayerCampaignsPanel from '@/components/dashboard/player/PlayerCampaignsPanel';
import PlayerSuggestionBox from '@/components/dashboard/player/PlayerSuggestionBox';
import { combineLinkedCampaigns } from '@/components/dashboard/player/playerDashboardUtils';
import { playerSheetReturnState } from '@/components/player/playerSheetNavigation';
import {
  describePlayerDashboardFailures,
  fetchPlayerDashboardSections,
  fetchPlayerHandoutSummary,
} from '@/components/dashboard/player/playerDashboardData';
import apiClient from '@/lib/apiClient';
import { readActiveCharacterId, storeActiveCharacterId } from '@/components/dashboard/player/playerActiveCharacterStorage';
import JoinCampaignModal from '@/components/JoinCampaignModal';
import '@/styles/playerDashboardBoard.css';
import '@/styles/playerHandoutsPanel.css';

const PlayerNotesTab = lazy(() => import('@/components/tabs/PlayerNotesTab'));
const PlayerHandoutsPanel = lazy(() => import('@/components/tabs/HandoutsTab').then(module => ({ default: module.PlayerHandoutsPanel })));
const tabs = [
  { id: 'characters', label: 'Characters', icon: Shield, testId: 'tab-characters' },
  { id: 'campaigns', label: 'Campaigns', icon: BookOpen, testId: 'tab-campaigns' },
  { id: 'notes', label: 'Notes', icon: FileText, testId: 'tab-notes' },
  { id: 'handouts', label: 'Received', icon: Mail, testId: 'tab-handouts' },
];

export default function PlayerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('characters');
  const [characters, setCharacters] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState(readActiveCharacterId);
  const [charactersLoaded, setCharactersLoaded] = useState(false);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const dataRequestRef = useRef(0);
  const handoutRequestRef = useRef(0);
  const mountedRef = useRef(false);
  const [handoutSummary, setHandoutSummary] = useState(null);
  const [handoutSummaryError, setHandoutSummaryError] = useState(false);
  const [loadWarning, setLoadWarning] = useState('');

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) || characters[0] || null,
    [characters, selectedCharacterId],
  );

  const dashboardTabs = useMemo(() => tabs.map((tab) => {
    const unread = Number(handoutSummary?.unread || 0);
    if (tab.id !== 'handouts' || unread <= 0) return tab;
    return { ...tab, badge: unread };
  }), [handoutSummary]);

  const activeTabMeta = useMemo(
    () => dashboardTabs.find((tab) => tab.id === activeTab) || dashboardTabs[0],
    [activeTab, dashboardTabs],
  );

  const linkedCampaigns = useMemo(
    () => combineLinkedCampaigns(campaigns, characters),
    [campaigns, characters],
  );

  const playerSummaryCards = useMemo(() => ([
    {
      label: 'Characters',
      value: charactersLoaded ? characters.length : '—',
      icon: Shield,
      detail: characters.length === 1 ? 'ready hero' : 'ready heroes',
    },
    {
      label: 'Campaigns',
      value: campaignsLoaded ? linkedCampaigns.length : '—',
      icon: BookOpen,
      detail: linkedCampaigns.length === 1 ? 'linked table' : 'linked tables',
    },
    {
      label: 'Active Character',
      value: selectedCharacter?.name || 'None yet',
      icon: Users,
      detail: selectedCharacter
        ? `Level ${selectedCharacter.level || 1} ${selectedCharacter.character_class || 'Adventurer'}`
        : 'Create or import a character',
    },
  ]), [characters.length, linkedCampaigns.length, selectedCharacter, charactersLoaded, campaignsLoaded]);

  const loadPlayerData = useCallback(async ({ notifyFailure = true } = {}) => {
    const request = ++dataRequestRef.current;
    const isCurrent = () => mountedRef.current && request === dataRequestRef.current;
    try {
      const result = await fetchPlayerDashboardSections(apiClient, { includeHandouts: false });
      if (!isCurrent()) return { ok: false, stale: true, failures: [] };

      if (result.characters !== null) {
        setCharacters(result.characters);
        setCharactersLoaded(true);
      }
      if (result.campaigns !== null) {
        setCampaigns(result.campaigns);
        setCampaignsLoaded(true);
      }

      if (result.ok) {
        setLoadWarning('');
      } else {
        const description = describePlayerDashboardFailures(result.failures);
        setLoadWarning(description);
        if (notifyFailure) {
          toast.warning('Some player dashboard data could not be refreshed', { description });
        }
      }

      return result;
    } catch (error) {
      if (!isCurrent()) return { ok: false, stale: true, failures: [] };
      const description = error?.response?.data?.detail
        || 'Could not refresh the player dashboard. Showing last known data where available.';
      setLoadWarning(description);
      if (notifyFailure) toast.error('Player dashboard could not be refreshed', { description });
      return { ok: false, failures: ['dashboard'] };
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, []);

  const refreshHandouts = useCallback(async () => {
    const request = ++handoutRequestRef.current;
    const isCurrent = () => mountedRef.current && request === handoutRequestRef.current;
    try {
      const summary = await fetchPlayerHandoutSummary(apiClient);
      if (!isCurrent()) return false;
      setHandoutSummary(summary);
      setHandoutSummaryError(false);
      return true;
    } catch {
      if (isCurrent()) setHandoutSummaryError(true);
      return false;
    }
  }, []);

  const acceptHandoutSummary = useCallback((summary) => {
    // A read/save change from Received is newer than any in-flight summary request.
    handoutRequestRef.current += 1;
    setHandoutSummary(summary);
    setHandoutSummaryError(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadPlayerData();
    refreshHandouts();
    return () => {
      mountedRef.current = false;
      dataRequestRef.current += 1;
      handoutRequestRef.current += 1;
    };
  }, [loadPlayerData, refreshHandouts]);

  useEffect(() => {
    if (loading || !charactersLoaded) return;

    if (characters.length === 0) {
      if (selectedCharacterId) setSelectedCharacterId('');
      storeActiveCharacterId('');
      return;
    }

    const selectionStillExists = characters.some((character) => character.id === selectedCharacterId);
    if (!selectionStillExists) {
      setSelectedCharacterId(characters[0].id);
      return;
    }

    storeActiveCharacterId(selectedCharacterId);
  }, [characters, loading, selectedCharacterId, charactersLoaded]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const [result, handoutsOk] = await Promise.all([loadPlayerData(), refreshHandouts()]);
      if (result.stale) return;
      if (result.ok && handoutsOk) toast.success('Player dashboard refreshed');
      else if (result.ok) toast.warning('Dashboard refreshed, but received-handout status is still unavailable.');
    } finally {
      setRefreshing(false);
    }
  };

  const openJoinFlow = () => {
    if (characters.length === 0) {
      toast.info('Create a character first', {
        description: 'You need a character before joining a campaign.',
      });
      navigate('/characters/new');
      return;
    }

    setJoinOpen(true);
  };

  const refreshAfterJoin = () => {
    loadPlayerData();
    refreshHandouts();
  };

  if (loading) return <PlayerDashboardLoading />;

  return (
    <main className="player-dashboard-page">
      <PlayerDashboardHeader
        refreshing={refreshing}
        onBack={() => navigate('/home')}
        onRefresh={refresh}
        onCreateCharacter={() => navigate('/characters/new')}
        onJoinCampaign={openJoinFlow}
      />

      {loadWarning && (
        <aside data-testid="player-dashboard-load-warning" role="status" style={loadWarningStyle}>
          <AlertTriangle size={18} aria-hidden="true" style={{ flex: '0 0 auto' }} />
          <div>
            <strong>Some dashboard data is temporarily unavailable.</strong>
            <span>{loadWarning}</span>
          </div>
        </aside>
      )}

      {handoutSummaryError && (
        <aside data-testid="player-handout-summary-warning" role="status" style={handoutWarningStyle}>
          <Mail size={18} aria-hidden="true" style={{ flex: '0 0 auto' }} />
          <div>
            <strong>Received-handout status is temporarily unavailable.</strong>
            <span>{handoutSummary
              ? 'Keeping your last known unread count until the next successful check.'
              : 'Unread items have not been counted yet. Open Received or refresh to try again.'}</span>
          </div>
        </aside>
      )}

      <PlayerJoinStrip
        characters={characters}
        selectedCharacterId={selectedCharacterId}
        onSelectedCharacterChange={setSelectedCharacterId}
        onJoinCampaign={openJoinFlow}
      />

      <PlayerDashboardContext
        activeLabel={activeTabMeta.label}
        summaryCards={playerSummaryCards}
      />

      <PlayerDashboardTabs tabs={dashboardTabs} activeTab={activeTab} setActiveTab={setActiveTab}>
        {activeTab === 'characters' && (
          <PlayerCharactersPanel
            characters={characters}
            unavailable={!charactersLoaded}
            onCreateCharacter={() => navigate('/characters/new')}
            onImportCharacter={() => navigate('/characters/import')}
            onOpenCharacter={(character) => navigate(`/characters/${character.id}`, { state: playerSheetReturnState('/player') })}
          />
        )}

        {activeTab === 'campaigns' && (
          <PlayerCampaignsPanel
            campaigns={linkedCampaigns}
            unavailable={!campaignsLoaded}
            onJoinCampaign={openJoinFlow}
            onOpenCampaign={(campaign) => navigate(`/player/campaign/${campaign.id}`)}
          />
        )}

        {activeTab === 'notes' && (
          <Suspense fallback={<div style={tabLoadingStyle}>Loading notes…</div>}>
            <PlayerNotesTab campaigns={linkedCampaigns} />
          </Suspense>
        )}
        {activeTab === 'handouts' && (
          <Suspense fallback={<div style={tabLoadingStyle}>Loading received handouts…</div>}>
            <div className="player-handouts-surface">
              <PlayerHandoutsPanel onSummaryChange={acceptHandoutSummary} />
            </div>
          </Suspense>
        )}
      </PlayerDashboardTabs>

      <PlayerSuggestionBox />

      <JoinCampaignModal
        characterId={selectedCharacter?.id}
        characterName={selectedCharacter?.name || 'Selected character'}
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onSuccess={refreshAfterJoin}
      />
    </main>
  );
}

const loadWarningStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  padding: '12px 14px',
  border: '1px solid rgba(211, 154, 67, 0.28)',
  borderLeft: '3px solid var(--rq-warning, #D39A43)',
  borderRadius: 7,
  background: 'var(--rq-bg-panel, #1E2936)',
  color: 'var(--rq-text-primary, #EADFC8)',
};

const handoutWarningStyle = {
  ...loadWarningStyle,
  marginTop: 8,
  border: '1px solid rgba(110, 145, 180, 0.32)',
  borderLeft: '3px solid var(--rq-info, #6E91B4)',
};

const tabLoadingStyle = {
  minHeight: 96,
  display: 'grid',
  placeItems: 'center',
  padding: 12,
  border: '1px solid var(--rq-line, rgba(137, 157, 176, .14))',
  borderRadius: 7,
  background: 'var(--rq-bg-panel, #1E2936)',
  color: 'var(--rq-text-secondary, rgba(234, 223, 200, .78))',
  fontSize: 13,
  fontWeight: 600,
};
