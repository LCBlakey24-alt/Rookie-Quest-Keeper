import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, BookOpen, CheckCircle2, Clock3, MessageSquare, ShieldCheck, Sparkles, UploadCloud, UsersRound, Wand2 } from 'lucide-react';
import useDashboardData from '@/components/dashboard/useDashboardData';
import useLayoutSettings from '@/components/dashboard/useLayoutSettings';
import apiClient from '@/lib/apiClient';
import '@/styles/unifiedDashboardBoard.css';
import '@/styles/unifiedDashboardPolish.css';
import '@/styles/dashboardRookAction.css';
import UnifiedDashboardHeader from '@/components/dashboard/home/UnifiedDashboardHeader';
import UnifiedDashboardStatusBar from '@/components/dashboard/home/UnifiedDashboardStatusBar';
import {
  safeArray,
  statusMessage,
} from '@/components/dashboard/home/unifiedDashboardUtils';

const dashboardUpdates = [
  {
    label: 'Creator',
    title: 'Full Character Creator is becoming the main route',
    text: 'The create flow has been tightened into a guided Level 1 builder: setup, race/species, class, background, abilities, equipment, and review. The aim is simple: build a character, save it, open the sheet, and play.',
  },
  {
    label: 'Rules',
    title: '2014 and 2024 rules are being split properly',
    text: 'The builder now treats the two rulesets with more care, including race/species wording, origin-style choices, starting equipment, and starting gold behaviour instead of blending everything into one messy cauldron.',
  },
  {
    label: 'Codex',
    title: 'Big rules-data pass landed behind the scenes',
    text: 'A major Codex-assisted cleanup added stronger spell and feat registries, smarter class resources, and better character snapshots so the app has a sturdier rules backbone for future class and level-up work.',
  },
  {
    label: 'Fighter',
    title: 'Fighter now has its first real class choice',
    text: 'Fighters now choose a Fighting Style during creation, see subclass timing clearly, and carry that choice onto the sheet as a saved class feature alongside their level 1 features and proficiencies.',
  },
  {
    label: 'Spells',
    title: 'Spellcasting is moving from list to table tool',
    text: 'The spell sheet now respects prepared spells, Wizard spellbooks, cantrips, spell slots, concentration, and exact slot spending. Unprepared spellbook spells stay visible, but they cannot be cast until prepared.',
  },
  {
    label: 'Mobile',
    title: 'Smoother mobile and deploy recovery work',
    text: 'Mobile and tablet polish continues across the sheet and creator. The app also now retries stale route chunks after a deployment, so a freshly updated site is less likely to strand players on an old cached screen.',
  },
];

const dashboardInfo = [
  {
    title: 'Public beta direction',
    text: 'The current focus is reliable character creation, usable sheets, clean mobile/tablet play, and rules data that can grow one class at a time.',
  },
  {
    title: 'Campaign and homebrew groundwork',
    text: 'Campaign sharing, homebrew visibility, uploads, and GM-controlled rules are being prepared so tables can eventually bring their own worlds and house rules into the app.',
  },
  {
    title: 'What to test next',
    text: 'Create a character, open the sheet, check class features, try the spell tab on a caster, and send feedback if anything blocks actual table play.',
  },
];

function openFeedback() {
  window.dispatchEvent(new Event('rook-feedback-open'));
}

function openRook() {
  window.dispatchEvent(new Event('rook-assistant-open'));
}

function recordId(record) {
  return record?.id || record?._id || record?.character_id || record?.campaign_id || record?.characterId || record?.campaignId || '';
}

function characterTitle(character) {
  return character?.name || character?.character_name || 'Unnamed Character';
}

function campaignTitle(campaign) {
  return campaign?.name || campaign?.campaign_name || 'Untitled Campaign';
}

function homebrewTitle(item) {
  return item?.name || item?.title || 'Untitled Homebrew';
}

