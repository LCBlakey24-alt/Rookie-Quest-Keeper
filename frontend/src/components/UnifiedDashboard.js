
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BookOpen, Clock3, Globe2, PlusCircle, ScrollText, UserPlus, UsersRound, Wand2 } from 'lucide-react';
import useDashboardData from '@/components/dashboard/useDashboardData';
import UnifiedDashboardHeader from '@/components/dashboard/home/UnifiedDashboardHeader';
import { safeArray } from '@/components/dashboard/home/unifiedDashboardUtils';
import { KeeperAnnouncementCarousel, LatestKeeperUpdates, UrgentKeeperNotices, useKeeperUpdates } from '@/components/dashboard/home/HomeUpdates';
import '@/styles/unifiedDashboardPolish.css';
import '@/styles/homeDashboardV5.css';

function recordId(record) {
  return record?.id || record?._id || record?.character_id || record?.campaign_id || record?.characterId || record?.campaignId || '';
}
function formatDate(value) {
  if (!value) return 'Recently';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently' : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function formatHomebrewType(type = '') {
  return String(type || 'Homebrew').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function UnifiedDashboard({ username = 'User', onLogout }) {
  const {
    loading, slowLoad, refreshing, characters, campaigns, homebrewItems,
    recentCharacters, recentCampaigns, recentHomebrew, dashboardWarning, loadDashboard,
  } = useDashboardData();
  const updates = useKeeperUpdates();
  const safeCharacters = safeArray(characters);
  const safeCampaigns = safeArray(campaigns);
  const safeHomebrew = safeArray(homebrewItems);

  const personalTotals = [
    { label: 'Characters', count: safeCharacters.length, to: '/characters', icon: UsersRound, hint: 'Your character library' },
    { label: 'Campaigns', count: safeCampaigns.length, to: '/campaigns', icon: BookOpen, hint: 'Owned and joined campaigns' },
    { label: 'Homebrew', count: safeHomebrew.length, to: '/homebrew', icon: Wand2, hint: 'Your homebrew library' },
    // No community publication endpoint exists yet. Count only public items
    // returned for this user; do not invent community upvotes or catalog stats.
    { label: 'Shared Creations', count: safeHomebrew.filter((item) => item.visibility === 'public').length, to: '/homebrew', icon: Globe2, hint: 'Your public homebrew (community gallery coming later)' },
  ];

  const showGettingStarted = !loading && !dashboardWarning && safeCharacters.length === 0 && safeCampaigns.length === 0 && safeHomebrew.length === 0;
  const recentActivity = useMemo(() => {
    const charActivity = safeArray(recentCharacters).map((item) => ({
      kind: 'Character',
      title: item.name || item.character_name || 'Unnamed Character',
      text: `${item.race || item.species || 'Hero'} · Level ${item.level || 1}`,
      date: item.updated_at || item.created_at,
      to: recordId(item) ? `/characters/${recordId(item)}` : '/characters',
      icon: UsersRound,
    }));
    const campaignActivity = safeArray(recentCampaigns).map((item) => ({
      kind: 'Campaign',
      title: item.name || item.campaign_name || 'Untitled Campaign',
      text: item.world_name || 'Campaign workspace',
      date: item.updated_at || item.created_at,
      to: recordId(item) ? `/campaign/${recordId(item)}` : '/campaigns',
      icon: BookOpen,
    }));
    const brewActivity = safeArray(recentHomebrew).map((item) => ({
      kind: formatHomebrewType(item.content_type),
      title: item.name || item.title || 'Untitled Homebrew',
      text: item.summary || item.category || 'Homebrew',
      date: item.updated_at || item.created_at,
      to: '/homebrew',
      icon: Wand2,
    }));
    return [...charActivity, ...campaignActivity, ...brewActivity]
      .sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 5);
  }, [recentCharacters, recentCampaigns, recentHomebrew]);

  if (loading) return (
    <main className="unified-dashboard-page unified-dashboard-page--simple rqk-home-v5">
      <section className="dashboard-loading" role="status" aria-live="polite">
        <div className="loading-spinner" aria-hidden="true" />
        <p className="loading-title">Opening dashboard…</p>
        {slowLoad && <p className="loading-tip">The backend may be waking up.</p>}
      </section>
    </main>
  );

  return (
    <main className="unified-dashboard-page unified-dashboard-page--simple rqk-home-v5" data-testid="rookie-home-v5">
      <UnifiedDashboardHeader username={username} refreshing={refreshing} onRefresh={loadDashboard} onLogout={onLogout} />
      {dashboardWarning && (
        <div className="dashboard-empty-compact" role="status" aria-live="polite">
          <AlertTriangle size={18} aria-hidden="true" />
          <p>{dashboardWarning}</p>
          <button type="button" className="unified-dashboard-button" disabled={refreshing}
            onClick={() => loadDashboard({ notifyFailure: false })}>{refreshing ? 'Trying again…' : 'Retry dashboard'}</button>
        </div>
      )}
      <UrgentKeeperNotices items={updates.items} />
      <KeeperAnnouncementCarousel items={updates.items} loading={updates.loading} error={updates.error} onRefresh={updates.refresh} />
      <section className="rqk-home-totals" aria-labelledby="rqk-home-totals-heading">
        <h2 id="rqk-home-totals-heading">My Dashboard</h2>
        <div className="rqk-home-metrics">
          {personalTotals.map(({ label, count, to, icon: Icon, hint }) => (
            <Link key={label} to={to} className="rqk-home-metric" aria-label={`${label}: ${count}. ${hint}`}>
              <span className="rqk-home-metric-top"><Icon size={21} aria-hidden="true" /><strong>{count}</strong></span>
              <span className="rqk-home-metric-label">{label}</span>
              <small>{hint}</small>
            </Link>
          ))}
        </div>
      </section>
      {showGettingStarted && (
        <section className="rqk-home-getting-started" aria-labelledby="rqk-home-start-heading">
          <div className="rqk-home-start-heading">
            <ScrollText size={30} aria-hidden="true" />
            <div>
              <span>GETTING STARTED</span>
              <h2 id="rqk-home-start-heading">Start Your Adventure</h2>
              <p>Your library is empty. Create your first character or start a campaign to begin.</p>
            </div>
          </div>
          <div className="rqk-home-start-actions">
            <Link to="/characters/new"><UserPlus size={20} aria-hidden="true" /><span><strong>Create a Character</strong><small>Build your first hero</small></span></Link>
            <Link to="/campaigns"><BookOpen size={20} aria-hidden="true" /><span><strong>Create a Campaign</strong><small>Start a new world</small></span></Link>
          </div>
        </section>
      )}
      <div className="rqk-home-content-columns">
        <LatestKeeperUpdates items={updates.items} loading={updates.loading} error={updates.error} />
        <section className="rqk-home-feed-panel" aria-labelledby="dashboard-recent-title">
          <h2 id="dashboard-recent-title">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <div className="rqk-home-feed-box rqk-home-feed-empty"><Clock3 size={23} aria-hidden="true" /><p>Your latest characters, campaigns and homebrew will appear here.</p></div>
          ) : (
            <div className="dashboard-activity-list">
              {recentActivity.map((item) => <DashboardActivityItem key={`${item.kind}-${item.title}-${item.date || ''}`} {...item} />)}
            </div>
          )}
        </section>
      </div>
      <section className="rqk-home-actions" aria-labelledby="rqk-home-actions-heading">
        <h2 id="rqk-home-actions-heading">Quick Actions</h2>
        <div className="rqk-home-actions-grid">
          <Link to="/characters/new"><UserPlus size={19} aria-hidden="true" /> Create Character</Link>
          <Link to="/campaigns"><PlusCircle size={19} aria-hidden="true" /> Create Campaign</Link>
          <Link to="/homebrew"><Wand2 size={19} aria-hidden="true" /> Create Homebrew</Link>
        </div>
      </section>
    </main>
  );
}

function DashboardActivityItem({ kind, title, text, date, to, icon: Icon }) {
  return (
    <Link to={to} className="dashboard-activity-item">
      <span className="dashboard-activity-icon" aria-hidden="true"><Icon size={16} /></span>
      <span className="dashboard-activity-copy"><strong>{title}</strong><span>{kind} · {text}</span></span>
      <time>{formatDate(date)}</time>
    </Link>
  );
}
