import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Activity, Archive, ArrowLeft, BookOpen, Check, ClipboardList, FlaskConical, Hammer, LayoutDashboard, Map, Megaphone, MessageSquare, PenTool, RefreshCw, Search, Settings, Shield, ShieldCheck, Star, Trash2, UploadCloud, User, Users, Wand2, X } from 'lucide-react';
import RuleSystemManager from './RuleSystemManager';
import TemplateEditor from './TemplateEditor';
import AdminUsersTab from './admin/AdminUsersTab';
import AdminSiteControlTab from './admin/AdminSiteControlTab';
import AdminSiteUpdatesTab from './admin/AdminSiteUpdatesTab';
import AdminAuditLogTab from './admin/AdminAuditLogTab';
import AdminMissionBrief from './admin/AdminMissionBrief';
import AdminFeedbackTab from './admin/AdminFeedbackTab';
import AdminTestingNotesTab from './admin/AdminTestingNotesTab';
import AdminCharacterAuditTab from './admin/AdminCharacterAuditTab';
import AdminLayoutStudioTab from './admin/AdminLayoutStudioTab';
import apiClient from '@/lib/apiClient';

const theme = {
  bg: {
    black: 'var(--rq-bg-main)',
    panel: 'var(--rq-bg-panel)',
    card: 'var(--rq-bg-panel-alt)',
    tab: 'var(--rq-bg-panel-alt)',
  },
  gold: 'var(--rq-accent-primary)',
  goldSoft: 'var(--rq-accent-soft)',
  text: {
    white: 'var(--rq-text-primary)',
    secondary: 'var(--rq-text-secondary)',
    muted: 'var(--rq-text-muted)',
    inverse: 'var(--rq-text-inverse)',
  },
  border: 'var(--rq-border-default)',
  borderStrong: 'var(--rq-accent-border)',
  danger: 'var(--rq-danger)',
  dangerSoft: 'rgba(180, 71, 50, 0.15)',
};

const adminTabIds = ['testing', 'updates', 'layout', 'audit', 'character-audit', 'feedback', 'reviews', 'rules', 'templates', 'users', 'site'];

function getInitialAdminTab() {
  if (typeof window === 'undefined') return 'testing';
  const fromHash = window.location.hash.replace('#', '');
  return adminTabIds.includes(fromHash) ? fromHash : 'testing';
}

