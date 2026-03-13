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
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '24px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            ROOK
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
            <h1 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              fontWeight: '700',
              marginBottom: '8px',
              background: 'linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              ROOKIE QUEST
            </h1>
            <h2 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: '600',
              color: '#F8FAFC',
              marginBottom: '24px',
              letterSpacing: '0.1em'
            }}>
              KEEPER
            </h2>
            
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
