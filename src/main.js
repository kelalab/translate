const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const inference = require('./llm/inference');
const LanguageDetect = require('languagedetect');
const lngDetector = new LanguageDetect();

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

ipcMain.handle('get-advanced-api-flag', () => {
    const hasFlag = process.argv.some(arg => arg.includes('enable-external-api') || arg.includes('advanced-api')) ||
           app.commandLine.hasSwitch('enable-external-api') ||
           app.commandLine.hasSwitch('advanced-api') ||
           process.env.ADVANCED_API === '1' || process.env.ENABLE_EXTERNAL_API === '1';
    return hasFlag;
});

ipcMain.handle('check-provider', async (event, endpoint, apiKey) => {
    return await inference.checkProvider(endpoint, apiKey);
});

ipcMain.handle('translate-text', async (event, sourceLang, targetLang, text, config) => {
    return await inference.translateText(sourceLang, targetLang, text, config);
});

ipcMain.handle('detect-language', async (event, text) => {
    if (!text || text.trim().length < 2) return null;
    const results = lngDetector.detect(text, 1);
    if (results && results.length > 0) {
        const lang = results[0][0];
        // Ensure it's capitalized properly: 'english' -> 'English'
        return lang.charAt(0).toUpperCase() + lang.slice(1);
    }
    return null;
});
