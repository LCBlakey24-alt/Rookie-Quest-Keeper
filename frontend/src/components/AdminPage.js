import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Check, ClipboardList, FlaskConical, MessageSquare, Shield, Star, Trash2, User, Users, X } from 'lucide-react';
import RuleSystemManager from './RuleSystemManager';
import TemplateEditor from './TemplateEditor';
import AdminUsersTab from './admin/AdminUsersTab';
import AdminSiteControlTab from './admin/AdminSiteControlTab';
import AdminFeedbackTab from './admin/AdminFeedbackTab';
import AdminTestingNotesTab from './admin/AdminTestingNotesTab';
import AdminCharacterAuditTab from './admin/AdminCharacterAuditTab';
import apiClient from '@/lib/apiClient';

const theme = {
  bg: {
    black: 'var(--rq-bg-main)',
    panel: 'var(--rq-bg-panel)',
    card: 'var(--rq-bg-panel-alt)',
    tab: 'var(--rq-bg-panel-alt)'
  },
  gold: 'var(--rq-accent-primary)',
  goldSoft: 'var(--rq-accent-soft)',
  text: {
    white: 'var(--rq-text-primary)',
    secondary: 'var(--rq-text-secondary)',
    muted: 'var(--rq-text-muted)',
    inverse: 'var(--rq-text-inverse)'
  },
  border: 'var(--rq-border-default)',
  borderStrong: 'var(--rq-accent-border)',
  danger: 'var(--rq-danger)',
  dangerSoft: 'rgba(180, 71, 50, 0.15)'
};

function AdminPage() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [overview, setOverview] = useState({ feedback_count: 0, new_feedback_count: 0 });
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState('testing');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia('(max-width: 768px)');
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => { checkAdminAndFetch(); }, []);

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

  const fetchData = async () => {
    try {
      const [reviewsRes, usersRes, overviewRes] = await Promise.all([
        apiClient.get('/reviews/all').catch(() => ({ data: [] })),
        apiClient.get('/admin/users').catch(() => ({ data: [] })),
        apiClient.get('/admin/overview').catch(() => ({ data: {} }))
      ]);
      setReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setOverview(overviewRes.data || {});
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => ({
    totalUsers: overview.users_count ?? users.length,
    totalReviews: overview.reviews_count ?? reviews.length,
    visibleReviews: overview.approved_reviews_count ?? reviews.filter(review => review.is_approved).length,
    newFeedback: overview.new_feedback_count ?? 0
  }), [reviews, users, overview]);

  const handleToggleReview = async (reviewId) => {
    try {
      const response = await apiClient.put(`/reviews/${reviewId}/approve`);
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error('Failed to update review');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await apiClient.delete(`/reviews/${reviewId}`);
      toast.success('Review deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete review');
    }
  };

  const tabs = [
    { id: 'testing', label: 'Testing Notes', icon: ClipboardList },
    { id: 'character-audit', label: 'Character Audit', icon: FlaskConical },
    { id: 'feedback', label: `Feedback (${overview.new_feedback_count || 0})`, icon: MessageSquare },
    { id: 'reviews', label: `Reviews (${reviews.length})`, icon: Star },
    { id: 'rules', label: 'Rule Systems', icon: BookOpen },
    { id: 'templates', label: 'Templates', icon: Users },
    { id: 'users', label: 'Users', icon: User },
    { id: 'site', label: 'Site Control', icon: Shield }
  ];

  if (loading) return <div style={loadingStyle}><div className="loading-spinner"></div></div>;

  if (accessDenied) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={adminPanelStyle}>
            <h1 style={adminTitleStyle}><Shield size={28} color={theme.gold} />Admin access check failed</h1>
            <p style={adminSubtitleStyle}>The app could not confirm your admin access. This can happen if the mobile browser drops the auth check for a moment.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
              <Button onClick={checkAdminAndFetch} style={{ background: theme.gold, color: theme.text.inverse, border: 'none' }}>Try again</Button>
              <Button onClick={() => navigate('/home')} style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.text.muted }}>Back to home</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <Button onClick={() => navigate('/home')} style={{ background: 'transparent', border: `1px solid ${theme.border}`, padding: 10, color: theme.text.muted }}><ArrowLeft size={20} /></Button>
          <div style={{ minWidth: 0 }}>
            <h1 style={adminTitleStyle}><Shield size={28} color={theme.gold} />Admin Panel</h1>
            <p style={adminSubtitleStyle}>Manage testing notes, character audits, feedback, reviews, rule systems, templates, users, and site controls.</p>
          </div>
        </div>

        <div style={statsGridStyle}>
          <StatCard label="Total Users" value={stats.totalUsers} icon={User} />
          <StatCard label="Reviews" value={stats.totalReviews} icon={Star} />
          <StatCard label="Visible Reviews" value={stats.visibleReviews} icon={Check} />
          <StatCard label="New Feedback" value={stats.newFeedback} icon={MessageSquare} />
        </div>

        {isMobile && (
          <div style={mobileTabGridStyle} role="tablist" aria-label="Admin sections">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`admin-mobile-tab-${tab.id}`}
                  aria-pressed={isActive}
                  style={{
                    ...mobileTabButtonStyle,
                    background: isActive ? theme.goldSoft : theme.bg.tab,
                    borderColor: isActive ? theme.gold : theme.border,
                    color: isActive ? theme.gold : theme.text.muted
                  }}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {!isMobile && <div style={tabBarStyle}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} data-testid={`admin-tab-${tab.id}`} style={{ flex: '1 1 150px', padding: 16, background: isActive ? theme.goldSoft : theme.bg.tab, border: 'none', borderBottom: isActive ? `2px solid ${theme.gold}` : `1px solid ${theme.border}`, color: isActive ? theme.gold : theme.text.muted, fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Icon size={18} />{tab.label}</button>;
          })}
        </div>}

        <section style={contentWrapStyle}>
        {activeTab === 'testing' && <AdminTestingNotesTab />}
        {activeTab === 'character-audit' && <AdminCharacterAuditTab />}
        {activeTab === 'feedback' && <AdminFeedbackTab />}
        {activeTab === 'reviews' && <ReviewsPanel reviews={reviews} onToggleReview={handleToggleReview} onDeleteReview={handleDeleteReview} />}
        {activeTab === 'rules' && <RuleSystemManager />}
        {activeTab === 'templates' && <div style={adminPanelStyle}><div style={{ marginBottom: 16 }}><h2 style={{ color: theme.gold, fontSize: 18, fontWeight: 800, margin: 0 }}>Premade Character Templates</h2><p style={{ color: theme.text.muted, fontSize: 12, marginTop: 4 }}>Toggle visibility, clone to homebrew, or delete custom templates. Core templates ship with the app and can only be hidden.</p></div><TemplateEditor /></div>}
        {activeTab === 'users' && <AdminUsersTab />}
        {activeTab === 'site' && <AdminSiteControlTab />}
        </section>
      </div>
    </div>
  );
}


