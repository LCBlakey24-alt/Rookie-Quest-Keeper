import React from 'react';
import { useNavigate } from 'react-router-dom';
import '@/styles/characterCreationModePicker.css';
import {
  Baby,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  HelpCircle,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wand2,
  Zap,
} from 'lucide-react';

export const characterCreationModes = [
  {
    key: 'full',
    title: 'Full Creation',
    eyebrow: 'Detailed builder',
    icon: Wand2,
    route: '/characters/new/full',
    time: '12–20 mins',
    badge: 'Full control',
    decision: 'Use the workshop path when you want to control every major character choice.',
    description: 'Step through class, species, background, ability scores, skills, spells, gear, personality, and final review with the most detail.',
    usefulFor: 'Players who know the rules or want a fully custom sheet.',
    includes: ['Step-by-step choices', 'Spells and gear', 'Final review'],
  },
  {
    key: 'basic',
    title: 'Basic Build',
    eyebrow: 'Guided builder',
    icon: Zap,
    route: '/characters/new/basic',
    time: '5–8 mins',
    badge: 'Guided sheet',
    decision: 'Choose the main ideas while ROOK fills the starter sheet around them.',
    description: 'Pick name, edition, level, class, species, background, defence loadout, and class skills. ROOK fills HP, AC, traits, languages, and starter details.',
    usefulFor: 'Players who want a proper character quickly without every advanced choice.',
    includes: ['Core choices', 'HP and AC preview', 'Editable after creation'],
  },
  {
    key: 'premade',
    title: 'Premade Characters',
    eyebrow: 'Instant characters',
    icon: Users,
    route: '/characters/new/premade',
    time: '1–3 mins',
    badge: 'Pick a hero',
    decision: 'Choose a ready-made hero card and start quickly.',
    description: 'Browse prebuilt characters by class, role, and difficulty, then rename or lightly customise before saving to your table.',
    usefulFor: 'One-shots, guest players, clubs, schools, and quick table entry.',
    includes: ['Hero cards', 'Role tags', 'Fast save'],
  },
  {
    key: 'kids',
    title: 'Kids Mode',
    eyebrow: 'Simple hero builder',
    icon: Baby,
    route: '/characters/new/kids',
    time: '2–4 mins',
    badge: 'Big choices',
    decision: 'Build a hero with simpler words, bigger choices, and fewer rules on screen.',
    description: 'Choose hero style, look, background, strengths, and gear using friendly labels while the real sheet is created in the background.',
    usefulFor: 'Younger players, family tables, school clubs, and brand-new roleplay.',
    includes: ['Plain-English choices', 'Big buttons', 'Low rules pressure'],
  },
];

const quickGuide = [
  { label: 'Full Creation', value: 'Detailed workshop', copy: 'Full step-by-step control for custom characters.' },
  { label: 'Basic Build', value: 'Guided setup', copy: 'Main choices with ROOK filling the starter sheet.' },
  { label: 'Premades', value: 'Instant hero', copy: 'Pick a ready character and play quickly.' },
  { label: 'Kids Mode', value: 'Simple hero', copy: 'Big friendly choices with fewer rules showing.' },
];

export default function CharacterCreationModePicker() {
  const navigate = useNavigate();

  return (
    <main className="character-mode-page">
      <div className="character-mode-shell">
        <button onClick={() => navigate('/home')} data-testid="mode-picker-back" className="character-mode-back">
          <ChevronLeft size={17} /> Dashboard
        </button>

        <section className="character-mode-hero">
          <div className="character-mode-hero-copy">
            <div className="character-mode-kicker"><Sparkles size={16} /> New Character</div>
            <h1>Choose the builder that fits your table.</h1>
            <p>Full Creation is the current production save path. The other routes are preserved as entry points while they are being aligned to the same save payload.</p>
          </div>

          <aside className="character-mode-tip" data-testid="mode-picker-help-card">
            <div className="character-mode-tip-icon"><HelpCircle size={20} /></div>
            <div>
              <h2>Four clear routes</h2>
              <p>Full Creation is the detailed workshop. Basic Build is guided. Premades are instant hero cards. Kids Mode keeps the language simple.</p>
            </div>
          </aside>
        </section>

        <section className="character-mode-guide" data-testid="mode-picker-quick-guide" aria-label="Character creation mode guide">
          {quickGuide.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.copy}</p>
            </div>
          ))}
        </section>

        <section className="character-mode-grid" aria-label="Character creation modes">
          {characterCreationModes.map((mode) => <ModeCard key={mode.key} mode={mode} onChoose={() => navigate(mode.route)} />)}
        </section>

        <section className="character-mode-flow" data-testid="mode-picker-flow">
          <Info icon={SlidersHorizontal} title="Different layouts, same sheet" text="Each builder can feel different while still creating the same kind of saved character record." />
          <Info icon={ShieldCheck} title="Playable outputs" text="Until the quick routes finish payload alignment, they safely hand off to Full Creation instead of creating weaker records." />
          <Info icon={Clock} title="Edit later" text="Choose the route that suits the session now, then polish the details from the character sheet later." />
        </section>

        <section className="character-mode-summary" data-testid="mode-picker-summary">
          <div><ShieldCheck size={18} /><span>Full Creation creates the canonical saved character sheet today.</span></div>
          <div><Crown size={18} /><span>Each mode has its own purpose, not just fewer fields.</span></div>
          <div><Clock size={18} /><span>Need speed? Premade and Basic are the quickest routes.</span></div>
        </section>
      </div>
    </main>
  );
}

function Info({ icon: Icon, title, text }) {
  return (
    <div>
      <Icon size={18} />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function ModeCard({ mode, onChoose }) {
  const Icon = mode.icon;
  return (
    <button type="button" data-testid={`mode-${mode.key}`} onClick={onChoose} className="character-mode-card">
      <div className="character-mode-card-topline"><span>{mode.eyebrow}</span><em>{mode.badge}</em></div>
      <div className="character-mode-card-header">
        <div className="character-mode-icon-box"><Icon size={22} /></div>
        <div><h2>{mode.title}</h2><div className="character-mode-time"><Clock size={13} /> {mode.time}</div></div>
      </div>
      <div className="character-mode-decision">{mode.decision}</div>
      <p className="character-mode-description">{mode.description}</p>
      <div className="character-mode-best-for"><strong>Useful for:</strong> {mode.usefulFor}</div>
      <ul className="character-mode-includes">{mode.includes.map((item) => <li key={item}>{item}</li>)}</ul>
      <div className="character-mode-choose"><span>Choose this mode</span><ChevronRight size={18} /></div>
    </button>
  );
}

