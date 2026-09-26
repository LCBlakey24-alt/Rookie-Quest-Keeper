import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BookOpen, Clock3, FileUp, Link2, Plus, UsersRound, Wand2 } from 'lucide-react';
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
    loading,
    slowLoad,
    refreshing,
    recentCharacters,
    recentCampaigns,
    recentHomebrew,
    dashboardWarning,
    loadDashboard,
  } = useDashboardData();

  const dashboardActions = useMemo(() => [
    {
      title: 'Create Character',
      text: 'Build a new playable hero.',
      to: '/characters/new',
      icon: Plus,
      stat: 'Player',
      primary: true,
    },
    {
      title: 'Import Character',
      text: 'Bring an existing sheet into Keeper.',
      to: '/characters/import',
      icon: FileUp,
      stat: 'Player',
    },
    {
      title: 'Create Campaign',
      text: 'Start a new GM campaign workspace.',
      to: '/campaigns?create=1',
      icon: BookOpen,
      stat: 'GM',
      primary: true,
    },
    {
      title: 'Join Campaign',
      text: 'Use a GM join code with one of your characters.',
      to: '/player',
      icon: Link2,
      stat: 'Player',
    },
  ], []);

  const continueItems = useMemo(() => {
    const latestCharacter = safeArray(recentCharacters)[0];
    const latestCampaign = safeArray(recentCampaigns)[0];
    const items = [];

    if (latestCharacter && recordId(latestCharacter)) {
      items.push({
        kind: 'Character',
        title: characterTitle(latestCharacter),
        text: `${latestCharacter?.race || latestCharacter?.species || 'Hero'} • Level ${latestCharacter?.level || 1}`,
        to: `/characters/${recordId(latestCharacter)}`,
        icon: UsersRound,
      });
    }

    if (latestCampaign && recordId(latestCampaign)) {
      items.push({
        kind: 'Campaign',
        title: campaignTitle(latestCampaign),
        text: latestCampaign?.world_name || 'Campaign workspace',
        to: `/campaign/${recordId(latestCampaign)}`,
        icon: BookOpen,
      });
    }

    return items;
  }, [recentCampaigns, recentCharacters]);

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

      {dashboardWarning && (
        <div className="dashboard-empty-compact" role="status" aria-live="polite">
          <AlertTriangle size={18} aria-hidden="true" />
          <p>{dashboardWarning}</p>
          <button type="button" className="unified-dashboard-button" disabled={refreshing} onClick={() => loadDashboard({ notifyFailure: false })}>
            {refreshing ? 'Trying again…' : 'Retry dashboard'}
          </button>
        </div>
      )}

      {continueItems.length > 0 && (
        <section className="dashboard-simple-section" aria-labelledby="dashboard-continue-title">
          <div className="dashboard-simple-heading">
            <h2 id="dashboard-continue-title">Continue</h2>
          </div>
          <div className="dashboard-continue-grid">
            {continueItems.map((item) => (
              <DashboardContinueCard key={`${item.kind}-${item.title}`} {...item} />
            ))}
          </div>
        </section>
      )}

      <section className="dashboard-simple-section" aria-labelledby="dashboard-actions-title">
        <div className="dashboard-simple-heading">
          <h2 id="dashboard-actions-title">Start something</h2>
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

function DashboardContinueCard({ kind, title, text, to, icon: Icon }) {
  return (
    <Link to={to} className="dashboard-continue-card">
      <span className="dashboard-continue-icon" aria-hidden="true"><Icon size={19} /></span>
      <span className="dashboard-continue-copy">
        <em>{kind}</em>
        <strong>{title}</strong>
        <span>{text}</span>
      </span>
      <span className="dashboard-continue-cta">Open</span>
    </Link>
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