function AdminPage() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [overview, setOverview] = useState({ feedback_count: 0, new_feedback_count: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewBusyId, setReviewBusyId] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState(getInitialAdminTab);

  useEffect(() => { checkAdminAndFetch(); }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.history.replaceState(null, '', `${window.location.pathname}#${activeTab}`);
  }, [activeTab]);

  const checkAdminAndFetch = async () => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const adminCheck = await apiClient.get('/admin/check');
      if (!adminCheck.data.is_admin) {
        toast.error('Admin access required');
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      await fetchData();
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Could not verify admin access. Please try again.');
      setAccessDenied(true);
      setLoading(false);
    }
  };

  const fetchData = async ({ background = false } = {}) => {
    try {
      if (background) setRefreshing(true);
      const [reviewsRes, usersRes, overviewRes] = await Promise.all([
        apiClient.get('/reviews/all').catch(() => ({ data: [] })),
        apiClient.get('/admin/users').catch(() => ({ data: [] })),
        apiClient.get('/admin/mission-overview')
          .catch(() => apiClient.get('/admin/overview'))
          .catch(() => ({ data: {} })),
      ]);
      setReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setOverview(overviewRes.data || {});
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Could not refresh admin data');
    } finally {
      setLoading(false);
      if (background) setRefreshing(false);
    }
  };

  const logAudit = async (entry) => {
    try { await apiClient.post('/admin/audit-log', entry); } catch { /* Audit logging should never block moderation. */ }
  };

  const stats = useMemo(() => ({
    totalUsers: overview.users_count ?? users.length,
    campaigns: overview.campaigns_count ?? 0,
    characters: overview.characters_count ?? 0,
    totalReviews: overview.reviews_count ?? reviews.length,
    visibleReviews: overview.approved_reviews_count ?? reviews.filter(review => review.is_approved).length,
    newFeedback: overview.new_feedback_count ?? 0,
    activeFeedback: overview.active_feedback_count ?? 0,
    newTesting: overview.new_testing_notes_count ?? 0,
    activeTesting: overview.active_testing_notes_count ?? 0,
    publishedUpdates: overview.published_site_updates_count ?? 0,
    draftUpdates: overview.draft_site_updates_count ?? 0,
    archivedUpdates: overview.archived_site_updates_count ?? 0,
    auditLogs: overview.audit_log_count ?? 0,
    recentAudit: overview.recent_audit_count ?? 0,
  }), [reviews, users, overview]);

  const handleToggleReview = async (reviewId) => {
    const review = reviews.find(item => item.id === reviewId);
    try {
      setReviewBusyId(`toggle-${reviewId}`);
      const response = await apiClient.put(`/reviews/${reviewId}/approve`);
      await logAudit({
        action: response.data?.is_approved ? 'Review shown' : 'Review hidden',
        area: 'reviews',
        target_id: reviewId,
        target_label: review?.username || 'User review',
        detail: review?.comment ? review.comment.slice(0, 300) : '',
      });
      toast.success(response.data.message);
      await fetchData({ background: true });
    } catch (error) {
      toast.error('Failed to update review');
    } finally {
      setReviewBusyId('');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    const review = reviews.find(item => item.id === reviewId);
    if (!window.confirm('Delete this review?')) return;
    try {
      setReviewBusyId(`delete-${reviewId}`);
      await apiClient.delete(`/reviews/${reviewId}`);
      await logAudit({
        action: 'Review deleted',
        area: 'reviews',
        target_id: reviewId,
        target_label: review?.username || 'User review',
        detail: review?.comment ? review.comment.slice(0, 300) : '',
      });
      toast.success('Review deleted');
      await fetchData({ background: true });
    } catch (error) {
      toast.error('Failed to delete review');
    } finally {
      setReviewBusyId('');
    }
  };

  const tabs = [
    { id: 'testing', label: `Testing Notes (${overview.new_testing_notes_count || 0})`, short: 'Testing', icon: ClipboardList, description: 'Log bugs, blockers, and fix plans while testing the site.' },
    { id: 'updates', label: 'Site Updates', short: 'Updates', icon: Megaphone, description: 'Write, draft, pin, and publish dashboard updates without touching code.' },
    { id: 'layout', label: 'Layout Studio', short: 'Layout Studio', icon: LayoutDashboard, description: 'Control responsive page layout, module visibility, card sizing, and future drag-and-drop page design settings.' },
    { id: 'audit', label: 'Audit Log', short: 'Audit Log', icon: ShieldCheck, description: 'Review important admin actions and keep receipts for live-site changes.' },
    { id: 'character-audit', label: 'Character Audit', short: 'Audit', icon: FlaskConical, description: 'Check builder and sheet rules readiness.' },
    { id: 'feedback', label: `Feedback (${overview.new_feedback_count || 0})`, short: 'Feedback', icon: MessageSquare, description: 'Review user feedback and mark what needs action.' },
    { id: 'reviews', label: `Reviews (${reviews.length})`, short: 'Reviews', icon: Star, description: 'Approve or hide public user reviews.' },
    { id: 'rules', label: 'Rule Systems', short: 'Rules', icon: BookOpen, description: 'Manage rule-system records used by the app.' },
    { id: 'templates', label: 'Templates', short: 'Templates', icon: Users, description: 'Control premade character templates.' },
    { id: 'users', label: 'Users', short: 'Users', icon: User, description: 'Review users and admin-only account tools.' },
    { id: 'site', label: 'Site Control', short: 'Site', icon: Shield, description: 'Control announcements, maintenance, and feature switches.' },
  ];

  const activeTabDetails = tabs.find(tab => tab.id === activeTab) || tabs[0];

  const ownerShortcuts = [
    { label: 'Dashboard', text: 'Return to the public app noticeboard.', icon: LayoutDashboard, to: '/home' },
    { label: 'Characters', text: 'Check the player character library.', icon: PenTool, to: '/characters' },
    { label: 'Campaigns', text: 'Open GM campaign dashboards and playtest packs.', icon: Map, to: '/campaigns' },
    { label: 'Homebrew', text: 'Jump to custom rules, items, and creator material.', icon: Wand2, to: '/homebrew' },
    { label: 'Uploads', text: 'Review asset, map, handout, and file uploads.', icon: UploadCloud, to: '/uploads' },
  ];

  const buildFocusCards = [
    { title: 'Open Layout Studio', text: 'Shape responsive layout rules and module visibility from Admin.', icon: LayoutDashboard, tab: 'layout' },
    { title: 'Log a bug while testing', text: 'Use this instead of losing notes in ChatGPT or Codex threads.', icon: ClipboardList, tab: 'testing' },
    { title: 'Publish a site update', text: 'Write dashboard news from Admin instead of editing hardcoded cards.', icon: Megaphone, tab: 'updates' },
    { title: 'Review admin actions', text: 'Check the receipts for feedback moves, update drafts, and live-site changes.', icon: ShieldCheck, tab: 'audit' },
    { title: 'Triage user feedback', text: 'Turn feedback into planned, done, or dismissed work.', icon: MessageSquare, tab: 'feedback' },
    { title: 'Control the live site', text: 'Set announcements, maintenance mode, and beta feature gates.', icon: Settings, tab: 'site' },
  ];

  if (loading) return <AdminLoadingScreen />;

  if (accessDenied) {
    return (
      <div className="admin-mission-control-page admin-mission-control-page--denied" data-testid="admin-mission-control-page" style={pageStyle}>
        <div className="admin-mission-control-page__container" style={containerStyle}>
          <div style={adminPanelStyle}>
            <h1 style={adminTitleStyle}><Shield size={28} color={theme.gold} />Admin access check failed</h1>
            <p style={adminSubtitleStyle}>The app could not confirm your admin access. This can happen if the browser drops the auth check for a moment.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
              <Button onClick={checkAdminAndFetch} style={{ background: theme.gold, color: theme.text.inverse, border: 'none' }}>Try again</Button>
              <Button onClick={() => navigate('/home')} style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.text.muted }}>Back to dashboard</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-mission-control-page" data-testid="admin-mission-control-page" data-active-admin-tab={activeTab} style={pageStyle}>
      <div className="admin-mission-control-page__container" style={containerStyle}>
        <header className="admin-mission-control-page__hero" style={heroStyle}>
          <div style={heroMainStyle}>
            <Button onClick={() => navigate('/home')} aria-label="Back to dashboard" style={backButtonStyle}><ArrowLeft size={20} /></Button>
            <div style={{ minWidth: 0 }}>
              <p style={eyebrowStyle}>Owner workspace</p>
              <h1 style={adminTitleStyle}><Shield size={28} color={theme.gold} />Admin Mission Control</h1>
              <p style={adminSubtitleStyle}>Manage testing notes, layout controls, dashboard updates, feedback, reviews, users, rules, templates, audit history, and site switches without digging through Codex every time.</p>
            </div>
          </div>
          <div style={heroActionsStyle}>
            <Button onClick={() => fetchData({ background: true })} disabled={refreshing} style={busySecondaryActionStyle(refreshing)} aria-busy={refreshing ? 'true' : 'false'}>{refreshing ? <RefreshCw size={16} style={adminInlineSpinStyle} /> : <RefreshCw size={16} />}{refreshing ? 'Refreshing…' : 'Refresh data'}</Button>
            <Button onClick={() => setActiveTab('layout')} style={primaryActionStyle}><LayoutDashboard size={16} />Layout Studio</Button>
          </div>
        </header>

        <section className="admin-mission-control-page__stats" style={statsGridStyle} aria-label="Admin overview">
          <StatCard label="Users" value={stats.totalUsers} icon={User} />
          <StatCard label="Campaigns" value={stats.campaigns} icon={Map} />
          <StatCard label="Characters" value={stats.characters} icon={PenTool} />
          <StatCard label="Reviews" value={stats.totalReviews} icon={Star} />
          <StatCard label="Published Updates" value={stats.publishedUpdates} icon={Megaphone} />
          <StatCard label="Draft Updates" value={stats.draftUpdates} icon={ClipboardList} tone={stats.draftUpdates > 0 ? 'hot' : 'normal'} />
          <StatCard label="Archived Updates" value={stats.archivedUpdates} icon={Archive} />
          <StatCard label="New Feedback" value={stats.newFeedback} icon={MessageSquare} tone={stats.newFeedback > 0 ? 'hot' : 'normal'} />
          <StatCard label="Active Feedback" value={stats.activeFeedback} icon={Activity} tone={stats.activeFeedback > 0 ? 'hot' : 'normal'} />
          <StatCard label="New Testing" value={stats.newTesting} icon={ClipboardList} tone={stats.newTesting > 0 ? 'hot' : 'normal'} />
          <StatCard label="Active Testing" value={stats.activeTesting} icon={FlaskConical} tone={stats.activeTesting > 0 ? 'hot' : 'normal'} />
          <StatCard label="Audit 24h" value={stats.recentAudit} icon={ShieldCheck} />
        </section>

        <AdminMissionBrief onOpenTab={setActiveTab} />

        <section className="admin-mission-control-page__mission-grid" style={missionGridStyle} aria-label="Admin shortcuts and build focus">
          <div style={missionPanelStyle}>
            <div style={sectionHeadingStyle}>
              <p style={eyebrowStyle}>Quick jumps</p>
              <h2 style={sectionTitleStyle}>Open the part of the site you need</h2>
            </div>
            <div style={shortcutGridStyle}>
              {ownerShortcuts.map(shortcut => <ShortcutCard key={shortcut.label} {...shortcut} onOpen={() => navigate(shortcut.to)} />)}
            </div>
          </div>

          <div style={missionPanelStyle}>
            <div style={sectionHeadingStyle}>
              <p style={eyebrowStyle}>Build queue</p>
              <h2 style={sectionTitleStyle}>Use admin instead of losing notes</h2>
            </div>
            <div style={focusGridStyle}>
              {buildFocusCards.map(card => <FocusCard key={card.title} {...card} onOpen={() => setActiveTab(card.tab)} />)}
            </div>
          </div>
        </section>

        <section className="admin-mission-control-page__active-summary" style={activeSummaryStyle} aria-live="polite">
          <div style={{ minWidth: 0 }}>
            <p style={eyebrowStyle}>Current tool</p>
            <h2 style={activeTitleStyle}>{activeTabDetails.short}</h2>
            <p style={adminSubtitleStyle}>{activeTabDetails.description}</p>
          </div>
          <span style={statusPillStyle}><Activity size={14} /> Admin only</span>
        </section>

        <nav className="admin-mission-control-page__tabs" style={tabGridStyle} role="tablist" aria-label="Admin sections">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                data-testid={`admin-tab-${tab.id}`}
                aria-pressed={isActive}
                style={{
                  ...tabButtonStyle,
                  background: isActive ? theme.goldSoft : theme.bg.tab,
                  borderColor: isActive ? theme.gold : theme.border,
                  color: isActive ? theme.gold : theme.text.muted,
                }}
              >
                <Icon size={17} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="admin-mission-control-page__content" style={contentWrapStyle}>
          {activeTab === 'testing' && <AdminTestingNotesTab />}
          {activeTab === 'updates' && <AdminSiteUpdatesTab />}
          {activeTab === 'layout' && <AdminLayoutStudioTab />}
          {activeTab === 'audit' && <AdminAuditLogTab />}
          {activeTab === 'character-audit' && <AdminCharacterAuditTab />}
          {activeTab === 'feedback' && <AdminFeedbackTab />}
          {activeTab === 'reviews' && <ReviewsPanel reviews={reviews} busyId={reviewBusyId} onToggleReview={handleToggleReview} onDeleteReview={handleDeleteReview} />}
          {activeTab === 'rules' && <RuleSystemManager />}
          {activeTab === 'templates' && <div className="admin-mission-control-page__templates-panel" style={adminPanelStyle}><div style={{ marginBottom: 16 }}><h2 style={{ color: theme.gold, fontSize: 18, fontWeight: 800, margin: 0 }}>Premade Character Templates</h2><p style={{ color: theme.text.muted, fontSize: 12, marginTop: 4 }}>Toggle visibility, clone to homebrew, or delete custom templates. Core templates ship with the app and can only be hidden.</p></div><TemplateEditor /></div>}
          {activeTab === 'users' && <AdminUsersTab />}
          {activeTab === 'site' && <AdminSiteControlTab />}
        </section>
        <style>{adminPageCss}</style>
      </div>
    </div>
  );
}

