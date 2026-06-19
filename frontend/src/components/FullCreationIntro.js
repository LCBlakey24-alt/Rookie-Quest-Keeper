import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ClipboardList,
  Dices,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react';

const steps = [
  {
    icon: ClipboardList,
    title: 'Build the foundations',
    text: 'Choose species, class, background, level, and the core rules that define the sheet.',
  },
  {
    icon: Dices,
    title: 'Control the mechanics',
    text: 'Work through ability scores, skills, spells, equipment, and the details that matter for play.',
  },
  {
    icon: ScrollText,
    title: 'Add the character',
    text: 'Finish with personality, portrait, notes, and flavour so the sheet feels like your hero.',
  },
];

const reminders = [
  'Best for players who want the complete build process.',
  'You can still edit the character later from the saved sheet.',
  'Longer than Basic Build, but gives the most control.',
];

export default function FullCreationIntro() {
  const navigate = useNavigate();

  return (
    <main className="full-creation-intro-page">
      <style>{pageCss}</style>
      <div className="full-creation-shell">
        <button className="full-creation-back" type="button" onClick={() => navigate('/characters/new')}>
          <ChevronLeft size={17} /> Character modes
        </button>

        <section className="full-creation-hero">
          <div className="full-creation-copy">
            <div className="full-creation-kicker"><Sparkles size={16} /> Full Creation</div>
            <h1>Build your character with full control.</h1>
            <p>
              Full Creation is the complete character builder. It gives you the most control over rules choices, sheet details, and character flavour before the sheet is saved.
            </p>
            <div className="full-creation-actions">
              <button type="button" className="full-creation-primary" onClick={() => navigate('/characters/new/full/builder')}>
                Start full builder <ArrowRight size={18} />
              </button>
              <button type="button" className="full-creation-secondary" onClick={() => navigate('/characters/new/basic')}>
                Use Basic Build instead
              </button>
            </div>
          </div>

          <aside className="full-creation-summary">
            <div className="full-creation-summary-icon"><Wand2 size={24} /></div>
            <h2>What this mode does</h2>
            <p>
              This path opens the detailed builder rather than auto-filling most of the sheet for you.
            </p>
            <ul>
              {reminders.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </aside>
        </section>

        <section className="full-creation-steps" aria-label="Full Creation steps">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <article key={step.title}>
                <div><Icon size={21} /></div>
                <h2>{step.title}</h2>
                <p>{step.text}</p>
              </article>
            );
          })}
        </section>

        <section className="full-creation-note">
          <ShieldCheck size={18} />
          <span>Full Creation is being improved step-by-step. The detailed builder still opens exactly as before, just with a clearer starting point.</span>
        </section>
      </div>
    </main>
  );
}

const pageCss = `
.full-creation-intro-page {
  min-height: 100dvh;
  background:
    radial-gradient(circle at top left, rgba(193,18,31,0.17), transparent 34%),
    linear-gradient(180deg, var(--bg-black), var(--bg-dark));
  color: var(--text-primary);
  font-family: var(--font-sans);
  padding: clamp(14px, 3vh, 24px) 18px clamp(24px, 5vh, 42px);
}

.full-creation-shell {
  width: min(1120px, 100%);
  margin: 0 auto;
}

.full-creation-back,
.full-creation-primary,
.full-creation-secondary {
  appearance: none;
  -webkit-appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.full-creation-back {
  background: transparent;
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 12px;
  padding: 7px 10px;
  text-transform: uppercase;
}

.full-creation-back:hover,
.full-creation-secondary:hover {
  border-color: var(--accent-red);
  color: var(--accent-red-hover);
  background: var(--accent-red-subtle);
}

.full-creation-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  gap: 14px;
  align-items: stretch;
}

.full-creation-copy,
.full-creation-summary,
.full-creation-steps article,
.full-creation-note {
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  box-shadow: var(--shadow-md);
}

.full-creation-copy {
  padding: clamp(22px, 4vw, 36px);
}

.full-creation-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--accent-red-hover);
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
}

.full-creation-copy h1 {
  margin: 0;
  max-width: 720px;
  font-size: clamp(32px, 5vw, 58px);
  line-height: 0.95;
  letter-spacing: -2px;
  font-weight: 950;
}

.full-creation-copy p,
.full-creation-summary p,
.full-creation-steps p,
.full-creation-note {
  color: var(--text-secondary);
  line-height: 1.55;
}

.full-creation-copy p {
  max-width: 720px;
  margin: 16px 0 0;
  font-size: 15px;
}

.full-creation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.full-creation-primary {
  min-height: 44px;
  border: 1px solid var(--accent-red);
  background: var(--accent-red);
  color: #fff;
  padding: 0 18px;
  text-transform: uppercase;
}

.full-creation-primary:hover {
  background: var(--accent-red-hover);
  border-color: var(--accent-red-hover);
}

.full-creation-secondary {
  min-height: 44px;
  border: 1px solid var(--border-default);
  background: transparent;
  color: var(--text-secondary);
  padding: 0 16px;
}

.full-creation-summary {
  padding: 20px;
}

.full-creation-summary-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-red-subtle);
  border: 1px solid var(--accent-red-border);
  color: var(--accent-red-hover);
  margin-bottom: 14px;
}

.full-creation-summary h2,
.full-creation-steps h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 900;
}

.full-creation-summary p {
  margin: 10px 0 14px;
  font-size: 13px;
}

.full-creation-summary ul {
  margin: 0;
  padding-left: 18px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
}

.full-creation-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.full-creation-steps article {
  padding: 16px;
}

.full-creation-steps article > div {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.18);
  border: 1px solid var(--accent-red-border);
  color: var(--accent-red-hover);
  margin-bottom: 12px;
}

.full-creation-steps p {
  margin: 8px 0 0;
  font-size: 13px;
}

.full-creation-note {
  margin-top: 14px;
  padding: 12px 14px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
}

.full-creation-note svg {
  color: var(--accent-red-hover);
  flex: 0 0 auto;
  margin-top: 1px;
}

@media (max-width: 880px) {
  .full-creation-hero,
  .full-creation-steps {
    grid-template-columns: 1fr;
  }
}
`;
