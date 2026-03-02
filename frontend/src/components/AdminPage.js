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
    tier_granted: 'adventurer',
    duration_days: 30,
    uses_remaining: -1
  });
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isAdmin, setIsAdmin] = useState(true);
  const [activeTab, setActiveTab] = useState('promos'); // 'promos' or 'reviews'

  // Duration options for promo codes
  const durationOptions = [
    { value: 7, label: '1 Week' },
    { value: 14, label: '2 Weeks' },
    { value: 30, label: '1 Month' },
    { value: 60, label: '2 Months' },
    { value: 90, label: '3 Months' },
    { value: 180, label: '6 Months' },
    { value: 365, label: '1 Year' },
    { value: -1, label: 'Lifetime (No Expiry)' }
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
        uses_remaining: parseInt(newCode.uses_remaining)
      });
      toast.success(`Promo code ${newCode.code.toUpperCase()} created!`);
      setNewCode({ code: '', tier_granted: 'adventurer', duration_days: 30, uses_remaining: -1 });
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
            <p style={{ color: '#94a3b8', marginTop: '4px' }}>Manage promo codes and view stats</p>
          </div>
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
              background: 'rgba(0, 0, 0, 0.3)',
              border: '2px solid #374151',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '14px' }}>
                    Code Name
                  </label>
                  <Input
                    value={newCode.code}
                    onChange={(e) => setNewCode({ ...newCode, code: e.target.value })}
                    placeholder="e.g., LAUNCH2024"
                    style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '2px solid #374151',
                      color: '#fff',
                      textTransform: 'uppercase'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '14px' }}>
                    Tier Granted
                  </label>
                  <select
                    value={newCode.tier_granted}
                    onChange={(e) => setNewCode({ ...newCode, tier_granted: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '2px solid #374151',
                      color: '#fff'
                    }}
                  >
                    <option value="adventurer">Adventurer (Premium)</option>
                    <option value="free">Free</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '14px' }}>
                    Uses (-1 = unlimited)
                  </label>
                  <Input
                    type="number"
                    value={newCode.uses_remaining}
                    onChange={(e) => setNewCode({ ...newCode, uses_remaining: e.target.value })}
                    style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '2px solid #374151',
                      color: '#fff'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '14px' }}>
                    Duration (Premium Access Length)
                  </label>
                  <select
                    value={newCode.duration_days}
                    onChange={(e) => setNewCode({ ...newCode, duration_days: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '2px solid #374151',
                      color: '#fff'
                    }}
                  >
                    {durationOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <Button type="submit" className="btn-primary">Create Code</Button>
                <Button type="button" onClick={() => setShowCreateForm(false)} className="btn-secondary">Cancel</Button>
              </div>
            </form>
          )}

          {/* Codes List */}
          {promoCodes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <Key size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
              <p>No promo codes yet. Create one above!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {promoCodes.map((code) => (
                <div
                  key={code.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '2px solid #374151',
                    borderRadius: '10px',
                    padding: '16px 20px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#22c55e',
                      letterSpacing: '1px'
                    }}>
                      {code.code}
                    </span>
                    <span style={{
                      background: code.tier_granted === 'adventurer' ? '#22c55e20' : '#4a7dff20',
                      color: code.tier_granted === 'adventurer' ? '#22c55e' : '#4a7dff',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {code.tier_granted}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                      Uses: {code.uses_remaining === -1 ? '∞' : code.uses_remaining}
                    </span>
                    <span style={{ 
                      color: '#f59e0b', 
                      fontSize: '14px',
                      background: '#f59e0b20',
                      padding: '4px 10px',
                      borderRadius: '6px'
                    }}>
                      {code.duration_days === -1 ? 'Lifetime' : 
                       code.duration_days === 7 ? '1 Week' :
                       code.duration_days === 14 ? '2 Weeks' :
                       code.duration_days === 30 ? '1 Month' :
                       code.duration_days === 60 ? '2 Months' :
                       code.duration_days === 90 ? '3 Months' :
                       code.duration_days === 180 ? '6 Months' :
                       code.duration_days === 365 ? '1 Year' :
                       `${code.duration_days || 30} Days`}
                    </span>
                    <Button
                      onClick={() => copyCode(code.code)}
                      className="btn-icon"
                      style={{ padding: '8px' }}
                    >
                      <Copy size={16} />
                    </Button>
                    <Button
                      onClick={() => handleDeleteCode(code.id)}
                      className="btn-danger"
                      style={{ padding: '8px' }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
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
      </div>
    </div>
  );
}

export default AdminPage;
