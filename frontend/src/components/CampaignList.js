import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Scroll, Plus, LogOut, Trash2, Settings, Crown, Sparkles, Shield, Star, User } from 'lucide-react';
import QuickTips, { TIPS } from '@/components/QuickTips';
import ReviewModal from '@/components/ReviewModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Dark Minimalist Theme - NEW #E11D48
const theme = {
  bg: {
    black: '#0D0D0D',
    dark: '#141414',
    panel: '#1A1A1A',
    card: '#1F1F1F',
    hover: '#2A2A2A',
    elevated: '#333333'
  },
  accent: {
    red: '#E11D48',
    redHover: '#F43F5E',
    redSubtle: 'rgba(225, 29, 72, 0.15)'
  },
  text: {
    white: '#FFFFFF',
    secondary: '#B3B3B3',
    muted: '#808080'
  },
  border: 'rgba(255, 255, 255, 0.1)'
};

function CampaignList({ username, onLogout }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', description: '', system: '5e 2024 Compatible' });
  const [subscription, setSubscription] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const ttrpgSystems = [
    '5e 2024 Compatible',
    '5e 2014 Compatible',
    'Pathfinder 2e',
    'Pathfinder 1e',
    'Call of Cthulhu 7e',
    'Vampire: The Masquerade 5e',
    'Shadowrun 6e',
    'Star Wars FFG',
    'Fate Core',
    'Savage Worlds',
    'Dungeon World',
    'Blades in the Dark',
    'Other/Custom'
  ];

  useEffect(() => {
    fetchCampaigns();
    fetchSubscription();
    checkAdminStatus();
    
    if (searchParams.get('create') === 'true') {
      setShowCreateDialog(true);
      setSearchParams({});
    }
  }, []);

  const checkAdminStatus = async () => {
    try {
      const response = await axios.get(`${API}/admin/check`);
      setIsAdmin(response.data.is_admin);
    } catch (error) {
      setIsAdmin(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await axios.get(`${API}/subscription/status`);
      setSubscription(response.data);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API}/campaigns`);
      setCampaigns(response.data);
    } catch (error) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!newCampaign.name) {
      toast.error('Campaign name is required');
      return;
    }

    // Check tier-based campaign limits
    const tier = subscription?.tier || 'free';
    const canCreate = tier === 'gm' || tier === 'legendary';
    
    if (!canCreate) {
      toast.error('Creating campaigns requires Quest Master or Legendary tier. Upgrade to unlock this feature!');
      navigate('/pricing');
      return;
    }

    try {
      const response = await axios.post(`${API}/campaigns`, newCampaign);
      toast.success('Campaign created!');
      setCampaigns([...campaigns, response.data]);
      setNewCampaign({ name: '', description: '', system: '5e 2024 Compatible' });
      setShowCreateDialog(false);
    } catch (error) {
      toast.error('Failed to create campaign');
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign? This will delete all associated data.')) return;

    try {
      await axios.delete(`${API}/campaigns/${campaignId}`);
      toast.success('Campaign deleted');
      setCampaigns(campaigns.filter(c => c.id !== campaignId));
    } catch (error) {
      toast.error('Failed to delete campaign');
    }
  };

  const handleManageCampaign = (campaignId) => {
    navigate(`/campaign/${campaignId}`);
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
      background: theme.bg.black,
      padding: '32px 20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '40px', 
          flexWrap: 'wrap', 
          gap: '20px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h1 style={{ 
              fontSize: '28px', 
              color: theme.text.white, 
              fontWeight: '700',
              letterSpacing: '2px'
            }}>
              ROOKIE QUEST<br />
              <span style={{ fontSize: '22px', color: theme.text.muted }}>KEEPER</span>
            </h1>
            <div style={{ width: '1px', height: '50px', background: theme.border }} />
            <div>
              <h2 style={{ 
                fontSize: '24px', 
                color: theme.text.white, 
                marginBottom: '4px',
                fontWeight: '700'
              }}>
                Your Campaigns
              </h2>
              <p style={{ color: theme.accent.red, fontSize: '14px' }}>Welcome back, {username}!</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Subscription Badge */}
            <Button
              data-testid="pricing-btn"
              onClick={() => navigate('/pricing')}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: subscription?.is_premium ? '#22c55e' : 'transparent',
                border: subscription?.is_premium ? 'none' : `1px solid ${theme.border}`,
                color: subscription?.is_premium ? theme.text.white : theme.text.secondary,
                padding: '10px 16px'
              }}
            >
              {subscription?.is_premium ? (
                <>
                  <Crown size={18} />
                  Adventurer
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Upgrade
                </>
              )}
            </Button>
            
            {/* Admin Button */}
            {isAdmin && (
              <Button
                data-testid="admin-btn"
                onClick={() => navigate('/admin')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  background: 'transparent',
                  border: `1px solid ${theme.accent.red}`,
                  color: theme.accent.red,
                  padding: '10px 16px'
                }}
              >
                <Shield size={18} />
                Admin
              </Button>
            )}
            
            {/* Review Button */}
            <Button
              data-testid="review-btn"
              onClick={() => setShowReviewModal(true)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: 'transparent',
                border: `1px solid #F59E0B`,
                color: '#F59E0B',
                padding: '10px 16px'
              }}
            >
              <Star size={18} />
              Leave Review
            </Button>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button 
                  data-testid="create-campaign-btn" 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    background: theme.accent.red,
                    border: 'none',
                    color: theme.text.white,
                    padding: '10px 20px',
                    fontWeight: '600'
                  }}
                >
                  <Plus size={20} />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent style={{
                background: theme.bg.panel,
                border: `1px solid ${theme.border}`,
                padding: '28px',
                maxWidth: '500px'
              }}>
                <DialogHeader>
                  <DialogTitle style={{ 
                    fontSize: '24px', 
                    color: theme.text.white,
                    fontWeight: '700'
                  }}>
                    Create New Campaign
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateCampaign} style={{ marginTop: '24px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '10px', 
                      color: theme.text.white, 
                      fontSize: '12px', 
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}>
                      Campaign Name
                    </label>
                    <Input
                      data-testid="campaign-name-input"
                      type="text"
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                      placeholder="Enter campaign name"
                      style={{
                        background: theme.bg.dark,
                        border: `1px solid ${theme.border}`,
                        color: theme.text.white,
                        padding: '12px'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '10px', 
                      color: theme.text.white, 
                      fontSize: '12px', 
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}>
                      TTRPG System
                    </label>
                    <select
                      data-testid="campaign-system-select"
                      value={newCampaign.system}
                      onChange={(e) => setNewCampaign({ ...newCampaign, system: e.target.value })}
                      style={{
                        width: '100%',
                        background: theme.bg.dark,
                        border: `1px solid ${theme.border}`,
                        color: theme.text.white,
                        padding: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {ttrpgSystems.map(system => (
                        <option key={system} value={system}>{system}</option>
                      ))}
                    </select>
                    <p style={{ fontSize: '12px', color: theme.accent.red, marginTop: '8px' }}>
                      AI will tailor content to your chosen system
                    </p>
                  </div>
                  <div style={{ marginBottom: '28px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '10px', 
                      color: theme.text.white, 
                      fontSize: '12px', 
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}>
                      Description
                    </label>
                    <textarea
                      data-testid="campaign-description-input"
                      value={newCampaign.description}
                      onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                      placeholder="Describe your campaign..."
                      style={{ 
                        width: '100%',
                        minHeight: '100px',
                        maxHeight: '120px',
                        resize: 'vertical',
                        background: theme.bg.dark,
                        border: `1px solid ${theme.border}`,
                        color: theme.text.white,
                        padding: '12px'
                      }}
                    />
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    justifyContent: 'flex-end',
                    paddingTop: '16px',
                    borderTop: `1px solid ${theme.border}`
                  }}>
                    <Button 
                      type="button" 
                      onClick={() => setShowCreateDialog(false)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${theme.border}`,
                        color: theme.text.secondary,
                        padding: '10px 20px'
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      data-testid="create-campaign-submit-btn" 
                      type="submit"
                      style={{
                        background: theme.accent.red,
                        border: 'none',
                        color: theme.text.white,
                        padding: '10px 20px',
                        fontWeight: '600'
                      }}
                    >
                      Create Campaign
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Button 
              onClick={() => navigate('/characters')} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: 'transparent',
                border: `1px solid ${theme.border}`,
                color: theme.text.secondary,
                padding: '10px 16px'
              }}
            >
              <User size={20} />
              My Characters
            </Button>
            <Button 
              data-testid="account-settings-btn" 
              onClick={() => navigate('/account')} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: 'transparent',
                border: `1px solid ${theme.border}`,
                color: theme.text.secondary,
                padding: '10px 16px'
              }}
            >
              <Settings size={20} />
              Account
            </Button>
            <Button 
              data-testid="logout-btn" 
              onClick={onLogout} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: theme.bg.card,
                border: `1px solid ${theme.border}`,
                color: theme.text.secondary,
                padding: '10px 16px'
              }}
            >
              <LogOut size={20} />
              Logout
            </Button>
          </div>
        </div>

        {/* Quick Tips */}
        <QuickTips 
          tips={TIPS.campaigns} 
          pageId="campaigns" 
          title="Getting Started"
        />

        {/* Campaigns Grid */}
        {campaigns.length === 0 ? (
          <div style={{ 
            background: theme.bg.panel, 
            border: `1px solid ${theme.border}`,
            padding: '60px 20px', 
            textAlign: 'center' 
          }}>
            <Scroll size={64} style={{ color: theme.accent.red, margin: '0 auto 24px' }} />
            <h2 style={{ 
              fontSize: '24px', 
              color: theme.text.white, 
              marginBottom: '12px',
              fontWeight: '700'
            }}>
              No Campaigns Yet
            </h2>
            <p style={{ color: theme.text.secondary, marginBottom: '24px' }}>
              Create your first campaign to begin your adventure!
            </p>
            <Button 
              onClick={() => setShowCreateDialog(true)} 
              style={{
                background: theme.accent.red,
                border: 'none',
                color: theme.text.white,
                padding: '12px 24px',
                fontWeight: '600'
              }}
            >
              <Plus size={20} style={{ marginRight: '8px' }} />
              Create First Campaign
            </Button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '24px'
          }}>
            {campaigns.map((campaign) => (
              <div 
                key={campaign.id} 
                data-testid={`campaign-card-${campaign.id}`}
                style={{ 
                  background: theme.bg.card,
                  border: `1px solid ${theme.border}`,
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = theme.accent.red;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = theme.border;
                }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ 
                    fontSize: '22px', 
                    color: theme.text.white, 
                    marginBottom: '12px',
                    fontWeight: '700'
                  }}>
                    {campaign.name}
                  </h3>
                  <span style={{
                    fontSize: '11px',
                    color: theme.accent.red,
                    background: theme.accent.redSubtle,
                    padding: '4px 10px',
                    fontWeight: '600'
                  }}>
                    {campaign.system || '5e 2024 Compatible'}
                  </span>
                </div>
                <p style={{ 
                  color: theme.text.secondary, 
                  fontSize: '14px', 
                  lineHeight: '1.6',
                  marginBottom: '20px',
                  minHeight: '42px'
                }}>
                  {campaign.description || 'No description provided'}
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button 
                    data-testid={`manage-campaign-btn-${campaign.id}`}
                    onClick={() => handleManageCampaign(campaign.id)}
                    style={{ 
                      flex: 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '8px',
                      background: theme.accent.red,
                      border: 'none',
                      color: theme.text.white,
                      padding: '12px'
                    }}
                  >
                    <Settings size={16} />
                    Manage
                  </Button>
                  <Button 
                    data-testid={`delete-campaign-btn-${campaign.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCampaign(campaign.id);
                    }}
                    style={{ 
                      padding: '12px 16px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#EF4444'
                    }}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${theme.border}` }}>
                  <p style={{ fontSize: '12px', color: theme.text.muted }}>
                    Created: {new Date(campaign.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <ReviewModal 
        isOpen={showReviewModal} 
        onClose={() => setShowReviewModal(false)} 
      />
    </div>
  );
}

export default CampaignList;
