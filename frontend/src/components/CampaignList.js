import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Scroll, Plus, LogOut, Trash2, Settings } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function CampaignList({ username, onLogout }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', description: '', system: 'D&D 5e 2024' });
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
  }, []);

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
      background: 'linear-gradient(135deg, #1a1410 0%, #2d1810 100%)',
      padding: '32px 20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="medieval-heading" style={{ fontSize: '36px', color: '#d4af37', marginBottom: '8px' }}>
              Your Campaigns
            </h1>
            <p style={{ color: '#8b7355' }}>Welcome back, {username}!</p>
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
                  <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#d4af37' }}>
                    Create New Campaign
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateCampaign} style={{ marginTop: '20px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#e8dcc4', fontSize: '14px', fontWeight: '600' }}>
                      Campaign Name
                    </label>
                    <Input
                      data-testid="campaign-name-input"
                      type="text"
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                      placeholder="Enter campaign name"
                      className="input"
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#e8dcc4', fontSize: '14px', fontWeight: '600' }}>
                      TTRPG System
                    </label>
                    <select
                      data-testid="campaign-system-select"
                      value={newCampaign.system}
                      onChange={(e) => setNewCampaign({ ...newCampaign, system: e.target.value })}
                      className="input"
                      style={{ cursor: 'pointer' }}
                    >
                      {ttrpgSystems.map(system => (
                        <option key={system} value={system}>{system}</option>
                      ))}
                    </select>
                    <p style={{ fontSize: '12px', color: '#8b7355', marginTop: '6px', fontStyle: 'italic' }}>
                      AI will tailor content to your chosen system
                    </p>
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#e8dcc4', fontSize: '14px', fontWeight: '600' }}>
                      Description
                    </label>
                    <textarea
                      data-testid="campaign-description-input"
                      value={newCampaign.description}
                      onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                      placeholder="Describe your campaign..."
                      className="textarea"
                      style={{ minHeight: '100px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <Button 
                      type="button" 
                      className="btn-secondary"
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
          <Card className="parchment-dark" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Scroll size={64} style={{ color: '#5a4a2f', margin: '0 auto 24px' }} />
            <h2 className="medieval-heading" style={{ fontSize: '24px', color: '#d4af37', marginBottom: '12px' }}>
              No Campaigns Yet
            </h2>
            <p style={{ color: '#8b7355', marginBottom: '24px' }}>
              Create your first campaign to begin your adventure!
            </p>
            <Button onClick={() => setShowCreateDialog(true)} className="btn-primary">
              <Plus size={20} style={{ marginRight: '8px' }} />
              Create First Campaign
            </Button>
          </Card>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px'
          }}>
            {campaigns.map((campaign) => (
              <Card 
                key={campaign.id} 
                data-testid={`campaign-card-${campaign.id}`}
                className="card"
                style={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <CardHeader>
                  <CardTitle className="medieval-heading" style={{ fontSize: '22px', color: '#d4af37', marginBottom: '8px' }}>
                    {campaign.name}
                  </CardTitle>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#d4af37', 
                      background: 'rgba(212, 175, 55, 0.2)', 
                      padding: '4px 12px', 
                      borderRadius: '12px',
                      border: '1px solid rgba(212, 175, 55, 0.4)',
                      fontWeight: '600'
                    }}>
                      {campaign.system || 'D&D 5e 2024'}
                    </span>
                  </div>
                  <CardDescription style={{ color: '#8b7355', fontSize: '14px', lineHeight: '1.6' }}>
                    {campaign.description || 'No description provided'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <Button 
                      data-testid={`manage-campaign-btn-${campaign.id}`}
                      onClick={() => handleManageCampaign(campaign.id)}
                      className="btn-primary"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <Settings size={16} />
                      Manage Campaign
                    </Button>
                    <Button 
                      data-testid={`delete-campaign-btn-${campaign.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCampaign(campaign.id);
                      }}
                      className="btn-danger"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #5a4a2f' }}>
                    <p style={{ fontSize: '12px', color: '#8b7355' }}>
                      Created: {new Date(campaign.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CampaignList;