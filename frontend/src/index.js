import '@/preview/bootstrap';
import React from "react";
import ReactDOM from "react-dom/client";
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import "@/index.css";
import "@/styles/mobileUsabilityFix.css";
import "@/styles/pwaLifecycle.css";
import App from "@/App";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import PwaLifecycleBanner from "@/components/pwa/PwaLifecycleBanner";
import { installSafeToasts } from "@/utils/safeToast";
import { registerPwaServiceWorker } from "@/pwa/registerServiceWorker";
import { installQueuedCombatPartyOverlay } from "@/offline/queuedCombatPartyOverlay";
import { installRookAiConsentGate } from "@/privacy/rookAiConsent";
import { installAccountDeletionLocalCleanup } from "@/privacy/accountDeletionCleanup";
import { installStaleAssetRecovery } from "@/utils/staleAssetRecovery";
import { isLocalPreview, isOfflineDesktop } from '@/preview/previewMode';

// One final product-level visual authority. App Store usability fixes load first;
// the three-mode design then owns palette and desktop/tablet/mobile geometry.
import "@/styles/appStoreMobilePolish.css";
import "@/styles/threeModeMinimalist.css";
// Guild Ledger finishing pass: only visual presentation; data/layout ownership stays with routes.
import "@/styles/guildLedgerFinish.css";
// The approved Guild Command layout and the final flat-navy citrus accent layer.
// Retire wax-red full-control fills and the separate wallpaper draft.
import "@/styles/guildCommand.css";
import "@/styles/citrusCommand.css";
import "@/styles/guildCommandDashboard.css";

installSafeToasts();
installQueuedCombatPartyOverlay();
installStaleAssetRecovery();
if (!isLocalPreview()) installRookAiConsentGate();
installAccountDeletionLocalCleanup();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
      {!isOfflineDesktop() && <PwaLifecycleBanner />}
    </AppErrorBoundary>
  </React.StrictMode>,
);

if (!isOfflineDesktop()) registerPwaServiceWorker();
