import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sword, Users, Sparkles, Map, ChevronRight, Crown, Star, Zap, Check } from 'lucide-react';

// Unified theme — same Dark Navy + Gold palette as /home (UnifiedDashboard)
const theme = {
  bg: {
    primary: '#1F1F23',
    surface: '#27272B',
    surfaceHover: '#323235',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#D1D5DB',
    muted: '#9CA3AF',
  },
  red: '#EF4444',
  redHover: '#F87171',
  border: 'rgba(239, 68, 68, 0.42)',
  borderSubtle: 'rgba(239, 68, 68, 0.24)',
};

const features = [
  { icon: Users,     title: 'Party Management', desc: 'Track characters, inventory & loot distribution' },
  { icon: Sword,     title: 'Combat Tracker',   desc: 'Initiative, HP management & 5e conditions' },
  { icon: Sparkles,  title: 'AI Tools',         desc: 'Generate NPCs, encounters & plot hooks' },
  { icon: Map,       title: 'World Building',   desc: 'Create locations, factions & campaign lore' },
];

const tiers = [
  { name: 'Free',         price: '0',   period: '',     icon: Sword, isFree: true,
    features: ['View campaigns (read-only)', 'Basic dice roller', 'Limited access'] },
  { name: 'Player',       price: 'TBD', period: '',     icon: Star,  comingSoon: true,
    features: ['Create characters', 'Join campaigns', 'Full character sheets', 'Inventory management'] },
  { name: 'Game Master',  price: '3.99', period: '/mo', icon: Crown, popular: true,
    features: ['Create campaigns', 'GM tools & AI', 'Combat tracker', 'World building'] },
  { name: 'Legendary',    price: '5.99', period: '/mo', icon: Zap,   isLegendary: true,
    features: ['Full GM access', 'Player tier included*', 'Priority AI', 'Early access to features'],
    legendaryNote: '*Player benefits included when Player tier launches' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  const panel = {
    background: theme.bg.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 0,
  };

  const redButton = {
    background: theme.red,
    color: theme.text.primary,
    border: `1px solid ${theme.red}`,
    borderRadius: 0,
    padding: '10px 22px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '14px',
    letterSpacing: 0.5,
  };

  const ghostButton = {
    background: 'transparent',
    color: theme.text.primary,
    border: `1px solid ${theme.border}`,
    borderRadius: 0,
    padding: '10px 22px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '14px',
    letterSpacing: 0.5,
  };

  return (
    <div data-testid="landing-page" style={{
      minHeight: '100vh',
      background: theme.bg.primary,
      color: theme.text.primary,
    }}>
      {/* Navigation — flat navy bar, gold accents */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 32px',
        background: theme.bg.surface,
        borderBottom: `1px solid ${theme.border}`,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sword size={22} color={theme.red} />
          <span style={{
            fontSize: 20, fontWeight: 800, color: theme.red, letterSpacing: 4,
          }}>ROOK</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button data-testid="landing-signin-btn" onClick={() => navigate('/login')} style={ghostButton}>
            Sign In
          </button>
          <button data-testid="landing-getstarted-btn" onClick={() => navigate('/login')} style={redButton}>
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section — flat navy panel, gold border */}
      <section style={{
        maxWidth: 1100, margin: '0 auto', padding: '64px 32px 32px', textAlign: 'center',
      }}>
        <div style={{ ...panel, padding: '48px 32px' }}>
          <h1 style={{
            fontSize: 'clamp(40px, 6vw, 64px)',
            fontWeight: 800,
            letterSpacing: '0.18em',
            color: theme.red,
            margin: 0,
          }}>
            ROOKIE QUEST KEEPER
          </h1>
          <p style={{
            color: theme.text.secondary,
            fontSize: 16,
            maxWidth: 560, margin: '24px auto 32px', lineHeight: 1.6,
            fontWeight: 500,
          }}>
            Your ultimate TTRPG companion for character management,
            campaign tracking, and AI-powered game mastery.
          </p>
          <button data-testid="landing-cta-btn" onClick={() => navigate('/login')} style={{
            ...redButton, padding: '14px 28px', fontSize: 15,
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            Start Your Quest <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* Features grid — same flat surface as /home cards */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 32px 48px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}>
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} data-testid={`feature-card-${i}`} style={{
                ...panel, padding: 20, textAlign: 'center',
              }}>
                <Icon size={26} color={theme.red} style={{ margin: '0 auto 10px', display: 'block' }} />
                <h3 style={{ fontSize: 15, color: theme.text.primary, margin: '0 0 6px', fontWeight: 700 }}>
                  {f.title}
                </h3>
                <p style={{ color: theme.text.secondary, fontSize: 12, margin: 0, fontWeight: 500 }}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 32px 64px' }}>
        <h2 style={{
          fontSize: 28, fontWeight: 800, textAlign: 'center', color: theme.red,
          marginBottom: 32, letterSpacing: 1,
        }}>
          Choose Your Path
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}>
          {tiers.map((tier, i) => {
            const Icon = tier.icon;
            return (
              <div key={i} data-testid={`pricing-tier-${tier.name.toLowerCase()}`} style={{
                ...panel,
                padding: 24,
                position: 'relative',
                borderColor: tier.popular ? theme.red : theme.border,
                borderWidth: tier.popular ? 2 : 1,
                opacity: tier.comingSoon ? 0.7 : 1,
              }}>
                {tier.popular && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    padding: '4px 12px', fontSize: 10, fontWeight: 800, letterSpacing: 1,
                    background: theme.red, color: theme.text.primary, borderRadius: 0,
                  }}>
                    MOST POPULAR
                  </div>
                )}
                {tier.comingSoon && (
                  <div style={{
                    position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
                    padding: '3px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1,
                    background: theme.bg.primary, color: theme.red,
                    border: `1px solid ${theme.border}`, borderRadius: 0,
                  }}>
                    COMING SOON
                  </div>
                )}
                <div style={{ marginTop: tier.comingSoon ? 28 : 0, marginBottom: 12 }}>
                  <Icon size={24} color={theme.red} />
                  <h3 style={{ fontSize: 18, color: theme.text.primary, margin: '8px 0 0', fontWeight: 800 }}>
                    {tier.name}
                  </h3>
                </div>
                <div style={{ marginBottom: 16 }}>
                  {tier.comingSoon ? (
                    <span style={{ fontSize: 22, fontWeight: 800, color: theme.red }}>{tier.price}</span>
                  ) : (
                    <>
                      <span style={{ color: theme.text.muted, fontSize: 16 }}>$</span>
                      <span style={{ fontSize: 36, fontWeight: 800, color: theme.text.primary }}>
                        {tier.price}
                      </span>
                      <span style={{ color: theme.text.muted, fontSize: 13 }}>{tier.period}</span>
                    </>
                  )}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tier.features.map((feature, fi) => (
                    <li key={fi} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      fontSize: 12, color: theme.text.secondary, fontWeight: 500,
                    }}>
                      <Check size={14} color={theme.red} style={{ marginTop: 1, flexShrink: 0 }} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {tier.legendaryNote && (
                  <p style={{ fontSize: 10, color: theme.text.muted, fontStyle: 'italic', marginBottom: 12 }}>
                    {tier.legendaryNote}
                  </p>
                )}
                <button
                  data-testid={`pricing-btn-${tier.name.toLowerCase()}`}
                  disabled={tier.comingSoon}
                  onClick={() => !tier.comingSoon && navigate('/login')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 0,
                    fontWeight: 800,
                    fontSize: 13,
                    letterSpacing: 0.5,
                    cursor: tier.comingSoon ? 'not-allowed' : 'pointer',
                    background: tier.popular ? theme.red : 'transparent',
                    color: tier.popular ? theme.text.primary : theme.text.primary,
                    border: `1px solid ${theme.border}`,
                    opacity: tier.comingSoon ? 0.5 : 1,
                  }}
                >
                  {tier.comingSoon ? 'Coming Soon' : tier.isFree ? 'Get Started' : 'Subscribe'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '24px 32px',
        textAlign: 'center',
        background: theme.bg.surface,
        borderTop: `1px solid ${theme.border}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Sword size={16} color={theme.red} />
          <span style={{ fontSize: 14, fontWeight: 800, color: theme.red, letterSpacing: 3 }}>ROOK</span>
        </div>
        <p style={{ color: theme.text.muted, fontSize: 12, fontWeight: 500, margin: 0 }}>
          &copy; {new Date().getFullYear()} Rookie Quest Keeper. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
