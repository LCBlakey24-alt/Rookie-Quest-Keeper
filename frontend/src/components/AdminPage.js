import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Trash2, Copy, Users, Gift, Shield, Key, Star, Check, X, Sword, User, BookOpen } from 'lucide-react';
import RuleSystemManager from './RuleSystemManager';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

// Dual Tron Theme - Aries (Red) + Legacy (Blue)
const theme = {
  bg: {
    black: '#0B0F19',
    dark: '#111827',
    panel: '#111827',
    card: '#0891B2',
    hover: '#06B6D4'
  },
  gm: {
    primary: '#F59E0B',
    hover: '#F59E0B',
    subtle: 'rgba(185, 28, 28, 0.15)',
    border: 'rgba(185, 28, 28, 0.4)',
    glow: '0 0 20px rgba(185, 28, 28, 0.3)'
  },
  player: {
    primary: '#06B6D4',
    cyan: '#0891B2',
    hover: '#0891B2',
    subtle: 'rgba(42, 157, 143, 0.15)',
    border: 'rgba(42, 157, 143, 0.4)',
    glow: '0 0 20px rgba(42, 157, 143, 0.3)'
  },
  legendary: {
    primary: '#F59E0B',
    subtle: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.4)'
  },
  text: {
    white: '#FFFFFF',
    secondary: '#B8B8B8',
    muted: '#808080'
  },
  border: 'rgba(212, 175, 55, 0.15)'
};