function AdminLoadingScreen() {
  return (
    <main className="loading-screen admin-loading-screen" role="status" aria-live="polite" aria-busy="true">
      <section className="loading-card" aria-label="Admin Mission Control is loading">
        <div className="loading-brand-mark" aria-hidden="true">ADMIN</div>
        <div className="loading-spinner" aria-hidden="true" />
        <p className="loading-kicker">Owner workspace</p>
        <h1 className="loading-title">Checking admin access…</h1>
        <p className="loading-tip">Verifying permissions, feedback queues, testing notes, layout controls, reviews, users, and site controls.</p>
      </section>
    </main>
  );
}

const pageStyle = { minHeight: '100vh', background: theme.bg.black, padding: 'clamp(12px, 3vw, 24px)', overflowX: 'hidden' };
const containerStyle = { width: '100%', maxWidth: 1440, margin: '0 auto', minWidth: 0, display: 'grid', gap: 16 };
const heroStyle = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: 'clamp(16px, 3vw, 24px)', background: theme.bg.panel, border: `1px solid ${theme.borderStrong}`, borderRadius: 14, flexWrap: 'wrap' };
const heroMainStyle = { display: 'flex', alignItems: 'flex-start', gap: 14, minWidth: 0, flex: '1 1 420px' };
const heroActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' };
const backButtonStyle = { background: 'transparent', border: `1px solid ${theme.border}`, padding: 10, color: theme.text.muted, flex: '0 0 auto' };
const primaryActionStyle = { background: theme.gold, color: theme.text.inverse, border: 'none', display: 'inline-flex', gap: 8, alignItems: 'center', fontWeight: 900 };
const secondaryActionStyle = { background: theme.bg.card, color: theme.text.white, border: `1px solid ${theme.border}`, display: 'inline-flex', gap: 8, alignItems: 'center', fontWeight: 900 };
const adminTitleStyle = { fontSize: 'clamp(26px, 6vw, 44px)', color: theme.text.white, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 12, margin: 0, flexWrap: 'wrap', lineHeight: 1.04 };
const adminSubtitleStyle = { color: theme.text.muted, marginTop: 6, fontSize: 14, lineHeight: 1.5 };
const eyebrowStyle = { color: theme.gold, fontSize: 11, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' };
const statsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(135px, 100%), 1fr))', gap: 12 };
const missionGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))', gap: 12 };
const missionPanelStyle = { background: theme.bg.panel, border: `1px solid ${theme.borderStrong}`, borderRadius: 14, padding: 'clamp(14px, 3vw, 20px)', minWidth: 0 };
const sectionHeadingStyle = { marginBottom: 12 };
const sectionTitleStyle = { color: theme.text.white, margin: 0, fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 900 };
const shortcutGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 10 };
const focusGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(210px, 100%), 1fr))', gap: 10 };
const activeSummaryStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: theme.bg.panel, border: `1px solid ${theme.borderStrong}`, borderRadius: 14, padding: 'clamp(14px, 3vw, 20px)' };
const activeTitleStyle = { color: theme.text.white, fontSize: 22, margin: 0, fontWeight: 900 };
const statusPillStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, color: theme.text.white, border: `1px solid ${theme.border}`, background: theme.bg.card, borderRadius: 999, padding: '8px 11px', fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap' };
const tabGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: 8 };
const tabButtonStyle = { minHeight: 52, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 900, cursor: 'pointer', minWidth: 0 };
const contentWrapStyle = { minWidth: 0, overflow: 'visible' };
const adminPanelStyle = { background: theme.bg.panel, border: `1px solid ${theme.borderStrong}`, borderRadius: 12, padding: 'clamp(14px, 4vw, 24px)', minWidth: 0, overflow: 'hidden' };
const shortcutCardStyle = { width: '100%', minHeight: 112, textAlign: 'left', display: 'grid', alignContent: 'start', gap: 8, background: theme.bg.card, border: `1px solid ${theme.border}`, color: theme.text.white, borderRadius: 12, padding: 14, cursor: 'pointer' };
const focusCardStyle = { width: '100%', minHeight: 130, textAlign: 'left', display: 'grid', alignContent: 'space-between', gap: 10, background: theme.bg.card, border: `1px solid ${theme.border}`, color: theme.text.white, borderRadius: 12, padding: 14, cursor: 'pointer' };
const adminInlineSpinStyle = { animation: 'rqAdminPageSpin 0.9s linear infinite' };
const reviewHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 18 };
const reviewTitleStyle = { color: theme.gold, fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 };
const reviewSubtitleStyle = { color: theme.text.muted, fontSize: 12, margin: '5px 0 0' };
const reviewCountStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, color: theme.text.white, border: `1px solid ${theme.border}`, background: theme.bg.card, borderRadius: 999, padding: '8px 11px', fontSize: 12, fontWeight: 900 };
const reviewEmptyStyle = { textAlign: 'center', padding: 60, color: theme.text.muted, background: theme.bg.card, border: `1px dashed ${theme.border}`, borderRadius: 12 };
const reviewCardBaseStyle = { background: theme.bg.card, borderRadius: 10, padding: '16px 20px' };
const reviewCardTopStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' };
const reviewActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap' };

