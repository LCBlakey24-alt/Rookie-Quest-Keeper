import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Check, Shield, Star, Trash2, User, Users, X } from 'lucide-react';
import RuleSystemManager from './RuleSystemManager';
import TemplateEditor from './TemplateEditor';
import AdminUsersTab from './admin/AdminUsersTab';
import AdminSiteControlTab from './admin/AdminSiteControlTab';
import apiClient from '@/lib/apiClient';

const theme = {
  bg: { black: '#0B0F19', panel: '#111827', card: '#0F2440', tab: '#0A1628' },
  gold: '#D4A017',
  text: { white: '#FFFFFF', secondary: '#B8B8B8', muted: '#808080' },
  border: 'rgba(212, 160, 23, 0.25)',
  borderStrong: 'rgba(212, 160, 23, 0.45)'
};

function AdminPage() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reviews');

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    try {
      const adminCheck = await apiClient.get('/admin/check');
      if (!adminCheck.data.is_admin) {
        toast.error('Admin access required');
        navigate('/home');
        return;
      }
      await fetchData();
    } catch (error) {
      toast.error('Access denied');
      navigate('/home');
    }
  };

  const fetchData = async () => {
    try {
      const [reviewsRes, usersRes] = await Promise.all([
        apiClient.get('/reviews/all').catch(() => ({ data: [] })),
        apiClient.get('/admin/users').catch(() => ({ data: [] }))
      ]);
      setReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => ({
    totalUsers: users.length,
    totalReviews: reviews.length,
    visibleReviews: reviews.filter(review => review.is_approved).length
  }), [reviews, users]);

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
    { id: 'reviews', label: `Reviews (${reviews.length})`, icon: Star },
    { id: 'rules', label: 'Rule Systems', icon: BookOpen },
    { id: 'templates', label: 'Templates', icon: Users },
    { id: 'users', label: 'Users', icon: User },
    { id: 'site', label: 'Site Control', icon: Shield }
  ];

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: theme.bg.black,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.bg.black, padding: 24 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 32,
          paddingBottom: 24,
          borderBottom: `1px solid ${theme.borderStrong}`
        }}>
          <Button
            onClick={() => navigate('/home')}
            style={{ background: 'transparent', border: `1px solid ${theme.border}`, padding: 10, color: theme.text.muted }}
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 style={{
              fontSize: 28,
              color: theme.text.white,
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: 0
            }}>
              <Shield size={28} color={theme.gold} />
              Admin Panel
            </h1>
            <p style={{ color: theme.text.muted, marginTop: 4, fontSize: 14 }}>
              Manage reviews, rule systems, templates, and support tools.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
          <StatCard label="Total Users" value={stats.totalUsers} icon={User} />
          <StatCard label="Reviews" value={stats.totalReviews} icon={Star} />
          <StatCard label="Visible Reviews" value={stats.visibleReviews} icon={Check} />
        </div>

        <div style={{ display: 'flex', gap: 0, marginBottom: 24, flexWrap: 'wrap' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                data-testid={`admin-tab-${tab.id}`}
                style={{
                  flex: '1 1 180px',
                  padding: 16,
                  background: isActive ? 'rgba(212, 160, 23, 0.10)' : theme.bg.tab,
                  border: 'none',
                  borderBottom: isActive ? `2px solid ${theme.gold}` : `1px solid ${theme.border}`,
                  color: isActive ? theme.gold : theme.text.muted,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  letterSpacing: 0
                }}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'reviews' && (
          <ReviewsPanel
            reviews={reviews}
            onToggleReview={handleToggleReview}
            onDeleteReview={handleDeleteReview}
          />
        )}

        {activeTab === 'rules' && <RuleSystemManager />}

        {activeTab === 'templates' && (
          <div style={{ background: theme.bg.panel, border: `1px solid ${theme.borderStrong}`, padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ color: theme.gold, fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: 1 }}>
                Premade Character Templates
              </h2>
              <p style={{ color: theme.text.muted, fontSize: 12, marginTop: 4 }}>
                Toggle visibility, clone to homebrew, or delete custom templates. Core templates ship with the app and can only be hidden.
              </p>
            </div>
            <TemplateEditor />
          </div>
        )}

        {activeTab === 'users' && <AdminUsersTab />}
        {activeTab === 'site' && <AdminSiteControlTab />}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div style={{
      background: theme.bg.card,
      border: `1px solid ${theme.borderStrong}`,
      padding: 20,
      textAlign: 'center',
      borderRadius: 8
    }}>
      <Icon size={24} color={theme.gold} style={{ marginBottom: 8 }} />
      <div style={{ color: '#F8FAFC', fontSize: 28, fontWeight: 800 }}>{value}</div>
      <div style={{ color: theme.text.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

function ReviewsPanel({ reviews, onToggleReview, onDeleteReview }) {
  return (
    <div style={{ background: theme.bg.panel, border: `1px solid ${theme.borderStrong}`, padding: 24 }}>
      <h2 style={{
        color: theme.gold,
        fontSize: 18,
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: 800,
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}>
        <Star size={20} />
        User Reviews
      </h2>

      {reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: theme.text.muted }}>
          <Star size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
          <p>No reviews yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reviews.map(review => (
            <div
              key={review.id}
              style={{
                background: theme.bg.card,
                border: `1px solid ${review.is_approved ? theme.borderStrong : theme.border}`,
                borderLeft: `3px solid ${review.is_approved ? theme.gold : theme.text.muted}`,
                padding: '16px 20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: theme.text.white, fontWeight: 700 }}>{review.username}</span>
                    <div style={{ display: 'flex' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          size={14}
                          fill={review.rating >= star ? theme.gold : 'transparent'}
                          color={review.rating >= star ? theme.gold : theme.text.muted}
                        />
                      ))}
                    </div>
                    {review.is_approved && (
                      <span style={{
                        background: 'rgba(212,160,23,0.12)',
                        color: theme.gold,
                        padding: '2px 8px',
                        fontSize: 10,
                        fontWeight: 800
                      }}>
                        VISIBLE
                      </span>
                    )}
                  </div>
                  <p style={{ color: theme.text.secondary, fontSize: 13, fontStyle: 'italic', margin: '0 0 8px' }}>
                    "{review.comment}"
                  </p>
                  <p style={{ color: theme.text.muted, fontSize: 11, margin: 0 }}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    onClick={() => onToggleReview(review.id)}
                    style={{
                      padding: '8px 12px',
                      fontSize: 11,
                      background: review.is_approved ? 'transparent' : theme.gold,
                      border: review.is_approved ? `1px solid ${theme.border}` : 'none',
                      color: review.is_approved ? theme.text.muted : '#111827',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    {review.is_approved ? <X size={12} /> : <Check size={12} />}
                    {review.is_approved ? 'Hide' : 'Show'}
                  </Button>
                  <Button
                    onClick={() => onDeleteReview(review.id)}
                    style={{ padding: 8, background: 'rgba(239, 68, 68, 0.15)', border: 'none' }}
                  >
                    <Trash2 size={14} color="#ef4444" />
                  </Button>
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
