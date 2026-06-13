import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ChevronRight, Crown, Home, Library, LogOut, Plus, RefreshCw, Settings, Shield, Sword, User } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const theme = {
  bg: '#070B18',
  panel: 'rgba(13,19,38,0.96)',
  panelSoft: 'rgba(18,26,49,0.9)',
  elevated: 'rgba(27,37,67,0.96)',
  border: 'rgba(124,58,237,0.32)',
  borderStrong: 'rgba(124,58,237,0.52)',
  accent: '#7C3AED',
  accentHover: '#A78BFA',
  accentSoft: 'rgba(124,58,237,0.14)',
  player: '#38BDF8',
  text: '#FFFFFF',
  textSecondary: '#D1D5DB',
  muted: '#94A3B8',
};

const CLASS_OPTIONS = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];
const GENRE_OPTIONS = [
  ['fantasy', 'Fantasy'],
  ['medieval', 'Medieval'],
  ['sci_fi', 'Sci-fi'],
  ['modern', 'Modern'],
  ['horror', 'Horror'],
  ['custom', 'Custom'],
];

const defaultCampaignForm = {
  name: '',
  description: '',
  world_name: '',
  world_genre: 'fantasy',
  rules_edition: '2024',
  allow_exploding_dice: false,
  allow_epic_levels: false,
  max_character_level: 20,
  available_classes: [],
};

const defaultSiteSettings = {
  campaign_creation_enabled: true,
  character_creation_enabled: true,
  uploads_enabled: true,
  reviews_enabled: true,
  feedback_enabled: true,
  rook_text_enabled: true,
  beta_tools_enabled: true,
};

function getSmallScreen() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 900px)').matches;
}

