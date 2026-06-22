import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
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
import '@/styles/siteVelvetTheme.css';
import '@/data/applyTestBackgrounds';
import '@/data/sanitizeCharacterBuilderDraft';
import { installRollBurstPersistence } from '@/utils/persistRollBurst';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import ImpersonationBanner from '@/components/admin/ImpersonationBanner';
import GlobalFeedbackButton from '@/components/GlobalFeedbackButton';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcuts';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
import { ThemeProvider, useTheme, THEMES } from '@/contexts/ThemeContext';
import apiClient from '@/lib/apiClient';
import { AUTH_USERNAME_KEY, clearAuthToken, getAuthToken, setAuthToken } from '@/lib/auth';

const AuthPage = React.lazy(() => import('@/components/AuthPage'));
const UnifiedDashboard = React.lazy(() => import('@/components/UnifiedDashboard'));
const PlayerDashboard = React.lazy(() => import('@/components/PlayerDashboard'));
const CampaignDashboard = React.lazy(() => import('@/components/CampaignDashboard'));
const LiveSessionGridPage = React.lazy(() => import('@/components/gm/LiveSessionGridPage'));
const MobilePlayerCampaignView = React.lazy(() => import('@/components/MobilePlayerCampaignView'));
const CombatPage = React.lazy(() => import('@/components/CombatPage'));
const AdminPage = React.lazy(() => import('@/components/AdminPage'));
const LandingPage = React.lazy(() => import('@/components/LandingPage'));
const AccountSettings = React.lazy(() => import('@/components/AccountSettings'));
const HomebrewWorkshop = React.lazy(() => import('@/components/HomebrewWorkshop'));
const CharacterBuilder = React.lazy(() => import('@/components/CharacterBuilder'));
const CharacterCreationModePicker = React.lazy(() => import('@/components/CharacterCreationModePicker'));
const BasicCharacterBuilder = React.lazy(() => import('@/components/BasicCharacterBuilder'));
const PremadeCharacterBuilder = React.lazy(() => import('@/components/PremadeCharacterBuilder'));
const KidsCharacterBuilder = React.lazy(() => import('@/components/KidsCharacterBuilder'));
const CleanCharacterSheet = React.lazy(() => import('@/components/CleanCharacterSheet'));

function RouteLoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-spinner">
        <img className="loading-logo" src="/images/logo-mini.png" alt="ROOK loading" />
      </div>
      <p style={{ color: '#CBD5E1', marginTop: 12, fontWeight: 800 }}>Opening your dashboard…</p>
    </div>
  );
}

function ThemeRouter() {
  const location = useLocation();
  const { setTheme } = useTheme();
  
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/gm-screen')) {
      setTheme(THEMES.GM);
    } else if (path.startsWith('/characters') || path.startsWith('/player') || path.startsWith('/campaign/')) {
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

function CampaignAccessRoute({ username, onLogout }) {
  const { campaignId } = useParams();
  const { setTheme } = useTheme();
  const [accessMode, setAccessMode] = useState('checking');

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      setAccessMode('checking');
      try {
        await apiClient.get(`/campaigns/${campaignId}`);
        if (!cancelled) {
          setTheme(THEMES.GM);
          setAccessMode('gm');
        }
      } catch (gmError) {
        try {
          await apiClient.get(`/player/campaign/${campaignId}`);
          if (!cancelled) {
            setTheme(THEMES.PLAYER);
            setAccessMode('player');
          }
        } catch (playerError) {
          if (!cancelled) {
            setTheme(THEMES.PLAYER);
            setAccessMode('denied');
          }
        }
      }
    }

    checkAccess();
    return () => { cancelled = true; };
  }, [campaignId, setTheme]);

  if (accessMode === 'checking') return <RouteLoadingScreen />;

  if (accessMode === 'gm') {
    return <CampaignDashboard username={username} onLogout={onLogout} />;
  }

  if (accessMode === 'player') {
    return <MobilePlayerCampaignView />;
  }

  return <CampaignAccessDenied />;
}

function CampaignAccessDenied() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--rq-bg-main, #1A1A1A)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <section style={{ maxWidth: 520, width: '100%', textAlign: 'center', background: 'var(--rq-bg-panel, #242424)', border: '1px solid var(--rq-accent-border, rgba(193,18,31,0.35))', borderRadius: 'var(--rq-radius-md, 6px)', padding: 28 }}>
        <h1 style={{ color: 'var(--rq-text-primary, #FFFFFF)', margin: '0 0 10px', fontSize: 26, fontWeight: 900 }}>Campaign access needed</h1>
        <p style={{ color: 'var(--rq-text-secondary, #D6D6D6)', margin: '0 0 20px', lineHeight: 1.6 }}>
          This campaign is not linked to your account. Ask the GM for a join code, then link one of your characters from the player dashboard.
        </p>
        <a href="/player" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 40, padding: '0 16px', background: 'var(--rq-accent-primary, #C1121F)', color: '#FFFFFF', borderRadius: 'var(--rq-radius-sm, 4px)', textDecoration: 'none', fontWeight: 900 }}>
          Go to Player Dashboard
        </a>
      </section>
    </main>
  );
}

function LivePlayModeRoute() {
  return <LiveSessionGridPage />;
}

