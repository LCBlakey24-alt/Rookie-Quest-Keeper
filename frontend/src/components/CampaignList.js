import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Scroll, Plus, LogOut, Trash2, Settings, Crown, Sparkles } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function CampaignList({ username, onLogout }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', description: '', system: 'D&D 5e 2024' });
  const [subscription, setSubscription] = useState(null);
  const navigate = useNavigate();

  const ttrpgSystems = [
    'D&D 5e 2024',
    'D&D 5e 2014',
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
    'Other'
  ];

  useEffect(() => {
    fetchCampaigns();
    fetchSubscription();
  }, []);

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

    try {
      const response = await axios.post(`${API}/campaigns`, newCampaign);
      toast.success('Campaign created!');
      setCampaigns([...campaigns, response.data]);
      setNewCampaign({ name: '', description: '', system: 'D&D 5e 2024' });
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
      background: 'linear-gradient(180deg, #030014 0%, #0a0a2e 50%, #030014 100%)',
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
            <img 
              src="/rookie-quest-logo.png" 
              alt="Rookie Quest" 
              style={{ height: '60px', filter: 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.3))' }} 
            />
            <div>
              <h1 style={{ 
                fontSize: '28px', 
                color: '#ffffff', 
                marginBottom: '4px',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: '800'
              }}>
                Your Campaigns
              </h1>
              <p style={{ color: '#67e8f9', fontSize: '14px' }}>Welcome back, {username}!</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button data-testid="create-campaign-btn" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={20} />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="modal">
                <DialogHeader>
                  <DialogTitle style={{ 
                    fontSize: '24px', 
                    color: '#ffffff',
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: '800'
                  }}>
                    Create New Campaign
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateCampaign} style={{ marginTop: '24px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '10px', 
                      color: '#ffffff', 
                      fontSize: '14px', 
                      fontWeight: '700',
                      fontFamily: 'Montserrat, sans-serif',
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
                      className="input-glow"
                    />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '10px', 
                      color: '#ffffff', 
                      fontSize: '14px', 
                      fontWeight: '700',
                      fontFamily: 'Montserrat, sans-serif',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}>
                      TTRPG System
                    </label>
                    <select
                      data-testid="campaign-system-select"
                      value={newCampaign.system}
                      onChange={(e) => setNewCampaign({ ...newCampaign, system: e.target.value })}
                      className="input-glow"
                      style={{ cursor: 'pointer' }}
                    >
                      {ttrpgSystems.map(system => (
                        <option key={system} value={system}>{system}</option>
                      ))}
                    </select>
                    <p style={{ fontSize: '12px', color: '#67e8f9', marginTop: '8px', fontStyle: 'italic' }}>
                      AI will tailor content to your chosen system
                    </p>
                  </div>
                  <div style={{ marginBottom: '28px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '10px', 
                      color: '#ffffff', 
                      fontSize: '14px', 
                      fontWeight: '700',
                      fontFamily: 'Montserrat, sans-serif',
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
                      className="textarea-glow"
                      style={{ minHeight: '100px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <Button 
                      type="button" 
                      className="btn-outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button data-testid="create-campaign-submit-btn" type="submit" className="btn-primary">
                      Create Campaign
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Button data-testid="logout-btn" onClick={onLogout} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LogOut size={20} />
              Logout
            </Button>
          </div>
        </div>

        {/* Campaigns Grid */}
        {campaigns.length === 0 ? (
          <div className="glow-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Scroll size={64} style={{ color: '#4a7dff', margin: '0 auto 24px' }} />
            <h2 style={{ 
              fontSize: '24px', 
              color: '#ffffff', 
              marginBottom: '12px',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '800'
            }}>
              No Campaigns Yet
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
              Create your first campaign to begin your adventure!
            </p>
            <Button onClick={() => setShowCreateDialog(true)} className="btn-primary">
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
                className="card-glow"
                style={{ cursor: 'pointer' }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ 
                    fontSize: '22px', 
                    color: '#ffffff', 
                    marginBottom: '12px',
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: '700'
                  }}>
                    {campaign.name}
                  </h3>
                  <span className="system-badge">
                    {campaign.system || 'D&D 5e 2024'}
                  </span>
                </div>
                <p style={{ 
                  color: '#94a3b8', 
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
                    className="btn-primary"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
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
                    className="btn-danger"
                    style={{ padding: '12px 16px' }}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #1e40af' }}>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>
                    Created: {new Date(campaign.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CampaignList;
