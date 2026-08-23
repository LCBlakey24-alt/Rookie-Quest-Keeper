import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import '@/App.css';

// App.js owns routing and app-wide foundations only. The ordered feature style
// stack is transitional: it preserves the existing cascade until each route
// family moves into its isolated desktop/tablet/mobile presentation layer.
import '@/styles/designSystem.css';
import '@/styles/featurePresentationStack.css';
import '@/data/applyTestBackgrounds';
import '@/data/sanitizeCharacterBuilderDraft';
import { installRollBurstPersistence } from '@/utils/persistRollBurst';
import { Toaster } from '@/components/ui/sonner';
import RouteLoadingScreen from '@/components/RouteLoadingScreen';
import AppShell from '@/components/app/AppShell';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import ImpersonationBanner from '@/components/admin/ImpersonationBanner';
import FloatingDiceRoller from '@/components/FloatingDiceRoller';
import GlobalFeedbackButton from '@/components/GlobalFeedbackButton';
import RookGlobalAssistant from '@/components/RookGlobalAssistant';
import GlobalActionFillEffects from '@/components/ui/GlobalActionFillEffects';
import GlobalScrollRecovery from '@/components/ui/GlobalScrollRecovery';
import { ThemeProvider, useTheme, THEMES } from '@/contexts/ThemeContext';
import apiClient from '@/lib/apiClient';
import { AUTH_USERNAME_KEY, getAuthToken, setAuthToken } from '@/lib/auth';

const CHUNK_RELOAD_KEY = 'rqk.chunk-reload-attempted';

function isChunkLoadError(error) {
  const message = String(error?.message || error || '');
  return /Loading chunk \d+ failed|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed/i.test(message);
}

function lazyWithChunkRetry(importer) {
  return React.lazy(async () => {
    try {
      const mod = await importer();
      try { sessionStorage.removeItem(CHUNK_RELOAD_KEY); } catch {}
      return mod;
    } catch (error) {
      if (isChunkLoadError(error)) {
        try {
          const alreadyTried = sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
          if (!alreadyTried) {
            sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
            window.location.reload();
          }
        } catch {}
      }
      throw error;
    }
  });
}

const AuthPage = lazyWithChunkRetry(() => import('@/components/AuthPage'));
const UnifiedDashboard = lazyWithChunkRetry(() => import('@/components/UnifiedDashboard'));
const MyCharactersPage = lazyWithChunkRetry(() => import('@/components/MyCharactersPage'));
const MyCampaignsPage = lazyWithChunkRetry(() => import('@/components/MyCampaignsPage'));
const PlayerDashboard = lazyWithChunkRetry(() => import('@/components/PlayerDashboard'));
const CampaignDashboard = lazyWithChunkRetry(() => import('@/components/CampaignDashboard'));
const LiveSessionGridPage = lazyWithChunkRetry(() => import('@/components/gm/LiveSessionGridPage'));
const PlayerDisplayPage = lazyWithChunkRetry(() => import('@/components/gm/PlayerDisplayPage'));
const SecondScreenRemotePage = lazyWithChunkRetry(() => import('@/components/gm/SecondScreenRemotePage'));
const MobilePlayerCampaignView = lazyWithChunkRetry(() => import('@/components/MobilePlayerCampaignView'));
const CombatPage = lazyWithChunkRetry(() => import('@/components/CombatPage'));
const AdminPage = lazyWithChunkRetry(() => import('@/components/AdminPage'));
const LandingPage = lazyWithChunkRetry(() => import('@/components/LandingPage'));
const AccountSettings = lazyWithChunkRetry(() => import('@/components/AccountSettings'));
const HomebrewWorkshop = lazyWithChunkRetry(() => import('@/components/HomebrewWorkshop'));
const UploadsDashboard = lazyWithChunkRetry(() => import('@/components/UploadsDashboard'));
const CharacterImportPage = lazyWithChunkRetry(() => import('@/components/CharacterImportPage'));
const CharacterCreator = lazyWithChunkRetry(() => import('@/components/CharacterRulesBridgeV2'));
const CleanCharacterSheet = lazyWithChunkRetry(() => import('@/components/CleanCharacterSheet'));

function CampaignLiveRedirect() {
  const { campaignId } = useParams();
  return <Navigate to={`/gm-screen/${campaignId}`} replace />;
}

function CombatStateRedirect() {
  const location = useLocation();
  const campaignId = location.state?.campaignId;
  if (!campaignId) return <Navigate to="/home" replace />;
  if (location.state?.source === 'live-play') {
    try { localStorage.setItem(`gm.returnToLive.${campaignId}`, '1'); } catch {}
  }
  return <Navigate to={`/combat/${campaignId}`} state={location.state} replace />;
}

function CampaignDashboardRoute() {
  const { campaignId } = useParams();
  let returnToLive = false;
  try {
    returnToLive = localStorage.getItem(`gm.returnToLive.${campaignId}`) === '1';
    if (returnToLive) localStorage.removeItem(`gm.returnToLive.${campaignId}`);
  } catch {}
  if (returnToLive) return <Navigate to={`/gm-screen/${campaignId}`} replace />;
  return <AppShell><CampaignDashboard /></AppShell>;
}

function ThemeRouter() {
  const location = useLocation();
  const { setTheme } = useTheme();

  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path.startsWith('/auth')) setTheme(THEMES.LANDING);
    else if (path.startsWith('/gm-screen') || path.startsWith('/gm-second-screen') || path.startsWith('/combat') || path.includes('/live') || path.includes('/player-display')) setTheme(THEMES.GM);
    else setTheme(THEMES.PLAYER);
  }, [location.pathname, setTheme]);

  return null;
}