const loadingStyle = { minHeight: '100vh', background: theme.bg.black, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const pageStyle = { minHeight: '100vh', background: theme.bg.black, padding: 'clamp(12px, 4vw, 24px)', overflowX: 'hidden' };
const containerStyle = { width: '100%', maxWidth: 1400, margin: '0 auto', minWidth: 0 };
const headerStyle = { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 'clamp(18px, 4vw, 32px)', paddingBottom: 'clamp(16px, 4vw, 24px)', borderBottom: `1px solid ${theme.borderStrong}`, flexWrap: 'wrap' };
const adminTitleStyle = { fontSize: 'clamp(22px, 7vw, 28px)', color: theme.text.white, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12, margin: 0, flexWrap: 'wrap' };
const adminSubtitleStyle = { color: theme.text.muted, marginTop: 4, fontSize: 14, lineHeight: 1.45 };
const statsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(145px, 100%), 1fr))', gap: 12, marginBottom: 24 };
const tabBarStyle = { display: 'flex', gap: 0, marginBottom: 24, flexWrap: 'wrap', overflowX: 'auto' };
const mobileTabGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 18 };
const mobileTabButtonStyle = { minHeight: 48, border: `1px solid ${theme.border}`, borderRadius: 10, padding: '9px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, fontWeight: 800, cursor: 'pointer', minWidth: 0 };

const contentWrapStyle = { minWidth: 0, overflow: 'hidden' };
const adminPanelStyle = { background: theme.bg.panel, border: `1px solid ${theme.borderStrong}`, borderRadius: 12, padding: 'clamp(14px, 4vw, 24px)', minWidth: 0, overflow: 'hidden' };

function StatCard({ label, value, icon: Icon }) {
  return <div style={{ background: theme.bg.card, border: `1px solid ${theme.borderStrong}`, padding: 'clamp(14px, 3vw, 20px)', textAlign: 'center', borderRadius: 12, minWidth: 0 }}><Icon size={24} color={theme.gold} style={{ marginBottom: 8 }} /><div style={{ color: theme.text.white, fontSize: 28, fontWeight: 800 }}>{value}</div><div style={{ color: theme.text.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div></div>;
}

function ReviewsPanel({ reviews, onToggleReview, onDeleteReview }) {
  return (
    <div style={adminPanelStyle}>
      <h2 style={{ color: theme.gold, fontSize: 18, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}><Star size={20} />User Reviews</h2>
      {reviews.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: theme.text.muted }}><Star size={48} style={{ opacity: 0.3, marginBottom: 16 }} /><p>No reviews yet</p></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reviews.map(review => (
            <div key={review.id} style={{ background: theme.bg.card, border: `1px solid ${review.is_approved ? theme.borderStrong : theme.border}`, borderLeft: `3px solid ${review.is_approved ? theme.gold : theme.text.muted}`, borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}><span style={{ color: theme.text.white, fontWeight: 700 }}>{review.username}</span>{review.is_approved && <span style={{ background: theme.goldSoft, color: theme.gold, padding: '2px 8px', fontSize: 10, fontWeight: 800, borderRadius: 999 }}>VISIBLE</span>}</div>
                  <p style={{ color: theme.text.secondary, fontSize: 13, fontStyle: 'italic', margin: '0 0 8px' }}>"{review.comment}"</p>
                  <p style={{ color: theme.text.muted, fontSize: 11, margin: 0 }}>{new Date(review.created_at).toLocaleDateString()}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button onClick={() => onToggleReview(review.id)} style={{ padding: '8px 12px', fontSize: 11, background: review.is_approved ? 'transparent' : theme.gold, border: review.is_approved ? `1px solid ${theme.border}` : 'none', color: review.is_approved ? theme.text.muted : theme.text.inverse, display: 'flex', alignItems: 'center', gap: 4 }}>{review.is_approved ? <X size={12} /> : <Check size={12} />}{review.is_approved ? 'Hide' : 'Show'}</Button>
                  <Button onClick={() => onDeleteReview(review.id)} style={{ padding: 8, background: theme.dangerSoft, border: 'none' }}><Trash2 size={14} color="var(--rq-danger)" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminPage;
