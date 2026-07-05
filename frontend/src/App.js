import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import '@/App.css';
// Style layering: base app/design styles first, route-specific legacy themes next,
// board/layout safety layers after that, then the current Twilight Keeper brand layer last.
import '@/styles/brandedLoading.css';
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
import '@/data/applyTestBackgrounds';
import '@/data/sanitizeCharacterBuilderDraft';
import { installRollBurstPersistence } from '@/utils/persistRollBurst';
import { Toaster } from '@/components/ui/sonner';
import RouteLoadingScreen from '@/components/RouteLoadingScreen';
import AppShell from '@/components/app/AppShell';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import ImpersonationBanner from '@/components/admin/ImpersonationBanner';
import GlobalFeedbackButton from '@/components/GlobalFeedbackButton';
import GlobalActionFillEffects from '@/components/ui/GlobalActionFillEffects';
import GlobalScrollRecovery from '@/components/ui/GlobalScrollRecovery';
import { ThemeProvider, useTheme, THEMES } from '@/contexts/ThemeContext';
import apiClient from '@/lib/apiClient';
import { AUTH_USERNAME_KEY, getAuthToken, setAuthToken } from '@/lib/auth';

const AuthPage = React.lazy(() => import('@/components/AuthPage'));
const UnifiedDashboard = React.lazy(() => import('@/components/UnifiedDashboard'));
const MyCharactersPage = React.lazy(() => import('@/components/MyCharactersPage'));
const MyCampaignsPage = React.lazy(() => import('@/components/MyCampaignsPage'));
const CampaignDashboard = React.lazy(() => import('@/components/CampaignDashboard'));
const LiveSessionGridPage = React.lazy(() => import('@/components/gm/LiveSessionGridPage'));
const PlayerDisplayPage = React.lazy(() => import('@/components/gm/PlayerDisplayPage'));
const PrototypeHub = React.lazy(() => import('@/components/prototype/PrototypeHub'));
const PrototypeMobileLab = React.lazy(() => import('@/components/prototype/PrototypeMobileLab'));
const TiaKartaGmPrototype = React.lazy(() => import('@/components/prototype/TiaKartaGmPrototype'));
const ClassProgressionLab = React.lazy(() => import('@/components/prototype/ClassProgressionLab'));
const MobilePlayerCampaignView = React.lazy(() => import('@/components/MobilePlayerCampaignView'));
const CombatPage = React.lazy(() => import('@/components/CombatPage'));
const AdminPage = React.lazy(() => import('@/components/AdminPage'));
const LandingPage = React.lazy(() => import('@/components/LandingPage'));
const AccountSettings = React.lazy(() => import('@/components/AccountSettings'));
const HomebrewWorkshop = React.lazy(() => import('@/components/HomebrewWorkshop'));
const UploadsDashboard = React.lazy(() => import('@/components/UploadsDashboard'));
const CharacterCreationModePicker = React.lazy(() => import('@/components/CharacterCreationModePicker'));
// V3 has a known preview AC runtime crash. Keep the full creator usable while V3 is patched safely.
const FullCharacterCreatorV3 = React.lazy(() => import('@/components/FullCharacterCreatorV2'));
const BasicCharacterCreator = React.lazy(() => import('@/components/BasicCharacterCreator'));
const RookCharacterMatchmaker = React.lazy(() => import('@/components/RookCharacterMatchmaker'));
const CleanCharacterSheet = React.lazy(() => import('@/components/CleanCharacterSheet'));

const ENABLE_PROTOTYPE_ROUTES = process.env.REACT_APP_ENABLE_PROTOTYPE_ROUTES === 'true';

function PrototypeRoute({ children }) {
  // Prototype/lab routes are intentionally hidden from normal users unless enabled for dev/admin review.
  return ENABLE_PROTOTYPE_ROUTES ? children : <Navigate to="/home" replace />;
}

