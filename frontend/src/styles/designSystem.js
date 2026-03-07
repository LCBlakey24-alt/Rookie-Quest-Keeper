// Shared Design System for Quest Keeper
// Matches the Landing Page aesthetic

export const COLORS = {
  // Backgrounds
  bgPrimary: '#0B0F19',
  bgSecondary: '#111827',
  bgCard: 'rgba(17, 24, 39, 0.8)',
  bgCardHover: 'rgba(17, 24, 39, 0.95)',
  bgGlass: 'rgba(11, 15, 25, 0.85)',
  
  // Accents
  blue: '#3B82F6',
  blueLight: '#60A5FA',
  cyan: '#22D3EE',
  purple: '#A855F7',
  pink: '#EC4899',
  red: '#EF4444',
  orange: '#F59E0B',
  green: '#22C55E',
  teal: '#14B8A6',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  
  // Borders
  borderPrimary: 'rgba(59, 130, 246, 0.2)',
  borderSecondary: 'rgba(255, 255, 255, 0.1)',
  borderAccent: 'rgba(34, 211, 238, 0.3)'
};

export const GRADIENTS = {
  background: 'linear-gradient(180deg, #0B0F19 0%, #111827 50%, #0B0F19 100%)',
  backgroundAlt: 'linear-gradient(135deg, #0B0F19 0%, #1e1b4b 50%, #0B0F19 100%)',
  cardBlue: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
  cardPurple: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%)',
  cardCyan: 'linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(34, 211, 238, 0.05) 100%)',
  cardRed: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
  cardGreen: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)',
  hero: 'radial-gradient(ellipse at 50% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 60%)',
  glow: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)'
};

export const SHADOWS = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
  md: '0 4px 16px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
  glow: (color) => `0 0 30px ${color}40, 0 0 60px ${color}20`,
  glowSm: (color) => `0 0 15px ${color}30`
};

// Glass morphism card style
export const glassCard = {
  background: 'rgba(17, 24, 39, 0.7)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px'
};

// Animated card with hover effect
export const animatedCard = {
  ...glassCard,
  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  cursor: 'pointer'
};

export const animatedCardHover = {
  transform: 'translateY(-4px)',
  boxShadow: '0 12px 40px rgba(59, 130, 246, 0.15)',
  borderColor: 'rgba(59, 130, 246, 0.3)'
};

// Section header style
export const sectionHeader = {
  fontSize: '24px',
  fontWeight: '800',
  fontFamily: 'Cityworm, sans-serif',
  color: COLORS.textPrimary,
  marginBottom: '8px'
};

export const sectionSubheader = {
  fontSize: '14px',
  color: COLORS.textSecondary,
  marginBottom: '24px',
  lineHeight: '1.6'
};

// Tab styles matching landing page
export const tabButton = (isActive, color = COLORS.blue) => ({
  padding: '12px 20px',
  borderRadius: '12px',
  border: `2px solid ${isActive ? color : 'transparent'}`,
  background: isActive ? `${color}15` : 'rgba(255, 255, 255, 0.03)',
  color: isActive ? color : COLORS.textSecondary,
  fontFamily: 'Cityworm, sans-serif',
  fontWeight: '700',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
});

// Stat block style (clickable)
export const statBlock = (color = COLORS.blue) => ({
  background: `${color}10`,
  border: `2px solid ${color}30`,
  borderRadius: '12px',
  padding: '16px',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
});

export const statBlockHover = (color = COLORS.blue) => ({
  background: `${color}20`,
  borderColor: color,
  transform: 'scale(1.02)',
  boxShadow: SHADOWS.glowSm(color)
});

// Badge/pill style
export const badge = (color = COLORS.blue) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 10px',
  background: `${color}20`,
  border: `1px solid ${color}40`,
  borderRadius: '20px',
  fontSize: '11px',
  fontWeight: '600',
  color: color
});

// Input field style
export const inputField = {
  background: 'rgba(0, 0, 0, 0.3)',
  border: '2px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '10px',
  padding: '12px 16px',
  color: COLORS.textPrimary,
  fontSize: '14px',
  transition: 'all 0.2s ease',
  outline: 'none'
};

export const inputFieldFocus = {
  borderColor: COLORS.blue,
  boxShadow: `0 0 0 3px ${COLORS.blue}20`
};

// Button styles
export const buttonPrimary = (color = COLORS.blue) => ({
  background: `linear-gradient(180deg, ${color} 0%, ${color}cc 100%)`,
  border: 'none',
  borderRadius: '10px',
  padding: '12px 24px',
  color: '#fff',
  fontWeight: '700',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
});

export const buttonOutline = (color = COLORS.blue) => ({
  background: 'transparent',
  border: `2px solid ${color}`,
  borderRadius: '10px',
  padding: '10px 22px',
  color: color,
  fontWeight: '700',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
});

// Animations keyframes (use in CSS or inline)
export const ANIMATIONS = {
  fadeUp: {
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0)' }
  },
  pulse: {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.7 }
  },
  glow: {
    '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
    '50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.5)' }
  },
  float: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-10px)' }
  }
};

// Responsive breakpoints
export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px'
};

// Z-index layers
export const LAYERS = {
  background: 0,
  content: 1,
  overlay: 10,
  modal: 50,
  tooltip: 100
};
