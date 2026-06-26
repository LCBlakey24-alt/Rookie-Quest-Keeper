import React, { useMemo, useState } from 'react';
import { ChevronRight, Crown, Home, Library, MessageSquare, Plus, Shield, Swords, Upload, User, Users } from 'lucide-react';

import LatestUpdatesPanel from '@/components/LatestUpdatesPanel';
import { theme } from './dashboardConfig';
import {
  actionCardStyle,
  actionIconStyle,
  actionMetaStyle,
  actionTextStyle,
  actionTitleStyle,
  emptyStyle,
  headerButtonStyle,
  listItemStyle,
  mobileSectionStyle,
  panelHeaderStyle,
  panelStyle,
  panelTitleStyle,
  quickGridStyle,
  smallLinkButtonStyle,
  summaryGridStyle,
} from './dashboardStyles';

function safeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function safeIcon(Icon) {
  return Icon || ChevronRight;
}

function characterTitle(character) {
  return character?.name || character?.character_name || 'Unnamed Character';
}

function characterMeta(character) {
  return `Level ${character?.level || 1} ${character?.race || ''} ${character?.character_class || character?.class_name || 'Adventurer'}`;
}

function campaignTitle(campaign) {
  return campaign?.name || campaign?.campaign_name || 'Untitled Campaign';
}

function campaignMeta(campaign) {
  return `${campaign?.player_count || 0} players · ${campaign?.setting || campaign?.system || 'Fantasy'}`;
}

const sideTabs = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'characters', label: 'Characters', icon: Users },
  { id: 'campaigns', label: 'Campaigns', icon: Crown },
  { id: 'homebrew', label: 'Homebrew', icon: Library },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'uploads', label: 'Uploads', icon: Upload },
  { id: 'admin', label: 'Admin', icon: Shield, adminOnly: true },
];

export function DashboardWorkspace(props) {
  const { isAdmin, smallScreen } = props;
  const tabs = useMemo(() => sideTabs.filter(tab => !tab.adminOnly || isAdmin), [isAdmin]);
  const [activeTab, setActiveTab] = useState('home');
  const currentTab = tabs.some(tab => tab.id === activeTab) ? activeTab : 'home';

  return (
    <section style={workspaceStyle(smallScreen)} aria-label="Dashboard workspace">
      <nav style={sideRailStyle(smallScreen)} aria-label="Dashboard sections">
        {tabs.map(tab => {
          const Icon = safeIcon(tab.icon);
          const active = tab.id === currentTab;
          return (
            <button
              key={tab.id}
              type="button"
              className={active ? 'rq-side-tab is-active' : 'rq-side-tab'}
              onClick={() => setActiveTab(tab.id)}
              style={sideTabStyle(active, smallScreen)}
              aria-current={active ? 'page' : undefined}
              aria-label={tab.label}
              title={tab.label}
            >
              <Icon size={20} />
              {!smallScreen && <span>{tab.label}</span>}
            </button>
          );
        })}
      </nav>

      <div style={workspaceContentStyle(smallScreen)}>
        <DashboardTabContent tab={currentTab} {...props} />
      </div>
    </section>
  );
}

export function DesktopDashboard(props) {
  return <DashboardWorkspace {...props} smallScreen={false} />;
}

export function MobileDashboardTabs(props) {
  return <DashboardWorkspace {...props} smallScreen />;
}

export function HeaderButton({ icon: Icon, label, onClick, disabled }) {
  const SafeIcon = safeIcon(Icon);
  return <button type="button" onClick={onClick} disabled={disabled} style={headerButtonStyle(disabled)}><SafeIcon size={16} /><span>{label}</span></button>;
}

