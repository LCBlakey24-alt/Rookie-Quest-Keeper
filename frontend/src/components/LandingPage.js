import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Sword, Users, Map, Sparkles, Dices, BookOpen, Crown, 
  ChevronRight, Star, Shield, Wand2, Globe, Scroll,
  ArrowRight, Check, Play, Zap, Clock, Target, TrendingUp,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import RookDemo from '@/components/RookDemo';
import TronBackground from '@/components/TronBackground';

const API = process.env.REACT_APP_BACKEND_URL;

// Dark Black/Grey Theme with Orange/Gold Accents
const theme = {
  bg: {
    black: '#0D0D0D',      // Near black
    dark: '#1A1A1A',       // Dark grey
    panel: '#1F1F1F',      // Panel grey
    card: '#262626',       // Card grey
    hover: '#333333',      // Hover grey
    elevated: '#2A2A2A'
  },
  // GM Side - Orange/Red
  gm: {
    primary: '#C54B2C',
    hover: '#E05C3D',
    subtle: 'rgba(197, 75, 44, 0.15)',
    border: 'rgba(197, 75, 44, 0.4)',
    glow: '0 0 30px rgba(197, 75, 44, 0.3)'
  },
  // Player Side - Gold
  player: {
    primary: '#F2A541',
    cyan: '#D99033',
    hover: '#FFB855',
    subtle: 'rgba(242, 165, 65, 0.15)',
    border: 'rgba(242, 165, 65, 0.4)',
    glow: '0 0 30px rgba(242, 165, 65, 0.3)'
  },
  // Accent colors
  accent: {
    red: '#C54B2C',
    redHover: '#E05C3D',
    redSubtle: 'rgba(197, 75, 44, 0.15)',
    redBorder: 'rgba(197, 75, 44, 0.4)'
  },
  text: {
    white: '#FFFFFF',
    secondary: '#B0B0B0',
    muted: '#707070',
    dim: '#505050'
  },
  border: {
    dark: 'rgba(255, 255, 255, 0.06)',
    default: 'rgba(255, 255, 255, 0.1)',
    hover: 'rgba(255, 255, 255, 0.15)'
  }
};

