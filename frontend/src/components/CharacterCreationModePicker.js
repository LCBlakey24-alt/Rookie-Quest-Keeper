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

const COLORS = {
  page: '#1F1F23',
  panel: '#27272B',
  panelAlt: '#323235',
  accent: '#EF4444',
  accentBright: '#F87171',
  text: '#F8FAFC',
  muted: '#94A3B8',
  soft: '#64748B',
  border: 'rgba(239, 68, 68, 0.35)',
  borderStrong: 'rgba(239, 68, 68, 0.62)',
};

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
    <main style={styles.page}>
      <div style={styles.shell}>
        <button
          onClick={() => navigate('/home')}
          data-testid="mode-picker-back"
          style={styles.backButton}
        >
          <ChevronLeft size={17} /> Dashboard
        </button>

        <section style={styles.hero}>
          <div style={styles.heroCopy}>
            <div style={styles.kicker}>
              <Sparkles size={16} /> New Character
            </div>
            <h1 style={styles.title}>How do you want to build your hero?</h1>
            <p style={styles.subtitle}>
              Choose the creation style that matches your table, your confidence, and how much control you want. You can edit the character later, so this choice is not a trapdoor into doom.
            </p>
          </div>

          <aside style={styles.tipCard} data-testid="mode-picker-help-card">
            <div style={styles.tipIcon}><HelpCircle size={20} /></div>
            <div>
              <h2 style={styles.tipTitle}>Not sure?</h2>
              <p style={styles.tipText}>
                Start with <strong>Basic Build</strong>. It gives you the important choices without making character creation feel like tax paperwork with goblins.
              </p>
            </div>
          </aside>
        </section>

        <section style={styles.modeGrid} aria-label="Character creation modes">
          {modes.map((mode) => (
            <ModeCard key={mode.key} mode={mode} onChoose={() => navigate(mode.route)} />
          ))}
        </section>

        <section style={styles.footerPanel} data-testid="mode-picker-summary">
          <div style={styles.summaryItem}>
            <ShieldCheck size={18} />
            <span>All modes create a saved character sheet.</span>
          </div>
          <div style={styles.summaryItem}>
            <Crown size={18} />
            <span>You can edit and improve characters after creation.</span>
          </div>
          <div style={styles.summaryItem}>
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
      style={{
        ...styles.card,
        ...(mode.featured ? styles.featuredCard : null),
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.borderColor = COLORS.accentBright;
        e.currentTarget.style.background = COLORS.panelAlt;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = mode.featured ? COLORS.accentBright : COLORS.border;
        e.currentTarget.style.background = COLORS.panel;
      }}
    >
      <div style={styles.cardTopline}>
        <span style={styles.eyebrow}>{mode.eyebrow}</span>
        <span style={{ ...styles.badge, ...(mode.featured ? styles.featuredBadge : null) }}>{mode.badge}</span>
      </div>

      <div style={styles.cardHeader}>
        <div style={{ ...styles.iconBox, ...(mode.featured ? styles.featuredIconBox : null) }}>
          <Icon size={22} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={styles.cardTitle}>{mode.title}</h2>
          <div style={styles.timeRow}><Clock size={13} /> {mode.time}</div>
        </div>
      </div>

      <p style={styles.description}>{mode.description}</p>

      <div style={styles.bestForBox}>
        <strong>Best for:</strong> {mode.bestFor}
      </div>

      <ul style={styles.includesList}>
        {mode.includes.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <div style={styles.chooseRow}>
        <span>Choose this mode</span>
        <ChevronRight size={18} />
      </div>
    </button>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: `radial-gradient(circle at top left, rgba(239,68,68,0.16), transparent 34%), ${COLORS.page}`,
    color: COLORS.text,
    fontFamily: "'Montserrat', system-ui, sans-serif",
    padding: '28px 18px 44px',
  },
  shell: {
    width: 'min(1120px, 100%)',
    margin: '0 auto',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    background: 'transparent',
    border: `1px solid ${COLORS.border}`,
    color: COLORS.muted,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 800,
    marginBottom: 18,
    padding: '8px 11px',
    borderRadius: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  hero: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 360px)',
    gap: 18,
    alignItems: 'stretch',
    marginBottom: 20,
  },
  heroCopy: {
    background: 'rgba(39,39,43,0.72)',
    border: `1px solid ${COLORS.border}`,
    padding: '24px 22px',
    borderRadius: 18,
  },
  kicker: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    color: COLORS.accentBright,
    fontSize: 12,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  title: {
    margin: 0,
    color: COLORS.text,
    fontSize: 'clamp(30px, 5vw, 52px)',
    lineHeight: 0.96,
    fontWeight: 900,
    letterSpacing: -1.4,
  },
  subtitle: {
    color: COLORS.muted,
    margin: '14px 0 0',
    maxWidth: 760,
    fontSize: 15,
    lineHeight: 1.65,
  },
  tipCard: {
    background: 'rgba(239,68,68,0.10)',
    border: `1px solid ${COLORS.borderStrong}`,
    borderRadius: 18,
    padding: 18,
    display: 'flex',
    gap: 14,
    alignItems: 'flex-start',
  },
  tipIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    border: `1px solid ${COLORS.borderStrong}`,
    color: COLORS.accentBright,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
  },
  tipTitle: {
    margin: '0 0 6px',
    fontSize: 18,
    fontWeight: 900,
    color: COLORS.text,
  },
  tipText: {
    margin: 0,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 1.6,
  },
  modeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(245px, 1fr))',
    gap: 16,
  },
  card: {
    appearance: 'none',
    WebkitAppearance: 'none',
    border: `1px solid ${COLORS.border}`,
    background: COLORS.panel,
    color: COLORS.text,
    borderRadius: 18,
    padding: 18,
    textAlign: 'left',
    cursor: 'pointer',
    minHeight: 360,
    display: 'flex',
    flexDirection: 'column',
    gap: 13,
    transition: 'transform 160ms ease, border-color 160ms ease, background 160ms ease',
    boxShadow: '0 18px 38px rgba(0,0,0,0.18)',
  },
  featuredCard: {
    borderColor: COLORS.accentBright,
    boxShadow: '0 22px 48px rgba(239,68,68,0.16)',
  },
  cardTopline: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eyebrow: {
    color: COLORS.soft,
    fontSize: 10,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  badge: {
    color: COLORS.muted,
    border: '1px solid rgba(255,255,255,0.09)',
    background: 'rgba(255,255,255,0.04)',
    padding: '4px 7px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  featuredBadge: {
    color: COLORS.page,
    borderColor: COLORS.accentBright,
    background: COLORS.accentBright,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    border: `1px solid ${COLORS.borderStrong}`,
    color: COLORS.accentBright,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    background: 'rgba(239,68,68,0.07)',
  },
  featuredIconBox: {
    background: 'rgba(239,68,68,0.16)',
  },
  cardTitle: {
    margin: 0,
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 900,
    letterSpacing: -0.4,
  },
  timeRow: {
    marginTop: 5,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: 800,
  },
  description: {
    margin: 0,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 1.6,
  },
  bestForBox: {
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.12)',
    borderRadius: 12,
    padding: '10px 11px',
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 1.5,
  },
  includesList: {
    margin: 0,
    paddingLeft: 18,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 1.75,
  },
  chooseRow: {
    marginTop: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTop: '1px solid rgba(255,255,255,0.08)',
    paddingTop: 13,
    color: COLORS.accentBright,
    fontSize: 12,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  footerPanel: {
    marginTop: 16,
    border: `1px solid ${COLORS.border}`,
    background: 'rgba(39,39,43,0.72)',
    borderRadius: 16,
    padding: 14,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 10,
  },
  summaryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.35,
  },
};
