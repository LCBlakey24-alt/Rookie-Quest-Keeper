import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock3, Plus, UsersRound, Wand2 } from 'lucide-react';
import useDashboardData from '@/components/dashboard/useDashboardData';
import '@/styles/unifiedDashboardPolish.css';
import UnifiedDashboardHeader from '@/components/dashboard/home/UnifiedDashboardHeader';
import { safeArray } from '@/components/dashboard/home/unifiedDashboardUtils';

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
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function UnifiedDashboard({ username = 'User', onLogout }) {
  const {
    characters,
    campaigns,
    homebrewItems,
    loading,
    slowLoad,
    refreshing,
    recentCharacters,
    recentCampaigns,
    recentHomebrew,
    loadDashboard,
  } = useDashboardData();

  const safeCharacters = safeArray(characters);
  const safeCampaigns = safeArray(campaigns);
  const safeHomebrew = safeArray(homebrewItems);

  const dashboardActions = useMemo(() => [
    {
      title: 'Characters',
      text: 'Open and manage your heroes.',
      to: '/characters',
      icon: UsersRound,
      stat: `${safeCharacters.length} saved`,
    },
    {
      title: 'Campaigns',
      text: 'Prep, run, and return to your tables.',
      to: '/campaigns',
      icon: BookOpen,
      stat: `${safeCampaigns.length} saved`,
    },
    {
      title: 'Create Character',
      text: 'Start a new playable hero.',
      to: '/characters/new',
      icon: Plus,
      stat: 'New hero',
      primary: true,
    },
    {
      title: 'Homebrew',
      text: 'Create and manage custom content.',
      to: '/homebrew',
      icon: Wand2,
      stat: `${safeHomebrew.length} saved`,
    },
  ], [safeCampaigns.length, safeCharacters.length, safeHomebrew.length]);

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
      text: campaign?.world_name || 'Campaign workspace',
      date: campaign?.updated_at || campaign?.created_at,
      to: recordId(campaign) ? `/campaign/${recordId(campaign)}` : '/campaigns',
      icon: BookOpen,
    }));

    const homebrewActivity = safeArray(recentHomebrew).map((item) => ({
      kind: formatHomebrewType(item.content_type),
      title: homebrewTitle(item),
      text: item?.summary || item?.category || 'Homebrew',
      date: item?.updated_at || item?.created_at,
      to: '/homebrew',
      icon: Wand2,
    }));

    return [...characterActivity, ...campaignActivity, ...homebrewActivity]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 5);
  }, [recentCampaigns, recentCharacters, recentHomebrew]);

  if (loading) {
    return (
      <main className="unified-dashboard-page unified-dashboard-page--simple">
        <section className="dashboard-loading" role="status" aria-live="polite">
          <div className="loading-spinner" aria-hidden="true" />
          <p className="loading-title">Opening dashboard…</p>
          {slowLoad && <p className="loading-tip">The backend may be waking up.</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="unified-dashboard-page unified-dashboard-page--simple">
      <UnifiedDashboardHeader
        username={username}
        refreshing={refreshing}
        onRefresh={loadDashboard}
        onLogout={onLogout}
      />

      <section className="dashboard-simple-section" aria-labelledby="dashboard-actions-title">
        <div className="dashboard-simple-heading">
          <h2 id="dashboard-actions-title">Jump back in</h2>
        </div>
        <div className="dashboard-command-grid dashboard-command-grid--simple">
          {dashboardActions.map((action) => (
            <DashboardActionCard key={action.title} {...action} />
          ))}
        </div>
      </section>

      <section className="dashboard-simple-section dashboard-recent-section" aria-labelledby="dashboard-recent-title">
        <div className="dashboard-simple-heading">
          <h2 id="dashboard-recent-title">Recent activity</h2>
        </div>

        {recentActivity.length === 0 ? (
          <div className="dashboard-empty-compact">
            <Clock3 size={18} aria-hidden="true" />
            <p>Your latest characters, campaigns, and homebrew will appear here.</p>
          </div>
        ) : (
          <div className="dashboard-activity-list">
            {recentActivity.map((item) => (
              <DashboardActivityItem key={`${item.kind}-${item.title}-${item.date || ''}`} {...item} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function DashboardActionCard({ title, text, stat, icon: Icon, to, primary = false }) {
  return (
    <Link to={to} className={`dashboard-command-card dashboard-command-card--simple${primary ? ' is-primary' : ''}`}>
      <span className="dashboard-command-icon" aria-hidden="true"><Icon size={20} /></span>
      <span className="dashboard-command-copy">
        <strong>{title}</strong>
        <span>{text}</span>
      </span>
      <em>{stat}</em>
    </Link>
  );
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