function ResponsiveCharacterSheetRoute() {
  return <CleanCharacterSheet />;
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
  };

  const handleLogout = () => {
    clearAuthToken();
    localStorage.removeItem(AUTH_USERNAME_KEY);
    setIsAuthenticated(false);
    setUsername('');
    setIsAdmin(false);
    toast.success('Logged out successfully');
  };

  if (loading) return <RouteLoadingScreen />;

  const showAnnouncement = siteSettings.announcement_enabled && siteSettings.announcement_text;

  return (
    <div className="App">
      {showAnnouncement ? (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1200, background: 'var(--rq-accent-primary, #C1121F)', color: 'var(--rq-text-primary, #FFFFFF)', padding: '8px 14px', textAlign: 'center', fontWeight: 800, fontSize: 13, borderBottom: '1px solid var(--rq-accent-strong-border, rgba(193,18,31,0.62))' }}>
          {siteSettings.announcement_text}
        </div>
      ) : null}
      {siteSettings.maintenance_mode && !isAdmin ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(24,24,24,0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 520, textAlign: 'center', border: '1px solid var(--rq-accent-border, rgba(193,18,31,0.35))', background: 'var(--rq-bg-panel, #242424)', padding: 24, borderRadius: 'var(--rq-radius-md, 6px)', boxShadow: 'var(--rq-shadow-heavy, 0 10px 28px rgba(0,0,0,0.32))' }}>
            <h2 style={{ color: 'var(--rq-text-primary, #FFFFFF)', marginTop: 0 }}>We're performing maintenance</h2>
            <p style={{ color: 'var(--rq-text-secondary, #D6D6D6)' }}>Rookie Quest Keeper is temporarily unavailable while we deploy improvements. Please check back shortly.</p>
          </div>
        </div>
      ) : null}
      <BrowserRouter>
        <ThemeProvider>
          <ThemeRouter />
          <ImpersonationBanner />
          <KeyboardShortcutsProvider isAuthenticated={isAuthenticated}>
            <Suspense fallback={<RouteLoadingScreen />}>
              <Routes>
                <Route path="/login" element={isAuthenticated ? <Navigate to="/home" replace /> : <AuthPage onLogin={handleLogin} />} />
                <Route path="/auth" element={isAuthenticated ? <Navigate to="/home" replace /> : <AuthPage onLogin={handleLogin} />} />
                <Route path="/home" element={isAuthenticated ? <UnifiedDashboard username={username} onLogout={handleLogout} /> : <Navigate to="/auth" replace />} />
                <Route path="/player" element={isAuthenticated ? <PlayerDashboard /> : <Navigate to="/auth" replace />} />
                <Route path="/characters/new" element={isAuthenticated ? <CharacterCreationModePicker /> : <Navigate to="/auth" replace />} />
                <Route path="/characters/new/full" element={isAuthenticated ? <CharacterBuilder /> : <Navigate to="/auth" replace />} />
                <Route path="/homebrew" element={isAuthenticated ? <HomebrewWorkshop /> : <Navigate to="/auth" replace />} />
                <Route path="/characters/new/basic" element={isAuthenticated ? <BasicCharacterBuilder /> : <Navigate to="/auth" replace />} />
                <Route path="/characters/new/premade" element={isAuthenticated ? <PremadeCharacterBuilder /> : <Navigate to="/auth" replace />} />
                <Route path="/characters/new/kids" element={isAuthenticated ? <KidsCharacterBuilder /> : <Navigate to="/auth" replace />} />
                <Route path="/characters/:characterId" element={isAuthenticated ? <ResponsiveCharacterSheetRoute /> : <Navigate to="/auth" replace />} />
                <Route path="/characters/:characterId/edit" element={isAuthenticated ? <CharacterBuilder editMode={true} /> : <Navigate to="/auth" replace />} />
                <Route path="/campaign/:campaignId" element={isAuthenticated ? <CampaignAccessRoute username={username} onLogout={handleLogout} /> : <Navigate to="/auth" replace />} />
                <Route path="/gm-screen/:campaignId" element={isAuthenticated ? <LivePlayModeRoute /> : <Navigate to="/auth" replace />} />
                <Route path="/gm-screen/:campaignId/live-grid" element={isAuthenticated ? <LivePlayModeRoute /> : <Navigate to="/auth" replace />} />
                <Route path="/campaign/:campaignId/combat" element={isAuthenticated ? <CombatPage /> : <Navigate to="/auth" replace />} />
                <Route path="/admin" element={isAuthenticated ? (isAdmin ? <AdminPage username={username} /> : <Navigate to="/home" replace />) : <Navigate to="/auth" replace />} />
                <Route path="/account" element={isAuthenticated ? <AccountSettings username={username} onLogout={handleLogout} onUsernameChange={setUsername} /> : <Navigate to="/auth" replace />} />
                <Route path="/reset-password" element={<AuthPage onLogin={handleLogin} />} />
                <Route path="/" element={isAuthenticated ? <Navigate to="/home" replace /> : <LandingPage />} />
              </Routes>
            </Suspense>
            <GlobalFeedbackButton isAuthenticated={isAuthenticated} />
          </KeyboardShortcutsProvider>
        </ThemeProvider>
      </BrowserRouter>
      <Toaster position="top-right" richColors theme="dark" />
    </div>
  );
}

export default App;