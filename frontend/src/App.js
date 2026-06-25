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
import '@/styles/cleanSheetRecovery.css';
import '@/styles/cleanInventoryTab.css';
import '@/styles/cleanSpellsTab.css';
import '@/styles/cleanNotesTab.css';
import '@/styles/levelUpCleanStyle.css';
import '@/styles/siteVelvetTheme.css';
import '@/styles/blueEclipseTheme.css';
import '@/styles/gmBlueEclipseTheme.css';
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
    if (path.startsWith('/gm-screen') || path.startsWith('/prototype-gm')) {
      setTheme(THEMES.GM);
    } else if (path.startsWith('/characters') || path.startsWith('/player') || path.startsWith('/campaign/') || path.startsWith('/prototype-mobile') || path.startsWith('/prototype-progressions')) {
      setTheme(THEMES.PLAYER);
    } else {
      setTheme(THEMES.LANDING);
    }
  }, [location.pathname, setTheme]);
  
  return null;
}

function AppRoutes() {
  const location = useLocation();
  const params = useParams();
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const openShortcuts = useCallback(() => setIsShortcutsOpen(true), []);
  const closeShortcuts = useCallback(() => setIsShortcutsOpen(false), []);

  useKeyboardShortcuts({ onOpenShortcuts: openShortcuts });

  return (
    <>
      <ThemeRouter />
      <ImpersonationBanner />
      <Suspense fallback={<RouteLoadingScreen />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/home" element={<UnifiedDashboard />} />
          <Route path="/prototype" element={<PrototypeHub />} />
          <Route path="/prototype-mobile" element={<PrototypeMobileLab />} />
          <Route path="/prototype-gm" element={<TiaKartaGmPrototype />} />
          <Route path="/prototype-progressions" element={<ClassProgressionLab />} />
          <Route path="/player" element={<PlayerDashboard />} />
          <Route path="/campaign/:campaignId" element={<CampaignDashboard />} />
          <Route path="/gm-screen/:campaignId" element={<LiveSessionGridPage />} />
          <Route path="/player-campaign/:campaignId" element={<MobilePlayerCampaignView />} />
          <Route path="/combat/:encounterId" element={<CombatPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/account" element={<AccountSettings />} />
          <Route path="/homebrew" element={<HomebrewWorkshop />} />
          <Route path="/characters/new" element={<CharacterCreationModePicker />} />
          <Route path="/characters/new/basic" element={<BasicCharacterBuilder />} />
          <Route path="/characters/new/premade" element={<PremadeCharacterBuilder />} />
          <Route path="/characters/new/kids" element={<KidsCharacterBuilder />} />
          <Route path="/characters/:characterId" element={<CleanCharacterSheet />} />
          <Route path="/characters/:characterId/edit" element={<CharacterBuilder editMode />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <GlobalFeedbackButton />
      <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={closeShortcuts} />
    </>
  );
}

function AuthRestorer({ children }) {
  useEffect(() => {
    const token = getAuthToken();
    if (token) apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  }, []);

  return children;
}

export default function App() {
  useEffect(() => {
    installRollBurstPersistence();
  }, []);

  return (
    <ThemeProvider>
      <AuthRestorer>
        <BrowserRouter>
          <AppRoutes />
          <Toaster richColors position="top-center" />
        </BrowserRouter>
      </AuthRestorer>
    </ThemeProvider>
  );
}
