import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  FileText,
  Mail,
  Link2,
  Plus,
  RefreshCw,
  Shield,
  Users,
} from 'lucide-react';
import PlayerDashboardLoading from '@/components/dashboard/player/PlayerDashboardLoading';
import { combineLinkedCampaigns, summarizeHandouts } from '@/components/dashboard/player/playerDashboardUtils';
import apiClient from '@/lib/apiClient';
import JoinCampaignModal from '@/components/JoinCampaignModal';
import PlayerNotesTab from '@/components/tabs/PlayerNotesTab';
import '@/styles/playerDashboardBoard.css';
import { PlayerHandoutsPanel } from '@/components/tabs/HandoutsTab';

const rq = {
  bg: '#242424',
  panel: '#2f2f2f',
  input: '#3a3a3a',
  border: 'rgba(255,255,255,0.22)',
  borderDefault: 'rgba(255,255,255,0.16)',
  accent: '#d00000',
  accentHover: '#ff3b3b',
  accentSoft: 'rgba(208,0,0,0.18)',
  text: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.78)',
  muted: 'rgba(255,255,255,0.62)',
  radius: '0',
  radiusSm: '0',
};

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
    () => characters.find(character => character.id === selectedCharacterId) || characters[0] || null,
    [characters, selectedCharacterId]
  );

  const activeTabMeta = useMemo(
    () => tabs.find(tab => tab.id === activeTab) || tabs[0],
    [activeTab]
  );

  const linkedCampaigns = useMemo(() => combineLinkedCampaigns(campaigns, characters), [campaigns, characters]);

  const playerSummaryCards = useMemo(() => ([
    { label: 'Characters', value: characters.length, icon: Shield, detail: characters.length === 1 ? 'ready hero' : 'ready heroes' },
    { label: 'Campaigns', value: linkedCampaigns.length, icon: BookOpen, detail: linkedCampaigns.length === 1 ? 'linked table' : 'linked tables' },
    { label: 'Active Character', value: selectedCharacter?.name || 'None yet', icon: Users, detail: selectedCharacter ? `Level ${selectedCharacter.level || 1} ${selectedCharacter.character_class || 'Adventurer'}` : 'Full, Basic, or Rook' },
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

      const handouts = Array.isArray(handoutsRes.data) ? handoutsRes.data : [];
      const gmCampaigns = Array.isArray(gmCampaignsRes.data) ? gmCampaignsRes.data : gmCampaignsRes.data?.campaigns || [];
      const joinedCampaigns = Array.isArray(joinedCampaignsRes.data) ? joinedCampaignsRes.data : joinedCampaignsRes.data?.campaigns || [];
      const campaignMap = new Map();
      [...gmCampaigns, ...joinedCampaigns].forEach(campaign => {
        if (campaign?.id) campaignMap.set(campaign.id, campaign);
      });

      setCharacters(Array.isArray(charactersRes.data) ? charactersRes.data : charactersRes.data?.characters || []);
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
        description: 'You need a character before joining a campaign.'
      });
      navigate('/characters/new');
      return;
    }
    setJoinOpen(true);
  };

  if (loading) return <PlayerDashboardLoading />;

  return (
    <main className="player-dashboard-page" style={pageStyle}>
      <section style={heroStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <Button data-testid="back-btn" onClick={() => navigate('/home')} className="btn-outline" style={iconButtonStyle} aria-label="Back to dashboard">
            <ArrowLeft size={18} />
          </Button>
          <div style={{ minWidth: 0 }}>
            <p style={eyebrowStyle}>Player Dashboard</p>
            <h1 style={titleStyle}>Your Characters, Campaigns & Notes</h1>
            <p style={subtitleStyle}>Create a character with Full Creator, Basic Creator, or Rook Character Matchmaker, then join a GM campaign and keep player-facing notes in one place.</p>
          </div>
        </div>
        <div className="player-dashboard-actions" style={heroActionsStyle}>
          <Button onClick={refresh} className="btn-outline" style={actionButtonStyle} disabled={refreshing}>
            <RefreshCw size={16} style={{ opacity: refreshing ? 0.6 : 1 }} />
            Refresh
          </Button>
          <Button data-testid="create-character-btn" onClick={() => navigate('/characters/new')} className="btn-primary" style={actionButtonStyle}>
            <Plus size={16} />
            Create Character
          </Button>
          <Button data-testid="join-campaign-btn" onClick={openJoinFlow} className="btn-primary" style={actionButtonStyle}>
            <Link2 size={16} />
            Join Campaign
          </Button>
        </div>
      </section>

      {characters.length > 0 && (
        <section className="player-dashboard-board" style={joinStripStyle}>
          <label style={joinLabelStyle}>Join as</label>
          <select value={selectedCharacterId} onChange={(event) => setSelectedCharacterId(event.target.value)} style={selectStyle} aria-label="Select character for campaign join">
            {characters.map(character => (
              <option key={character.id} value={character.id}>{character.name || 'Unnamed Character'}</option>
            ))}
          </select>
          <Button onClick={openJoinFlow} className="btn-outline" style={actionButtonStyle}>
            <Link2 size={16} />
            Use Join Code
          </Button>
        </section>
      )}

      <section className="player-desktop-context player-dashboard-board" style={desktopContextStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}>Current Player Space</p>
          <h2 style={desktopTitleStyle}>{activeTabMeta.label}</h2>
          <p style={desktopTextStyle}>Desktop gives players a quick command centre for sheets, linked campaigns, notes, and GM handouts without squeezing everything into a phone layout.</p>
        </div>
        <div style={summaryGridStyle}>
          {playerSummaryCards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} style={summaryCardStyle}>
                <Icon size={18} color={rq.accentHover} />
                <div style={{ minWidth: 0 }}>
                  <p style={summaryLabelStyle}>{card.label}</p>
                  <strong style={summaryValueStyle}>{card.value}</strong>
                  <span style={summaryDetailStyle}>{card.detail}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="player-dashboard-board" style={tabShellStyle}>
        <div style={tabListStyle} role="tablist" aria-label="Player dashboard tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-testid={tab.testId}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                style={tabButtonStyle(active)}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={tabContentStyle}>
          {activeTab === 'characters' && (
            <div style={gridStyle}>
              {characters.length === 0 ? (
                <EmptyState title="No characters yet" text="Create a character with Full Creator, start quick with Basic Creator, or ask Rook Character Matchmaker to suggest a hero." action="Create Character" onAction={() => navigate('/characters/new')} />
              ) : characters.map(character => (
                <Card key={character.id} className="player-dashboard-card" style={cardStyle}>
                  <CardContent style={cardContentStyle}>
                    <div>
                      <p style={eyebrowStyle}>Character</p>
                      <h2 style={cardTitleStyle}>{character.name || 'Unnamed Character'}</h2>
                      <p style={cardTextStyle}>Level {character.level || 1} {character.race || ''} {character.character_class || 'Adventurer'}</p>
                    </div>
                    <Button onClick={() => navigate(`/characters/${character.id}`)} className="btn-outline" style={actionButtonStyle}>
                      Open Sheet <ChevronRight size={16} />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div style={gridStyle}>
              {linkedCampaigns.length === 0 ? (
                <EmptyState title="No linked campaigns" text="Use a join code from your GM to link a character to a campaign." action="Join Campaign" onAction={openJoinFlow} />
              ) : linkedCampaigns.map(campaign => (
                <Card key={campaign.id} className="player-dashboard-card" style={cardStyle}>
                  <CardContent style={cardContentStyle}>
                    <div>
                      <p style={eyebrowStyle}>{campaign.member_role ? 'Joined Campaign' : 'Campaign'}</p>
                      <h2 style={cardTitleStyle}>{campaign.name || 'Linked Campaign'}</h2>
                      <p style={cardTextStyle}>{campaign.description || campaign.from_character ? `Linked via ${campaign.from_character || 'your character'}` : 'Campaign linked to your player account.'}</p>
                    </div>
                    <Button onClick={() => navigate(`/campaign/${campaign.id}`)} className="btn-outline" style={actionButtonStyle}>
                      Open Campaign <ChevronRight size={16} />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'notes' && <PlayerNotesTab />}
          {activeTab === 'handouts' && <PlayerHandoutsPanel summary={handoutSummary} />}
        </div>
      </section>

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

function EmptyState({ title, text, action, onAction }) {
  return (
    <div style={emptyStyle}>
      <h2 style={cardTitleStyle}>{title}</h2>
      <p style={cardTextStyle}>{text}</p>
      <Button onClick={onAction} className="btn-primary" style={actionButtonStyle}>{action}</Button>
    </div>
  );
}

const pageStyle = { minHeight: '100vh', background: rq.bg, color: rq.text, display: 'flex', flexDirection: 'column', gap: '18px' };
const heroStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' };
const heroActionsStyle = { display: 'flex', gap: '10px', flexWrap: 'wrap' };
const eyebrowStyle = { margin: 0, color: rq.accentHover, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '11px', fontWeight: 900 };
const titleStyle = { margin: '4px 0 6px', color: rq.text, fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.02 };
const subtitleStyle = { margin: 0, color: rq.textSecondary, maxWidth: '640px' };
const actionButtonStyle = { minHeight: '40px', borderRadius: rq.radiusSm, display: 'inline-flex', alignItems: 'center', gap: '8px' };
const iconButtonStyle = { width: 42, height: 42, borderRadius: rq.radiusSm };
const joinStripStyle = { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', background: rq.panel, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radius, padding: '12px' };
const joinLabelStyle = { color: rq.textSecondary, fontWeight: 800, fontSize: '13px' };
const selectStyle = { minHeight: 40, minWidth: 220, background: rq.input, color: rq.text, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '0 10px' };
const desktopContextStyle = { display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', background: rq.panel, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radius, padding: '18px' };
const desktopTitleStyle = { margin: 0, color: rq.text, fontSize: '24px' };
const desktopTextStyle = { margin: '6px 0 0', color: rq.textSecondary, maxWidth: '640px', lineHeight: 1.5 };
const summaryGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(130px, 1fr))', gap: '10px', minWidth: 'min(100%, 460px)' };
const summaryCardStyle = { display: 'flex', gap: '10px', alignItems: 'flex-start', background: rq.input, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '12px' };
const summaryLabelStyle = { margin: 0, color: rq.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 900 };
const summaryValueStyle = { display: 'block', color: rq.text, fontSize: '16px', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const summaryDetailStyle = { display: 'block', color: rq.textSecondary, fontSize: '12px', marginTop: '2px' };
const tabShellStyle = { background: rq.panel, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radius, overflow: 'hidden' };
const tabListStyle = { display: 'flex', gap: 0, flexWrap: 'wrap', borderBottom: `1px solid ${rq.borderDefault}` };
const tabButtonStyle = (active) => ({ border: 0, borderRight: `1px solid ${rq.borderDefault}`, background: active ? rq.accentSoft : 'transparent', color: active ? rq.accentHover : rq.textSecondary, padding: '12px 16px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 900, cursor: 'pointer' });
const tabContentStyle = { padding: '18px' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' };
const cardStyle = { background: rq.input, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radius };
const cardContentStyle = { padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' };
const cardTitleStyle = { margin: '4px 0', color: rq.text, fontSize: '20px' };
const cardTextStyle = { margin: 0, color: rq.textSecondary, lineHeight: 1.45 };
const emptyStyle = { background: rq.input, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radius, padding: '24px', textAlign: 'center' };
