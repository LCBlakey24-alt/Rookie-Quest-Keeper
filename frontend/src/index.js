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

installSafeToasts();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
      <PwaLifecycleBanner />
    </AppErrorBoundary>
  </React.StrictMode>,
);

registerPwaServiceWorker();
