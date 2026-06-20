import React from 'react';
import { ChevronRight, Crown, Library, Plus, Shield, Sword, User } from 'lucide-react';

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
  mobileTabButtonStyle,
  mobileTabsStyle,
  panelHeaderStyle,
  panelStyle,
  panelTitleStyle,
  quickGridStyle,
  smallLinkButtonStyle,
  summaryGridStyle,
} from './dashboardStyles';

export function DesktopDashboard(props) {
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

export function MobileDashboardTabs(props) {
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

export function HeaderButton({ icon: Icon, label, onClick, disabled }) {
  return <button type="button" onClick={onClick} disabled={disabled} style={headerButtonStyle(disabled)}><Icon size={16} /><span>{label}</span></button>;
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

function scrollToSection(id) {
  const node = document.getElementById(id);
  if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ActionCard({ icon: Icon, title, text, meta, onClick, primary = false, disabled = false }) {
  return <button type="button" onClick={onClick} disabled={disabled} style={actionCardStyle(primary, disabled)}><div style={actionIconStyle(primary)}><Icon size={24} /></div><div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}><div style={actionTitleStyle}>{title}</div><div style={actionTextStyle}>{text}</div><div style={actionMetaStyle(disabled)}>{meta}</div></div><ChevronRight size={20} color={disabled ? theme.muted : theme.accentHover} /></button>;
}

function SummaryPanel({ id, icon: Icon, title, emptyTitle, emptyText, actionLabel, onAction, children }) {
  const hasItems = React.Children.count(children) > 0;
  return <section id={id} style={panelStyle}><div style={panelHeaderStyle}><h2 style={panelTitleStyle}><Icon size={20} /> {title}</h2><button type="button" onClick={onAction} style={smallLinkButtonStyle}>{actionLabel}</button></div>{hasItems ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div> : <div style={emptyStyle}><h3 style={{ color: theme.text, margin: '0 0 6px' }}>{emptyTitle}</h3><p style={{ color: theme.muted, margin: 0 }}>{emptyText}</p></div>}</section>;
}

function ListItem({ title, meta, onClick }) {
  return <button type="button" onClick={onClick} style={listItemStyle}><div style={{ minWidth: 0 }}><div style={{ color: theme.text, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div><div style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>{meta}</div></div><ChevronRight size={18} color={theme.accentHover} /></button>;
}
