import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, MessageSquare, ShieldCheck, UploadCloud, UsersRound, Wand2 } from 'lucide-react';
import useDashboardData from '@/components/dashboard/useDashboardData';
import apiClient from '@/lib/apiClient';
import '@/styles/unifiedDashboardBoard.css';
import '@/styles/unifiedDashboardPolish.css';
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

export default function UnifiedDashboard({ username = 'User', onLogout }) {
  const [backendStatus, setBackendStatus] = useState('Checking');
  const [backendCheckedAt, setBackendCheckedAt] = useState('');
  const [siteUpdates, setSiteUpdates] = useState([]);

  const {
    characters,
    campaigns,
    loading,
    slowLoad,
    refreshing,
    isAdmin,
    loadDashboard,
  } = useDashboardData();

  const safeCharacters = safeArray(characters);
  const safeCampaigns = safeArray(campaigns);
  const updatesToShow = siteUpdates.length > 0 ? siteUpdates : dashboardUpdates;
  const dashboardActions = useMemo(() => [
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
      stat: 'Rook assisted',
    },
    {
      label: 'Assets',
      title: 'Uploads',
      text: 'Keep table images, maps, handouts, portraits, and future play assets together.',
      to: '/uploads',
      icon: UploadCloud,
      stat: 'Library',
    },
    {
      label: 'Help shape it',
      title: 'Send feedback',
      text: 'Report blockers, rough edges, and ideas while you are actually using the app.',
      onClick: openFeedback,
      icon: MessageSquare,
      stat: 'Fast note',
    },
    ...(isAdmin ? [{
      label: 'Owner',
      title: 'Admin Mission Control',
      text: 'Triage feedback, publish updates, audit data, and manage live-site controls.',
      to: '/admin',
      icon: ShieldCheck,
      stat: 'Admin',
    }] : []),
  ], [isAdmin, safeCampaigns.length, safeCharacters.length]);

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
    <main className="unified-dashboard-page unified-dashboard-page--noticeboard">
      <UnifiedDashboardHeader
        username={username}
        refreshing={refreshing}
        onRefresh={refreshEverything}
        onLogout={onLogout}
      />

      <UnifiedDashboardStatusBar
        characterCount={safeCharacters.length}
        campaignCount={safeCampaigns.length}
        isAdmin={isAdmin}
        backendStatus={backendStatus}
      />

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

      <section className="dashboard-info-grid" aria-label="Dashboard information">
        {dashboardInfo.map((item) => (
          <DashboardInfoCard key={item.title} {...item} />
        ))}
      </section>

      <section className="unified-dashboard-board dashboard-system-panel dashboard-system-panel--quiet">
        <div>
          <p className="dashboard-eyebrow">System status</p>
          <p className="dashboard-muted">{statusMessage(backendStatus, backendCheckedAt)}</p>
        </div>
        <button type="button" onClick={checkBackend} className="dashboard-link-button dashboard-home-refresh">
          <span>Check backend</span>
        </button>
      </section>
    </main>
  );
}

function DashboardCommandCard({ label, title, text, stat, icon: Icon, to, onClick }) {
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
    return <Link to={to} className="dashboard-command-card">{content}</Link>;
  }

  return <button type="button" onClick={onClick} className="dashboard-command-card">{content}</button>;
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