function LandingPage() {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);
  const [activeScreenshot, setActiveScreenshot] = useState('demo');
  const [reviews, setReviews] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly');

  // Pricing data
  const pricing = {
    hero: { monthly: 3.99, yearly: 39.99 },
    questMaster: { monthly: 3.99, yearly: 39.99 },
    legendary: { monthly: 5.99, yearly: 59.99 }
  };

  const getPrice = (plan) => {
    return billingCycle === 'yearly' ? pricing[plan].yearly : pricing[plan].monthly;
  };

  const getMonthlyEquivalent = (plan) => {
    return (pricing[plan].yearly / 12).toFixed(2);
  };

  // Fetch featured reviews
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await axios.get(`${API}/api/reviews/featured`);
        setReviews(response.data);
      } catch (error) {
        console.log('No reviews yet');
      }
    };
    fetchReviews();
  }, []);

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
      details: ["Nested location hierarchy", "Generate with ROOK AI", "Custom place types"]
    },
    {
      icon: Map,
      title: "Interactive World Maps",
      description: "Upload your world map and pin locations. Calculate travel times between cities with terrain-aware pathing.",
      details: ["Pin cities & landmarks", "Travel time calculator", "Terrain modifiers", "Link to existing locations"]
    },
    {
      icon: Sword,
      title: "Combat Manager",
      description: "Run epic battles with our initiative tracker, monster database, and interactive battle maps.",
      details: ["2687+ monster statblocks", "Attack & damage roller", "Encounter difficulty calculator"]
    },
    {
      icon: Sparkles,
      title: "ROOK AI Assistant",
      description: "Your intelligent Game Master companion. ROOK handles the heavy lifting so you can focus on storytelling.",
      details: ["Generate NPCs & Locations", "Session recap writing", "Smart note parsing", "Encounter creation"]
    },
    {
      icon: Dices,
      title: "GM Screen",
      description: "Everything you need during live sessions: dice roller, quick reference, session notes, and party tracker.",
      details: ["Floating dice roller", "Random tables", "Name generator with NPC save"]
    }
  ];

  // Helper to render stars
  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <Star 
        key={i} 
        size={16} 
        fill={i < rating ? "#F59E0B" : "transparent"} 
        color={i < rating ? "#F59E0B" : theme.text.muted} 
      />
    ));
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: theme.bg.black,
      color: theme.text.white,
      position: 'relative'
    }}>
      {/* Smokey Background Effect */}
      <div className="smokey-bg" />
      
      {/* Floating Ember Particles */}
      <div className="ember-particles">
        <div className="ember"></div>
        <div className="ember"></div>
        <div className="ember"></div>
        <div className="ember"></div>
        <div className="ember"></div>
        <div className="ember"></div>
        <div className="ember"></div>
        <div className="ember"></div>
        <div className="ember"></div>
        <div className="ember"></div>
      </div>
      
      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '16px 24px',
        background: theme.bg.dark,
        borderBottom: `1px solid ${theme.border.default}`
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ 
              fontFamily: "Eros Book, sans-serif",
              fontSize: '20px',
              fontWeight: '400',
              color: theme.text.white,
              letterSpacing: '2px'
            }}>
              RQK
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button 
              onClick={() => navigate('/auth')}
              style={{ 
                padding: '10px 20px',
                background: 'transparent',
                border: `1px solid ${theme.player.border}`,
                color: theme.player.cyan
              }}
            >
              Log In
            </Button>
            <Button 
              onClick={() => navigate('/auth')}
              data-testid="get-started-btn"
              style={{ 
                padding: '10px 24px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: 'linear-gradient(135deg, #C54B2C, #F2A541)',
                border: 'none',
                color: theme.text.white
              }}
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
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '0 24px', 
          textAlign: 'center'
        }}>
          {/* Logo and Text */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{
              fontFamily: "Eros Book, sans-serif",
              fontSize: 'clamp(2.5rem, 8vw, 5rem)',
              fontWeight: '400',
              color: theme.text.white,
              letterSpacing: '8px',
              textTransform: 'uppercase',
              margin: 0,
              lineHeight: '1.1'
            }}>
              ROOKIE QUEST
            </h1>
            
            <h1 style={{
              fontFamily: "Eros Book, sans-serif",
              fontSize: 'clamp(3rem, 10vw, 6rem)',
              fontWeight: '400',
              color: theme.text.white,
              letterSpacing: '12px',
              textTransform: 'uppercase',
              margin: '0',
              lineHeight: '1'
            }}>
              KEEPER
            </h1>
            
            <p style={{
              fontFamily: "Eros Book, sans-serif",
              fontSize: 'clamp(0.9rem, 2vw, 1.2rem)',
              background: 'linear-gradient(90deg, #C54B2C, #F2A541)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '6px',
              textTransform: 'uppercase',
              marginTop: '24px',
              fontWeight: '400'
            }}>
              Campaign Operating System
            </p>
          </div>

          {/* Divider - Gradient */}
          <div style={{
            width: '120px',
            height: '2px',
            background: 'linear-gradient(90deg, #C54B2C, #F2A541)',
            margin: '32px auto'
          }} />

          {/* Headline */}
          <h2 style={{
            fontFamily: "Eros Book, sans-serif",
            fontSize: 'clamp(2rem, 4vw, 3.5rem)',
            fontWeight: '400',
            color: theme.text.white,
            marginBottom: '24px',
            lineHeight: '1.2'
          }}>
            <span style={{ color: theme.gm.primary }}>Game Masters</span> &{' '}
            <span style={{ color: theme.player.cyan }}>Players</span>{' '}
            United
          </h2>

          {/* Subheadline */}
          <p style={{
            fontFamily: "Eros Book, sans-serif",
            fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
            color: theme.text.secondary,
            maxWidth: '800px',
            margin: '0 auto 40px',
            lineHeight: '1.7'
          }}>
            The all-in-one <strong style={{ color: theme.text.white }}>campaign operating system</strong> for 5e — 
            combining <span style={{ color: theme.gm.primary }}>worldbuilding, AI generation, combat</span> for GMs and{' '}
            <span style={{ color: theme.player.cyan }}>character sheets, journals, party tools</span> for players.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '32px' }}>
            <Button 
              onClick={() => navigate('/auth')}
              data-testid="hero-cta-btn"
              style={{ 
                padding: '16px 32px', 
                fontSize: '17px',
                fontFamily: "Eros Book, sans-serif",
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: theme.gm.primary,
                border: 'none',
                color: theme.text.white,
                fontWeight: '400',
                letterSpacing: '1px'
              }}
            >
              <Sword size={20} /> I'm a Game Master
            </Button>
            <Button 
              onClick={() => navigate('/auth')}
              style={{ 
                padding: '16px 32px', 
                fontSize: '17px',
                fontFamily: "Eros Book, sans-serif",
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: theme.player.primary,
                border: 'none',
                color: theme.text.white,
                fontWeight: '400',
                letterSpacing: '1px'
              }}
            >
              <Users size={20} /> I'm a Player
            </Button>
          </div>

          {/* Benefit Bullets */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: '32px',
            flexWrap: 'wrap',
            marginBottom: '24px'
          }}>
            {[
              { icon: Zap, text: 'Stop juggling tabs' },
              { icon: Brain, text: 'Prep faster with AI' },
              { icon: Target, text: 'Run smoother combat' }
            ].map((item, i) => (
              <div key={i} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                color: theme.text.secondary, 
                fontSize: '16px', 
                fontWeight: '400' 
              }}>
                <item.icon size={18} color={theme.accent.red} /> {item.text}
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div style={{ 
            marginTop: '32px', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: '32px',
            flexWrap: 'wrap'
          }}>
            {reviews.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex' }}>
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={18} fill="#F59E0B" color="#F59E0B" />
                  ))}
                </div>
                <span style={{ color: theme.text.muted, fontSize: '14px' }}>Loved by GMs</span>
              </div>
            )}
            <div style={{ color: theme.text.muted, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={16} color={theme.accent.red} /> Free Forever Tier
            </div>
            <div style={{ color: theme.text.muted, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} color={theme.accent.red} /> AI-Powered
            </div>
          </div>
        </div>
      </section>

      {/* Value Section */}
      <section style={{ 
        padding: '80px 24px', 
        background: theme.bg.dark,
        borderTop: `1px solid ${theme.border.default}`,
        borderBottom: `1px solid ${theme.border.default}`
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{
              fontFamily: "Eros Book, sans-serif",
              fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
              fontWeight: '400',
              color: theme.text.white,
              marginBottom: '20px'
            }}>
              Your Entire Campaign. <span style={{ color: theme.accent.red }}>One System.</span>
            </h2>
            <p style={{
              fontFamily: "Eros Book, sans-serif",
              color: theme.text.secondary,
              fontSize: '17px',
              lineHeight: '1.8',
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              Most GMs juggle notes, PDFs, initiative trackers, spreadsheets, and AI chats across multiple tools. 
              Rookie Quest Keeper connects <strong style={{ color: theme.text.white }}>prep and play</strong> into one seamless workflow.
            </p>
          </div>

          {/* Flow Steps */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            {[
              { icon: Globe, label: 'Build World' },
              { icon: Sparkles, label: 'Generate Content' },
              { icon: Sword, label: 'Run Combat' },
              { icon: BookOpen, label: 'Capture & Recap' }
            ].map((step, idx, arr) => (
              <React.Fragment key={idx}>
                <div style={{
                  padding: '24px 32px',
                  background: theme.bg.card,
                  border: `1px solid ${theme.border.default}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  minWidth: '180px'
                }}>
                  <step.icon size={28} color={theme.accent.red} />
                  <span style={{ color: theme.text.white, fontWeight: '400', fontSize: '17px' }}>
                    {step.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <ChevronRight size={24} color={theme.text.muted} style={{ flexShrink: 0 }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* App Preview Section - Live Demo Only */}
      <section style={{ padding: '80px 24px', background: theme.bg.panel }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{
              fontFamily: "Eros Book, sans-serif",
              fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
              fontWeight: '400',
              color: theme.text.white,
              marginBottom: '16px'
            }}>
              Try <span style={{ color: theme.accent.red }}>ROOK</span> Right Now
            </h2>
            <p style={{ 
              fontFamily: "Eros Book, sans-serif",
              color: theme.text.secondary, 
              fontSize: '16px', 
              maxWidth: '600px', 
              margin: '0 auto' 
            }}>
              Our AI assistant can generate NPCs, locations, and more - no signup required
            </p>
          </div>

          {/* Live Demo */}
          <div style={{
            border: `1px solid ${theme.border.default}`,
            background: theme.bg.black,
            padding: '40px'
          }}>
            <RookDemo />
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Button
              onClick={() => navigate('/auth')}
              style={{
                padding: '16px 40px',
                fontSize: '16px',
                fontFamily: "Eros Book, sans-serif",
                fontWeight: '400',
                background: theme.accent.red,
                border: 'none',
                color: theme.text.white,
                cursor: 'pointer',
                letterSpacing: '1px'
              }}
            >
              Try It Free <ArrowRight size={20} style={{ marginLeft: '8px', display: 'inline' }} />
            </Button>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section style={{ padding: '80px 24px', background: theme.bg.black }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: '400',
              color: theme.text.white,
              marginBottom: '16px'
            }}>
              Built for <span style={{ color: theme.accent.red }}>Real Game Masters</span>
            </h2>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '24px' 
          }}>
            {[
              { icon: BookOpen, title: 'New DMs', desc: 'Overwhelmed by prep? Use structured tools that guide your campaign from session zero to finale.' },
              { icon: Crown, title: 'Forever DMs', desc: 'Running long campaigns? Keep NPCs, locations, combat, and notes connected across months of play.' },
              { icon: Globe, title: 'Online DMs', desc: 'Stop switching between Discord, VTTs, PDFs, and scattered notes. Centralize everything in one command center.' }
            ].map((item, i) => (
              <div key={i} style={{
                padding: '40px',
                background: theme.bg.card,
                border: `1px solid ${theme.border.default}`,
                textAlign: 'center'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: theme.bg.hover,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px'
                }}>
                  <item.icon size={40} color={theme.accent.red} />
                </div>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '400',
                  color: theme.text.white,
                  marginBottom: '16px'
                }}>
                  {item.title}
                </h3>
                <p style={{
                  color: theme.text.secondary,
                  fontSize: '16px',
                  lineHeight: '1.7'
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: '80px 24px', background: theme.bg.dark }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: '400',
              color: theme.text.white,
              marginBottom: '16px'
            }}>
              Everything You Need to Run Epic Campaigns
            </h2>
            <p style={{ color: theme.text.secondary, fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
              From world-building to combat, Rookie Quest Keeper has you covered.
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
                  background: activeFeature === index ? theme.accent.redSubtle : theme.bg.card,
                  border: `1px solid ${activeFeature === index ? theme.accent.red : theme.border.default}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: theme.bg.hover,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px'
                }}>
                  <feature.icon size={30} color={theme.accent.red} />
                </div>
                <h3 style={{
                  fontSize: '22px',
                  fontWeight: '400',
                  color: theme.text.white,
                  marginBottom: '12px'
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  color: theme.text.secondary,
                  fontSize: '16px',
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
                      color: theme.accent.red,
                      fontSize: '14px',
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

      {/* Meet ROOK */}
      <section style={{ padding: '100px 24px', background: theme.bg.panel }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr', 
            gap: '40px', 
            alignItems: 'center',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            {/* ROOK Info */}
            <div style={{ textAlign: 'center' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: theme.accent.redSubtle,
                color: theme.accent.red,
                fontSize: '14px',
                fontWeight: '400',
                marginBottom: '16px'
              }}>
                <Sparkles size={16} />
                AI ASSISTANT
              </span>
              
              <h2 style={{
                fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                fontWeight: '400',
                color: theme.text.white,
                marginBottom: '16px',
                lineHeight: '1.2'
              }}>
                Meet <span style={{ color: theme.accent.red }}>ROOK</span>
              </h2>
              
              <p style={{
                color: theme.accent.red,
                fontSize: '20px',
                fontWeight: '400',
                marginBottom: '24px'
              }}>
                Your AI Game Master Assistant
              </p>
              
              {/* R.O.O.K Acronym */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                marginBottom: '32px'
              }}>
                {[
                  { letter: 'R', word: 'Roleplaying' },
                  { letter: 'O', word: 'Organization' },
                  { letter: 'O', word: 'Operations' },
                  { letter: 'K', word: 'Keeper' }
                ].map((item, i) => (
                  <div key={i} style={{
                    textAlign: 'center',
                    padding: '16px 8px',
                    background: theme.bg.card,
                    border: `1px solid ${theme.border.default}`
                  }}>
                    <div style={{
                      fontSize: '28px',
                      fontWeight: '400',
                      color: theme.accent.red
                    }}>
                      {item.letter}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: theme.text.secondary,
                      marginTop: '4px'
                    }}>
                      {item.word}
                    </div>
                  </div>
                ))}
              </div>
              
              <p style={{
                color: theme.text.secondary,
                fontSize: '17px',
                lineHeight: '1.8',
                marginBottom: '32px'
              }}>
                ROOK is the intelligent assistant built into Rookie Quest Keeper. 
                It helps Game Masters <strong style={{ color: theme.text.white }}>generate worlds</strong>, 
                <strong style={{ color: theme.text.white }}> build NPCs</strong>, 
                <strong style={{ color: theme.text.white }}> summarize sessions</strong>, and 
                <strong style={{ color: theme.text.white }}> manage campaigns</strong> with ease.
              </p>
              
              {/* ROOK Features */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {['Generate with ROOK', 'ROOK Worldbuilder', 'ROOK Recap', 'Ask ROOK'].map((feature, i) => (
                  <span key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    background: theme.bg.card,
                    color: theme.accent.red,
                    fontSize: '13px',
                    fontWeight: '400',
                    border: `1px solid ${theme.border.default}`
                  }}>
                    <Sparkles size={14} />
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pre-Pricing Statement */}
      <section style={{ 
        padding: '80px 24px', 
        background: theme.bg.black,
        borderTop: `1px solid ${theme.accent.redBorder}`,
        borderBottom: `1px solid ${theme.accent.redBorder}`,
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: '400',
            color: theme.text.white,
            marginBottom: '24px',
            lineHeight: '1.3'
          }}>
            Stop Managing Tools. <br />
            <span style={{ color: theme.accent.red }}>Start Managing Your Campaign.</span>
          </h2>
          <p style={{
            color: theme.text.secondary,
            fontSize: '20px',
            lineHeight: '1.8',
            maxWidth: '700px',
            margin: '0 auto'
          }}>
            Rookie Quest Keeper replaces fragmented GM workflows with one connected campaign hub — 
            built specifically for <strong style={{ color: theme.text.white }}>5e 2014 and 2024</strong>.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '80px 24px', background: theme.bg.dark }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{
              background: 'linear-gradient(90deg, #C54B2C, #F2A541)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '16px',
              fontWeight: '400',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginBottom: '12px'
            }}>
              Choose Your Path
            </p>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: '400',
              color: theme.text.white,
              marginBottom: '16px'
            }}>
              Simple, Transparent Pricing
            </h2>
            <p style={{ color: theme.text.secondary, fontSize: '18px', marginBottom: '32px' }}>
              Whether you're a <span style={{ color: theme.player.cyan }}>Player</span> or a <span style={{ color: theme.gm.primary }}>Game Master</span>, we've got you covered.
            </p>

            {/* Billing Toggle */}
            <div style={{ 
              display: 'inline-flex', 
              background: theme.bg.panel,
              border: `1px solid ${theme.border.default}`,
              padding: '4px',
              gap: '4px'
            }}>
              <button
                onClick={() => setBillingCycle('monthly')}
                data-testid="billing-monthly-btn"
                style={{
                  padding: '12px 28px',
                  background: billingCycle === 'monthly' ? theme.gm.primary : 'transparent',
                  border: 'none',
                  color: theme.text.white,
                  fontWeight: '400',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                data-testid="billing-yearly-btn"
                style={{
                  padding: '12px 28px',
                  background: billingCycle === 'yearly' ? theme.gm.primary : 'transparent',
                  border: 'none',
                  color: theme.text.white,
                  fontWeight: '400',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                Yearly
                <span style={{ 
                  background: '#22c55e', 
                  color: '#fff', 
                  padding: '3px 8px', 
                  fontSize: '10px',
                  fontWeight: '400'
                }}>
                  SAVE ~17%
                </span>
              </button>
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '20px',
            '@media (max-width: 1200px)': {
              gridTemplateColumns: 'repeat(2, 1fr)'
            }
          }}>
            {/* Free Tier */}
            <div style={{
              padding: '32px',
              background: theme.bg.card,
              border: `1px solid ${theme.border.default}`,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '20px', color: theme.text.white, fontWeight: '400', marginBottom: '4px' }}>
                  Free
                </h3>
                <p style={{ color: theme.text.muted, fontSize: '13px' }}>Get started</p>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '40px', color: theme.text.white, fontWeight: '400' }}>£0</span>
                <span style={{ color: theme.text.muted, fontSize: '14px' }}>/forever</span>
              </div>
              <ul style={{ margin: '0 0 auto', padding: 0, listStyle: 'none', flex: 1 }}>
                {['1 Character', '1 Campaign (join only)', 'Basic Character Sheet', 'Dice Roller', '3 AI Generations/month'].map((item, i) => (
                  <li key={i} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    color: theme.text.secondary,
                    fontSize: '13px',
                    marginBottom: '10px'
                  }}>
                    <Check size={14} color={theme.text.muted} /> {item}
                  </li>
                ))}
              </ul>
              <Button 
                onClick={() => navigate('/auth')}
                style={{ 
                  width: '100%', 
                  padding: '12px',
                  background: 'transparent',
                  border: `1px solid ${theme.border.default}`,
                  color: theme.text.secondary,
                  marginTop: '20px'
                }}
              >
                Get Started
              </Button>
            </div>

            {/* Hero Tier - Player (Blue) */}
            <div style={{
              padding: '32px',
              background: theme.player.subtle,
              border: `2px solid ${theme.player.primary}`,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: theme.player.glow
            }}>
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: theme.player.cyan,
                color: '#000',
                padding: '4px 16px',
                fontSize: '11px',
                fontWeight: '400',
                letterSpacing: '1px'
              }}>
                FOR PLAYERS
              </div>
              <div style={{ marginBottom: '20px', marginTop: '8px' }}>
                <h3 style={{ 
                  fontSize: '20px', 
                  color: theme.player.cyan, 
                  fontWeight: '400', 
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Users size={20} /> Hero
                </h3>
                <p style={{ color: theme.text.muted, fontSize: '13px' }}>Serious players</p>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '40px', color: theme.text.white, fontWeight: '400' }}>£{getPrice('hero')}</span>
                <span style={{ color: theme.text.muted, fontSize: '14px' }}>/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                {billingCycle === 'yearly' && (
                  <p style={{ color: theme.player.cyan, fontSize: '12px', marginTop: '4px' }}>
                    (£{getMonthlyEquivalent('hero')}/month)
                  </p>
                )}
              </div>
              <ul style={{ margin: '0 0 auto', padding: 0, listStyle: 'none', flex: 1 }}>
                {['Unlimited Characters', 'Character Journal', 'Party Inventory Access', 'Session Recaps', 'AI Portrait Generation', '50 AI Calls/month'].map((item, i) => (
                  <li key={i} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    color: theme.text.secondary,
                    fontSize: '13px',
                    marginBottom: '10px'
                  }}>
                    <Check size={14} color={theme.player.cyan} /> {item}
                  </li>
                ))}
              </ul>
              <Button 
                onClick={() => navigate('/auth')}
                style={{ 
                  width: '100%', 
                  padding: '12px',
                  background: `linear-gradient(135deg, ${theme.player.primary}, ${theme.player.cyan})`,
                  border: 'none',
                  color: '#fff',
                  fontWeight: '400',
                  marginTop: '20px'
                }}
              >
                Start Hero Trial
              </Button>
            </div>

            {/* Quest Master Tier - GM (Red) */}
            <div style={{
              padding: '32px',
              background: theme.gm.subtle,
              border: `2px solid ${theme.gm.primary}`,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: theme.gm.glow
            }}>
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: theme.gm.primary,
                color: '#fff',
                padding: '4px 16px',
                fontSize: '11px',
                fontWeight: '400',
                letterSpacing: '1px'
              }}>
                FOR GMs
              </div>
              <div style={{ marginBottom: '20px', marginTop: '8px' }}>
                <h3 style={{ 
                  fontSize: '20px', 
                  color: theme.gm.primary, 
                  fontWeight: '400', 
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Sword size={20} /> Quest Master
                </h3>
                <p style={{ color: theme.text.muted, fontSize: '13px' }}>Game Masters</p>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '40px', color: theme.text.white, fontWeight: '400' }}>£{getPrice('questMaster')}</span>
                <span style={{ color: theme.text.muted, fontSize: '14px' }}>/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                {billingCycle === 'yearly' && (
                  <p style={{ color: theme.gm.primary, fontSize: '12px', marginTop: '4px' }}>
                    (£{getMonthlyEquivalent('questMaster')}/month)
                  </p>
                )}
              </div>
              <ul style={{ margin: '0 0 auto', padding: 0, listStyle: 'none', flex: 1 }}>
                {['Unlimited Campaigns', 'Full World Building', 'ROOK AI Generation', 'Combat Tracker', 'Reference Tools', 'Session Mode', 'Unlimited AI'].map((item, i) => (
                  <li key={i} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    color: theme.text.secondary,
                    fontSize: '13px',
                    marginBottom: '10px'
                  }}>
                    <Check size={14} color={theme.gm.primary} /> {item}
                  </li>
                ))}
              </ul>
              <Button 
                onClick={() => navigate('/auth')}
                style={{ 
                  width: '100%', 
                  padding: '12px',
                  background: theme.gm.primary,
                  border: 'none',
                  color: '#fff',
                  fontWeight: '400',
                  marginTop: '20px'
                }}
              >
                Start GM Trial
              </Button>
            </div>

            {/* Legendary Tier - Both (Gradient) */}
            <div style={{
              padding: '32px',
              background: `linear-gradient(135deg, ${theme.gm.subtle}, ${theme.player.subtle})`,
              border: '2px solid transparent',
              borderImage: 'linear-gradient(135deg, #C54B2C, #F2A541) 1',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(90deg, #C54B2C, #F2A541)',
                color: '#fff',
                padding: '4px 16px',
                fontSize: '11px',
                fontWeight: '400',
                letterSpacing: '1px'
              }}>
                BEST VALUE
              </div>
              <div style={{ marginBottom: '20px', marginTop: '8px' }}>
                <h3 style={{ 
                  fontSize: '20px', 
                  background: 'linear-gradient(90deg, #C54B2C, #F2A541)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: '400', 
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Crown size={20} color="#F59E0B" /> Legendary
                </h3>
                <p style={{ color: theme.text.muted, fontSize: '13px' }}>GM who also plays</p>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '40px', color: theme.text.white, fontWeight: '400' }}>£{getPrice('legendary')}</span>
                <span style={{ color: theme.text.muted, fontSize: '14px' }}>/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                {billingCycle === 'yearly' && (
                  <p style={{ color: '#F59E0B', fontSize: '12px', marginTop: '4px' }}>
                    (£{getMonthlyEquivalent('legendary')}/month)
                  </p>
                )}
              </div>
              <ul style={{ margin: '0 0 auto', padding: 0, listStyle: 'none', flex: 1 }}>
                {['Everything in Hero', 'Everything in Quest Master', 'Priority Support', 'Early Access Features', 'Exclusive Content'].map((item, i) => (
                  <li key={i} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    color: theme.text.secondary,
                    fontSize: '13px',
                    marginBottom: '10px'
                  }}>
                    <Check size={14} color="#F59E0B" /> {item}
                  </li>
                ))}
              </ul>
              <Button 
                onClick={() => navigate('/auth')}
                style={{ 
                  width: '100%', 
                  padding: '12px',
                  background: 'linear-gradient(135deg, #C54B2C, #F2A541)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: '400',
                  marginTop: '20px'
                }}
              >
                Go Legendary
              </Button>
            </div>
          </div>

          {/* Yearly Savings Note */}
          <div style={{ 
            textAlign: 'center', 
            marginTop: '32px',
            padding: '16px',
            background: theme.bg.panel,
            border: `1px solid ${theme.border.default}`
          }}>
            <p style={{ color: theme.text.secondary, fontSize: '14px' }}>
              <strong style={{ color: theme.text.white }}>Save ~17% with yearly billing</strong> — Cancel anytime. No contracts.
            </p>
          </div>
        </div>
      </section>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section style={{ padding: '80px 24px', background: theme.bg.black }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: '400',
                color: theme.text.white,
                marginBottom: '16px'
              }}>
                What GMs Are Saying
              </h2>
              <p style={{ color: theme.text.secondary, fontSize: '18px' }}>
                Real reviews from real Game Masters
              </p>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '24px' 
            }}>
              {reviews.map((review, index) => (
                <div key={index} style={{
                  padding: '32px',
                  background: theme.bg.card,
                  border: `1px solid ${theme.border.default}`
                }}>
                  <div style={{ display: 'flex', marginBottom: '16px' }}>
                    {renderStars(review.rating)}
                  </div>
                  <p style={{
                    color: theme.text.secondary,
                    fontSize: '16px',
                    lineHeight: '1.7',
                    marginBottom: '20px',
                    fontStyle: 'italic'
                  }}>
                    "{review.comment}"
                  </p>
                  <div>
                    <p style={{ color: theme.text.white, fontWeight: '400', marginBottom: '4px' }}>
                      {review.username}
                    </p>
                    <p style={{ color: theme.accent.red, fontSize: '13px' }}>
                      Rookie Quest Keeper User
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center', background: theme.bg.dark }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: '400',
            color: theme.text.white,
            marginBottom: '24px'
          }}>
            Ready to Level Up Your GMing?
          </h2>
          <p style={{
            color: theme.text.secondary,
            fontSize: '18px',
            marginBottom: '40px'
          }}>
            Join thousands of GMs who are running better campaigns with Rookie Quest Keeper.
          </p>
          <Button 
            onClick={() => navigate('/auth')}
            data-testid="final-cta-btn"
            style={{ 
              padding: '20px 48px', 
              fontSize: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              background: theme.accent.red,
              border: 'none',
              color: theme.text.white,
              fontWeight: '400'
            }}
          >
            <Scroll size={24} /> Create Your First Campaign
          </Button>
          <p style={{ color: theme.text.muted, fontSize: '14px', marginTop: '20px' }}>
            No credit card required. Free forever tier available.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        padding: '40px 24px', 
        borderTop: `1px solid ${theme.border.default}`,
        background: theme.bg.black
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ 
                fontFamily: "Eros Book, sans-serif",
                fontSize: '16px',
                fontWeight: '400',
                color: theme.text.white,
                letterSpacing: '2px'
              }}>
                RQK
              </span>
              <span style={{ color: theme.text.muted, fontSize: '14px' }}>
                A product of Rookie Quest
              </span>
            </div>
            <div style={{ color: theme.text.muted, fontSize: '14px' }}>
              2026 Rookie Quest. All rights reserved.
            </div>
          </div>
          
          <div style={{
            borderTop: `1px solid ${theme.border.default}`,
            paddingTop: '20px',
            textAlign: 'center'
          }}>
            <p style={{ 
              color: theme.text.dim, 
              fontSize: '12px', 
              lineHeight: '1.6',
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              Rookie Quest Keeper is an independent product published by Rookie Quest. 
              This tool is designed to be compatible with multiple tabletop roleplaying game systems. 
              Content may be used in accordance with applicable open gaming licenses and system reference documents.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
