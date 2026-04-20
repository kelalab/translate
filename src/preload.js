const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getLocalModelStatus: () => ipcRenderer.invoke('get-local-model-status'),
    getAdvancedApiFlag: () => ipcRenderer.invoke('get-advanced-api-flag'),
    checkProvider: (endpoint, apiKey) => ipcRenderer.invoke('check-provider', endpoint, apiKey),
    translateText: (sourceLang, targetLang, text, config) => ipcRenderer.invoke('translate-text', sourceLang, targetLang, text, config),
    detectLanguage: (text) => ipcRenderer.invoke('detect-language', text)
});
