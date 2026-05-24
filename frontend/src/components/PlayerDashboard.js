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
  Link2,
  MessageSquare,
  Plus,
  RefreshCw,
  Shield,
  Users,
  X,
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import JoinCampaignModal from '@/components/JoinCampaignModal';
import PlayerNotesTab from '@/components/tabs/PlayerNotesTab';

const rq = {
  bg: 'var(--rq-bg-main, #1A1A1A)',
  panel: 'var(--rq-bg-panel, #242424)',
  input: 'var(--rq-bg-input, #1F1F1F)',
  border: 'var(--rq-accent-border, rgba(193,18,31,0.35))',
  borderDefault: 'var(--rq-border-default, #3A3A3A)',
  accent: 'var(--rq-accent-primary, #C1121F)',
  accentHover: 'var(--rq-accent-hover, #D62839)',
  accentSoft: 'var(--rq-accent-soft, rgba(193,18,31,0.12))',
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
];

export default function PlayerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('characters');
  const [characters, setCharacters] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState('');

  const selectedCharacter = useMemo(
    () => characters.find(character => character.id === selectedCharacterId) || characters[0] || null,
    [characters, selectedCharacterId]
  );

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
      const [charactersRes, campaignsRes] = await Promise.all([
        apiClient.get('/characters').catch(() => ({ data: [] })),
        apiClient.get('/campaigns').catch(() => ({ data: [] })),
      ]);

      setCharacters(Array.isArray(charactersRes.data) ? charactersRes.data : charactersRes.data?.characters || []);
      setCampaigns(Array.isArray(campaignsRes.data) ? campaignsRes.data : campaignsRes.data?.campaigns || []);
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
            <p style={subtitleStyle}>Create a character, join a GM campaign, keep notes, and send improvement ideas straight to the admin backlog.</p>
          </div>
        </div>
        <div style={heroActionsStyle}>
          <Button onClick={refresh} className="btn-outline" style={actionButtonStyle} disabled={refreshing}>
            <RefreshCw size={16} style={{ opacity: refreshing ? 0.6 : 1 }} />
            Refresh
          </Button>
          <Button data-testid="suggest-improvement-btn" onClick={() => setFeedbackOpen(true)} className="btn-outline" style={actionButtonStyle}>
            <MessageSquare size={16} />
            Suggest Improvement
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
          <label style={joinLabelStyle}>Character for joining campaigns</label>
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

      <nav style={tabBarStyle} aria-label="Player dashboard tabs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} data-testid={tab.testId} type="button" onClick={() => setActiveTab(tab.id)} style={tabButtonStyle(active)}>
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === 'characters' && <CharactersTab characters={characters} navigate={navigate} onCreate={() => navigate('/characters/new')} onJoin={openJoinFlow} />}
      {activeTab === 'campaigns' && <CampaignsTab campaigns={linkedCampaigns} navigate={navigate} onJoin={openJoinFlow} />}
      {activeTab === 'notes' && <PlayerNotesTab campaigns={linkedCampaigns} />}

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

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </main>
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
                <p style={cardMetaStyle}>Level {character.level || 1} {character.character_class || 'Adventurer'}</p>
                {character.campaign_name && <p style={linkedTextStyle}>Linked to {character.campaign_name}</p>}
              </div>
              <Shield size={24} color={rq.accent} />
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

function FeedbackModal({ onClose }) {
  const [form, setForm] = useState({
    category: 'improvement',
    area: 'player dashboard',
    priority: 'normal',
    title: '',
    message: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || form.title.trim().length < 3) {
      toast.error('Please add a short title');
      return;
    }
    if (!form.message.trim() || form.message.trim().length < 10) {
      toast.error('Please describe the improvement in a bit more detail');
      return;
    }

    try {
      setSaving(true);
      await apiClient.post('/feedback', {
        ...form,
        page_path: window.location.pathname,
      });
      toast.success('Thanks — your feedback has been sent to admin');
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to send feedback');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={modalBackdropStyle}>
      <form onSubmit={submit} style={modalStyle} data-testid="feedback-modal">
        <div style={modalHeaderStyle}>
          <div>
            <p style={eyebrowStyle}>Site Feedback</p>
            <h2 style={{ ...cardTitleStyle, fontSize: 22 }}>Suggest an Improvement</h2>
          </div>
          <button type="button" onClick={onClose} style={closeButtonStyle} aria-label="Close feedback form"><X size={18} /></button>
        </div>
        <p style={subtitleStyle}>Tell us what feels confusing, broken, missing, or worth improving. It will go straight into the admin feedback list.</p>

        <div style={feedbackGridStyle}>
          <label style={fieldLabelStyle}>Type
            <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} style={fieldStyle}>
              <option value="improvement">Improvement</option>
              <option value="bug">Bug</option>
              <option value="feature">Feature request</option>
              <option value="confusing">Confusing area</option>
              <option value="design">Design/UI</option>
            </select>
          </label>
          <label style={fieldLabelStyle}>Priority
            <select value={form.priority} onChange={e => setForm(prev => ({ ...prev, priority: e.target.value }))} style={fieldStyle}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
        </div>

        <label style={fieldLabelStyle}>Area
          <input value={form.area} onChange={e => setForm(prev => ({ ...prev, area: e.target.value }))} style={fieldStyle} placeholder="e.g. character sheet, campaign view, notes" />
        </label>
        <label style={fieldLabelStyle}>Title
          <input data-testid="feedback-title-input" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} style={fieldStyle} placeholder="Short summary" maxLength={120} />
        </label>
        <label style={fieldLabelStyle}>What needs improving?
          <textarea data-testid="feedback-message-input" value={form.message} onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))} style={{ ...fieldStyle, minHeight: 130, resize: 'vertical' }} placeholder="Describe what happened, what you expected, or what would make this better..." maxLength={2000} />
        </label>

        <div style={modalActionsStyle}>
          <Button type="button" onClick={onClose} className="btn-outline">Cancel</Button>
          <Button data-testid="submit-feedback-btn" type="submit" disabled={saving} className="btn-primary">{saving ? 'Sending...' : 'Send Feedback'}</Button>
        </div>
      </form>
    </div>
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

