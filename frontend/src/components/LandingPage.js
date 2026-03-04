import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Sword, Users, Map, Sparkles, Dices, BookOpen, Crown, 
  ChevronRight, Star, Shield, Wand2, Globe, Scroll,
  ArrowRight, Check, Play, Zap, Clock, Target, TrendingUp,
  Brain, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const API = process.env.REACT_APP_BACKEND_URL;

function LandingPage() {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);
  const [activeScreenshot, setActiveScreenshot] = useState('gm');
  const [reviews, setReviews] = useState([]);
  const [scrollY, setScrollY] = useState(0);

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      color: "#22D3EE",
      details: ["Nested location hierarchy", "Generate with ROOK AI", "Custom place types"]
    },
    {
      icon: Sword,
      title: "Combat Manager",
      description: "Run epic battles with our initiative tracker, monster database, and interactive battle maps.",
      color: "#EF4444",
      details: ["2687+ monster statblocks", "Attack & damage roller", "Encounter difficulty calculator"]
    },
    {
      icon: Sparkles,
      title: "ROOK AI Assistant",
      description: "Your intelligent Game Master companion. ROOK handles the heavy lifting so you can focus on storytelling.",
      color: "#3B82F6",
      details: ["Generate NPCs & Locations", "Session recap writing", "Smart note parsing", "Encounter creation"]
    },
    {
      icon: Dices,
      title: "GM Screen",
      description: "Everything you need during live sessions: dice roller, quick reference, session notes, and party tracker.",
      color: "#F59E0B",
      details: ["Floating dice roller", "Random tables", "Name generator with NPC save"]
    }
  ];

  // Helper to render stars
  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <Star 
        key={i} 
        size={16} 
        fill={i < rating ? "#eab308" : "transparent"} 
        color={i < rating ? "#eab308" : "#475569"} 
      />
    ));
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #0B0F19 0%, #111827 50%, #0B0F19 100%)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* ===== GLOBAL PARALLAX BACKGROUND ===== */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '200vh',
        pointerEvents: 'none',
        zIndex: 0,
        transform: `translateY(${scrollY * 0.15}px)`
      }}>
        {/* Large decorative circles */}
        <div style={{
          position: 'absolute',
          top: '5%',
          left: '-5%',
          width: '600px',
          height: '600px',
          border: '1px solid rgba(59, 130, 246, 0.08)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute',
          top: '25%',
          right: '-10%',
          width: '800px',
          height: '800px',
          border: '1px solid rgba(168, 85, 247, 0.06)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute',
          top: '60%',
          left: '10%',
          width: '500px',
          height: '500px',
          border: '1px solid rgba(34, 211, 238, 0.07)',
          borderRadius: '50%'
        }} />
        
        {/* Grid pattern overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }} />
        
        {/* Floating geometric shapes with slow parallax */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '8%',
          width: '100px',
          height: '100px',
          border: '2px solid rgba(34, 211, 238, 0.1)',
          borderRadius: '20px',
          transform: 'rotate(45deg)'
        }} />
        <div style={{
          position: 'absolute',
          top: '40%',
          right: '15%',
          width: '80px',
          height: '80px',
          border: '2px solid rgba(168, 85, 247, 0.1)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute',
          top: '70%',
          left: '20%',
          width: '60px',
          height: '60px',
          border: '2px solid rgba(59, 130, 246, 0.1)',
          transform: 'rotate(30deg)'
        }} />
        <div style={{
          position: 'absolute',
          top: '85%',
          right: '25%',
          width: '120px',
          height: '120px',
          border: '2px solid rgba(34, 211, 238, 0.08)',
          borderRadius: '24px',
          transform: 'rotate(-15deg)'
        }} />
      </div>

      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '16px 24px',
        background: 'rgba(11, 15, 25, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.2)'
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
              src="/rqk-logo-mascot.png" 
              alt="Rookie Quest Keeper" 
              style={{ height: '42px' }}
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

      {/* Hero Section - UPGRADED */}
      <section style={{ 
        paddingTop: '140px', 
        paddingBottom: '80px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* ===== PARALLAX BACKGROUND LAYER (moves slower) ===== */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          transform: `translateY(${scrollY * 0.3}px)`
        }}>
          {/* Floating orbs - background layer */}
          <div style={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(124, 58, 237, 0.2) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(80px)'
          }} />
          <div style={{
            position: 'absolute',
            top: '20%',
            right: '5%',
            width: '450px',
            height: '450px',
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.15) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(80px)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '20%',
            left: '25%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(80px)'
          }} />
          
          {/* Decorative geometric shapes - background */}
          <div style={{
            position: 'absolute',
            top: '15%',
            left: '15%',
            width: '60px',
            height: '60px',
            border: '2px solid rgba(34, 211, 238, 0.2)',
            borderRadius: '12px',
            transform: 'rotate(45deg)'
          }} />
          <div style={{
            position: 'absolute',
            top: '25%',
            right: '20%',
            width: '40px',
            height: '40px',
            border: '2px solid rgba(168, 85, 247, 0.2)',
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '30%',
            left: '10%',
            width: '80px',
            height: '80px',
            border: '2px solid rgba(59, 130, 246, 0.15)',
            borderRadius: '16px',
            transform: 'rotate(15deg)'
          }} />
          <div style={{
            position: 'absolute',
            top: '60%',
            right: '12%',
            width: '50px',
            height: '50px',
            border: '2px solid rgba(34, 211, 238, 0.15)',
            borderRadius: '8px',
            transform: 'rotate(-20deg)'
          }} />
          
          {/* Star/sparkle dots */}
          {[
            { top: '12%', left: '25%', size: 4, color: 'rgba(34, 211, 238, 0.5)' },
            { top: '35%', right: '30%', size: 6, color: 'rgba(168, 85, 247, 0.4)' },
            { top: '55%', left: '8%', size: 5, color: 'rgba(59, 130, 246, 0.4)' },
            { top: '20%', right: '8%', size: 4, color: 'rgba(34, 211, 238, 0.3)' },
            { top: '70%', right: '25%', size: 5, color: 'rgba(168, 85, 247, 0.3)' },
            { top: '45%', left: '20%', size: 3, color: 'rgba(255, 255, 255, 0.3)' }
          ].map((star, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: star.top,
              left: star.left,
              right: star.right,
              width: star.size,
              height: star.size,
              background: star.color,
              borderRadius: '50%',
              boxShadow: `0 0 ${star.size * 3}px ${star.color}`
            }} />
          ))}
        </div>

        {/* ===== FOREGROUND CONTENT (moves faster / normal) ===== */}
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '0 24px', 
          textAlign: 'center', 
          position: 'relative',
          transform: `translateY(${scrollY * -0.05}px)` 
        }}>
          
          {/* ROOK Mascot - Floating above the logo */}
          <div style={{ 
            marginBottom: '24px', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center'
          }}>
            <img 
              src="/rook-mascot.png" 
              alt="ROOK" 
              style={{ 
                height: '140px',
                filter: 'drop-shadow(0 0 30px rgba(34, 211, 238, 0.5))',
                animation: 'float 3s ease-in-out infinite'
              }}
            />
          </div>

          {/* GRAND Text Logo - Rookie Quest Keeper */}
          <div style={{ 
            marginBottom: '16px',
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0'
          }}>
            {/* "ROOKIE QUEST" - Now much bigger! */}
            <h1 style={{
              fontSize: 'clamp(3rem, 9vw, 7rem)',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '800',
              color: '#ffffff',
              letterSpacing: 'clamp(4px, 1vw, 12px)',
              textTransform: 'uppercase',
              margin: 0,
              lineHeight: '1',
              textShadow: '0 0 40px rgba(59, 130, 246, 0.3)',
              background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              ROOKIE QUEST
            </h1>
            
            {/* "KEEPER" - with accent lines */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(12px, 2vw, 24px)',
              marginTop: '-8px'
            }}>
              {/* Left accent line - Blue */}
              <div style={{
                width: 'clamp(30px, 6vw, 80px)',
                height: '4px',
                background: 'linear-gradient(90deg, transparent 0%, #3B82F6 100%)',
                borderRadius: '2px',
                boxShadow: '0 0 25px rgba(59, 130, 246, 0.7)'
              }} />
              
              {/* KEEPER text */}
              <h1 style={{
                fontSize: 'clamp(3.5rem, 10vw, 8rem)',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: '900',
                color: '#ffffff',
                letterSpacing: 'clamp(6px, 2vw, 20px)',
                textTransform: 'uppercase',
                margin: 0,
                lineHeight: '1',
                textShadow: '0 0 60px rgba(34, 211, 238, 0.5), 0 0 120px rgba(168, 85, 247, 0.3)',
                background: 'linear-gradient(180deg, #ffffff 0%, #e2e8f0 40%, #94a3b8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                KEEPER
              </h1>
              
              {/* Right accent line - Purple */}
              <div style={{
                width: 'clamp(30px, 6vw, 80px)',
                height: '4px',
                background: 'linear-gradient(90deg, #A855F7 0%, transparent 100%)',
                borderRadius: '2px',
                boxShadow: '0 0 25px rgba(168, 85, 247, 0.7)'
              }} />
            </div>

            {/* Tagline under the logo */}
            <p style={{
              fontSize: 'clamp(0.85rem, 1.8vw, 1.1rem)',
              color: '#22D3EE',
              letterSpacing: '6px',
              textTransform: 'uppercase',
              marginTop: '16px',
              fontWeight: '600'
            }}>
              Campaign Operating System
            </p>
          </div>

          {/* Divider line */}
          <div style={{
            width: '120px',
            height: '2px',
            background: 'linear-gradient(90deg, #3B82F6, #22D3EE, #A855F7)',
            margin: '32px auto',
            borderRadius: '2px'
          }} />

          {/* NEW Headline */}
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: '800',
            color: '#ffffff',
            marginBottom: '24px',
            lineHeight: '1.2'
          }}>
            Run Better Tabletop Sessions{' '}
            <span className="rainbow-text" style={{ fontWeight: '800' }}>
              in Less Time
            </span>
          </h1>

          {/* NEW Subheadline */}
          <p style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
            color: '#94a3b8',
            maxWidth: '800px',
            margin: '0 auto 40px',
            lineHeight: '1.7'
          }}>
            Rookie Quest Keeper is the all-in-one <strong style={{ color: '#22D3EE' }}>campaign operating system</strong> for 5e Game Masters — 
            combining worldbuilding, AI content generation, combat control, and live session tools in one unified platform.
          </p>

          {/* CTA Buttons - UPDATED */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '32px' }}>
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
              Explore Features <ChevronRight size={20} />
            </Button>
          </div>

          {/* NEW: Three Benefit Bullets */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: '32px',
            flexWrap: 'wrap',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e', fontSize: '15px', fontWeight: '600' }}>
              <Zap size={18} /> Stop juggling tabs
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7', fontSize: '15px', fontWeight: '600' }}>
              <Brain size={18} /> Prep faster with AI
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '15px', fontWeight: '600' }}>
              <Target size={18} /> Run smoother combat
            </div>
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
                    <Star key={i} size={18} fill="#eab308" color="#eab308" />
                  ))}
                </div>
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>Loved by GMs</span>
              </div>
            )}
            <div style={{ color: '#4a7dff', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={16} /> Free Forever Tier
            </div>
            <div style={{ color: '#22c55e', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} /> AI-Powered
            </div>
          </div>
        </div>
      </section>

      {/* NEW: Immediate Value Section */}
      <section style={{ 
        padding: '80px 24px', 
        background: 'rgba(10, 10, 46, 0.3)',
        borderTop: '2px solid rgba(20, 184, 166, 0.2)',
        borderBottom: '2px solid rgba(20, 184, 166, 0.2)'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '800',
              color: '#ffffff',
              marginBottom: '20px'
            }}>
              Your Entire Campaign. <span style={{ color: '#14b8a6' }}>One System.</span>
            </h2>
            <p style={{
              color: '#94a3b8',
              fontSize: '18px',
              lineHeight: '1.8',
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              Most GMs juggle notes, PDFs, initiative trackers, spreadsheets, and AI chats across multiple tools. 
              Rookie Quest Keeper connects <strong style={{ color: '#fff' }}>prep and play</strong> into one seamless workflow — 
              so your ideas, combat, and content stay organized and ready.
            </p>
          </div>

          {/* Visual Flow */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            {[
              { icon: Globe, label: 'Build World', color: '#22c55e' },
              { icon: Sparkles, label: 'Generate Content', color: '#a855f7' },
              { icon: Sword, label: 'Run Combat', color: '#ef4444' },
              { icon: BookOpen, label: 'Capture & Recap', color: '#4a7dff' }
            ].map((step, idx, arr) => (
              <React.Fragment key={idx}>
                <div style={{
                  padding: '24px 32px',
                  background: `linear-gradient(135deg, ${step.color}20 0%, ${step.color}10 100%)`,
                  border: `2px solid ${step.color}`,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  minWidth: '180px'
                }}>
                  <step.icon size={28} color={step.color} />
                  <span style={{ color: '#fff', fontWeight: '700', fontSize: '16px' }}>
                    {step.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <ChevronRight size={24} color="#475569" style={{ flexShrink: 0 }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* NEW: Screenshot Showcase Section */}
      <section style={{ padding: '80px 24px', position: 'relative', background: 'rgba(10, 10, 46, 0.3)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '800',
              color: '#ffffff',
              marginBottom: '16px'
            }}>
              See <span className="rainbow-text">Rookie Quest Keeper</span> in Action
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
              A quick look at how our tools help you run amazing games
            </p>
          </div>

          {/* Screenshot Tabs */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              {[
                { id: 'gm', label: 'GM Dashboard', color: '#7C3AED' },
                { id: 'world', label: 'World Builder', color: '#22D3EE' },
                { id: 'player', label: 'Player Hub', color: '#10B981' },
                { id: 'notes', label: 'Session Notes', color: '#EAB308' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveScreenshot(tab.id)}
                  style={{
                    padding: '12px 24px',
                    background: activeScreenshot === tab.id 
                      ? `linear-gradient(135deg, ${tab.color} 0%, ${tab.color}99 100%)`
                      : 'rgba(30, 41, 59, 0.8)',
                    border: activeScreenshot === tab.id 
                      ? 'none' 
                      : '1px solid #334155',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontWeight: '600',
                    fontSize: '14px',
                    fontFamily: 'Montserrat, sans-serif',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Screenshot Display */}
          <div style={{
            position: 'relative',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5)',
            border: '2px solid #1e3a5f'
          }}>
            {/* Browser Chrome */}
            <div style={{
              background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#eab308' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }} />
              </div>
              <div style={{
                flex: 1,
                background: '#0f172a',
                borderRadius: '6px',
                padding: '6px 16px',
                marginLeft: '12px',
                fontSize: '12px',
                color: '#64748b'
              }}>
                rookiequestkeeper.com
              </div>
            </div>

            {/* Screenshot Content */}
            <div style={{
              background: '#0B0F19',
              minHeight: '500px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {activeScreenshot === 'gm' && (
                <img 
                  src="/screenshots/npcs.png" 
                  alt="GM Dashboard - NPC Management"
                  style={{ 
                    width: '100%', 
                    height: 'auto',
                    objectFit: 'cover',
                    objectPosition: 'top center'
                  }}
                />
              )}

              {activeScreenshot === 'world' && (
                <img 
                  src="/screenshots/world-builder.png" 
                  alt="World Builder - Locations"
                  style={{ 
                    width: '100%', 
                    height: 'auto',
                    objectFit: 'cover',
                    objectPosition: 'top center'
                  }}
                />
              )}

              {activeScreenshot === 'player' && (
                <img 
                  src="/screenshots/player-hub.png" 
                  alt="Player Hub"
                  style={{ 
                    width: '100%', 
                    height: 'auto',
                    objectFit: 'cover',
                    objectPosition: 'top center'
                  }}
                />
              )}

              {activeScreenshot === 'notes' && (
                <img 
                  src="/screenshots/session-notes.png" 
                  alt="Session Notes"
                  style={{ 
                    width: '100%', 
                    height: 'auto',
                    objectFit: 'cover',
                    objectPosition: 'top center'
                  }}
                />
              )}
            </div>
          </div>

          {/* CTA below showcase */}
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Button
              onClick={() => navigate('/auth')}
              style={{
                padding: '16px 40px',
                fontSize: '18px',
                fontWeight: '700',
                fontFamily: 'Montserrat, sans-serif',
                background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(124, 58, 237, 0.4)'
              }}
            >
              Try It Free <ArrowRight size={20} style={{ marginLeft: '8px', display: 'inline' }} />
            </Button>
          </div>
        </div>
      </section>

      {/* NEW: Who It's For Section */}
      <section style={{ padding: '80px 24px', position: 'relative' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '800',
              color: '#ffffff',
              marginBottom: '16px'
            }}>
              Built for <span className="rainbow-text">Real Game Masters</span>
            </h2>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '32px' 
          }}>
            {/* New DMs */}
            <div style={{
              padding: '40px',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(10, 10, 46, 0.8) 100%)',
              border: '2px solid #22c55e',
              borderRadius: '24px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <BookOpen size={40} color="#22c55e" />
              </div>
              <h3 style={{
                fontSize: '24px',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: '700',
                color: '#22c55e',
                marginBottom: '16px'
              }}>
                New DMs
              </h3>
              <p style={{
                color: '#94a3b8',
                fontSize: '16px',
                lineHeight: '1.7'
              }}>
                Overwhelmed by prep? Use structured tools that guide your campaign from session zero to finale.
              </p>
            </div>

            {/* Forever DMs */}
            <div style={{
              padding: '40px',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(10, 10, 46, 0.8) 100%)',
              border: '2px solid #a855f7',
              borderRadius: '24px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(168, 85, 247, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <Crown size={40} color="#a855f7" />
              </div>
              <h3 style={{
                fontSize: '24px',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: '700',
                color: '#a855f7',
                marginBottom: '16px'
              }}>
                Forever DMs
              </h3>
              <p style={{
                color: '#94a3b8',
                fontSize: '16px',
                lineHeight: '1.7'
              }}>
                Running long campaigns? Keep NPCs, locations, combat, and notes connected across months of play.
              </p>
            </div>

            {/* Online DMs */}
            <div style={{
              padding: '40px',
              background: 'linear-gradient(135deg, rgba(74, 125, 255, 0.1) 0%, rgba(10, 10, 46, 0.8) 100%)',
              border: '2px solid #4a7dff',
              borderRadius: '24px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(74, 125, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <Globe size={40} color="#4a7dff" />
              </div>
              <h3 style={{
                fontSize: '24px',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: '700',
                color: '#4a7dff',
                marginBottom: '16px'
              }}>
                Online DMs
              </h3>
              <p style={{
                color: '#94a3b8',
                fontSize: '16px',
                lineHeight: '1.7'
              }}>
                Stop switching between Discord, VTTs, PDFs, and scattered notes. Centralize everything in one command center.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - UPDATED AI Section */}
      <section id="features" style={{ padding: '80px 24px', position: 'relative', background: 'rgba(10, 10, 46, 0.2)' }}>
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
                {/* AI GM Assistant gets special subtext */}
                {feature.title === 'AI GM Assistant' && (
                  <p style={{
                    color: '#a855f7',
                    fontSize: '13px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    fontStyle: 'italic'
                  }}>
                    Purpose-built AI that performs real GM tasks — not generic chat.
                  </p>
                )}
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

      {/* Meet ROOK Section */}
      <section style={{ 
        padding: '100px 24px', 
        background: 'linear-gradient(180deg, #0B0F19 0%, #0a1628 50%, #0B0F19 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(34, 211, 238, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />
        
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '60px', 
            alignItems: 'center'
          }}>
            {/* ROOK Mascot */}
            <div style={{ textAlign: 'center' }}>
              <img 
                src="/rook-mascot.png" 
                alt="ROOK AI Assistant"
                style={{
                  width: '100%',
                  maxWidth: '350px',
                  filter: 'drop-shadow(0 0 40px rgba(34, 211, 238, 0.3))'
                }}
              />
            </div>
            
            {/* ROOK Info */}
            <div>
              <div style={{ marginBottom: '24px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'rgba(34, 211, 238, 0.15)',
                  borderRadius: '20px',
                  color: '#22D3EE',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '16px'
                }}>
                  <Sparkles size={16} />
                  AI ASSISTANT
                </span>
              </div>
              
              <h2 style={{
                fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: '800',
                color: '#ffffff',
                marginBottom: '16px',
                lineHeight: '1.2'
              }}>
                Meet <span style={{ color: '#22D3EE' }}>ROOK</span>
              </h2>
              
              <p style={{
                color: '#22D3EE',
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '24px',
                fontStyle: 'italic'
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
                    background: 'rgba(34, 211, 238, 0.1)',
                    borderRadius: '12px',
                    border: '1px solid rgba(34, 211, 238, 0.2)'
                  }}>
                    <div style={{
                      fontSize: '28px',
                      fontWeight: '800',
                      color: '#22D3EE',
                      fontFamily: 'Montserrat, sans-serif'
                    }}>
                      {item.letter}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#94a3b8',
                      marginTop: '4px'
                    }}>
                      {item.word}
                    </div>
                  </div>
                ))}
              </div>
              
              <p style={{
                color: '#94a3b8',
                fontSize: '17px',
                lineHeight: '1.8',
                marginBottom: '32px'
              }}>
                ROOK is the intelligent assistant built into Rookie Quest Keeper. 
                It helps Game Masters <strong style={{ color: '#fff' }}>generate worlds</strong>, 
                <strong style={{ color: '#fff' }}> build NPCs</strong>, 
                <strong style={{ color: '#fff' }}> summarize sessions</strong>, and 
                <strong style={{ color: '#fff' }}> manage campaigns</strong> with ease.
              </p>
              
              {/* ROOK Features */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {[
                  'Generate with ROOK',
                  'ROOK Worldbuilder',
                  'ROOK Recap',
                  'Ask ROOK'
                ].map((feature, i) => (
                  <span key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
                    borderRadius: '24px',
                    color: '#22D3EE',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: '1px solid rgba(34, 211, 238, 0.3)'
                  }}>
                    <img src="/rook-mascot.png" alt="" style={{ width: '18px', height: '18px' }} />
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEW: Pre-Pricing Statement Section */}
      <section style={{ 
        padding: '80px 24px', 
        background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%)',
        borderTop: '2px solid rgba(20, 184, 166, 0.3)',
        borderBottom: '2px solid rgba(124, 58, 237, 0.3)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: '800',
            color: '#ffffff',
            marginBottom: '24px',
            lineHeight: '1.3'
          }}>
            Stop Managing Tools. <br />
            <span style={{ color: '#14b8a6' }}>Start Managing Your Campaign.</span>
          </h2>
          <p style={{
            color: '#94a3b8',
            fontSize: '20px',
            lineHeight: '1.8',
            maxWidth: '700px',
            margin: '0 auto'
          }}>
            Rookie Quest Keeper replaces fragmented GM workflows with one connected campaign hub — 
            built specifically for <strong style={{ color: '#fff' }}>5e 2014 and 2024</strong>.
          </p>
        </div>
      </section>

      {/* Pricing Section - ENHANCED */}
      <section style={{ padding: '80px 24px', background: 'rgba(10, 10, 46, 0.3)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            {/* NEW: Start Free text */}
            <p style={{
              color: '#22c55e',
              fontSize: '16px',
              fontWeight: '700',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '12px'
            }}>
              Start Free. Upgrade When You're Ready.
            </p>
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
              No credit card required. Free forever tier available.
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
                {['2 Campaigns', '5 AI Generations/month', 'Full Combat System', 'GM Screen Access', 'Monster Database'].map((item, i) => (
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

            {/* Premium Tier - ENHANCED */}
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
              
              {/* EMPHASIZED unlimited features */}
              <div style={{
                padding: '16px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '2px solid #22c55e',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  color: '#22c55e',
                  fontSize: '18px',
                  fontWeight: '700',
                  marginBottom: '8px'
                }}>
                  <TrendingUp size={20} /> Unlimited Campaigns
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  color: '#22c55e',
                  fontSize: '18px',
                  fontWeight: '700'
                }}>
                  <Sparkles size={20} /> Unlimited AI Generations
                </div>
              </div>

              <ul style={{ margin: '0 0 32px', padding: 0, listStyle: 'none' }}>
                {['Priority Support', 'Early Access Features', 'Everything in Free'].map((item, i) => (
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
                  background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                  marginBottom: '12px'
                }}
              >
                Start Adventurer Trial
              </Button>
              
              {/* NEW: Reassurance text */}
              <p style={{
                color: '#94a3b8',
                fontSize: '13px',
                textAlign: 'center',
                marginTop: '12px'
              }}>
                Cancel anytime. No contracts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section - Only show if there are reviews */}
      {reviews.length > 0 && (
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
                What GMs Are Saying
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '18px' }}>
                Real reviews from real Game Masters
              </p>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '24px' 
            }}>
              {reviews.map((review, index) => (
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
                    {renderStars(review.rating)}
                  </div>
                  <p style={{
                    color: '#e2e8f0',
                    fontSize: '16px',
                    lineHeight: '1.7',
                    marginBottom: '20px',
                    fontStyle: 'italic'
                  }}>
                    "{review.comment}"
                  </p>
                  <div>
                    <p style={{ color: '#ffffff', fontWeight: '700', marginBottom: '4px' }}>
                      {review.username}
                    </p>
                    <p style={{ color: '#67e8f9', fontSize: '13px' }}>
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
            Join thousands of GMs who are running better campaigns with Rookie Quest Keeper.
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
          margin: '0 auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="/rqk-logo-text.png" alt="Rookie Quest Keeper" style={{ height: '24px' }} />
              <span style={{ color: '#64748b', fontSize: '14px' }}>
                A product of Rookie Quest
              </span>
            </div>
            <div style={{ color: '#64748b', fontSize: '14px' }}>
              © 2026 Rookie Quest. All rights reserved.
            </div>
          </div>
          
          {/* Legal Disclaimer */}
          <div style={{
            borderTop: '1px solid rgba(74, 125, 255, 0.1)',
            paddingTop: '20px',
            textAlign: 'center'
          }}>
            <p style={{ 
              color: '#475569', 
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
