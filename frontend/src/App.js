import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import '@/styles/designSystem.css';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import AuthPage from '@/components/AuthPage';
import UnifiedDashboard from '@/components/UnifiedDashboard';
import CampaignDashboard from '@/components/CampaignDashboard';
import DMScreen from '@/components/GMScreen';
import MobilePlayerCampaignView from '@/components/MobilePlayerCampaignView';
import CombatPage from '@/components/CombatPage';
import PricingPage from '@/components/PricingPage';
import AdminPage from '@/components/AdminPage';
import LandingPage from '@/components/LandingPage';
import AccountSettings from '@/components/AccountSettings';
import ImpersonationBanner from '@/components/admin/ImpersonationBanner';
import HomebrewWorkshop from '@/components/HomebrewWorkshop';
import CharacterBuilder from '@/components/CharacterBuilder';
import CharacterCreationModePicker from '@/components/CharacterCreationModePicker';
import BasicCharacterBuilder from '@/components/BasicCharacterBuilder';
import PremadeCharacterBuilder from '@/components/PremadeCharacterBuilder';
import KidsCharacterBuilder from '@/components/KidsCharacterBuilder';
import CharacterSheetFull from '@/components/CharacterSheetFull';
import { KeyboardShortcutsModal, ShortcutsHint } from '@/components/KeyboardShortcuts';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
import { usePlayerOnlyDevice } from '@/hooks/useResponsiveMode';
import { SubscriptionProvider } from '@/hooks/useSubscription';
import { ThemeProvider, useTheme, THEMES } from '@/contexts/ThemeContext';

// Component to automatically set theme based on route
function ThemeRouter() {
  const location = useLocation();
  const { setTheme } = useTheme();
  
  useEffect(() => {
    const path = location.pathname;
    
    // GM routes - purple/violet theme
    if (path.startsWith('/gm-screen') || 
        path.startsWith('/campaign/') || 
        path.startsWith('/campaigns')) {
      setTheme(THEMES.GM);
    }
    // Player routes - blue/cyan theme
    else if (path.startsWith('/characters')) {
      setTheme(THEMES.PLAYER);
    }
    // Landing/auth/other - neutral theme
    else {
      setTheme(THEMES.LANDING);
    }
  }, [location.pathname, setTheme]);
  
  return null;
}

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Setup axios interceptor for auth
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('dm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Conditional Dice Roller - only shows on gameplay pages, with correct theme
function ConditionalDiceRoller({ isAuthenticated, forceShow, onToggle }) {
  const location = useLocation();
  
  // Pages where dice roller should NOT appear
  const excludedPaths = ['/', '/auth', '/home', '/pricing', '/admin', '/account', '/reset-password'];
  
  // GM paths use red theme, everything else uses blue (player)
  const gmPaths = ['/gm', '/campaigns'];
  const isGMPage = gmPaths.some(path => location.pathname.startsWith(path));
  const mode = isGMPage ? 'gm' : 'player';
  
  // Check if current path should show dice roller
  const shouldShowDice = isAuthenticated && !excludedPaths.some(path => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  });
  
  // Show if forced or should show based on path
  return (shouldShowDice || forceShow) ? <FloatingDiceRoller mode={mode} onToggle={onToggle} /> : null;
}

// Keyboard shortcuts wrapper component
function KeyboardShortcutsProvider({ children, isAuthenticated }) {
  const [showHelp, setShowHelp] = useState(false);
  const [showDice, setShowDice] = useState(false);
  const location = useLocation();
  
  // Check if on a page where shortcuts should be active
  const shortcutsEnabled = isAuthenticated && !['/', '/auth'].includes(location.pathname);
  
  const handleToggleDice = useCallback(() => {
    setShowDice(prev => !prev);
    // Find and click the dice roller button if it exists
    const diceButton = document.querySelector('[data-testid="dice-roller-toggle"]');
    if (diceButton) diceButton.click();
  }, []);
  
  const handleFocusSearch = useCallback(() => {
    // Find any search input on the page
    const searchInput = document.querySelector('[data-testid="reference-search-input"]') ||
                        document.querySelector('input[type="search"]') ||
                        document.querySelector('input[placeholder*="Search"]');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }, []);
  
  const handleEscape = useCallback(() => {
    setShowHelp(false);
    // Close any open dialogs
    const closeButton = document.querySelector('[data-testid="dialog-close"]') ||
                        document.querySelector('[aria-label="Close"]');
    if (closeButton) closeButton.click();
  }, []);
  
  useKeyboardShortcuts({
    onToggleDice: handleToggleDice,
    onFocusSearch: handleFocusSearch,
    onShowHelp: () => setShowHelp(true),
    onEscape: handleEscape,
    enabled: shortcutsEnabled
  });
  
  return (
    <>
      {children}
      {shortcutsEnabled && (
        <>
          <ShortcutsHint onClick={() => setShowHelp(true)} />
          <KeyboardShortcutsModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
        </>
      )}
    </>
  );
}

function ResponsiveCampaignRoute({ username, onLogout }) {
  const playerOnlyDevice = usePlayerOnlyDevice();
  return playerOnlyDevice
    ? <MobilePlayerCampaignView />
    : <CampaignDashboard username={username} onLogout={onLogout} />;
}

