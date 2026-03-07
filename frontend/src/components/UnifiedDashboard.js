import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  User, Crown, Plus, ChevronRight, Star, Link2, Settings,
  Users, MapPin, LogOut, Shield, Sword
} from 'lucide-react';
import TronBackground from '@/components/TronBackground';
import { RookGuide } from '@/components/RookGuide';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Dual Tron Theme - Split Design
const theme = {
  bg: {
    black: '#0D0D0D',
    dark: '#141414',
    panel: '#1A1A1A',
    card: '#1F1F1F',
    hover: '#2A2A2A'
  },
  // Tron Legacy - Player Side (Blue/Cyan)
  player: {
    primary: '#3B82F6',
    cyan: '#06B6D4',
    hover: '#60A5FA',
    subtle: 'rgba(59, 130, 246, 0.08)',
    border: 'rgba(6, 182, 212, 0.3)',
    glow: '0 0 40px rgba(6, 182, 212, 0.15)',
    gradient: 'linear-gradient(180deg, rgba(6, 182, 212, 0.1) 0%, transparent 100%)'
  },
  // Tron Aries - GM Side (Red/Orange)
  gm: {
    primary: '#E11D48',
    hover: '#F43F5E',
    subtle: 'rgba(225, 29, 72, 0.08)',
    border: 'rgba(225, 29, 72, 0.3)',
    glow: '0 0 40px rgba(225, 29, 72, 0.15)',
    gradient: 'linear-gradient(180deg, rgba(225, 29, 72, 0.1) 0%, transparent 100%)'
  },
  text: {
    white: '#FFFFFF',
    secondary: '#B3B3B3',
    muted: '#808080'
  },
  border: 'rgba(255, 255, 255, 0.1)'
};

