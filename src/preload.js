const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getLocalModelStatus: () => ipcRenderer.invoke('get-local-model-status'),
    getOllamaModels: () => ipcRenderer.invoke('get-ollama-models'),
    translateText: (sourceLang, targetLang, text, config) => ipcRenderer.invoke('translate-text', sourceLang, targetLang, text, config),
    detectLanguage: (text) => ipcRenderer.invoke('detect-language', text)
});
