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
import SignInRedirect, { PostSignInRedirect } from '@/components/auth/SignInRedirect';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import ImpersonationBanner from '@/components/admin/ImpersonationBanner';
import GlobalActionFillEffects from '@/components/ui/GlobalActionFillEffects';
import GlobalScrollRecovery from '@/components/ui/GlobalScrollRecovery';
import { ThemeProvider, useTheme, THEMES } from '@/contexts/ThemeContext';
import apiClient from '@/lib/apiClient';
import { AUTH_USERNAME_KEY, getAuthToken, setAuthToken } from '@/lib/auth';
import { isLocalPreview, PREVIEW_USER } from '@/preview/previewMode';

const CHUNK_RELOAD_KEY = 'rqk.chunk-reload-attempted';
const PUBLIC_BRAND_PATHS = new Set(['/', '/keeper', '/forge', '/worlds', '/game']);

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
const PlayerCampaignPage = lazyWithChunkRetry(() => import('@/components/player/PlayerCampaignPage'));
const CombatPage = lazyWithChunkRetry(() => import('@/components/CombatPage'));
const AdminPage = lazyWithChunkRetry(() => import('@/components/AdminPage'));
const BrandHubPage = lazyWithChunkRetry(() => import('@/components/BrandHubPage'));
const BrandProductPage = lazyWithChunkRetry(() => import('@/components/BrandProductPage'));
const LandingPage = lazyWithChunkRetry(() => import('@/components/LandingPage'));
const AccountSettings = lazyWithChunkRetry(() => import('@/routes/AccountSettingsRoute'));
const HomebrewWorkshop = lazyWithChunkRetry(() => import('@/routes/HomebrewWorkshopRoute'));
const UploadsDashboard = lazyWithChunkRetry(() => import('@/components/UploadsDashboard'));
const CharacterImportPage = lazyWithChunkRetry(() => import('@/components/CharacterImportPage'));
const CharacterCreator = lazyWithChunkRetry(() => import('@/components/CharacterRulesBridgeV2'));
const CharacterProfileEditor = lazyWithChunkRetry(() => import('@/components/CharacterProfileEditor'));
const CleanCharacterSheet = lazyWithChunkRetry(() => import('@/components/CleanCharacterSheet'));

// These tools are only visible after sign-in. Keeping them out of the shared
// startup bundle lets public/auth routes and the main workspace become usable
// before optional floating utilities are downloaded.
const RookGlobalAssistant = lazyWithChunkRetry(() => import('@/components/RookGlobalAssistant'));
const FloatingDiceRoller = lazyWithChunkRetry(() => import('@/components/FloatingDiceRoller'));
const GlobalFeedbackButton = lazyWithChunkRetry(() => import('@/components/GlobalFeedbackButton'));

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
    if (PUBLIC_BRAND_PATHS.has(path) || path.startsWith('/auth')) setTheme(THEMES.LANDING);
    else if (path.startsWith('/gm-screen') || path.startsWith('/gm-second-screen') || path.startsWith('/combat') || path.includes('/live') || path.includes('/player-display')) setTheme(THEMES.GM);
    else setTheme(THEMES.PLAYER);
  }, [location.pathname, setTheme]);

  return null;
}

