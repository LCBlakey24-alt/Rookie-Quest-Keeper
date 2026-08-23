import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { combineLinkedCampaigns } from '@/components/dashboard/player/playerDashboardUtils';
import {
  describePlayerDashboardFailures,
  fetchPlayerDashboardSections,
} from '@/components/dashboard/player/playerDashboardData';
import apiClient from '@/lib/apiClient';
import JoinCampaignModal from '@/components/JoinCampaignModal';
import PlayerNotesTab from '@/components/tabs/PlayerNotesTab';
import { PlayerHandoutsPanel } from '@/components/tabs/HandoutsTab';
import '@/styles/playerDashboardBoard.css';

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
  const [selectedCharacterId, setSelectedCharacterId] = useState('');
  const [handoutSummary, setHandoutSummary] = useState({ total: 0, unread: 0, saved: 0 });
  const [loadWarning, setLoadWarning] = useState('');

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) || characters[0] || null,
    [characters, selectedCharacterId],
  );

  const dashboardTabs = useMemo(() => tabs.map((tab) => {
    if (tab.id !== 'handouts' || handoutSummary.unread <= 0) return tab;
    return { ...tab, label: `Received (${handoutSummary.unread})` };
  }), [handoutSummary.unread]);

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
      value: characters.length,
      icon: Shield,
      detail: characters.length === 1 ? 'ready hero' : 'ready heroes',
    },
    {
      label: 'Campaigns',
      value: linkedCampaigns.length,
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
  ]), [characters.length, linkedCampaigns.length, selectedCharacter]);

  const loadPlayerData = useCallback(async ({ notifyFailure = true } = {}) => {
    try {
      const result = await fetchPlayerDashboardSections(apiClient);

      if (result.characters !== null) setCharacters(result.characters);
      if (result.campaigns !== null) setCampaigns(result.campaigns);
      if (result.handoutSummary !== null) setHandoutSummary(result.handoutSummary);

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
      const description = error?.response?.data?.detail
        || 'Could not refresh the player dashboard. Showing last known data where available.';
      setLoadWarning(description);
      if (notifyFailure) toast.error('Player dashboard could not be refreshed', { description });
      return { ok: false, failures: ['dashboard'] };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlayerData();
  }, [loadPlayerData]);

  useEffect(() => {
    if (characters.length === 0) {
      if (selectedCharacterId) setSelectedCharacterId('');
      return;
    }

    const selectionStillExists = characters.some((character) => character.id === selectedCharacterId);
    if (!selectionStillExists) setSelectedCharacterId(characters[0].id);
  }, [characters, selectedCharacterId]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const result = await loadPlayerData();
      if (result.ok) toast.success('Player dashboard refreshed');
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
            onCreateCharacter={() => navigate('/characters/new')}
            onOpenCharacter={(character) => navigate(`/characters/${character.id}`)}
          />
        )}

        {activeTab === 'campaigns' && (
          <PlayerCampaignsPanel
            campaigns={linkedCampaigns}
            onJoinCampaign={openJoinFlow}
            onOpenCampaign={(campaign) => navigate(`/campaign/${campaign.id}`)}
          />
        )}

        {activeTab === 'notes' && <PlayerNotesTab campaigns={linkedCampaigns} />}
        {activeTab === 'handouts' && <PlayerHandoutsPanel />}
      </PlayerDashboardTabs>

      <JoinCampaignModal
        characterId={selectedCharacter?.id}
        characterName={selectedCharacter?.name || 'Selected character'}
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onSuccess={() => loadPlayerData()}
      />
    </main>
  );
}

const loadWarningStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  padding: '12px 14px',
  border: '1px solid rgba(245, 158, 11, 0.45)',
  borderLeft: '4px solid #f59e0b',
  background: 'rgba(245, 158, 11, 0.08)',
  color: 'var(--rq-text-primary, #ffffff)',
};
