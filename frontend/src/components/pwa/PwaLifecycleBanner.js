import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, WifiOff, X } from 'lucide-react';
import CampaignOfflineControl from '@/components/pwa/CampaignOfflineControl';
import OfflineSyncManager from '@/components/pwa/OfflineSyncManager';
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
  const [offlineCacheActive, setOfflineCacheActive] = useState(false);

  useEffect(() => {
    const onOnline = () => { setOnline(true); setOfflineCacheActive(false); };
    const onOffline = () => setOnline(false);
    const onOfflineCacheHit = () => setOfflineCacheActive(true);
    const onUpdate = () => setUpdateReady(true);
    const onInstall = () => {
      setInstallReady(true);
      setDismissedInstall(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('rqk:offline-cache-hit', onOfflineCacheHit);
    window.addEventListener(PWA_EVENTS.UPDATE_READY_EVENT, onUpdate);
    window.addEventListener(PWA_EVENTS.INSTALL_AVAILABLE_EVENT, onInstall);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('rqk:offline-cache-hit', onOfflineCacheHit);
      window.removeEventListener(PWA_EVENTS.UPDATE_READY_EVENT, onUpdate);
      window.removeEventListener(PWA_EVENTS.INSTALL_AVAILABLE_EVENT, onInstall);
    };
  }, []);

  let banner = null;

  if (!online) {
    banner = (
      <aside className="rqk-pwa-banner rqk-pwa-banner--offline" role="status" aria-live="polite">
        <span className="rqk-pwa-banner__icon"><WifiOff size={16} /></span>
        <span className="rqk-pwa-banner__copy">
          <strong>Offline</strong>
          <small>{offlineCacheActive ? 'Using saved campaign data where available. Combat state and collected loot can queue safely; deeper edits still need a connection.' : 'Downloaded campaign data can reopen. Combat state and collected loot can queue safely; deeper edits still need a connection.'}</small>
        </span>
      </aside>
    );
  } else if (updateReady) {
    banner = (
      <aside className="rqk-pwa-banner rqk-pwa-banner--update" role="status" aria-live="polite">
        <span className="rqk-pwa-banner__icon"><RefreshCw size={16} /></span>
        <span className="rqk-pwa-banner__copy">
          <strong>Rookie update ready</strong>
          <small>Reload to use the newest version.</small>
        </span>
        <button type="button" className="rqk-pwa-banner__action" onClick={applyWaitingServiceWorker}>Update & reload</button>
      </aside>
    );
  } else if (installReady && !dismissedInstall) {
    banner = (
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

  return (
    <>
      <CampaignOfflineControl />
      <OfflineSyncManager />
      {banner}
    </>
  );
}
