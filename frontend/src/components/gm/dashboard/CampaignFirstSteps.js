import React, { useEffect, useState } from 'react';
import { Check, ChevronRight, X } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import './CampaignFirstSteps.css';

const hiddenKey = (campaignId) => `rqk.firstSteps.hidden.${campaignId}`;

function readHidden(campaignId) {
  try { return localStorage.getItem(hiddenKey(campaignId)) === '1'; } catch { return false; }
}

/**
 * A short checklist for a new campaign: what to do first, each step one
 * tap away. Steps tick themselves off from the campaign's own records and
 * the card goes away when they are all done (or the GM hides it).
 */
export default function CampaignFirstSteps({ campaignId, counts = {}, onOpenTab, onOpenLive }) {
  const [hidden, setHidden] = useState(() => readHidden(campaignId));
  const [encounters, setEncounters] = useState(null);
  // Ask for the encounter count only while the checklist is showing.
  const needsEncounterCount = !hidden;

  useEffect(() => { setHidden(readHidden(campaignId)); }, [campaignId]);
  useEffect(() => {
    if (!needsEncounterCount || !campaignId) return undefined;
    let cancelled = false;
    apiClient.get(`/campaigns/${campaignId}/combat-scenarios`)
      .then((response) => { if (!cancelled) setEncounters(Array.isArray(response.data) ? response.data.length : 0); })
      .catch(() => { if (!cancelled) setEncounters(null); });
    return () => { cancelled = true; };
  }, [campaignId, needsEncounterCount]);

  const steps = [
    { id: 'players', title: 'Invite your players', help: 'Share the join code so they can link their characters.', done: counts.players > 0, open: () => onOpenTab('players') },
    { id: 'quests', title: 'Add a first quest', help: 'What is the party trying to do?', done: counts.quests > 0, open: () => onOpenTab('story-arcs') },
    { id: 'npcs', title: 'Add an NPC or two', help: 'The people they will meet first.', done: counts.npcs > 0, open: () => onOpenTab('npcs') },
    { id: 'combat', title: 'Prepare an encounter', help: 'Ready to start in one tap during play.', done: (encounters || 0) > 0, open: () => onOpenTab('combat') },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  if (hidden || doneCount === steps.length) return null;

  const hide = () => {
    try { localStorage.setItem(hiddenKey(campaignId), '1'); } catch { /* still hide for now */ }
    setHidden(true);
  };

  return (
    <section className="rqk-first-steps" aria-labelledby="rqk-first-steps-title" data-testid="campaign-first-steps">
      <header>
        <div>
          <p>Getting started · {doneCount} of {steps.length} done</p>
          <h2 id="rqk-first-steps-title">First steps for this campaign</h2>
        </div>
        <button type="button" className="rqk-first-steps__hide" onClick={hide} aria-label="Hide first steps"><X size={18} aria-hidden="true" /></button>
      </header>
      <ol>
        {steps.map((step) => (
          <li key={step.id} className={step.done ? 'is-done' : ''}>
            <button type="button" onClick={step.open} data-testid={`first-step-${step.id}`}>
              <span className="rqk-first-steps__mark" aria-hidden="true">{step.done ? <Check size={16} /> : null}</span>
              <span className="rqk-first-steps__text">
                <strong>{step.title}</strong>
                <small>{step.done ? 'Done' : step.help}</small>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      {onOpenLive && <p className="rqk-first-steps__live">When you are ready, <button type="button" onClick={onOpenLive}>open Live Play</button> to run the session.</p>}
    </section>
  );
}
