import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import '@/App.css';
// Style layering: base app/design styles first, route-specific legacy theme bridges next,
// board/layout safety layers after that, then the current Sunset Gradient guardrails last.
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
import '@/styles/cleanSheetRecovery.css';
import '@/styles/cleanInventoryTab.css';
import '@/styles/cleanSpellsTab.css';
import '@/styles/cleanNotesTab.css';
import '@/styles/levelUpCleanStyle.css';
import '@/styles/siteVelvetTheme.css';
import '@/styles/blueEclipseTheme.css';
import '@/styles/gmBlueEclipseTheme.css';
import '@/styles/landingSafeFix.css';
import '@/styles/simpleTheme.css';
import '@/styles/landingFinal.css';
import '@/styles/actionFillAnimations.css';
import '@/styles/scrollFixes.css';
import '@/styles/rqkUnifiedTheme.css';
import '@/styles/rqkBoardSystem.css';
import '@/styles/appBoardOverrides.css';
import '@/styles/appUtilityPagesPolish.css';
import '@/styles/mobileAppBoxGrid.css';
import '@/styles/twilightKeeperTheme.css';
import '@/styles/twilightKeeperPolish.css';
import '@/styles/twilightKeeperScreens.css';
import '@/styles/twilightKeeperAppPages.css';
import '@/styles/homeHubFinalPolish.css';
import '@/styles/homeHubSurfacePolish.css';
import '@/styles/twilightKeeperCharacterSheet.css';
import '@/styles/twilightKeeperCreator.css';
import '@/styles/sunsetRebrandFixes.css';
import '@/styles/twilightKeeperBoxLanguage.css';
import '@/styles/sunsetMobileTightening.css';
import '@/styles/utilityPagesFinalFixes.css';
import '@/styles/sunsetButtonFinalOverride.css';
import '@/styles/sunsetScrollbar.css';
import '@/styles/fullCreatorReadiness.css';
import '@/styles/characterSheetSunsetFinalOverride.css';
import '@/styles/characterSheetRailAndHeroFix.css';
import '@/styles/characterSheetColumnAlignmentFix.css';
import '@/styles/characterSheetHeroBadgeFix.css';
import '@/styles/characterSheetSpellUnavailableState.css';
import '@/styles/characterSheetPlayHeaderCompact.css';
import '@/styles/characterSheetUnifiedMobileHeader.css';
import '@/styles/characterSheetSavingThrowsCompact.css';
import '@/styles/characterSheetSkillsCompact.css';
import '@/styles/characterSheetStatsFinalMobileTweaks.css';
import '@/styles/characterSheetStatsTabFinalPolish.css';
import '@/styles/brandedLoading.css';
import '@/styles/loadingExperiencePolish.css';
import '@/styles/authExperiencePolish.css';
import '@/styles/homeHubConsistencySweep.css';
import '@/styles/adminMissionControlHooks.css';
import '@/styles/rookAssistantPlaybook.css';
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
const CampaignDashboard = lazyWithChunkRetry(() => import('@/components/CampaignDashboard'));
const LiveSessionGridPage = lazyWithChunkRetry(() => import('@/components/gm/LiveSessionGridPage'));
const PlayerDisplayPage = lazyWithChunkRetry(() => import('@/components/gm/PlayerDisplayPage'));
const SecondScreenRemotePage = lazyWithChunkRetry(() => import('@/components/gm/SecondScreenRemotePage'));
const PrototypeHub = lazyWithChunkRetry(() => import('@/components/prototype/PrototypeHub'));
const PrototypeMobileLab = lazyWithChunkRetry(() => import('@/components/prototype/PrototypeMobileLab'));
const TiaKartaGmPrototype = lazyWithChunkRetry(() => import('@/components/prototype/TiaKartaGmPrototype'));
const ClassProgressionLab = lazyWithChunkRetry(() => import('@/components/prototype/ClassProgressionLab'));
const MobilePlayerCampaignView = lazyWithChunkRetry(() => import('@/components/MobilePlayerCampaignView'));
const CombatPage = lazyWithChunkRetry(() => import('@/components/CombatPage'));
const AdminPage = lazyWithChunkRetry(() => import('@/components/AdminPage'));
const LandingPage = lazyWithChunkRetry(() => import('@/components/LandingPage'));
const AccountSettings = lazyWithChunkRetry(() => import('@/components/AccountSettings'));
const HomebrewWorkshop = lazyWithChunkRetry(() => import('@/components/HomebrewWorkshop'));
const UploadsDashboard = lazyWithChunkRetry(() => import('@/components/UploadsDashboard'));
const CharacterImportPage = lazyWithChunkRetry(() => import('@/components/CharacterImportPage'));
const FullCharacterCreatorV3 = lazyWithChunkRetry(() => import('@/components/CharacterRulesBridge'));
const CleanCharacterSheet = lazyWithChunkRetry(() => import('@/components/CleanCharacterSheet'));

