import React from 'react';
import { useNavigate } from 'react-router-dom';

import { BrandMiniLogo } from '@/components/ui/BrandLogo';
import useDashboardData from '@/components/dashboard/useDashboardData';

function safeArray(value) {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
}

function characterTitle(character) {
  return character?.name || character?.character_name || 'Unnamed Character';
}

function campaignTitle(campaign) {
  return campaign?.name || campaign?.campaign_name || 'Untitled Campaign';
}

export default function UnifiedDashboard({ username = 'Adventurer', onLogout }) {
  const navigate = useNavigate();
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
          <BrandMiniLogo size={52} />
          <div style={{ minWidth: 0 }}>
            <p style={eyebrowStyle}>Rookie Quest Keeper</p>
            <h1 style={titleStyle}>Command Dashboard</h1>
            <p style={mutedStyle}>Welcome back, <strong style={{ color: '#ffffff' }}>{username || 'Adventurer'}</strong>.</p>
          </div>
        </div>
        <div style={headerButtonsStyle}>
          {isAdmin && <DashboardButton onClick={() => navigate('/admin')}>Admin</DashboardButton>}
          <DashboardButton onClick={loadDashboard} disabled={refreshing}>{refreshing ? 'Refreshing...' : 'Refresh'}</DashboardButton>
          <DashboardButton onClick={() => navigate('/account')}>Account</DashboardButton>
          <DashboardButton onClick={onLogout}>Logout</DashboardButton>
        </div>
      </header>

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
          meta="Ready"
          onClick={() => navigate('/characters/new')}
        />
        <ActionCard
          title="GM Area"
          text="Open campaigns, prep tools, players, and notes."
          meta={`${safeCampaigns.length} campaign${safeCampaigns.length === 1 ? '' : 's'}`}
          onClick={() => navigate('/player')}
        />
      </section>

      <section style={twoColumnStyle}>
        <SummaryPanel title="Recent Characters" emptyText="No characters yet. Create one to get started." actionLabel="Open Player Dashboard" onAction={() => navigate('/player')}>
          {latestCharacters.map((character, index) => (
            <ListButton
              key={character?.id || `character-${index}`}
              title={characterTitle(character)}
              meta={`Level ${character?.level || 1} ${character?.character_class || character?.class_name || 'Adventurer'}`}
              onClick={() => character?.id && navigate(`/characters/${character.id}`)}
            />
          ))}
        </SummaryPanel>

        <SummaryPanel title="GM Campaigns" emptyText="No campaigns yet. Campaign creation tools are coming back after this stability pass." actionLabel="Refresh Campaigns" onAction={loadDashboard}>
          {latestCampaigns.map((campaign, index) => (
            <ListButton
              key={campaign?.id || `campaign-${index}`}
              title={campaignTitle(campaign)}
              meta={`${campaign?.player_count || 0} players · ${campaign?.system || campaign?.setting || 'Fantasy'}`}
              onClick={() => campaign?.id && navigate(`/campaign/${campaign.id}`)}
            />
          ))}
        </SummaryPanel>
      </section>

      <section style={noticeStyle}>
        <p style={eyebrowStyle}>Stability mode</p>
        <p style={mutedStyle}>This safer dashboard keeps the app usable while we rebuild the full dashboard modules without the crash.</p>
      </section>
    </main>
  );
}

function DashboardButton({ children, onClick, disabled = false }) {
  return <button type="button" onClick={onClick} disabled={disabled} style={buttonStyle}><span>{children}</span></button>;
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
      <span aria-hidden="true">›</span>
    </button>
  );
}

const pageStyle = {
  minHeight: '100dvh',
  background: 'var(--rq-bg, #242424)',
  color: 'var(--rq-text, #ffffff)',
  padding: 'clamp(14px, 3vw, 28px)',
  display: 'grid',
  alignContent: 'start',
  gap: 22,
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

const brandRowStyle = { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 };
const headerButtonsStyle = { display: 'flex', flexWrap: 'wrap', gap: 8 };
const eyebrowStyle = { margin: 0, color: 'var(--rq-muted, rgba(255,255,255,0.68))', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 950 };
const titleStyle = { margin: '2px 0 4px', color: '#ffffff', fontSize: 'clamp(26px, 5vw, 44px)', lineHeight: 1.05, fontWeight: 950, letterSpacing: '-0.03em' };
const mutedStyle = { margin: 0, color: 'var(--rq-muted, rgba(255,255,255,0.68))', lineHeight: 1.42, fontSize: 14 };

const buttonStyle = {
  minHeight: 42,
  border: 0,
  borderRadius: 0,
  background: 'var(--rq-surface, #3a3a3a)',
  color: '#ffffff',
  fontWeight: 900,
  padding: '0 13px',
  cursor: 'pointer',
};

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
};

const cardAccentStyle = { width: 6, height: 42, background: 'var(--rq-primary, #d00000)', flex: '0 0 auto' };
const actionTextWrapStyle = { display: 'grid', gap: 6, minWidth: 0 };
const cardTitleStyle = { color: '#ffffff', fontSize: 18, fontWeight: 950 };
const cardTextStyle = { color: 'var(--rq-muted, rgba(255,255,255,0.68))', fontSize: 14, lineHeight: 1.4 };
const cardMetaStyle = { color: 'var(--rq-muted, rgba(255,255,255,0.68))', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' };

const twoColumnStyle = {
  width: 'min(1180px, 100%)',
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 20,
};

const panelStyle = { borderTop: '1px solid var(--rq-line, rgba(255,255,255,0.16))', paddingTop: 14 };
const panelHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 };
const sectionTitleStyle = { margin: 0, color: '#ffffff', fontSize: 20, fontWeight: 950 };
const linkButtonStyle = { border: 0, borderRadius: 0, background: 'var(--rq-surface, #3a3a3a)', color: '#ffffff', padding: '8px 10px', fontWeight: 900, cursor: 'pointer' };
const listButtonStyle = { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, border: 0, borderBottom: '1px solid var(--rq-line, rgba(255,255,255,0.16))', background: 'transparent', color: '#ffffff', padding: '12px 0', cursor: 'pointer', textAlign: 'left' };
const listTitleStyle = { display: 'block', color: '#ffffff', fontSize: 15, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const noticeStyle = { width: 'min(1180px, 100%)', margin: '0 auto', borderTop: '1px solid var(--rq-line, rgba(255,255,255,0.16))', paddingTop: 12 };
const loadingStyle = { width: 'min(520px, 100%)', margin: '12vh auto 0', display: 'grid', justifyItems: 'center', gap: 10, textAlign: 'center' };
