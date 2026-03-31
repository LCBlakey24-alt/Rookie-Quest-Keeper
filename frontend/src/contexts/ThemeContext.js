import React, { createContext, useContext, useState, useEffect } from 'react';

// Theme types
export const THEMES = {
  LANDING: 'landing',
  GM: 'gm',
  PLAYER: 'player'
};

// Create context
const ThemeContext = createContext({
  theme: THEMES.LANDING,
  setTheme: () => {},
  isGMMode: false,
  isPlayerMode: false
});

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(THEMES.LANDING);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme attributes
    root.removeAttribute('data-theme');
    
    // Apply new theme if not landing (landing uses root defaults)
    if (theme !== THEMES.LANDING) {
      root.setAttribute('data-theme', theme);
    }
    
    // Store preference
    localStorage.setItem('rook-theme', theme);
  }, [theme]);

  // Load saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('rook-theme');
    if (savedTheme && Object.values(THEMES).includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  const value = {
    theme,
    setTheme,
    isGMMode: theme === THEMES.GM,
    isPlayerMode: theme === THEMES.PLAYER,
    isLandingMode: theme === THEMES.LANDING
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook for consuming theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Helper component for conditional rendering based on theme
export const ThemedComponent = ({ gmContent, playerContent, children }) => {
  const { isGMMode, isPlayerMode } = useTheme();
  
  if (isGMMode && gmContent) return gmContent;
  if (isPlayerMode && playerContent) return playerContent;
  return children;
};

export default ThemeContext;