function StatCard({ label, value, icon: Icon, tone = 'normal' }) {
  return (
    <div style={{ background: tone === 'hot' ? theme.goldSoft : theme.bg.card, border: `1px solid ${tone === 'hot' ? theme.gold : theme.borderStrong}`, padding: 'clamp(14px, 3vw, 20px)', textAlign: 'center', borderRadius: 12, minWidth: 0 }}>
      <Icon size={24} color={theme.gold} style={{ marginBottom: 8 }} />
      <div style={{ color: theme.text.white, fontSize: 28, fontWeight: 900 }}>{value}</div>
      <div style={{ color: theme.text.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 900 }}>{label}</div>
    </div>
  );
}

function ShortcutCard({ label, text, icon: Icon, onOpen }) {
  return (
    <button type="button" onClick={onOpen} style={shortcutCardStyle}>
      <Icon size={20} color={theme.gold} />
      <strong style={{ fontSize: 14 }}>{label}</strong>
      <span style={{ color: theme.text.muted, fontSize: 12, lineHeight: 1.45 }}>{text}</span>
    </button>
  );
}

function FocusCard({ title, text, icon: Icon, onOpen }) {
  return (
    <button type="button" onClick={onOpen} style={focusCardStyle}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.gold, fontWeight: 900 }}><Icon size={18} />{title}</span>
      <span style={{ color: theme.text.muted, fontSize: 12, lineHeight: 1.5 }}>{text}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: theme.text.white, fontSize: 12, fontWeight: 900 }}><Hammer size={14} />Open tool</span>
    </button>
  );
}

