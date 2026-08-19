import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, WifiOff, X } from 'lucide-react';
import {
  PWA_EVENTS,
  applyWaitingServiceWorker,
  getPendingInstallPrompt,
  promptInstall,
} from '@/pwa/registerServiceWorker';

export default function PwaLifecycleBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [updateReady, setUpdateReady] = useState(false);
  const [installReady, setInstallReady] = useState(() => Boolean(getPendingInstallPrompt()));
  const [dismissedInstall, setDismissedInstall] = useState(false);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onUpdate = () => setUpdateReady(true);
    const onInstall = () => {
      setInstallReady(true);
      setDismissedInstall(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener(PWA_EVENTS.UPDATE_READY_EVENT, onUpdate);
    window.addEventListener(PWA_EVENTS.INSTALL_AVAILABLE_EVENT, onInstall);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener(PWA_EVENTS.UPDATE_READY_EVENT, onUpdate);
      window.removeEventListener(PWA_EVENTS.INSTALL_AVAILABLE_EVENT, onInstall);
    };
  }, []);

  if (!online) {
    return (
      <aside className="rqk-pwa-banner rqk-pwa-banner--offline" role="status" aria-live="polite">
        <span className="rqk-pwa-banner__icon"><WifiOff size={16} /></span>
        <span className="rqk-pwa-banner__copy">
          <strong>Offline</strong>
          <small>The app shell is available. Campaign data sync is coming in the next offline phase.</small>
        </span>
      </aside>
    );
  }

  if (updateReady) {
    return (
      <aside className="rqk-pwa-banner rqk-pwa-banner--update" role="status" aria-live="polite">
        <span className="rqk-pwa-banner__icon"><RefreshCw size={16} /></span>
        <span className="rqk-pwa-banner__copy">
          <strong>Rookie update ready</strong>
          <small>Reload to use the newest version.</small>
        </span>
        <button type="button" className="rqk-pwa-banner__action" onClick={applyWaitingServiceWorker}>Update & reload</button>
      </aside>
    );
  }

  if (installReady && !dismissedInstall) {
    return (
      <aside className="rqk-pwa-banner rqk-pwa-banner--install" role="status" aria-live="polite">
        <span className="rqk-pwa-banner__icon"><Download size={16} /></span>
        <span className="rqk-pwa-banner__copy">
          <strong>Install Rookie Quest Keeper</strong>
          <small>Open it like an app from this device.</small>
        </span>
        <button
          type="button"
          className="rqk-pwa-banner__action"
          onClick={async () => {
            const accepted = await promptInstall();
            setInstallReady(false);
            if (!accepted) setDismissedInstall(true);
          }}
        >
          Install
        </button>
        <button type="button" className="rqk-pwa-banner__close" onClick={() => setDismissedInstall(true)} aria-label="Dismiss install prompt"><X size={14} /></button>
      </aside>
    );
  }

  return null;
}
