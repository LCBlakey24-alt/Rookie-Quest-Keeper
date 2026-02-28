import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Monitor, Users, UserCircle, Book, Church, MapPin, FileText, Swords, Calendar, Sparkles, Wand2 } from 'lucide-react';
import CampaignSettingTab from '@/components/tabs/CampaignSettingTab';
import GodsTab from '@/components/tabs/GodsTab';
import NPCsTab from '@/components/tabs/NPCsTab';
import LocationsTab from '@/components/tabs/LocationsTab';
import PlayersTab from '@/components/tabs/PlayersTab';
import InGameNotesTab from '@/components/tabs/InGameNotesTab';
import CombatCreatorTab from '@/components/tabs/CombatCreatorTab';
import CalendarTab from '@/components/tabs/CalendarTab';
import EncounterGeneratorTab from '@/components/tabs/EncounterGeneratorTab';
import ItemCreatorTab from '@/components/tabs/ItemCreatorTab';

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

  const tabs = [
    { id: 'setting', icon: Book, label: 'Setting', color: '#4a7dff' },
    { id: 'gods', icon: Church, label: 'Gods', color: '#a855f7' },
    { id: 'npcs', icon: UserCircle, label: 'NPCs', color: '#f97316' },
    { id: 'locations', icon: MapPin, label: 'Locations', color: '#22c55e' },
    { id: 'players', icon: Users, label: 'Players', color: '#4a7dff' },
    { id: 'combat-creator', icon: Swords, label: 'Combat', color: '#ef4444' },
    { id: 'encounter-gen', icon: Sparkles, label: 'Encounter Gen', color: '#eab308' },
    { id: 'items', icon: Wand2, label: 'Items', color: '#67e8f9' },
    { id: 'calendar', icon: Calendar, label: 'Calendar', color: '#a855f7' },
    { id: 'ingame-notes', icon: FileText, label: 'Notes', color: '#94a3b8' },
  ];

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
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {/* Tab Navigation - Same design as DM Screen */}
        <div style={{ 
          display: 'flex', 
          gap: '6px', 
          marginBottom: '24px', 
          flexWrap: 'wrap', 
          background: 'rgba(10, 10, 40, 0.5)', 
          padding: '8px', 
          borderRadius: '16px', 
          border: '2px solid #1e40af' 
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`${tab.id}-tab`}
              style={{
                flex: '1 1 auto',
                minWidth: '90px',
                padding: '12px 14px',
                borderRadius: '12px',
                border: activeTab === tab.id ? `2px solid ${tab.color}` : '2px solid transparent',
                background: activeTab === tab.id ? `${tab.color}20` : 'transparent',
                color: activeTab === tab.id ? tab.color : '#94a3b8',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="glow-panel" style={{ minHeight: '500px' }}>
          {activeTab === 'setting' && <CampaignSettingTab campaignId={campaignId} />}
          {activeTab === 'gods' && <GodsTab campaignId={campaignId} />}
          {activeTab === 'npcs' && <NPCsTab campaignId={campaignId} />}
          {activeTab === 'locations' && <LocationsTab campaignId={campaignId} />}
          {activeTab === 'players' && <PlayersTab campaignId={campaignId} />}
          {activeTab === 'combat-creator' && <CombatCreatorTab campaignId={campaignId} />}
          {activeTab === 'encounter-gen' && <EncounterGeneratorTab campaignId={campaignId} />}
          {activeTab === 'items' && <ItemCreatorTab campaignId={campaignId} />}
          {activeTab === 'calendar' && <CalendarTab campaignId={campaignId} />}
          {activeTab === 'ingame-notes' && <InGameNotesTab campaignId={campaignId} />}
        </div>
      </div>
    </div>
  );
}

export default CampaignDashboard;
