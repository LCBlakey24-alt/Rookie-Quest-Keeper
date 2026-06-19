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
  SlidersHorizontal,
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
    decision: 'Use this for children or complete beginners.',
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
    decision: 'Use this when the game starts soon.',
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
    decision: 'Use this for a fast character that still feels yours.',
    description: 'Choose the important bits — name, species, class, background, and level — then let ROOK fill in stats, skills, gear, traits, and starter languages.',
    bestFor: 'Players who want ownership without getting buried under every character-building rule.',
    includes: ['Core choices only', 'Auto-filled sheet details', 'Playable starter languages'],
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
    decision: 'Use this when every rule choice matters.',
    description: 'Build from the ground up with full control over background, ability scores, skills, spells, gear, personality, and character flavour.',
    bestFor: 'Experienced players, long campaigns, theorycrafters, and anyone who loves character creation.',
    includes: ['Ability score methods', 'Skills and spells', 'Portrait and personality'],
  },
];

const quickGuide = [
  { label: 'Fastest', value: 'Premade', copy: 'Grab a ready hero and start playing.' },
  { label: 'Best default', value: 'Basic Build', copy: 'Pick the fun choices while ROOK fills the sheet.' },
  { label: 'Most control', value: 'Full Creation', copy: 'Choose the detailed rules yourself.' },
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
            <h1>Choose the builder that fits tonight.</h1>
            <p>
              Pick the route that matches your table, time, and confidence. Every option creates a saved sheet, and you can polish the character later.
            </p>
          </div>

          <aside className="character-mode-tip" data-testid="mode-picker-help-card">
            <div className="character-mode-tip-icon"><HelpCircle size={20} /></div>
            <div>
              <h2>Not sure?</h2>
              <p>
                Start with <strong>Basic Build</strong>. It now creates a more complete starter sheet, including auto-filled languages and other fiddly details.
              </p>
            </div>
          </aside>
        </section>

        <section className="character-mode-guide" data-testid="mode-picker-quick-guide" aria-label="Quick builder guide">
          {quickGuide.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.copy}</p>
            </div>
          ))}
        </section>

        <section className="character-mode-grid" aria-label="Character creation modes">
          {modes.map((mode) => (
            <ModeCard key={mode.key} mode={mode} onChoose={() => navigate(mode.route)} />
          ))}
        </section>

        <section className="character-mode-flow" data-testid="mode-picker-flow">
          <div>
            <SlidersHorizontal size={18} />
            <strong>Campaign-aware setup</strong>
            <span>Join-code campaigns can lock rules edition, allowed classes, and table options before a sheet is finalized.</span>
          </div>
          <div>
            <ShieldCheck size={18} />
            <strong>Safe defaults first</strong>
            <span>Every path starts playable, then lets you add deeper rules, spells, gear, and ROOK text help when needed.</span>
          </div>
          <div>
            <Clock size={18} />
            <strong>Less scrolling</strong>
            <span>Pick the fastest builder for tonight, then polish the details from the character sheet later.</span>
          </div>
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

      <div className="character-mode-decision">{mode.decision}</div>
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
  grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
  gap: 12px;
  align-items: stretch;
  margin-bottom: 12px;
}

.character-mode-hero-copy,
.character-mode-tip,
.character-mode-summary,
.character-mode-guide {
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

.character-mode-guide {
  margin-bottom: 12px;
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.character-mode-guide div {
  border: 1px solid var(--border-subtle);
  background: rgba(255,255,255,0.035);
  border-radius: 9px;
  padding: 10px 11px;
}

.character-mode-guide span {
  display: block;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 4px;
}

.character-mode-guide strong {
  display: block;
  color: var(--accent-red-hover);
  font-size: 14px;
  font-weight: 900;
}

.character-mode-guide p {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.35;
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
  min-height: 275px;
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

.character-mode-card-topline,
.character-mode-card-header,
.character-mode-choose,
.character-mode-summary div {
  display: flex;
  align-items: center;
}

.character-mode-card-topline,
.character-mode-choose {
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

.character-mode-decision {
  border: 1px solid var(--accent-red-border);
  background: var(--accent-red-subtle);
  color: var(--text-primary);
  padding: 7px 9px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 900;
}

.character-mode-description,
.character-mode-best-for,
.character-mode-includes {
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.4;
}

.character-mode-description {
  margin: 0;
  font-size: 12px;
}

.character-mode-best-for {
  border: 1px solid var(--border-subtle);
  background: rgba(0,0,0,0.12);
  padding: 8px 9px;
}

.character-mode-includes {
  margin: 0;
  padding-left: 16px;
}

.character-mode-choose {
  margin-top: auto;
  border-top: 1px solid var(--border-subtle);
  padding-top: 9px;
  color: var(--accent-red-hover);
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.character-mode-flow {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.character-mode-flow div {
  background: rgba(17,24,39,0.74);
  border: 1px solid rgba(124,58,237,0.24);
  border-radius: 10px;
  padding: 10px 11px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 3px 9px;
  align-items: start;
}

.character-mode-flow svg {
  color: #22d3ee;
  grid-row: span 2;
  margin-top: 2px;
}

.character-mode-flow strong {
  color: var(--text-primary);
  font-size: 12px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.character-mode-flow span {
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.35;
}

.character-mode-summary {
  margin-top: 10px;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.character-mode-summary div {
  gap: 9px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
}

.character-mode-summary svg {
  color: var(--accent-red-hover);
  flex: 0 0 auto;
}

@media (max-height: 760px) and (min-width: 900px) {
  .character-mode-tip { display: none; }
  .character-mode-hero { grid-template-columns: 1fr; }
  .character-mode-summary { display: none; }
}

@media (max-width: 1100px) {
  .character-mode-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 820px) {
  .character-mode-hero,
  .character-mode-flow,
  .character-mode-guide {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .character-mode-grid { grid-template-columns: 1fr; }
}
`;
