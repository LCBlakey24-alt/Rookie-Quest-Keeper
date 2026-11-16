import React from 'react';
import {
  ArrowLeft, ArrowRight, BookOpen, Compass, FileText, Map,
  Monitor, ScrollText, Search, Swords, Users,
} from 'lucide-react';
import './CampaignModeChooser.css';

/**
 * The entry point for one GM-owned campaign. Both choices reuse the same
 * campaign and existing tools; choosing a mode never copies or edits data.
 */
export default function CampaignModeChooser({ campaign, onBack, onCreation, onLive }) {
  const name = campaign?.name || 'Your campaign';
  const description = String(campaign?.description || '').trim();

  return (
    <main className="rqk-campaign-mode-page" data-testid="campaign-mode-selector">
      <header className="rqk-campaign-mode-header">
        <button type="button" className="rqk-campaign-mode-back" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          My Campaigns
        </button>
        <div className="rqk-campaign-mode-heading">
          <p className="rqk-campaign-mode-eyebrow">Campaign workspace</p>
          <h1>{name}</h1>
          {description && <p className="rqk-campaign-mode-description">{description}</p>}
        </div>
      </header>

      <section className="rqk-campaign-mode-section" aria-labelledby="campaign-mode-heading">
        <div className="rqk-campaign-mode-intro">
          <h2 id="campaign-mode-heading">Choose how to work</h2>
          <p>Prepare your campaign or open your tools for the table. You can switch modes at any time.</p>
        </div>
        <div className="rqk-campaign-mode-grid">
          <button
            type="button"
            onClick={onCreation}
            className="rqk-campaign-mode-option rqk-campaign-mode-option--creation"
            aria-label={`Open Creation Mode for ${name}`}
            data-testid="campaign-mode-creation"
          >
            <span className="rqk-campaign-mode-option-top">
              <span className="rqk-campaign-mode-icon"><BookOpen size={27} aria-hidden="true" /></span>
              <span className="rqk-campaign-mode-kicker">Build & prepare</span>
            </span>
            <strong className="rqk-campaign-mode-option-title">Creation Mode</strong>
            <span className="rqk-campaign-mode-option-description">
              Create, edit and organise the world. Build quests, NPCs, locations, maps and encounters at your own pace.
            </span>
            <span className="rqk-campaign-mode-tools" aria-hidden="true">
              <span><ScrollText size={16} /> Quests</span>
              <span><Users size={16} /> NPCs & party</span>
              <span><Map size={16} /> Maps & world</span>
              <span><Swords size={16} /> Encounters</span>
            </span>
            <span className="rqk-campaign-mode-option-action">
              Enter Creation Mode <ArrowRight size={19} aria-hidden="true" />
            </span>
          </button>

          <button
            type="button"
            onClick={onLive}
            className="rqk-campaign-mode-option rqk-campaign-mode-option--live"
            aria-label={`Open Live Play Mode for ${name}`}
            data-testid="campaign-mode-live"
          >
            <span className="rqk-campaign-mode-option-top">
              <span className="rqk-campaign-mode-icon"><Monitor size={27} aria-hidden="true" /></span>
              <span className="rqk-campaign-mode-kicker">Run & react</span>
            </span>
            <strong className="rqk-campaign-mode-option-title">Live Play Mode</strong>
            <span className="rqk-campaign-mode-option-description">
              Find information quickly during the game. Run encounters, check characters and rules, and capture what changes.
            </span>
            <span className="rqk-campaign-mode-tools" aria-hidden="true">
              <span><Compass size={16} /> Quick access</span>
              <span><Search size={16} /> Find tools</span>
              <span><Swords size={16} /> Combat</span>
              <span><FileText size={16} /> Live notes</span>
            </span>
            <span className="rqk-campaign-mode-option-action">
              Enter Live Play <ArrowRight size={19} aria-hidden="true" />
            </span>
          </button>
        </div>
        <p className="rqk-campaign-mode-footnote">
          Both modes use the same saved campaign. Live Play works with any quest or encounter; you do not have to plan a fixed session.
        </p>
      </section>
    </main>
  );
}