function DashboardTabContent(props) {
  const { tab, navigate, openCampaignCreate, isAdmin } = props;

  if (tab === 'characters') {
    return <section style={mobileSectionStyle}><PlayerActionCards {...props} /><CharactersSummary {...props} /></section>;
  }

  if (tab === 'campaigns') {
    return <section style={mobileSectionStyle}><GMActionCards {...props} /><CampaignsSummary {...props} /></section>;
  }

  if (tab === 'homebrew') {
    return <SimplePage title="Homebrew" text="Manage custom options, reusable creations, imports, and table content." action="Open Homebrew Library" onAction={() => navigate('/homebrew')} icon={Library} />;
  }

  if (tab === 'feedback') {
    return <SimplePage title="Feedback" text="Send comments, bugs, ideas, and rough edges that need attention." action="Open Feedback" onAction={() => window.dispatchEvent(new Event('rook-feedback-open'))} icon={MessageSquare} />;
  }

  if (tab === 'uploads') {
    return <SimplePage title="Uploads" text="Keep uploaded maps, images, notes, and table files together. This section is being prepared for the next wiring pass." action="Go to Homebrew" onAction={() => navigate('/homebrew')} icon={Upload} />;
  }

  if (tab === 'admin' && isAdmin) {
    return <SimplePage title="Admin" text="Manage users, feedback, feature flags, reviews, and site settings." action="Open Admin" onAction={() => navigate('/admin')} icon={Shield} />;
  }

  return <HomeTab {...props} />;
}

function HomeTab(props) {
  return (
    <>
      <section style={quickGridStyle}>
        <ActionCard icon={Swords} title="Player Area" text="Open your characters and player tools." meta="Characters" onClick={() => props.navigate('/player')} primary />
        <ActionCard icon={Crown} title="GM Area" text="Open campaigns, prep tools, players, and notes." meta="Campaigns" onClick={() => scrollToSection('campaign-summary')} />
        <ActionCard icon={Plus} title="Create Character" text="Start a new character with the builder flow." meta={props.siteSettings?.character_creation_enabled === false ? 'Disabled' : 'Ready'} onClick={props.createCharacter} disabled={props.siteSettings?.character_creation_enabled === false} />
      </section>
      <SummaryGrid {...props} />
      <LatestUpdatesPanel limit={props.smallScreen ? 2 : 3} />
    </>
  );
}

function PlayerActionCards({ characters = [], navigate, createCharacter, siteSettings = {} }) {
  const characterCount = safeArray(characters).length;
  return <>
    <ActionCard icon={Swords} title="Player Dashboard" text="Open your characters, joined campaigns, player notes, and join-code tools." meta={`${characterCount} character${characterCount === 1 ? '' : 's'}`} onClick={() => navigate('/player')} primary />
    <ActionCard icon={Plus} title="Create Character" text="Start a new character using the available character creation flows." meta={siteSettings?.character_creation_enabled === false ? 'Disabled by admin' : 'Ready'} onClick={createCharacter} disabled={siteSettings?.character_creation_enabled === false} />
  </>;
}

function GMActionCards({ campaigns = [], openCampaignCreate, siteSettings = {} }) {
  const campaignCount = safeArray(campaigns).length;
  return <>
    <ActionCard icon={Crown} title="GM Campaigns" text="Prepare campaigns, manage worldbuilding, players, notes, maps, and session tools." meta={`${campaignCount} campaign${campaignCount === 1 ? '' : 's'}`} onClick={() => scrollToSection('campaign-summary')} primary />
    <ActionCard icon={Plus} title="Create Campaign" text="Create a new campaign prep space and open the GM toolset." meta={siteSettings?.campaign_creation_enabled === false ? 'Disabled by admin' : 'Ready'} onClick={openCampaignCreate} disabled={siteSettings?.campaign_creation_enabled === false} />
  </>;
}

function SummaryGrid(props) {
  return <section style={summaryGridStyle}><CharactersSummary {...props} /><CampaignsSummary {...props} /></section>;
}

function CharactersSummary({ recentCharacters, navigate }) {
  const safeCharacters = safeArray(recentCharacters);
  return <SummaryPanel id="character-summary" icon={User} title="Recent Characters" emptyTitle="No characters yet" emptyText="Create a character or open the player dashboard to get started." actionLabel="Open Player Dashboard" onAction={() => navigate('/player')}>
    {safeCharacters.map((character, index) => <ListItem key={character?.id || `character-${index}`} title={characterTitle(character)} meta={characterMeta(character)} onClick={() => character?.id && navigate(`/characters/${character.id}`)} />)}
  </SummaryPanel>;
}

function CampaignsSummary({ recentCampaigns, navigate, openCampaignCreate }) {
  const safeCampaigns = safeArray(recentCampaigns);
  return <SummaryPanel id="campaign-summary" icon={Crown} title="GM Campaigns" emptyTitle="No campaigns yet" emptyText="Create your first campaign to start preparing sessions." actionLabel="Create Campaign" onAction={openCampaignCreate}>
    {safeCampaigns.map((campaign, index) => <ListItem key={campaign?.id || `campaign-${index}`} title={campaignTitle(campaign)} meta={campaignMeta(campaign)} onClick={() => campaign?.id && navigate(`/campaign/${campaign.id}`)} />)}
  </SummaryPanel>;
}