export default function UnifiedDashboard({ username, onLogout }) {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [siteSettings, setSiteSettings] = useState(defaultSiteSettings);
  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [campaignForm, setCampaignForm] = useState(defaultCampaignForm);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [smallScreen, setSmallScreen] = useState(getSmallScreen);
  const [mobileTab, setMobileTab] = useState('player');

  useEffect(() => { loadDashboard(); }, []);

  useEffect(() => {
    if (!loading) {
      setSlowLoad(false);
      return undefined;
    }
    const timeoutId = window.setTimeout(() => setSlowLoad(true), 4500);
    return () => window.clearTimeout(timeoutId);
  }, [loading]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const onChange = () => setSmallScreen(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const loadDashboard = async () => {
    try {
      setRefreshing(true);
      const [charsRes, campsRes, adminRes, settingsRes] = await Promise.all([
        apiClient.get('/characters').catch(() => ({ data: [] })),
        apiClient.get('/campaigns').catch(() => ({ data: [] })),
        apiClient.get('/admin/check').catch(() => ({ data: { is_admin: false } })),
        apiClient.get('/site-settings').catch(() => ({ data: {} })),
      ]);
      setCharacters(Array.isArray(charsRes.data) ? charsRes.data : []);
      setCampaigns(Array.isArray(campsRes.data) ? campsRes.data : []);
      setIsAdmin(!!adminRes.data?.is_admin);
      setSiteSettings(prev => ({ ...prev, ...(settingsRes.data || {}) }));
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const recentCharacters = useMemo(() => [...characters]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 4), [characters]);

  const recentCampaigns = useMemo(() => [...campaigns]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 4), [campaigns]);

  const createCharacter = () => {
    if (siteSettings.character_creation_enabled === false) return toast.error('Character creation is currently disabled');
    navigate('/characters/new');
  };

  const openCampaignCreate = () => {
    if (siteSettings.campaign_creation_enabled === false) return toast.error('Campaign creation is currently disabled');
    setShowCreateCampaignModal(true);
  };

  const updateCampaignForm = (field, value) => setCampaignForm(prev => ({ ...prev, [field]: value }));

  const toggleCampaignClass = (className) => {
    setCampaignForm(prev => {
      const current = new Set(prev.available_classes || []);
      if (current.has(className)) current.delete(className);
      else current.add(className);
      return { ...prev, available_classes: Array.from(current) };
    });
  };

  const handleCreateCampaign = async (event) => {
    event.preventDefault();
    if (!campaignForm.name.trim()) return toast.error('Campaign name is required');
    try {
      setCreatingCampaign(true);
      const payload = {
        ...campaignForm,
        name: campaignForm.name.trim(),
        description: campaignForm.description.trim(),
        world_name: campaignForm.world_name.trim(),
        system: campaignForm.rules_edition === '2024' ? '5e 2024 Compatible' : '5e 2014 Compatible',
        max_character_level: campaignForm.allow_epic_levels ? Number(campaignForm.max_character_level) || 20 : 20,
      };
      const response = await apiClient.post('/campaigns', payload);
      toast.success('Campaign created');
      setShowCreateCampaignModal(false);
      setCampaignForm(defaultCampaignForm);
      navigate(`/campaign/${response.data.id}`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to create campaign');
    } finally {
      setCreatingCampaign(false);
    }
  };

  if (loading) return (
    <main style={{ ...pageStyle, display: 'grid', placeItems: 'center' }}>
      <section style={loadingPanelStyle}>
        <img src="/images/logo-mini.png" alt="ROOK loading" style={{ width: 58, height: 58, objectFit: 'contain' }} />
        <div className="loading-spinner" />
        <h1 style={{ color: theme.text, margin: '8px 0 4px', fontSize: 22 }}>Loading your command dashboard…</h1>
        <p style={{ color: theme.textSecondary, margin: 0, lineHeight: 1.5 }}>
          {slowLoad ? 'This is taking longer than expected. The app will stop waiting if the server does not respond, then you can retry from here.' : 'Checking your characters, campaigns, and account settings.'}
        </p>
      </section>
    </main>
  );

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <img src="/images/logo-mini.png" alt="ROOK" style={{ width: 42, height: 42, objectFit: 'contain' }} />
          <div style={{ minWidth: 0 }}>
            <p style={eyebrowStyle}>Rookie Quest Keeper</p>
            <h1 style={titleStyle}>Command Dashboard</h1>
            <p style={subtitleStyle}>Welcome back, <strong style={{ color: theme.text }}>{username}</strong>. Choose where you want to work.</p>
          </div>
        </div>
        <div style={headerActionsStyle}>
          {isAdmin && <HeaderButton icon={Shield} label="Admin" onClick={() => navigate('/admin')} />}
          <HeaderButton icon={RefreshCw} label={refreshing ? 'Refreshing...' : 'Refresh'} onClick={loadDashboard} disabled={refreshing} />
          <HeaderButton icon={Settings} label="Account" onClick={() => navigate('/account')} />
          <HeaderButton icon={LogOut} label="Logout" onClick={onLogout} />
        </div>
      </header>

      {smallScreen ? (
        <MobileDashboardTabs
          tab={mobileTab}
          setTab={setMobileTab}
          characters={characters}
          campaigns={campaigns}
          recentCharacters={recentCharacters}
          recentCampaigns={recentCampaigns}
          siteSettings={siteSettings}
          isAdmin={isAdmin}
          navigate={navigate}
          createCharacter={createCharacter}
          openCampaignCreate={openCampaignCreate}
        />
      ) : (
        <DesktopDashboard
          characters={characters}
          campaigns={campaigns}
          recentCharacters={recentCharacters}
          recentCampaigns={recentCampaigns}
          siteSettings={siteSettings}
          isAdmin={isAdmin}
          navigate={navigate}
          createCharacter={createCharacter}
          openCampaignCreate={openCampaignCreate}
        />
      )}

      <section style={noticeStyle}>
        <Home size={17} color={theme.accentHover} />
        <div><strong style={{ color: theme.text }}>Cleaner flow:</strong>{' '}<span style={{ color: theme.textSecondary }}>Use this page as the launcher. Player work lives in Player Dashboard, GM prep lives inside each campaign, and live sessions launch from Campaign Prep.</span></div>
      </section>

      {showCreateCampaignModal && (
        <div style={modalBackdropStyle} onClick={() => setShowCreateCampaignModal(false)}>
          <form style={modalStyle} onClick={e => e.stopPropagation()} onSubmit={handleCreateCampaign}>
            <h2 style={modalTitleStyle}>Create Campaign</h2>
            <p style={subtitleStyle}>Set the table rules now so players joining with your code build characters that fit this campaign.</p>
            <div style={compactFormGridStyle}>
              <label style={fieldLabelStyle}>Campaign name<input value={campaignForm.name} onChange={e => updateCampaignForm('name', e.target.value)} autoFocus placeholder="e.g. The Ashen Crown" style={fieldStyle} /></label>
              <label style={fieldLabelStyle}>World name<input value={campaignForm.world_name} onChange={e => updateCampaignForm('world_name', e.target.value)} placeholder="e.g. Veyr" style={fieldStyle} /></label>
              <label style={fieldLabelStyle}>Genre<select value={campaignForm.world_genre} onChange={e => updateCampaignForm('world_genre', e.target.value)} style={fieldStyle}>{GENRE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label style={fieldLabelStyle}>Rules edition<select value={campaignForm.rules_edition} onChange={e => updateCampaignForm('rules_edition', e.target.value)} style={fieldStyle}><option value="2024">2024 rules</option><option value="2014">2014 rules</option></select></label>
            </div>
            <label style={fieldLabelStyle}>Description<textarea value={campaignForm.description} onChange={e => updateCampaignForm('description', e.target.value)} placeholder="Optional short campaign pitch" style={{ ...fieldStyle, minHeight: 74, resize: 'vertical' }} /></label>
            <div style={toggleGridStyle}>
              <label style={toggleCardStyle}><input type="checkbox" checked={campaignForm.allow_exploding_dice} onChange={e => updateCampaignForm('allow_exploding_dice', e.target.checked)} /><span><strong>Exploding dice</strong><small>Non-d20 max rolls roll again and add.</small></span></label>
              <label style={toggleCardStyle}><input type="checkbox" checked={campaignForm.allow_epic_levels} onChange={e => updateCampaignForm('allow_epic_levels', e.target.checked)} /><span><strong>Beyond level 20</strong><small>Allow epic multiclass progression.</small></span></label>
              <label style={{ ...fieldLabelStyle, marginTop: 0 }}>Max level<input type="number" min="1" max="60" disabled={!campaignForm.allow_epic_levels} value={campaignForm.max_character_level} onChange={e => updateCampaignForm('max_character_level', e.target.value)} style={fieldStyle} /></label>
            </div>
            <div style={fieldLabelStyle}>Allowed classes <span style={{ color: theme.textSecondary, fontWeight: 600 }}>Leave all unticked to allow every class.</span>
              <div style={classGridStyle}>{CLASS_OPTIONS.map(className => <label key={className} style={classPillStyle(campaignForm.available_classes.includes(className))}><input type="checkbox" checked={campaignForm.available_classes.includes(className)} onChange={() => toggleCampaignClass(className)} />{className}</label>)}</div>
            </div>
            <div style={modalActionsStyle}>
              <Button type="button" onClick={() => setShowCreateCampaignModal(false)} className="btn-outline">Cancel</Button>
              <Button type="submit" disabled={creatingCampaign} className="btn-primary">{creatingCampaign ? 'Creating...' : 'Create Campaign'}</Button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function DesktopDashboard(props) {
  const { characters, campaigns, recentCharacters, recentCampaigns, siteSettings, isAdmin, navigate, createCharacter, openCampaignCreate } = props;
  return <>
    <section style={quickGridStyle}>
      <PlayerActionCards characters={characters} navigate={navigate} createCharacter={createCharacter} siteSettings={siteSettings} />
      <GMActionCards campaigns={campaigns} openCampaignCreate={openCampaignCreate} siteSettings={siteSettings} />
      <ToolsActionCards isAdmin={isAdmin} navigate={navigate} />
    </section>
    <SummaryGrid recentCharacters={recentCharacters} recentCampaigns={recentCampaigns} navigate={navigate} openCampaignCreate={openCampaignCreate} />
  </>;
}

function MobileDashboardTabs(props) {
  const { tab, setTab, recentCharacters, recentCampaigns, navigate, openCampaignCreate } = props;
  return <>
    <nav style={mobileTabsStyle} aria-label="Dashboard sections">
      {['player', 'gm', 'tools'].map(id => <button key={id} type="button" onClick={() => setTab(id)} style={mobileTabButtonStyle(tab === id)}>{id === 'gm' ? 'GM' : id.charAt(0).toUpperCase() + id.slice(1)}</button>)}
    </nav>
    {tab === 'player' && <section style={mobileSectionStyle}><PlayerActionCards {...props} /><SummaryPanel id="character-summary" icon={User} title="Recent Characters" emptyTitle="No characters yet" emptyText="Create a character or open the player dashboard to get started." actionLabel="Open Player Dashboard" onAction={() => navigate('/player')}>{recentCharacters.map(character => <ListItem key={character.id} title={character.name || 'Unnamed Character'} meta={`Level ${character.level || 1} ${character.race || ''} ${character.character_class || 'Adventurer'}`} onClick={() => navigate(`/characters/${character.id}`)} />)}</SummaryPanel></section>}
    {tab === 'gm' && <section style={mobileSectionStyle}><GMActionCards {...props} /><SummaryPanel id="campaign-summary" icon={Crown} title="GM Campaigns" emptyTitle="No campaigns yet" emptyText="Create your first campaign to start preparing sessions." actionLabel="Create Campaign" onAction={openCampaignCreate}>{recentCampaigns.map(campaign => <ListItem key={campaign.id} title={campaign.name || 'Untitled Campaign'} meta={`${campaign.player_count || 0} players · ${campaign.setting || campaign.system || 'Fantasy'}`} onClick={() => navigate(`/campaign/${campaign.id}`)} />)}</SummaryPanel></section>}
    {tab === 'tools' && <section style={mobileSectionStyle}><ToolsActionCards {...props} /></section>}
  </>;
}

function PlayerActionCards({ characters, navigate, createCharacter, siteSettings }) {
  return <>
    <ActionCard icon={Sword} title="Player Dashboard" text="Open your characters, joined campaigns, player notes, and join-code tools." meta={`${characters.length} character${characters.length === 1 ? '' : 's'}`} onClick={() => navigate('/player')} primary />
    <ActionCard icon={Plus} title="Create Character" text="Start a new character using the available character creation flows." meta={siteSettings.character_creation_enabled === false ? 'Disabled by admin' : 'Ready'} onClick={createCharacter} disabled={siteSettings.character_creation_enabled === false} />
  </>;
}

function GMActionCards({ campaigns, openCampaignCreate, siteSettings }) {
  return <>
    <ActionCard icon={Crown} title="GM Campaigns" text="Prepare campaigns, manage worldbuilding, players, notes, maps, and session tools." meta={`${campaigns.length} campaign${campaigns.length === 1 ? '' : 's'}`} onClick={() => scrollToSection('campaign-summary')} primary />
    <ActionCard icon={Plus} title="Create Campaign" text="Create a new campaign prep space and open the GM toolset." meta={siteSettings.campaign_creation_enabled === false ? 'Disabled by admin' : 'Ready'} onClick={openCampaignCreate} disabled={siteSettings.campaign_creation_enabled === false} />
  </>;
}

function ToolsActionCards({ isAdmin, navigate }) {
  return <>
    <ActionCard icon={Library} title="Homebrew Library" text="Manage custom character options, templates, imports, and reusable homebrew." meta="Library" onClick={() => navigate('/homebrew')} />
    {isAdmin && <ActionCard icon={Shield} title="Admin Control" text="Users, feedback, reviews, feature flags, and site controls." meta="Owner tools" onClick={() => navigate('/admin')} />}
  </>;
}

function SummaryGrid({ recentCharacters, recentCampaigns, navigate, openCampaignCreate }) {
  return <section style={summaryGridStyle}>
    <SummaryPanel id="character-summary" icon={User} title="Recent Characters" emptyTitle="No characters yet" emptyText="Create a character or open the player dashboard to get started." actionLabel="Open Player Dashboard" onAction={() => navigate('/player')}>{recentCharacters.map(character => <ListItem key={character.id} title={character.name || 'Unnamed Character'} meta={`Level ${character.level || 1} ${character.race || ''} ${character.character_class || 'Adventurer'}`} onClick={() => navigate(`/characters/${character.id}`)} />)}</SummaryPanel>
    <SummaryPanel id="campaign-summary" icon={Crown} title="GM Campaigns" emptyTitle="No campaigns yet" emptyText="Create your first campaign to start preparing sessions." actionLabel="Create Campaign" onAction={openCampaignCreate}>{recentCampaigns.map(campaign => <ListItem key={campaign.id} title={campaign.name || 'Untitled Campaign'} meta={`${campaign.player_count || 0} players · ${campaign.setting || campaign.system || 'Fantasy'}`} onClick={() => navigate(`/campaign/${campaign.id}`)} />)}</SummaryPanel>
  </section>;
}

function scrollToSection(id) { const node = document.getElementById(id); if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function HeaderButton({ icon: Icon, label, onClick, disabled }) { return <button type="button" onClick={onClick} disabled={disabled} style={headerButtonStyle(disabled)}><Icon size={16} /><span>{label}</span></button>; }
function ActionCard({ icon: Icon, title, text, meta, onClick, primary = false, disabled = false }) { return <button type="button" onClick={onClick} disabled={disabled} style={actionCardStyle(primary, disabled)}><div style={actionIconStyle(primary)}><Icon size={24} /></div><div style={{ flex: 1, textAlign: 'left' }}><div style={actionTitleStyle}>{title}</div><div style={actionTextStyle}>{text}</div><div style={actionMetaStyle(disabled)}>{meta}</div></div><ChevronRight size={20} color={disabled ? theme.muted : theme.accentHover} /></button>; }
function SummaryPanel({ id, icon: Icon, title, emptyTitle, emptyText, actionLabel, onAction, children }) { const hasItems = React.Children.count(children) > 0; return <section id={id} style={panelStyle}><div style={panelHeaderStyle}><h2 style={panelTitleStyle}><Icon size={20} /> {title}</h2><button type="button" onClick={onAction} style={smallLinkButtonStyle}>{actionLabel}</button></div>{hasItems ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div> : <div style={emptyStyle}><h3 style={{ color: theme.text, margin: '0 0 6px' }}>{emptyTitle}</h3><p style={{ color: theme.muted, margin: 0 }}>{emptyText}</p></div>}</section>; }
function ListItem({ title, meta, onClick }) { return <button type="button" onClick={onClick} style={listItemStyle}><div style={{ minWidth: 0 }}><div style={{ color: theme.text, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div><div style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>{meta}</div></div><ChevronRight size={18} color={theme.accentHover} /></button>; }

const pageStyle = { minHeight: '100dvh', background: `radial-gradient(circle at top left, rgba(124,58,237,0.16), transparent 34%), radial-gradient(circle at top right, rgba(56,189,248,0.10), transparent 30%), ${theme.bg}`, color: theme.text, padding: 'clamp(12px, 2vw, 22px)', overflowY: 'auto' };
const loadingPanelStyle = { width: 'min(520px, calc(100vw - 32px))', background: theme.panel, border: `1px solid ${theme.border}`, padding: 24, textAlign: 'center', display: 'grid', justifyItems: 'center', gap: 10, boxShadow: '0 18px 48px rgba(0,0,0,0.35)' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 12, boxShadow: '0 18px 50px rgba(0,0,0,0.22)' };
const eyebrowStyle = { color: theme.accentHover, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 900, margin: '0 0 4px' };
const titleStyle = { color: theme.text, fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 900, margin: 0 };
const subtitleStyle = { color: theme.textSecondary, fontSize: 13, lineHeight: 1.5, margin: '4px 0 0' };
const headerActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' };
const headerButtonStyle = (disabled) => ({ display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 38, background: disabled ? theme.panelSoft : theme.accentSoft, border: `1px solid ${theme.border}`, color: disabled ? theme.muted : theme.textSecondary, padding: '0 11px', fontWeight: 800, cursor: disabled ? 'not-allowed' : 'pointer' });
const quickGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10, marginBottom: 12 };
const actionCardStyle = (primary, disabled) => ({ minHeight: 116, display: 'flex', alignItems: 'center', gap: 12, background: primary ? `linear-gradient(135deg, ${theme.elevated}, rgba(13,19,38,0.96))` : theme.panel, border: `1px solid ${primary ? theme.borderStrong : theme.border}`, borderRadius: 12, color: theme.text, padding: 14, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, textAlign: 'left', boxShadow: primary ? '0 14px 36px rgba(0,0,0,0.22)' : 'none' });
const actionIconStyle = (primary) => ({ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: primary ? 'linear-gradient(135deg, #7C3AED, #38BDF8)' : theme.accentSoft, color: '#FFFFFF', border: `1px solid ${theme.borderStrong}`, flexShrink: 0 });
const actionTitleStyle = { color: theme.text, fontSize: 16, fontWeight: 900, marginBottom: 4 };
const actionTextStyle = { color: theme.textSecondary, fontSize: 12, lineHeight: 1.38, marginBottom: 8 };
const actionMetaStyle = (disabled) => ({ display: 'inline-flex', color: disabled ? theme.muted : theme.accentHover, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8 });
const summaryGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10, marginBottom: 12 };
const panelStyle = { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 12 };
const panelHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 };
const panelTitleStyle = { color: theme.text, fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8, margin: 0 };
const smallLinkButtonStyle = { background: 'transparent', border: `1px solid ${theme.border}`, color: theme.accentHover, padding: '7px 10px', cursor: 'pointer', fontWeight: 800 };
const listItemStyle = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: theme.panelSoft, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 10, cursor: 'pointer', textAlign: 'left' };
const emptyStyle = { background: theme.panelSoft, border: `1px dashed ${theme.border}`, padding: 24, textAlign: 'center' };
const noticeStyle = { display: 'flex', gap: 10, alignItems: 'flex-start', background: theme.panelSoft, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.45 };
const mobileTabsStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 };
const mobileTabButtonStyle = (active) => ({ minHeight: 44, background: active ? theme.accent : theme.panel, color: active ? '#FFFFFF' : theme.textSecondary, border: `1px solid ${active ? theme.accentHover : theme.border}`, fontWeight: 900, cursor: 'pointer' });
const mobileSectionStyle = { display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 16 };
const modalBackdropStyle = { position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 };
const modalStyle = { width: 'min(820px, 100%)', maxHeight: 'calc(100dvh - 36px)', overflowY: 'auto', background: theme.panel, border: `1px solid ${theme.borderStrong}`, borderRadius: 14, padding: 18, boxShadow: '0 24px 80px rgba(0,0,0,0.45)' };
const modalTitleStyle = { color: theme.text, fontSize: 23, fontWeight: 900, margin: '0 0 8px' };
const fieldLabelStyle = { display: 'flex', flexDirection: 'column', gap: 6, color: theme.muted, fontSize: 12, fontWeight: 900, marginTop: 14 };
const fieldStyle = { background: theme.panelSoft, color: theme.text, border: `1px solid ${theme.border}`, padding: 10, outline: 'none' };
const compactFormGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 };
const toggleGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginTop: 14 };
const toggleCardStyle = { display: 'flex', alignItems: 'center', gap: 10, background: theme.panelSoft, border: `1px solid ${theme.border}`, padding: 10, color: theme.textSecondary, fontSize: 12, cursor: 'pointer' };
const classGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 8, marginTop: 8 };
const classPillStyle = (active) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, background: active ? theme.accentSoft : theme.panelSoft, border: `1px solid ${active ? theme.borderStrong : theme.border}`, color: active ? theme.text : theme.textSecondary, padding: '8px 9px', fontSize: 12, fontWeight: 800, cursor: 'pointer' });
const modalActionsStyle = { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, flexWrap: 'wrap' };
