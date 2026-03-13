import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sword, Users, Sparkles, Map, Scroll, Shield, ChevronRight } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Users size={28} />,
      title: "Party Management",
      description: "Track characters, share loot, and keep your party organized in one place."
    },
    {
      icon: <Sword size={28} />,
      title: "Combat Tracker",
      description: "Initiative rolls, HP tracking, and turn management made simple."
    },
    {
      icon: <Sparkles size={28} />,
      title: "AI-Powered Tools",
      description: "Generate NPCs, encounters, and story hooks with ROOK AI."
    },
    {
      icon: <Map size={28} />,
      title: "World Building",
      description: "Create locations, factions, and lore for your campaign setting."
    }
  ];

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Fantasy Sunset Background */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url('https://static.prod-images.emergentagent.com/jobs/b9fc55bd-0a80-4d15-9934-a7087e3445c8/images/9be68b2095230a13a9d52ed25ea5ba93da54c6f47b915d5cd89f4c7b8992a6d3.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(3px)',
          transform: 'scale(1.1)',
          zIndex: 0
        }}
      />
      
      {/* Overlay for readability */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, rgba(15, 10, 30, 0.4) 0%, rgba(15, 10, 30, 0.6) 50%, rgba(15, 10, 30, 0.8) 100%)',
          zIndex: 1
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* Navigation */}
        <nav style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 40px',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src="/images/logo-mini.png" 
              alt="ROOK" 
              style={{ height: '40px', width: 'auto', filter: 'drop-shadow(0 2px 8px rgba(139, 92, 246, 0.5))' }}
            />
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '24px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              ROOK
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => navigate('/auth')}
              style={{
                padding: '10px 24px',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                color: '#F8FAFC',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Login
            </button>
            <button
              onClick={() => navigate('/auth')}
              style={{
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 20px rgba(236, 72, 153, 0.3)'
              }}
            >
              Get Started
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <section style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '80px 24px 120px',
          minHeight: '70vh'
        }}>
          {/* Glass Panel Hero */}
          <div style={{
            background: 'rgba(15, 10, 30, 0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '24px',
            padding: '60px 80px',
            maxWidth: '800px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 60px rgba(139, 92, 246, 0.2)'
          }}>
            {/* Grand Logo */}
            <div style={{
              position: 'relative',
              marginBottom: '24px'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, rgba(236, 72, 153, 0.3) 40%, transparent 70%)',
                borderRadius: '50%',
                filter: 'blur(50px)',
                animation: 'pulse 4s ease-in-out infinite'
              }} />
              <img 
                src="/images/logo-main.png" 
                alt="Rookie Quest Keeper"
                style={{
                  position: 'relative',
                  width: '380px',
                  maxWidth: '90%',
                  height: 'auto',
                  filter: 'drop-shadow(0 0 40px rgba(139, 92, 246, 0.7)) drop-shadow(0 0 80px rgba(236, 72, 153, 0.5))',
                  margin: '0 auto',
                  display: 'block',
                  animation: 'float 6s ease-in-out infinite'
                }}
              />
            </div>
            
            {/* KEEPER Title - Big and Eye-catching */}
            <h1 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 'clamp(3rem, 8vw, 5rem)',
              fontWeight: '700',
              marginBottom: '24px',
              letterSpacing: '0.2em',
              background: 'linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B, #EC4899, #8B5CF6)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer 3s ease-in-out infinite',
              textShadow: '0 0 60px rgba(139, 92, 246, 0.5)',
              filter: 'drop-shadow(0 0 30px rgba(236, 72, 153, 0.4))'
            }}>
              KEEPER
            </h1>
            
            <p style={{
              fontSize: '18px',
              color: '#94A3B8',
              marginBottom: '40px',
              lineHeight: '1.7',
              maxWidth: '500px',
              margin: '0 auto 40px'
            }}>
              Your all-in-one campaign operating system for D&D 5e. 
              Build worlds, track combat, and create legendary adventures.
            </p>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/auth')}
                data-testid="hero-gm-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #F59E0B 100%)',
                  border: 'none',
                  borderRadius: '14px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 24px rgba(236, 72, 153, 0.4)'
                }}
              >
                <Sword size={20} /> Start Your Quest
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section style={{
          padding: '80px 24px',
          background: 'rgba(15, 10, 30, 0.9)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '2.5rem',
              textAlign: 'center',
              marginBottom: '16px',
              color: '#F8FAFC'
            }}>
              Everything You Need
            </h2>
            <p style={{
              textAlign: 'center',
              color: '#94A3B8',
              marginBottom: '60px',
              fontSize: '18px'
            }}>
              Powerful tools for Game Masters and Players alike
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px'
            }}>
              {features.map((feature, index) => (
                <div
                  key={index}
                  style={{
                    background: 'rgba(26, 17, 46, 0.6)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '16px',
                    padding: '32px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(236, 72, 153, 0.4)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(139, 92, 246, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(139, 92, 246, 0.2)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    color: '#EC4899'
                  }}>
                    {feature.icon}
                  </div>
                  <h3 style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '1.25rem',
                    marginBottom: '12px',
                    color: '#F8FAFC'
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    color: '#94A3B8',
                    lineHeight: '1.6'
                  }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section style={{
          padding: '80px 24px',
          background: 'rgba(15, 10, 30, 0.95)'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '2.5rem',
              textAlign: 'center',
              marginBottom: '16px',
              color: '#F8FAFC'
            }}>
              Choose Your Path
            </h2>
            <p style={{
              textAlign: 'center',
              color: '#94A3B8',
              marginBottom: '48px',
              fontSize: '18px'
            }}>
              Start free, upgrade when you're ready
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '24px',
              maxWidth: '1100px',
              margin: '0 auto'
            }}>
              {/* Free Tier */}
              <div style={{
                background: 'rgba(26, 17, 46, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '20px',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', color: '#94A3B8', marginBottom: '8px' }}>Free</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#F8FAFC', marginBottom: '8px' }}>$0</div>
                <p style={{ color: '#64748B', marginBottom: '24px', fontSize: '14px' }}>Forever free to explore</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                  {['Create 2 characters', 'Join campaigns', 'Basic character sheet', 'Dice roller'].map((feature, i) => (
                    <li key={i} style={{ color: '#94A3B8', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#10B981' }}>✓</span> {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/auth')}
                  style={{
                    marginTop: '24px',
                    padding: '14px',
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '12px',
                    color: '#F8FAFC',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Get Started
                </button>
              </div>

              {/* Player Tier */}
              <div style={{
                background: 'rgba(26, 17, 46, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '20px',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', color: '#8B5CF6', marginBottom: '8px' }}>Player</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#F8FAFC' }}>$3.99</span>
                  <span style={{ color: '#64748B' }}>/month</span>
                </div>
                <p style={{ color: '#64748B', marginBottom: '24px', fontSize: '14px' }}>Perfect for adventurers</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                  {['Unlimited characters', 'Advanced character sheets', 'Inventory management', 'Spell tracking', 'Session notes'].map((feature, i) => (
                    <li key={i} style={{ color: '#94A3B8', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#8B5CF6' }}>✓</span> {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/pricing')}
                  style={{
                    marginTop: '24px',
                    padding: '14px',
                    background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)'
                  }}
                >
                  Choose Player
                </button>
              </div>

              {/* GM Tier */}
              <div style={{
                background: 'rgba(26, 17, 46, 0.6)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '20px',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', color: '#F59E0B', marginBottom: '8px' }}>Game Master</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#F8FAFC' }}>$3.99</span>
                  <span style={{ color: '#64748B' }}>/month</span>
                </div>
                <p style={{ color: '#64748B', marginBottom: '24px', fontSize: '14px' }}>For storytellers & world builders</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                  {['Create campaigns', 'Combat tracker', 'NPC & monster tools', 'ROOK AI generation', 'World building tools'].map((feature, i) => (
                    <li key={i} style={{ color: '#94A3B8', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#F59E0B' }}>✓</span> {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/pricing')}
                  style={{
                    marginTop: '24px',
                    padding: '14px',
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#0F0A1E',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)'
                  }}
                >
                  Choose GM
                </button>
              </div>

              {/* Legendary Tier */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.15))',
                border: '2px solid rgba(236, 72, 153, 0.5)',
                borderRadius: '20px',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '-30px',
                  background: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
                  color: 'white',
                  padding: '4px 40px',
                  fontSize: '11px',
                  fontWeight: '600',
                  transform: 'rotate(45deg)'
                }}>
                  BEST VALUE
                </div>
                <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', background: 'linear-gradient(135deg, #EC4899, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>Legendary</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#F8FAFC' }}>$5.99</span>
                  <span style={{ color: '#64748B' }}>/month</span>
                </div>
                <p style={{ color: '#64748B', marginBottom: '24px', fontSize: '14px' }}>The complete experience</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                  {['All Player features', 'All GM features', 'Priority support', 'Early access to new features', 'Exclusive content'].map((feature, i) => (
                    <li key={i} style={{ color: '#94A3B8', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#EC4899' }}>✓</span> {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/pricing')}
                  style={{
                    marginTop: '24px',
                    padding: '14px',
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #F59E0B 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(236, 72, 153, 0.4)'
                  }}
                >
                  Go Legendary
                </button>
              </div>
            </div>

            <p style={{ textAlign: 'center', color: '#64748B', marginTop: '32px', fontSize: '14px' }}>
              Save ~17% with yearly billing • All plans include 14-day free trial
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section style={{
          padding: '100px 24px',
          textAlign: 'center',
          background: 'rgba(15, 10, 30, 0.95)'
        }}>
          <div style={{
            background: 'rgba(26, 17, 46, 0.6)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '24px',
            padding: '60px',
            maxWidth: '700px',
            margin: '0 auto',
            boxShadow: '0 0 60px rgba(139, 92, 246, 0.15)'
          }}>
            <h2 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '2rem',
              marginBottom: '16px',
              color: '#F8FAFC'
            }}>
              Ready to Begin?
            </h2>
            <p style={{
              color: '#94A3B8',
              marginBottom: '32px',
              fontSize: '16px'
            }}>
              Join thousands of Game Masters running better campaigns with ROOK.
            </p>
            <button
              onClick={() => navigate('/auth')}
              style={{
                padding: '16px 40px',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #F59E0B 100%)',
                border: 'none',
                borderRadius: '14px',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(236, 72, 153, 0.4)'
              }}
            >
              Create Free Account
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          padding: '40px 24px',
          background: 'rgba(10, 5, 20, 0.95)',
          borderTop: '1px solid rgba(139, 92, 246, 0.2)',
          textAlign: 'center'
        }}>
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '18px',
            background: 'linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '12px'
          }}>
            ROOK
          </div>
          <p style={{ color: '#64748B', fontSize: '14px' }}>
            © 2026 Rookie Quest Keeper. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
