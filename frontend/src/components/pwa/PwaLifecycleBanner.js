import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, WifiOff, X } from 'lucide-react';
import CampaignOfflineControl from '@/components/pwa/CampaignOfflineControl';
import OfflineSyncManager from '@/components/pwa/OfflineSyncManager';
import PrivacyDataSettings from '@/components/privacy/PrivacyDataSettings';
import {
  PWA_EVENTS,
  applyWaitingServiceWorker,
  getPendingInstallPrompt,
  promptInstall,
} from '@/pwa/registerServiceWorker';

const INSTALL_DISMISSED_KEY = 'rqk.pwa.install.dismissed';

function loadInstallDismissed() {
  try { return localStorage.getItem(INSTALL_DISMISSED_KEY) === '1'; } catch { return false; }
}

function isCompactInstallSurface() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(max-width: 719px)').matches;
}

export default function PwaLifecycleBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [updateReady, setUpdateReady] = useState(false);
  const [installReady, setInstallReady] = useState(() => Boolean(getPendingInstallPrompt()));
  const [dismissedInstall, setDismissedInstall] = useState(loadInstallDismissed);
  const [compactInstallSurface, setCompactInstallSurface] = useState(isCompactInstallSurface);
  const [offlineCacheActive, setOfflineCacheActive] = useState(false);

  useEffect(() => {
    const onOnline = () => { setOnline(true); setOfflineCacheActive(false); };
    const onOffline = () => setOnline(false);
    const onOfflineCacheHit = () => setOfflineCacheActive(true);
    const onUpdate = () => setUpdateReady(true);
    const onInstall = () => {
      setInstallReady(true);
      if (!loadInstallDismissed()) setDismissedInstall(false);
    };
    const onResize = () => setCompactInstallSurface(isCompactInstallSurface());

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('resize', onResize);
    window.addEventListener('rqk:offline-cache-hit', onOfflineCacheHit);
    window.addEventListener(PWA_EVENTS.UPDATE_READY_EVENT, onUpdate);
    window.addEventListener(PWA_EVENTS.INSTALL_AVAILABLE_EVENT, onInstall);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('rqk:offline-cache-hit', onOfflineCacheHit);
      window.removeEventListener(PWA_EVENTS.UPDATE_READY_EVENT, onUpdate);
      window.removeEventListener(PWA_EVENTS.INSTALL_AVAILABLE_EVENT, onInstall);
    };
  }, []);

  const dismissInstall = () => {
    setDismissedInstall(true);
    try { localStorage.setItem(INSTALL_DISMISSED_KEY, '1'); } catch {}
  };

  let banner = null;

  if (!online) {
    banner = (
      <aside className="rqk-pwa-banner rqk-pwa-banner--offline" role="status" aria-live="polite">
        <span className="rqk-pwa-banner__icon"><WifiOff size={16} /></span>
        <span className="rqk-pwa-banner__copy">
          <strong>Offline mode</strong>
          <small>{offlineCacheActive ? 'Using saved campaign data. Combat and loot can queue until you reconnect.' : 'Saved campaigns can reopen. Combat and loot can queue until you reconnect.'}</small>
        </span>
      </aside>
    );
  } else if (updateReady) {
    banner = (
      <aside className="rqk-pwa-banner rqk-pwa-banner--update" role="status" aria-live="polite">
        <span className="rqk-pwa-banner__icon"><RefreshCw size={16} /></span>
        <span className="rqk-pwa-banner__copy">
          <strong>Update ready</strong>
          <small>Restart Rookie with the newest version.</small>
        </span>
        <button type="button" className="rqk-pwa-banner__action" onClick={applyWaitingServiceWorker}>Update</button>
      </aside>
    );
  } else if (installReady && !dismissedInstall && compactInstallSurface) {
    banner = (
      <aside className="rqk-pwa-banner rqk-pwa-banner--install" role="status" aria-live="polite">
        <span className="rqk-pwa-banner__icon"><Download size={16} /></span>
        <span className="rqk-pwa-banner__copy">
          <strong>Install Rookie</strong>
          <small>Add Rookie Quest Keeper to this device.</small>
        </span>
        <button
          type="button"
          className="rqk-pwa-banner__action"
          onClick={async () => {
            const accepted = await promptInstall();
            setInstallReady(false);
            if (!accepted) dismissInstall();
          }}
        >
          Install
        </button>
        <button type="button" className="rqk-pwa-banner__close" onClick={dismissInstall} aria-label="Dismiss install prompt"><X size={14} /></button>
      </aside>
    );
  }

  return (
    <>
      <CampaignOfflineControl />
      <OfflineSyncManager />
      <PrivacyDataSettings />
      {banner}
    </>
  );
}
