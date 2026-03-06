import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Trash2, Copy, Users, Gift, Shield, Key, Star, Check, X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
  const [activeTab, setActiveTab] = useState('promos'); // 'promos' or 'reviews'

  // Tier options for promo codes
  const tierOptions = [
    { value: 'player', label: 'Hero (Player) - $3.99 value', color: '#3B82F6' },
    { value: 'gm', label: 'Quest Master (GM) - $3.99 value', color: '#E11D48' },
    { value: 'legendary', label: 'Legendary (Both) - $5.99 value', color: '#F59E0B' }
  ];

  // Duration options for promo codes
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

  // Uses options
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
      // First check if user is admin
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
      // If admin endpoint doesn't exist yet, just show empty
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
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #030014 0%, #0a0a2e 50%, #030014 100%)',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
          <Button 
            onClick={() => navigate('/campaigns')} 
            className="btn-icon"
          >
            <ArrowLeft size={24} />
          </Button>
          <div>
            <h1 style={{ 
              fontSize: '32px', 
              color: '#fff',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Shield size={32} color="#ef4444" />
              Admin Panel
            </h1>
            <p style={{ color: '#94a3b8', marginTop: '4px' }}>Manage promo codes, reviews, and view stats</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '24px',
          borderBottom: '2px solid #1e40af',
          paddingBottom: '12px'
        }}>
          <Button
            onClick={() => setActiveTab('promos')}
            className={activeTab === 'promos' ? 'btn-primary' : 'btn-outline'}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Key size={18} />
            Promo Codes ({promoCodes.length})
          </Button>
          <Button
            onClick={() => setActiveTab('reviews')}
            className={activeTab === 'reviews' ? 'btn-primary' : 'btn-outline'}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Star size={18} />
            Reviews ({reviews.length})
          </Button>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '2px solid #22c55e',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <Key size={28} color="#22c55e" style={{ marginBottom: '8px' }} />
            <div style={{ color: '#22c55e', fontSize: '32px', fontWeight: '800' }}>
              {promoCodes.length}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '14px' }}>Active Promo Codes</div>
          </div>
          
          <div style={{
            background: 'rgba(74, 125, 255, 0.1)',
            border: '2px solid #4a7dff',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <Users size={28} color="#4a7dff" style={{ marginBottom: '8px' }} />
            <div style={{ color: '#4a7dff', fontSize: '32px', fontWeight: '800' }}>
              {stats?.total_users || 0}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '14px' }}>Total Users</div>
          </div>
          
          <div style={{
            background: 'rgba(168, 85, 247, 0.1)',
            border: '2px solid #a855f7',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <Gift size={28} color="#a855f7" style={{ marginBottom: '8px' }} />
            <div style={{ color: '#a855f7', fontSize: '32px', fontWeight: '800' }}>
              {stats?.total_referrals || 0}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '14px' }}>Total Referrals</div>
          </div>
        </div>

        {/* Promo Codes Tab Content */}
        {activeTab === 'promos' && (
        <>
        {/* Promo Codes Section */}
        <div style={{
          background: 'rgba(30, 30, 60, 0.5)',
          border: '2px solid #1e40af',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '40px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <h2 style={{ 
              color: '#fff', 
              fontSize: '20px',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Key size={22} />
              Promo Codes
            </h2>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={18} />
              Create Code
            </Button>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <form onSubmit={handleCreateCode} style={{
              background: '#1A1A1A',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <h3 style={{ color: '#E11D48', fontSize: '16px', fontWeight: '700', marginBottom: '20px', fontFamily: 'Cityworm, sans-serif' }}>
                Create New Promo Code
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: '#B3B3B3', marginBottom: '8px', fontSize: '13px' }}>
                    Code Name *
                  </label>
                  <Input
                    value={newCode.code}
                    onChange={(e) => setNewCode({ ...newCode, code: e.target.value })}
                    placeholder="e.g., LAUNCH2024"
                    style={{
                      background: '#0D0D0D',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      textTransform: 'uppercase'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#B3B3B3', marginBottom: '8px', fontSize: '13px' }}>
                    Tier Granted *
                  </label>
                  <select
                    value={newCode.tier_granted}
                    onChange={(e) => setNewCode({ ...newCode, tier_granted: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#0D0D0D',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff'
                    }}
                  >
                    {tierOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#B3B3B3', marginBottom: '8px', fontSize: '13px' }}>
                    Max Uses
                  </label>
                  <select
                    value={newCode.uses_remaining}
                    onChange={(e) => setNewCode({ ...newCode, uses_remaining: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#0D0D0D',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff'
                    }}
                  >
                    {usesOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#B3B3B3', marginBottom: '8px', fontSize: '13px' }}>
                    Duration (Access Length)
                  </label>
                  <select
                    value={newCode.duration_days}
                    onChange={(e) => setNewCode({ ...newCode, duration_days: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#0D0D0D',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff'
                    }}
                  >
                    {durationOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', color: '#B3B3B3', marginBottom: '8px', fontSize: '13px' }}>
                    Description (Internal Note)
                  </label>
                  <Input
                    value={newCode.description}
                    onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                    placeholder="e.g., For beta testers, For influencer X"
                    style={{
                      background: '#0D0D0D',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <Button type="submit" style={{ background: '#E11D48', border: 'none', color: '#fff' }}>Create Code</Button>
                <Button type="button" onClick={() => setShowCreateForm(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#B3B3B3' }}>Cancel</Button>
              </div>
            </form>
          )}

          {/* Codes List */}
          {promoCodes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#808080' }}>
              <Key size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
              <p>No promo codes yet. Create one above!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {promoCodes.map((code) => {
                const tierColors = {
                  'player': { bg: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', label: 'Hero (Player)' },
                  'gm': { bg: 'rgba(225, 29, 72, 0.15)', color: '#E11D48', label: 'Quest Master (GM)' },
                  'legendary': { bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', label: 'Legendary (Both)' },
                  'adventurer': { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', label: 'Legacy Premium' }
                };
                const tierStyle = tierColors[code.tier_granted] || tierColors['legendary'];
                
                return (
                <div
                  key={code.id}
                  style={{
                    background: '#1A1A1A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '16px 20px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: 'Cityworm, monospace',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#E11D48',
                        letterSpacing: '1px'
                      }}>
                        {code.code}
                      </span>
                      <span style={{
                        background: tierStyle.bg,
                        color: tierStyle.color,
                        padding: '4px 12px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {tierStyle.label}
                      </span>
                      <span style={{
                        background: 'rgba(255,255,255,0.05)',
                        color: '#808080',
                        padding: '4px 10px',
                        fontSize: '11px'
                      }}>
                        Uses: {code.uses_remaining === -1 ? '∞ Unlimited' : `${code.uses_remaining} left`}
                      </span>
                      <span style={{ 
                        color: code.duration_days === -1 ? '#22c55e' : '#F59E0B', 
                        fontSize: '12px',
                        background: code.duration_days === -1 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        padding: '4px 10px'
                      }}>
                        {code.duration_days === -1 ? 'Forever' : 
                         code.duration_days === 7 ? '1 Week' :
                         code.duration_days === 14 ? '2 Weeks' :
                         code.duration_days === 30 ? '1 Month' :
                         code.duration_days === 60 ? '2 Months' :
                         code.duration_days === 90 ? '3 Months' :
                         code.duration_days === 180 ? '6 Months' :
                         code.duration_days === 365 ? '1 Year' :
                         `${code.duration_days || 30} Days`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Button
                        onClick={() => copyCode(code.code)}
                        style={{ padding: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <Copy size={16} color="#808080" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteCode(code.id)}
                        style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.15)', border: 'none' }}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </Button>
                    </div>
                  </div>
                  {code.description && (
                    <p style={{ color: '#808080', fontSize: '12px', marginTop: '8px', fontStyle: 'italic' }}>
                      Note: {code.description}
                    </p>
                  )}
                </div>
              )})}
            </div>
          )}
        </div>

        {/* Referral Leaderboard */}
        <div style={{
          background: 'rgba(30, 30, 60, 0.5)',
          border: '2px solid #1e40af',
          borderRadius: '16px',
          padding: '24px'
        }}>
          <h2 style={{ 
            color: '#fff', 
            fontSize: '20px',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: '700',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Users size={22} />
            Top Referrers
          </h2>
          
          {leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <Users size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
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
                    background: index === 0 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(0, 0, 0, 0.2)',
                    border: index === 0 ? '2px solid #eab308' : '1px solid #374151',
                    borderRadius: '8px',
                    padding: '12px 16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: index === 0 ? '#eab308' : index === 1 ? '#94a3b8' : index === 2 ? '#cd7f32' : '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '14px',
                      color: '#000'
                    }}>
                      {index + 1}
                    </span>
                    <span style={{ color: '#fff', fontWeight: '600' }}>{user.username}</span>
                  </div>
                  <span style={{ color: '#22c55e', fontWeight: '700' }}>
                    {user.referrals} referrals
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        </>
        )}

        {/* Reviews Tab Content */}
        {activeTab === 'reviews' && (
          <div style={{
            background: 'rgba(30, 30, 60, 0.5)',
            border: '2px solid #1e40af',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <h2 style={{ 
              color: '#fff', 
              fontSize: '20px',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '700',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Star size={22} />
              User Reviews
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '20px', fontSize: '14px' }}>
              4-5 star reviews are auto-approved. Toggle to hide/show reviews on the landing page.
            </p>
            
            {reviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                <Star size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                <p>No reviews yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    style={{
                      background: review.is_approved ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0, 0, 0, 0.2)',
                      border: `2px solid ${review.is_approved ? '#22c55e' : '#374151'}`,
                      borderRadius: '12px',
                      padding: '16px 20px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <span style={{ color: '#fff', fontWeight: '700' }}>{review.username}</span>
                          <div style={{ display: 'flex' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                size={16} 
                                fill={review.rating >= star ? "#eab308" : "transparent"}
                                color={review.rating >= star ? "#eab308" : "#475569"}
                              />
                            ))}
                          </div>
                          {review.is_featured && (
                            <span style={{
                              background: '#22c55e20',
                              color: '#22c55e',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              FEATURED
                            </span>
                          )}
                        </div>
                        <p style={{ color: '#e2e8f0', fontSize: '14px', fontStyle: 'italic' }}>
                          "{review.comment}"
                        </p>
                        <p style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          onClick={() => handleToggleReview(review.id)}
                          className={review.is_approved ? 'btn-outline' : 'btn-primary'}
                          style={{ padding: '8px 12px', fontSize: '12px' }}
                        >
                          {review.is_approved ? <X size={14} /> : <Check size={14} />}
                          {review.is_approved ? 'Hide' : 'Approve'}
                        </Button>
                        <Button
                          onClick={() => handleDeleteReview(review.id)}
                          className="btn-danger"
                          style={{ padding: '8px' }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPage;
