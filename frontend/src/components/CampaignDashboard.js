import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Monitor, Users, UserCircle, Map, Scroll, Sparkles, Book, Church, MapPin, FileText, FlaskConical, Calendar } from 'lucide-react';
import CampaignSettingTab from '@/components/tabs/CampaignSettingTab';
import GodsTab from '@/components/tabs/GodsTab';
import NPCsTab from '@/components/tabs/NPCsTab';
import LocationsTab from '@/components/tabs/LocationsTab';
import PlayersTab from '@/components/tabs/PlayersTab';
import InGameNotesTab from '@/components/tabs/InGameNotesTab';
import CombatCreatorTab from '@/components/tabs/CombatCreatorTab';
import CalendarTab from '@/components/tabs/CalendarTab';

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
      background: 'linear-gradient(135deg, #0a1628 0%, #0d1d33 100%)',
    }}>
      {/* Header */}
      <div style={{
        background: '#1e3a5f, 0.9)',
        borderBottom: '2px solid #ff1f8f',
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
              <h1 className="medieval-heading" style={{ fontSize: '24px', color: '#ffffff', marginBottom: '4px' }}>
                {campaign.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontSize: '11px', 
                  color: '#ff1f8f', 
                  background: 'rgba(255, 31, 143, 0.2)', 
                  padding: '3px 10px', 
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 31, 143, 0.4)',
                  fontWeight: '600'
                }}>
                  {campaign.system || 'D&D 5e 2024'}
                </span>
                <p style={{ fontSize: '12px', color: '#bae6fd' }}>Campaign Management</p>
              </div>
            </div>
          </div>
          <Button 
            data-testid="open-dm-screen-btn"
            onClick={handleOpenDMScreen}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(255, 31, 143, 0.4)' }}
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
            background: '#1e3a5f, 0.9)',
            padding: '8px',
            borderRadius: '12px',
            border: '1px solid #1e3a5f',
            display: 'flex',
            gap: '8px',
            marginBottom: '32px',
            flexWrap: 'wrap'
          }}>
            <TabsTrigger 
              data-testid="setting-tab"
              value="setting"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: activeTab === 'setting' ? 'rgba(255, 31, 143, 0.2)' : 'transparent',
                color: activeTab === 'setting' ? '#ff1f8f' : '#bae6fd',
                border: activeTab === 'setting' ? '1px solid #ff1f8f' : '1px solid transparent',
                fontWeight: '600'
              }}
            >
              <Book size={18} />
              Campaign Setting
            </TabsTrigger>
            <TabsTrigger 
              data-testid="gods-tab"
              value="gods"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: activeTab === 'gods' ? 'rgba(255, 31, 143, 0.2)' : 'transparent',
                color: activeTab === 'gods' ? '#ff1f8f' : '#bae6fd',
                border: activeTab === 'gods' ? '1px solid #ff1f8f' : '1px solid transparent',
                fontWeight: '600'
              }}
            >
              <Church size={18} />
              Gods
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
                background: activeTab === 'npcs' ? 'rgba(255, 31, 143, 0.2)' : 'transparent',
                color: activeTab === 'npcs' ? '#ff1f8f' : '#bae6fd',
                border: activeTab === 'npcs' ? '1px solid #ff1f8f' : '1px solid transparent',
                fontWeight: '600'
              }}
            >
              <UserCircle size={18} />
              NPCs
            </TabsTrigger>
            <TabsTrigger 
              data-testid="locations-tab"
              value="locations"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: activeTab === 'locations' ? 'rgba(255, 31, 143, 0.2)' : 'transparent',
                color: activeTab === 'locations' ? '#ff1f8f' : '#bae6fd',
                border: activeTab === 'locations' ? '1px solid #ff1f8f' : '1px solid transparent',
                fontWeight: '600'
              }}
            >
              <MapPin size={18} />
              Locations
            </TabsTrigger>
            <TabsTrigger 
              data-testid="players-tab"
              value="players"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: activeTab === 'players' ? 'rgba(255, 31, 143, 0.2)' : 'transparent',
                color: activeTab === 'players' ? '#ff1f8f' : '#bae6fd',
                border: activeTab === 'players' ? '1px solid #ff1f8f' : '1px solid transparent',
                fontWeight: '600'
              }}
            >
              <Users size={18} />
              Players
            </TabsTrigger>
            <TabsTrigger 
              data-testid="combat-creator-tab"
              value="combat-creator"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: activeTab === 'combat-creator' ? 'rgba(255, 31, 143, 0.2)' : 'transparent',
                color: activeTab === 'combat-creator' ? '#ff1f8f' : '#bae6fd',
                border: activeTab === 'combat-creator' ? '1px solid #ff1f8f' : '1px solid transparent',
                fontWeight: '600'
              }}
            >
              <FlaskConical size={18} />
              Combat Creator
            </TabsTrigger>
            <TabsTrigger 
              data-testid="calendar-tab"
              value="calendar"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: activeTab === 'calendar' ? 'rgba(255, 31, 143, 0.2)' : 'transparent',
                color: activeTab === 'calendar' ? '#ff1f8f' : '#bae6fd',
                border: activeTab === 'calendar' ? '1px solid #ff1f8f' : '1px solid transparent',
                fontWeight: '600'
              }}
            >
              <Calendar size={18} />
              Calendar
            </TabsTrigger>
            <TabsTrigger 
              data-testid="ingame-notes-tab"
              value="ingame-notes"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: activeTab === 'ingame-notes' ? 'rgba(255, 31, 143, 0.2)' : 'transparent',
                color: activeTab === 'ingame-notes' ? '#ff1f8f' : '#bae6fd',
                border: activeTab === 'ingame-notes' ? '1px solid #ff1f8f' : '1px solid transparent',
                fontWeight: '600'
              }}
            >
              <FileText size={18} />
              In-Game Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setting">
            <CampaignSettingTab campaignId={campaignId} />
          </TabsContent>

          <TabsContent value="gods">
            <GodsTab campaignId={campaignId} />
          </TabsContent>

          <TabsContent value="npcs">
            <NPCsTab campaignId={campaignId} />
          </TabsContent>

          <TabsContent value="locations">
            <LocationsTab campaignId={campaignId} />
          </TabsContent>

          <TabsContent value="players">
            <PlayersTab campaignId={campaignId} />
          </TabsContent>

          <TabsContent value="combat-creator">
            <CombatCreatorTab campaignId={campaignId} />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarTab campaignId={campaignId} />
          </TabsContent>

          <TabsContent value="ingame-notes">
            <InGameNotesTab campaignId={campaignId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default CampaignDashboard;