const pageStyle = { minHeight: '100vh', background: rq.bg, padding: '24px', color: rq.text };
const heroStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', marginBottom: '20px', flexWrap: 'wrap', background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius, padding: '20px' };
const iconButtonStyle = { minWidth: 40, height: 40, padding: 0, borderRadius: rq.radiusSm };
const eyebrowStyle = { color: rq.accentHover, fontSize: 12, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' };
const titleStyle = { color: rq.text, fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, margin: 0, lineHeight: 1.1 };
const subtitleStyle = { color: rq.textSecondary, fontSize: 14, lineHeight: 1.5, margin: '8px 0 0', maxWidth: 720 };
const heroActionsStyle = { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' };
const actionButtonStyle = { display: 'flex', alignItems: 'center', gap: '8px', borderRadius: rq.radiusSm, fontWeight: 900 };
const joinStripStyle = { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: rq.input, border: `1px solid ${rq.border}`, borderRadius: rq.radius, padding: '12px', marginBottom: '18px' };
const joinLabelStyle = { color: rq.textSecondary, fontSize: 13, fontWeight: 900 };
const selectStyle = { minWidth: 220, flex: '1 1 220px', background: rq.panel, color: rq.text, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '10px 12px' };
const tabBarStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', marginBottom: '20px' };
const tabButtonStyle = (active) => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: active ? rq.accentSoft : rq.panel, border: `1px solid ${active ? rq.accent : rq.border}`, color: active ? rq.accentHover : rq.textSecondary, borderRadius: rq.radiusSm, cursor: 'pointer', fontWeight: 900 });
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' };
const cardStyle = { background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius };
const cardContentStyle = { padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' };
const cardTitleStyle = { color: rq.text, fontSize: 18, fontWeight: 900, margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const cardMetaStyle = { color: rq.textSecondary, fontSize: 13, lineHeight: 1.5, margin: 0 };
const linkedTextStyle = { color: rq.accentHover, fontSize: 12, fontWeight: 900, margin: '8px 0 0' };
const cardActionsStyle = { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto' };
const cardButtonStyle = { display: 'flex', alignItems: 'center', gap: '6px', borderRadius: rq.radiusSm };
const emptyPanelStyle = { background: rq.panel, border: `1px dashed ${rq.border}`, borderRadius: rq.radius, padding: '42px 20px', textAlign: 'center' };
const emptyTitleStyle = { color: rq.text, fontSize: 22, fontWeight: 900, margin: '14px 0 8px' };
const emptyTextStyle = { color: rq.muted, fontSize: 14, lineHeight: 1.6, maxWidth: 520, margin: '0 auto 20px' };
const modalBackdropStyle = { position: 'fixed', inset: 0, zIndex: 1600, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 };
const modalStyle = { width: 'min(620px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius, padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' };
const modalHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 8 };
const closeButtonStyle = { background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.text, borderRadius: rq.radiusSm, padding: 8, cursor: 'pointer' };
const feedbackGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 16 };
const fieldLabelStyle = { display: 'flex', flexDirection: 'column', gap: 6, color: rq.muted, fontSize: 12, fontWeight: 900, marginTop: 12 };
const fieldStyle = { width: '100%', background: rq.input, color: rq.text, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '10px 12px', outline: 'none' };
const modalActionsStyle = { display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', marginTop: 18 };
