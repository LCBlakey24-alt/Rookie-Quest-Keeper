import React, { useState, useEffect } from 'react';
import { X, Lightbulb, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Rook Guide - First-time user tips for each tab/page
// Stored in localStorage to remember dismissed guides

const GUIDE_STORAGE_KEY = 'rook_guides_dismissed';

// Guide content for each tab/page
const GUIDE_CONTENT = {
  // Main Dashboard
  'dashboard-player': {
    title: "Welcome to Your Player Hub!",
    icon: '🎮',
    tips: [
      "This is where all your characters live. Click on any character to view their full sheet.",
      "Use the '+ New Character' button to create a new hero with Rook's AI-powered character builder.",
      "Characters can join campaigns when your GM invites you!"
    ],
    color: '#D4A017'
  },
  'dashboard-gm': {
    title: "Welcome to the GM Command Center!",
    icon: '👑',
    tips: [
      "Your campaigns are listed here. Click any campaign to manage it.",
      "Hit '+ New Campaign' to start a fresh adventure.",
      "Each campaign has its own world, NPCs, locations, and maps!"
    ],
    color: '#D4A017'
  },
  
  // Campaign Dashboard Tabs
  'setting': {
    title: "Campaign Settings",
    icon: '📖',
    tips: [
      "Set up your campaign's basic info, description, and rule system.",
      "This is the first thing players see when they join your campaign.",
      "You can update these anytime as your world evolves."
    ],
    color: '#D4A017'
  },
  'world': {
    title: "World Builder",
    icon: '🌍',
    tips: [
      "Build your world from scratch - continents, regions, and lore.",
      "Use the AI to help generate descriptions and history.",
      "Link locations together to create an interconnected world."
    ],
    color: '#D4A017'
  },
  'world-map': {
    title: "World Map",
    icon: '🗺️',
    tips: [
      "Upload a map image of your world (PNG, JPG up to 10MB).",
      "Click on the map to add location pins (cities, dungeons, points of interest).",
      "Create paths between locations to calculate travel times!",
      "Use 'Travel Mode' to plan party journeys with different travel speeds."
    ],
    color: '#D4A017'
  },
  'local-maps': {
    title: "Local Maps",
    icon: '🏘️',
    tips: [
      "Upload detailed maps of cities, towns, or dungeons.",
      "Add pins for shops, taverns, temples, and other points of interest.",
      "Perfect for when the party arrives in a new location!",
      "Link local maps to world map locations for easy navigation."
    ],
    color: '#D4A017'
  },
  // Consolidated Maps tab
  'maps': {
    title: "Maps Hub",
    icon: '🗺️',
    tips: [
      "Switch between World Map and Local Maps using the tabs above.",
      "World Map: Pin cities, dungeons, and calculate travel times between locations.",
      "Local Maps: Detail city streets, dungeon rooms, and points of interest.",
      "Upload custom images or use the pin system to mark important locations."
    ],
    color: '#D4A017'
  },
  // Consolidated Chronicle tab
  'chronicle': {
    title: "Campaign Chronicle",
    icon: '📜',
    tips: [
      "Track your campaign's history with the Session Timeline.",
      "Use the In-Game Calendar to manage in-world time and events.",
      "Add major events, milestones, and story beats to keep everything organized.",
      "Perfect for session recaps and remembering key moments!"
    ],
    color: '#D4A017'
  },
  // Consolidated Combat tab
  'combat': {
    title: "Combat Hub",
    icon: '⚔️',
    tips: [
      "Pre-build encounters in Combat Setup before your session.",
      "Use the Encounter Generator for quick random encounters.",
      "Set initiative, add monsters from the database, and run smooth combat.",
      "Balance encounters for your party's level automatically."
    ],
    color: '#F97316'
  },
  // Consolidated Tools tab
  'tools': {
    title: "GM Tools",
    icon: '🛠️',
    tips: [
      "Quick Reference: Look up spells, items, monsters, and rules instantly.",
      "Random Generators: Generate names, loot, NPCs, and more on the fly.",
      "Essential tools for keeping your session running smoothly!",
      "Search and filter through thousands of 5e items and spells."
    ],
    color: '#D4A017'
  },
  // Consolidated Inventory tab
  'inventory': {
    title: "Inventory Hub",
    icon: '🎒',
    tips: [
      "Party Loot: Track all the treasure your party has collected.",
      "Item Creator: Design custom magic items and equipment.",
      "Players can see the shared inventory - great for party coordination!",
      "Mark items as identified, attuned, or carried by specific characters."
    ],
    color: '#22C55E'
  },
  'locations': {
    title: "Location Manager",
    icon: '📍',
    tips: [
      "Create and manage all locations in your world.",
      "Add NPCs, shops, and secrets to each location.",
      "Locations can be linked to map pins for visual navigation."
    ],
    color: '#D4A017'
  },
  'npcs': {
    title: "NPC Manager",
    icon: '👥',
    tips: [
      "Create memorable NPCs with stats, personality, and secrets.",
      "Use the AI to generate NPC backstories and motivations.",
      "Assign NPCs to locations so you always know who's where."
    ],
    color: '#D4A017'
  },
  'npc-web': {
    title: "NPC Relationship Web",
    icon: '🕸️',
    tips: [
      "Visualize how NPCs connect to each other.",
      "Draw relationship lines: allies, enemies, family, rivals.",
      "Great for tracking political intrigue and social dynamics!"
    ],
    color: '#D4A017'
  },
  'timeline': {
    title: "Session Timeline",
    icon: '📅',
    tips: [
      "Track your campaign's history session by session.",
      "Add events, milestones, and key moments.",
      "Never forget what happened - great for recaps!"
    ],
    color: '#D4A017'
  },
  'random-gen': {
    title: "Random Generators",
    icon: '🎲',
    tips: [
      "Generate random names, treasures, encounters, and more.",
      "Perfect for improv moments when you need something fast.",
      "Save favorites to use later in your campaign."
    ],
    color: '#D4A017'
  },
  'gods': {
    title: "Pantheon Manager",
    icon: '⚡',
    tips: [
      "Create gods and deities for your world's religions.",
      "Define domains, holy symbols, and commandments.",
      "Link clerics and paladins to their patron deities."
    ],
    color: '#D4A017'
  },
  'players': {
    title: "Player Management",
    icon: '🎭',
    tips: [
      "Invite players to your campaign using invite codes.",
      "See which characters are in your campaign.",
      "Manage player access and permissions."
    ],
    color: '#D4A017'
  },
  'combat-creator': {
    title: "Combat Setup",
    icon: '⚔️',
    tips: [
      "Pre-build encounters before your session.",
      "Add monsters, set initiative, prepare battle maps.",
      "Launch combat directly from here when ready!"
    ],
    color: '#F97316'
  },
  'encounter-gen': {
    title: "Encounter Generator",
    icon: '🐉',
    tips: [
      "Generate balanced encounters for your party's level.",
      "Mix monster types for interesting combat.",
      "Save encounters to use across sessions."
    ],
    color: '#F97316'
  },
  'items': {
    title: "Item Creator",
    icon: '💎',
    tips: [
      "Create custom magic items and equipment.",
      "Set rarity, properties, and lore.",
      "Add items directly to party loot or shop inventories."
    ],
    color: '#F97316'
  },
  'party-loot': {
    title: "Party Inventory",
    icon: '🎒',
    tips: [
      "Track all the loot your party has collected.",
      "Players can see this too - great for shared inventory!",
      "Mark items as identified or unidentified."
    ],
    color: '#22C55E'
  },
  'session-recap': {
    title: "AI Session Recap",
    icon: '📝',
    tips: [
      "Let AI help you write session summaries.",
      "Add key events and let Rook fill in the details.",
      "Share recaps with your players to keep everyone caught up."
    ],
    color: '#D4A017'
  },
  'calendar': {
    title: "Campaign Calendar",
    icon: '📆',
    tips: [
      "Track in-game time and events.",
      "Schedule festivals, holidays, and important dates.",
      "Never lose track of how many days have passed!"
    ],
    color: '#D4A017'
  },
  'ingame-notes': {
    title: "Session Notes",
    icon: '✏️',
    tips: [
      "Take notes during your session.",
      "Organize by session or topic.",
      "Quick access to important details mid-game."
    ],
    color: '#22C55E'
  },
  'party-tracker': {
    title: "Party Location Tracker",
    icon: '🧭',
    tips: [
      "Track where your party is on the world map in real-time.",
      "See nearby locations and estimated travel times.",
      "Perfect for session play - know what's close by!"
    ],
    color: '#22C55E'
  },
  'npc-quick-ref': {
    title: "NPC Quick Reference",
    icon: '⚡',
    tips: [
      "Quick access to your most important NPCs during play.",
      "Filter by location, role, or faction.",
      "One-click to see full NPC details without leaving the screen."
    ],
    color: '#22C55E'
  },
  
  // Character Sheet
  'character-sheet': {
    title: "Your Character Sheet",
    icon: '📜',
    tips: [
      "Everything about your character in one place.",
      "Click on stats, skills, or abilities to see details.",
      "Use the Level Up button when you gain enough XP!",
      "Your GM can see your sheet during sessions."
    ],
    color: '#D4A017'
  },
  
  // GM Screen
  'gm-screen': {
    title: "GM Live Session Screen",
    icon: '🎬',
    tips: [
      "Your command center during live play.",
      "Quick access to rules, NPCs, and locations.",
      "Use the dice roller for any rolls you need.",
      "Everything updates in real-time!"
    ],
    color: '#D4A017'
  }
};

// Get dismissed guides from localStorage
const getDismissedGuides = () => {
  try {
    const stored = localStorage.getItem(GUIDE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save dismissed guide to localStorage
const dismissGuide = (guideId) => {
  try {
    const dismissed = getDismissedGuides();
    if (!dismissed.includes(guideId)) {
      dismissed.push(guideId);
      localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(dismissed));
    }
  } catch (e) {
    console.error('Failed to save guide dismissal:', e);
  }
};

// Check if guide should show
const shouldShowGuide = (guideId) => {
  const dismissed = getDismissedGuides();
  return !dismissed.includes(guideId);
};

// Reset all guides (for testing or user preference)
export const resetAllGuides = () => {
  localStorage.removeItem(GUIDE_STORAGE_KEY);
};

// Main RookGuide Component
export function RookGuide({ guideId, variant = 'tooltip', position = 'bottom' }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const guide = GUIDE_CONTENT[guideId];
  
  useEffect(() => {
    if (guide && shouldShowGuide(guideId)) {
      // Small delay to ensure page is rendered
      const timer = setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [guideId, guide]);
  
  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      dismissGuide(guideId);
    }, 300);
  };
  
  if (!guide || !isVisible) return null;
  
  const themeColor = guide.color || '#D4A017';
  
  // Tooltip variant - small floating tip
  if (variant === 'tooltip') {
    return (
      <div
        data-testid={`rook-guide-${guideId}`}
        style={{
          position: 'absolute',
          [position]: position === 'top' ? '-10px' : 'auto',
          [position === 'top' ? 'bottom' : 'top']: position === 'top' ? 'auto' : '-10px',
          left: '50%',
          transform: `translateX(-50%) translateY(${position === 'top' ? '-100%' : '100%'}) scale(${isAnimating ? 1 : 0.9})`,
          background: '#0F2440',
          border: `1px solid ${themeColor}`,
          borderRadius: '8px',
          padding: '12px 16px',
          maxWidth: '280px',
          zIndex: 1000,
          boxShadow: `0 4px 20px ${themeColor}30`,
          opacity: isAnimating ? 1 : 0,
          transition: 'all 0.3s ease-out'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>{guide.icon}</span>
          <div style={{ flex: 1 }}>
            <p style={{ 
              color: '#fff', 
              margin: 0, 
              fontSize: '13px',
              lineHeight: '1.4'
            }}>
              {guide.tips[0]}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
              color: '#808080'
            }}
          >
            <X size={14} />
          </button>
        </div>
        {/* Arrow pointer */}
        <div style={{
          position: 'absolute',
          [position === 'top' ? 'bottom' : 'top']: '-6px',
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          width: '12px',
          height: '12px',
          background: '#0F2440',
          border: `1px solid ${themeColor}`,
          borderTop: position === 'top' ? `1px solid ${themeColor}` : 'none',
          borderLeft: position === 'top' ? `1px solid ${themeColor}` : 'none',
          borderBottom: position === 'top' ? 'none' : `1px solid ${themeColor}`,
          borderRight: position === 'top' ? 'none' : `1px solid ${themeColor}`
        }} />
      </div>
    );
  }
  
  // Card variant - larger info card
  return (
    <div
      data-testid={`rook-guide-${guideId}`}
      style={{
        background: 'linear-gradient(135deg, #0F2440 0%, #0A1628 100%)',
        border: `1px solid ${themeColor}`,
        borderLeft: `4px solid ${themeColor}`,
        padding: '20px',
        marginBottom: '20px',
        opacity: isAnimating ? 1 : 0,
        transform: `translateY(${isAnimating ? 0 : -10}px)`,
        transition: 'all 0.4s ease-out',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Subtle glow effect */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: `linear-gradient(90deg, transparent, ${themeColor}, transparent)`,
        opacity: 0.5
      }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: `${themeColor}20`,
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Lightbulb size={20} color={themeColor} />
          </div>
          <div>
            <h4 style={{ 
              color: themeColor, 
              margin: 0, 
              fontSize: '16px',
              fontWeight: '400',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '20px' }}>{guide.icon}</span>
              {guide.title}
            </h4>
            <span style={{ color: '#808080', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Rook's Tips
            </span>
          </div>
        </div>
        <Button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '4px',
            cursor: 'pointer'
          }}
        >
          <X size={18} color="#808080" />
        </Button>
      </div>
      
      <ul style={{ 
        margin: 0, 
        paddingLeft: '20px',
        listStyle: 'none'
      }}>
        {guide.tips.map((tip, index) => (
          <li 
            key={index}
            style={{ 
              color: '#B3B3B3', 
              fontSize: '13px',
              lineHeight: '1.6',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}
          >
            <ChevronRight size={14} color={themeColor} style={{ marginTop: '3px', flexShrink: 0 }} />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
      
      <div style={{ 
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
        <Button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: `1px solid ${themeColor}40`,
            color: themeColor,
            padding: '6px 16px',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${themeColor}20`;
            e.currentTarget.style.borderColor = themeColor;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = `${themeColor}40`;
          }}
        >
          Got it, thanks!
        </Button>
      </div>
    </div>
  );
}

// Hook to use Rook Guide
export function useRookGuide(guideId) {
  const [hasSeenGuide, setHasSeenGuide] = useState(true);
  
  useEffect(() => {
    setHasSeenGuide(!shouldShowGuide(guideId));
  }, [guideId]);
  
  const markAsSeen = () => {
    dismissGuide(guideId);
    setHasSeenGuide(true);
  };
  
  return {
    hasSeenGuide,
    markAsSeen,
    guide: GUIDE_CONTENT[guideId]
  };
}

export default RookGuide;
