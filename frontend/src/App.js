import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import '@/styles/authExperiencePolish.css';
import '@/styles/homeHubConsistencySweep.css';
import '@/styles/responsiveSunsetLayouts.css';
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
import GlobalActionFillEffects from '@/components/ui/GlobalActionFillEffects';
import GlobalScrollRecovery from '@/components/ui/GlobalScrollRecovery';
import { ThemeProvider, useTheme, THEMES } from '@/contexts/ThemeContext';
import { seedMockCampaigns } from '@/utils/seedMockCampaigns';
import { importLegacyCharacters } from '@/utils/importLegacyCharacters';
import { ensureCoreContent } from '@/data/coreContent';
import { autoSeedDemoData } from '@/utils/autoSeedDemoData';
import { normalizeCharacterData } from '@/utils/characterDataNormalizer';
import { Button } from '@/components/ui/button';
import ErrorBoundary from '@/components/ErrorBoundary';
import apiClient from '@/lib/apiClient';
import Login from '@/components/Login';
import Register from '@/components/Register';
import CharacterForm from '@/components/CharacterForm';
import CharacterList from '@/components/CharacterList';
import GMPage from '@/components/GMPage';
import CharacterView from '@/components/CharacterView';
import AuthPage from '@/components/AuthPage';
import DiceRoller from '@/components/DiceRoller';
import AdminPage from '@/components/admin/AdminPage';
import CharacterSheetPage from '@/components/characters/CharacterSheetPage';
import CharacterModeSelect from '@/components/characters/CharacterModeSelect';
import FullCharacterCreator from '@/components/characters/FullCharacterCreator';
import BasicBuildCharacterCreator from '@/components/characters/BasicBuildCharacterCreator';
import KidsModeCharacterCreator from '@/components/characters/KidsModeCharacterCreator';
import PremadeCharacterGallery from '@/components/characters/PremadeCharacterGallery';
import AppHomePage from '@/pages/AppHomePage';
import MyCharactersPage from '@/pages/MyCharactersPage';
import MyCampaignsPage from '@/pages/MyCampaignsPage';
import HomebrewWorkshopPage from '@/pages/HomebrewWorkshopPage';
import UploadsDashboardPage from '@/pages/UploadsDashboardPage';
import LandingPage from '@/pages/LandingPage';

const STORAGE_KEY = 'token';
const USERNAME_KEY = 'username';

function AppRoutes({ token, username, onLogin, onLogout }) {
  const location = useLocation();
  const inApp = Boolean(token);

  return (
    <Suspense fallback={<RouteLoadingScreen message="Gathering your quest tools..." />}>
      <Routes>
        <Route path="/" element={inApp ? <Navigate to="/home" replace /> : <LandingPage />} />
        <Route path="/login" element={inApp ? <Navigate to="/home" replace /> : <AuthPage onLogin={onLogin} />} />
        <Route path="/register" element={inApp ? <Navigate to="/home" replace /> : <AuthPage onLogin={onLogin} />} />
        <Route path="/auth" element={inApp ? <Navigate to="/home" replace /> : <AuthPage onLogin={onLogin} />} />
        <Route path="/reset-password" element={inApp ? <Navigate to="/home" replace /> : <AuthPage onLogin={onLogin} />} />
        <Route element={inApp ? <AppShell username={username} onLogout={onLogout} /> : <Navigate to="/auth" replace state={{ from: location }} />}>
          <Route path="/home" element={<AppHomePage username={username} />} />
          <Route path="/characters" element={<MyCharactersPage token={token} />} />
          <Route path="/characters/new" element={<CharacterModeSelect />} />
          <Route path="/characters/create" element={<CharacterForm token={token} username={username} />} />
          <Route path="/characters/create/full" element={<FullCharacterCreator />} />
          <Route path="/characters/create/basic" element={<BasicBuildCharacterCreator />} />
          <Route path="/characters/create/kids" element={<KidsModeCharacterCreator />} />
          <Route path="/characters/create/premade" element={<PremadeCharacterGallery token={token} username={username} />} />
          <Route path="/characters/:characterId" element={<CharacterSheetPage token={token} username={username} />} />
          <Route path="/campaigns" element={<MyCampaignsPage username={username} />} />
          <Route path="/campaign/:campaignId" element={<GMPage token={token} username={username} />} />
          <Route path="/gm" element={<GMPage token={token} username={username} />} />
          <Route path="/homebrew" element={<HomebrewWorkshopPage />} />
          <Route path="/uploads" element={<UploadsDashboardPage />} />
          <Route path="/admin" element={<AdminPage token={token} />} />
        </Route>
        <Route path="*" element={<Navigate to={inApp ? '/home' : '/'} replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem(STORAGE_KEY));
  const [username, setUsername] = useState(localStorage.getItem(USERNAME_KEY));
  const [checkingSession, setCheckingSession] = useState(Boolean(localStorage.getItem(STORAGE_KEY)));

  const handleLogout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USERNAME_KEY);
    setToken(null);
    setUsername(null);
  }, []);

  const handleLogin = useCallback((nextToken, nextUsername) => {
    localStorage.setItem(STORAGE_KEY, nextToken);
    localStorage.setItem(USERNAME_KEY, nextUsername || 'Player');
    setToken(nextToken);
    setUsername(nextUsername || 'Player');
  }, []);

  useEffect(() => {
    const existingToken = localStorage.getItem(STORAGE_KEY);
    const existingUsername = localStorage.getItem(USERNAME_KEY);
    if (!existingToken) {
      setCheckingSession(false);
      return;
    }

    apiClient.get('/auth/me')
      .then((response) => {
        const verifiedUsername = response.data?.username || existingUsername || 'Player';
        handleLogin(existingToken, verifiedUsername);
      })
      .catch(() => {
        handleLogout();
      })
      .finally(() => setCheckingSession(false));
  }, [handleLogin, handleLogout]);

  useEffect(() => {
    ensureCoreContent();
    importLegacyCharacters();
    seedMockCampaigns();
    autoSeedDemoData();
    installRollBurstPersistence();
  }, []);

  if (checkingSession) {
    return <RouteLoadingScreen message="Checking your session..." />;
  }

  return (
    <ThemeProvider defaultTheme={THEMES?.system || 'system'} storageKey="rqk-theme">
      <BrowserRouter>
        <AppErrorBoundary>
          <ErrorBoundary>
            <AppRoutes token={token} username={username} onLogin={handleLogin} onLogout={handleLogout} />
            <FloatingDiceRoller />
            <GlobalFeedbackButton token={token} username={username} />
            <GlobalActionFillEffects />
            <GlobalScrollRecovery />
            <Toaster richColors position="top-right" />
          </ErrorBoundary>
        </AppErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
