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
  // GM tools must remain accessible on mobile; do not force player-only fallback here.
  return <DMScreen username={username} />;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [siteSettings, setSiteSettings] = useState({ announcement_enabled: false, announcement_text: '', maintenance_mode: false });

  useEffect(() => {
    installRollBurstPersistence();
    checkAuth();
    loadSiteSettings();
    const interval = window.setInterval(loadSiteSettings, 60000);
    const onFocus = () => loadSiteSettings();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);



  const loadSiteSettings = async () => {
    try {
      const res = await apiClient.get('/site-settings');
      setSiteSettings(prev => ({ ...prev, ...(res.data || {}) }));
    } catch {
      // non-fatal: keep defaults
    }
  };

  const checkAuth = async () => {
    const token = getAuthToken();
    const savedUsername = localStorage.getItem(AUTH_USERNAME_KEY);
    if (token && savedUsername) {
      try {
        await apiClient.get('/auth/me');
        setIsAuthenticated(true);
        setUsername(savedUsername);
        try {
          const adminRes = await apiClient.get('/admin/check');
          setIsAdmin(!!adminRes.data?.is_admin);
        } catch {
          setIsAdmin(false);
        }
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
    setIsAdmin(false);
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

  const showAnnouncement = siteSettings.announcement_enabled && siteSettings.announcement_text;

  return (
    <div className="App" style={{ paddingTop: showAnnouncement ? 40 : 0 }}>
      {showAnnouncement ? (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1200, background: '#D4A017', color: '#0B0F19', padding: '8px 14px', textAlign: 'center', fontWeight: 800, fontSize: 13 }}>
          {siteSettings.announcement_text}
        </div>
      ) : null}
      {siteSettings.maintenance_mode && !isAdmin ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(11,15,25,0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 520, textAlign: 'center', border: '1px solid rgba(212,160,23,0.45)', background: '#0F2440', padding: 24 }}>
            <h2 style={{ color: '#D4A017', marginTop: 0 }}>We're performing maintenance</h2>
            <p style={{ color: '#F8FAFC' }}>Rookie Quest Keeper is temporarily unavailable while we deploy improvements. Please check back shortly.</p>
          </div>
        </div>
      ) : null}
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
              <Route path="/admin" element={isAuthenticated ? (isAdmin ? <AdminPage username={username} /> : <Navigate to="/home" replace />) : <Navigate to="/auth" replace />} />
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
