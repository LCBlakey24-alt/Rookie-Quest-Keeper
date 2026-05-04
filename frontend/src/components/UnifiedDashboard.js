import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  User, Crown, Plus, ChevronRight, Star, Link2, Settings,
  Users, MapPin, LogOut, Shield, Sword, Trash2, Upload, BookOpen, FileJson, Sparkles
} from 'lucide-react';
import TronBackground from '@/components/TronBackground';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Block A design reset — dark navy + gold outline, flat (no gradients)
const theme = {
  bg: {
    primary: '#0A1628',
    surface: '#0F2440',
    surfaceHover: '#14304F',
    card: '#0F2440',
    hover: 'rgba(212, 160, 23, 0.08)'
  },
  sunset: {
    purple: '#D4A017',
    pink: '#D4A017'
  },
  gm: {
    primary: '#D4A017',
    secondary: '#D4A017',
    hover: '#F5C542',
    glow: 'transparent',
    subtle: 'rgba(212, 160, 23, 0.08)',
    border: 'rgba(212, 160, 23, 0.35)'
  },
  player: {
    primary: '#D4A017',
    secondary: '#F5C542',
    glow: 'transparent',
    subtle: 'rgba(212, 160, 23, 0.08)',
    border: 'rgba(212, 160, 23, 0.35)'
  },
  accent: {
    pink: '#D4A017',
    pinkGlow: 'transparent'
  },
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    muted: '#64748B'
  },
  border: 'rgba(212, 160, 23, 0.35)',
  gradient: '#D4A017'
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
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [characterSearch, setCharacterSearch] = useState('');
  const [campaignSearch, setCampaignSearch] = useState('');
  const [characterSort, setCharacterSort] = useState(() => localStorage.getItem('rq.charSort') || 'recent');
  const [campaignSort, setCampaignSort] = useState(() => localStorage.getItem('rq.campSort') || 'recent');
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Campaign creation modal state
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignDesc, setNewCampaignDesc] = useState('');
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  
  // Ruleset upload state
  const [showRulesetPanel, setShowRulesetPanel] = useState(false);
  const [uploadingRuleset, setUploadingRuleset] = useState(false);
  const [selectedEdition, setSelectedEdition] = useState('2014');
  const [contentSummary, setContentSummary] = useState(null);
  
  // Subscription state for tier limits
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);

  useEffect(() => {
    fetchAllData();
    fetchContentSummary();
    fetchSubscriptionInfo();
  }, []);

  // Fetch subscription info
  const fetchSubscriptionInfo = async () => {
    try {
      const response = await axios.get(`${API}/subscription/status`);
      setSubscriptionInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch subscription info:', error);
    }
  };

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

  // Create campaign handler
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!newCampaignName.trim()) {
      toast.error('Campaign name is required');
      return;
    }

    setCreatingCampaign(true);
    try {
      const response = await axios.post(`${API}/campaigns`, {
        name: newCampaignName.trim(),
        description: newCampaignDesc.trim()
      });
      toast.success('Campaign created successfully!');
      setCampaigns(prev => [...prev, response.data]);
      setNewCampaignName('');
      setNewCampaignDesc('');
      setShowCreateCampaignModal(false);
      // Navigate to the new campaign
      navigate(`/campaign/${response.data.id}`);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (typeof detail === 'object' && detail?.error === 'campaign_limit_reached') {
        toast.error(detail.message || 'Campaign limit reached. Please upgrade your subscription.');
      } else {
        toast.error(typeof detail === 'string' ? detail : 'Failed to create campaign');
      }
    } finally {
      setCreatingCampaign(false);
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

  // Persist sort preferences
  useEffect(() => { localStorage.setItem('rq.charSort', characterSort); }, [characterSort]);
  useEffect(() => { localStorage.setItem('rq.campSort', campaignSort); }, [campaignSort]);

  // Search + sort pipeline for characters
  const displayCharacters = useMemo(() => {
    const q = characterSearch.toLowerCase();
    const filtered = !q ? [...characters] : characters.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.character_class || '').toLowerCase().includes(q) ||
      (c.race || '').toLowerCase().includes(q)
    );
    const byRecent = (a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
    if (characterSort === 'name') filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (characterSort === 'level') filtered.sort((a, b) => (Number(b.level) || 0) - (Number(a.level) || 0));
    else if (characterSort === 'class') filtered.sort((a, b) => (a.character_class || '').localeCompare(b.character_class || ''));
    else filtered.sort(byRecent);
    return filtered;
  }, [characters, characterSearch, characterSort]);

  // Search + sort pipeline for campaigns
  const displayCampaigns = useMemo(() => {
    const q = campaignSearch.toLowerCase();
    const filtered = !q ? [...campaigns] : campaigns.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.setting || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    );
    const byRecent = (a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
    if (campaignSort === 'name') filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (campaignSort === 'edition') filtered.sort((a, b) => String(b.rules_edition || '2024').localeCompare(String(a.rules_edition || '2024')));
    else filtered.sort(byRecent);
    return filtered;
  }, [campaigns, campaignSearch, campaignSort]);

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
      
      {/* Header */}
      <header style={{
        background: 'rgba(15, 36, 64, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${theme.border}`,
        padding: '10px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        zIndex: 10,
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div className="mobile-stack" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="/images/logo-mini.png" 
            alt="ROOK" 
            className="icon-float"
            style={{ height: '40px', width: 'auto', filter: 'drop-shadow(0 0 12px rgba(212, 160, 23, 0.5))' }}
          />
          <h1 className="mobile-hide" style={{
            fontWeight: '800',
            fontSize: '22px',
            background: theme.gradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            fontFamily: "'Montserrat', sans-serif",
            letterSpacing: 0
          }}>
            ROOKIE QUEST KEEPER
          </h1>
          <span className="mobile-hide" style={{ 
            color: theme.text.muted, 
            fontSize: '13px',
            borderLeft: `1px solid ${theme.border}`,
            paddingLeft: '16px'
          }}>
            Welcome, <span style={{ color: theme.text.primary }}>{username}</span>
          </span>
        </div>

        <div className="dashboard-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
                fontWeight: '800'
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
              background: 'linear-gradient(135deg, #D4A017, #A87912)',
              border: 'none',
              color: '#0A1628',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '8px',
              fontWeight: '800',
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
            data-testid="logout-button"
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

      {/* Mobile/tablet player hub strip */}
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
          @media (max-width: 1024px) {
            #mobile-nav-toggle { display: flex !important; }
            #player-section { display: block !important; }
            #gm-section { display: none !important; }
          }
          @media (max-width: 720px) {
            .dashboard-actions [data-testid="review-btn"],
            .dashboard-actions [data-testid="upload-json-btn"],
            .dashboard-actions [data-testid="referral-btn"],
            .dashboard-actions [data-testid="admin-btn"] {
              display: none !important;
            }
            .dashboard-actions {
              gap: 4px !important;
            }
            header {
              padding: 10px 12px !important;
            }
          }
          @media (max-width: 520px) {
            #player-section {
              padding: 14px !important;
            }
          }
        `}</style>
        <div style={{
          width: '100%',
          padding: '10px 12px',
          background: 'rgba(212, 160, 23, 0.12)',
          border: `1px solid ${theme.border}`,
          borderRadius: 8,
          color: theme.player.primary,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
          <Sword size={15} />
          Player Hub
        </div>
      </div>

      {/* Main Content - Split Design */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        minHeight: 'calc(100vh - 70px)',
        gap: '0'
      }}>
        {/* LEFT: Characters - Player Section */}
        <div 
          id="player-section"
          className="animate-fade-in-left"
          style={{ 
            background: 'rgba(15, 36, 64, 0.72)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRight: `1px solid ${theme.border}`,
            padding: '18px',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '400px'
          }}
        >
          {/* Player section now OPEN */}
          
          {/* Glow effect at top */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '150px',
            background: 'linear-gradient(180deg, rgba(212, 160, 23, 0.15) 0%, transparent 100%)',
            pointerEvents: 'none'
          }} />
          
          {/* Vertical accent line */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '3px',
            height: '100%',
            background: `linear-gradient(180deg, ${theme.player.primary}, ${theme.player.secondary}, transparent)`,
            boxShadow: `0 0 20px ${theme.player.glow}`
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
                  marginBottom: '18px'
            }}>
              <div>
                <h2 style={{
                  fontWeight: '800',
                  fontSize: '12px',
                  color: theme.player.primary,
                  margin: '0 0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontFamily: "'Montserrat', sans-serif",
                  letterSpacing: 0,
                  textTransform: 'uppercase'
                }}>
                  <User size={18} />
                  PLAYER SIDE
                </h2>
                <h3 style={{
                  fontWeight: '800',
                  fontSize: '24px',
                  color: theme.text.primary,
                  margin: 0,
                  fontFamily: "'Montserrat', sans-serif",
                  letterSpacing: 0
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
                  color: '#0A1628',
                  padding: '9px 16px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: theme.player.glow
                }}
              >
                <Plus size={18} />
                New Character
              </Button>
              <Button
                onClick={() => navigate('/homebrew')}
                data-testid="homebrew-workshop-btn"
                style={{
                  background: 'transparent',
                  border: '1px solid #D4A017',
                  color: '#D4A017',
                  padding: '9px 14px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginLeft: 8,
                  letterSpacing: 0.5
                }}
              >
                <Sparkles size={16} />
                Homebrew Workshop
              </Button>
            </div>

            {/* Character List */}
            {characters.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <input
                  data-testid="character-search-input"
                  type="text"
                  placeholder="Search characters by name, class, or race…"
                  value={characterSearch}
                  onChange={e => setCharacterSearch(e.target.value)}
                  style={{
                    flex: 1, minWidth: 220,
                    background: theme.bg.surface, color: theme.text.primary,
                    border: `1px solid ${theme.border}`, borderRadius: 8,
                    padding: '8px 12px', fontSize: 12, outline: 'none',
                  }}
                />
                <select
                  data-testid="character-sort"
                  value={characterSort}
                  onChange={e => setCharacterSort(e.target.value)}
                  style={{
                    minWidth: 150,
                    background: theme.bg.surface, color: theme.text.primary,
                    border: `1px solid ${theme.border}`, borderRadius: 8,
                    padding: '8px 12px', fontSize: 12, outline: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="recent">Sort: Recent</option>
                  <option value="name">Sort: Name (A-Z)</option>
                  <option value="level">Sort: Level (High→Low)</option>
                  <option value="class">Sort: Class (A-Z)</option>
                </select>
              </div>
            )}
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
                      color: '#0A1628',
                      fontWeight: '800'
                    }}
                  >
                    Create Character
                  </Button>
                </div>
              ) : (
                displayCharacters.map((char, index) => (
                  <div
                    key={char.id}
                    onClick={() => navigate(`/characters/${char.id}`)}
                    data-testid={`character-${char.id}`}
                    className="card-hover"
                    style={{
                      background: 'rgba(15, 36, 64, 0.92)',
                      border: `1px solid ${theme.border}`,
                      borderLeft: `3px solid ${theme.player.primary}`,
                      borderRadius: '8px',
                      padding: '14px 18px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                    }}
                  >
                    <div>
                      <h3 style={{ 
                        color: theme.text.primary, 
                        margin: '0 0 6px', 
                        fontSize: '18px',
                        fontWeight: '800',
                        fontFamily: "'Montserrat', sans-serif"
                      }}>
                        {char.name}
                      </h3>
                      <p style={{ 
                        color: theme.player.primary, 
                        margin: 0, 
                        fontSize: '13px',
                        textTransform: 'uppercase',
                        letterSpacing: 0
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

        {/* RIGHT: Campaigns - GM Section */}
        <div 
          id="gm-section"
          className="animate-fade-in-right"
          style={{ 
            background: 'rgba(15, 36, 64, 0.72)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '18px',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '400px'
          }}
        >
          {/* Glow effect at top */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '150px',
            background: 'linear-gradient(180deg, rgba(212, 160, 23, 0.15) 0%, transparent 100%)',
            pointerEvents: 'none'
          }} />
          
          {/* Vertical accent line */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '3px',
            height: '100%',
            background: `linear-gradient(180deg, ${theme.gm.primary}, ${theme.accent.pink}, transparent)`,
            boxShadow: `0 0 20px ${theme.gm.glow}`
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '18px'
            }}>
              <div>
                <h2 style={{
                  fontWeight: '800',
                  fontSize: '12px',
                  color: theme.gm.primary,
                  margin: '0 0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontFamily: "'Montserrat', sans-serif",
                  letterSpacing: 0,
                  textTransform: 'uppercase'
                }}>
                  <Sword size={18} />
                  GM SIDE
                </h2>
                <h3 style={{
                  fontWeight: '800',
                  fontSize: '26px',
                  color: theme.text.primary,
                  margin: 0,
                  fontFamily: "'Montserrat', sans-serif",
                  letterSpacing: 0
                }}>
                  My Campaigns
                </h3>
                {/* Subscription tier badge */}
                {subscriptionInfo && (
                  <span style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    background: 'rgba(212, 160, 23, 0.15)',
                    color: theme.gm.primary,
                    fontWeight: '800',
                    marginTop: '4px'
                  }}>
                    {subscriptionInfo.campaigns_limit === -1 
                      ? `${subscriptionInfo.tier_name} · Unlimited` 
                      : `${subscriptionInfo.tier_name} · ${campaigns.length}/${subscriptionInfo.campaigns_limit} campaigns`}
                  </span>
                )}
              </div>
              <Button
                onClick={() => {
                  // Check campaign limit before showing modal
                  const limit = subscriptionInfo?.campaigns_limit ?? 0;
                  const currentCount = campaigns.length;
                  if (limit !== -1 && currentCount >= limit) {
                    toast.error(
                      `Your ${subscriptionInfo?.tier_name || 'Free'} plan allows ${limit} campaign(s). Upgrade to Quest Master or Legendary for unlimited campaigns!`,
                      { duration: 5000 }
                    );
                    navigate('/pricing');
                    return;
                  }
                  setShowCreateCampaignModal(true);
                }}
                data-testid="new-campaign-btn"
                style={{
                  background: `linear-gradient(135deg, ${theme.gm.primary}, ${theme.gm.hover})`,
                  border: 'none',
                  color: '#0A1628',
                  padding: '9px 16px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: `0 4px 15px ${theme.gm.glow}`
                }}
              >
                <Plus size={18} />
                New Campaign
              </Button>
            </div>

            {/* Campaign List */}
            {campaigns.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <input
                  data-testid="campaign-search-input"
                  type="text"
                  placeholder="Search campaigns by name, setting, or description…"
                  value={campaignSearch}
                  onChange={e => setCampaignSearch(e.target.value)}
                  style={{
                    flex: 1, minWidth: 220,
                    background: theme.bg.surface, color: theme.text.primary,
                    border: `1px solid ${theme.border}`, borderRadius: 8,
                    padding: '8px 12px', fontSize: 12, outline: 'none',
                  }}
                />
                <select
                  data-testid="campaign-sort"
                  value={campaignSort}
                  onChange={e => setCampaignSort(e.target.value)}
                  style={{
                    minWidth: 150,
                    background: theme.bg.surface, color: theme.text.primary,
                    border: `1px solid ${theme.border}`, borderRadius: 8,
                    padding: '8px 12px', fontSize: 12, outline: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="recent">Sort: Recent</option>
                  <option value="name">Sort: Name (A-Z)</option>
                  <option value="edition">Sort: Edition (2024→2014)</option>
                </select>
              </div>
            )}
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
                  {subscriptionInfo && subscriptionInfo.campaigns_limit === 0 ? (
                    <>
                      <p style={{ color: theme.text.muted, margin: '0 0 24px', fontSize: '14px' }}>
                        Your {subscriptionInfo.tier_name} plan is for players. Upgrade to Quest Master or Legendary to create campaigns.
                      </p>
                      <Button
                        onClick={() => navigate('/pricing')}
                        style={{
                          background: `linear-gradient(135deg, ${theme.gm.primary}, ${theme.gm.hover})`,
                          border: 'none',
                          padding: '14px 28px',
                          color: '#0A1628',
                          fontWeight: '800',
                          boxShadow: `0 4px 15px ${theme.gm.glow}`
                        }}
                      >
                        Upgrade to GM
                      </Button>
                    </>
                  ) : (
                    <>
                      <p style={{ color: theme.text.muted, margin: '0 0 24px', fontSize: '14px' }}>
                        Create your first campaign to start GMing
                      </p>
                      <Button
                        onClick={() => setShowCreateCampaignModal(true)}
                        style={{
                          background: `linear-gradient(135deg, ${theme.gm.primary}, ${theme.gm.hover})`,
                          border: 'none',
                          padding: '14px 28px',
                          color: '#0A1628',
                          fontWeight: '800',
                          boxShadow: `0 4px 15px ${theme.gm.glow}`
                        }}
                      >
                        Create Campaign
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                displayCampaigns.map((campaign, index) => (
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
                      padding: '14px 18px',
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
                        fontWeight: '800',
                        fontFamily: "'Montserrat', sans-serif"
                      }}>
                        {campaign.name}
                      </h3>
                      <div style={{ 
                        display: 'flex', 
                        gap: '16px',
                        color: theme.gm.primary, 
                        fontSize: '13px',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={12} /> {campaign.player_count || 0} players
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} /> {campaign.setting || 'Fantasy'}
                        </span>
                        {/* Rules edition pill */}
                        <span data-testid={`campaign-edition-${campaign.id}`} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          padding: '2px 8px', borderRadius: 10,
                          fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                          background: 'rgba(212, 160, 23, 0.15)',
                          border: '1px solid rgba(212, 160, 23, 0.4)',
                          color: '#D4A017',
                        }}>
                          {(campaign.rules_edition === '2014' ? '2014' : '2024')} RULES
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
              fontWeight: '800',
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
                    fill={star <= reviewRating ? theme.gm.primary : 'transparent'}
                    color={star <= reviewRating ? theme.gm.primary : theme.text.muted}
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
                  background: `linear-gradient(135deg, ${theme.gm.primary}, ${theme.gm.hover})`,
                  border: 'none',
                  color: '#0A1628',
                  padding: '12px',
                  fontWeight: '800'
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
              fontWeight: '800',
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
                background: `linear-gradient(90deg, ${theme.gm.primary}, ${theme.player.primary})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '18px',
                fontWeight: '800',
                letterSpacing: 0
              }}>
                {referralCode || 'Loading...'}
              </code>
            </div>

            <Button
              onClick={copyReferralCode}
              style={{
                width: '100%',
                background: `linear-gradient(135deg, ${theme.gm.primary}, ${theme.gm.hover})`,
                border: 'none',
                color: '#0A1628',
                padding: '14px',
                fontWeight: '800',
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

      {/* Create Campaign Modal */}
      {showCreateCampaignModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowCreateCampaignModal(false)}
        >
          <div
            style={{
              background: theme.bg.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '16px',
              padding: '32px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ 
              fontFamily: "'Montserrat', sans-serif",
              color: theme.gm.primary, 
              margin: '0 0 8px',
              fontSize: '24px',
              fontWeight: '800'
            }}>
              Create New Campaign
            </h2>
            <p style={{ color: theme.text.muted, margin: '0 0 24px', fontSize: '15px' }}>
              Start your new adventure
            </p>

            <form onSubmit={handleCreateCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: theme.text.secondary, fontSize: '14px', marginBottom: '8px' }}>
                  Campaign Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter campaign name"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: `1px solid ${theme.border}`,
                    background: 'rgba(10, 22, 40, 0.62)',
                    color: theme.text.primary,
                    fontSize: '15px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', color: theme.text.secondary, fontSize: '14px', marginBottom: '8px' }}>
                  Description (optional)
                </label>
                <textarea
                  placeholder="Describe your campaign..."
                  value={newCampaignDesc}
                  onChange={(e) => setNewCampaignDesc(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: `1px solid ${theme.border}`,
                    background: 'rgba(10, 22, 40, 0.62)',
                    color: theme.text.primary,
                    fontSize: '15px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <Button
                  type="submit"
                  disabled={creatingCampaign}
                  style={{
                    flex: 1,
                    background: theme.gradient,
                    border: 'none',
                    padding: '14px',
                    borderRadius: '10px',
                    color: '#0A1628',
                    fontWeight: '800',
                    fontSize: '15px'
                  }}
                >
                  {creatingCampaign ? 'Creating...' : 'Create Campaign'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowCreateCampaignModal(false)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: `1px solid ${theme.border}`,
                    padding: '14px',
                    borderRadius: '10px',
                    color: theme.text.secondary,
                    fontWeight: '800',
                    fontSize: '15px'
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UnifiedDashboard;
