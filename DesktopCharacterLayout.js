import React from 'react';
import DesktopStatHeader from './DesktopStatHeader';
import DesktopSidebar from './DesktopSidebar';

/**
 * Main Layout Wrapper for the Desktop Character Sheet
 * Grid Areas: [Header] [Header]
 *             [Sidebar][Main  ]
 */
const DesktopCharacterLayout = ({ character, theme, activeTab, onTabChange, children }) => {
  // Atmospheric Sync: Adjust background based on campaign environment
  const environment = character.campaign?.current_environment || 'default';
  const envStyles = {
    'dungeon': 'radial-gradient(circle at 50% 50%, #0a0a0f 0%, #030014 100%)',
    'forest': 'linear-gradient(180deg, #030014 0%, #051405 100%)',
    'fire': 'linear-gradient(180deg, #030014 0%, #1a0505 100%)',
    'default': theme.bg.main || '#030014'
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: envStyles[environment] || envStyles.default,
      color: theme.text.primary
    }}>
      {/* 1. TOP STICKY HEADER */}
      <div style={{ position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <DesktopStatHeader character={character} theme={theme} />
        
        {/* STICKY TABS */}
        <div style={{ 
          background: theme.bg.panel, 
          borderBottom: `1px solid ${theme.border}`,
          paddingLeft: '320px', // Push tabs to align with the main content area
          display: 'flex',
          gap: '32px'
        }}>
          {['Overview', 'Combat', 'Inventory', 'Story', 'Journal', 'Notes'].map(tab => (
            <button
              key={tab}
              onClick={() => onTabChange(tab.toLowerCase())}
              style={{
                padding: '14px 4px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.toLowerCase() ? `3px solid ${theme.accent || '#D4A017'}` : '3px solid transparent',
                color: activeTab === tab.toLowerCase() ? theme.text.primary : theme.text.muted,
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.2s'
              }}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 2 & 3. SIDEBAR AND MAIN CONTENT */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '320px 1fr', 
        flex: 1,
        height: 'calc(100vh - 140px)' // Account for header + tabs height
      }}>
        <div style={{ position: 'sticky', top: '140px', height: '100%' }}>
          <DesktopSidebar character={character} theme={theme} />
        </div>
        <main style={{ padding: '32px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DesktopCharacterLayout;