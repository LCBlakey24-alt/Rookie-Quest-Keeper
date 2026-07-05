import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/characterCreationModePicker.css';
import { ChevronLeft, ChevronRight, Clock, Sparkles, Wand2, Zap, Search } from 'lucide-react';
import { characterCreationModes } from '../data/characterCreationModes';

const icons = { full: Wand2, basic: Zap, matchmaker: Search };

export default function CharacterCreationModePicker() {
  const navigate = useNavigate();

  return (
    <main className="character-mode-page">
      <div className="character-mode-shell">
        <button onClick={() => navigate('/characters')} data-testid="mode-picker-back" className="character-mode-back"><ChevronLeft size={17} /> My Characters</button>
        <section className="character-mode-hero">
          <div className="character-mode-kicker"><Sparkles size={16} /> New Character</div>
          <h1>Choose your creator route</h1>
          <p>Pick the builder that suits how much help you want. Every route creates a sheet you can edit later.</p>
        </section>
        <section className="character-mode-grid" aria-label="Character creation modes">
          {characterCreationModes.map((mode) => <ModeCard key={mode.key} mode={mode} onChoose={() => navigate(mode.route)} />)}
        </section>
      </div>
    </main>
  );
}

function ModeCard({ mode, onChoose }) {
  const Icon = icons[mode.key] || Wand2;
  return (
    <button type="button" data-testid={`mode-${mode.key}`} onClick={onChoose} className={`character-mode-card character-mode-card--${mode.key}`}>
      <div className="character-mode-card-topline"><span>{mode.eyebrow}</span><em>{mode.badge}</em></div>
      <div className="character-mode-card-header">
        <div className="character-mode-icon-box"><Icon size={23} /></div>
        <div>
          <h2>{mode.title}</h2>
          <div className="character-mode-time"><Clock size={13} /> {mode.time}</div>
        </div>
      </div>
      <div className="character-mode-decision">{mode.decision}</div>
      <p className="character-mode-description">{mode.description}</p>
      <ul className="character-mode-includes">{mode.includes.map((item) => <li key={item}>{item}</li>)}</ul>
      <div className="character-mode-choose"><span>Choose this route</span><ChevronRight size={18} /></div>
    </button>
  );
}
