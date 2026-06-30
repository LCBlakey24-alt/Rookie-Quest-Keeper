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


const LOADING_TIPS = [
  'Table tip: decide your action, bonus action, and movement before your turn starts to keep combat snappy.',
  'Rules reminder: reactions are usually limited to one per round, so use them when they matter.',
  'GM tip: secrets hit harder when players receive them at the exact moment they become useful.',
  'Player tip: if you are not sure what to do, check your Actions tab first — attack, help, dodge, dash, hide, and ready are all valid choices.',
  'Table tip: write down names of NPCs as soon as they appear. Future-you will be deeply smug about it.',
  'Spell tip: prepared spells are your daily toolkit; known spells are the wider list your character has learned.',
  'GM tip: reward items are more exciting when they arrive instantly and clearly on the player sheet.',
  'Player tip: conditions can change your whole turn. Check them before rolling.',
  'Table tip: a fast ruling now is often better than a perfect ruling after ten minutes of book diving.',
  'Character tip: your best move is not always damage — helping, protecting, moving, or setting up an ally can win the scene.'
];

function RouteLoadingScreen() {
  const tip = React.useMemo(() => LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)], []);
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true" />
      <p style={{ color: '#ffffff', marginTop: 12, fontWeight: 900 }}>Opening Rookie Quest Keeper…</p>
      <p style={{ color: 'rgba(255,255,255,0.68)', marginTop: 8, maxWidth: 520, padding: '0 18px', lineHeight: 1.45, fontSize: 14 }}>{tip}</p>
    </div>
  );
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
    } else if (path.startsWith('/characters') || path.startsWith('/player') || path.startsWith('/campaign/') || path.startsWith('/mobile') || path.startsWith('/prototype-mobile') || path.startsWith('/prototype-progressions')) {
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

  return (
    <>
      <ThemeRouter />
      <GlobalActionFillEffects />
      <GlobalScrollRecovery />
      <ImpersonationBanner />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage onLogin={handleAuthLogin} />} />
        <Route path="/home" element={isAuthenticated ? <UnifiedDashboard username={username} onLogout={handleLogout} /> : <Navigate to="/auth" replace />} />
        <Route path="/player" element={isAuthenticated ? <PlayerDashboard /> : <Navigate to="/auth" replace />} />
        <Route path="/campaign/:campaignId" element={isAuthenticated ? <CampaignDashboard /> : <Navigate to="/auth" replace />} />
        <Route path="/campaign/:campaignId/live" element={isAuthenticated ? <LiveSessionGridPage /> : <Navigate to="/auth" replace />} />
        <Route path="/gm-screen/:campaignId" element={isAuthenticated ? <LiveSessionGridPage /> : <Navigate to="/auth" replace />} />
        <Route path="/campaign/:campaignId/player-display" element={isAuthenticated ? <PlayerDisplayPage /> : <Navigate to="/auth" replace />} />
        <Route path="/gm-screen/:campaignId/display" element={isAuthenticated ? <PlayerDisplayPage /> : <Navigate to="/auth" replace />} />
        <Route path="/homebrew" element={isAuthenticated ? <HomebrewWorkshop /> : <Navigate to="/auth" replace />} />
        <Route path="/prototype" element={<PrototypeRoute><PrototypeHub /></PrototypeRoute>} />
        <Route path="/prototype-mobile" element={<PrototypeRoute><PrototypeMobileLab /></PrototypeRoute>} />
        <Route path="/prototype-gm" element={<PrototypeRoute><TiaKartaGmPrototype /></PrototypeRoute>} />
        <Route path="/prototype-progressions" element={<PrototypeRoute><ClassProgressionLab /></PrototypeRoute>} />
        <Route path="/mobile" element={isAuthenticated ? <MobilePlayerCampaignView /> : <Navigate to="/auth" replace />} />
        <Route path="/mobile/:campaignId" element={isAuthenticated ? <MobilePlayerCampaignView /> : <Navigate to="/auth" replace />} />
        <Route path="/combat" element={isAuthenticated ? <CombatPage /> : <Navigate to="/auth" replace />} />
        <Route path="/admin" element={isAuthenticated ? <AdminPage /> : <Navigate to="/auth" replace />} />
        <Route path="/account" element={isAuthenticated ? <AccountSettings /> : <Navigate to="/auth" replace />} />
        <Route path="/characters/new" element={isAuthenticated ? <CharacterCreationModePicker /> : <Navigate to="/auth" replace />} />
        <Route path="/characters/new/modes" element={isAuthenticated ? <CharacterCreationModePicker /> : <Navigate to="/auth" replace />} />
        <Route path="/characters/new/full" element={isAuthenticated ? <FullCharacterCreatorV3 /> : <Navigate to="/auth" replace />} />
        <Route path="/characters/new/matchmaker" element={isAuthenticated ? <RookCharacterMatchmaker /> : <Navigate to="/auth" replace />} />
        <Route path="/characters/new/basic" element={isAuthenticated ? <BasicCharacterCreator /> : <Navigate to="/auth" replace />} />
        <Route path="/characters/new/premade" element={isAuthenticated ? <Navigate to="/characters/new/matchmaker" replace /> : <Navigate to="/auth" replace />} />
        <Route path="/characters/new/kids" element={isAuthenticated ? <Navigate to="/characters/new/matchmaker" replace /> : <Navigate to="/auth" replace />} />
        <Route path="/characters/:characterId/edit" element={isAuthenticated ? <FullCharacterCreatorV3 editMode /> : <Navigate to="/auth" replace />} />
        <Route path="/characters/:characterId" element={isAuthenticated ? <CleanCharacterSheet /> : <Navigate to="/auth" replace />} />
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
