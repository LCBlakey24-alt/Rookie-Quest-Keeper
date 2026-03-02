import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sword, Users, Map, Sparkles, Dices, BookOpen, Crown, 
  ChevronRight, Star, Shield, Wand2, Globe, Scroll,
  ArrowRight, Check, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';

function LandingPage() {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: Globe,
      title: "World Builder",
      description: "Build immersive worlds with a hierarchical system: Continents, Countries, Cities, and Places of Interest.",
      color: "#22c55e",
      details: ["Nested location hierarchy", "AI-generated descriptions", "Custom place types"]
    },
    {
      icon: Sword,
      title: "Combat Manager",
      description: "Run epic battles with our initiative tracker, monster database, and interactive battle maps.",
      color: "#ef4444",
      details: ["300+ monster statblocks", "Drag-and-drop tokens", "Encounter difficulty calculator"]
    },
    {
      icon: Sparkles,
      title: "Unseen Servant AI",
      description: "Generate NPCs, gods, locations, and lore instantly with our AI assistant - all auto-saved to your campaign.",
      color: "#a855f7",
      details: ["One-click generation", "Auto-saves to campaign", "Context-aware content"]
    },
    {
      icon: Dices,
      title: "GM Screen",
      description: "Everything you need during live sessions: dice roller, quick reference, session notes, and party tracker.",
      color: "#4a7dff",
      details: ["Floating dice roller", "Random tables", "Name generator with NPC save"]
    }
  ];

  const testimonials = [
    {
      text: "Quest Keeper has completely transformed how I run my campaigns. The AI assistant alone saves me hours of prep time!",
      author: "Sarah M.",
      role: "GM for 5 years"
    },
    {
      text: "The world builder is incredible. I can finally organize my massive homebrew world in a way that makes sense.",
      author: "Marcus T.",
      role: "Forever GM"
    },
    {
      text: "Best GM tool I've ever used. The combat tracker with maps makes running encounters so much smoother.",
      author: "Alex K.",
      role: "Campaign Streamer"
    }
  ];

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #030014 0%, #0a0a2e 50%, #030014 100%)',
      overflow: 'hidden'
    }}>
      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '16px 24px',
        background: 'rgba(3, 0, 20, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(74, 125, 255, 0.2)'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src="/quest-keeper-logo.png" 
              alt="Quest Keeper" 
              style={{ height: '40px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button 
              onClick={() => navigate('/auth')}
              className="btn-outline"
              style={{ padding: '10px 20px' }}
            >
              Log In
            </Button>
            <Button 
              onClick={() => navigate('/auth')}
              className="btn-primary"
              style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Get Started Free <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ 
        paddingTop: '140px', 
        paddingBottom: '80px',
        position: 'relative'
      }}>
        {/* Background glow effects */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(74, 125, 255, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)'
        }} />
        <div style={{
          position: 'absolute',
          top: '30%',
          right: '10%',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)'
        }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative' }}>
          {/* Rookie Quest Presents */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <img 
                src="/rookie-quest-logo.png" 
                alt="Rookie Quest" 
                style={{ height: '50px', filter: 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.3))' }}
              />
              <span style={{ 
                color: '#94a3b8', 
                fontSize: '18px',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: '500',
                letterSpacing: '2px',
                textTransform: 'uppercase'
              }}>
                presents
              </span>
            </div>
          </div>

          {/* Main Quest Keeper Logo - Large & Prominent */}
          <div style={{ marginBottom: '40px' }}>
            <img 
              src="/quest-keeper-logo.png" 
              alt="Quest Keeper" 
              style={{ 
                height: '180px',
                maxWidth: '90%',
                filter: 'drop-shadow(0 0 40px rgba(74, 125, 255, 0.6))',
                animation: 'float 3s ease-in-out infinite'
              }}
            />
          </div>

          {/* Tagline */}
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: '800',
            color: '#ffffff',
            marginBottom: '24px',
            lineHeight: '1.2'
          }}>
            Your Ultimate{' '}
            <span style={{ 
              background: 'linear-gradient(90deg, #4a7dff, #a855f7, #22c55e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              GM Companion
            </span>
          </h1>

          <p style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
            color: '#94a3b8',
            maxWidth: '700px',
            margin: '0 auto 40px',
            lineHeight: '1.7'
          }}>
            Build worlds, run combat, generate content with AI, and manage your campaigns - 
            all in one powerful tool designed by GMs, for GMs.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button 
              onClick={() => navigate('/auth')}
              className="btn-primary"
              data-testid="hero-cta-btn"
              style={{ 
                padding: '16px 32px', 
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 0 40px rgba(34, 197, 94, 0.4)'
              }}
            >
              <Play size={20} /> Start Free Campaign
            </Button>
            <Button 
              onClick={() => {
                document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-outline"
              style={{ 
                padding: '16px 32px', 
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              See Features <ChevronRight size={20} />
            </Button>
          </div>

          {/* Social proof */}
          <div style={{ 
            marginTop: '48px', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: '32px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex' }}>
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={18} fill="#eab308" color="#eab308" />
                ))}
              </div>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>Loved by GMs</span>
            </div>
            <div style={{ color: '#4a7dff', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={16} /> Free Forever Tier
            </div>
            <div style={{ color: '#22c55e', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} /> AI-Powered
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: '80px 24px', position: 'relative' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '800',
              color: '#ffffff',
              marginBottom: '16px'
            }}>
              Everything You Need to Run Epic Campaigns
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
              From world-building to combat, Quest Keeper has you covered.
            </p>
          </div>

          {/* Feature Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '24px' 
          }}>
            {features.map((feature, index) => (
              <div
                key={index}
                onClick={() => setActiveFeature(index)}
                style={{
                  padding: '32px',
                  background: activeFeature === index 
                    ? `linear-gradient(135deg, ${feature.color}15 0%, ${feature.color}05 100%)`
                    : 'rgba(10, 10, 46, 0.5)',
                  border: `2px solid ${activeFeature === index ? feature.color : '#1e40af'}`,
                  borderRadius: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: activeFeature === index ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '16px',
                  background: `${feature.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px'
                }}>
                  <feature.icon size={30} color={feature.color} />
                </div>
                <h3 style={{
                  fontSize: '22px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: '700',
                  color: '#ffffff',
                  marginBottom: '12px'
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  color: '#94a3b8',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  marginBottom: '16px'
                }}>
                  {feature.description}
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {feature.details.map((detail, i) => (
                    <li key={i} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      color: feature.color,
                      fontSize: '13px',
                      marginBottom: '6px'
                    }}>
                      <Check size={14} /> {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section style={{ padding: '80px 24px', background: 'rgba(10, 10, 46, 0.3)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '800',
              color: '#ffffff',
              marginBottom: '16px'
            }}>
              Simple, Transparent Pricing
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '18px' }}>
              Start free, upgrade when you're ready.
            </p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '24px' 
          }}>
            {/* Free Tier */}
            <div style={{
              padding: '40px',
              background: 'rgba(10, 10, 46, 0.6)',
              border: '2px solid #1e40af',
              borderRadius: '24px'
            }}>
              <h3 style={{ 
                fontSize: '24px', 
                color: '#ffffff', 
                fontFamily: 'Montserrat', 
                fontWeight: '700',
                marginBottom: '8px'
              }}>
                Free
              </h3>
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '48px', color: '#ffffff', fontWeight: '800' }}>$0</span>
                <span style={{ color: '#94a3b8' }}>/forever</span>
              </div>
              <ul style={{ margin: '0 0 32px', padding: 0, listStyle: 'none' }}>
                {['2 Campaigns', '5 AI Generations/month', 'Full Combat System', 'DM Screen Access', 'Monster Database'].map((item, i) => (
                  <li key={i} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    color: '#e2e8f0',
                    fontSize: '15px',
                    marginBottom: '12px'
                  }}>
                    <Check size={18} color="#22c55e" /> {item}
                  </li>
                ))}
              </ul>
              <Button 
                onClick={() => navigate('/auth')}
                className="btn-outline"
                style={{ width: '100%', padding: '14px' }}
              >
                Get Started Free
              </Button>
            </div>

            {/* Premium Tier */}
            <div style={{
              padding: '40px',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(74, 125, 255, 0.1) 100%)',
              border: '2px solid #22c55e',
              borderRadius: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                color: '#000',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700'
              }}>
                POPULAR
              </div>
              <h3 style={{ 
                fontSize: '24px', 
                color: '#22c55e', 
                fontFamily: 'Montserrat', 
                fontWeight: '700',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Crown size={24} /> Adventurer
              </h3>
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '48px', color: '#ffffff', fontWeight: '800' }}>$3.99</span>
                <span style={{ color: '#94a3b8' }}>/month</span>
              </div>
              <ul style={{ margin: '0 0 32px', padding: 0, listStyle: 'none' }}>
                {['Unlimited Campaigns', 'Unlimited AI Generations', 'Priority Support', 'Early Access Features', 'Everything in Free'].map((item, i) => (
                  <li key={i} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    color: '#e2e8f0',
                    fontSize: '15px',
                    marginBottom: '12px'
                  }}>
                    <Check size={18} color="#22c55e" /> {item}
                  </li>
                ))}
              </ul>
              <Button 
                onClick={() => navigate('/auth')}
                className="btn-primary"
                style={{ 
                  width: '100%', 
                  padding: '14px',
                  background: 'linear-gradient(90deg, #22c55e, #16a34a)'
                }}
              >
                Start Adventurer Trial
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '800',
              color: '#ffffff',
              marginBottom: '16px'
            }}>
              Loved by Game Masters
            </h2>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '24px' 
          }}>
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                style={{
                  padding: '32px',
                  background: 'rgba(10, 10, 46, 0.5)',
                  border: '2px solid #1e40af',
                  borderRadius: '20px'
                }}
              >
                <div style={{ display: 'flex', marginBottom: '16px' }}>
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={16} fill="#eab308" color="#eab308" />
                  ))}
                </div>
                <p style={{
                  color: '#e2e8f0',
                  fontSize: '16px',
                  lineHeight: '1.7',
                  marginBottom: '20px',
                  fontStyle: 'italic'
                }}>
                  "{testimonial.text}"
                </p>
                <div>
                  <p style={{ color: '#ffffff', fontWeight: '700', marginBottom: '4px' }}>
                    {testimonial.author}
                  </p>
                  <p style={{ color: '#67e8f9', fontSize: '13px' }}>
                    {testimonial.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: '800',
            color: '#ffffff',
            marginBottom: '24px'
          }}>
            Ready to Level Up Your GMing?
          </h2>
          <p style={{
            color: '#94a3b8',
            fontSize: '18px',
            marginBottom: '40px'
          }}>
            Join thousands of GMs who are running better campaigns with Quest Keeper.
          </p>
          <Button 
            onClick={() => navigate('/auth')}
            className="btn-primary"
            data-testid="final-cta-btn"
            style={{ 
              padding: '20px 48px', 
              fontSize: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 0 50px rgba(34, 197, 94, 0.5)'
            }}
          >
            <Scroll size={24} /> Create Your First Campaign
          </Button>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '20px' }}>
            No credit card required. Free forever tier available.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        padding: '40px 24px', 
        borderTop: '1px solid rgba(74, 125, 255, 0.2)',
        background: 'rgba(3, 0, 20, 0.5)'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/quest-keeper-logo.png" alt="Quest Keeper" style={{ height: '30px' }} />
            <span style={{ color: '#64748b', fontSize: '14px' }}>
              A product of Rookie Quest
            </span>
          </div>
          <div style={{ color: '#64748b', fontSize: '14px' }}>
            © 2026 Quest Keeper. All rights reserved.
          </div>
        </div>
      </footer>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}

export default LandingPage;