const ENABLE_PROTOTYPE_ROUTES = process.env.REACT_APP_ENABLE_PROTOTYPE_ROUTES === 'true';

function PrototypeRoute({ children }) {
  return ENABLE_PROTOTYPE_ROUTES ? children : <Navigate to="/home" replace />;
}

function CampaignLiveRedirect() {
  const { campaignId } = useParams();
  return <Navigate to={`/gm-screen/${campaignId}`} replace />;
}

function ThemeRouter() {
  const location = useLocation();
  const { setTheme } = useTheme();

  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path.startsWith('/auth')) setTheme(THEMES.LANDING);
    else if (path.startsWith('/gm-screen') || path.startsWith('/gm-second-screen') || path.includes('/live') || path.includes('/player-display') || path.startsWith('/prototype-gm')) setTheme(THEMES.GM);
    else if (path.startsWith('/characters') || path.startsWith('/player') || path.startsWith('/campaign') || path.startsWith('/mobile') || path.startsWith('/uploads') || path.startsWith('/prototype-mobile') || path.startsWith('/prototype-progressions')) setTheme(THEMES.PLAYER);
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
        <Route path="/campaign/:campaignId" element={isAuthenticated ? <AppShell><CampaignDashboard /></AppShell> : <Navigate to="/auth" replace />} />
        <Route path="/campaign/:campaignId/live" element={isAuthenticated ? <CampaignLiveRedirect /> : <Navigate to="/auth" replace />} />
        <Route path="/gm-screen/:campaignId" element={isAuthenticated ? <LiveSessionGridPage /> : <Navigate to="/auth" replace />} />
        <Route path="/gm-second-screen/:campaignId" element={isAuthenticated ? <SecondScreenRemotePage /> : <Navigate to="/auth" replace />} />
        <Route path="/player-display/:campaignId" element={isAuthenticated ? <PlayerDisplayPage /> : <Navigate to="/auth" replace />} />
        <Route path="/campaign/:campaignId/player-display" element={isAuthenticated ? <PlayerDisplayPage /> : <Navigate to="/auth" replace />} />
        <Route path="/prototype" element={<PrototypeRoute><PrototypeHub /></PrototypeRoute>} />
        <Route path="/prototype-mobile" element={<PrototypeRoute><PrototypeMobileLab /></PrototypeRoute>} />
        <Route path="/prototype-gm" element={<PrototypeRoute><TiaKartaGmPrototype /></PrototypeRoute>} />
        <Route path="/prototype-progressions" element={<PrototypeRoute><ClassProgressionLab /></PrototypeRoute>} />
        <Route path="/mobile/:campaignId" element={isAuthenticated ? <MobilePlayerCampaignView /> : <Navigate to="/auth" replace />} />
        <Route path="/combat" element={isAuthenticated ? <CombatPage /> : <Navigate to="/auth" replace />} />
        <Route path="/admin" element={isAuthenticated ? <AppShell><AdminPage /></AppShell> : <Navigate to="/auth" replace />} />
        <Route path="/account" element={isAuthenticated ? <AppShell><AccountSettings username={username} onLogout={handleLogout} /></AppShell> : <Navigate to="/auth" replace />} />
        <Route path="/homebrew" element={isAuthenticated ? <AppShell><HomebrewWorkshop /></AppShell> : <Navigate to="/auth" replace />} />
        <Route path="/uploads" element={isAuthenticated ? <AppShell><UploadsDashboard /></AppShell> : <Navigate to="/auth" replace />} />
        <Route path="/characters/create" element={<Navigate to="/characters/create/full" replace />} />
        <Route path="/characters/create/full" element={isAuthenticated ? <AppShell><FullCharacterCreatorV3 /></AppShell> : <Navigate to="/auth" replace />} />
        <Route path="/characters/create/basic" element={<Navigate to="/characters/create/full" replace />} />
        <Route path="/characters/create/rook" element={<Navigate to="/characters/create/full" replace />} />
        <Route path="/characters/import" element={isAuthenticated ? <AppShell><CharacterImportPage /></AppShell> : <Navigate to="/auth" replace />} />
        <Route path="/characters/:characterId/edit" element={isAuthenticated ? <AppShell><FullCharacterCreatorV3 editMode /></AppShell> : <Navigate to="/auth" replace />} />
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