function ResponsiveGMScreenRoute({ username }) {
  const playerOnlyDevice = usePlayerOnlyDevice();
  return playerOnlyDevice
    ? <MobilePlayerCampaignView />
    : <DMScreen username={username} />;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('dm_token');
    const savedUsername = localStorage.getItem('dm_username');
    
    if (token && savedUsername) {
      try {
        await axios.get(`${API}/auth/me`);
        setIsAuthenticated(true);
        setUsername(savedUsername);
      } catch (error) {
        localStorage.removeItem('dm_token');
        localStorage.removeItem('dm_username');
      }
    }
    setLoading(false);
  };

  const handleLogin = (token, username) => {
    localStorage.setItem('dm_token', token);
    localStorage.setItem('dm_username', username);
    setIsAuthenticated(true);
    setUsername(username);
    // Force redirect to home after login
    window.location.href = '/home';
  };

  const handleLogout = () => {
    localStorage.removeItem('dm_token');
    localStorage.removeItem('dm_username');
    setIsAuthenticated(false);
    setUsername('');
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <ThemeProvider>
          <ThemeRouter />
          <ImpersonationBanner />
          <SubscriptionProvider>
            <KeyboardShortcutsProvider isAuthenticated={isAuthenticated}>
              <Routes>
            {/* Login route - redirects to /auth */}
            <Route 
              path="/login" 
              element={
                isAuthenticated ? 
                  <Navigate to="/home" replace /> : 
                  <AuthPage onLogin={handleLogin} />
              } 
            />
            <Route 
              path="/auth" 
              element={
                isAuthenticated ? 
                  <Navigate to="/home" replace /> : 
                  <AuthPage onLogin={handleLogin} />
              } 
            />
            <Route 
              path="/home" 
              element={
                isAuthenticated ? 
                  <UnifiedDashboard username={username} onLogout={handleLogout} /> : 
                  <Navigate to="/auth" replace />
              } 
            />
            <Route 
              path="/characters/new" 
              element={
                isAuthenticated ? 
                  <CharacterCreationModePicker /> : 
                  <Navigate to="/auth" replace />
              } 
            />
            <Route path="/characters/new/full" element={isAuthenticated ? <CharacterBuilder /> : <Navigate to="/auth" replace />} />
            <Route path="/homebrew" element={isAuthenticated ? <HomebrewWorkshop /> : <Navigate to="/auth" replace />} />
            <Route path="/characters/new/basic" element={isAuthenticated ? <BasicCharacterBuilder /> : <Navigate to="/auth" replace />} />
            <Route path="/characters/new/premade" element={isAuthenticated ? <PremadeCharacterBuilder /> : <Navigate to="/auth" replace />} />
            <Route path="/characters/new/kids" element={isAuthenticated ? <KidsCharacterBuilder /> : <Navigate to="/auth" replace />} />
            <Route 
              path="/characters/:characterId" 
              element={
                isAuthenticated ? 
                  <CharacterSheetFull /> : 
                  <Navigate to="/auth" replace />
              } 
            />
            <Route 
              path="/characters/:characterId/edit" 
              element={
                isAuthenticated ? 
                  <CharacterBuilder editMode={true} /> : 
                  <Navigate to="/auth" replace />
              } 
            />
            <Route 
              path="/campaign/:campaignId" 
              element={
                isAuthenticated ? 
                  <ResponsiveCampaignRoute username={username} onLogout={handleLogout} /> :
                  <Navigate to="/auth" replace />
              } 
            />
            <Route 
              path="/gm-screen/:campaignId" 
              element={
                isAuthenticated ? 
                  <ResponsiveGMScreenRoute username={username} /> :
                  <Navigate to="/auth" replace />
              } 
            />
            <Route 
              path="/campaign/:campaignId/combat" 
              element={
                isAuthenticated ? 
                  <CombatPage /> : 
                  <Navigate to="/auth" replace />
              } 
            />
            <Route 
              path="/pricing" 
              element={
                isAuthenticated ? 
                  <PricingPage username={username} onLogout={handleLogout} /> : 
                  <Navigate to="/auth" replace />
              } 
            />
            <Route 
              path="/subscription/success" 
              element={<Navigate to="/pricing" replace />} 
            />
            <Route 
              path="/subscription/cancel" 
              element={<Navigate to="/pricing" replace />} 
            />
            <Route 
              path="/admin" 
              element={
                isAuthenticated ? 
                  <AdminPage username={username} /> : 
                  <Navigate to="/auth" replace />
              } 
            />
            <Route 
              path="/account" 
              element={
                isAuthenticated ? 
                  <AccountSettings username={username} onLogout={handleLogout} onUsernameChange={setUsername} /> : 
                  <Navigate to="/auth" replace />
              } 
            />
            <Route 
              path="/reset-password" 
              element={<AuthPage onLogin={handleLogin} />} 
            />
            <Route 
              path="/" 
              element={
                isAuthenticated ? 
                  <Navigate to="/home" replace /> : 
                  <LandingPage />
              } 
            />
          </Routes>
          {/* Floating Dice Roller - Disabled to reduce UI clutter */}
          {/* <ConditionalDiceRoller isAuthenticated={isAuthenticated} /> */}
          </KeyboardShortcutsProvider>
          </SubscriptionProvider>
        </ThemeProvider>
      </BrowserRouter>
      <Toaster position="top-right" richColors theme="dark" />
    </div>
  );
}

export default App;
