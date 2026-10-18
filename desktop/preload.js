const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rookieDesktop', Object.freeze({
  offline: true,
  platform: process.platform,
  edition: 'desktop',
  importCampaignPack: (workspaceRaw) => ipcRenderer.invoke('rqk:import-campaign-pack', workspaceRaw),
  getUpdateStatus: () => ipcRenderer.invoke('rqk:get-update-status'),
  checkUpdates: () => ipcRenderer.invoke('rqk:check-updates'),
  downloadUpdate: () => ipcRenderer.invoke('rqk:download-update'),
  installUpdate: (workspaceRaw) => ipcRenderer.invoke('rqk:install-update', workspaceRaw),
  selectProgramUpdate: () => ipcRenderer.invoke('rqk:select-program-update'),
  installProgramUpdate: (workspaceRaw, expectedSha256) => ipcRenderer.invoke('rqk:install-program-update', workspaceRaw, expectedSha256),
  onUpdateStatus: (listener) => {
    if (typeof listener !== 'function') return () => {};
    const handler = (_event, status) => listener(status);
    ipcRenderer.on('rqk:update-status', handler);
    return () => ipcRenderer.removeListener('rqk:update-status', handler);
  },
  createBackup: (workspaceRaw, reason = 'manual') => ipcRenderer.invoke('rqk:create-backup', workspaceRaw, reason),
  listBackups: () => ipcRenderer.invoke('rqk:list-backups'),
  restoreBackup: (id, currentRaw) => ipcRenderer.invoke('rqk:restore-backup', id, currentRaw),
  exportPortableBackup: (workspaceRaw) => ipcRenderer.invoke('rqk:export-portable-backup', workspaceRaw),
  restorePortableBackup: (currentRaw) => ipcRenderer.invoke('rqk:restore-portable-backup', currentRaw),
}));
