import React from 'react';
import { useNavigate } from 'react-router-dom';
import '@/styles/characterCreationModePicker.css';
import { ChevronLeft, ChevronRight, Clock, HelpCircle, ShieldCheck, SlidersHorizontal, Sparkles, Wand2, Zap, Search } from 'lucide-react';
import { characterCreationModes } from '@/data/characterCreationModes';

const icons = { full: Wand2, basic: Zap, matchmaker: Search };
const quickGuide = characterCreationModes.map((mode) => ({ label: mode.title, value: mode.eyebrow, copy: mode.decision }));

export default function CharacterCreationModePicker() {
  const navigate = useNavigate();

  return (
    <main className="character-mode-page">
      <div className="character-mode-shell">
        <button onClick={() => navigate('/home')} data-testid="mode-picker-back" className="character-mode-back"><ChevronLeft size={17} /> Dashboard</button>
        <section className="character-mode-hero">
          <div className="character-mode-hero-copy">
            <div className="character-mode-kicker"><Sparkles size={16} /> New Character</div>
            <h1>Choose how you want to build your hero.</h1>
            <p>Pick a detailed creator, a guided setup, or describe your idea so Rook can suggest a character to review before saving.</p>
          </div>
          <aside className="character-mode-tip" data-testid="mode-picker-help-card">
            <div className="character-mode-tip-icon"><HelpCircle size={20} /></div>
            <div><h2>Three clear routes</h2><p>Full Creator gives full control. Basic Creator guides the main choices. Rook Character Matchmaker helps when you are not sure what to play.</p></div>
          </aside>
        </section>
        <section className="character-mode-guide" data-testid="mode-picker-quick-guide" aria-label="Character creation mode guide">
          {quickGuide.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong><p>{item.copy}</p></div>)}
        </section>
        <section className="character-mode-grid" aria-label="Character creation modes">
          {characterCreationModes.map((mode) => <ModeCard key={mode.key} mode={mode} onChoose={() => navigate(mode.route)} />)}
        </section>
        <section className="character-mode-flow" data-testid="mode-picker-flow">
          <Info icon={SlidersHorizontal} title="Review before saving" text="Guided routes hand off useful presets so the final saved character still uses the Full Creator save path." />
          <Info icon={ShieldCheck} title="Playable outputs" text="Each visible route is designed to produce a safe character record without hidden prototype steps." />
          <Info icon={Clock} title="Edit later" text="You can adjust details in Full Creator before saving and from the character sheet later." />
        </section>
      </div>
    </main>
  );
}

function Info({ icon: Icon, title, text }) { return <div><Icon size={18} /><strong>{title}</strong><span>{text}</span></div>; }
function ModeCard({ mode, onChoose }) {
  const Icon = icons[mode.key] || Wand2;
  return (
    <button type="button" data-testid={`mode-${mode.key}`} onClick={onChoose} className="character-mode-card">
      <div className="character-mode-card-topline"><span>{mode.eyebrow}</span><em>{mode.badge}</em></div>
      <div className="character-mode-card-header"><div className="character-mode-icon-box"><Icon size={22} /></div><div><h2>{mode.title}</h2><div className="character-mode-time"><Clock size={13} /> {mode.time}</div></div></div>
      <div className="character-mode-decision">{mode.decision}</div>
      <p className="character-mode-description">{mode.description}</p>
      <div className="character-mode-best-for"><strong>Useful for:</strong> {mode.usefulFor}</div>
      <ul className="character-mode-includes">{mode.includes.map((item) => <li key={item}>{item}</li>)}</ul>
      <div className="character-mode-choose"><span>Choose this route</span><ChevronRight size={18} /></div>
    </button>
  );
}
