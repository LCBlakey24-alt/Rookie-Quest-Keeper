import { useEffect, useState } from 'react';
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
    label: 'Improved',
    title: 'Rules data cleanup',
    text: 'Spells, feats, race/species handling, and 2014/2024 class rules are being centralised so builders and sheets stay consistent.',
  },
  {
    label: 'Fighter',
    title: 'Fighter completion pass',
    text: 'Fighter Weapon Mastery validation and action-card unlock timing have been tightened while subclasses are reviewed one at a time.',
  },
  {
    label: 'Classes',
    title: 'Builder validation pass',
    text: 'Wizard spellbooks, Warlock invocations, Ranger resources, Rogue reminders, and Fighter choices now have stricter readiness checks.',
  },
  {
    label: 'Beta',
    title: 'Public launch preparation',
    text: 'The app is being cleaned up for user accounts, character creation, class support, campaign permissions, and smoother mobile use.',
  },
];

const dashboardInfo = [
  {
    title: 'Use the left rail',
    text: 'Dashboard, My Characters, My Campaigns, My Homebrew, My Uploads, Settings, and Feedback live in the main rail.',
  },
  {
    title: 'Users and admin access',
    text: 'Normal accounts are Users. Admin tools are only shown to admin accounts and remain locked away from everyone else.',
  },
  {
    title: 'Campaign direction',
    text: 'Campaigns will use join codes, linked characters, and GM-controlled character statuses as the next major feature pass.',
  },
];

export default function UnifiedDashboard({ username = 'User', onLogout }) {
  const [backendStatus, setBackendStatus] = useState('Checking');
  const [backendCheckedAt, setBackendCheckedAt] = useState('');

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
  }, []);

  const refreshEverything = async () => {
    await Promise.allSettled([loadDashboard(), checkBackend()]);
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

      <section className="unified-dashboard-board dashboard-updates-panel" aria-labelledby="dashboard-updates-title">
        <div className="dashboard-section-heading">
          <p className="dashboard-eyebrow">Latest information</p>
          <h2 id="dashboard-updates-title">Site Updates</h2>
          <p className="dashboard-muted">Short notes about what has changed, what is being prepared, and anything users should know.</p>
        </div>

        <div className="dashboard-updates-grid">
          {dashboardUpdates.map((update) => (
            <DashboardUpdateCard key={`${update.label}-${update.title}`} {...update} />
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

function DashboardUpdateCard({ label, title, text }) {
  return (
    <article className="dashboard-update-card">
      <span className="dashboard-update-label">{label}</span>
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
