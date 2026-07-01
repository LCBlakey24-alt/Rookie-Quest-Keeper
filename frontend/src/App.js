import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import '@/App.css';
// Style layering: base app/design styles first, route-specific legacy themes next,
// and the current Rookie Quest grey/white/red board system last so logged-in
// player, character, and GM screens win over older gold/blue/purple themes.
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
import GlobalGuidedTour from '@/components/onboarding/GlobalGuidedTour';
import GlobalUpdatesPanel from '@/components/updates/GlobalUpdatesPanel';
import { ThemeProvider, useTheme, THEMES } from '@/contexts/ThemeContext';
import apiClient from '@/lib/apiClient';
import { AUTH_USERNAME_KEY, getAuthToken, setAuthToken } from '@/lib/auth';

const AuthPage = React.lazy(() => import('@/components/AuthPage'));
const UnifiedDashboard = React.lazy(() => import('@/components/UnifiedDashboard'));
const PlayerDashboard = React.lazy(() => import('@/components/PlayerDashboard'));
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
const FullCharacterCreatorV3 = React.lazy(() => import('@/components/FullCharacterCreatorV3'));
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
    if (nextUsername) {
      localStorage.setItem(AUTH_USERNAME_KEY, nextUsername);
      setUsername(nextUsername);
    }
    if (token) {
      apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    setIsAuthenticated(Boolean(token));
    setUsername(localStorage.getItem(AUTH_USERNAME_KEY) || '');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('dm_token');
    localStorage.removeItem(AUTH_USERNAME_KEY);
    delete apiClient.defaults.headers.common.Authorization;
    setIsAuthenticated(false);
    setUsername('');
    window.location.href = '/';
  };

  const protectedAppPage = (page) => (
    isAuthenticated ? <AppShell>{page}</AppShell> : <Navigate to="/auth" replace />
  );

  const protectedPlainPage = (page) => (
    isAuthenticated ? page : <Navigate to="/auth" replace />
  );

  return (
    <>
      <ThemeRouter />
      <GlobalActionFillEffects />
      <GlobalScrollRecovery />
      <ImpersonationBanner />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage onLogin={handleAuthLogin} />} />
        <Route path="/home" element={protectedAppPage(<UnifiedDashboard username={username} onLogout={handleLogout} />)} />
        <Route path="/player" element={isAuthenticated ? <Navigate to="/characters" replace /> : <Navigate to="/auth" replace />} />
        <Route path="/characters" element={protectedAppPage(<MyCharactersPage />)} />
        <Route path="/campaigns" element={protectedAppPage(<MyCampaignsPage />)} />
        <Route path="/campaign/:campaignId" element={protectedAppPage(<CampaignDashboard />)} />
        <Route path="/campaign/:campaignId/live" element={protectedPlainPage(<LiveSessionGridPage />)} />
        <Route path="/gm-screen/:campaignId" element={protectedPlainPage(<LiveSessionGridPage />)} />
        <Route path="/campaign/:campaignId/player-display" element={protectedPlainPage(<PlayerDisplayPage />)} />
        <Route path="/gm-screen/:campaignId/display" element={protectedPlainPage(<PlayerDisplayPage />)} />
        <Route path="/homebrew" element={protectedAppPage(<HomebrewWorkshop />)} />
        <Route path="/uploads" element={protectedAppPage(<UploadsDashboard />)} />
        <Route path="/prototype" element={<PrototypeRoute><PrototypeHub /></PrototypeRoute>} />
        <Route path="/prototype-mobile" element={<PrototypeRoute><PrototypeMobileLab /></PrototypeRoute>} />
        <Route path="/prototype-gm" element={<PrototypeRoute><TiaKartaGmPrototype /></PrototypeRoute>} />
        <Route path="/prototype-progressions" element={<PrototypeRoute><ClassProgressionLab /></PrototypeRoute>} />
        <Route path="/mobile" element={protectedAppPage(<MobilePlayerCampaignView />)} />
        <Route path="/mobile/:campaignId" element={protectedAppPage(<MobilePlayerCampaignView />)} />
        <Route path="/combat" element={protectedAppPage(<CombatPage />)} />
        <Route path="/admin" element={protectedAppPage(<AdminPage />)} />
        <Route path="/account" element={protectedAppPage(<AccountSettings />)} />
        <Route path="/characters/new" element={protectedAppPage(<CharacterCreationModePicker />)} />
        <Route path="/characters/new/modes" element={protectedAppPage(<CharacterCreationModePicker />)} />
        <Route path="/characters/new/full" element={protectedAppPage(<FullCharacterCreatorV3 />)} />
        <Route path="/characters/new/matchmaker" element={protectedAppPage(<RookCharacterMatchmaker />)} />
        <Route path="/characters/new/basic" element={protectedAppPage(<BasicCharacterCreator />)} />
        <Route path="/characters/new/premade" element={isAuthenticated ? <Navigate to="/characters/new/matchmaker" replace /> : <Navigate to="/auth" replace />} />
        <Route path="/characters/new/kids" element={isAuthenticated ? <Navigate to="/characters/new/matchmaker" replace /> : <Navigate to="/auth" replace />} />
        <Route path="/characters/:characterId/edit" element={protectedAppPage(<FullCharacterCreatorV3 editMode />)} />
        <Route path="/characters/:characterId" element={protectedAppPage(<CleanCharacterSheet />)} />
      </Routes>
      <GlobalGuidedTour isAuthenticated={isAuthenticated} />
      <GlobalUpdatesPanel isAuthenticated={isAuthenticated} />
      <GlobalFeedbackButton />
      <Toaster position="top-right" richColors theme="dark" />
    </>
  );
}

function App() {
  installRollBurstPersistence();
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppErrorBoundary>
          <Suspense fallback={<RouteLoadingScreen />}>
            <AppRoutes />
          </Suspense>
        </AppErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
