import React, { Suspense, useState, useEffect, useCallback } from 'react';
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
import '@/data/applyTestBackgrounds';
import '@/data/sanitizeCharacterBuilderDraft';
import { installRollBurstPersistence } from '@/utils/persistRollBurst';
import { Toaster } from '@/components/ui/sonner';
import ImpersonationBanner from '@/components/admin/ImpersonationBanner';
import GlobalFeedbackButton from '@/components/GlobalFeedbackButton';
import { ThemeProvider, useTheme, THEMES } from '@/contexts/ThemeContext';
import apiClient from '@/lib/apiClient';
import { AUTH_USERNAME_KEY, getAuthToken, setAuthToken } from '@/lib/auth';

const AuthPage = React.lazy(() => import('@/components/AuthPage'));
const UnifiedDashboard = React.lazy(() => import('@/components/UnifiedDashboard'));
const PlayerDashboard = React.lazy(() => import('@/components/PlayerDashboard'));
const CampaignDashboard = React.lazy(() => import('@/components/CampaignDashboard'));
const LiveSessionGridPage = React.lazy(() => import('@/components/gm/LiveSessionGridPage'));
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
        <img className="loading-logo" src="/brand/rqk-logo-mini.svg" alt="RQK loading" />
      </div>
      <p style={{ color: '#F6EAD2', marginTop: 12, fontWeight: 800 }}>Opening your dashboard…</p>
    </div>
  );
}

function ThemeRouter() {
  const location = useLocation();
  const { setTheme } = useTheme();
  
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/gm-screen') || path.startsWith('/prototype-gm')) {
      setTheme(THEMES.GM);
    } else if (path.startsWith('/characters') || path.startsWith('/player') || path.startsWith('/campaign/') || path.startsWith('/prototype-mobile') || path.startsWith('/prototype-progressions')) {
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
      <ImpersonationBanner />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage onLogin={handleAuthLogin} />} />
        <Route path="/home" element={isAuthenticated ? <UnifiedDashboard username={username} onLogout={handleLogout} /> : <Navigate to="/auth" replace />} />
        <Route path="/player" element={isAuthenticated ? <PlayerDashboard /> : <Navigate to="/auth" replace />} />
        <Route path="/campaign/:campaignId" element={isAuthenticated ? <CampaignDashboard /> : <Navigate to="/auth" replace />} />
        <Route path="/campaign/:campaignId/live" element={isAuthenticated ? <LiveSessionGridPage /> : <Navigate to="/auth" replace />} />
        <Route path="/homebrew" element={isAuthenticated ? <HomebrewWorkshop /> : <Navigate to="/auth" replace />} />
        <Route path="/prototype" element={<PrototypeHub />} />
        <Route path="/prototype-mobile" element={<PrototypeMobileLab />} />
        <Route path="/prototype-gm" element={<TiaKartaGmPrototype />} />
        <Route path="/prototype-progressions" element={<ClassProgressionLab />} />
        <Route path="/mobile" element={isAuthenticated ? <MobilePlayerCampaignView /> : <Navigate to="/auth" replace />} />
        <Route path="/combat" element={isAuthenticated ? <CombatPage /> : <Navigate to="/auth" replace />} />
        <Route path="/admin" element={isAuthenticated ? <AdminPage /> : <Navigate to="/auth" replace />} />
        <Route path="/account" element={isAuthenticated ? <AccountSettings /> : <Navigate to="/auth" replace />} />
        <Route path="/characters/new" element={isAuthenticated ? <CharacterCreationModePicker /> : <Navigate to="/auth" replace />} />
        <Route path="/characters/new/full" element={isAuthenticated ? <CharacterBuilder /> : <Navigate to="/auth" replace />} />
        <Route path="/characters/new/basic" element={isAuthenticated ? <BasicCharacterBuilder /> : <Navigate to="/auth" replace />} />
        <Route path="/characters/new/premade" element={isAuthenticated ? <PremadeCharacterBuilder /> : <Navigate to="/auth" replace />} />
        <Route path="/characters/new/kids" element={isAuthenticated ? <KidsCharacterBuilder /> : <Navigate to="/auth" replace />} />
        <Route path="/characters/:characterId" element={isAuthenticated ? <CleanCharacterSheet /> : <Navigate to="/auth" replace />} />
        <Route path="/characters/:characterId/edit" element={isAuthenticated ? <CharacterBuilder editMode /> : <Navigate to="/auth" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <GlobalFeedbackButton isAuthenticated={isAuthenticated} />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteLoadingScreen />}>
          <AppRoutes />
        </Suspense>
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
