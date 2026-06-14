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
import apiClient from '@/lib/apiClient';
import JoinCampaignModal from '@/components/JoinCampaignModal';
import PlayerNotesTab from '@/components/tabs/PlayerNotesTab';
import { PlayerHandoutsPanel } from '@/components/tabs/HandoutsTab';

const rq = {
  bg: 'var(--rq-bg-main, #080B1A)',
  panel: 'var(--rq-bg-panel, #12172A)',
  input: 'var(--rq-bg-input, #0D1224)',
  border: 'var(--rq-accent-border, rgba(124,58,237,0.32))',
  borderDefault: 'var(--rq-border-default, rgba(191,219,254,0.14))',
  accent: 'var(--rq-accent-primary, #7C3AED)',
  accentHover: 'var(--rq-accent-hover, #A78BFA)',
  accentSoft: 'var(--rq-accent-soft, rgba(124,58,237,0.14))',
  text: 'var(--rq-text-primary, #FFFFFF)',
  textSecondary: 'var(--rq-text-secondary, #D6D6D6)',
  muted: 'var(--rq-text-muted, #A0A0A0)',
  radius: 'var(--rq-radius-md, 6px)',
  radiusSm: 'var(--rq-radius-sm, 4px)',
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

  const linkedCampaigns = useMemo(() => {
    const campaignMap = new Map();

    campaigns.forEach(campaign => {
      if (campaign?.id) campaignMap.set(campaign.id, campaign);
    });

    characters.forEach(character => {
      const id = character.campaign_id || character.campaignId;
      if (!id || campaignMap.has(id)) return;
      campaignMap.set(id, {
        id,
        name: character.campaign_name || 'Linked Campaign',
        description: character.campaign_description || '',
        from_character: character.name,
      });
    });

    return Array.from(campaignMap.values());
  }, [campaigns, characters]);

  const playerSummaryCards = useMemo(() => ([
    { label: 'Characters', value: characters.length, icon: Shield, detail: characters.length === 1 ? 'ready hero' : 'ready heroes' },
    { label: 'Campaigns', value: linkedCampaigns.length, icon: BookOpen, detail: linkedCampaigns.length === 1 ? 'linked table' : 'linked tables' },
    { label: 'Handouts', value: handoutSummary.unread ? `${handoutSummary.unread} new` : handoutSummary.total, icon: Mail, detail: handoutSummary.saved ? `${handoutSummary.saved} saved clues` : 'received clues' },
    { label: 'Active Character', value: selectedCharacter?.name || 'None yet', icon: Users, detail: selectedCharacter ? `Level ${selectedCharacter.level || 1} ${selectedCharacter.character_class || 'Adventurer'}` : 'Create one to begin' },
  ]), [characters.length, handoutSummary.saved, handoutSummary.total, handoutSummary.unread, linkedCampaigns.length, selectedCharacter]);

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
      const [charactersRes, campaignsRes, handoutsRes] = await Promise.all([
        apiClient.get('/characters').catch(() => ({ data: [] })),
        apiClient.get('/campaigns').catch(() => ({ data: [] })),
        apiClient.get('/player/handouts').catch(() => ({ data: [] })),
      ]);

      const handouts = Array.isArray(handoutsRes.data) ? handoutsRes.data : [];
      setCharacters(Array.isArray(charactersRes.data) ? charactersRes.data : charactersRes.data?.characters || []);
      setCampaigns(Array.isArray(campaignsRes.data) ? campaignsRes.data : campaignsRes.data?.campaigns || []);
      setHandoutSummary({
        total: handouts.length,
        unread: handouts.filter(handout => !handout.read).length,
        saved: handouts.filter(handout => handout.saved).length,
      });
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

  if (loading) {
    return (
      <main style={pageStyle}>
        <div className="loading-spinner" />
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <Button data-testid="back-btn" onClick={() => navigate('/home')} className="btn-outline" style={iconButtonStyle} aria-label="Back to dashboard">
            <ArrowLeft size={18} />
          </Button>
          <div style={{ minWidth: 0 }}>
            <p style={eyebrowStyle}>Player Dashboard</p>
            <h1 style={titleStyle}>Your Characters, Campaigns & Notes</h1>
            <p style={subtitleStyle}>Create a character, join a GM campaign, and keep player-facing notes in one place.</p>
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
        <section style={joinStripStyle}>
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


      {selectedCharacter && (
        <ActiveCharacterPanel
          character={selectedCharacter}
          navigate={navigate}
          onJoin={openJoinFlow}
          onOpenHandouts={() => setActiveTab('handouts')}
          handoutSummary={handoutSummary}
        />
      )}

      <nav style={tabBarStyle} aria-label="Player dashboard tabs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} data-testid={tab.testId} type="button" onClick={() => setActiveTab(tab.id)} style={tabButtonStyle(active)}>
              <Icon size={16} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {tab.label}
                {tab.id === 'handouts' && handoutSummary.unread > 0 && (
                  <span style={tabBadgeStyle}>{handoutSummary.unread}</span>
                )}
              </span>
            </button>
          );
        })}
      </nav>


      <section className="player-desktop-context" style={desktopContextStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}>Current Space</p>
          <h2 style={desktopTitleStyle}>{activeTabMeta.label}</h2>
        </div>
        <div style={summaryGridStyle}>
          {playerSummaryCards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} style={summaryCardStyle}>
                <Icon size={16} color={rq.accentHover} />
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

      {activeTab === 'characters' && <CharactersTab characters={characters} navigate={navigate} onCreate={() => navigate('/characters/new')} onJoin={openJoinFlow} />}
      {activeTab === 'campaigns' && <CampaignsTab campaigns={linkedCampaigns} navigate={navigate} onJoin={openJoinFlow} />}
      {activeTab === 'notes' && <PlayerNotesTab campaigns={linkedCampaigns} />}
      {activeTab === 'handouts' && <PlayerHandoutsPanel onSummaryChange={setHandoutSummary} />}

      <style>{`@media (max-width: 1024px) { .player-desktop-context { display: none !important; } } @media (max-width: 900px) { .player-active-panel-fix { grid-template-columns: 1fr !important; } } @media (max-width: 720px) { .player-dashboard-actions { width: 100%; } }`}</style>

      <JoinCampaignModal
        characterId={selectedCharacter?.id}
        characterName={selectedCharacter?.name || 'this character'}
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onSuccess={async (campaign) => {
          await loadPlayerData();
          setActiveTab('campaigns');
          if (campaign?.id) navigate(`/campaign/${campaign.id}`);
        }}
      />
    </main>
  );
}


