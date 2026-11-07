const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('campus', Object.freeze({
  call: async (action, payload = {}) => {
    const response = await ipcRenderer.invoke('campus:action', { action, payload });
    if (!response.ok) throw new Error(response.error || '操作未完成，请重试。');
    return response.data;
  },
  onProgress: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('campus:progress', listener);
    return () => ipcRenderer.removeListener('campus:progress', listener);
  }
}));
