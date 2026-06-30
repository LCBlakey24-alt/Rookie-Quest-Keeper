import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BookOpen, FileText, Mail, Shield, Users } from 'lucide-react';
import PlayerDashboardHeader from '@/components/dashboard/player/PlayerDashboardHeader';
import PlayerDashboardLoading from '@/components/dashboard/player/PlayerDashboardLoading';
import PlayerJoinStrip from '@/components/dashboard/player/PlayerJoinStrip';
import PlayerDashboardContext from '@/components/dashboard/player/PlayerDashboardContext';
import PlayerDashboardTabs from '@/components/dashboard/player/PlayerDashboardTabs';
import PlayerCharactersPanel from '@/components/dashboard/player/PlayerCharactersPanel';
import PlayerCampaignsPanel from '@/components/dashboard/player/PlayerCampaignsPanel';
import { combineLinkedCampaigns, summarizeHandouts } from '@/components/dashboard/player/playerDashboardUtils';
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

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) || characters[0] || null,
    [characters, selectedCharacterId],
  );

  const activeTabMeta = useMemo(
    () => tabs.find((tab) => tab.id === activeTab) || tabs[0],
    [activeTab],
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
        : 'Full, Basic, or Rook',
    },
  ]), [characters.length, linkedCampaigns.length, selectedCharacter]);

  useEffect(() => {
    loadPlayerData();
  }, []);

  useEffect(() => {
    if (!selectedCharacterId && characters.length > 0) {
      setSelectedCharacterId(characters[0].id);
    }
  }, [characters, selectedCharacterId]);

  const loadPlayerData = async () => {
    try {
      const [charactersRes, gmCampaignsRes, joinedCampaignsRes, handoutsRes] = await Promise.all([
        apiClient.get('/characters').catch(() => ({ data: [] })),
        apiClient.get('/campaigns').catch(() => ({ data: [] })),
        apiClient.get('/campaign-invites/joined/list').catch(() => ({ data: [] })),
        apiClient.get('/player/handouts').catch(() => ({ data: [] })),
      ]);

      const loadedCharacters = Array.isArray(charactersRes.data)
        ? charactersRes.data
        : charactersRes.data?.characters || [];
      const handouts = Array.isArray(handoutsRes.data) ? handoutsRes.data : [];
      const gmCampaigns = Array.isArray(gmCampaignsRes.data)
        ? gmCampaignsRes.data
        : gmCampaignsRes.data?.campaigns || [];
      const joinedCampaigns = Array.isArray(joinedCampaignsRes.data)
        ? joinedCampaignsRes.data
        : joinedCampaignsRes.data?.campaigns || [];
      const campaignMap = new Map();

      [...gmCampaigns, ...joinedCampaigns].forEach((campaign) => {
        if (campaign?.id) campaignMap.set(campaign.id, campaign);
      });

      setCharacters(loadedCharacters);
      setCampaigns(Array.from(campaignMap.values()));
      setHandoutSummary(summarizeHandouts(handouts));
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to load player dashboard');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadPlayerData();
      toast.success('Player dashboard refreshed');
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

      <PlayerDashboardTabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab}>
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

        {activeTab === 'notes' && <PlayerNotesTab />}
        {activeTab === 'handouts' && <PlayerHandoutsPanel summary={handoutSummary} />}
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