function ActiveCharacterPanel({ character, navigate, onJoin, onOpenHandouts, handoutSummary }) {
  const hp = character.current_hp ?? character.hit_points ?? character.hp ?? '—';
  const maxHp = character.max_hp ?? character.max_hit_points ?? character.hit_points_max ?? null;
  const ac = character.armor_class ?? character.ac ?? '—';
  const campaignName = character.campaign_name || 'Not linked yet';
  const subtitle = [`Level ${character.level || 1}`, character.race, character.character_class || character.class_name || 'Adventurer']
    .filter(Boolean)
    .join(' • ');

  return (
    <section className="player-active-panel-fix" style={activeCharacterStyle}>
      <div style={{ minWidth: 0 }}>
        <p style={eyebrowStyle}>Active Character</p>
        <h2 style={activeCharacterTitleStyle}>{character.name || 'Unnamed Character'}</h2>
        <p style={activeCharacterSubtitleStyle}>{subtitle}</p>
        <p style={linkedTextStyle}>Campaign: {campaignName}</p>
      </div>
      <div style={activeCharacterStatsStyle} aria-label="Active character quick stats">
        <MiniStat label="HP" value={maxHp ? `${hp}/${maxHp}` : hp} />
        <MiniStat label="AC" value={ac} />
        <MiniStat label="Clues" value={handoutSummary.unread ? `${handoutSummary.unread} new` : handoutSummary.saved || handoutSummary.total || 0} />
      </div>
      <div style={activeCharacterActionsStyle}>
        <Button onClick={() => navigate(`/characters/${character.id}`)} className="btn-primary" style={actionButtonStyle}>Open Sheet</Button>
        <Button onClick={onOpenHandouts} className="btn-outline" style={actionButtonStyle}>Clues</Button>
        <Button onClick={onJoin} className="btn-outline" style={actionButtonStyle}>Join Code</Button>
      </div>
    </section>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={miniStatStyle}>
      <span style={miniStatLabelStyle}>{label}</span>
      <strong style={miniStatValueStyle}>{value}</strong>
    </div>
  );
}

