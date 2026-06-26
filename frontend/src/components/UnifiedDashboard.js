import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { BrandMiniLogo } from '@/components/ui/BrandLogo';
import useDashboardData from '@/components/dashboard/useDashboardData';
import apiClient from '@/lib/apiClient';

const initialCampaignForm = {
  name: '',
  world_name: '',
  description: '',
  rules_edition: '2024',
};

function safeArray(value) {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
}

function characterTitle(character) {
  return character?.name || character?.character_name || 'Unnamed Character';
}

function characterMeta(character) {
  const level = character?.level || 1;
  const className = character?.character_class || character?.class_name || character?.class || 'Adventurer';
  return `Level ${level} ${className}`;
}

function campaignTitle(campaign) {
  return campaign?.name || campaign?.campaign_name || 'Untitled Campaign';
}

function campaignMeta(campaign) {
  return `${campaign?.player_count || 0} players · ${campaign?.system || campaign?.setting || 'Fantasy'}`;
}

export default function UnifiedDashboard({ username = 'Adventurer', onLogout }) {
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState('Checking');
  const [backendCheckedAt, setBackendCheckedAt] = useState('');
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState(initialCampaignForm);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const {
    characters,
    campaigns,
    loading,
    slowLoad,
    refreshing,
    isAdmin,
    recentCharacters,
    recentCampaigns,
    loadDashboard,
  } = useDashboardData();

  const safeCharacters = safeArray(characters);
  const safeCampaigns = safeArray(campaigns);
  const latestCharacters = safeArray(recentCharacters).slice(0, 4);
  const latestCampaigns = safeArray(recentCampaigns).slice(0, 4);
  const primaryCharacter = latestCharacters[0];
  const primaryCampaign = latestCampaigns[0];

  const checkBackend = async () => {
    setBackendStatus('Checking');
    const startedAt = Date.now();
    try {
      await apiClient.get('/health', { timeout: 8000 });
      const elapsed = Date.now() - startedAt;
      setBackendStatus(elapsed > 3000 ? 'Slow' : 'Ready');
    } catch {
      setBackendStatus('Offline');
    } finally {
      setBackendCheckedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  };

  useEffect(() => {
    checkBackend();
  }, []);

  const refreshEverything = async () => {
    await Promise.allSettled([loadDashboard(), checkBackend()]);
  };

  const openCreateCampaign = () => setShowCreateCampaign(true);
  const closeCreateCampaign = () => {
    if (!creatingCampaign) setShowCreateCampaign(false);
  };

  const updateCampaignForm = (field, value) => {
    setCampaignForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateCampaign = async (event) => {
    event.preventDefault();
    const campaignName = campaignForm.name.trim();
    if (!campaignName) {
      toast.error('Campaign name is required');
      return;
    }

    try {
      setCreatingCampaign(true);
      const payload = {
        name: campaignName,
        description: campaignForm.description.trim(),
        world_name: campaignForm.world_name.trim(),
        rules_edition: campaignForm.rules_edition,
        system: campaignForm.rules_edition === '2024' ? '5e 2024 Compatible' : '5e 2014 Compatible',
        world_genre: 'fantasy',
        world_setting: 'custom',
        world_setting_notes: '',
        allow_exploding_dice: false,
        allow_epic_levels: false,
        max_character_level: 20,
        available_classes: [],
      };
      const response = await apiClient.post('/campaigns', payload);
      const campaignId = response.data?.id || response.data?._id;
      toast.success('Campaign created');
      setCampaignForm(initialCampaignForm);
      setShowCreateCampaign(false);
      await loadDashboard();
      if (campaignId) navigate(`/campaign/${campaignId}`);
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to create campaign');
    } finally {
      setCreatingCampaign(false);
    }
  };

  const openPrimaryCampaign = () => {
    if (primaryCampaign?.id) navigate(`/campaign/${primaryCampaign.id}`);
    else openCreateCampaign();
  };

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={loadingStyle}>
          <BrandMiniLogo size={64} />
          <h1 style={titleStyle}>Opening dashboard...</h1>
          <p style={mutedStyle}>{slowLoad ? 'The backend may be waking up. This should only take a moment.' : 'Loading your table workspace.'}</p>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div style={brandRowStyle}>
          <div style={logoTileStyle}><BrandMiniLogo size={44} /></div>
          <div style={{ minWidth: 0 }}>
            <p style={eyebrowStyle}>Rookie Quest Keeper</p>
            <h1 style={titleStyle}>Command Dashboard</h1>
            <p style={mutedStyle}>Welcome back, <strong style={{ color: '#ffffff' }}>{username || 'Adventurer'}</strong>.</p>
          </div>
        </div>
        <div style={headerButtonsStyle}>
          {isAdmin && <DashboardButton onClick={() => navigate('/admin')}>Admin</DashboardButton>}
          <DashboardButton onClick={refreshEverything} disabled={refreshing}>{refreshing ? 'Refreshing...' : 'Refresh'}</DashboardButton>
          <DashboardButton onClick={() => navigate('/account')}>Account</DashboardButton>
          <DashboardButton onClick={onLogout}>Logout</DashboardButton>
        </div>
      </header>

      <section style={statusBarStyle} aria-label="Dashboard status">
        <StatChip label="Characters" value={safeCharacters.length} />
        <StatChip label="Campaigns" value={safeCampaigns.length} />
        <StatChip label="Access" value={isAdmin ? 'Admin' : 'Player'} />
        <StatChip label="Backend" value={backendStatus} tone={backendStatus} />
      </section>

      <section style={continueGridStyle} aria-label="Continue where you left off">
        <ContinuePanel
          label="Continue playing"
          title={primaryCharacter ? characterTitle(primaryCharacter) : 'Create your first character'}
          text={primaryCharacter ? characterMeta(primaryCharacter) : 'Start with the builder and get a sheet ready for the table.'}
          action={primaryCharacter ? 'Open Sheet' : 'Create Character'}
          onClick={() => primaryCharacter?.id ? navigate(`/characters/${primaryCharacter.id}`) : navigate('/characters/new')}
        />
        <ContinuePanel
          label="GM workspace"
          title={primaryCampaign ? campaignTitle(primaryCampaign) : 'Create your first campaign'}
          text={primaryCampaign ? campaignMeta(primaryCampaign) : 'Start a campaign space for prep, players, homebrew, notes, and sessions.'}
          action={primaryCampaign ? 'Open Campaign' : 'Create Campaign'}
          onClick={openPrimaryCampaign}
        />
      </section>

      <section style={heroGridStyle}>
        <ActionCard
          title="Player Area"
          text="Open your characters and player tools."
          meta={`${safeCharacters.length} character${safeCharacters.length === 1 ? '' : 's'}`}
          onClick={() => navigate('/player')}
        />
        <ActionCard
          title="Create Character"
          text="Start a new character using the builder flow."
          meta="Player setup"
          onClick={() => navigate('/characters/new')}
        />
        <ActionCard
          title="GM Area"
          text="Open your latest campaign space."
          meta={`${safeCampaigns.length} campaign${safeCampaigns.length === 1 ? '' : 's'}`}
          onClick={openPrimaryCampaign}
        />
        <ActionCard
          title="Create Campaign"
          text="Set up a campaign, world name, rules edition, and GM workspace."
          meta="GM setup"
          onClick={openCreateCampaign}
        />
      </section>

      <section style={twoColumnStyle}>
        <SummaryPanel title="Recent Characters" emptyText="No characters yet. Create one to get started." actionLabel="Open Player Dashboard" onAction={() => navigate('/player')}>
          {latestCharacters.map((character, index) => (
            <ListButton
              key={character?.id || `character-${index}`}
              title={characterTitle(character)}
              meta={characterMeta(character)}
              onClick={() => character?.id && navigate(`/characters/${character.id}`)}
            />
          ))}
        </SummaryPanel>

        <SummaryPanel title="GM Campaigns" emptyText="No campaigns yet. Create one to start preparing sessions." actionLabel="Create Campaign" onAction={openCreateCampaign}>
          {latestCampaigns.map((campaign, index) => (
            <ListButton
              key={campaign?.id || `campaign-${index}`}
              title={campaignTitle(campaign)}
              meta={campaignMeta(campaign)}
              onClick={() => campaign?.id && navigate(`/campaign/${campaign.id}`)}
            />
          ))}
        </SummaryPanel>
      </section>

      <section style={systemPanelStyle}>
        <div>
          <p style={eyebrowStyle}>System status</p>
          <p style={mutedStyle}>{statusMessage(backendStatus, backendCheckedAt)}</p>
        </div>
        <button type="button" onClick={checkBackend} style={linkButtonStyle}><span>Check backend</span></button>
      </section>

      {showCreateCampaign && (
        <CreateCampaignDialog
          form={campaignForm}
          creating={creatingCampaign}
          onChange={updateCampaignForm}
          onSubmit={handleCreateCampaign}
          onClose={closeCreateCampaign}
        />
      )}
    </main>
  );
}

function statusMessage(status, checkedAt) {
  if (status === 'Ready') return `Backend is responding normally${checkedAt ? ` · checked ${checkedAt}` : ''}.`;
  if (status === 'Slow') return `Backend responded, but slowly${checkedAt ? ` · checked ${checkedAt}` : ''}. This can happen when a free host wakes up.`;
  if (status === 'Offline') return `Backend health check failed${checkedAt ? ` · checked ${checkedAt}` : ''}. Try refresh, then check the host if it continues.`;
  return 'Checking backend health...';
}

function DashboardButton({ children, onClick, disabled = false }) {
  return <button type="button" onClick={onClick} disabled={disabled} style={buttonStyle}><span>{children}</span></button>;
}

function StatChip({ label, value, tone }) {
  return (
    <div style={statChipStyle}>
      <span style={{ ...statValueStyle, color: statusColor(tone) }}>{value}</span>
      <span style={statLabelStyle}>{label}</span>
    </div>
  );
}

function statusColor(tone) {
  if (tone === 'Offline') return '#ff8a8a';
  if (tone === 'Slow' || tone === 'Checking') return '#ffd27a';
  return '#ffffff';
}

function ContinuePanel({ label, title, text, action, onClick }) {
  return (
    <article style={continuePanelStyle}>
      <span style={redRuleStyle} />
      <p style={eyebrowStyle}>{label}</p>
      <h2 style={continueTitleStyle}>{title}</h2>
      <p style={cardTextStyle}>{text}</p>
      <button type="button" onClick={onClick} style={continueButtonStyle}><span>{action}</span></button>
    </article>
  );
}

function ActionCard({ title, text, meta, onClick }) {
  return (
    <button type="button" onClick={onClick} style={actionCardStyle}>
      <span style={cardAccentStyle} />
      <span style={actionTextWrapStyle}>
        <strong style={cardTitleStyle}>{title}</strong>
        <span style={cardTextStyle}>{text}</span>
        <span style={cardMetaStyle}>{meta}</span>
      </span>
      <span style={arrowStyle} aria-hidden="true">›</span>
    </button>
  );
}

function SummaryPanel({ title, emptyText, actionLabel, onAction, children }) {
  const hasItems = React.Children.count(children) > 0;
  return (
    <section style={panelStyle}>
      <div style={panelHeaderStyle}>
        <h2 style={sectionTitleStyle}>{title}</h2>
        <button type="button" onClick={onAction} style={linkButtonStyle}><span>{actionLabel}</span></button>
      </div>
      {hasItems ? <div style={{ display: 'grid', gap: 0 }}>{children}</div> : <p style={mutedStyle}>{emptyText}</p>}
    </section>
  );
}

function ListButton({ title, meta, onClick }) {
  return (
    <button type="button" onClick={onClick} style={listButtonStyle}>
      <span style={{ minWidth: 0 }}>
        <strong style={listTitleStyle}>{title}</strong>
        <span style={cardMetaStyle}>{meta}</span>
      </span>
      <span style={arrowStyle} aria-hidden="true">›</span>
    </button>
  );
}

function CreateCampaignDialog({ form, creating, onChange, onSubmit, onClose }) {
  return (
    <div style={modalOverlayStyle} role="presentation">
      <section style={modalPanelStyle} role="dialog" aria-modal="true" aria-labelledby="create-campaign-title">
        <div style={modalHeaderStyle}>
          <div>
            <p style={eyebrowStyle}>GM setup</p>
            <h2 id="create-campaign-title" style={modalTitleStyle}>Create Campaign</h2>
          </div>
          <button type="button" onClick={onClose} disabled={creating} style={closeButtonStyle} aria-label="Close create campaign"><span>×</span></button>
        </div>

        <form onSubmit={onSubmit} style={modalFormStyle}>
          <CampaignField label="Campaign name" value={form.name} onChange={(value) => onChange('name', value)} placeholder="Tia Karta" required />
          <CampaignField label="World name" value={form.world_name} onChange={(value) => onChange('world_name', value)} placeholder="Optional" />
          <label style={fieldWrapStyle}>
            <span style={fieldLabelStyle}>Rules edition</span>
            <select value={form.rules_edition} onChange={(event) => onChange('rules_edition', event.target.value)} style={fieldInputStyle}>
              <option value="2024">5e 2024 Compatible</option>
              <option value="2014">5e 2014 Compatible</option>
            </select>
          </label>
          <label style={fieldWrapStyle}>
            <span style={fieldLabelStyle}>Campaign notes</span>
            <textarea value={form.description} onChange={(event) => onChange('description', event.target.value)} placeholder="What is this campaign about?" style={{ ...fieldInputStyle, minHeight: 92, paddingTop: 11, resize: 'vertical' }} />
          </label>

          <div style={modalActionsStyle}>
            <button type="button" onClick={onClose} disabled={creating} style={buttonStyle}><span>Cancel</span></button>
            <button type="submit" disabled={creating} style={continueButtonStyle}><span>{creating ? 'Creating...' : 'Create Campaign'}</span></button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CampaignField({ label, value, onChange, placeholder, required = false }) {
  return (
    <label style={fieldWrapStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} style={fieldInputStyle} />
    </label>
  );
}

const fontStack = 'var(--rq-body-font, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

const pageStyle = {
  minHeight: '100dvh',
  background: 'var(--rq-bg, #242424)',
  color: 'var(--rq-text, #ffffff)',
  padding: 'clamp(14px, 3vw, 28px)',
  display: 'grid',
  alignContent: 'start',
  gap: 20,
  fontFamily: fontStack,
};

const headerStyle = {
  width: 'min(1180px, 100%)',
  margin: '0 auto',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 14,
  flexWrap: 'wrap',
  borderBottom: '1px solid var(--rq-line, rgba(255,255,255,0.16))',
  paddingBottom: 14,
};

const brandRowStyle = { display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 };
const logoTileStyle = { width: 52, height: 52, display: 'grid', placeItems: 'center', background: 'var(--rq-surface, #3a3a3a)', flex: '0 0 auto' };
const headerButtonsStyle = { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' };
const eyebrowStyle = { margin: 0, color: 'var(--rq-muted, rgba(255,255,255,0.68))', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 950, fontFamily: fontStack };
const titleStyle = { margin: '2px 0 4px', color: '#ffffff', fontSize: 'clamp(28px, 5vw, 46px)', lineHeight: 1.02, fontWeight: 950, letterSpacing: '-0.04em', fontFamily: fontStack };
const mutedStyle = { margin: 0, color: 'var(--rq-muted, rgba(255,255,255,0.68))', lineHeight: 1.42, fontSize: 14, fontFamily: fontStack };

const buttonStyle = {
  minHeight: 42,
  border: 0,
  borderRadius: 0,
  background: 'var(--rq-surface, #3a3a3a)',
  color: '#ffffff',
  fontWeight: 900,
  padding: '0 13px',
  cursor: 'pointer',
  fontFamily: fontStack,
};

const statusBarStyle = {
  width: 'min(1180px, 100%)',
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: 0,
  borderTop: '1px solid var(--rq-line, rgba(255,255,255,0.16))',
  borderBottom: '1px solid var(--rq-line, rgba(255,255,255,0.16))',
};

const statChipStyle = { minHeight: 68, display: 'grid', alignContent: 'center', gap: 3, padding: '10px 14px', borderRight: '1px solid var(--rq-line, rgba(255,255,255,0.16))' };
const statValueStyle = { color: '#ffffff', fontSize: 22, fontWeight: 950, lineHeight: 1, fontFamily: fontStack };
const statLabelStyle = { color: 'var(--rq-muted, rgba(255,255,255,0.68))', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 900, fontFamily: fontStack };

const continueGridStyle = {
  width: 'min(1180px, 100%)',
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 14,
};

const continuePanelStyle = {
  background: 'var(--rq-surface, #3a3a3a)',
  border: '1px solid var(--rq-line, rgba(255,255,255,0.16))',
  borderRadius: 0,
  padding: 16,
  display: 'grid',
  gap: 9,
  position: 'relative',
};

const redRuleStyle = { width: 42, height: 5, background: 'var(--rq-primary, #d00000)', display: 'block' };
const continueTitleStyle = { margin: 0, color: '#ffffff', fontSize: 'clamp(20px, 3vw, 28px)', lineHeight: 1.08, fontWeight: 950, letterSpacing: '-0.02em', fontFamily: fontStack };
const continueButtonStyle = { justifySelf: 'start', minHeight: 40, border: 0, borderRadius: 0, background: '#d00000', color: '#ffffff', padding: '0 13px', fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };

const heroGridStyle = {
  width: 'min(1180px, 100%)',
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 0,
  borderTop: '1px solid var(--rq-line, rgba(255,255,255,0.16))',
};

const actionCardStyle = {
  minHeight: 132,
  display: 'flex',
  gap: 12,
  alignItems: 'flex-start',
  textAlign: 'left',
  border: 0,
  borderBottom: '1px solid var(--rq-line, rgba(255,255,255,0.16))',
  background: 'transparent',
  color: '#ffffff',
  padding: '18px 16px 18px 0',
  cursor: 'pointer',
  borderRadius: 0,
  fontFamily: fontStack,
};

const cardAccentStyle = { width: 6, height: 42, background: 'var(--rq-primary, #d00000)', flex: '0 0 auto' };
const actionTextWrapStyle = { display: 'grid', gap: 6, minWidth: 0, flex: 1 };
const cardTitleStyle = { color: '#ffffff', fontSize: 18, fontWeight: 950, fontFamily: fontStack };
const cardTextStyle = { color: 'var(--rq-muted, rgba(255,255,255,0.68))', fontSize: 14, lineHeight: 1.4, fontFamily: fontStack };
const cardMetaStyle = { color: 'var(--rq-muted, rgba(255,255,255,0.68))', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: fontStack };
const arrowStyle = { color: '#ffffff', fontSize: 24, lineHeight: 1, opacity: 0.72 };

const twoColumnStyle = {
  width: 'min(1180px, 100%)',
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 20,
};

const panelStyle = { borderTop: '1px solid var(--rq-line, rgba(255,255,255,0.16))', paddingTop: 14 };
const panelHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' };
const sectionTitleStyle = { margin: 0, color: '#ffffff', fontSize: 20, fontWeight: 950, fontFamily: fontStack };
const linkButtonStyle = { border: 0, borderRadius: 0, background: 'var(--rq-surface, #3a3a3a)', color: '#ffffff', padding: '8px 10px', fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const listButtonStyle = { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, border: 0, borderBottom: '1px solid var(--rq-line, rgba(255,255,255,0.16))', background: 'transparent', color: '#ffffff', padding: '12px 0', cursor: 'pointer', textAlign: 'left', fontFamily: fontStack };
const listTitleStyle = { display: 'block', color: '#ffffff', fontSize: 15, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: fontStack };
const systemPanelStyle = { width: 'min(1180px, 100%)', margin: '0 auto', borderTop: '1px solid var(--rq-line, rgba(255,255,255,0.16))', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' };
const loadingStyle = { width: 'min(520px, 100%)', margin: '12vh auto 0', display: 'grid', justifyItems: 'center', gap: 10, textAlign: 'center' };

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 80,
  background: 'rgba(0,0,0,0.72)',
  display: 'grid',
  placeItems: 'center',
  padding: 16,
};

const modalPanelStyle = {
  width: 'min(560px, 100%)',
  maxHeight: 'min(90dvh, 720px)',
  overflowY: 'auto',
  background: 'var(--rq-bg, #242424)',
  border: '1px solid var(--rq-line, rgba(255,255,255,0.16))',
  borderRadius: 0,
  padding: 18,
  boxShadow: 'none',
  color: '#ffffff',
};

const modalHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, borderBottom: '1px solid var(--rq-line, rgba(255,255,255,0.16))', paddingBottom: 12, marginBottom: 14 };
const modalTitleStyle = { ...continueTitleStyle, fontSize: 28 };
const closeButtonStyle = { width: 40, height: 40, border: 0, borderRadius: 0, background: 'var(--rq-surface, #3a3a3a)', color: '#ffffff', fontSize: 26, lineHeight: 1, cursor: 'pointer' };
const modalFormStyle = { display: 'grid', gap: 12 };
const fieldWrapStyle = { display: 'grid', gap: 6 };
const fieldLabelStyle = { color: 'var(--rq-muted, rgba(255,255,255,0.68))', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: fontStack };
const fieldInputStyle = { width: '100%', minHeight: 44, border: '1px solid var(--rq-line, rgba(255,255,255,0.16))', borderRadius: 0, background: 'var(--rq-surface, #3a3a3a)', color: '#ffffff', padding: '0 11px', fontFamily: fontStack, fontSize: 15, outline: 'none' };
const modalActionsStyle = { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--rq-line, rgba(255,255,255,0.16))', paddingTop: 12, marginTop: 4 };
