import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  User, Crown, Plus, ChevronRight, Star, Link2, Settings,
  Users, Swords, MapPin, Calendar, LogOut
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Design tokens
const colors = {
  bg: {
    primary: '#18181B',
    secondary: '#1E1E22',
    card: '#242428',
    elevated: '#2E2E32',
    hover: '#38383D'
  },
  gm: {
    primary: '#A4243B',
    hover: '#B82E47',
    subtle: 'rgba(164, 36, 59, 0.15)',
    border: 'rgba(164, 36, 59, 0.4)'
  },
  player: {
    primary: '#2563EB',
    hover: '#3B82F6',
    subtle: 'rgba(37, 99, 235, 0.15)',
    border: 'rgba(37, 99, 235, 0.4)'
  },
  text: {
    primary: '#FAFAFA',
    secondary: '#A1A1AA',
    muted: '#71717A'
  },
  border: 'rgba(255, 255, 255, 0.08)'
};

function UnifiedDashboard({ username, onLogout }) {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [charsRes, campsRes, userRes] = await Promise.all([
        axios.get(`${API}/characters`),
        axios.get(`${API}/campaigns`),
        axios.get(`${API}/user/profile`).catch(() => ({ data: {} }))
      ]);
      setCharacters(charsRes.data || []);
      setCampaigns(campsRes.data || []);
      setReferralCode(userRes.data?.referral_code || '');
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (reviewRating === 0) {
      toast.error('Please select a rating');
      return;
    }
    
    setSubmittingReview(true);
    try {
      await axios.post(`${API}/reviews`, {
        rating: reviewRating,
        review_text: reviewText
      });
      
      toast.success('Thank you for your review!');
      setShowReviewModal(false);
      
      // If 4-5 stars, redirect to landing page
      if (reviewRating >= 4) {
        setTimeout(() => {
          window.open('/', '_blank');
        }, 1000);
      }
    } catch (error) {
      toast.error('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const copyReferralCode = () => {
    const url = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(url);
    toast.success('Referral link copied!');
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: colors.bg.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: colors.text.secondary }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: colors.bg.primary,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <header style={{
        background: colors.bg.secondary,
        borderBottom: `1px solid ${colors.border}`,
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: '800',
            fontSize: '24px',
            color: colors.text.primary,
            margin: 0
          }}>
            ROOKIE QUEST KEEPER
          </h1>
          <span style={{ 
            color: colors.text.muted, 
            fontSize: '14px',
            borderLeft: `1px solid ${colors.border}`,
            paddingLeft: '16px'
          }}>
            Welcome, {username}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Review Button */}
          <Button
            onClick={() => setShowReviewModal(true)}
            data-testid="review-btn"
            style={{
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: '2px',
              color: colors.text.secondary,
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Star size={16} />
            Leave Review
          </Button>

          {/* Referral Button */}
          <Button
            onClick={() => setShowReferralModal(true)}
            data-testid="referral-btn"
            style={{
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: '2px',
              color: colors.text.secondary,
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Link2 size={16} />
            Referral Code
          </Button>

          {/* Settings */}
          <Button
            onClick={() => navigate('/account')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              color: colors.text.muted
            }}
          >
            <Settings size={20} />
          </Button>

          {/* Logout */}
          <Button
            onClick={onLogout}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              color: colors.text.muted
            }}
          >
            <LogOut size={20} />
          </Button>
        </div>
      </header>

      {/* Main Content - Split View */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1px 1fr',
        padding: '32px',
        gap: '0'
      }}>
        {/* LEFT: Player Characters (Blue) */}
        <div style={{ padding: '0 32px 0 0' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '800',
              fontSize: '20px',
              color: colors.player.primary,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <User size={24} />
              MY CHARACTERS
            </h2>
            <Button
              onClick={() => navigate('/character-builder')}
              data-testid="new-character-btn"
              style={{
                background: colors.player.primary,
                border: 'none',
                borderRadius: '2px',
                color: colors.text.primary,
                padding: '10px 20px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Plus size={18} />
              New Character
            </Button>
          </div>

          {/* Character List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {characters.length === 0 ? (
              <div style={{
                background: colors.player.subtle,
                border: `1px solid ${colors.player.border}`,
                borderRadius: '4px',
                padding: '40px',
                textAlign: 'center'
              }}>
                <User size={48} style={{ color: colors.player.primary, opacity: 0.5, marginBottom: '16px' }} />
                <h3 style={{ color: colors.text.primary, margin: '0 0 8px', fontSize: '16px' }}>
                  No Characters Yet
                </h3>
                <p style={{ color: colors.text.secondary, margin: '0 0 20px', fontSize: '14px' }}>
                  Create your first character to join campaigns
                </p>
                <Button
                  onClick={() => navigate('/character-builder')}
                  style={{
                    background: colors.player.primary,
                    border: 'none',
                    borderRadius: '2px',
                    padding: '12px 24px'
                  }}
                >
                  Create Character
                </Button>
              </div>
            ) : (
              characters.map(char => (
                <div
                  key={char.id}
                  onClick={() => navigate(`/characters/${char.id}`)}
                  data-testid={`character-${char.id}`}
                  style={{
                    background: colors.bg.card,
                    border: `1px solid ${colors.player.border}`,
                    borderLeft: `3px solid ${colors.player.primary}`,
                    borderRadius: '2px',
                    padding: '16px 20px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.bg.elevated;
                    e.currentTarget.style.borderColor = colors.player.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.bg.card;
                    e.currentTarget.style.borderColor = colors.player.border;
                  }}
                >
                  <div>
                    <h3 style={{ 
                      color: colors.text.primary, 
                      margin: '0 0 4px', 
                      fontSize: '16px',
                      fontWeight: '700'
                    }}>
                      {char.name}
                    </h3>
                    <p style={{ color: colors.text.secondary, margin: 0, fontSize: '13px' }}>
                      Level {char.level} {char.race} {char.character_class}
                    </p>
                  </div>
                  <ChevronRight size={20} style={{ color: colors.player.primary }} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ 
          background: colors.border,
          width: '1px'
        }} />

        {/* RIGHT: GM Campaigns (Red) */}
        <div style={{ padding: '0 0 0 32px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '800',
              fontSize: '20px',
              color: colors.gm.primary,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Crown size={24} />
              MY CAMPAIGNS
            </h2>
            <Button
              onClick={() => navigate('/campaigns?create=true')}
              data-testid="new-campaign-btn"
              style={{
                background: colors.gm.primary,
                border: 'none',
                borderRadius: '2px',
                color: colors.text.primary,
                padding: '10px 20px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Plus size={18} />
              New Campaign
            </Button>
          </div>

          {/* Campaign List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {campaigns.length === 0 ? (
              <div style={{
                background: colors.gm.subtle,
                border: `1px solid ${colors.gm.border}`,
                borderRadius: '4px',
                padding: '40px',
                textAlign: 'center'
              }}>
                <Crown size={48} style={{ color: colors.gm.primary, opacity: 0.5, marginBottom: '16px' }} />
                <h3 style={{ color: colors.text.primary, margin: '0 0 8px', fontSize: '16px' }}>
                  No Campaigns Yet
                </h3>
                <p style={{ color: colors.text.secondary, margin: '0 0 20px', fontSize: '14px' }}>
                  Create your first campaign to start GMing
                </p>
                <Button
                  onClick={() => navigate('/campaigns/new')}
                  style={{
                    background: colors.gm.primary,
                    border: 'none',
                    borderRadius: '2px',
                    padding: '12px 24px'
                  }}
                >
                  Create Campaign
                </Button>
              </div>
            ) : (
              campaigns.map(campaign => (
                <div
                  key={campaign.id}
                  onClick={() => navigate(`/campaign/${campaign.id}`)}
                  data-testid={`campaign-${campaign.id}`}
                  style={{
                    background: colors.bg.card,
                    border: `1px solid ${colors.gm.border}`,
                    borderLeft: `3px solid ${colors.gm.primary}`,
                    borderRadius: '2px',
                    padding: '16px 20px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.bg.elevated;
                    e.currentTarget.style.borderColor = colors.gm.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.bg.card;
                    e.currentTarget.style.borderColor = colors.gm.border;
                  }}
                >
                  <div>
                    <h3 style={{ 
                      color: colors.text.primary, 
                      margin: '0 0 4px', 
                      fontSize: '16px',
                      fontWeight: '700'
                    }}>
                      {campaign.name}
                    </h3>
                    <div style={{ 
                      display: 'flex', 
                      gap: '16px',
                      color: colors.text.secondary, 
                      fontSize: '13px' 
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={12} /> {campaign.player_count || 0} players
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} /> {campaign.setting || 'Fantasy'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={20} style={{ color: colors.gm.primary }} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={() => setShowReviewModal(false)}
        >
          <div 
            style={{
              background: colors.bg.card,
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              padding: '32px',
              width: '100%',
              maxWidth: '400px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ 
              color: colors.text.primary, 
              margin: '0 0 8px',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '800',
              fontSize: '20px'
            }}>
              Leave a Review
            </h2>
            <p style={{ color: colors.text.secondary, margin: '0 0 24px', fontSize: '14px' }}>
              How would you rate your experience?
            </p>

            {/* Star Rating */}
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              marginBottom: '20px',
              justifyContent: 'center'
            }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <Star 
                    size={32} 
                    fill={star <= reviewRating ? '#F59E0B' : 'transparent'}
                    color={star <= reviewRating ? '#F59E0B' : colors.text.muted}
                  />
                </button>
              ))}
            </div>

            {/* Review Text */}
            <textarea
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder="Tell us more about your experience (optional)"
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                background: colors.bg.secondary,
                border: `1px solid ${colors.border}`,
                borderRadius: '2px',
                color: colors.text.primary,
                fontSize: '14px',
                resize: 'vertical',
                marginBottom: '20px'
              }}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                onClick={() => setShowReviewModal(false)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '2px',
                  color: colors.text.secondary,
                  padding: '12px'
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReviewSubmit}
                disabled={submittingReview}
                style={{
                  flex: 1,
                  background: colors.player.primary,
                  border: 'none',
                  borderRadius: '2px',
                  color: colors.text.primary,
                  padding: '12px'
                }}
              >
                {submittingReview ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Referral Modal */}
      {showReferralModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={() => setShowReferralModal(false)}
        >
          <div 
            style={{
              background: colors.bg.card,
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              padding: '32px',
              width: '100%',
              maxWidth: '400px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ 
              color: colors.text.primary, 
              margin: '0 0 8px',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '800',
              fontSize: '20px'
            }}>
              Your Referral Code
            </h2>
            <p style={{ color: colors.text.secondary, margin: '0 0 24px', fontSize: '14px' }}>
              Share this link with friends to earn rewards
            </p>

            <div style={{
              background: colors.bg.secondary,
              border: `1px solid ${colors.border}`,
              borderRadius: '2px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <code style={{ 
                color: colors.player.primary, 
                fontSize: '16px',
                fontWeight: '700'
              }}>
                {referralCode || 'Loading...'}
              </code>
            </div>

            <Button
              onClick={copyReferralCode}
              style={{
                width: '100%',
                background: colors.player.primary,
                border: 'none',
                borderRadius: '2px',
                color: colors.text.primary,
                padding: '12px',
                fontWeight: '600'
              }}
            >
              <Link2 size={16} style={{ marginRight: '8px' }} />
              Copy Referral Link
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UnifiedDashboard;
