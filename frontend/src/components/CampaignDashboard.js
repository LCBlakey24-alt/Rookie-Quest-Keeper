import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Monitor, Users, UserCircle, Book, Church, MapPin, FileText, Swords, Calendar, Sparkles, Wand2, ScrollText, Globe, Menu, X, Map, ChevronDown, ChevronRight, Package, Dice6, Clock, Network, Compass, Building, Backpack, Upload } from 'lucide-react';
import CampaignSettingTab from '@/components/tabs/CampaignSettingTab';
import GodsTab from '@/components/tabs/GodsTab';
import LocationsTab from '@/components/tabs/LocationsTab';
import PlayersTab from '@/components/tabs/PlayersTab';
import InGameNotesTab from '@/components/tabs/InGameNotesTab';
import MapsTab from '@/components/tabs/MapsTab';
import SessionRecapAI from '@/components/SessionRecapAI';
import WorldBuilderTab from '@/components/tabs/WorldBuilderTab';
import TronBackground from '@/components/TronBackground';
// Consolidated Tabs
import MapsConsolidatedTab from '@/components/tabs/MapsConsolidatedTab';
import NPCsConsolidatedTab from '@/components/tabs/NPCsConsolidatedTab';
import InventoryConsolidatedTab from '@/components/tabs/InventoryConsolidatedTab';
import ChronicleConsolidatedTab from '@/components/tabs/ChronicleConsolidatedTab';
import CombatConsolidatedTab from '@/components/tabs/CombatConsolidatedTab';
import ToolsConsolidatedTab from '@/components/tabs/ToolsConsolidatedTab';
import UploadTab from '@/components/gm/UploadTab';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// GM Mode Theme - unified navy and gold
const theme = {
  bg: {
    black: '#0A1628',
    dark: '#0F2440',
    panel: 'rgba(15, 36, 64, 0.92)',
    card: 'rgba(15, 36, 64, 0.96)',
    hover: '#14304F',
    elevated: '#14304F',
    surface: 'rgba(15, 36, 64, 0.88)'
  },
  sunset: {
    purple: '#D4A017',
    pink: '#F5C542',
    gold: '#D4A017'
  },
  accent: {
    primary: '#D4A017',
    secondary: '#F5C542',
    tertiary: '#F5C542',
    hover: '#F5C542',
    subtle: 'rgba(212, 160, 23, 0.12)',
    glow: '0 0 18px rgba(212, 160, 23, 0.18)',
    gm: '#D4A017',
    red: '#D4A017',
    redHover: '#F5C542',
    redSubtle: 'rgba(212, 160, 23, 0.12)',
    orange: '#F5C542'
  },
  text: {
    white: '#FFFFFF',
    primary: '#F8F8FF',
    secondary: '#A0A0B0',
    muted: '#6B6B7B'
  },
  border: 'rgba(212, 160, 23, 0.35)',
  gradient: 'linear-gradient(135deg, #D4A017, #F5C542)'
};