export function AppRoutes() {
  const preview = isLocalPreview();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAuthToken()));
  const [username, setUsername] = useState(() => preview ? PREVIEW_USER : localStorage.getItem(AUTH_USERNAME_KEY) || '');
  const isPublicBrandRoute = PUBLIC_BRAND_PATHS.has(location.pathname) || location.pathname.startsWith('/auth');

  const handleAuthLogin = useCallback((token, nextUsername) => {
    if (!preview) localStorage.setItem(AUTH_USERNAME_KEY, nextUsername || '');
    setAuthToken(token);
    setUsername(nextUsername || '');
    setIsAuthenticated(true);
  }, [preview]);

  const handleLogout = useCallback(() => {
    if (isLocalPreview()) { window.location.assign('/home'); return; }
    setAuthToken('');
    setUsername('');
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    if (preview) return undefined;
    const syncSession = () => {
      setIsAuthenticated(Boolean(getAuthToken()));
      setUsername(localStorage.getItem(AUTH_USERNAME_KEY) || '');
    };
    window.addEventListener('rqk:auth-scope-changed', syncSession);
    window.addEventListener('storage', syncSession);
    return () => {
      window.removeEventListener('rqk:auth-scope-changed', syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, [preview]);

  useEffect(() => {
    if (!isAuthenticated || preview) return;
    let active = true;
    const checkedToken = getAuthToken();
    apiClient.get('/auth/me').catch((error) => {
      // A sleeping/unavailable backend is not evidence of an expired session.
      // Ignore a late failure from an account that has since signed out/switched.
      if (active && error?.response?.status === 401 && getAuthToken() === checkedToken) handleLogout();
    });
    return () => { active = false; };
  }, [isAuthenticated, handleLogout, preview]);

  return (
    <>
      <ThemeRouter />
      {!preview && <ImpersonationBanner />}
      <GlobalActionFillEffects />
      <GlobalScrollRecovery />
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/home" replace /> : <BrandHubPage />} />
        <Route path="/keeper" element={isAuthenticated ? <Navigate to="/home" replace /> : <LandingPage />} />
        <Route path="/forge" element={<BrandProductPage product="forge" />} />
        <Route path="/worlds" element={<BrandProductPage product="worlds" />} />
        <Route path="/game" element={<BrandProductPage product="game" />} />
        <Route path="/auth" element={isAuthenticated ? <PostSignInRedirect /> : <AuthPage onLogin={handleAuthLogin} />} />
        <Route path="/home" element={isAuthenticated ? <AppShell><UnifiedDashboard username={username} onLogout={preview ? undefined : handleLogout} /></AppShell> : <SignInRedirect />} />
        <Route path="/characters" element={isAuthenticated ? <AppShell><MyCharactersPage /></AppShell> : <SignInRedirect />} />
        <Route path="/player" element={isAuthenticated ? <AppShell><PlayerDashboard /></AppShell> : <SignInRedirect />} />
        <Route path="/campaigns" element={isAuthenticated ? <AppShell><MyCampaignsPage /></AppShell> : <SignInRedirect />} />
        <Route path="/campaign/:campaignId" element={isAuthenticated ? <CampaignDashboardRoute /> : <SignInRedirect />} />
        <Route path="/campaign/:campaignId/live" element={isAuthenticated ? <CampaignLiveRedirect /> : <SignInRedirect />} />
        <Route path="/gm-screen/:campaignId" element={isAuthenticated ? <LiveSessionGridPage /> : <SignInRedirect />} />
        <Route path="/gm-second-screen/:campaignId" element={isAuthenticated ? <SecondScreenRemotePage /> : <SignInRedirect />} />
        <Route path="/player-display/:campaignId" element={isAuthenticated ? <PlayerDisplayPage /> : <SignInRedirect />} />
        <Route path="/campaign/:campaignId/player-display" element={isAuthenticated ? <PlayerDisplayPage /> : <SignInRedirect />} />
        <Route path="/player/campaign/:campaignId" element={isAuthenticated ? <AppShell><PlayerCampaignPage /></AppShell> : <SignInRedirect />} />
        <Route path="/mobile/:campaignId" element={isAuthenticated ? <AppShell><PlayerCampaignPage /></AppShell> : <SignInRedirect />} />
        <Route path="/combat" element={isAuthenticated ? <CombatStateRedirect /> : <SignInRedirect />} />
        <Route path="/combat/:campaignId" element={isAuthenticated ? <CombatPage /> : <SignInRedirect />} />
        <Route path="/admin" element={isAuthenticated ? <AppShell><AdminPage /></AppShell> : <SignInRedirect />} />
        <Route path="/account" element={isAuthenticated ? <AppShell><AccountSettings username={username} onLogout={handleLogout} /></AppShell> : <SignInRedirect />} />
        <Route path="/homebrew" element={isAuthenticated ? <AppShell><HomebrewWorkshop /></AppShell> : <SignInRedirect />} />
        <Route path="/uploads" element={isAuthenticated ? <AppShell><UploadsDashboard /></AppShell> : <SignInRedirect />} />

        {/* One character creator. Legacy URLs remain redirects so old links and installed PWAs stay safe. */}
        <Route path="/characters/new" element={isAuthenticated ? <AppShell><CharacterCreator /></AppShell> : <SignInRedirect />} />
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

        <Route path="/characters/import" element={isAuthenticated ? <AppShell><CharacterImportPage /></AppShell> : <SignInRedirect />} />
        <Route path="/characters/:characterId/edit" element={isAuthenticated ? <AppShell><CharacterProfileEditor /></AppShell> : <SignInRedirect />} />
        <Route path="/characters/:characterId" element={isAuthenticated ? <CleanCharacterSheet /> : <SignInRedirect />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? '/home' : '/'} replace />} />
      </Routes>
      {isAuthenticated && !isPublicBrandRoute && (
        <Suspense fallback={null}>
          <RookGlobalAssistant />
          <FloatingDiceRoller />
          <GlobalFeedbackButton isAuthenticated={isAuthenticated} />
        </Suspense>
      )}
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