function formatHomebrewType(type = '') {
  return String(type || 'homebrew').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return 'No date yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function UnifiedDashboard({ username = 'User', onLogout }) {
  const [backendStatus, setBackendStatus] = useState('Checking');
  const [backendCheckedAt, setBackendCheckedAt] = useState('');
  const [siteUpdates, setSiteUpdates] = useState([]);
  const { modules, sectionOrder, sectionVisibility, layoutStyle, layoutClassName } = useLayoutSettings();

  const {
    characters,
    campaigns,
    homebrewItems,
    adminOverview,
    siteSettings,
    loading,
    slowLoad,
    refreshing,
    isAdmin,
    recentCharacters,
    recentCampaigns,
    recentHomebrew,
    loadDashboard,
  } = useDashboardData();

  const safeCharacters = safeArray(characters);
  const safeCampaigns = safeArray(campaigns);
  const safeHomebrew = safeArray(homebrewItems);
  const updatesToShow = siteUpdates.length > 0 ? siteUpdates : dashboardUpdates;
  const dashboardActions = useMemo(() => [
    {
      label: 'Guide',
      title: 'Ask Rook',
      text: 'Get a page-aware next step, quick tour, campaign prep idea, or testing checklist for this hub.',
      onClick: openRook,
      icon: Sparkles,
      stat: 'AI guide',
      variant: 'rook',
    },
    {
      label: 'Build',
      title: 'Create character',
      text: 'Start the guided creator and get a playable sheet ready for the table.',
      to: '/characters/create/full',
      icon: UsersRound,
      stat: `${safeCharacters.length} saved`,
    },
    {
      label: 'Play',
      title: 'My Characters',
      text: 'Open, edit, duplicate, or clean up the heroes already in your vault.',
      to: '/characters',
      icon: UsersRound,
      stat: `${safeCharacters.length} hero${safeCharacters.length === 1 ? '' : 'es'}`,
    },
    {
      label: 'Run',
      title: 'My Campaigns',
      text: 'Jump into GM prep, player links, campaign rules, notes, and live play tools.',
      to: '/campaigns',
      icon: BookOpen,
      stat: `${safeCampaigns.length} table${safeCampaigns.length === 1 ? '' : 's'}`,
    },
    {
      label: 'Create',
      title: 'Homebrew Workshop',
      text: 'Build items, monsters, NPCs, subclasses, custom rules, and upload artwork.',
      to: '/homebrew',
      icon: Wand2,
      stat: `${safeHomebrew.length} saved`,
    },
    {
      label: 'Assets',
      title: 'Uploads',
      text: 'Keep table images, maps, handouts, portraits, and future play assets together.',
      to: '/uploads',
      icon: UploadCloud,
      stat: 'Library',
    },
    ...(modules.feedback_prompt === false ? [] : [{
      label: 'Help shape it',
      title: 'Send feedback',
      text: 'Report blockers, rough edges, and ideas while you are actually using the app.',
      onClick: openFeedback,
      icon: MessageSquare,
      stat: siteSettings.feedback_enabled === false ? 'Disabled' : 'Fast note',
    }]),
    ...(isAdmin ? [{
      label: 'Owner',
      title: 'Admin Mission Control',
      text: 'Triage feedback, publish updates, audit data, and manage live-site controls.',
      to: '/admin',
      icon: ShieldCheck,
      stat: `${adminOverview.new_feedback_count || 0} new`,
    }] : []),
  ], [adminOverview.new_feedback_count, isAdmin, modules.feedback_prompt, safeCampaigns.length, safeCharacters.length, safeHomebrew.length, siteSettings.feedback_enabled]);

  const recentActivity = useMemo(() => {
    const characterActivity = safeArray(recentCharacters).map((character) => ({
      kind: 'Character',
      title: characterTitle(character),
      text: `${character?.race || character?.species || 'Hero'} • Level ${character?.level || 1}`,
      date: character?.updated_at || character?.created_at,
      to: recordId(character) ? `/characters/${recordId(character)}` : '/characters',
      icon: UsersRound,
    }));

    const campaignActivity = safeArray(recentCampaigns).map((campaign) => ({
      kind: 'Campaign',
      title: campaignTitle(campaign),
      text: campaign?.world_name || campaign?.description || 'GM workspace ready for prep',
      date: campaign?.updated_at || campaign?.created_at,
      to: recordId(campaign) ? `/campaign/${recordId(campaign)}` : '/campaigns',
      icon: BookOpen,
    }));

    const homebrewActivity = safeArray(recentHomebrew).map((item) => ({
      kind: formatHomebrewType(item.content_type),
      title: homebrewTitle(item),
      text: item?.summary || item?.description || item?.role || item?.category || 'Saved in Homebrew Workshop',
      date: item?.updated_at || item?.created_at,
      to: '/homebrew',
      icon: Wand2,
    }));

    return [...characterActivity, ...campaignActivity, ...homebrewActivity]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 6);
  }, [recentCampaigns, recentCharacters, recentHomebrew]);

  const readinessCards = useMemo(() => [
    {
      label: 'Character creator',
      value: siteSettings.character_creation_enabled === false ? 'Paused' : 'Ready',
      text: siteSettings.character_creation_enabled === false ? 'Creation is currently disabled in site controls.' : 'Players can build and test new sheets.',
      tone: siteSettings.character_creation_enabled === false ? 'warn' : 'good',
      icon: siteSettings.character_creation_enabled === false ? AlertTriangle : CheckCircle2,
    },
    {
      label: 'Campaign creation',
      value: siteSettings.campaign_creation_enabled === false ? 'Paused' : 'Ready',
      text: siteSettings.campaign_creation_enabled === false ? 'New campaign setup is currently disabled.' : `${safeCampaigns.length} campaign${safeCampaigns.length === 1 ? '' : 's'} available for GM prep.`,
      tone: siteSettings.campaign_creation_enabled === false ? 'warn' : 'good',
      icon: siteSettings.campaign_creation_enabled === false ? AlertTriangle : BookOpen,
    },
    {
      label: 'Homebrew library',
      value: safeHomebrew.length,
      text: safeHomebrew.length > 0 ? 'Saved creations are ready to review, edit, or wire into sheets.' : 'No saved homebrew yet — workshop is ready when needed.',
      tone: safeHomebrew.length > 0 ? 'good' : 'neutral',
      icon: Wand2,
    },
    {
      label: isAdmin ? 'Feedback queue' : 'Feedback',
      value: isAdmin ? (adminOverview.new_feedback_count || 0) : (siteSettings.feedback_enabled === false ? 'Paused' : 'Open'),
      text: isAdmin
        ? `${adminOverview.active_feedback_count || 0} active item${Number(adminOverview.active_feedback_count || 0) === 1 ? '' : 's'} in progress.`
        : (siteSettings.feedback_enabled === false ? 'Feedback submissions are currently disabled.' : 'Users can send page-specific feedback from the floating button.'),
      tone: isAdmin && Number(adminOverview.new_feedback_count || 0) > 0 ? 'warn' : 'good',
      icon: MessageSquare,
    },
  ], [adminOverview.active_feedback_count, adminOverview.new_feedback_count, isAdmin, safeCampaigns.length, safeHomebrew.length, siteSettings.campaign_creation_enabled, siteSettings.character_creation_enabled, siteSettings.feedback_enabled]);

  const loadSiteUpdates = async () => {
    try {
      const res = await apiClient.get('/site-updates', { params: { limit: 6 } });
      setSiteUpdates(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSiteUpdates([]);
    }
  };

  const checkBackend = async () => {
    setBackendStatus('Checking');
    const startedAt = Date.now();

    try {
      await apiClient.get('/health', { timeout: 8000 });
      setBackendStatus(Date.now() - startedAt > 3000 ? 'Slow' : 'Ready');
    } catch {
      setBackendStatus('Offline');
    } finally {
      setBackendCheckedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  };

  useEffect(() => {
    checkBackend();
    loadSiteUpdates();
  }, []);

  const refreshEverything = async () => {
    await Promise.allSettled([loadDashboard(), checkBackend(), loadSiteUpdates()]);
  };

  const renderSection = (sectionId) => {
    if (sectionVisibility?.[sectionId] === false) return null;

    switch (sectionId) {
      case 'dashboard_hero':
        if (modules.dashboard_hero === false) return null;
        return (
          <UnifiedDashboardHeader
            username={username}
            refreshing={refreshing}
            onRefresh={refreshEverything}
            onLogout={onLogout}
          />
        );
      case 'status_bar':
        return (
          <UnifiedDashboardStatusBar
            characterCount={safeCharacters.length}
            campaignCount={safeCampaigns.length}
            isAdmin={isAdmin}
            backendStatus={backendStatus}
          />
        );
      case 'quick_actions':
        if (modules.quick_actions === false) return null;
        return (
          <section className="unified-dashboard-board dashboard-command-panel" aria-labelledby="dashboard-command-title">
            <div className="dashboard-section-heading dashboard-command-heading">
              <p className="dashboard-eyebrow">Command centre</p>
              <h2 id="dashboard-command-title">Choose where the session starts.</h2>
              <p className="dashboard-muted">Fast routes into the parts of Rookie Quest Keeper that matter most during prep, play, and testing.</p>
            </div>
            <div className="dashboard-command-grid">
              {dashboardActions.map((action) => (
                <DashboardCommandCard key={action.title} {...action} />
              ))}
            </div>
          </section>
        );
      case 'live_workspace':
        return (
          <section className="dashboard-live-grid" aria-label="Recent activity and readiness">
            <section className="unified-dashboard-board dashboard-activity-panel" aria-labelledby="dashboard-activity-title">
              <div className="dashboard-panel-heading-row">
                <div>
                  <p className="dashboard-eyebrow">Live workspace</p>
                  <h2 id="dashboard-activity-title">Recent activity</h2>
                </div>
                <Activity size={20} aria-hidden="true" />
              </div>
              {recentActivity.length === 0 ? (
                <div className="dashboard-empty-compact">
                  <Clock3 size={18} aria-hidden="true" />
                  <p>No recent activity yet. Create a character, campaign, or homebrew item and it will appear here.</p>
                </div>
              ) : (
                <div className="dashboard-activity-list">
                  {recentActivity.map((item) => (
                    <DashboardActivityItem key={`${item.kind}-${item.title}-${item.date || ''}`} {...item} />
                  ))}
                </div>
              )}
            </section>

            <section className="unified-dashboard-board dashboard-readiness-panel" aria-labelledby="dashboard-readiness-title">
              <div className="dashboard-panel-heading-row">
                <div>
                  <p className="dashboard-eyebrow">Readiness</p>
                  <h2 id="dashboard-readiness-title">Hub checks</h2>
                </div>
                <Sparkles size={20} aria-hidden="true" />
              </div>
              <div className="dashboard-readiness-grid">
                {readinessCards.map((card) => (
                  <DashboardReadinessCard key={card.label} {...card} />
                ))}
              </div>
            </section>
          </section>
        );
      case 'site_updates':
        if (modules.site_updates === false) return null;
        return (
          <section className="unified-dashboard-board dashboard-updates-panel" aria-labelledby="dashboard-updates-title">
            <div className="dashboard-section-heading">
              <p className="dashboard-eyebrow">Latest information</p>
              <h2 id="dashboard-updates-title">Site Updates</h2>
              <p className="dashboard-muted">Short notes about what has changed, what is being prepared, and anything users should know.</p>
            </div>

            <div className="dashboard-updates-grid">
              {updatesToShow.map((update) => (
                <DashboardUpdateCard key={update.id || `${update.label}-${update.title}`} {...update} />
              ))}
            </div>
          </section>
        );
      case 'reviews':
        if (modules.reviews === false) return null;
        return (
          <section className="dashboard-info-grid" aria-label="Dashboard information">
            {dashboardInfo.map((item) => (
              <DashboardInfoCard key={item.title} {...item} />
            ))}
          </section>
        );
      case 'admin_notice':
        if (modules.admin_notice === false) return null;
        return (
          <section className="unified-dashboard-board dashboard-system-panel dashboard-system-panel--quiet">
            <div>
              <p className="dashboard-eyebrow">System status</p>
              <p className="dashboard-muted">{statusMessage(backendStatus, backendCheckedAt)}</p>
            </div>
            <button type="button" onClick={checkBackend} className="dashboard-link-button dashboard-home-refresh">
              <span>Check backend</span>
            </button>
          </section>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <main className="unified-dashboard-page">
        <section className="loading-screen dashboard-loading" role="status" aria-live="polite">
          <div className="loading-spinner" aria-hidden="true" />
          <p className="loading-title">Opening dashboard...</p>
          <p className="loading-tip">
            {slowLoad
              ? 'The backend may be waking up. This should only take a moment.'
              : 'Loading your table workspace.'}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className={`unified-dashboard-page unified-dashboard-page--noticeboard ${layoutClassName}`} style={layoutStyle}>
      {sectionOrder.map((sectionId) => <Fragment key={sectionId}>{renderSection(sectionId)}</Fragment>)}
    </main>
  );
}

function DashboardCommandCard({ label, title, text, stat, icon: Icon, to, onClick, variant }) {
  const cardClassName = ['dashboard-command-card', variant ? `dashboard-command-card--${variant}` : ''].filter(Boolean).join(' ');
  const content = (
    <>
      <span className="dashboard-command-label">{label}</span>
      <span className="dashboard-command-icon" aria-hidden="true"><Icon size={20} /></span>
      <strong>{title}</strong>
      <span>{text}</span>
      <em>{stat}</em>
    </>
  );

  if (to) {
    return <Link to={to} className={cardClassName}>{content}</Link>;
  }

  return <button type="button" onClick={onClick} className={cardClassName}>{content}</button>;
}

function DashboardActivityItem({ kind, title, text, date, to, icon: Icon }) {
  return (
    <Link to={to} className="dashboard-activity-item">
      <span className="dashboard-activity-icon" aria-hidden="true"><Icon size={16} /></span>
      <span className="dashboard-activity-copy">
        <strong>{title}</strong>
        <span>{kind} • {text}</span>
      </span>
      <time>{formatDate(date)}</time>
    </Link>
  );
}

function DashboardReadinessCard({ label, value, text, tone, icon: Icon }) {
  return (
    <article className={`dashboard-readiness-card dashboard-readiness-card--${tone}`}>
      <span className="dashboard-readiness-icon" aria-hidden="true"><Icon size={17} /></span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{text}</p>
      </div>
    </article>
  );
}

function DashboardUpdateCard({ label, title, text, is_pinned }) {
  return (
    <article className="dashboard-update-card">
      <span className="dashboard-update-label">{is_pinned ? `Pinned • ${label}` : label}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function DashboardInfoCard({ title, text }) {
  return (
    <article className="unified-dashboard-board dashboard-info-card">
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
