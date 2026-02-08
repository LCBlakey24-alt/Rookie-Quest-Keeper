import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Monitor, Users, UserCircle, Map, Scroll, Sparkles, Book, Church, MapPin, FileText } from 'lucide-react';
import CampaignSettingTab from '@/components/tabs/CampaignSettingTab';
import GodsTab from '@/components/tabs/GodsTab';
import NPCsTab from '@/components/tabs/NPCsTab';
import LocationsTab from '@/components/tabs/LocationsTab';
import PlayersTab from '@/components/tabs/PlayersTab';
import InGameNotesTab from '@/components/tabs/InGameNotesTab';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function CampaignDashboard({ username, onLogout }) {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('setting');

  useEffect(() => {
    fetchCampaign();
  }, [campaignId]);

  const fetchCampaign = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}`);
      setCampaign(response.data);
    } catch (error) {
      toast.error('Failed to load campaign');
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDMScreen = () => {
    window.open(`/dm-screen/${campaignId}`, '_blank');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!campaign) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1410 0%, #2d1810 100%)',
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(20, 16, 12, 0.9)',
        borderBottom: '2px solid #5a4a2f',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Button 
              data-testid="back-to-campaigns-btn"
              onClick={() => navigate('/campaigns')} 
              className="btn-icon"
              style={{ padding: '8px' }}
            >
              <ArrowLeft size={24} />
            </Button>
            <div>
              <h1 className="medieval-heading" style={{ fontSize: '24px', color: '#d4af37', marginBottom: '4px' }}>
                {campaign.name}
              </h1>
              <p style={{ fontSize: '12px', color: '#8b7355' }}>Campaign Management</p>
            </div>
          </div>
          <Button 
            data-testid="open-dm-screen-btn"
            onClick={handleOpenDMScreen}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(212, 175, 55, 0.4)' }}
          >
            <Monitor size={20} />
            Open DM Screen
          </Button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList style={{
            background: 'rgba(20, 16, 12, 0.9)',
            padding: '8px',
            borderRadius: '12px',
            border: '1px solid #5a4a2f',
            display: 'flex',
            gap: '8px',
            marginBottom: '32px',
            flexWrap: 'wrap'
          }}>
            <TabsTrigger 
              data-testid="players-tab"
              value="players"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: activeTab === 'players' ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                color: activeTab === 'players' ? '#d4af37' : '#8b7355',
                border: activeTab === 'players' ? '1px solid #d4af37' : '1px solid transparent',
                fontWeight: '600'
              }}
            >
              <Users size={18} />
              Players
            </TabsTrigger>
            <TabsTrigger 
              data-testid="npcs-tab"
              value="npcs"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: activeTab === 'npcs' ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                color: activeTab === 'npcs' ? '#d4af37' : '#8b7355',
                border: activeTab === 'npcs' ? '1px solid #d4af37' : '1px solid transparent',
                fontWeight: '600'
              }}
            >
              <UserCircle size={18} />
              NPCs
            </TabsTrigger>
            <TabsTrigger 
              data-testid="maps-tab"
              value="maps"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: activeTab === 'maps' ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                color: activeTab === 'maps' ? '#d4af37' : '#8b7355',
                border: activeTab === 'maps' ? '1px solid #d4af37' : '1px solid transparent',
                fontWeight: '600'
              }}
            >
              <Map size={18} />
              Maps
            </TabsTrigger>
            <TabsTrigger 
              data-testid="notes-tab"
              value="notes"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: activeTab === 'notes' ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                color: activeTab === 'notes' ? '#d4af37' : '#8b7355',
                border: activeTab === 'notes' ? '1px solid #d4af37' : '1px solid transparent',
                fontWeight: '600'
              }}
            >
              <Scroll size={18} />
              Notes & Lore
            </TabsTrigger>
            <TabsTrigger 
              data-testid="ai-tab"
              value="ai"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: activeTab === 'ai' ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                color: activeTab === 'ai' ? '#d4af37' : '#8b7355',
                border: activeTab === 'ai' ? '1px solid #d4af37' : '1px solid transparent',
                fontWeight: '600'
              }}
            >
              <Sparkles size={18} />
              AI Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="players">
            <PlayersTab campaignId={campaignId} />
          </TabsContent>

          <TabsContent value="npcs">
            <NPCsTab campaignId={campaignId} />
          </TabsContent>

          <TabsContent value="maps">
            <MapsTab campaignId={campaignId} />
          </TabsContent>

          <TabsContent value="notes">
            <NotesTab campaignId={campaignId} />
          </TabsContent>

          <TabsContent value="ai">
            <AIAssistantTab campaignId={campaignId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default CampaignDashboard;
