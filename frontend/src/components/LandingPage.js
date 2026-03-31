import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sword, Users, Sparkles, Map, ChevronRight, Crown, Star, Zap, Check, Dice6, BookOpen, Shield } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    { icon: <Users size={24} />, title: "Party Management", desc: "Track characters, inventory & loot distribution" },
    { icon: <Sword size={24} />, title: "Combat Tracker", desc: "Initiative tracking, HP management & conditions" },
    { icon: <Sparkles size={24} />, title: "AI Tools", desc: "Generate NPCs, encounters & plot hooks" },
    { icon: <Map size={24} />, title: "World Building", desc: "Create locations, factions & campaign lore" }
  ];

  const tiers = [
    {
      name: 'Free',
      price: '0',
      period: '',
      icon: <Sword size={24} />,
      features: ['View campaigns (read-only)', 'Basic dice roller', 'Limited access'],
      gradient: 'from-gray-600 to-gray-700',
      borderColor: 'border-gray-600',
      isFree: true
    },
    {
      name: 'Player',
      price: 'TBD',
      period: '',
      icon: <Star size={24} />,
      features: ['Create characters', 'Join campaigns', 'Full character sheets', 'Inventory management'],
      gradient: 'from-cyan-500 to-blue-600',
      borderColor: 'border-cyan-500',
      comingSoon: true
    },
    {
      name: 'Game Master',
      price: '3.99',
      period: '/mo',
      icon: <Crown size={24} />,
      features: ['Create campaigns', 'GM tools & AI', 'Combat tracker', 'World building'],
      gradient: 'from-violet-600 to-purple-700',
      borderColor: 'border-violet-500',
      popular: true
    },
    {
      name: 'Legendary',
      price: '5.99',
      period: '/mo',
      icon: <Zap size={24} />,
      features: ['Full GM access', 'Player tier included*', 'Priority AI', 'Early access to features'],
      gradient: 'from-violet-600 via-purple-600 to-cyan-500',
      borderColor: 'border-violet-400',
      isLegendary: true,
      legendaryNote: '*Player benefits included when Player tier launches'
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#080A1A' }}>
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        {/* Purple glow - top left */}
        <div 
          className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
          style={{ 
            background: 'radial-gradient(circle, #8A2BE2 0%, transparent 70%)',
            top: '-200px',
            left: '-200px'
          }}
        />
        {/* Cyan glow - bottom right */}
        <div 
          className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
          style={{ 
            background: 'radial-gradient(circle, #4DD0E1 0%, transparent 70%)',
            bottom: '-200px',
            right: '-200px'
          }}
        />
        {/* Center gradient */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{ 
            background: 'radial-gradient(ellipse at 50% 50%, rgba(138, 43, 226, 0.1) 0%, transparent 60%)'
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center px-6 md:px-12 py-4" style={{
        background: 'rgba(8, 10, 26, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(77, 208, 225, 0.1)'
      }}>
        <div className="flex items-center gap-3">
          <img src="/images/logo-mini.png" alt="RQK" className="h-8" style={{ filter: 'drop-shadow(0 0 8px #8A2BE2)' }} />
          <span className="rook-logo text-xl font-bold bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
            ROOK
          </span>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/login')} 
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/5"
            style={{ 
              color: '#4DD0E1',
              border: '1px solid rgba(77, 208, 225, 0.3)'
            }}
            data-testid="landing-signin-btn"
          >
            Sign In
          </button>
          <button 
            onClick={() => navigate('/login')} 
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
            style={{ 
              background: 'linear-gradient(135deg, #8A2BE2 0%, #4DD0E1 100%)',
              boxShadow: '0 4px 20px rgba(138, 43, 226, 0.3)'
            }}
            data-testid="landing-getstarted-btn"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 md:px-12 py-16 md:py-24 text-center max-w-5xl mx-auto">
        <div 
          className="rounded-3xl p-8 md:p-12"
          style={{
            background: 'rgba(10, 17, 64, 0.6)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(138, 43, 226, 0.2)'
          }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src="/images/logo-main.png" 
              alt="Rookie Quest Keeper"
              className="w-48 md:w-64 h-auto animate-float"
              style={{ filter: 'drop-shadow(0 0 40px #8A2BE2)' }}
            />
          </div>
          
          {/* Title */}
          <h1 
            className="rook-logo text-5xl md:text-7xl font-black tracking-[0.2em] mb-6"
            style={{ 
              color: '#FFFFFF',
              textShadow: '0 0 60px #8A2BE2, 0 0 120px #4DD0E1'
            }}
          >
            KEEPER
          </h1>
          
          <p className="text-gray-300 text-base md:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            Your ultimate TTRPG companion for character management, campaign tracking, and AI-powered game mastery.
          </p>

          <button 
            onClick={() => navigate('/login')} 
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white transition-all duration-200 hover:-translate-y-1"
            style={{ 
              background: 'linear-gradient(135deg, #8A2BE2 0%, #4DD0E1 100%)',
              boxShadow: '0 8px 30px rgba(138, 43, 226, 0.4)'
            }}
            data-testid="landing-cta-btn"
          >
            Start Your Quest <ChevronRight size={20} />
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-6 md:px-12 py-12 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {features.map((f, i) => (
            <div 
              key={i} 
              className="rounded-xl p-5 text-center transition-all duration-200 hover:-translate-y-1 hover:border-violet-500/50"
              style={{
                background: 'rgba(10, 17, 64, 0.5)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(77, 208, 225, 0.15)'
              }}
              data-testid={`feature-card-${i}`}
            >
              <div className="text-cyan-400 mb-3 flex justify-center">{f.icon}</div>
              <h3 className="text-white text-sm md:text-base font-semibold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {f.title}
              </h3>
              <p className="text-gray-400 text-xs md:text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative z-10 px-6 md:px-12 py-12 pb-24 max-w-6xl mx-auto">
        <h2 
          className="text-2xl md:text-3xl font-bold text-center text-white mb-10"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Choose Your Path
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {tiers.map((tier, i) => (
            <div 
              key={i} 
              className={`relative rounded-2xl p-6 transition-all duration-200 ${tier.comingSoon ? 'opacity-70' : 'hover:-translate-y-1'}`}
              style={{
                background: tier.popular ? 'rgba(138, 43, 226, 0.15)' : 'rgba(10, 17, 64, 0.5)',
                backdropFilter: 'blur(16px)',
                border: tier.popular 
                  ? '2px solid rgba(138, 43, 226, 0.5)' 
                  : tier.isLegendary 
                    ? '1px solid rgba(138, 43, 226, 0.3)'
                    : '1px solid rgba(77, 208, 225, 0.15)'
              }}
              data-testid={`pricing-tier-${tier.name.toLowerCase()}`}
            >
              {/* Coming Soon Banner */}
              {tier.comingSoon && (
                <div 
                  className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded text-xs font-semibold uppercase"
                  style={{ background: '#4DD0E1', color: '#000' }}
                >
                  Coming Soon
                </div>
              )}
              
              {/* Popular Badge */}
              {tier.popular && (
                <div 
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold uppercase text-white"
                  style={{ background: 'linear-gradient(135deg, #8A2BE2 0%, #4DD0E1 100%)' }}
                >
                  Most Popular
                </div>
              )}
              
              <div className={`mb-4 ${tier.comingSoon ? 'mt-6' : ''}`}>
                <div className={`inline-flex p-2 rounded-lg mb-3 ${
                  tier.isLegendary ? 'bg-gradient-to-r from-violet-600 to-cyan-500' :
                  tier.popular ? 'bg-violet-600' :
                  tier.comingSoon ? 'bg-cyan-600' : 'bg-gray-600'
                }`}>
                  {tier.icon}
                </div>
                <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {tier.name}
                </h3>
              </div>
              
              <div className="mb-6">
                {tier.comingSoon ? (
                  <span className="text-2xl font-bold text-cyan-400" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {tier.price}
                  </span>
                ) : (
                  <>
                    <span className="text-gray-400 text-lg">$</span>
                    <span className="text-4xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {tier.price}
                    </span>
                    <span className="text-gray-400 text-sm">{tier.period}</span>
                  </>
                )}
              </div>
              
              <ul className="space-y-3 mb-6">
                {tier.features.map((feature, fi) => (
                  <li key={fi} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check size={16} className={`mt-0.5 flex-shrink-0 ${
                      tier.isLegendary ? 'text-cyan-400' :
                      tier.popular ? 'text-violet-400' :
                      tier.comingSoon ? 'text-cyan-400' : 'text-gray-500'
                    }`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              {tier.legendaryNote && (
                <p className="text-xs text-gray-500 mb-4 italic">{tier.legendaryNote}</p>
              )}
              
              <button 
                onClick={() => !tier.comingSoon && navigate('/login')}
                disabled={tier.comingSoon}
                className={`w-full py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  tier.comingSoon 
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                    : 'hover:-translate-y-0.5'
                }`}
                style={!tier.comingSoon ? {
                  background: tier.popular || tier.isLegendary 
                    ? 'linear-gradient(135deg, #8A2BE2 0%, #4DD0E1 100%)' 
                    : 'transparent',
                  color: '#fff',
                  border: tier.popular || tier.isLegendary ? 'none' : '1px solid rgba(255,255,255,0.2)'
                } : {}}
                data-testid={`pricing-btn-${tier.name.toLowerCase()}`}
              >
                {tier.comingSoon ? 'Coming Soon' : tier.isFree ? 'Get Started' : 'Subscribe'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer 
        className="relative z-10 px-6 md:px-12 py-8 text-center border-t"
        style={{ 
          background: 'rgba(8, 10, 26, 0.8)',
          borderColor: 'rgba(77, 208, 225, 0.1)'
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <img src="/images/logo-mini.png" alt="RQK" className="h-6" />
          <span className="rook-logo text-lg font-bold bg-gradient-to-r from-violet-500 to-cyan-400 bg-clip-text text-transparent">
            ROOK
          </span>
        </div>
        <p className="text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Rookie Quest Keeper. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
