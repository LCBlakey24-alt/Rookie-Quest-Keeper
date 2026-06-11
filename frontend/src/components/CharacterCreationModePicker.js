import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Baby,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
  Zap,
} from 'lucide-react';

const modes = [
  {
    key: 'kids',
    title: 'Kids Mode',
    eyebrow: 'Young adventurers',
    icon: Baby,
    route: '/characters/new/kids',
    time: '2–4 mins',
    badge: 'Simplest',
    description: 'Simple choices, plain language, and a friendly guided setup for younger players or absolute beginners.',
    bestFor: 'Children, family tables, first-time roleplay, and anyone who wants less rules noise.',
    includes: ['Plain-English choices', 'Quick hero identity', 'Minimal rules pressure'],
  },
  {
    key: 'premade',
    title: 'Premade Characters',
    eyebrow: 'Ready to play',
    icon: Users,
    route: '/characters/new/premade',
    time: '1–3 mins',
    badge: 'Fastest',
    description: 'Pick a ready-to-play hero and jump straight into the game with a solid starting character.',
    bestFor: 'One-shots, new players, guest players, or anyone joining a session at short notice.',
    includes: ['Ready-made builds', 'Quick selection', 'Easy table entry'],
  },
  {
    key: 'basic',
    title: 'Basic Build',
    eyebrow: 'Guided setup',
    icon: Zap,
    route: '/characters/new/basic',
    time: '5–8 mins',
    badge: 'Recommended',
    description: 'Choose the important bits — name, race, class, and level — then let ROOK fill in the fiddly parts.',
    bestFor: 'Players who want ownership without getting buried under every character-building rule.',
    includes: ['Core choices only', 'Auto-filled details', 'Beginner-friendly control'],
    featured: true,
  },
  {
    key: 'full',
    title: 'Full Creation',
    eyebrow: 'Complete control',
    icon: Wand2,
    route: '/characters/new/full',
    time: '12–20 mins',
    badge: 'Detailed',
    description: 'Build from the ground up with full control over background, ability scores, skills, spells, gear, and personality.',
    bestFor: 'Experienced players, long campaigns, theorycrafters, and anyone who loves character creation.',
    includes: ['Ability score methods', 'Skills and spells', 'Portrait and personality'],
  },
];

export default function CharacterCreationModePicker() {
  const navigate = useNavigate();

  return (
    <main className="character-mode-page">
      <style>{pageCss}</style>
      <div className="character-mode-shell">
        <button
          onClick={() => navigate('/home')}
          data-testid="mode-picker-back"
          className="character-mode-back"
        >
          <ChevronLeft size={17} /> Dashboard
        </button>

        <section className="character-mode-hero">
          <div className="character-mode-hero-copy">
            <div className="character-mode-kicker">
              <Sparkles size={16} /> New Character
            </div>
            <h1>How do you want to build your hero?</h1>
            <p>
              Choose the creation style that matches your table, your confidence, and how much control you want. You can edit the character later, so this choice is not a trapdoor into doom.
            </p>
          </div>

          <aside className="character-mode-tip" data-testid="mode-picker-help-card">
            <div className="character-mode-tip-icon"><HelpCircle size={20} /></div>
            <div>
              <h2>Not sure?</h2>
              <p>
                Start with <strong>Basic Build</strong>. It gives you the important choices without making character creation feel like tax paperwork with goblins.
              </p>
            </div>
          </aside>
        </section>

        <section className="character-mode-grid" aria-label="Character creation modes">
          {modes.map((mode) => (
            <ModeCard key={mode.key} mode={mode} onChoose={() => navigate(mode.route)} />
          ))}
        </section>

        <section className="character-mode-summary" data-testid="mode-picker-summary">
          <div>
            <ShieldCheck size={18} />
            <span>All modes create a saved character sheet.</span>
          </div>
          <div>
            <Crown size={18} />
            <span>You can edit and improve characters after creation.</span>
          </div>
          <div>
            <Clock size={18} />
            <span>Short on time? Pick Premade or Basic.</span>
          </div>
        </section>
      </div>
    </main>
  );
}

