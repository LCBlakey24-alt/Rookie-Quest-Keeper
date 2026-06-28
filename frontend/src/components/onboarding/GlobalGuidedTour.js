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
      tourId: 'home-dashboard-v2',
      buttonLabel: 'Home tutorial',
      steps: [
        { title: 'Your home base', body: 'This is where you jump into campaigns, characters, and account tools. Start here when you are deciding what to work on next.', target: 'main, [data-testid="home-dashboard"], .dashboard-container', placement: 'center' },
        { title: 'Open a campaign', body: 'Campaign cards take you into the GM or player campaign space. If a campaign ever fails to open, use refresh or return here and try again.', target: '[data-testid="campaign-card"], [data-testid="recent-campaign-card"], button', placement: 'bottom' },
        { title: 'Characters live here too', body: 'Players can open character sheets from Home. Character sheets include rolls, play tools, notes, inventory, spells, and the optional physical roll logger.', target: '[data-testid="character-card"], a[href*="/characters/"]', placement: 'bottom' },
        { title: 'The help button stays here', body: 'Once a tour is done, it will not keep popping up. Use this tutorial button any time you want to replay the page guide.', target: '[data-testid="tutorial-replay-button"]', placement: 'bottom' },
      ],
    };
  }

  if (isCampaignPath(pathname)) {
    return {
      tourId: 'gm-dashboard-v2',
      buttonLabel: 'GM tutorial',
      steps: [
        { title: 'GM Command Centre', body: 'This page is your campaign cockpit. The main flow is Plan, Prep, Run, then Record what changed.', target: '.gm-dashboard-header', placement: 'bottom' },
        { title: 'Command group', body: 'Command is for the things you need immediately: the overview, tonight’s launchpad, players, invites, and opening Live Play.', target: '[data-testid="group-command"], .gm-sidebar', placement: 'right' },
        { title: 'Prep group', body: 'Prep is where the next session gets built. Story Arcs hold arcs, chapters, checkpoints, and combat beats. Session Notes record what happened. Handouts are what you reveal when the time is right.', target: '[data-testid="group-prep"], .gm-sidebar', placement: 'right' },
        { title: 'World group', body: 'World is your campaign bible: overview, locations, maps, and the chronicle of what has already happened.', target: '[data-testid="group-world"], .gm-sidebar', placement: 'right' },
        { title: 'People group', body: 'People is for NPCs, allies, villains, rulers, factions, gods, patrons, and any important figures the party might meet.', target: '[data-testid="group-people"], .gm-sidebar', placement: 'right' },
        { title: 'Table group', body: 'Table is the mechanical side of play: encounters, battle maps, inventory, and rewards.', target: '[data-testid="group-table"], .gm-sidebar', placement: 'right' },
        { title: 'Library group', body: 'Library is slower admin and optional material: uploads, campaign setup, world builder, optional tools, and playtest packs. You should not need this every session.', target: '[data-testid="group-library"], .gm-sidebar', placement: 'right' },
        { title: 'Current workspace', body: 'The big panel is the active tab. Each tab should answer one question: what am I planning, running, revealing, or recording right now?', target: 'main section', placement: 'top' },
        { title: 'Story Arcs workflow', body: 'Use Story Arcs to build the campaign spine. Chapters are planning containers, and checkpoints are the story moments players can reach, skip, or rush past.', target: '[data-testid="story-arcs-tab"], [data-testid="group-prep"]', placement: 'right' },
        { title: 'Tonight’s Session workflow', body: 'Tonight’s Session should be your pre-game checklist: current arc, current chapter, ready encounters, maps, reveals, notes, and players.', target: '[data-testid="tonight-tab"], [data-testid="group-command"]', placement: 'right' },
        { title: 'Live Play Mode', body: 'When the table starts, open Live Play. It gives you a focused session screen with combat, notes, handouts, player display controls, story checkpoint tracking, and end-session stats.', target: '[data-testid="open-dm-screen-btn"]', placement: 'bottom' },
      ],
    };
  }

  if (isLivePath(pathname)) {
    return {
      tourId: 'live-play-v2',
      buttonLabel: 'Live tutorial',
      steps: [
        { title: 'Live Play Mode', body: 'This is the in-session GM screen. It is designed to keep the table moving with fewer distractions than the full prep dashboard.', target: 'header', placement: 'bottom' },
        { title: 'Story focus strip', body: 'This strip shows the active arc, current chapter, next checkpoint, and lets you mark story progress without leaving Live Play.', target: '[data-testid="live-story-focus-panel"]', placement: 'bottom' },
        { title: 'Live tools sidebar', body: 'The left menu switches between focused table tools. During play, think in terms of Combat, Party, Notes, Handouts, Player Display, Maps, NPCs, and Reference.', target: '[data-testid="live-session-grid"] > aside:first-child', placement: 'right' },
        { title: 'Overview tool', body: 'Overview is your quick launch area. It points you to the most common actions without making you hunt through the whole GM dashboard.', target: '[data-testid="live-session-grid"] main', placement: 'top' },
        { title: 'Combat tool', body: 'Combat is for starting encounters and running fights. Prep detailed encounters before the session, then launch them from here.', target: '[data-testid="live-session-grid"] main', placement: 'top' },
        { title: 'Notes tool', body: 'Notes are for recording what changed at the table. Good notes become recap material, chronicle entries, and future consequences.', target: '[data-testid="live-session-grid"] main', placement: 'top' },
        { title: 'Player Display tool', body: 'Use Player Display to send scenes, images, NPCs, combat views, and end-session stats to the extended browser tab or TV.', target: '[data-testid="live-session-grid"] main', placement: 'top' },
        { title: 'Quick rail', body: 'The right rail keeps fast dice and fast switches close to hand. It is there for table pressure moments.', target: '[data-testid="live-session-grid"] aside:last-child', placement: 'left' },
        { title: 'End Session', body: 'Use End Session when the game wraps. You can review player roll stats first, choose presentation options, then send the animated recap to the player display.', target: 'button', placement: 'bottom' },
      ],
    };
  }

  if (isPlayerDisplay(pathname)) {
    return {
      tourId: 'player-display-v2',
      buttonLabel: 'Display tutorial',
      steps: [
        { title: 'Player Display', body: 'This page is meant for a second browser tab, TV, or projector. The GM controls what appears here from Live Play.', target: '[data-testid="player-display-page"]', placement: 'center' },
        { title: 'Use fullscreen', body: 'Press Fullscreen when showing this to players. It works best as a clean theatre-style display.', target: 'button', placement: 'bottom' },
        { title: 'Scene reveals', body: 'The GM can send scene titles, images, NPC grids, combat displays, and handout-style reveals here.', target: '[data-testid="player-display-page"]', placement: 'center' },
        { title: 'End-session show', body: 'At the end of a session this display can become an animated player stats presentation, showing Nat 20s, Nat 1s, awards, and all-time totals.', target: '[data-testid="player-display-page"]', placement: 'center' },
      ],
    };
  }

  if (isCharacterSheet(pathname)) {
    return {
      tourId: 'character-sheet-v2',
      buttonLabel: 'Sheet tutorial',
      steps: [
        { title: 'Character sheet', body: 'This is the player’s main table screen. It keeps actions, rolls, HP, conditions, inventory, spells, and notes close by.', target: 'main, [data-testid="clean-character-sheet"]', placement: 'center' },
        { title: 'Turn strip', body: 'The turn strip gives fast table status: roll mode, passive perception, conditions, hit dice, and concentration.', target: '[data-testid="player-turn-strip"]', placement: 'bottom' },
        { title: 'Play tools', body: 'Use the play tools for roll mode, rests, conditions, concentration, death saves, and physical roll logging.', target: '[data-testid="mobile-play-essentials"]', placement: 'bottom' },
        { title: 'Physical roll logger', body: 'If you roll real dice, typing the result here helps build the end-session stats and player awards. It is optional, so it should not slow down the table.', target: '[data-testid="physical-roll-logger"]', placement: 'top' },
        { title: 'Roll history', body: 'Roll history helps you quickly check what happened recently without scrolling through chat or asking the table to remember.', target: '[data-testid="roll-history-panel"]', placement: 'top' },
      ],
    };
  }

  if (pathname.startsWith('/characters/new')) {
    return {
      tourId: 'character-builder-v2',
      buttonLabel: 'Builder tutorial',
      steps: [
        { title: 'Character Builder', body: 'The builder walks you through making a character step by step. Use it at your own pace and save progress as you go.', target: 'main, .character-builder, [data-testid="character-builder"]', placement: 'center' },
        { title: 'Follow the steps', body: 'Move through race/species, class, abilities, equipment, spells, and finishing details. If something feels wrong, go back a step rather than starting over.', target: 'button, nav', placement: 'bottom' },
        { title: 'Rules choices matter', body: 'Selections like species, class, background, abilities, and spells shape what appears on the finished sheet.', target: 'main', placement: 'center' },
        { title: 'Finish to create sheet', body: 'When the build is complete, the character becomes a playable sheet that can connect to campaign sessions and roll stats.', target: 'main', placement: 'center' },
      ],
    };
  }

  if (pathname === '/player' || pathname.startsWith('/mobile')) {
    return {
      tourId: 'player-dashboard-v2',
      buttonLabel: 'Player tutorial',
      steps: [
        { title: 'Player dashboard', body: 'This area is for players to open joined campaigns and characters quickly.', target: 'main, [data-testid="player-dashboard"]', placement: 'center' },
        { title: 'Open your character', body: 'Open your sheet before the session starts so rolls, notes, HP, and stats are ready.', target: 'a[href*="/characters/"], button', placement: 'bottom' },
        { title: 'Join campaigns', body: 'Use a GM join code to connect your character to a campaign. Once linked, your rolls can count toward session recaps.', target: 'main', placement: 'center' },
        { title: 'During the session', body: 'Use your character sheet for rolls and table status. If you roll physical dice, log important d20 rolls so the end-session recap has better stats.', target: 'main', placement: 'center' },
      ],
    };
  }

  return {
    tourId: `page-${pathname.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'root'}-v2`,
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