function AdminPage({ username }) {
  const navigate = useNavigate();
  const [promoCodes, setPromoCodes] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCode, setNewCode] = useState({
    code: '',
    tier_granted: 'legendary',
    duration_days: -1,
    uses_remaining: -1,
    description: ''
  });
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isAdmin, setIsAdmin] = useState(true);
  const [activeTab, setActiveTab] = useState('promos');

  const tierOptions = [
    { value: 'player', label: 'Hero (Player) - £3.99 value', color: theme.player.primary, icon: User },
    { value: 'gm', label: 'Quest Master (GM) - £3.99 value', color: theme.gm.primary, icon: Sword },
    { value: 'legendary', label: 'Legendary (Both) - £5.99 value', color: theme.legendary.primary, icon: Star }
  ];

  const durationOptions = [
    { value: 7, label: '1 Week' },
    { value: 14, label: '2 Weeks' },
    { value: 30, label: '1 Month' },
    { value: 60, label: '2 Months' },
    { value: 90, label: '3 Months' },
    { value: 180, label: '6 Months' },
    { value: 365, label: '1 Year' },
    { value: -1, label: 'Forever (Lifetime Access)' }
  ];

  const usesOptions = [
    { value: -1, label: 'Unlimited Uses' },
    { value: 1, label: '1 Use (Single)' },
    { value: 5, label: '5 Uses' },
    { value: 10, label: '10 Uses' },
    { value: 25, label: '25 Uses' },
    { value: 50, label: '50 Uses' },
    { value: 100, label: '100 Uses' }
  ];

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    try {
      const adminCheck = await axios.get(`${API}/admin/check`);
      if (!adminCheck.data.is_admin) {
        toast.error('Admin access required');
        navigate('/campaigns');
        return;
      }
      setIsAdmin(true);
      fetchData();
    } catch (error) {
      toast.error('Access denied');
      navigate('/campaigns');
    }
  };

  const fetchData = async () => {
    try {
      const [codesRes, leaderboardRes, reviewsRes] = await Promise.all([
        axios.get(`${API}/admin/promo-codes`),
        axios.get(`${API}/referral/leaderboard`),
        axios.get(`${API}/reviews/all`).catch(() => ({ data: [] }))
      ]);
      setPromoCodes(codesRes.data.codes || []);
      setStats(codesRes.data.stats);
      setLeaderboard(leaderboardRes.data.leaderboard || []);
      setReviews(reviewsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReview = async (reviewId) => {
    try {
      const response = await axios.put(`${API}/reviews/${reviewId}/approve`);
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error('Failed to update review');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await axios.delete(`${API}/reviews/${reviewId}`);
      toast.success('Review deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete review');
    }
  };

  const handleCreateCode = async (e) => {
    e.preventDefault();
    if (!newCode.code.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    try {
      await axios.post(`${API}/promo-codes`, {
        code: newCode.code.toUpperCase(),
        tier_granted: newCode.tier_granted,
        duration_days: parseInt(newCode.duration_days),
        uses_remaining: parseInt(newCode.uses_remaining),
        description: newCode.description || null
      });
      toast.success(`Promo code ${newCode.code.toUpperCase()} created!`);
      setNewCode({ code: '', tier_granted: 'legendary', duration_days: -1, uses_remaining: -1, description: '' });
      setShowCreateForm(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create promo code');
    }
  };

  const handleDeleteCode = async (codeId) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) return;
    try {
      await axios.delete(`${API}/admin/promo-codes/${codeId}`);
      toast.success('Promo code deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete promo code');
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

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
    <div style={{
      minHeight: '100vh',
      background: theme.bg.black,
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header with gradient accent */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          marginBottom: '40px',
          paddingBottom: '24px',
          borderBottom: '1px solid',
          borderImage: 'linear-gradient(90deg, #F59E0B, #06B6D4) 1'
        }}>
          <Button 
            onClick={() => navigate('/home')} 
            style={{
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              padding: '10px',
              color: theme.text.muted
            }}
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 style={{ 
              fontSize: '28px', 
              color: theme.text.white,
              fontFamily: "Inter, sans-serif",
              fontWeight: '400',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: 0
            }}>
              <Shield size={28} color={theme.gm.primary} />
              ADMIN PANEL
            </h1>
            <p style={{ color: theme.text.muted, marginTop: '4px', fontSize: '14px' }}>
              Manage promo codes, reviews, and view statistics
            </p>
          </div>
        </div>

        {/* Stats Cards - Gradient themed */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div style={{
            background: theme.player.subtle,
            border: `1px solid ${theme.player.border}`,
            padding: '20px',
            textAlign: 'center',
            boxShadow: theme.player.glow
          }}>
            <User size={24} color={theme.player.cyan} style={{ marginBottom: '8px' }} />
            <div style={{ color: theme.player.cyan, fontSize: '28px', fontWeight: '800' }}>
              {stats?.total_users || 0}
            </div>
            <div style={{ color: theme.text.muted, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Total Users
            </div>
          </div>
          
          <div style={{
            background: theme.gm.subtle,
            border: `1px solid ${theme.gm.border}`,
            padding: '20px',
            textAlign: 'center',
            boxShadow: theme.gm.glow
          }}>
            <Key size={24} color={theme.gm.primary} style={{ marginBottom: '8px' }} />
            <div style={{ color: theme.gm.primary, fontSize: '28px', fontWeight: '800' }}>
              {promoCodes.length}
            </div>
            <div style={{ color: theme.text.muted, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Active Codes
            </div>
          </div>
          
          <div style={{
            background: theme.legendary.subtle,
            border: `1px solid ${theme.legendary.border}`,
            padding: '20px',
            textAlign: 'center'
          }}>
            <Gift size={24} color={theme.legendary.primary} style={{ marginBottom: '8px' }} />
            <div style={{ color: theme.legendary.primary, fontSize: '28px', fontWeight: '800' }}>
              {stats?.total_referrals || 0}
            </div>
            <div style={{ color: theme.text.muted, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Referrals
            </div>
          </div>

          <div style={{
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            padding: '20px',
            textAlign: 'center'
          }}>
            <Star size={24} color="#22c55e" style={{ marginBottom: '8px' }} />
            <div style={{ color: '#22c55e', fontSize: '28px', fontWeight: '800' }}>
              {reviews.filter(r => r.is_approved).length}
            </div>
            <div style={{ color: theme.text.muted, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Reviews
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '0', 
          marginBottom: '24px'
        }}>
          <button
            onClick={() => setActiveTab('promos')}
            style={{
              flex: 1,
              padding: '16px',
              background: activeTab === 'promos' ? theme.gm.subtle : theme.bg.dark,
              border: 'none',
              borderBottom: activeTab === 'promos' ? `2px solid ${theme.gm.primary}` : `1px solid ${theme.border}`,
              color: activeTab === 'promos' ? theme.gm.primary : theme.text.muted,
              fontSize: '14px',
              fontWeight: '400',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: "Inter, sans-serif",
              letterSpacing: '1px'
            }}
          >
            <Key size={18} />
            PROMO CODES ({promoCodes.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            style={{
              flex: 1,
              padding: '16px',
              background: activeTab === 'reviews' ? theme.player.subtle : theme.bg.dark,
              border: 'none',
              borderBottom: activeTab === 'reviews' ? `2px solid ${theme.player.cyan}` : `1px solid ${theme.border}`,
              color: activeTab === 'reviews' ? theme.player.cyan : theme.text.muted,
              fontSize: '14px',
              fontWeight: '400',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: "Inter, sans-serif",
              letterSpacing: '1px'
            }}
          >
            <Star size={18} />
            REVIEWS ({reviews.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            style={{
              flex: 1,
              padding: '16px',
              background: activeTab === 'rules' ? theme.legendary.subtle : theme.bg.dark,
              border: 'none',
              borderBottom: activeTab === 'rules' ? `2px solid ${theme.legendary.primary}` : `1px solid ${theme.border}`,
              color: activeTab === 'rules' ? theme.legendary.primary : theme.text.muted,
              fontSize: '14px',
              fontWeight: '400',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: "Inter, sans-serif",
              letterSpacing: '1px'
            }}
          >
            <BookOpen size={18} />
            RULE SYSTEMS
          </button>
        </div>

        {/* Promo Codes Tab */}
        {activeTab === 'promos' && (
          <div style={{
            background: theme.bg.panel,
            border: `1px solid ${theme.gm.border}`,
            padding: '24px'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ 
                color: theme.gm.primary, 
                fontSize: '18px',
                fontFamily: "Inter, sans-serif",
                fontWeight: '400',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                margin: 0
              }}>
                <Key size={20} />
                PROMO CODES
              </h2>
              <Button
                onClick={() => setShowCreateForm(!showCreateForm)}
                style={{
                  background: theme.gm.primary,
                  border: 'none',
                  color: '#fff',
                  padding: '10px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '400'
                }}
              >
                <Plus size={16} />
                Create Code
              </Button>
            </div>

            {/* Create Form */}
            {showCreateForm && (
              <form onSubmit={handleCreateCode} style={{
                background: theme.bg.dark,
                border: `1px solid ${theme.gm.border}`,
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ 
                  color: theme.gm.primary, 
                  fontSize: '14px', 
                  fontWeight: '400', 
                  marginBottom: '20px',
                  fontFamily: "Inter, sans-serif",
                  letterSpacing: '1px'
                }}>
                  CREATE NEW PROMO CODE
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', color: theme.text.muted, marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>
                      Code Name *
                    </label>
                    <Input
                      value={newCode.code}
                      onChange={(e) => setNewCode({ ...newCode, code: e.target.value })}
                      placeholder="e.g., LAUNCH2024"
                      style={{
                        background: theme.bg.black,
                        border: `1px solid ${theme.border}`,
                        color: '#fff',
                        textTransform: 'uppercase'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: theme.text.muted, marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>
                      Tier Granted *
                    </label>
                    <select
                      value={newCode.tier_granted}
                      onChange={(e) => setNewCode({ ...newCode, tier_granted: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: theme.bg.black,
                        border: `1px solid ${theme.border}`,
                        color: '#fff'
                      }}
                    >
                      {tierOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: theme.text.muted, marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>
                      Max Uses
                    </label>
                    <select
                      value={newCode.uses_remaining}
                      onChange={(e) => setNewCode({ ...newCode, uses_remaining: parseInt(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: theme.bg.black,
                        border: `1px solid ${theme.border}`,
                        color: '#fff'
                      }}
                    >
                      {usesOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: theme.text.muted, marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>
                      Duration
                    </label>
                    <select
                      value={newCode.duration_days}
                      onChange={(e) => setNewCode({ ...newCode, duration_days: parseInt(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: theme.bg.black,
                        border: `1px solid ${theme.border}`,
                        color: '#fff'
                      }}
                    >
                      {durationOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', color: theme.text.muted, marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>
                      Description (Internal)
                    </label>
                    <Input
                      value={newCode.description}
                      onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                      placeholder="e.g., For beta testers"
                      style={{
                        background: theme.bg.black,
                        border: `1px solid ${theme.border}`,
                        color: '#fff'
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <Button type="submit" style={{ background: theme.gm.primary, border: 'none', color: '#fff', padding: '10px 24px' }}>
                    Create Code
                  </Button>
                  <Button type="button" onClick={() => setShowCreateForm(false)} style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.text.muted, padding: '10px 24px' }}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* Codes List */}
            {promoCodes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: theme.text.muted }}>
                <Key size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p>No promo codes yet. Create one above!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {promoCodes.map((code) => {
                  const tierStyles = {
                    'player': { bg: theme.player.subtle, color: theme.player.cyan, label: 'Hero', border: theme.player.border },
                    'gm': { bg: theme.gm.subtle, color: theme.gm.primary, label: 'Quest Master', border: theme.gm.border },
                    'legendary': { bg: theme.legendary.subtle, color: theme.legendary.primary, label: 'Legendary', border: theme.legendary.border },
                    'adventurer': { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', label: 'Legacy', border: 'rgba(34, 197, 94, 0.4)' }
                  };
                  const style = tierStyles[code.tier_granted] || tierStyles['legendary'];
                  
                  return (
                    <div
                      key={code.id}
                      style={{
                        background: theme.bg.card,
                        border: `1px solid ${theme.border}`,
                        borderLeft: `3px solid ${style.color}`,
                        padding: '16px 20px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontFamily: 'Montserrat, monospace',
                            fontSize: '16px',
                            fontWeight: '400',
                            color: style.color,
                            letterSpacing: '1px'
                          }}>
                            {code.code}
                          </span>
                          <span style={{
                            background: style.bg,
                            color: style.color,
                            padding: '4px 12px',
                            fontSize: '11px',
                            fontWeight: '400'
                          }}>
                            {style.label}
                          </span>
                          <span style={{
                            background: 'rgba(255,255,255,0.05)',
                            color: theme.text.muted,
                            padding: '4px 10px',
                            fontSize: '11px'
                          }}>
                            Uses: {code.uses_remaining === -1 ? '∞' : code.uses_remaining}
                          </span>
                          <span style={{ 
                            color: code.duration_days === -1 ? '#22c55e' : theme.legendary.primary, 
                            fontSize: '11px',
                            background: code.duration_days === -1 ? 'rgba(34, 197, 94, 0.15)' : theme.legendary.subtle,
                            padding: '4px 10px'
                          }}>
                            {code.duration_days === -1 ? 'Forever' : `${code.duration_days} days`}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Button
                            onClick={() => copyCode(code.code)}
                            style={{ padding: '8px', background: 'transparent', border: `1px solid ${theme.border}` }}
                          >
                            <Copy size={14} color={theme.text.muted} />
                          </Button>
                          <Button
                            onClick={() => handleDeleteCode(code.id)}
                            style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.15)', border: 'none' }}
                          >
                            <Trash2 size={14} color="#ef4444" />
                          </Button>
                        </div>
                      </div>
                      {code.description && (
                        <p style={{ color: theme.text.muted, fontSize: '12px', marginTop: '8px', fontStyle: 'italic' }}>
                          {code.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div style={{
            background: theme.bg.panel,
            border: `1px solid ${theme.player.border}`,
            padding: '24px'
          }}>
            <h2 style={{ 
              color: theme.player.cyan, 
              fontSize: '18px',
              fontFamily: "Inter, sans-serif",
              fontWeight: '400',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Star size={20} />
              USER REVIEWS
            </h2>
            <p style={{ color: theme.text.muted, marginBottom: '20px', fontSize: '13px' }}>
              4-5 star reviews are auto-approved. Toggle to show/hide reviews on the landing page.
            </p>
            
            {reviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: theme.text.muted }}>
                <Star size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p>No reviews yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    style={{
                      background: theme.bg.card,
                      border: `1px solid ${review.is_approved ? theme.player.border : theme.border}`,
                      borderLeft: `3px solid ${review.is_approved ? theme.player.cyan : theme.text.muted}`,
                      padding: '16px 20px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <span style={{ color: theme.text.white, fontWeight: '400' }}>{review.username}</span>
                          <div style={{ display: 'flex' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                size={14} 
                                fill={review.rating >= star ? "#F59E0B" : "transparent"}
                                color={review.rating >= star ? "#F59E0B" : theme.text.muted}
                              />
                            ))}
                          </div>
                          {review.is_approved && (
                            <span style={{
                              background: theme.player.subtle,
                              color: theme.player.cyan,
                              padding: '2px 8px',
                              fontSize: '10px',
                              fontWeight: '400'
                            }}>
                              VISIBLE
                            </span>
                          )}
                        </div>
                        <p style={{ color: theme.text.secondary, fontSize: '13px', fontStyle: 'italic', margin: '0 0 8px' }}>
                          "{review.comment}"
                        </p>
                        <p style={{ color: theme.text.muted, fontSize: '11px', margin: 0 }}>
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          onClick={() => handleToggleReview(review.id)}
                          style={{
                            padding: '8px 12px',
                            fontSize: '11px',
                            background: review.is_approved ? 'transparent' : theme.player.primary,
                            border: review.is_approved ? `1px solid ${theme.border}` : 'none',
                            color: review.is_approved ? theme.text.muted : '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {review.is_approved ? <X size={12} /> : <Check size={12} />}
                          {review.is_approved ? 'Hide' : 'Show'}
                        </Button>
                        <Button
                          onClick={() => handleDeleteReview(review.id)}
                          style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.15)', border: 'none' }}
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
        )}

        {/* Referral Leaderboard */}
        <div style={{
          background: theme.bg.panel,
          border: `1px solid ${theme.border}`,
          padding: '24px',
          marginTop: '24px'
        }}>
          <h2 style={{ 
            color: theme.legendary.primary, 
            fontSize: '18px',
            fontFamily: "Inter, sans-serif",
            fontWeight: '400',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Users size={20} />
            TOP REFERRERS
          </h2>
          
          {leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: theme.text.muted }}>
              <Users size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p>No referrals yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {leaderboard.map((user, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: index === 0 ? theme.legendary.subtle : theme.bg.card,
                    border: `1px solid ${index === 0 ? theme.legendary.border : theme.border}`,
                    padding: '12px 16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      width: '28px',
                      height: '28px',
                      background: index === 0 ? theme.legendary.primary : index === 1 ? '#94a3b8' : index === 2 ? '#cd7f32' : theme.bg.hover,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '400',
                      fontSize: '14px',
                      color: index < 3 ? '#000' : theme.text.white
                    }}>
                      {index + 1}
                    </span>
                    <span style={{ color: theme.text.white, fontWeight: '400' }}>{user.username}</span>
                  </div>
                  <span style={{ color: '#22c55e', fontWeight: '400' }}>
                    {user.referrals} referrals
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rule Systems Tab */}
        {activeTab === 'rules' && (
          <RuleSystemManager />
        )}
      </div>
    </div>
  );
}

export default AdminPage;