function AppRoutes() {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAuthToken()));
  const [username, setUsername] = useState(() => localStorage.getItem(AUTH_USERNAME_KEY) || '');

  const handleAuthLogin = useCallback((token, nextUsername) => {
    setAuthToken(token);
    setUsername(nextUsername || '');
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    setAuthToken('');
    setUsername('');
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiClient.get('/auth/me').catch(() => handleLogout());
  }, [isAuthenticated, handleLogout]);

  return (
    <>
      <ThemeRouter />
      <ImpersonationBanner />
      <GlobalActionFillEffects />
      <GlobalScrollRecovery />
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/home" replace /> : <LandingPage />} />
        <Route path="/auth" element={isAuthenticated ? <Navigate to="/home" replace /> : <AuthPage onLogin={handleAuthLogin} />} />
        <Route path="/home" element={isAuthenticated ? <AppShell><UnifiedDashboard username={username} onLogout={handleLogout} /></AppShell> : <Navigate to="/auth" replace />} />
        <Route path="/characters" element={isAuthenticated ? <AppShell><MyCharactersPage /></AppShell> : <Navigate to="/auth" replace />} />
        <Route path="/player" element={isAuthenticated ? <AppShell><PlayerDashboard /></AppShell> : <Navigate to="/auth" replace />} />
        <Route path="/campaigns" element={isAuthenticated ? <AppShell><MyCampaignsPage /></AppShell> : <Navigate to="/auth" replace />} />
        <Route path="/campaign/:campaignId" element={isAuthenticated ? <CampaignDashboardRoute /> : <Navigate to="/auth" replace />} />
        <Route path="/campaign/:campaignId/live" element={isAuthenticated ? <CampaignLiveRedirect /> : <Navigate to="/auth" replace />} />
        <Route path="/gm-screen/:campaignId" element={isAuthenticated ? <LiveSessionGridPage /> : <Navigate to="/auth" replace />} />
        <Route path="/gm-second-screen/:campaignId" element={isAuthenticated ? <SecondScreenRemotePage /> : <Navigate to="/auth" replace />} />
        <Route path="/player-display/:campaignId" element={isAuthenticated ? <PlayerDisplayPage /> : <Navigate to="/auth" replace />} />
        <Route path="/campaign/:campaignId/player-display" element={isAuthenticated ? <PlayerDisplayPage /> : <Navigate to="/auth" replace />} />
        <Route path="/mobile/:campaignId" element={isAuthenticated ? <MobilePlayerCampaignView /> : <Navigate to="/auth" replace />} />
        <Route path="/combat" element={isAuthenticated ? <CombatStateRedirect /> : <Navigate to="/auth" replace />} />
        <Route path="/combat/:campaignId" element={isAuthenticated ? <CombatPage /> : <Navigate to="/auth" replace />} />
        <Route path="/admin" element={isAuthenticated ? <AppShell><AdminPage /></AppShell> : <Navigate to="/auth" replace />} />
        <Route path="/account" element={isAuthenticated ? <AppShell><AccountSettings username={username} onLogout={handleLogout} /></AppShell> : <Navigate to="/auth" replace />} />
        <Route path="/homebrew" element={isAuthenticated ? <AppShell><HomebrewWorkshop /></AppShell> : <Navigate to="/auth" replace />} />
        <Route path="/uploads" element={isAuthenticated ? <AppShell><UploadsDashboard /></AppShell> : <Navigate to="/auth" replace />} />

        {/* One character creator. Legacy URLs remain redirects so old links and installed PWAs stay safe. */}
        <Route path="/characters/new" element={isAuthenticated ? <AppShell><CharacterCreator /></AppShell> : <Navigate to="/auth" replace />} />
        <Route path="/characters/new/full" element={<Navigate to="/characters/new" replace />} />
        <Route path="/characters/new/basic" element={<Navigate to="/characters/new" replace />} />
        <Route path="/characters/new/premade" element={<Navigate to="/characters/new" replace />} />
        <Route path="/characters/new/kids" element={<Navigate to="/characters/new" replace />} />
        <Route path="/characters/new/matchmaker" element={<Navigate to="/characters/new" replace />} />
        <Route path="/characters/new/rook" element={<Navigate to="/characters/new" replace />} />
        <Route path="/characters/create" element={<Navigate to="/characters/new" replace />} />
        <Route path="/characters/create/full" element={<Navigate to="/characters/new" replace />} />
        <Route path="/characters/create/basic" element={<Navigate to="/characters/new" replace />} />
        <Route path="/characters/create/premade" element={<Navigate to="/characters/new" replace />} />
        <Route path="/characters/create/kids" element={<Navigate to="/characters/new" replace />} />
        <Route path="/characters/create/rook" element={<Navigate to="/characters/new" replace />} />

        <Route path="/characters/import" element={isAuthenticated ? <AppShell><CharacterImportPage /></AppShell> : <Navigate to="/auth" replace />} />
        <Route path="/characters/:characterId/edit" element={isAuthenticated ? <AppShell><CharacterCreator editMode /></AppShell> : <Navigate to="/auth" replace />} />
        <Route path="/characters/:characterId" element={isAuthenticated ? <CleanCharacterSheet /> : <Navigate to="/auth" replace />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? '/home' : '/'} replace />} />
      </Routes>
      {isAuthenticated && <RookGlobalAssistant />}
      {isAuthenticated && <FloatingDiceRoller />}
      {isAuthenticated && <GlobalFeedbackButton isAuthenticated={isAuthenticated} />}
    </>
  );
}

export default function App() {
  useEffect(() => installRollBurstPersistence(), []);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppErrorBoundary>
          <Suspense fallback={<RouteLoadingScreen />}>
            <AppRoutes />
          </Suspense>
          <Toaster richColors position="top-center" />
        </AppErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  );
}
