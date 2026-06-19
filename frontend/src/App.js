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
import '@/data/applyOriginData';
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
const PlayerMobileRailSheet = React.lazy(() => import('@/components/PlayerMobileRailSheet'));

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
    if (path.startsWith('/admin')) {
      setTheme(THEMES.ADMIN);
    } else {
      setTheme(THEMES.DEFAULT);
    }
  }, [location.pathname, setTheme]);

  return null;
}

function ResponsiveCharacterSheetRoute() {
  const { characterId } = useParams();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (isMobile) {
    return <PlayerMobileRailSheet characterId={characterId} />;
  }

  return <CleanCharacterSheet characterId={characterId} />;
}

function LivePlayModeRoute() {
  return <LiveSessionGridPage />;
}

function CampaignAccessRoute({ username, onLogout }) {
  const { campaignId } = useParams();
  const { setTheme } = useTheme();
  const [accessMode, setAccessMode] = useState('checking');

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      try {
        const response = await apiClient.get(`/campaigns/${campaignId}/access`);
        if (cancelled) return;
        const mode = response.data?.mode;
        const theme = response.data?.theme;
        if (theme === 'gm') setTheme(THEMES.GM);
        else if (theme === 'player') setTheme(THEMES.PLAYER);
        else setTheme(THEMES.DEFAULT);
        setAccessMode(mode === 'gm' ? 'gm' : 'player');
      } catch (error) {
        if (cancelled) return;
        console.error('Campaign access check failed:', error);
        setTheme(THEMES.DEFAULT);
        setAccessMode('player');
      }
    };

    checkAccess();
    return () => { cancelled = true; };
  }, [campaignId, setTheme]);

  if (accessMode === 'checking') return <RouteLoadingScreen />;

  if (accessMode === 'gm') {
    return <CampaignDashboard username={username} onLogout={onLogout} />;
  }

  return <MobilePlayerCampaignView />;
}

function KeyboardShortcutsProvider({ children, isAuthenticated }) {
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  const shortcuts = useKeyboardShortcuts({
    enabled: isAuthenticated,
    shortcuts: [
      {
        key: '?',
        description: 'Show keyboard shortcuts',
        action: () => setShowKeyboardShortcuts(true),
      },
      {
        key: 'h',
        ctrlKey: true,
        description: 'Go to home',
        action: () => window.location.href = '/home',
      },
      {
        key: 'n',
        ctrlKey: true,
        description: 'New character',
        action: () => window.location.href = '/characters/new',
      },
      {
        key: 'b',
        ctrlKey: true,
        description: 'Homebrew workshop',
        action: () => window.location.href = '/homebrew',
      },
    ],
  });

  return (
    <>
      {children}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
        shortcuts={shortcuts}
      />
    </>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [siteSettings, setSiteSettings] = useState({
    maintenance_mode: false,
    announcement_enabled: false,
    announcement_text: '',
  });

  const checkAuth = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setIsAuthenticated(false);
      setUsername('');
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.get('/auth/me');
      setIsAuthenticated(true);
      setUsername(response.data.username);
      setIsAdmin(response.data.is_admin || false);
    } catch (error) {
      console.error('Auth check failed:', error);
      clearAuthToken();
      localStorage.removeItem(AUTH_USERNAME_KEY);
      setIsAuthenticated(false);
      setUsername('');
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    installRollBurstPersistence();
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const loadSiteSettings = async () => {
      try {
        const response = await apiClient.get('/public/site-settings');
        setSiteSettings(response.data || {});
      } catch (error) {
        console.warn('Could not load site settings:', error);
      }
    };
    loadSiteSettings();
  }, []);

  const handleLogin = (token, user) => {
    setAuthToken(token);
    localStorage.setItem(AUTH_USERNAME_KEY, user.username);
    setIsAuthenticated(true);
    setUsername(user.username);
    setIsAdmin(user.is_admin || false);
    toast.success(`Welcome back, ${user.username}!`);
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
    <BrowserRouter>
      <ThemeProvider>
        <ThemeRouter />
        <ImpersonationBanner />
        {showAnnouncement && (
          <div className="site-announcement">
            {siteSettings.announcement_text}
          </div>
        )}
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
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
