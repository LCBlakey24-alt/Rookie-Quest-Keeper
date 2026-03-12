import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  User, Crown, Plus, ChevronRight, Star, Link2, Settings,
  Users, MapPin, LogOut, Shield, Sword, Trash2, Upload, BookOpen, FileJson
} from 'lucide-react';
import TronBackground from '@/components/TronBackground';
import { RookGuide } from '@/components/RookGuide';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

// Aether & Iron Theme
const theme = {
  bg: {
    primary: '#0B0F19',
    surface: '#111827',
    surfaceHover: '#1F2937'
  },
  gm: {
    primary: '#F59E0B',
    secondary: '#D97706',
    glow: 'rgba(245, 158, 11, 0.4)',
    subtle: 'rgba(245, 158, 11, 0.1)'
  },
  player: {
    primary: '#06B6D4',
    secondary: '#0891B2',
    glow: 'rgba(6, 182, 212, 0.4)',
    subtle: 'rgba(6, 182, 212, 0.1)'
  },
  text: {
    primary: '#F9FAFB',
    secondary: '#9CA3AF',
    muted: '#6B7280'
  },
  border: '#374151'
};

// Ember Particles Component
const EmberParticles = () => (
  <div className="ember-particles">
    {[...Array(15)].map((_, i) => (
      <div 
        key={i} 
        className={`ember ${i % 3 === 0 ? 'large' : i % 2 === 0 ? 'medium' : 'small'}`}
      />
    ))}
  </div>
);

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
  
  // Ruleset upload state
  const [showRulesetPanel, setShowRulesetPanel] = useState(false);
  const [uploadingRuleset, setUploadingRuleset] = useState(false);
  const [selectedEdition, setSelectedEdition] = useState('2014');
  const [contentSummary, setContentSummary] = useState(null);

  useEffect(() => {
    fetchAllData();
    fetchContentSummary();
  }, []);

  useEffect(() => {
    const adminUsers = ['rookiequestadmin', 'criticalfusion', 'admin', 'lcblakey24'];
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

  // Delete character handler
  const handleDeleteCharacter = async (e, charId, charName) => {
    e.stopPropagation(); // Prevent navigation
    if (!window.confirm(`Delete character "${charName}"? This cannot be undone.`)) return;
    
    try {
      await axios.delete(`${API}/characters/${charId}`);
      toast.success(`Character "${charName}" deleted`);
      setCharacters(prev => prev.filter(c => c.id !== charId));
    } catch (error) {
      toast.error('Failed to delete character');
    }
  };

  // Delete campaign handler
  const handleDeleteCampaign = async (e, campaignId, campaignName) => {
    e.stopPropagation(); // Prevent navigation
    if (!window.confirm(`Delete campaign "${campaignName}" and ALL its data (NPCs, locations, notes, etc.)? This cannot be undone.`)) return;
    
    try {
      await axios.delete(`${API}/campaigns/${campaignId}`);
      toast.success(`Campaign "${campaignName}" deleted`);
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    } catch (error) {
      toast.error('Failed to delete campaign');
    }
  };

  // Fetch user's content summary
  const fetchContentSummary = async () => {
    try {
      const response = await axios.get(`${API}/user/content/summary`);
      setContentSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch content summary');
    }
  };

  // Handle ruleset upload
  const handleRulesetUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
      toast.error('Please upload a JSON file');
      e.target.value = '';
      return;
    }
    
    setUploadingRuleset(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.ruleset_name) {
        toast.error('JSON must include "ruleset_name" field');
        return;
      }
      
      // Add edition to the upload
      data.edition = selectedEdition;
      
      const response = await axios.post(`${API}/user/content/upload`, data);
      
      // Build detailed success message
      const { summary, uploaded, skipped, edition } = response.data;
      const uploadedItems = [];
      if (uploaded.races?.length) uploadedItems.push(`${uploaded.races.length} races`);
      if (uploaded.classes?.length) uploadedItems.push(`${uploaded.classes.length} classes`);
      if (uploaded.subclasses?.length) uploadedItems.push(`${uploaded.subclasses.length} subclasses`);
      if (uploaded.backgrounds?.length) uploadedItems.push(`${uploaded.backgrounds.length} backgrounds`);
      if (uploaded.feats?.length) uploadedItems.push(`${uploaded.feats.length} feats`);
      
      toast.success(
        `✅ Uploaded to ${edition} Character Creator!`,
        { 
          description: uploadedItems.length > 0 
            ? `Added: ${uploadedItems.join(', ')}` 
            : 'Ruleset created (no new items)',
          duration: 6000 
        }
      );
      
      // Show skipped items if any
      if (skipped && Object.values(skipped).some(arr => arr?.length > 0)) {
        const skippedItems = [];
        Object.entries(skipped).forEach(([category, items]) => {
          if (items?.length) skippedItems.push(...items.map(name => `${name}`));
        });
        toast.info(
          `Skipped ${skippedItems.length} duplicate(s)`,
          { description: skippedItems.slice(0, 5).join(', ') + (skippedItems.length > 5 ? '...' : ''), duration: 5000 }
        );
      }
      
      fetchContentSummary();
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error('Invalid JSON format');
      } else {
        toast.error(error.response?.data?.detail || 'Failed to upload ruleset');
      }
    } finally {
      setUploadingRuleset(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: theme.bg.primary,
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
      background: theme.bg.primary,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Ember Background */}
      <div className="ember-bg" />
      <EmberParticles />
      
      {/* Header */}
      <header style={{
        background: 'rgba(11, 15, 25, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${theme.border}`,
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{
            fontWeight: '600',
            fontSize: '20px',
            color: theme.gm.primary,
            margin: 0,
            fontFamily: "'Montserrat', sans-serif",
            letterSpacing: '0.1em'
          }}>
            ROOKIE QUEST KEEPER
          </h1>
          <span style={{ 
            color: theme.text.muted, 
            fontSize: '13px',
            borderLeft: `1px solid ${theme.border}`,
            paddingLeft: '16px'
          }}>
            Welcome, <span style={{ color: theme.text.primary }}>{username}</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isAdmin && (
            <Button
              onClick={() => navigate('/admin')}
              data-testid="admin-btn"
              style={{
                background: theme.bg.surfaceHover,
                border: `1px solid ${theme.border}`,
                color: theme.text.primary,
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '400'
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

          {/* Upload JSON Button */}
          <label
            data-testid="upload-json-btn"
            style={{
              background: 'linear-gradient(135deg, #10B981, #059669)',
              border: 'none',
              color: '#fff',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '8px',
              fontWeight: '400',
              fontSize: '14px',
              cursor: uploadingRuleset ? 'not-allowed' : 'pointer',
              opacity: uploadingRuleset ? 0.6 : 1
            }}
          >
            <Upload size={16} />
            {uploadingRuleset ? 'Uploading...' : 'Upload JSON'}
            <input
              type="file"
              accept=".json"
              onChange={handleRulesetUpload}
              disabled={uploadingRuleset}
              style={{ display: 'none' }}
            />
          </label>

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
          background: theme.bg.surface,
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
            fontWeight: '400',
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
            fontWeight: '400',
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
            background: `linear-gradient(180deg, ${theme.player.primary}, transparent)`,
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
                  fontWeight: '400',
                  fontSize: '14px',
                  color: theme.player.primary,
                  margin: '0 0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontFamily: "'Montserrat', sans-serif",
                  letterSpacing: '0.1em'
                }}>
                  <User size={18} />
                  PLAYER SIDE
                </h2>
                <h3 style={{
                  fontWeight: '500',
                  fontSize: '24px',
                  color: theme.text.primary,
                  margin: 0,
                  fontFamily: "'Montserrat', sans-serif",
                  letterSpacing: '0.03em'
                }}>
                  My Characters
                </h3>
              </div>
              <Button
                onClick={() => navigate('/characters/new')}
                data-testid="new-character-btn"
                style={{
                  background: `linear-gradient(135deg, ${theme.player.primary}, ${theme.player.primary})`,
                  border: 'none',
                  color: '#fff',
                  padding: '12px 24px',
                  fontWeight: '500',
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
                  background: theme.bg.surface,
                  border: `1px solid ${theme.player.border}`,
                  padding: '60px 40px',
                  textAlign: 'center'
                }}>
                  <User size={56} style={{ color: theme.player.primary, marginBottom: '20px', opacity: 0.5 }} />
                  <h3 style={{ color: theme.text.primary, margin: '0 0 8px', fontSize: '18px' }}>
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
                      fontWeight: '400'
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
                    className="card-hover-player"
                    style={{
                      background: theme.bg.surface,
                      border: `1px solid ${theme.border}`,
                      borderLeft: `3px solid ${theme.player.primary}`,
                      borderRadius: '8px',
                      padding: '20px 24px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <h3 style={{ 
                        color: theme.text.primary, 
                        margin: '0 0 6px', 
                        fontSize: '18px',
                        fontWeight: '600',
                        fontFamily: "'Montserrat', sans-serif"
                      }}>
                        {char.name}
                      </h3>
                      <p style={{ 
                        color: theme.player.primary, 
                        margin: 0, 
                        fontSize: '13px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Level {char.level} {char.race} {char.character_class}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        onClick={(e) => handleDeleteCharacter(e, char.id, char.name)}
                        data-testid={`delete-character-${char.id}`}
                        title="Delete character"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: theme.text.muted,
                          cursor: 'pointer',
                          padding: '8px',
                          borderRadius: '4px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#E05C3D';
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = theme.text.muted;
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                      <ChevronRight size={24} style={{ color: theme.player.primary }} />
                    </div>
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
                  fontWeight: '400',
                  fontSize: '14px',
                  color: theme.gm.primary,
                  margin: '0 0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontFamily: "'Montserrat', sans-serif",
                  letterSpacing: '0.1em'
                }}>
                  <Sword size={18} />
                  GM SIDE
                </h2>
                <h3 style={{
                  fontWeight: '500',
                  fontSize: '24px',
                  color: theme.text.primary,
                  margin: 0,
                  fontFamily: "'Montserrat', sans-serif",
                  letterSpacing: '0.03em'
                }}>
                  My Campaigns
                </h3>
              </div>
              <Button
                onClick={() => navigate('/campaigns?create=true')}
                data-testid="new-campaign-btn"
                style={{
                  background: `linear-gradient(135deg, ${theme.gm.primary}, ${theme.gm.hover})`,
                  border: 'none',
                  color: '#0B1530',
                  padding: '12px 24px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)'
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
                  background: theme.bg.surface,
                  border: `1px solid ${theme.gm.border}`,
                  padding: '60px 40px',
                  textAlign: 'center'
                }}>
                  <Crown size={56} style={{ color: theme.gm.primary, marginBottom: '20px', opacity: 0.5 }} />
                  <h3 style={{ color: theme.text.primary, margin: '0 0 8px', fontSize: '18px', fontFamily: "'Montserrat', sans-serif" }}>
                    No Campaigns Yet
                  </h3>
                  <p style={{ color: theme.text.muted, margin: '0 0 24px', fontSize: '14px' }}>
                    Create your first campaign to start GMing
                  </p>
                  <Button
                    onClick={() => navigate('/campaigns/new')}
                    style={{
                      background: `linear-gradient(135deg, ${theme.gm.primary}, ${theme.gm.hover})`,
                      border: 'none',
                      padding: '14px 28px',
                      color: '#0B1530',
                      fontWeight: '500',
                      boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)'
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
                    className="card-hover-gm"
                    style={{
                      background: theme.bg.surface,
                      border: `1px solid ${theme.border}`,
                      borderLeft: `3px solid ${theme.gm.primary}`,
                      borderRadius: '8px',
                      padding: '20px 24px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <h3 style={{ 
                        color: theme.text.primary, 
                        margin: '0 0 6px', 
                        fontSize: '18px',
                        fontWeight: '600',
                        fontFamily: "'Montserrat', sans-serif"
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        onClick={(e) => handleDeleteCampaign(e, campaign.id, campaign.name)}
                        data-testid={`delete-campaign-${campaign.id}`}
                        title="Delete campaign"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: theme.text.muted,
                          cursor: 'pointer',
                          padding: '8px',
                          borderRadius: '4px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#E05C3D';
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = theme.text.muted;
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                      <ChevronRight size={24} style={{ color: theme.gm.primary }} />
                    </div>
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
              background: theme.bg.surface,
              border: `1px solid ${theme.border}`,
              padding: '32px',
              width: '100%',
              maxWidth: '420px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ 
              color: theme.text.primary, 
              margin: '0 0 8px',
              fontWeight: '400',
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
                background: theme.bg.surface,
                border: `1px solid ${theme.border}`,
                color: theme.text.primary,
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
                  background: 'linear-gradient(135deg, #C54B2C, #F2A541)',
                  border: 'none',
                  color: '#fff',
                  padding: '12px',
                  fontWeight: '400'
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
              background: theme.bg.surface,
              border: `1px solid ${theme.border}`,
              padding: '32px',
              width: '100%',
              maxWidth: '420px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ 
              color: theme.text.primary, 
              margin: '0 0 8px',
              fontWeight: '400',
              fontSize: '20px'
            }}>
              Your Referral Code
            </h2>
            <p style={{ color: theme.text.muted, margin: '0 0 24px', fontSize: '14px' }}>
              Share this link with friends to earn rewards
            </p>

            <div style={{
              background: theme.bg.surface,
              border: `1px solid ${theme.border}`,
              padding: '20px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <code style={{ 
                background: 'linear-gradient(90deg, #C54B2C, #F2A541)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '18px',
                fontWeight: '400',
                letterSpacing: '2px'
              }}>
                {referralCode || 'Loading...'}
              </code>
            </div>

            <Button
              onClick={copyReferralCode}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #C54B2C, #F2A541)',
                border: 'none',
                color: '#fff',
                padding: '14px',
                fontWeight: '400',
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
