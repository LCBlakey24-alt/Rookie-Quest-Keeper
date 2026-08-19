import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, HardDrive, RefreshCw, Trash2, WifiOff, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteCampaignOfflinePack,
  downloadCampaignOfflinePack,
  formatOfflinePackAge,
  getCampaignOfflinePack,
} from '@/offline/offlineCampaignPack';
import {
  deletePlayerOfflinePack,
  downloadPlayerOfflinePack,
  getPlayerOfflinePack,
} from '@/offline/offlinePlayerCampaignPack';
import '@/styles/offlineCampaignControl.css';

function campaignContextFromPath(pathname = '') {
  const gmMatch = pathname.match(/^\/(?:campaign|gm-screen)\/([^/?#]+)/);
  if (gmMatch) return { campaignId: decodeURIComponent(gmMatch[1]), audience: 'gm' };
  const playerMatch = pathname.match(/^\/mobile\/([^/?#]+)/);
  if (playerMatch) return { campaignId: decodeURIComponent(playerMatch[1]), audience: 'player' };
  return { campaignId: '', audience: '' };
}

function useCampaignContext() {
  const [context, setContext] = useState(() => campaignContextFromPath(window.location.pathname));

  useEffect(() => {
    let previous = window.location.pathname;
    const timer = window.setInterval(() => {
      if (window.location.pathname === previous) return;
      previous = window.location.pathname;
      setContext(campaignContextFromPath(previous));
    }, 600);
    return () => window.clearInterval(timer);
  }, []);

  return context;
}

export default function CampaignOfflineControl() {
  const { campaignId, audience } = useCampaignContext();
  const playerMode = audience === 'player';
  const [open, setOpen] = useState(false);
  const [pack, setPack] = useState(null);
  const [loadingPack, setLoadingPack] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
    setProgress(null);
    setPack(null);
    if (!campaignId || !audience) return;
    let cancelled = false;
    setLoadingPack(true);
    const loader = playerMode ? getPlayerOfflinePack : getCampaignOfflinePack;
    loader(campaignId)
      .then(value => { if (!cancelled) setPack(value); })
      .finally(() => { if (!cancelled) setLoadingPack(false); });
    return () => { cancelled = true; };
  }, [audience, campaignId, playerMode]);

  const status = useMemo(() => {
    if (downloading) return { label: 'Downloading', tone: 'working' };
    if (!pack) return { label: 'Not downloaded', tone: 'empty' };
    if (pack.failedSections > 0) return { label: 'Partial copy', tone: 'warning' };
    return { label: 'Ready offline', tone: 'ready' };
  }, [downloading, pack]);

  if (!campaignId || !audience) return null;

  const download = async () => {
    if (!online || downloading) return;
    setDownloading(true);
    setProgress({ phase: playerMode ? 'player' : 'campaign', completed: 0, total: 1, label: 'Starting…' });
    try {
      const downloader = playerMode ? downloadPlayerOfflinePack : downloadCampaignOfflinePack;
      const next = await downloader(campaignId, {
        campaignName: pack?.campaignName,
        onProgress: setProgress,
      });
      setPack(next);
      toast.success(next?.failedSections
        ? `Offline copy saved with ${next.failedSections} unavailable section${next.failedSections === 1 ? '' : 's'}`
        : playerMode ? 'Player campaign downloaded for offline use' : 'Campaign downloaded for offline play');
    } catch (error) {
      toast.error(error?.response?.data?.detail || error?.message || 'Could not download campaign for offline use');
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  };

  const remove = async () => {
    if (!pack || downloading) return;
    if (!window.confirm(`Remove the offline copy of ${pack.campaignName || 'this campaign'} from this device?`)) return;
    const remover = playerMode ? deletePlayerOfflinePack : deleteCampaignOfflinePack;
    await remover(campaignId);
    setPack(null);
    toast.success('Offline campaign copy removed');
  };

  const progressPercent = progress?.total
    ? Math.max(4, Math.min(100, Math.round((progress.completed / progress.total) * 100)))
    : 0;

  const description = playerMode
    ? 'Your player campaign view, linked character sheets, party roster, shared handouts and their media can reopen without internet. GM-only prep is never included.'
    : 'Quests, NPCs, locations, encounters, notes, party data, maps and handout media can reopen without internet. Offline editing is not enabled yet.';

  const phaseLabel = progress?.phase === 'characters'
    ? 'Character sheets'
    : progress?.phase === 'media'
      ? 'Maps, images & attachments'
      : playerMode ? 'Player-safe campaign data' : 'Campaign data';

  return (
    <div className="rqk-offline-control" data-open={open ? 'true' : 'false'} data-audience={audience}>
      {open && (
        <section className="rqk-offline-card" aria-label="Offline campaign">
          <header className="rqk-offline-card__header">
            <span className="rqk-offline-card__title"><HardDrive size={16} /><strong>{playerMode ? 'Offline Player Pack' : 'Offline Campaign'}</strong></span>
            <button type="button" className="rqk-offline-icon-button" onClick={() => setOpen(false)} aria-label="Close offline campaign panel"><X size={15} /></button>
          </header>

          <div className="rqk-offline-card__body">
            <div className="rqk-offline-status-row">
              <span className={`rqk-offline-status rqk-offline-status--${status.tone}`}>
                {status.tone === 'ready' ? <CheckCircle2 size={13} /> : status.tone === 'warning' ? <AlertTriangle size={13} /> : status.tone === 'working' ? <RefreshCw size={13} className="rqk-offline-spin" /> : <Download size={13} />}
                {status.label}
              </span>
              {pack?.savedAt && <small>{formatOfflinePackAge(pack.savedAt)}</small>}
            </div>

            <div className="rqk-offline-copy">
              <strong>{pack?.campaignName || 'Save this campaign to this device'}</strong>
              <p>{description}</p>
            </div>

            {!online && (
              <div className="rqk-offline-warning"><WifiOff size={14} /><span>Reconnect to download or refresh. Your existing offline copy remains available.</span></div>
            )}

            {downloading && progress && (
              <div className="rqk-offline-progress">
                <span><strong>{progress.label}</strong><small>{phaseLabel}</small></span>
                <div><i style={{ width: `${progressPercent}%` }} /></div>
              </div>
            )}

            {pack && !downloading && (
              <div className="rqk-offline-metrics">
                <span><strong>{pack.successfulSections || 0}</strong><small>Saved sections</small></span>
                <span><strong>{pack.characterIds?.length || 0}</strong><small>Characters</small></span>
                <span><strong>{pack.mediaSaved || 0}</strong><small>Media files</small></span>
                <span><strong>{pack.failedSections || 0}</strong><small>Unavailable</small></span>
              </div>
            )}

            {pack?.failedSections > 0 && !downloading && (
              <details className="rqk-offline-missing">
                <summary>Show unavailable sections</summary>
                <div>
                  {(pack.sections || []).filter(section => section.status !== 'saved').map(section => (
                    <span key={section.key}><strong>{section.label}</strong><small>{section.message || 'Not available during the last download.'}</small></span>
                  ))}
                </div>
              </details>
            )}

            <div className="rqk-offline-note">
              {playerMode
                ? 'This copy contains player-authorised data and media only. GM notes, secret NPC information, unrevealed handouts and encounter prep are excluded.'
                : 'Offline packs include campaign data plus media Rookie can reach from maps, handouts, portraits, tokens and backgrounds. Online-only Rook AI and edits still require a connection.'}
            </div>

            <div className="rqk-offline-actions">
              <button type="button" className="rqk-offline-primary" onClick={download} disabled={!online || downloading || loadingPack}>
                {pack ? <RefreshCw size={14} /> : <Download size={14} />}
                {downloading ? 'Downloading…' : pack ? 'Refresh Offline Copy' : 'Download Campaign'}
              </button>
              {pack && (
                <button type="button" className="rqk-offline-remove" onClick={remove} disabled={downloading}><Trash2 size={14} /> Remove</button>
              )}
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        className="rqk-offline-launcher"
        data-tone={pack?.failedSections ? 'warning' : pack ? 'ready' : 'default'}
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        title={playerMode ? 'Offline player campaign' : 'Offline campaign'}
      >
        {pack ? <CheckCircle2 size={16} /> : <Download size={16} />}
        <span>Offline</span>
      </button>
    </div>
  );
}
