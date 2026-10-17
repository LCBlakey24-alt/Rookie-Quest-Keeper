import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DESKTOP_STORAGE_KEY } from './previewMode';
import './desktopMaintenance.css';

function readableTime(iso) {
  try { return new Date(iso).toLocaleString(); }
  catch { return String(iso || ''); }
}

export default function DesktopMaintenance() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState({
    state: 'idle', installed_version: '—', available_version: null,
    progress: 0, message: 'Check for updates when you are ready.',
  });
  const [backups, setBackups] = useState([]);
  const [working, setWorking] = useState('');
  const [notice, setNotice] = useState('');
  const desktop = typeof window === 'undefined' ? null : window.rookieDesktop;

  useEffect(() => {
    if (!desktop) return undefined;
    let mounted = true;
    desktop.getUpdateStatus?.().then(value => { if (mounted && value) setStatus(value); }).catch(() => {});
    const off = desktop.onUpdateStatus?.(value => { if (mounted && value) setStatus(value); });
    return () => { mounted = false; off?.(); };
  }, [desktop]);

  useEffect(() => {
    if (!open) return undefined;
    const onEscape = event => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [open]);

  const refreshBackups = async () => {
    const data = await desktop.listBackups();
    setBackups(Array.isArray(data) ? data : []);
  };

  const show = () => {
    setNotice('');
    setOpen(true);
    refreshBackups().catch(() => setNotice('Unable to read local backups.'));
  };

  const doWork = async (name, operation) => {
    if (working) return;
    setWorking(name);
    setNotice('');
    try { await operation(); }
    catch (error) { setNotice(error?.message || 'That action could not be completed.'); }
    finally { setWorking(''); }
  };

  const makeBackup = () => doWork('backup', async () => {
    const raw = localStorage.getItem(DESKTOP_STORAGE_KEY);
    if (!raw) throw new Error('No saved workspace yet. Create or import a campaign first.');
    const info = await desktop.createBackup(raw, 'manual');
    await refreshBackups();
    setNotice(`Backup saved on this computer: ${readableTime(info.created_at)}.`);
  });

  const exportPortable = () => doWork('export', async () => {
    const raw = localStorage.getItem(DESKTOP_STORAGE_KEY);
    if (!raw) throw new Error('No saved workspace yet. Create or import a campaign first.');
    const result = await desktop.exportPortableBackup(raw);
    if (result?.canceled) return;
    await refreshBackups();
    setNotice('Complete backup exported to your chosen folder. Keep that folder and its contents together on a USB stick or another drive.');
  });

  const restorePortable = () => {
    if (!window.confirm('Restore a portable Keeper backup? This will replace the active workspace after saving a safety copy of your current campaign.')) return;
    doWork('portable-restore', async () => {
      const result = await desktop.restorePortableBackup(localStorage.getItem(DESKTOP_STORAGE_KEY));
      if (result?.canceled) return;
      localStorage.setItem(DESKTOP_STORAGE_KEY, result.workspace);
      window.location.reload();
    });
  };

  const restore = backup => {
    if (!window.confirm(`Restore backup from ${readableTime(backup.created_at)}? This replaces the current Keeper workspace. Keeper will save a safety copy of your current data first.`)) return;
    doWork('restore', async () => {
      const result = await desktop.restoreBackup(backup.id, localStorage.getItem(DESKTOP_STORAGE_KEY));
      // A failed browser save must not trigger a reload.
      localStorage.setItem(DESKTOP_STORAGE_KEY, result.workspace);
      window.location.reload();
    });
  };

  const install = () => {
    if (!window.confirm('Install this update and restart Keeper? Your campaign and imported files will be backed up first.')) return;
    doWork('install', async () => {
      await desktop.installUpdate(localStorage.getItem(DESKTOP_STORAGE_KEY));
    });
  };

  if (!desktop?.offline) return null;

  const busy = Boolean(working) || status.state === 'installing' || status.state === 'downloading';
  const checking = status.state === 'checking';
  const downloading = status.state === 'downloading';

  return (
    <>
      <button type="button" onClick={show} className="rqk-desktop-maintenance-trigger">
        Updates &amp; backups
      </button>
      {open && createPortal(
        <div className="rqk-desktop-maintenance-backdrop">
          <section className="rqk-desktop-maintenance" role="dialog" aria-modal="true" aria-label="Desktop updates and backups">
            <header className="rqk-desktop-maintenance-header">
              <div>
                <strong>Keeper updates &amp; backups</strong>
                <p>Manage Windows updates and protect your offline campaigns.</p>
              </div>
              <button type="button" className="rqk-desktop-maintenance-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </header>
            <div className="rqk-desktop-maintenance-section">
              <h3>Windows app</h3>
              <p>Installed version: <strong>{status.installed_version}</strong></p>
              {status.available_version && <p>Available version: <strong>{status.available_version}</strong></p>}
              <p role="status" aria-live="polite">{status.message}</p>
              {status.state === 'portable' && <p>Portable USB edition: download the next portable .exe, close Keeper, and replace the old .exe on the same USB drive. Leave the <strong>RookieQuestKeeperData</strong> folder untouched. Back up your USB before major updates.</p>}
              {downloading && <progress value={status.progress} max="100" aria-label="Update download progress" />}
              <div className="rqk-desktop-maintenance-actions">
                {status.state !== 'portable' && <button type="button" disabled={busy || checking || status.state === 'downloaded'} onClick={() => doWork('check', () => desktop.checkUpdates())}>Check for updates</button>}
                {status.state === 'available' && <button type="button" disabled={busy} onClick={() => doWork('download', () => desktop.downloadUpdate())}>Download update</button>}
                {status.state === 'downloaded' && <button type="button" disabled={busy} onClick={install}>Back up, install &amp; restart</button>}
              </div>
            </div>
            <div className="rqk-desktop-maintenance-section">
              <h3>Campaign backups</h3>
              <p>Backups include your saved campaigns, characters, notes and locally imported files. They stay on this PC, not in GitHub.</p>
              <div className="rqk-desktop-maintenance-actions">
                <button type="button" disabled={busy} onClick={makeBackup}>Back up now</button>
                <button type="button" disabled={busy} onClick={exportPortable}>Export backup to USB / folder</button>
                <button type="button" disabled={busy} onClick={restorePortable}>Restore from saved folder</button>
                <button type="button" disabled={busy} onClick={() => doWork('list', refreshBackups)}>Refresh backups</button>
              </div>
              {backups.length === 0
                ? <p>No local backups have been created yet.</p>
                : <div className="rqk-desktop-maintenance-backups">
                    {backups.slice(0, 12).map(backup => (
                      <div key={backup.id} className="rqk-desktop-maintenance-backup">
                        <span>{readableTime(backup.created_at)} · {backup.reason} · {backup.campaign_count} campaign(s)</span>
                        <button type="button" disabled={busy} onClick={() => restore(backup)}>Restore</button>
                      </div>
                    ))}
                  </div>}
              <p className="rqk-desktop-maintenance-note">Before installing an update, Keeper backs up your workspace automatically. Use Export backup to USB / folder for a separate portable copy containing your campaigns and imported media. Do not move, rename or remove individual files inside that exported backup folder.</p>
            </div>
            {notice && <p className="rqk-desktop-maintenance-notice" role="alert">{notice}</p>}
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
