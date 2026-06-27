import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import GuidedTour from '@/components/onboarding/GuidedTour';

function isCampaignPath(pathname) {
  return /^\/campaign\/[^/]+$/.test(pathname);
}

function isLivePath(pathname) {
  return pathname.startsWith('/gm-screen/') || /^\/campaign\/[^/]+\/live$/.test(pathname);
}

function isPlayerDisplay(pathname) {
  return pathname.includes('/player-display') || pathname.endsWith('/display');
}

function isCharacterSheet(pathname) {
  return /^\/characters\/[^/]+$/.test(pathname);
}

function getTourForPath(pathname) {
  if (pathname === '/home') {
    return {
      tourId: 'home-dashboard-v1',
      buttonLabel: 'Home tutorial',
      steps: [
        { title: 'Your home base', body: 'This is where you jump into campaigns, characters, and account tools. Start here when you are deciding what to work on next.', target: 'main, [data-testid="home-dashboard"], .dashboard-container', placement: 'center' },
        { title: 'Open a campaign', body: 'Campaign cards take you into the GM or player campaign space. If a campaign ever fails to open, use refresh or return here and try again.', target: '[data-testid="campaign-card"], [data-testid="recent-campaign-card"], button', placement: 'bottom' },
        { title: 'Characters live here too', body: 'Players can open character sheets from Home. Character sheets include rolls, play tools, notes, inventory, spells, and the optional physical roll logger.', target: '[data-testid="character-card"], a[href*="/characters/"]', placement: 'bottom' },
      ],
    };
  }

  if (isCampaignPath(pathname)) {
    return {
      tourId: 'gm-dashboard-v1',
      buttonLabel: 'GM tutorial',
      steps: [
        { title: 'GM Command Centre', body: 'This page is your campaign cockpit. The main flow is Plan, Prep, Run, then Record what changed.', target: '.gm-dashboard-header', placement: 'bottom' },
        { title: 'Campaign tools sidebar', body: 'Use the left menu to move between GM areas. Command is for launch points, Prep is for story/session setup, World and People hold your campaign bible, and Table is for combat/rewards.', target: '.gm-sidebar', placement: 'right' },
        { title: 'Current workspace', body: 'The big panel is the active tab. Each tab should answer one question: what am I planning, running, revealing, or recording right now?', target: 'main section', placement: 'top' },
        { title: 'Story Arcs', body: 'Use Story Arcs to build arcs, chapters, checkpoints, and combat beats. Checkpoints are what let a session keep going if players rush past the planned ending.', target: '[data-testid="story-arcs-tab"]', placement: 'right' },
        { title: 'Live Play Mode', body: 'When the table starts, open Live Play. It gives you a focused session screen with combat, notes, handouts, player display controls, and end-session stats.', target: '[data-testid="open-dm-screen-btn"]', placement: 'bottom' },
      ],
    };
  }

  if (isLivePath(pathname)) {
    return {
      tourId: 'live-play-v1',
      buttonLabel: 'Live tutorial',
      steps: [
        { title: 'Live Play Mode', body: 'This is the in-session GM screen. It is designed to keep the table moving with fewer distractions than the full prep dashboard.', target: 'header', placement: 'bottom' },
        { title: 'Story focus strip', body: 'This strip shows the active arc, current chapter, next checkpoint, and lets you mark story progress without leaving Live Play.', target: '[data-testid="live-story-focus-panel"]', placement: 'bottom' },
        { title: 'Live tools', body: 'The left menu switches between focused table tools like Combat, Notes, Handouts, Player Display, Maps, NPCs, and Reference.', target: '[data-testid="live-session-grid"] > aside:first-child', placement: 'right' },
        { title: 'Main live workspace', body: 'Only one tool takes centre stage at a time. This keeps the GM screen calmer during play.', target: '[data-testid="live-session-grid"] main', placement: 'top' },
        { title: 'End Session', body: 'Use End Session when the game wraps. You can review player roll stats first, then send the animated recap to the player display.', target: 'button', placement: 'bottom' },
      ],
    };
  }

  if (isPlayerDisplay(pathname)) {
    return {
      tourId: 'player-display-v1',
      buttonLabel: 'Display tutorial',
      steps: [
        { title: 'Player Display', body: 'This page is meant for a second browser tab, TV, or projector. The GM controls what appears here from Live Play.', target: '[data-testid="player-display-page"]', placement: 'center' },
        { title: 'Use fullscreen', body: 'Press Fullscreen when showing this to players. It works best as a clean theatre-style display.', target: 'button', placement: 'bottom' },
        { title: 'Reveals and recaps', body: 'Scenes, images, NPCs, combat displays, and animated end-session stats can appear here when the GM sends them.', target: '[data-testid="player-display-page"]', placement: 'center' },
      ],
    };
  }

  if (isCharacterSheet(pathname)) {
    return {
      tourId: 'character-sheet-v1',
      buttonLabel: 'Sheet tutorial',
      steps: [
        { title: 'Character sheet', body: 'This is the player’s main table screen. It keeps actions, rolls, HP, conditions, inventory, spells, and notes close by.', target: 'main, [data-testid="clean-character-sheet"]', placement: 'center' },
        { title: 'Play tools', body: 'Use the play tools for roll mode, rests, conditions, concentration, death saves, and physical roll logging.', target: '[data-testid="mobile-play-essentials"], [data-testid="player-turn-strip"]', placement: 'bottom' },
        { title: 'Physical roll logger', body: 'If you roll real dice, typing the result here helps build the end-session stats and player awards.', target: '[data-testid="physical-roll-logger"]', placement: 'top' },
      ],
    };
  }

  if (pathname.startsWith('/characters/new')) {
    return {
      tourId: 'character-builder-v1',
      buttonLabel: 'Builder tutorial',
      steps: [
        { title: 'Character Builder', body: 'The builder walks you through making a character step by step. Use it at your own pace and save progress as you go.', target: 'main, .character-builder, [data-testid="character-builder"]', placement: 'center' },
        { title: 'Follow the steps', body: 'Move through race/species, class, abilities, equipment, spells, and finishing details. If something feels wrong, go back a step rather than starting over.', target: 'button, nav', placement: 'bottom' },
        { title: 'Finish to create sheet', body: 'When the build is complete, the character becomes a playable sheet that can connect to campaign sessions and roll stats.', target: 'main', placement: 'center' },
      ],
    };
  }

  if (pathname === '/player' || pathname.startsWith('/mobile')) {
    return {
      tourId: 'player-dashboard-v1',
      buttonLabel: 'Player tutorial',
      steps: [
        { title: 'Player dashboard', body: 'This area is for players to open joined campaigns and characters quickly.', target: 'main, [data-testid="player-dashboard"]', placement: 'center' },
        { title: 'Open your character', body: 'Open your sheet before the session starts so rolls, notes, HP, and stats are ready.', target: 'a[href*="/characters/"], button', placement: 'bottom' },
        { title: 'Join campaigns', body: 'Use a GM join code to connect your character to a campaign. Once linked, your rolls can count toward session recaps.', target: 'main', placement: 'center' },
      ],
    };
  }

  return {
    tourId: `page-${pathname.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'root'}-v1`,
    buttonLabel: 'Page tutorial',
    steps: [
      { title: 'Page guide', body: 'This tutorial button gives first-time help on supported pages. More detailed tours will be added as each area gets polished.', target: 'main, body', placement: 'center' },
      { title: 'Look for the main action', body: 'Most pages have one main job: build, prep, run, reveal, or record. Start with the largest panel or the strongest red action button.', target: 'main, body', placement: 'center' },
    ],
  };
}

export default function GlobalGuidedTour({ isAuthenticated = false }) {
  const location = useLocation();
  const pathname = location.pathname;
  const tour = useMemo(() => getTourForPath(pathname), [pathname]);

  if (!isAuthenticated) return null;
  if (pathname === '/' || pathname === '/auth') return null;
  if (!tour?.steps?.length) return null;

  return (
    <div style={launcherWrapStyle}>
      <GuidedTour tourId={tour.tourId} steps={tour.steps} buttonLabel={tour.buttonLabel} autoStart />
    </div>
  );
}

const launcherWrapStyle = {
  position: 'fixed',
  left: 14,
  bottom: 14,
  zIndex: 4500,
};
