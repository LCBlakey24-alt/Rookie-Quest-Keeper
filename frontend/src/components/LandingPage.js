import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  Map,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Sword,
  Users
} from 'lucide-react';

const theme = {
  bg: {
    primary: '#1F1F23',
    surface: '#27272B',
    surfaceHover: '#323235'
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#D1D5DB',
    muted: '#9CA3AF'
  },
  red: '#EF4444',
  redHover: '#F87171',
  border: 'rgba(239, 68, 68, 0.42)',
  borderSubtle: 'rgba(239, 68, 68, 0.24)'
};

const features = [
  { icon: Users, title: 'Party Management', desc: 'Track characters, inventory, player notes, and campaign membership in one place.' },
  { icon: Sword, title: 'Combat Tools', desc: 'Run initiative, manage HP, prep encounters, and keep combat moving at the table.' },
  { icon: Sparkles, title: 'ROOK AI', desc: 'Generate NPCs, locations, recaps, hooks, and structured campaign content from your notes.' },
  { icon: Map, title: 'World Building', desc: 'Organize maps, locations, calendars, factions, gods, and lore for long-running games.' }
];

const workflow = [
  { icon: BookOpen, title: 'Build', desc: 'Create characters, campaigns, rulesets, and custom content before the session starts.' },
  { icon: ShieldCheck, title: 'Run', desc: 'Open the GM screen, roll dice, track combat, and keep live notes without leaving the app.' },
  { icon: ScrollText, title: 'Remember', desc: 'Turn session notes into recaps, player-facing updates, and searchable campaign history.' }
];

const screenshots = [
  { src: '/screenshots/player-hub.png', alt: 'ROOK player hub with character tools' },
  { src: '/screenshots/world-builder.png', alt: 'ROOK world builder campaign tools' },
  { src: '/screenshots/session-notes.png', alt: 'ROOK session notes workspace' }
];

export default function LandingPage() {
  const navigate = useNavigate();

  const panel = {
    background: theme.bg.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 8
  };

  const redButton = {
    background: theme.red,
    color: theme.text.primary,
    border: `1px solid ${theme.red}`,
    borderRadius: 8,
    padding: '10px 22px',
    fontWeight: 800,
    cursor: 'pointer',
    fontSize: 14,
    letterSpacing: 0
  };

  const ghostButton = {
    background: 'transparent',
    color: theme.text.primary,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    padding: '10px 22px',
    fontWeight: 800,
    cursor: 'pointer',
    fontSize: 14,
    letterSpacing: 0
  };

  return (
    <div data-testid="landing-page" style={{ minHeight: '100vh', background: theme.bg.primary, color: theme.text.primary }}>
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 32px',
        background: theme.bg.surface,
        borderBottom: `1px solid ${theme.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        gap: 16,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sword size={22} color={theme.red} />
          <span style={{ fontSize: 20, fontWeight: 900, color: theme.red, letterSpacing: 3 }}>ROOK</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button data-testid="landing-signin-btn" onClick={() => navigate('/login')} style={ghostButton}>
            Sign In
          </button>
          <button data-testid="landing-getstarted-btn" onClick={() => navigate('/login')} style={redButton}>
            Get Started
          </button>
        </div>
      </nav>

      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '56px 32px 28px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 0.9fr) minmax(320px, 1.1fr)',
          gap: 28,
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              fontSize: 'clamp(40px, 6vw, 72px)',
              fontWeight: 900,
              letterSpacing: 0,
              color: theme.text.primary,
              margin: 0,
              lineHeight: 0.95
            }}>
              Rookie Quest Keeper
            </h1>
            <p style={{
              color: theme.text.secondary,
              fontSize: 17,
              maxWidth: 600,
              margin: '22px 0 30px',
              lineHeight: 1.65,
              fontWeight: 500
            }}>
              A focused TTRPG workspace for building characters, running campaigns, managing live sessions, and keeping your table organized.
            </p>
            <button data-testid="landing-cta-btn" onClick={() => navigate('/login')} style={{
              ...redButton,
              padding: '14px 28px',
              fontSize: 15,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}>
              Start Your Quest <ChevronRight size={18} />
            </button>
          </div>

          <div style={{ ...panel, overflow: 'hidden', boxShadow: '0 18px 60px rgba(0,0,0,0.35)' }}>
            <img
              src="/screenshots/player-hub.png"
              alt="ROOK dashboard preview"
              style={{ width: '100%', display: 'block', aspectRatio: '16 / 10', objectFit: 'cover' }}
            />
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '22px 32px 42px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16
        }}>
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} data-testid={`feature-card-${index}`} style={{ ...panel, padding: 20 }}>
                <Icon size={26} color={theme.red} style={{ marginBottom: 12 }} />
                <h3 style={{ fontSize: 16, color: theme.text.primary, margin: '0 0 8px', fontWeight: 800 }}>
                  {feature.title}
                </h3>
                <p style={{ color: theme.text.secondary, fontSize: 13, margin: 0, lineHeight: 1.55, fontWeight: 500 }}>
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 32px 64px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 0.75fr) minmax(0, 1.25fr)', gap: 20, alignItems: 'start' }}>
          <div>
            <h2 style={{ fontSize: 30, fontWeight: 900, margin: '0 0 12px', color: theme.text.primary }}>
              Built For The Whole Session
            </h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {workflow.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} style={{ ...panel, padding: 16, display: 'flex', gap: 12 }}>
                    <Icon size={21} color={theme.red} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>{item.title}</h3>
                      <p style={{ margin: 0, color: theme.text.secondary, fontSize: 12, lineHeight: 1.5 }}>{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
            {screenshots.map((shot) => (
              <div key={shot.src} style={{ ...panel, overflow: 'hidden', background: theme.bg.surfaceHover }}>
                <img
                  src={shot.src}
                  alt={shot.alt}
                  style={{ width: '100%', display: 'block', aspectRatio: '16 / 10', objectFit: 'contain', background: theme.bg.primary }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{
        padding: '24px 32px',
        textAlign: 'center',
        background: theme.bg.surface,
        borderTop: `1px solid ${theme.border}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Sword size={16} color={theme.red} />
          <span style={{ fontSize: 14, fontWeight: 900, color: theme.red, letterSpacing: 3 }}>ROOK</span>
        </div>
        <p style={{ color: theme.text.muted, fontSize: 12, fontWeight: 500, margin: 0 }}>
          &copy; {new Date().getFullYear()} Rookie Quest Keeper. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