function ModeCard({ mode, onChoose }) {
  const Icon = mode.icon;

  return (
    <button
      type="button"
      data-testid={`mode-${mode.key}`}
      onClick={onChoose}
      className={`character-mode-card${mode.featured ? ' is-featured' : ''}`}
    >
      <div className="character-mode-card-topline">
        <span>{mode.eyebrow}</span>
        <em>{mode.badge}</em>
      </div>

      <div className="character-mode-card-header">
        <div className="character-mode-icon-box">
          <Icon size={22} />
        </div>
        <div>
          <h2>{mode.title}</h2>
          <div className="character-mode-time"><Clock size={13} /> {mode.time}</div>
        </div>
      </div>

      <p className="character-mode-description">{mode.description}</p>

      <div className="character-mode-best-for">
        <strong>Best for:</strong> {mode.bestFor}
      </div>

      <ul className="character-mode-includes">
        {mode.includes.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <div className="character-mode-choose">
        <span>Choose this mode</span>
        <ChevronRight size={18} />
      </div>
    </button>
  );
}

const pageCss = `
.character-mode-page {
  min-height: 100dvh;
  max-height: none;
  overflow-y: auto;
  background:
    radial-gradient(circle at top left, rgba(239,68,68,0.13), transparent 32%),
    linear-gradient(180deg, var(--bg-black), var(--bg-dark));
  color: var(--text-primary);
  font-family: var(--font-sans);
  padding: clamp(12px, 2vh, 20px) 18px clamp(18px, 3vh, 28px);
}

.character-mode-shell {
  width: min(1240px, 100%);
  margin: 0 auto;
}

.character-mode-back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: transparent;
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  margin-bottom: 10px;
  padding: 7px 10px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.character-mode-back:hover {
  border-color: var(--accent-red);
  color: var(--accent-red-hover);
  background: var(--accent-red-subtle);
}

.character-mode-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 330px);
  gap: 12px;
  align-items: stretch;
  margin-bottom: 12px;
}

.character-mode-hero-copy,
.character-mode-tip,
.character-mode-summary {
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-md);
  border-radius: 10px;
}

.character-mode-hero-copy {
  padding: clamp(14px, 2vh, 18px) 18px;
}

.character-mode-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--accent-red-hover);
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 10px;
}

.character-mode-hero h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(26px, 3.6vw, 40px);
  line-height: 1;
  font-weight: 900;
  letter-spacing: -1.4px;
}

.character-mode-hero p {
  color: var(--text-secondary);
  margin: 9px 0 0;
  max-width: 760px;
  font-size: 13px;
  line-height: 1.45;
}

.character-mode-tip {
  background: var(--accent-red-subtle);
  border-color: var(--accent-red-border);
  padding: 14px;
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.character-mode-tip-icon {
  width: 38px;
  height: 38px;
  border: 1px solid var(--accent-red-border);
  color: var(--accent-red-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.character-mode-tip h2 {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 900;
  color: var(--text-primary);
}

.character-mode-tip p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.character-mode-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.character-mode-card {
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid var(--border-default);
  background: var(--bg-card);
  color: var(--text-primary);
  border-radius: 10px;
  padding: 13px;
  text-align: left;
  cursor: pointer;
  min-height: 245px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
  box-shadow: var(--shadow-md);
}

.character-mode-card:hover {
  transform: translateY(-3px);
  border-color: var(--accent-red-hover);
  background: var(--bg-elevated);
  box-shadow: 0 22px 52px rgba(0,0,0,0.38);
}

.character-mode-card.is-featured {
  border-color: var(--accent-red-hover);
  box-shadow: 0 18px 38px rgba(239,68,68,0.14);
}

.character-mode-card-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.character-mode-card-topline span {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.9px;
}

.character-mode-card-topline em {
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
  background: rgba(255,255,255,0.04);
  padding: 4px 7px;
  border-radius: 999px;
  font-style: normal;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.character-mode-card.is-featured .character-mode-card-topline em {
  color: var(--text-primary);
  border-color: var(--accent-red);
  background: var(--accent-red);
}

.character-mode-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.character-mode-icon-box {
  width: 40px;
  height: 40px;
  border: 1px solid var(--accent-red-border);
  color: var(--accent-red-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  background: var(--accent-red-subtle);
}

.character-mode-card h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 900;
  letter-spacing: -0.4px;
}

.character-mode-time {
  margin-top: 3px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 800;
}

.character-mode-description {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.42;
}

.character-mode-best-for {
  border: 1px solid var(--border-subtle);
  background: rgba(0,0,0,0.12);
  padding: 8px 9px;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.35;
}

.character-mode-includes {
  margin: 0;
  padding-left: 16px;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.45;
}

.character-mode-choose {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--border-subtle);
  padding-top: 9px;
  color: var(--accent-red-hover);
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.character-mode-summary {
  margin-top: 10px;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.character-mode-summary div {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
}

.character-mode-summary svg {
  color: var(--accent-red-hover);
}

@media (max-height: 760px) and (min-width: 900px) {
  .character-mode-tip { display: none; }
  .character-mode-hero { grid-template-columns: 1fr; }
  .character-mode-summary { display: none; }
}

@media (max-width: 1100px) {
  .character-mode-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .character-mode-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .character-mode-grid {
    grid-template-columns: 1fr;
  }
}
`;
