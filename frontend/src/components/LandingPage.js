import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HeartPulse,
  Map,
  MapPin,
  Plus,
  ScrollText,
  Shield,
  ShieldCheck,
  Sparkles,
  Sword,
  Users,
  Wand2
} from 'lucide-react';

const features = [
  { icon: Users, title: 'Character Builder', desc: 'Create 5e characters, choose rulesets, track sheets, and keep your player tools together.' },
  { icon: Sword, title: 'Combat Tools', desc: 'Run initiative, manage HP, prep encounters, and keep combat moving at the table.' },
  { icon: Sparkles, title: 'ROOK AI', desc: 'Generate NPCs, locations, recaps, hooks, and structured campaign content from your notes.' },
  { icon: Map, title: 'Campaign Workspace', desc: 'Organize parties, locations, session notes, and campaign details for long-running games.' }
];

const workflow = [
  { icon: BookOpen, title: 'Build a character', desc: 'Start with the guided builder, pick a ruleset, and save a playable sheet.' },
  { icon: ShieldCheck, title: 'Run the table', desc: 'Open the GM screen, roll dice, track combat, and manage live session notes.' },
  { icon: ScrollText, title: 'Keep the story', desc: 'Turn notes into recaps, player-facing updates, and searchable campaign history.' }
];

const productPreviews = [
  {
    icon: Users,
    eyebrow: 'Player Hub',
    title: 'Character tools',
    stat: '4 active heroes',
    rows: [
      { label: 'Galadriel', meta: 'Level 5 Elf Wizard', chips: ['12 HP', '12 AC'] },
      { label: 'Brom', meta: 'Level 4 Human Fighter', chips: ['38 HP', '17 AC'] }
    ]
  },
  {
    icon: MapPin,
    eyebrow: 'World Builder',
    title: 'Campaign locations',
    stat: 'Silver Road',
    rows: [
      { label: 'Silverdale', meta: 'Trade city, mage academy, dock ward', chips: ['City', '3 hooks'] },
      { label: 'Thornwood', meta: 'Forest route with hidden ruins', chips: ['Wilds', 'Unsafe'] }
    ]
  },
  {
    icon: ScrollText,
    eyebrow: 'Session Notes',
    title: 'Live recap flow',
    stat: 'Auto-saved',
    rows: [
      { label: 'Sunken Temple', meta: 'Fought sahuagin guards beneath the old tide gate.', chips: ['AI parse', 'Recap'] },
      { label: 'Lord Ashworth', meta: 'Quest giver, owes the party a second payment.', chips: ['NPC', 'Follow-up'] }
    ]
  }
];

function BrandMark() {
  return (
    <div className="landing-brand" aria-label="ROOK">
      <img src="/images/logo-mini.png" alt="" aria-hidden="true" />
      <span>ROOK</span>
    </div>
  );
}

function HeroPreview() {
  return (
    <section className="landing-product-frame landing-hero-preview" aria-label="ROOK campaign workspace preview">
      <div className="preview-window-bar">
        <div className="preview-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <strong>Current Campaign</strong>
        <span className="preview-status">Live ready</span>
      </div>

      <div className="preview-workspace">
        <aside className="preview-sidebar" aria-label="Preview navigation">
          <span className="preview-nav-active"><Sword size={15} /> Combat</span>
          <span><MapPin size={15} /> Locations</span>
          <span><Users size={15} /> Party</span>
          <span><ScrollText size={15} /> Notes</span>
        </aside>

        <div className="preview-main">
          <div className="preview-title-row">
            <div>
              <span className="preview-eyebrow">The Ash Road</span>
              <h2>Session Control</h2>
            </div>
            <span className="preview-live-pill"><CheckCircle2 size={14} /> Ready</span>
          </div>

          <div className="preview-grid">
            <div className="preview-panel preview-panel-large">
              <div className="preview-panel-heading">
                <span>Encounter queue</span>
                <button type="button" aria-label="Add encounter"><Plus size={16} /></button>
              </div>
              <div className="preview-encounter">
                <Sword size={24} />
                <div>
                  <strong>Ambush at Dusk</strong>
                  <span>6 foes · roadside cover · medium difficulty</span>
                </div>
              </div>
              <div className="preview-meter" aria-hidden="true">
                <span style={{ width: '72%' }} />
              </div>
            </div>

            <div className="preview-panel">
              <span className="preview-panel-label">Party</span>
              <div className="preview-stat-row">
                <HeartPulse size={18} />
                <strong>82%</strong>
              </div>
              <span className="preview-muted">Average HP</span>
            </div>

            <div className="preview-panel">
              <span className="preview-panel-label">Armor</span>
              <div className="preview-stat-row">
                <Shield size={18} />
                <strong>15 AC</strong>
              </div>
              <span className="preview-muted">Party median</span>
            </div>

            <div className="preview-panel preview-panel-wide">
              <div className="preview-note-line">
                <Wand2 size={17} />
                <span>ROOK has 3 session beats prepared from your notes.</span>
              </div>
              <div className="preview-time-line">
                <Clock3 size={15} />
                <span>Next reminder: reveal the broken bridge clue.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductPreviewCard({ preview }) {
  const Icon = preview.icon;

  return (
    <article className="landing-preview-card">
      <header>
        <div className="landing-preview-icon">
          <Icon size={18} />
        </div>
        <div>
          <span>{preview.eyebrow}</span>
          <strong>{preview.title}</strong>
        </div>
      </header>

      <div className="landing-preview-stat">{preview.stat}</div>

      <div className="landing-preview-rows">
        {preview.rows.map((row) => (
          <div key={row.label} className="landing-preview-row">
            <div>
              <strong>{row.label}</strong>
              <span>{row.meta}</span>
            </div>
            <div className="landing-preview-chips">
              {row.chips.map((chip) => (
                <span key={chip}>{chip}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div data-testid="landing-page" className="landing-page">
      <nav className="landing-nav">
        <BrandMark />
        <div className="landing-nav-actions">
          <button data-testid="landing-signin-btn" type="button" className="landing-button landing-button-ghost" onClick={() => navigate('/login')}>
            Sign In
          </button>
          <button data-testid="landing-getstarted-btn" type="button" className="landing-button landing-button-primary" onClick={() => navigate('/login')}>
            Create Account
          </button>
        </div>
      </nav>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <span className="landing-kicker">Build characters, run sessions, and keep campaign notes together</span>
            <h1>Rookie Quest Keeper</h1>
            <p>
              A focused TTRPG workspace for creating playable 5e characters, managing campaigns,
              running live sessions, and keeping your table organized from prep to recap.
            </p>
            <button data-testid="landing-cta-btn" type="button" className="landing-button landing-button-primary landing-button-large" onClick={() => navigate('/login')}>
              Build Your First Character <ChevronRight size={18} />
            </button>
          </div>

          <HeroPreview />
        </section>

        <section className="landing-features" aria-label="ROOK features">
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

        <section className="landing-workflow">
          <div className="landing-workflow-copy">
            <span className="landing-kicker">Usable today, built to grow</span>
            <h2>Start with characters, then bring the whole table into one workspace</h2>
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
          </div>

          <div className="landing-preview-grid" aria-label="ROOK product areas">
            {productPreviews.map((preview) => (
              <ProductPreviewCard key={preview.title} preview={preview} />
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <BrandMark />
        <p>&copy; {new Date().getFullYear()} Rookie Quest Keeper. All rights reserved.</p>
      </footer>
    </div>
  );
}
