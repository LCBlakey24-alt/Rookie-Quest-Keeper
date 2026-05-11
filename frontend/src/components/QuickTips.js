import React, { useState, useEffect } from 'react';
import { Lightbulb, X, ChevronDown, ChevronUp } from 'lucide-react';

// Dark Minimalist Theme Colors - #C54B2C
const theme = {
  accent: '#C54B2C',
  accentSubtle: 'rgba(225, 29, 72, 0.15)',
  accentBorder: 'rgba(225, 29, 72, 0.3)',
  text: '#FFFFFF',
  muted: '#808080'
};

function QuickTips({ tips, pageId, title = "Quick Tips" }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Remember collapsed state per page
  useEffect(() => {
    const savedState = localStorage.getItem(`quicktips_${pageId}`);
    if (savedState === 'hidden') {
      setIsVisible(false);
    } else if (savedState === 'collapsed') {
      setIsCollapsed(true);
    }
  }, [pageId]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(`quicktips_${pageId}`, 'hidden');
  };

  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(`quicktips_${pageId}`, newState ? 'collapsed' : 'visible');
  };

  const handleShowAgain = () => {
    setIsVisible(true);
    setIsCollapsed(false);
    localStorage.setItem(`quicktips_${pageId}`, 'visible');
  };

  if (!isVisible) {
    return (
      <button
        onClick={handleShowAgain}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          background: theme.accentSubtle,
          border: `1px solid ${theme.accentBorder}`,
          color: theme.accent,
          fontSize: '12px',
          cursor: 'pointer',
          marginBottom: '16px'
        }}
      >
        <Lightbulb size={14} />
        Show Tips
      </button>
    );
  }

  return (
    <div style={{
      background: theme.accentSubtle,
      border: `1px solid ${theme.accentBorder}`,
      marginBottom: '20px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div 
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          cursor: 'pointer',
          background: 'rgba(220, 38, 38, 0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Lightbulb size={18} color={theme.accent} />
          <span style={{ color: theme.accent, fontWeight: '400', fontSize: '14px' }}>
            {title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isCollapsed ? (
            <ChevronDown size={18} color={theme.accent} />
          ) : (
            <ChevronUp size={18} color={theme.accent} />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Dismiss tips"
          >
            <X size={16} color={theme.muted} />
          </button>
        </div>
      </div>

      {/* Tips Content */}
      {!isCollapsed && (
        <div style={{ padding: '14px 16px' }}>
          <ul style={{ 
            margin: 0, 
            padding: '0 0 0 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {tips.map((tip, index) => (
              <li key={index} style={{ 
                color: '#d4d4d8', 
                fontSize: '13px',
                lineHeight: '1.5'
              }}>
                {tip.highlight ? (
                  <>
                    <span style={{ color: theme.accent, fontWeight: '400' }}>{tip.highlight}</span>
                    {' '}{tip.text}
                  </>
                ) : (
                  tip.text || tip
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Pre-defined tips for different pages
export const TIPS = {
  campaigns: [
    { highlight: 'Create Campaign:', text: 'Click "+ NEW CAMPAIGN" to start your adventure!' },
    { highlight: 'Manage:', text: 'Click "MANAGE" to access all your campaign tools - NPCs, locations, combat, and more.' },
    { highlight: 'GM Screen:', text: 'Inside a campaign, click "Open GM Screen" for live session tools.' },
    { highlight: 'Dice Roller:', text: 'The red dice button (bottom left) is available on every page! Press R to toggle.' },
  ],
  campaignDashboard: [
    { highlight: 'Setting:', text: 'Define your world\'s tone, theme, and core details.' },
    { highlight: 'World Tab:', text: 'Build your world hierarchy - Continents → Countries → Cities → Places.' },
    { highlight: 'ROOK:', text: 'Use the AI wand icon to auto-generate and save NPCs, Gods, and Locations!' },
    { highlight: 'Combat Tab:', text: 'Prepare encounters and see difficulty ratings before your session.' },
  ],
  gmScreen: [
    { highlight: 'Monsters:', text: 'Search and view any monster\'s full stat block instantly.' },
    { highlight: 'Names:', text: 'Generate random NPC names and save them directly to your campaign.' },
    { highlight: 'Tables:', text: 'Quick random generators for taverns, plot hooks, weather, and more.' },
    { highlight: 'Notes:', text: 'Jot down notes during play - they\'re saved to your campaign.' },
  ],
  combat: [
    { highlight: 'Add Combatants:', text: 'Add players and monsters from the database to build your encounter.' },
    { highlight: 'Difficulty:', text: 'The calculator shows if your encounter is Easy, Medium, Hard, or Deadly.' },
    { highlight: 'Loot:', text: 'Assign loot to enemies before combat - collect it when they\'re defeated!' },
    { highlight: 'Run Combat:', text: 'Click "Start Combat" to open the initiative tracker.' },
  ],
  worldBuilder: [
    { highlight: 'Hierarchy:', text: 'Build from big to small - Continents → Countries → Cities → Places.' },
    { highlight: 'Click to Expand:', text: 'Click any location to see what\'s inside it.' },
    { highlight: 'AI Generation:', text: 'Use the ROOK to auto-generate locations with descriptions!' },
    { highlight: 'Places of Interest:', text: 'Add taverns, shops, temples, and dungeons inside your cities.' },
  ],
  gettingStarted: [
    { highlight: 'Create:', text: 'Start with a character or campaign from the home dashboard.' },
    { highlight: 'Organize:', text: 'Use search, sorting, and source indexes to keep your table materials easy to find.' },
    { highlight: 'Play:', text: 'Open the GM screen during the session for dice, combat, notes, references, and AI tools.' },
  ],
  players: [
    { highlight: 'Add Players:', text: 'Create character sheets for your party members.' },
    { highlight: 'Stats:', text: 'Track AC, HP, abilities, and initiative modifiers.' },
    { highlight: 'Party Overview:', text: 'See your whole party at a glance in the GM Screen.' },
  ],
  npcs: [
    { highlight: 'Create NPCs:', text: 'Add shopkeepers, villains, allies, and more.' },
    { highlight: 'ROOK:', text: 'Click the wand to AI-generate a complete NPC instantly!' },
    { highlight: 'Name Generator:', text: 'Use the GM Screen\'s Names tab to generate names on the fly.' },
  ],
  locations: [
    { highlight: 'Add Locations:', text: 'Create cities, dungeons, taverns, and points of interest.' },
    { highlight: 'Places of Interest:', text: 'Expand a location to add shops, temples, and more inside.' },
    { highlight: 'Try World Builder:', text: 'The "World" tab offers a full continent → city hierarchy!' },
  ],
};

export default QuickTips;
