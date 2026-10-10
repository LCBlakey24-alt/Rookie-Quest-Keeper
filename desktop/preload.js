const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rookieDesktop', Object.freeze({
  offline: true,
  platform: process.platform,
  edition: 'desktop',
  importCampaignPack: () => ipcRenderer.invoke('rqk:import-campaign-pack'),
}));