function SimplePage({ title, text, action, onAction, icon: Icon }) {
  const SafeIcon = safeIcon(Icon);
  return (
    <section style={panelStyle}>
      <div style={panelHeaderStyle}>
        <h2 style={panelTitleStyle}><SafeIcon size={20} /> {title}</h2>
      </div>
      <p style={{ color: theme.textSecondary, margin: '0 0 14px', lineHeight: 1.45 }}>{text}</p>
      <button type="button" onClick={onAction} style={redActionButtonStyle}>{action}</button>
    </section>
  );
}

function scrollToSection(id) {
  const node = document.getElementById(id);
  if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ActionCard({ icon: Icon, title, text, meta, onClick, primary = false, disabled = false }) {
  const SafeIcon = safeIcon(Icon);
  return <button type="button" onClick={onClick} disabled={disabled} style={actionCardStyle(primary, disabled)}><div style={actionIconStyle(primary)}><SafeIcon size={24} /></div><div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}><div style={actionTitleStyle}>{title}</div><div style={actionTextStyle}>{text}</div><div style={actionMetaStyle(disabled)}>{meta}</div></div><ChevronRight size={20} color={disabled ? theme.muted : theme.accentHover} /></button>;
}

function SummaryPanel({ id, icon: Icon, title, emptyTitle, emptyText, actionLabel, onAction, children }) {
  const SafeIcon = safeIcon(Icon);
  const hasItems = React.Children.count(children) > 0;
  return <section id={id} style={panelStyle}><div style={panelHeaderStyle}><h2 style={panelTitleStyle}><SafeIcon size={20} /> {title}</h2><button type="button" onClick={onAction} style={smallLinkButtonStyle}>{actionLabel}</button></div>{hasItems ? <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>{children}</div> : <div style={emptyStyle}><h3 style={{ color: theme.text, margin: '0 0 6px' }}>{emptyTitle}</h3><p style={{ color: theme.muted, margin: 0 }}>{emptyText}</p></div>}</section>;
}

function ListItem({ title, meta, onClick }) {
  return <button type="button" onClick={onClick} style={listItemStyle}><div style={{ minWidth: 0 }}><div style={{ color: theme.text, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div><div style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>{meta}</div></div><ChevronRight size={18} color={theme.accentHover} /></button>;
}

const workspaceStyle = (smallScreen) => ({
  display: 'grid',
  gridTemplateColumns: smallScreen ? '48px minmax(0, 1fr)' : '176px minmax(0, 1fr)',
  gap: smallScreen ? 10 : 18,
  alignItems: 'start',
});

const sideRailStyle = (smallScreen) => ({
  position: 'sticky',
  top: 0,
  display: 'grid',
  gap: 0,
  background: 'transparent',
  zIndex: 4,
  width: smallScreen ? 48 : 176,
});

const sideTabStyle = (active, smallScreen) => ({
  position: 'relative',
  minHeight: 46,
  display: 'flex',
  alignItems: 'center',
  justifyContent: smallScreen ? 'center' : 'flex-start',
  gap: 10,
  padding: smallScreen ? 0 : '0 12px',
  background: active ? 'var(--rq-tab-active, #d00000)' : 'var(--rq-tab-bg, #3a3a3a)',
  color: 'var(--rq-text, #ffffff)',
  border: 0,
  borderLeft: active ? '5px solid var(--rq-tab-active, #d00000)' : '5px solid transparent',
  borderRadius: 0,
  boxShadow: 'none',
  cursor: 'pointer',
  fontWeight: 900,
  textAlign: 'left',
});

const workspaceContentStyle = () => ({
  minWidth: 0,
  display: 'grid',
  gap: 0,
});

const redActionButtonStyle = {
  minHeight: 44,
  background: 'var(--rq-primary, #d00000)',
  color: 'var(--rq-text, #ffffff)',
  border: 0,
  borderRadius: 0,
  padding: '0 14px',
  fontWeight: 900,
  cursor: 'pointer',
};