function ThemeRouter() {
  const location = useLocation();
  const { setTheme } = useTheme();

  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path.startsWith('/auth')) {
      setTheme(THEMES.LANDING);
    } else if (path.startsWith('/gm-screen') || path.includes('/live') || path.includes('/player-display') || path.startsWith('/prototype-gm')) {
      setTheme(THEMES.GM);
    } else if (path.startsWith('/characters') || path.startsWith('/player') || path.startsWith('/campaign') || path.startsWith('/mobile') || path.startsWith('/uploads') || path.startsWith('/prototype-mobile') || path.startsWith('/prototype-progressions')) {
      setTheme(THEMES.PLAYER);
    } else {
      setTheme(THEMES.PLAYER);
    }
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
    apiClient.get('/auth/me').catch(() => {
      handleLogout();
    });
  }, [isAuthenticated, handleLogout]);

  const appContent = (
    <>
      <ImpersonationBanner />
      <ThemeRouter />
      <GlobalScrollRecovery />
      <GlobalFeedbackButton />
      <GlobalActionFillEffects />
      <Suspense fallback={<RouteLoadingScreen />}>
        <Routes>
          <Route path="/" element={<LandingPage onEnter={() => isAuthenticated ? null : null} />} />
          <Route path="/auth" element={isAuthenticated ? <Navigate to="/home" replace /> : <AuthPage onLogin={handleAuthLogin} />} />
          <Route path="/home" element={isAuthenticated ? <AppShell username={username} onLogout={handleLogout}><UnifiedDashboard /></AppShell> : <Navigate to="/auth" replace />} />
          <Route path="/characters" element={isAuthenticated ? <AppShell username={username} onLogout={handleLogout}><MyCharactersPage /></AppShell> : <Navigate to="/auth" replace />} />
          <Route path="/characters/new" element={isAuthenticated ? <AppShell username={username} onLogout={handleLogout}><CharacterCreationModePicker /></AppShell> : <Navigate to="/auth" replace />} />
          <Route path="/characters/new/basic" element={isAuthenticated ? <AppShell username={username} onLogout={handleLogout}><BasicCharacterCreator /></AppShell> : <Navigate to="/auth" replace />} />
          <Route path="/characters/new/full" element={isAuthenticated ? <AppShell username={username} onLogout={handleLogout}><FullCharacterCreatorV3 /></AppShell> : <Navigate to="/auth" replace />} />
          <Route path="/characters/new/matchmaker" element={isAuthenticated ? <AppShell username={username} onLogout={handleLogout}><RookCharacterMatchmaker /></AppShell> : <Navigate to="/auth" replace />} />
          <Route path="/characters/:characterId" element={isAuthenticated ? <CleanCharacterSheet /> : <Navigate to="/auth" replace />} />
          <Route path="/characters/:characterId/edit" element={isAuthenticated ? <AppShell username={username} onLogout={handleLogout}><FullCharacterCreatorV3 editMode /></AppShell> : <Navigate to="/auth" replace />} />
          <Route path="/campaigns" element={isAuthenticated ? <AppShell username={username} onLogout={handleLogout}><MyCampaignsPage /></AppShell> : <Navigate to="/auth" replace />} />
          <Route path="/campaigns/:campaignId" element={isAuthenticated ? <AppShell username={username} onLogout={handleLogout}><CampaignDashboard /></AppShell> : <Navigate to="/auth" replace />} />
          <Route path="/campaigns/:campaignId/live" element={isAuthenticated ? <LiveSessionGridPage /> : <Navigate to="/auth" replace />} />
          <Route path="/gm-screen" element={isAuthenticated ? <LiveSessionGridPage /> : <Navigate to="/auth" replace />} />
          <Route path="/player-display/:campaignId" element={<PlayerDisplayPage />} />
          <Route path="/combat" element={isAuthenticated ? <AppShell username={username} onLogout={handleLogout}><CombatPage /></AppShell> : <Navigate to="/auth" replace />} />
          <Route path="/admin" element={isAuthenticated ? <AppShell username={username} onLogout={handleLogout}><AdminPage /></AppShell> : <Navigate to="/auth" replace />} />
          <Route path="/settings" element={isAuthenticated ? <AppShell username={username} onLogout={handleLogout}><AccountSettings /></AppShell> : <Navigate to="/auth" replace />} />
          <Route path="/homebrew" element={isAuthenticated ? <AppShell username={username} onLogout={handleLogout}><HomebrewWorkshop /></AppShell> : <Navigate to="/auth" replace />} />
          <Route path="/uploads" element={isAuthenticated ? <AppShell username={username} onLogout={handleLogout}><UploadsDashboard /></AppShell> : <Navigate to="/auth" replace />} />
          <Route path="/mobile" element={isAuthenticated ? <MobilePlayerCampaignView /> : <Navigate to="/auth" replace />} />
          <Route path="/prototype" element={<PrototypeRoute><PrototypeHub /></PrototypeRoute>} />
          <Route path="/prototype-mobile" element={<PrototypeRoute><PrototypeMobileLab /></PrototypeRoute>} />
          <Route path="/prototype-gm" element={<PrototypeRoute><TiaKartaGmPrototype /></PrototypeRoute>} />
          <Route path="/prototype-progressions" element={<PrototypeRoute><ClassProgressionLab /></PrototypeRoute>} />
          <Route path="*" element={<Navigate to={isAuthenticated ? '/home' : '/auth'} replace />} />
        </Routes>
      </Suspense>
      <Toaster richColors position="top-right" />
    </>
  );

  return appContent;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppErrorBoundary>
          <AppRoutes />
        </AppErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  );
}