function CampaignDashboard({ username, onLogout }) {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('setting');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);

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

  const handleOpenGMScreen = () => {
    window.open(`/gm-screen/${campaignId}`, '_blank');
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  // Collapsed groups state
  const [collapsedGroups, setCollapsedGroups] = useState({});
  
  const toggleGroup = (groupId) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!campaign) return null;

  // Tab Groups with organized structure - CONSOLIDATED
  const tabGroups = [
    {
      id: 'world',
      label: 'World',
      icon: Globe,
      tabs: [
        { id: 'setting', icon: Book, label: 'Setting' },
        { id: 'world', icon: Globe, label: 'World Builder' },
        { id: 'maps', icon: Compass, label: 'Maps' },
        { id: 'gods', icon: Church, label: 'Gods' },
        { id: 'locations', icon: MapPin, label: 'Locations' },
        { id: 'npcs', icon: UserCircle, label: 'NPCs' },
        { id: 'chronicle', icon: Clock, label: 'Chronicle' },
      ]
    },
    {
      id: 'combat',
      label: 'Combat',
      icon: Swords,
      tabs: [
        { id: 'combat', icon: Swords, label: 'Combat' },
        { id: 'battle-maps', icon: Map, label: 'Battle Maps' },
      ]
    },
    {
      id: 'tools',
      label: 'GM Tools',
      icon: Wand2,
      tabs: [
        { id: 'tools', icon: ScrollText, label: 'Tools' },
        { id: 'inventory', icon: Backpack, label: 'Inventory' },
        { id: 'uploads', icon: Upload, label: 'Uploads' },
      ]
    },
  ];

  // Standalone tabs (shown individually, not in groups)
  const standaloneTabs = [
    { id: 'session-recap', icon: Sparkles, label: 'AI Recap' },
    { id: 'players', icon: Users, label: 'Players' },
    { id: 'ingame-notes', icon: FileText, label: 'Notes' },
  ];

  // Check if active tab is in a group (auto-expand that group)
  const getActiveGroup = () => {
    for (const group of tabGroups) {
      if (group.tabs.some(t => t.id === activeTab)) {
        return group.id;
      }
    }
    return null;
  };

  const activeGroupId = getActiveGroup();

  // Render a single tab button
  const renderTabButton = (tab, isNested = false) => {
    const isActive = activeTab === tab.id;
    const isHovered = hoveredTab === tab.id && !isActive;
    
    return (
      <button
        key={tab.id}
        onClick={() => handleTabClick(tab.id)}
        onMouseEnter={() => setHoveredTab(tab.id)}
        onMouseLeave={() => setHoveredTab(null)}
        data-testid={`${tab.id}-tab`}
        className={`tab-glow press-scale ${isActive ? 'tab-active' : ''}`}
        style={{
          position: 'relative',
          padding: isNested ? '10px 16px 10px 32px' : '12px 16px',
          border: 'none',
          background: isActive ? theme.gradient : (isHovered ? theme.accent.subtle : 'transparent'),
          color: isActive ? '#0A1628' : (isHovered ? theme.text.white : theme.text.secondary),
          fontWeight: '800',
          fontSize: isNested ? '13px' : '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          textAlign: 'left',
          width: '100%',
          minHeight: isNested ? '40px' : '44px',
          borderRadius: '8px',
          margin: '2px 8px',
          maxWidth: 'calc(100% - 16px)'
        }}
      >
        <tab.icon size={isNested ? 16 : 18} style={{ color: isActive ? '#0A1628' : theme.sunset.purple }} />
        <span style={{ flex: 1 }}>{tab.label}</span>
        
        {/* Accent bar on right side when hovered (not active) */}
        {isHovered && !isActive && (
          <div style={{
            position: 'absolute',
            right: 0,
            top: '4px',
            bottom: '4px',
            width: '3px',
            borderRadius: '2px',
            background: theme.sunset.purple,
            animation: 'slideIn 0.15s ease'
          }} />
        )}
      </button>
    );
  };

  // Render group header
  const renderGroupHeader = (group) => {
    const isExpanded = !collapsedGroups[group.id] || activeGroupId === group.id;
    const hasActiveTab = group.tabs.some(t => t.id === activeTab);
    
    return (
      <button
        key={`group-${group.id}`}
        onClick={() => {
          const hasActiveInGroup = group.tabs.some(t => t.id === activeTab);
          if (hasActiveInGroup) {
            // Active tab is in this group - just toggle collapse
            toggleGroup(group.id);
          } else {
            // Navigate to first tab in group and ensure expanded
            setCollapsedGroups(prev => ({ ...prev, [group.id]: false }));
            setActiveTab(group.tabs[0].id);
          }
        }}
        data-testid={`group-${group.id}`}
        style={{
          padding: '10px 16px',
          border: 'none',
          background: hasActiveTab ? theme.accent.redSubtle : 'transparent',
          color: hasActiveTab ? theme.accent.red : theme.text.muted,
          fontWeight: '800',
          fontSize: '11px',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          marginTop: '8px'
        }}
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <group.icon size={14} />
        <span>{group.label}</span>
      </button>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.98) 0%, rgba(10, 22, 40, 1) 100%)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(15, 36, 64, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${theme.border}`,
        padding: '8px 14px',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ 
          maxWidth: '100%', 
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '12px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-menu-toggle"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: theme.accent.red,
                display: 'none',
                padding: '8px'
              }}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <Button 
              data-testid="back-to-campaigns-btn"
              onClick={() => navigate('/home')} 
              style={{ 
                minWidth: '44px', 
                minHeight: '44px',
                background: theme.bg.card,
                border: `1px solid ${theme.border}`
              }}
            >
              <ArrowLeft size={20} color={theme.text.secondary} />
            </Button>
            
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <h1 style={{ 
                fontSize: 'clamp(18px, 4vw, 24px)', 
                color: '#0A1628',
                marginBottom: '4px',
                fontWeight: '800',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '200px'
              }}>
                {campaign.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '11px',
                  color: theme.accent.red,
                  background: theme.accent.redSubtle,
                  padding: '2px 8px',
                  fontWeight: '800'
                }}>
                  {campaign.system || '5e 2024'}
                </span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button 
              data-testid="open-dm-screen-btn"
              onClick={handleOpenGMScreen}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: theme.accent.red,
                border: 'none',
                color: theme.text.white,
                fontSize: 'clamp(12px, 2vw, 14px)',
                padding: '10px 16px',
                minHeight: '44px',
                fontWeight: '800'
              }}
            >
              <Monitor size={18} />
              <span className="desktop-only">Open </span>Live Play Mode
            </Button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ 
        display: 'flex', 
        flex: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* LEFT SIDEBAR */}
        <div 
          className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}
          style={{
            width: '220px',
            minWidth: '220px',
            background: 'rgba(15, 36, 64, 0.92)',
            backdropFilter: 'blur(12px)',
            borderRight: `1px solid ${theme.border}`,
            padding: '16px 0',
            overflowY: 'auto',
            transition: 'transform 0.3s ease'
          }}
        >
          <h3 style={{
            color: theme.sunset.gold,
            fontSize: '11px',
            fontWeight: '800',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginBottom: '12px',
            paddingLeft: '16px',
            fontFamily: "'Montserrat', sans-serif"
          }}>
            Campaign Tools
          </h3>
          
          {/* Grouped Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {/* Render tab groups */}
            {tabGroups.map(group => {
              const isExpanded = !collapsedGroups[group.id] || activeGroupId === group.id;
              return (
                <div key={group.id}>
                  {renderGroupHeader(group)}
                  {isExpanded && group.tabs.map(tab => renderTabButton(tab, true))}
                </div>
              );
            })}
            
            {/* Divider */}
            <div style={{ 
              height: '1px', 
              background: theme.border, 
              margin: '12px 16px' 
            }} />
            
            {/* Ungrouped tabs */}
            {standaloneTabs.map(tab => renderTabButton(tab, false))}
          </div>
        </div>

        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <div 
            className="mobile-overlay"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              zIndex: 39,
              display: 'none'
            }}
          />
        )}

        {/* MAIN CONTENT */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto',
          padding: 'clamp(8px, 2vw, 16px)',
          background: 'transparent'
        }}>
          {/* Tab Content */}
          <div style={{
            background: 'rgba(15, 36, 64, 0.88)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${theme.border}`,
            borderRadius: '10px',
            padding: '16px',
            minHeight: '500px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}>
            
            {activeTab === 'setting' && <CampaignSettingTab campaignId={campaignId} />}
            {activeTab === 'world' && <WorldBuilderTab campaignId={campaignId} />}
            {activeTab === 'maps' && <MapsConsolidatedTab campaignId={campaignId} />}
            {activeTab === 'gods' && <GodsTab campaignId={campaignId} />}
            {activeTab === 'npcs' && <NPCsConsolidatedTab campaignId={campaignId} />}
            {activeTab === 'locations' && <LocationsTab campaignId={campaignId} />}
            {activeTab === 'chronicle' && <ChronicleConsolidatedTab campaignId={campaignId} />}
            {activeTab === 'combat' && <CombatConsolidatedTab campaignId={campaignId} />}
            {activeTab === 'battle-maps' && <MapsTab campaignId={campaignId} />}
            {activeTab === 'tools' && <ToolsConsolidatedTab campaignId={campaignId} />}
            {activeTab === 'uploads' && <UploadTab theme={theme} campaignId={campaignId} />}
            {activeTab === 'inventory' && <InventoryConsolidatedTab campaignId={campaignId} />}
            {activeTab === 'session-recap' && <SessionRecapAI campaignId={campaignId} />}
            {activeTab === 'players' && <PlayersTab campaignId={campaignId} />}
            {activeTab === 'ingame-notes' && <InGameNotesTab campaignId={campaignId} />}
          </div>
        </div>
      </div>

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 640px) {
          .desktop-logos, .desktop-only {
            display: none !important;
          }
        }

        @media (max-width: 1024px) {
          .mobile-menu-toggle {
            display: block !important;
          }

          .sidebar {
            position: fixed !important;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 40;
            transform: translateX(-100%);
          }

          .sidebar.mobile-open {
            transform: translateX(0);
          }

          .mobile-overlay {
            display: block !important;
          }
        }

        @media (hover: none) and (pointer: coarse) {
          button, .clickable-box {
            min-height: 44px !important;
            min-width: 44px !important;
          }
        }
      `}</style>
      
    </div>
  );
}

export default CampaignDashboard;
