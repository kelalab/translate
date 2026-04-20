const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getFilePath: (file) => {
        return webUtils && webUtils.getPathForFile ? webUtils.getPathForFile(file) : file.path;
    },
    getLocalModelStatus: () => ipcRenderer.invoke('get-local-model-status'),
    getAdvancedApiFlag: () => ipcRenderer.invoke('get-advanced-api-flag'),
    checkProvider: (endpoint, apiKey) => ipcRenderer.invoke('check-provider', endpoint, apiKey),
    translateText: (sourceLang, targetLang, text, config) => ipcRenderer.invoke('translate-text', sourceLang, targetLang, text, config),
    detectLanguage: (text) => ipcRenderer.invoke('detect-language', text),
    processDocument: (filePath, sourceLang, targetLang, config) => ipcRenderer.invoke('process-document', filePath, sourceLang, targetLang, config),
    saveDocumentDialog: (buffer, ext) => ipcRenderer.invoke('save-document-dialog', buffer, ext),
    onDocumentProgress: (callback) => ipcRenderer.on('doc-progress', (_event, data) => callback(data))
});
