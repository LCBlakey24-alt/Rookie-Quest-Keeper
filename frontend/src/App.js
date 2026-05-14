import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import '@/App.css';
import '@/styles/designSystem.css';
import '@/styles/characterBuilderResponsive.css';
import '@/styles/characterBuilderUXFoundation.css';
import '@/styles/builderUI.css';
import '@/styles/builderAbilityScoresTouch.css';
import '@/styles/abilitiesStepTap.css';
import '@/styles/brandPolish.css';
import '@/styles/authBrandOverrides.css';
import '@/styles/professionalLanding.css';
import '@/styles/professionalDashboard.css';
import '@/styles/cleanCharacterSheet.css';
import '@/styles/cleanCombatTab.css';
import '@/styles/mobileSheetPolish.css';
import '@/styles/cleanSheetInteractions.css';
import '@/styles/cleanInventoryTab.css';
import '@/styles/cleanSpellsTab.css';
import '@/styles/cleanNotesTab.css';
import '@/styles/levelUpCleanStyle.css';
import '@/data/applyTestBackgrounds';
import '@/data/sanitizeCharacterBuilderDraft';
import { installRollBurstPersistence } from '@/utils/persistRollBurst';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import AuthPage from '@/components/AuthPage';
import UnifiedDashboard from '@/components/UnifiedDashboard';
import CampaignDashboard from '@/components/CampaignDashboard';
import DMScreen from '@/components/GMScreen';
import MobilePlayerCampaignView from '@/components/MobilePlayerCampaignView';
import CombatPage from '@/components/CombatPage';
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
import CleanCharacterSheet from '@/components/CleanCharacterSheet';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcuts';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
import { usePlayerOnlyDevice } from '@/hooks/useResponsiveMode';
import { ThemeProvider, useTheme, THEMES } from '@/contexts/ThemeContext';
import apiClient from '@/lib/apiClient';
import { AUTH_USERNAME_KEY, clearAuthToken, getAuthToken, setAuthToken } from '@/lib/auth';

function ThemeRouter() {
  const location = useLocation();
  const { setTheme } = useTheme();
  
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/gm-screen') || path.startsWith('/campaign/') || path.startsWith('/campaigns')) {
      setTheme(THEMES.GM);
    } else if (path.startsWith('/characters')) {
      setTheme(THEMES.PLAYER);
    } else {
      setTheme(THEMES.LANDING);
    }
  }, [location.pathname, setTheme]);
  
  return null;
}

function KeyboardShortcutsProvider({ children, isAuthenticated }) {
  const [showHelp, setShowHelp] = useState(false);
  const location = useLocation();
  const shortcutsEnabled = isAuthenticated && !['/', '/auth'].includes(location.pathname);
  
  const handleToggleDice = useCallback(() => {
    const diceButton = document.querySelector('[data-testid="dice-roller-toggle"]');
    if (diceButton) diceButton.click();
  }, []);
  
  const handleFocusSearch = useCallback(() => {
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
      {shortcutsEnabled && <KeyboardShortcutsModal isOpen={showHelp} onClose={() => setShowHelp(false)} />}
    </>
  );
}

function ResponsiveCampaignRoute({ username, onLogout }) {
  const playerOnlyDevice = usePlayerOnlyDevice();
  return playerOnlyDevice ? <MobilePlayerCampaignView /> : <CampaignDashboard username={username} onLogout={onLogout} />;
}

function ResponsiveGMScreenRoute({ username }) {
  const playerOnlyDevice = usePlayerOnlyDevice();
  return playerOnlyDevice ? <MobilePlayerCampaignView /> : <DMScreen username={username} />;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    installRollBurstPersistence();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = getAuthToken();
    const savedUsername = localStorage.getItem(AUTH_USERNAME_KEY);
    if (token && savedUsername) {
      try {
        await apiClient.get('/auth/me');
        setIsAuthenticated(true);
        setUsername(savedUsername);
      } catch (error) {
        clearAuthToken();
        localStorage.removeItem(AUTH_USERNAME_KEY);
      }
    }
    setLoading(false);
  };

  const handleLogin = (token, username) => {
    setAuthToken(token);
    localStorage.setItem(AUTH_USERNAME_KEY, username);
    setIsAuthenticated(true);
    setUsername(username);
    window.location.href = '/home';
  };

  const handleLogout = () => {
    clearAuthToken();
    localStorage.removeItem(AUTH_USERNAME_KEY);
    setIsAuthenticated(false);
    setUsername('');
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">
          <img className="loading-logo" src="/images/logo-mini.png" alt="ROOK loading" />
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <ThemeProvider>
          <ThemeRouter />
          <ImpersonationBanner />
          <KeyboardShortcutsProvider isAuthenticated={isAuthenticated}>
            <Routes>
              <Route path="/login" element={isAuthenticated ? <Navigate to="/home" replace /> : <AuthPage onLogin={handleLogin} />} />
              <Route path="/auth" element={isAuthenticated ? <Navigate to="/home" replace /> : <AuthPage onLogin={handleLogin} />} />
              <Route path="/home" element={isAuthenticated ? <UnifiedDashboard username={username} onLogout={handleLogout} /> : <Navigate to="/auth" replace />} />
              <Route path="/characters/new" element={isAuthenticated ? <CharacterCreationModePicker /> : <Navigate to="/auth" replace />} />
              <Route path="/characters/new/full" element={isAuthenticated ? <CharacterBuilder /> : <Navigate to="/auth" replace />} />
              <Route path="/homebrew" element={isAuthenticated ? <HomebrewWorkshop /> : <Navigate to="/auth" replace />} />
              <Route path="/characters/new/basic" element={isAuthenticated ? <BasicCharacterBuilder /> : <Navigate to="/auth" replace />} />
              <Route path="/characters/new/premade" element={isAuthenticated ? <PremadeCharacterBuilder /> : <Navigate to="/auth" replace />} />
              <Route path="/characters/new/kids" element={isAuthenticated ? <KidsCharacterBuilder /> : <Navigate to="/auth" replace />} />
              <Route path="/characters/:characterId" element={isAuthenticated ? <CleanCharacterSheet /> : <Navigate to="/auth" replace />} />
              <Route path="/characters/:characterId/edit" element={isAuthenticated ? <CharacterBuilder editMode={true} /> : <Navigate to="/auth" replace />} />
              <Route path="/campaign/:campaignId" element={isAuthenticated ? <ResponsiveCampaignRoute username={username} onLogout={handleLogout} /> : <Navigate to="/auth" replace />} />
              <Route path="/gm-screen/:campaignId" element={isAuthenticated ? <ResponsiveGMScreenRoute username={username} /> : <Navigate to="/auth" replace />} />
              <Route path="/campaign/:campaignId/combat" element={isAuthenticated ? <CombatPage /> : <Navigate to="/auth" replace />} />
              <Route path="/admin" element={isAuthenticated ? <AdminPage username={username} /> : <Navigate to="/auth" replace />} />
              <Route path="/account" element={isAuthenticated ? <AccountSettings username={username} onLogout={handleLogout} onUsernameChange={setUsername} /> : <Navigate to="/auth" replace />} />
              <Route path="/reset-password" element={<AuthPage onLogin={handleLogin} />} />
              <Route path="/" element={isAuthenticated ? <Navigate to="/home" replace /> : <LandingPage />} />
            </Routes>
          </KeyboardShortcutsProvider>
        </ThemeProvider>
      </BrowserRouter>
      <Toaster position="top-right" richColors theme="dark" />
    </div>
  );
}

export default App;
