import React from 'react';

export const LOADING_TIPS = [
  'Table tip: decide your action, bonus action, and movement before your turn starts to keep combat snappy.',
  'Rules reminder: reactions are usually limited to one per round, so use them when they matter.',
  'GM tip: secrets hit harder when players receive them at the exact moment they become useful.',
  'Player tip: if you are not sure what to do, check your Actions tab first — attack, help, dodge, dash, hide, and ready are all valid choices.',
  'Table tip: write down names of NPCs as soon as they appear. Future-you will be deeply smug about it.',
  'Spell tip: prepared spells are your daily toolkit; known spells are the wider list your character has learned.',
  'GM tip: reward items are more exciting when they arrive instantly and clearly on the player sheet.',
  'Player tip: conditions can change your whole turn. Check them before rolling.',
  'Table tip: a fast ruling now is often better than a perfect answer after ten minutes of book diving.',
  'Character tip: your strongest move is not always damage — helping, protecting, moving, or setting up an ally can win the scene.'
];

export default function RouteLoadingScreen() {
  const tip = React.useMemo(() => LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)], []);
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true" />
      <p className="loading-title">Opening Rookie Quest Keeper…</p>
      <p className="loading-tip">{tip}</p>
    </div>
  );
}
