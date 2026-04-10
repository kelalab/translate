const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const inference = require('./llm/inference');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        autoHideMenuBar: true
    });

    mainWindow.loadFile('src/index.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// Register IPC handlers
ipcMain.handle('get-local-model-status', async () => {
    return await inference.initLocalModel();
});

ipcMain.handle('get-ollama-models', async () => {
    return await inference.fetchOllamaModels();
});

ipcMain.handle('translate-text', async (event, sourceLang, targetLang, text, config) => {
    return await inference.translateText(sourceLang, targetLang, text, config);
});
