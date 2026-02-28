import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Monitor, Users, UserCircle, Book, Church, MapPin, FileText, FlaskConical, Calendar } from 'lucide-react';
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

  const TabButton = ({ value, icon: Icon, label }) => (
    <TabsTrigger 
      data-testid={`${value}-tab`}
      value={value}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        borderRadius: '12px',
        background: activeTab === value ? 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)' : 'transparent',
        color: activeTab === value ? '#ffffff' : '#94a3b8',
        border: 'none',
        fontWeight: '600',
        fontFamily: 'Montserrat, sans-serif',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: activeTab === value ? '0 0 20px rgba(34, 197, 94, 0.5)' : 'none'
      }}
    >
      <Icon size={18} />
      {label}
    </TabsTrigger>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #030014 0%, #0a0a2e 50%, #030014 100%)',
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(10, 10, 46, 0.95)',
        borderBottom: '2px solid #1e40af',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 0 30px rgba(74, 125, 255, 0.2)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Button 
              data-testid="back-to-campaigns-btn"
              onClick={() => navigate('/campaigns')} 
              className="btn-icon"
            >
              <ArrowLeft size={24} />
            </Button>
            <div>
              <h1 style={{ 
                fontSize: '24px', 
                color: '#ffffff', 
                marginBottom: '6px',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: '800'
              }}>
                {campaign.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="system-badge">
                  {campaign.system || 'D&D 5e 2024'}
                </span>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Campaign Management</span>
              </div>
            </div>
          </div>
          <Button 
            data-testid="open-dm-screen-btn"
            onClick={handleOpenDMScreen}
            className="btn-primary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              boxShadow: '0 0 25px rgba(34, 197, 94, 0.5)'
            }}
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
            background: 'rgba(10, 10, 60, 0.7)',
            padding: '10px',
            borderRadius: '16px',
            border: '2px solid #1e40af',
            display: 'flex',
            gap: '8px',
            marginBottom: '32px',
            flexWrap: 'wrap',
            boxShadow: '0 0 20px rgba(74, 125, 255, 0.15)'
          }}>
            <TabButton value="setting" icon={Book} label="Campaign Setting" />
            <TabButton value="gods" icon={Church} label="Gods" />
            <TabButton value="npcs" icon={UserCircle} label="NPCs" />
            <TabButton value="locations" icon={MapPin} label="Locations" />
            <TabButton value="players" icon={Users} label="Players" />
            <TabButton value="combat-creator" icon={FlaskConical} label="Combat Creator" />
            <TabButton value="calendar" icon={Calendar} label="Calendar" />
            <TabButton value="ingame-notes" icon={FileText} label="In-Game Notes" />
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