function CharactersTab({ characters, navigate, onCreate, onJoin }) {
  if (characters.length === 0) {
    return (
      <EmptyPanel
        icon={Shield}
        title="No characters yet"
        text="Create your first character, then use a GM join code to link them to a campaign."
        action={<Button onClick={onCreate} className="btn-primary"><Plus size={16} style={{ marginRight: 8 }} />Create Character</Button>}
      />
    );
  }

  return (
    <section style={gridStyle}>
      {characters.map(character => (
        <Card key={character.id} style={cardStyle} data-testid={`player-character-${character.id}`}>
          <CardContent style={cardContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={cardTitleStyle}>{character.name || 'Unnamed Character'}</h2>
                <p style={cardMetaStyle}>Level {character.level || 1} {character.race ? `${character.race} ` : ''}{character.character_class || character.class_name || 'Adventurer'}</p>
                {character.campaign_name && <p style={linkedTextStyle}>Linked to {character.campaign_name}</p>}
              </div>
              <Shield size={24} color={rq.accent} />
            </div>
            <div style={characterCardStatsStyle}>
              <CharacterCardStat label="HP" value={formatCharacterHp(character)} />
              <CharacterCardStat label="AC" value={character.armor_class ?? character.ac ?? '—'} />
              <CharacterCardStat label="Campaign" value={character.campaign_name ? 'Linked' : 'Solo'} />
            </div>
            <div style={cardActionsStyle}>
              <Button onClick={() => navigate(`/characters/${character.id}`)} className="btn-primary" style={cardButtonStyle}>Open Sheet <ChevronRight size={14} /></Button>
              <Button onClick={onJoin} className="btn-outline" style={cardButtonStyle}>Join Code</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}


function formatCharacterHp(character) {
  const current = character.current_hp ?? character.hit_points ?? character.hp ?? '—';
  const max = character.max_hp ?? character.max_hit_points ?? character.hit_points_max;
  return max ? `${current}/${max}` : current;
}

function CharacterCardStat({ label, value }) {
  return (
    <div style={characterCardStatStyle}>
      <span style={characterCardStatLabelStyle}>{label}</span>
      <strong style={characterCardStatValueStyle}>{value}</strong>
    </div>
  );
}

function CampaignsTab({ campaigns, navigate, onJoin }) {
  if (campaigns.length === 0) {
    return (
      <EmptyPanel
        icon={BookOpen}
        title="No linked campaigns yet"
        text="Ask your GM for a join code, then link one of your characters to their campaign."
        action={<Button onClick={onJoin} data-testid="join-campaign-empty-btn" className="btn-primary"><Link2 size={16} style={{ marginRight: 8 }} />Join Campaign</Button>}
      />
    );
  }

  return (
    <section style={gridStyle}>
      {campaigns.map(campaign => (
        <Card key={campaign.id} style={cardStyle} data-testid={`player-campaign-${campaign.id}`}>
          <CardContent style={cardContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={cardTitleStyle}>{campaign.name || 'Campaign'}</h2>
                <p style={cardMetaStyle}>{campaign.description || campaign.setting || campaign.world_setting_notes || 'No summary yet.'}</p>
                {campaign.from_character && <p style={linkedTextStyle}>Linked through {campaign.from_character}</p>}
              </div>
              <Users size={24} color={rq.accent} />
            </div>
            <div style={cardActionsStyle}>
              <Button onClick={() => navigate(`/campaign/${campaign.id}`)} className="btn-primary" style={cardButtonStyle}>Open Campaign <ChevronRight size={14} /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function EmptyPanel({ icon: Icon, title, text, action }) {
  return (
    <section style={emptyPanelStyle}>
      <Icon size={42} color={rq.accent} style={{ opacity: 0.75 }} />
      <h2 style={emptyTitleStyle}>{title}</h2>
      <p style={emptyTextStyle}>{text}</p>
      {action}
    </section>
  );
}

const pageStyle = { minHeight: '100dvh', background: 'radial-gradient(circle at top left, rgba(37,99,235,0.22), transparent 34%), radial-gradient(circle at top right, rgba(124,58,237,0.28), transparent 36%), var(--rq-bg-main, #080B1A)', padding: 'clamp(10px, 1.7vw, 18px)', color: rq.text, maxWidth: 1440, margin: '0 auto' };
const heroStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', marginBottom: '10px', flexWrap: 'wrap', background: 'linear-gradient(135deg, rgba(37,99,235,0.16), rgba(124,58,237,0.18))', border: `1px solid ${rq.border}`, borderRadius: rq.radius, padding: '12px 14px', boxShadow: '0 16px 42px rgba(0,0,0,0.22)' };
const iconButtonStyle = { minWidth: 36, height: 36, padding: 0, borderRadius: rq.radiusSm };
const eyebrowStyle = { color: rq.accentHover, fontSize: 10, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 3px' };
const titleStyle = { color: rq.text, fontSize: 'clamp(20px, 2.8vw, 28px)', fontWeight: 900, margin: 0, lineHeight: 1.08 };
const subtitleStyle = { color: rq.textSecondary, fontSize: 12, lineHeight: 1.35, margin: '5px 0 0', maxWidth: 680 };
const heroActionsStyle = { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' };
const desktopContextStyle = { display: 'grid', gridTemplateColumns: 'minmax(150px, 0.45fr) minmax(0, 1fr)', gap: '10px', alignItems: 'center', background: 'rgba(18,23,42,0.78)', border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radius, padding: '10px', marginBottom: '10px' };
const desktopTitleStyle = { color: rq.text, fontSize: 'clamp(16px, 1.4vw, 20px)', fontWeight: 900, margin: 0, lineHeight: 1.1 };
const summaryGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', minWidth: 0 };
const summaryCardStyle = { display: 'flex', gap: 8, alignItems: 'center', minWidth: 0, background: 'rgba(255,255,255,0.045)', border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '8px 10px' };
const summaryLabelStyle = { color: rq.muted, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.65, margin: '0 0 2px' };
const summaryValueStyle = { display: 'block', color: rq.text, fontSize: 14, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const summaryDetailStyle = { display: 'block', color: rq.textSecondary, fontSize: 11, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const actionButtonStyle = { display: 'flex', alignItems: 'center', gap: '7px', borderRadius: rq.radiusSm, fontWeight: 900, minHeight: 34, padding: '7px 11px', fontSize: 12 };
const joinStripStyle = { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', background: 'rgba(13,18,36,0.88)', border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radius, padding: '8px 10px', marginBottom: '10px' };
const joinLabelStyle = { color: rq.textSecondary, fontSize: 12, fontWeight: 900 };
const selectStyle = { minWidth: 200, flex: '1 1 200px', background: rq.input, color: rq.text, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '8px 10px', fontSize: 12 };
const tabBarStyle = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '6px', marginBottom: '10px', background: 'rgba(13,18,36,0.78)', border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radius, padding: 6 };
const tabButtonStyle = (active) => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '9px 10px', background: active ? 'linear-gradient(135deg, rgba(37,99,235,0.28), rgba(124,58,237,0.34))' : 'transparent', border: `1px solid ${active ? rq.border : 'transparent'}`, color: active ? rq.text : rq.textSecondary, borderRadius: rq.radiusSm, cursor: 'pointer', fontWeight: 900, minHeight: 36, fontSize: 12 });
const tabBadgeStyle = { minWidth: 17, height: 17, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', borderRadius: 999, background: 'linear-gradient(135deg, #A855F7, #38BDF8)', color: '#fff', fontSize: 9, fontWeight: 900, boxShadow: '0 0 12px rgba(168,85,247,0.35)' };

const activeCharacterStyle = { display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(240px, 0.9fr) auto', gap: 10, alignItems: 'center', background: 'linear-gradient(135deg, rgba(56,189,248,0.11), rgba(124,58,237,0.16))', border: `1px solid ${rq.border}`, borderRadius: rq.radius, padding: '10px 12px', marginBottom: '10px', minWidth: 0 };
const activeCharacterTitleStyle = { color: rq.text, fontSize: 'clamp(17px, 2vw, 22px)', fontWeight: 950, margin: 0, lineHeight: 1.05, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const activeCharacterSubtitleStyle = { color: rq.textSecondary, fontSize: 12, lineHeight: 1.35, margin: '5px 0 0' };
const activeCharacterStatsStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(70px, 1fr))', gap: 6, minWidth: 0 };
const miniStatStyle = { display: 'grid', gap: 3, minHeight: 52, alignContent: 'center', background: 'rgba(7,11,24,0.58)', border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '7px 9px', minWidth: 0 };
const miniStatLabelStyle = { color: rq.muted, fontSize: 9, fontWeight: 950, letterSpacing: 0.8, textTransform: 'uppercase' };
const miniStatValueStyle = { color: rq.text, fontSize: 14, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const activeCharacterActionsStyle = { display: 'flex', gap: 7, justifyContent: 'flex-end', flexWrap: 'wrap' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: '10px' };
const cardStyle = { background: rq.panel, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radius };
const cardContentStyle = { padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' };
const cardTitleStyle = { color: rq.text, fontSize: 15, fontWeight: 900, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const cardMetaStyle = { color: rq.textSecondary, fontSize: 12, lineHeight: 1.35, margin: 0 };
const linkedTextStyle = { color: rq.accentHover, fontSize: 11, fontWeight: 900, margin: '6px 0 0' };

const characterCardStatsStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, marginTop: 2 };
const characterCardStatStyle = { display: 'grid', gap: 2, background: 'rgba(7,11,24,0.52)', border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '7px 8px', minWidth: 0 };
const characterCardStatLabelStyle = { color: rq.muted, fontSize: 9, fontWeight: 950, textTransform: 'uppercase', letterSpacing: 0.7 };
const characterCardStatValueStyle = { color: rq.text, fontSize: 12, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const cardActionsStyle = { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto' };
const cardButtonStyle = { display: 'flex', alignItems: 'center', gap: '6px', borderRadius: rq.radiusSm, minHeight: 34, padding: '7px 11px', fontSize: 12 };
const emptyPanelStyle = { background: rq.panel, border: `1px dashed ${rq.border}`, borderRadius: rq.radius, padding: '30px 18px', textAlign: 'center' };
const emptyTitleStyle = { color: rq.text, fontSize: 19, fontWeight: 900, margin: '12px 0 7px' };
const emptyTextStyle = { color: rq.muted, fontSize: 13, lineHeight: 1.45, maxWidth: 520, margin: '0 auto 16px' };