function UnifiedDashboard({ username, onLogout }) {
  // Mobile view toggle: 'player' or 'gm'
  const [mobileView, setMobileView] = useState('player');
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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    const adminUsers = ['rookiequestadmin', 'criticalfusion', 'admin'];
    setIsAdmin(adminUsers.some(admin => username?.toLowerCase().includes(admin)));
  }, [username]);

  const fetchAllData = async () => {
    try {
      const [charsRes, campsRes, userRes] = await Promise.all([
        axios.get(`${API}/characters`),
        axios.get(`${API}/campaigns`),
        axios.get(`${API}/account/profile`).catch(() => ({ data: {} }))
      ]);
      setCharacters(charsRes.data || []);
      setCampaigns(campsRes.data || []);
      setReferralCode(userRes.data?.subscription?.referral_code || userRes.data?.referral_code || '');
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
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <header style={{
        background: theme.bg.dark,
        borderBottom: `1px solid ${theme.border}`,
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{
            fontWeight: '700',
            fontSize: '20px',
            color: theme.text.white,
            margin: 0,
            fontFamily: 'Cityworm, sans-serif',
            letterSpacing: '2px'
          }}>
            ROOKIE QUEST KEEPER
          </h1>
          <span style={{ 
            color: theme.text.muted, 
            fontSize: '13px',
            borderLeft: `1px solid ${theme.border}`,
            paddingLeft: '16px'
          }}>
            Welcome, <span style={{ color: theme.text.white }}>{username}</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isAdmin && (
            <Button
              onClick={() => navigate('/admin')}
              data-testid="admin-btn"
              style={{
                background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.2), rgba(6, 182, 212, 0.2))',
                border: '1px solid',
                borderImage: 'linear-gradient(135deg, #E11D48, #06B6D4) 1',
                color: theme.text.white,
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '600'
              }}
            >
              <Shield size={16} />
              Admin
            </Button>
          )}

          <Button
            onClick={() => setShowReviewModal(true)}
            data-testid="review-btn"
            style={{
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              color: theme.text.muted,
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Star size={16} />
            Review
          </Button>

          <Button
            onClick={() => setShowReferralModal(true)}
            data-testid="referral-btn"
            style={{
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              color: theme.text.muted,
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Link2 size={16} />
            Referral
          </Button>

          <Button
            onClick={() => navigate('/account')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              color: theme.text.muted
            }}
          >
            <Settings size={18} />
          </Button>

          <Button
            onClick={onLogout}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              color: theme.text.muted
            }}
          >
            <LogOut size={18} />
          </Button>
        </div>
      </header>

      {/* Mobile Navigation Toggle */}
      <div 
        className="animate-fade-in"
        style={{
          display: 'none',
          padding: '12px 20px',
          background: theme.bg.panel,
          borderBottom: `1px solid ${theme.border}`,
          gap: '0'
        }}
        id="mobile-nav-toggle"
      >
        <style>{`
          @media (max-width: 768px) {
            #mobile-nav-toggle { display: flex !important; }
            #player-section { display: ${mobileView === 'player' ? 'block' : 'none'} !important; }
            #gm-section { display: ${mobileView === 'gm' ? 'block' : 'none'} !important; }
          }
        `}</style>
        <button
          onClick={() => setMobileView('player')}
          className="transition-smooth"
          style={{
            flex: 1,
            padding: '12px',
            background: mobileView === 'player' ? theme.player.primary : 'transparent',
            border: `1px solid ${mobileView === 'player' ? theme.player.primary : theme.border}`,
            borderRight: 'none',
            color: mobileView === 'player' ? '#fff' : theme.text.muted,
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Sword size={16} />
          PLAYER HUB
        </button>
        <button
          onClick={() => setMobileView('gm')}
          className="transition-smooth"
          style={{
            flex: 1,
            padding: '12px',
            background: mobileView === 'gm' ? theme.gm.primary : 'transparent',
            border: `1px solid ${mobileView === 'gm' ? theme.gm.primary : theme.border}`,
            color: mobileView === 'gm' ? '#fff' : theme.text.muted,
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Crown size={16} />
          GM SIDE
        </button>
      </div>

      {/* Main Content - Split Design */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        minHeight: 'calc(100vh - 70px)'
      }}>
        {/* LEFT: Characters - Tron Legacy BLUE */}
        <div 
          id="player-section"
          className="animate-fade-in-left"
          style={{ 
            background: theme.player.subtle,
            borderRight: `1px solid ${theme.player.border}`,
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '400px'
          }}
        >
          {/* Tron Light Trails - Blue */}
          <TronBackground variant="blue" intensity="subtle" showGrid={false} />
          
          {/* Glow effect */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '200px',
            background: theme.player.gradient,
            pointerEvents: 'none'
          }} />
          
          {/* Vertical accent line */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '2px',
            height: '100%',
            background: `linear-gradient(180deg, ${theme.player.cyan}, transparent)`,
            boxShadow: theme.player.glow
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '32px'
            }}>
              <div>
                <h2 style={{
                  fontWeight: '700',
                  fontSize: '14px',
                  color: theme.player.cyan,
                  margin: '0 0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontFamily: 'Cityworm, sans-serif',
                  letterSpacing: '2px'
                }}>
                  <User size={18} />
                  PLAYER SIDE
                </h2>
                <h3 style={{
                  fontWeight: '700',
                  fontSize: '24px',
                  color: theme.text.white,
                  margin: 0
                }}>
                  My Characters
                </h3>
              </div>
              <Button
                onClick={() => navigate('/characters/new')}
                data-testid="new-character-btn"
                style={{
                  background: `linear-gradient(135deg, ${theme.player.primary}, ${theme.player.cyan})`,
                  border: 'none',
                  color: '#fff',
                  padding: '12px 24px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: theme.player.glow
                }}
              >
                <Plus size={18} />
                New Character
              </Button>
            </div>

            {/* Rook Guide for Player Section */}
            <RookGuide guideId="dashboard-player" variant="card" />

            {/* Character List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {characters.length === 0 ? (
                <div style={{
                  background: theme.bg.card,
                  border: `1px solid ${theme.player.border}`,
                  padding: '60px 40px',
                  textAlign: 'center'
                }}>
                  <User size={56} style={{ color: theme.player.cyan, marginBottom: '20px', opacity: 0.5 }} />
                  <h3 style={{ color: theme.text.white, margin: '0 0 8px', fontSize: '18px' }}>
                    No Characters Yet
                  </h3>
                  <p style={{ color: theme.text.muted, margin: '0 0 24px', fontSize: '14px' }}>
                    Create your first character to join campaigns
                  </p>
                  <Button
                    onClick={() => navigate('/characters/new')}
                    style={{
                      background: theme.player.primary,
                      border: 'none',
                      padding: '14px 28px',
                      color: '#fff',
                      fontWeight: '600'
                    }}
                  >
                    Create Character
                  </Button>
                </div>
              ) : (
                characters.map((char, index) => (
                  <div
                    key={char.id}
                    onClick={() => navigate(`/characters/${char.id}`)}
                    data-testid={`character-${char.id}`}
                    className={`card-animated stagger-${Math.min(index + 1, 8)} hover-lift transition-smooth`}
                    style={{
                      background: theme.bg.card,
                      border: `1px solid ${theme.player.border}`,
                      borderLeft: `3px solid ${theme.player.cyan}`,
                      padding: '20px 24px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = theme.player.cyan;
                      e.currentTarget.style.boxShadow = theme.player.glow;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = theme.player.border;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div>
                      <h3 style={{ 
                        color: theme.text.white, 
                        margin: '0 0 6px', 
                        fontSize: '18px',
                        fontWeight: '600'
                      }}>
                        {char.name}
                      </h3>
                      <p style={{ 
                        color: theme.player.cyan, 
                        margin: 0, 
                        fontSize: '13px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Level {char.level} {char.race} {char.character_class}
                      </p>
                    </div>
                    <ChevronRight size={24} style={{ color: theme.player.cyan }} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Campaigns - Tron Aries RED */}
        <div 
          id="gm-section"
          className="animate-fade-in-right"
          style={{ 
            background: theme.gm.subtle,
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '400px'
          }}
        >
          {/* Tron Light Trails - Red */}
          <TronBackground variant="red" intensity="subtle" showGrid={false} />
          
          {/* Glow effect */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '200px',
            background: theme.gm.gradient,
            pointerEvents: 'none'
          }} />
          
          {/* Vertical accent line */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '2px',
            height: '100%',
            background: `linear-gradient(180deg, ${theme.gm.primary}, transparent)`,
            boxShadow: theme.gm.glow
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '32px'
            }}>
              <div>
                <h2 style={{
                  fontWeight: '700',
                  fontSize: '14px',
                  color: theme.gm.primary,
                  margin: '0 0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontFamily: 'Cityworm, sans-serif',
                  letterSpacing: '2px'
                }}>
                  <Sword size={18} />
                  GM SIDE
                </h2>
                <h3 style={{
                  fontWeight: '700',
                  fontSize: '24px',
                  color: theme.text.white,
                  margin: 0
                }}>
                  My Campaigns
                </h3>
              </div>
              <Button
                onClick={() => navigate('/campaigns?create=true')}
                data-testid="new-campaign-btn"
                style={{
                  background: theme.gm.primary,
                  border: 'none',
                  color: '#fff',
                  padding: '12px 24px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: theme.gm.glow
                }}
              >
                <Plus size={18} />
                New Campaign
              </Button>
            </div>

            {/* Rook Guide for GM Section */}
            <RookGuide guideId="dashboard-gm" variant="card" />

            {/* Campaign List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {campaigns.length === 0 ? (
                <div style={{
                  background: theme.bg.card,
                  border: `1px solid ${theme.gm.border}`,
                  padding: '60px 40px',
                  textAlign: 'center'
                }}>
                  <Crown size={56} style={{ color: theme.gm.primary, marginBottom: '20px', opacity: 0.5 }} />
                  <h3 style={{ color: theme.text.white, margin: '0 0 8px', fontSize: '18px' }}>
                    No Campaigns Yet
                  </h3>
                  <p style={{ color: theme.text.muted, margin: '0 0 24px', fontSize: '14px' }}>
                    Create your first campaign to start GMing
                  </p>
                  <Button
                    onClick={() => navigate('/campaigns/new')}
                    style={{
                      background: theme.gm.primary,
                      border: 'none',
                      padding: '14px 28px',
                      color: '#fff',
                      fontWeight: '600'
                    }}
                  >
                    Create Campaign
                  </Button>
                </div>
              ) : (
                campaigns.map((campaign, index) => (
                  <div
                    key={campaign.id}
                    onClick={() => navigate(`/campaign/${campaign.id}`)}
                    data-testid={`campaign-${campaign.id}`}
                    className={`card-animated stagger-${Math.min(index + 1, 8)} hover-lift transition-smooth`}
                    style={{
                      background: theme.bg.card,
                      border: `1px solid ${theme.gm.border}`,
                      borderLeft: `3px solid ${theme.gm.primary}`,
                      padding: '20px 24px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = theme.gm.primary;
                      e.currentTarget.style.boxShadow = theme.gm.glow;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = theme.gm.border;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div>
                      <h3 style={{ 
                        color: theme.text.white, 
                        margin: '0 0 6px', 
                        fontSize: '18px',
                        fontWeight: '600'
                      }}>
                        {campaign.name}
                      </h3>
                      <div style={{ 
                        display: 'flex', 
                        gap: '16px',
                        color: theme.gm.primary, 
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
                    <ChevronRight size={24} style={{ color: theme.gm.primary }} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={() => setShowReviewModal(false)}
        >
          <div 
            style={{
              background: theme.bg.panel,
              border: `1px solid ${theme.border}`,
              padding: '32px',
              width: '100%',
              maxWidth: '420px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ 
              color: theme.text.white, 
              margin: '0 0 8px',
              fontWeight: '700',
              fontSize: '20px'
            }}>
              Leave a Review
            </h2>
            <p style={{ color: theme.text.muted, margin: '0 0 24px', fontSize: '14px' }}>
              How would you rate your experience?
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    transition: 'transform 0.1s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Star 
                    size={36} 
                    fill={star <= reviewRating ? '#F59E0B' : 'transparent'}
                    color={star <= reviewRating ? '#F59E0B' : theme.text.muted}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder="Tell us more about your experience (optional)"
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                background: theme.bg.dark,
                border: `1px solid ${theme.border}`,
                color: theme.text.white,
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
                  border: `1px solid ${theme.border}`,
                  color: theme.text.muted,
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
                  background: 'linear-gradient(135deg, #E11D48, #06B6D4)',
                  border: 'none',
                  color: '#fff',
                  padding: '12px',
                  fontWeight: '600'
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
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={() => setShowReferralModal(false)}
        >
          <div 
            style={{
              background: theme.bg.panel,
              border: `1px solid ${theme.border}`,
              padding: '32px',
              width: '100%',
              maxWidth: '420px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ 
              color: theme.text.white, 
              margin: '0 0 8px',
              fontWeight: '700',
              fontSize: '20px'
            }}>
              Your Referral Code
            </h2>
            <p style={{ color: theme.text.muted, margin: '0 0 24px', fontSize: '14px' }}>
              Share this link with friends to earn rewards
            </p>

            <div style={{
              background: theme.bg.dark,
              border: `1px solid ${theme.border}`,
              padding: '20px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <code style={{ 
                background: 'linear-gradient(90deg, #E11D48, #06B6D4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '18px',
                fontWeight: '700',
                letterSpacing: '2px'
              }}>
                {referralCode || 'Loading...'}
              </code>
            </div>

            <Button
              onClick={copyReferralCode}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #E11D48, #06B6D4)',
                border: 'none',
                color: '#fff',
                padding: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Link2 size={18} />
              Copy Referral Link
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UnifiedDashboard;