function ReviewsPanel({ reviews, busyId, onToggleReview, onDeleteReview }) {
  const visibleCount = reviews.filter(review => review.is_approved).length;

  return (
    <div className="admin-mission-control-page__reviews-panel" style={adminPanelStyle}>
      <div style={reviewHeaderStyle}>
        <div>
          <h2 style={reviewTitleStyle}><Star size={20} />User Reviews</h2>
          <p style={reviewSubtitleStyle}>Approve, hide, or remove public review cards without guessing whether the action worked.</p>
        </div>
        <span style={reviewCountStyle}><Star size={13} /> {visibleCount} visible / {reviews.length} total</span>
      </div>
      {reviews.length === 0 ? <div style={reviewEmptyStyle}><Star size={48} style={{ opacity: 0.3, marginBottom: 16 }} /><p>No reviews yet</p></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reviews.map(review => {
            const toggling = busyId === `toggle-${review.id}`;
            const deleting = busyId === `delete-${review.id}`;
            const busy = toggling || deleting;

            return (
              <div key={review.id} aria-busy={busy ? 'true' : 'false'} style={{ ...reviewCardBaseStyle, opacity: busy ? 0.78 : 1, border: `1px solid ${review.is_approved ? theme.borderStrong : theme.border}`, borderLeft: `3px solid ${review.is_approved ? theme.gold : theme.text.muted}` }}>
                <div style={reviewCardTopStyle}>
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}><span style={{ color: theme.text.white, fontWeight: 700 }}>{review.username}</span>{review.is_approved && <span style={{ background: theme.goldSoft, color: theme.gold, padding: '2px 8px', fontSize: 10, fontWeight: 800, borderRadius: 999 }}>VISIBLE</span>}</div>
                    <p style={{ color: theme.text.secondary, fontSize: 13, fontStyle: 'italic', margin: '0 0 8px' }}>&quot;{review.comment}&quot;</p>
                    <p style={{ color: theme.text.muted, fontSize: 11, margin: 0 }}>{new Date(review.created_at).toLocaleDateString()}</p>
                  </div>
                  <div style={reviewActionsStyle}>
                    <Button onClick={() => onToggleReview(review.id)} disabled={busy} style={reviewToggleButtonStyle(review, toggling)}>{toggling ? <RefreshCw size={12} style={adminInlineSpinStyle} /> : review.is_approved ? <X size={12} /> : <Check size={12} />}{toggling ? 'Updating…' : review.is_approved ? 'Hide' : 'Show'}</Button>
                    <Button onClick={() => onDeleteReview(review.id)} disabled={busy} style={reviewDeleteButtonStyle(deleting)}>{deleting ? <RefreshCw size={14} style={adminInlineSpinStyle} /> : <Trash2 size={14} color="var(--rq-danger)" />}{deleting ? 'Deleting…' : ''}</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const adminPageCss = `
  @keyframes rqAdminPageSpin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    [aria-busy="true"] svg { animation: none !important; }
  }
`;

function busySecondaryActionStyle(isBusy) {
  return { ...secondaryActionStyle, opacity: isBusy ? 0.72 : 1, cursor: isBusy ? 'progress' : 'pointer' };
}

function reviewToggleButtonStyle(review, isBusy) {
  return {
    padding: '8px 12px',
    fontSize: 11,
    background: review.is_approved ? 'transparent' : theme.gold,
    border: review.is_approved ? `1px solid ${theme.border}` : 'none',
    color: review.is_approved ? theme.text.muted : theme.text.inverse,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    opacity: isBusy ? 0.82 : 1,
    cursor: isBusy ? 'progress' : 'pointer',
  };
}

function reviewDeleteButtonStyle(isBusy) {
  return {
    padding: '8px 10px',
    background: theme.dangerSoft,
    border: 'none',
    color: theme.danger,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    opacity: isBusy ? 0.82 : 1,
    cursor: isBusy ? 'progress' : 'pointer',
  };
}

export default AdminPage;
