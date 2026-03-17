import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sword, Users, Sparkles, Map, ChevronRight, Crown, Star, Zap, Check } from 'lucide-react';

// New color scheme
const colors = {
  main: '#390292',
  secondary: '#ee006b',
  tertiary: '#ff3600',
  text: '#ffffff',
  textMuted: '#ffffff',  // Changed to white for better visibility
  glass: 'rgba(15, 10, 30, 0.85)',  // Much darker/foggier glass
  glassBorder: 'rgba(238, 0, 107, 0.4)'
};

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    { icon: <Users size={20} />, title: "Party Management", desc: "Track characters & loot" },
    { icon: <Sword size={20} />, title: "Combat Tracker", desc: "Initiative & HP tracking" },
    { icon: <Sparkles size={20} />, title: "AI Tools", desc: "Generate NPCs & encounters" },
    { icon: <Map size={20} />, title: "World Building", desc: "Create locations & lore" }
  ];

  const tiers = [
    {
      name: 'Free',
      price: '0',
      period: '',
      icon: <Sword size={20} />,
      features: ['View campaigns (read-only)', 'Basic dice roller', 'Limited access'],
      color: colors.main,
      isFree: true
    },
    {
      name: 'Player',
      price: 'TBD',
      period: '',
      icon: <Star size={20} />,
      features: ['Create characters', 'Join campaigns', 'Full character sheets', 'Inventory management'],
      color: colors.secondary,
      comingSoon: true
    },
    {
      name: 'Game Master',
      price: '3.99',
      period: '/mo',
      icon: <Crown size={20} />,
      features: ['Create campaigns', 'GM tools & AI', 'Combat tracker', 'World building'],
      color: colors.tertiary,
      popular: true
    },
    {
      name: 'Legendary',
      price: '5.99',
      period: '/mo',
      icon: <Zap size={20} />,
      features: ['Full GM access', 'Player tier included*', 'Priority AI', 'Early access to features'],
      color: colors.tertiary,
      isLegendary: true,
      legendaryNote: '*Player benefits included when Player tier launches'
    }
  ];

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: `linear-gradient(135deg, rgba(57, 2, 146, 0.3) 0%, rgba(238, 0, 107, 0.2) 50%, rgba(255, 54, 0, 0.2) 100%), url('https://static.prod-images.emergentagent.com/jobs/b9fc55bd-0a80-4d15-9934-a7087e3445c8/images/9be68b2095230a13a9d52ed25ea5ba93da54c6f47b915d5cd89f4c7b8992a6d3.png')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      {/* Navigation */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 30px',
        background: colors.glass,
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${colors.glassBorder}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/images/logo-mini.png" alt="RQK" style={{ height: '32px', filter: `drop-shadow(0 0 8px ${colors.secondary})` }} />
          <span style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '18px',
            fontWeight: '700',
            background: `linear-gradient(135deg, ${colors.main}, ${colors.secondary}, ${colors.tertiary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>RQK</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/login')} style={{
            padding: '8px 16px',
            background: 'transparent',
            border: `1px solid ${colors.secondary}`,
            borderRadius: '6px',
            color: colors.text,
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: "'Montserrat', sans-serif"
          }}>Sign In</button>
          <button onClick={() => navigate('/login')} style={{
            padding: '8px 16px',
            background: `linear-gradient(135deg, ${colors.main}, ${colors.secondary})`,
            border: 'none',
            borderRadius: '6px',
            color: colors.text,
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: "'Montserrat', sans-serif"
          }}>Get Started</button>
        </div>
      </nav>

      {/* Hero Section - Compact */}
      <section style={{
        padding: '40px 30px 30px',
        textAlign: 'center',
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        <div style={{
          background: colors.glass,
          backdropFilter: 'blur(24px)',
          border: `1px solid ${colors.glassBorder}`,
          borderRadius: '20px',
          padding: '30px 40px'
        }}>
          {/* Logo - Centered */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <img 
              src="/images/logo-main.png" 
              alt="Rookie Quest Keeper"
              style={{
                width: '220px',
                maxWidth: '70%',
                height: 'auto',
                filter: `drop-shadow(0 0 30px ${colors.secondary})`,
              }}
            />
          </div>
          
          <h1 style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 'clamp(3rem, 8vw, 5rem)',
            fontWeight: '900',
            color: '#ffffff',
            textShadow: `0 0 40px ${colors.secondary}, 0 0 80px ${colors.main}`,
            marginBottom: '16px',
            letterSpacing: '0.2em'
          }}>KEEPER</h1>
          
          <p style={{
            color: colors.textMuted,
            fontSize: '14px',
            maxWidth: '500px',
            margin: '0 auto 20px',
            fontFamily: "'Montserrat', sans-serif",
            lineHeight: '1.5'
          }}>
            Your ultimate TTRPG companion for character management, campaign tracking, and AI-powered game mastery.
          </p>

          <button onClick={() => navigate('/login')} style={{
            padding: '12px 32px',
            background: `linear-gradient(135deg, ${colors.main}, ${colors.secondary})`,
            border: 'none',
            borderRadius: '8px',
            color: colors.text,
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: "'Montserrat', sans-serif",
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: `0 4px 20px ${colors.secondary}40`
          }}>
            Start Your Quest <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* Features Row - Compact */}
      <section style={{
        padding: '20px 30px',
        maxWidth: '1100px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px'
        }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: colors.glass,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${colors.glassBorder}`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ color: colors.secondary, marginBottom: '8px' }}>{f.icon}</div>
              <h3 style={{ 
                fontFamily: "'Cinzel', serif", 
                fontSize: '13px', 
                color: colors.text, 
                marginBottom: '4px' 
              }}>{f.title}</h3>
              <p style={{ 
                fontSize: '11px', 
                color: colors.textMuted,
                fontFamily: "'Montserrat', sans-serif"
              }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing - 4 Tiers Side by Side */}
      <section style={{
        padding: '20px 30px 40px',
        maxWidth: '1100px',
        margin: '0 auto'
      }}>
        <h2 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '20px',
          color: colors.text,
          textAlign: 'center',
          marginBottom: '16px'
        }}>Choose Your Path</h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px'
        }}>
          {tiers.map((tier, i) => (
            <div key={i} style={{
              background: colors.glass,
              backdropFilter: 'blur(20px)',
              border: tier.popular ? `2px solid ${colors.tertiary}` : `1px solid ${colors.glassBorder}`,
              borderRadius: '14px',
              padding: '20px 16px',
              position: 'relative',
              opacity: tier.comingSoon ? 0.7 : 1
            }}>
              {/* Coming Soon Banner */}
              {tier.comingSoon && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: colors.secondary,
                  color: colors.text,
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '9px',
                  fontWeight: '600',
                  fontFamily: "'Montserrat', sans-serif",
                  textTransform: 'uppercase'
                }}>Coming Soon</div>
              )}
              
              {/* Popular Badge */}
              {tier.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: `linear-gradient(135deg, ${colors.secondary}, ${colors.tertiary})`,
                  color: colors.text,
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '9px',
                  fontWeight: '600',
                  fontFamily: "'Montserrat', sans-serif",
                  textTransform: 'uppercase'
                }}>Most Popular</div>
              )}
              
              <div style={{ color: tier.color, marginBottom: '8px', marginTop: tier.comingSoon ? '20px' : '0' }}>{tier.icon}</div>
              <h3 style={{ 
                fontFamily: "'Cinzel', serif", 
                fontSize: '16px', 
                color: colors.text,
                marginBottom: '8px'
              }}>{tier.name}</h3>
              
              <div style={{ marginBottom: '12px' }}>
                <span style={{ 
                  fontSize: tier.price === 'TBD' ? '20px' : '28px', 
                  fontWeight: '700', 
                  color: tier.price === 'TBD' ? colors.textMuted : tier.color,
                  fontFamily: "'Montserrat', sans-serif"
                }}>
                  {tier.price === '0' ? 'Free' : tier.price === 'TBD' ? 'Coming Soon' : `£${tier.price}`}
                </span>
                {tier.period && <span style={{ fontSize: '12px', color: colors.textMuted }}>{tier.period}</span>}
              </div>
              
              {/* 7 Day Trial */}
              {tier.price !== '0' && (
                <div style={{
                  background: `${colors.main}40`,
                  borderRadius: '6px',
                  padding: '6px 10px',
                  marginBottom: '12px',
                  fontSize: '10px',
                  color: colors.textMuted,
                  fontFamily: "'Montserrat', sans-serif"
                }}>
                  7-day free trial
                </div>
              )}
              
              <ul style={{ 
                listStyle: 'none', 
                padding: 0, 
                margin: '0 0 16px',
                fontSize: '11px',
                color: colors.textMuted,
                fontFamily: "'Montserrat', sans-serif"
              }}>
                {tier.features.map((f, j) => (
                  <li key={j} style={{ 
                    padding: '4px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Check size={12} style={{ color: tier.color }} /> {f}
                  </li>
                ))}
              </ul>
              
              {/* Legendary Note */}
              {tier.legendaryNote && (
                <div style={{
                  fontSize: '9px',
                  color: colors.textMuted,
                  fontStyle: 'italic',
                  marginBottom: '12px',
                  padding: '8px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '4px'
                }}>
                  {tier.legendaryNote}
                </div>
              )}
              
              <button 
                onClick={() => !tier.comingSoon && navigate('/login')}
                disabled={tier.comingSoon}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: tier.comingSoon ? '#555' : tier.isFree ? 'rgba(139, 92, 246, 0.3)' : `linear-gradient(135deg, ${tier.color}, ${colors.secondary})`,
                  border: tier.isFree ? `1px solid ${colors.main}` : 'none',
                  borderRadius: '6px',
                  color: colors.text,
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: tier.comingSoon ? 'not-allowed' : 'pointer',
                  fontFamily: "'Montserrat', sans-serif"
                }}
              >
                {tier.comingSoon ? 'Coming Soon' : tier.isFree ? 'Get Started Free' : 'Start Trial'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '16px 30px',
        textAlign: 'center',
        background: colors.glass,
        backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${colors.glassBorder}`
      }}>
        <p style={{ 
          fontSize: '11px', 
          color: colors.textMuted,
          fontFamily: "'Montserrat', sans-serif"
        }}>
          © 2026 Rookie Quest Keeper. Not affiliated with Wizards of the Coast.
        </p>
      </footer>
    </div>
  );
}
