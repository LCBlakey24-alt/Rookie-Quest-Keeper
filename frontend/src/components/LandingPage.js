import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
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
  Wand2,
  X
} from 'lucide-react';
import { getLatestUpdates } from '@/data/latestUpdates';

const UPDATE_DISMISS_STORAGE_KEY = 'rqk-dismissed-homepage-updates';

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

const updateStyles = {
  section: {
    width: 'min(1240px, calc(100% - 40px))',
    margin: '0 auto 34px',
    padding: '18px',
    border: '1px solid var(--rq-accent-border, rgba(192, 138, 61, 0.34))',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, rgba(33, 21, 14, 0.94), rgba(46, 29, 19, 0.92))',
    boxShadow: '0 18px 48px rgba(0, 0, 0, 0.28)',
  },
  heading: {
    display: 'grid',
    gap: '8px',
    marginBottom: '14px',
  },
  headingTitle: {
    margin: 0,
    color: 'var(--rq-text-primary, #F5E6C8)',
    fontSize: 'clamp(24px, 3vw, 34px)',
    lineHeight: 1.08,
    fontWeight: 900,
  },
  headingText: {
    margin: 0,
    maxWidth: '760px',
    color: 'var(--rq-text-secondary, #E6D2AA)',
    fontSize: '14px',
    lineHeight: 1.55,
    fontWeight: 500,
  },
  list: {
    display: 'grid',
    gap: '10px',
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    border: '1px solid var(--rq-border-default, rgba(192, 138, 61, 0.22))',
    borderRadius: '10px',
    background: 'rgba(18, 12, 8, 0.58)',
  },
  toggle: {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    gap: '12px',
    alignItems: 'start',
    padding: '14px 48px 14px 14px',
    border: 0,
    background: 'transparent',
    color: 'inherit',
    textAlign: 'left',
    cursor: 'pointer',
  },
  chevron: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '999px',
    color: 'var(--rq-accent-hover, #E0B15C)',
    background: 'rgba(192, 138, 61, 0.12)',
    border: '1px solid var(--rq-accent-border, rgba(192, 138, 61, 0.34))',
    transition: 'transform 0.18s ease',
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '7px',
    alignItems: 'center',
    marginBottom: '6px',
    color: 'var(--rq-text-muted, #CDBA98)',
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
  },
  badge: {
    color: 'var(--rq-text-inverse, #120C08)',
    background: 'var(--rq-accent-primary, #C08A3D)',
    borderRadius: '999px',
    padding: '2px 7px',
    fontSize: '10px',
    fontWeight: 900,
  },
  title: {
    display: 'block',
    color: 'var(--rq-text-primary, #F5E6C8)',
    fontSize: '17px',
    lineHeight: 1.25,
    fontWeight: 900,
  },
  summary: {
    display: 'block',
    marginTop: '5px',
    color: 'var(--rq-text-secondary, #E6D2AA)',
    fontSize: '13px',
    lineHeight: 1.5,
    fontWeight: 500,
  },
  dismiss: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '30px',
    border: '1px solid var(--rq-border-default, rgba(192, 138, 61, 0.22))',
    borderRadius: '999px',
    color: 'var(--rq-text-muted, #CDBA98)',
    background: 'rgba(18, 12, 8, 0.74)',
    cursor: 'pointer',
  },
  details: {
    margin: '0 14px 14px 58px',
    padding: '12px 14px',
    borderLeft: '2px solid var(--rq-accent-primary, #C08A3D)',
    borderRadius: '8px',
    background: 'rgba(192, 138, 61, 0.08)',
    color: 'var(--rq-text-secondary, #E6D2AA)',
  },
};

function readDismissedUpdateIds() {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(UPDATE_DISMISS_STORAGE_KEY);
    const parsed = JSON.parse(stored || '[]');
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function BrandMark({ compact = false }) {
  return (
    <div className={`landing-brand ${compact ? 'landing-brand-compact' : ''}`} aria-label="Rookie Quest Keeper">
      <img src={compact ? "/images/logo-mini.png" : "/images/logo-main.png"} alt="Rookie Quest Keeper" />
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

function LandingUpdatesPanel() {
  const [dismissedIds, setDismissedIds] = useState(readDismissedUpdateIds);
  const [expandedId, setExpandedId] = useState(null);
  const updates = getLatestUpdates({ limit: 4, publicOnly: true }).filter(update => !dismissedIds.includes(update.id));

  const dismissUpdate = (updateId) => {
    const nextDismissedIds = Array.from(new Set([...dismissedIds, updateId]));
    setDismissedIds(nextDismissedIds);
    if (expandedId === updateId) setExpandedId(null);

    try {
      window.localStorage.setItem(UPDATE_DISMISS_STORAGE_KEY, JSON.stringify(nextDismissedIds));
    } catch {
      // Dismiss still works for this session if localStorage is unavailable.
    }
  };

  if (!updates.length) return null;

  return (
    <section className="landing-updates" style={updateStyles.section} aria-label="Latest Rookie Quest Keeper updates">
      <div style={updateStyles.heading}>
        <span className="landing-kicker">Latest updates</span>
        <h2 style={updateStyles.headingTitle}>What’s new at the table</h2>
        <p style={updateStyles.headingText}>Quick, player-friendly notes. Expand an update for the details or dismiss it once you’ve seen enough.</p>
      </div>

      <div style={updateStyles.list}>
        {updates.map((update) => {
          const isExpanded = expandedId === update.id;
          return (
            <article key={update.id} style={updateStyles.card}>
              <button
                type="button"
                style={updateStyles.toggle}
                aria-expanded={isExpanded}
                onClick={() => setExpandedId(isExpanded ? null : update.id)}
              >
                <span style={{ ...updateStyles.chevron, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} aria-hidden="true">
                  <ChevronDown size={18} />
                </span>
                <span>
                  <span style={updateStyles.meta}>
                    <span>{update.date}</span>
                    <span>{update.category}</span>
                    <strong style={updateStyles.badge}>{update.badge}</strong>
                  </span>
                  <span style={updateStyles.title}>{update.title}</span>
                  <span style={updateStyles.summary}>{update.summary}</span>
                </span>
              </button>

              <button
                type="button"
                style={updateStyles.dismiss}
                aria-label={`Dismiss update: ${update.title}`}
                onClick={() => dismissUpdate(update.id)}
              >
                <X size={16} />
              </button>

              {isExpanded && update.details?.length > 0 && (
                <div style={updateStyles.details}>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {update.details.map((detail) => (
                      <li key={detail} style={{ margin: '6px 0', fontSize: 13, lineHeight: 1.5 }}>{detail}</li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
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

        <LandingUpdatesPanel />

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
        <BrandMark compact />
        <p>&copy; {new Date().getFullYear()} Rookie Quest Keeper. All rights reserved.</p>
      </footer>
    </div>
  );
}
