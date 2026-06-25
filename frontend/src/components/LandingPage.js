import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  HeartPulse,
  MapPin,
  ScrollText,
  Shield,
  ShieldCheck,
  Sparkles,
  Sword,
  Users,
  Wand2
} from 'lucide-react';

const features = [
  { icon: Users, title: 'Build characters', desc: 'Create playable 5e characters, choose a starting level, and keep sheets readable at the table.' },
  { icon: Sword, title: 'Run combat', desc: 'Track HP, initiative, conditions, spell slots, resources, and live table tools without hunting through tabs.' },
  { icon: ScrollText, title: 'Keep campaign notes', desc: 'Save session notes, NPCs, locations, hooks, and reminders in one campaign workspace.' },
  { icon: Sparkles, title: 'Ask ROOK', desc: 'Use ROOK for build prompts, recap help, ideas, and optional guidance when players get stuck.' }
];

const workflow = [
  { icon: BookOpen, title: 'Create a hero', desc: 'Start simple, then grow into full sheet tools when you need more control.' },
  { icon: ShieldCheck, title: 'Play from the sheet', desc: 'Use HP, AC, resources, spell slots, inventory, notes, and build reviews from one place.' },
  { icon: Wand2, title: 'Support the table', desc: 'Give GMs and players shared structure without turning prep into homework.' }
];

function BrandMark({ compact = false }) {
  return (
    <div className={`landing-brand ${compact ? 'landing-brand-compact' : ''}`} aria-label="Rookie Quest Keeper">
      <img src={compact ? "/images/logo-mini.png" : "/images/logo-main.png"} alt="Rookie Quest Keeper" />
    </div>
  );
}

function HeroPreview() {
  return (
    <section className="landing-product-frame landing-hero-preview" aria-label="Rookie Quest Keeper sheet preview">
      <div className="preview-window-bar">
        <div className="preview-dots" aria-hidden="true"><span /><span /><span /></div>
        <strong>Player Sheet</strong>
        <span className="preview-status">Ready</span>
      </div>

      <div className="preview-workspace landing-simple-preview">
        <aside className="preview-sidebar" aria-label="Preview navigation">
          <span className="preview-nav-active"><HeartPulse size={15} /> Sheet</span>
          <span><Sword size={15} /> Combat</span>
          <span><ScrollText size={15} /> Notes</span>
          <span><MapPin size={15} /> Campaign</span>
        </aside>

        <div className="preview-main">
          <div className="preview-title-row">
            <div>
              <span className="preview-eyebrow">Rookie-ready</span>
              <h2>Clean play tools</h2>
            </div>
            <span className="preview-live-pill"><CheckCircle2 size={14} /> Saved</span>
          </div>

          <div className="preview-grid">
            <div className="preview-panel preview-panel-large">
              <div className="preview-panel-heading"><span>Current turn</span></div>
              <div className="preview-encounter">
                <Shield size={24} />
                <div>
                  <strong>Aria Thornbrook</strong>
                  <span>Level 5 Monk · 38 HP · 16 AC</span>
                </div>
              </div>
              <div className="preview-meter" aria-hidden="true"><span style={{ width: '76%' }} /></div>
            </div>

            <div className="preview-panel">
              <span className="preview-panel-label">Resources</span>
              <div className="preview-stat-row"><Sparkles size={18} /><strong>5 Ki</strong></div>
              <span className="preview-muted">Tracked on sheet</span>
            </div>

            <div className="preview-panel">
              <span className="preview-panel-label">Build</span>
              <div className="preview-stat-row"><BookOpen size={18} /><strong>2 checks</strong></div>
              <span className="preview-muted">Review saved choices</span>
            </div>

            <div className="preview-panel preview-panel-wide">
              <div className="preview-note-line">
                <Wand2 size={17} />
                <span>ROOK can help with level-up choices, spell swaps, and character notes when needed.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const goLogin = () => navigate('/auth');
  const goRegister = () => navigate('/auth?mode=register');

  return (
    <div data-testid="landing-page" className="landing-page landing-page-clean">
      <nav className="landing-nav">
        <BrandMark />
        <div className="landing-nav-actions">
          <button data-testid="landing-signin-btn" type="button" className="landing-button landing-button-ghost" onClick={goLogin}>
            Sign In
          </button>
          <button data-testid="landing-getstarted-btn" type="button" className="landing-button landing-button-primary" onClick={goRegister}>
            Create Account
          </button>
        </div>
      </nav>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <span className="landing-kicker">Character sheets, campaign tools, and ROOK support</span>
            <h1>Rookie Quest Keeper</h1>
            <p>
              A cleaner TTRPG workspace for building characters, playing from the sheet, and keeping campaign notes together without making the table scroll forever.
            </p>
            <div className="landing-hero-actions">
              <button data-testid="landing-cta-btn" type="button" className="landing-button landing-button-primary landing-button-large" onClick={goRegister}>
                Build Your First Character <ChevronRight size={18} />
              </button>
              <button type="button" className="landing-button landing-button-ghost landing-button-large" onClick={goLogin}>
                I already have an account
              </button>
            </div>
          </div>

          <HeroPreview />
        </section>

        <section className="landing-features" aria-label="Rookie Quest Keeper features">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} data-testid={`feature-card-${index}`} className="landing-feature-card">
                <Icon size={26} />
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </article>
            );
          })}
        </section>

        <section className="landing-workflow landing-workflow-clean">
          <div className="landing-workflow-copy">
            <span className="landing-kicker">Simple first, deeper when ready</span>
            <h2>Less clutter on the front door. More useful tools after login.</h2>
          </div>
          <div className="landing-workflow-list">
            {workflow.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="landing-workflow-item">
                  <Icon size={21} />
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <BrandMark compact />
        <p>&copy; {new Date().getFullYear()} Rookie Quest Keeper. All rights reserved.</p>
      </footer>
    </div>
  );
}
