const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const inference = require('./llm/inference');
const documentParser = require('./documentParser');
const { transcribeAudio } = require('./audio/sttService');
const { generateSpeech } = require('./audio/ttsService');
const LanguageDetect = require('languagedetect');
const lngDetector = new LanguageDetect();
const logger = require('./logger');


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
    logger.info('MAIN', 'Window created and index.html loaded.');


    
    // Catch renderer process crashes
    mainWindow.webContents.on('render-process-gone', (event, details) => {
        logger.error('CRASH', `Renderer process gone: ${details.reason} (exit code: ${details.exitCode})`);
    });
}



app.whenReady().then(() => {
    logger.info('MAIN', 'Application ready. Creating window...');
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            logger.info('MAIN', 'App activated, creating new window.');
            createWindow();
        }
    });
});

app.on('window-all-closed', function () {
    logger.info('MAIN', 'All windows closed.');
    if (process.platform !== 'darwin') {
        logger.info('MAIN', 'Quitting application.');
        app.quit();
    }
});


// Register IPC handlers
ipcMain.handle('log-to-file', (event, category, message, level = 'INFO') => {
    if (level === 'ERROR') logger.error(category, message);
    else if (level === 'WARN') logger.warn(category, message);
    else if (level === 'DEBUG') logger.debug(category, message);
    else logger.info(category, message);
});



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

ipcMain.handle('get-debug-flag', () => {
    return process.argv.includes('--enable-debug') || 
           app.commandLine.hasSwitch('enable-debug') || 
           process.env.DEBUG === '1';
});


ipcMain.handle('check-provider', async (event, endpoint, apiKey) => {
    return await inference.checkProvider(endpoint, apiKey);
});

ipcMain.handle('translate-text', async (event, sourceLang, targetLang, text, config) => {
    return await inference.translateText(sourceLang, targetLang, text, config);
});

ipcMain.handle('summarize-conversation', async (event, conversationLog, targetLang, config) => {
    return await inference.summarizeConversation(conversationLog, targetLang, config);
});

ipcMain.handle('transcribe-audio', async (event, audioBuffer, sourceLang) => {
    return await transcribeAudio(audioBuffer, sourceLang);
});

ipcMain.handle('generate-speech', async (event, text, targetLang) => {
    return await generateSpeech(text, targetLang);
});

ipcMain.handle('reset-llm-context', async () => {
    await inference.resetLocalContext();
    return true;
});

ipcMain.on('cancel-processing', () => {
    documentParser.cancelCurrentJob = true;
});

ipcMain.handle('detect-language', async (event, text) => {
    if (!text || text.trim().length < 2) return null;

    // Fast-path regex checks for languages not supported by `languagedetect` like CJK
    if (text.match(/[\u3040-\u309f\u30a0-\u30ff]/)) return "Japanese"; // Hiragana/Katakana
    if (text.match(/[\u4e00-\u9faf]/)) return "Chinese"; // CJK Unified Ideographs
    if (text.match(/[\u0600-\u06ff]/) && !text.match(/[a-zA-Z]/)) {
        // Simple fallback for Arabic/Persian scripts if languagedetect fails
        const results = lngDetector.detect(text, 1);
        if (results && results.length > 0) {
            const lang = results[0][0];
            return lang.charAt(0).toUpperCase() + lang.slice(1);
        }
        return "Persian"; // Fallback to Persian if not recognized as Arabic
    }

    const results = lngDetector.detect(text, 1);
    if (results && results.length > 0) {
        const lang = results[0][0];
        // Ensure it's capitalized properly: 'english' -> 'English'
        return lang.charAt(0).toUpperCase() + lang.slice(1);
    }
    return null;
});

ipcMain.handle('process-document', async (event, filePath, sourceLang, targetLang, config) => {
    try {
        const result = await documentParser.processDocument(filePath, sourceLang, targetLang, config, (msg) => {
            event.sender.send('doc-progress', { status: msg });
        });
        return { success: true, ...result };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('save-document-dialog', async (event, buffer, defaultExtension) => {
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Translated Document',
        defaultPath: 'translated_document' + defaultExtension,
        filters: [
            { name: defaultExtension === '.docx' ? 'Word Document' : 'Text File', extensions: [defaultExtension.replace('.', '')] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (filePath) {
        require('fs').writeFileSync(filePath, Buffer.from(buffer));
        return { success: true, filePath };
    }
    return { success: false, canceled: true };
});

ipcMain.handle('save-debug-artifacts', async (event, data) => {
    try {
        const fs = require('fs');
        const debugDir = path.join(process.cwd(), 'debug');
        if (!fs.existsSync(debugDir)) {
            fs.mkdirSync(debugDir, { recursive: true });
        }

        const baseFilename = `page_${data.page}`;
        if (data.image) {
            const base64Data = data.image.replace(/^data:image\/png;base64,/, "");
            fs.writeFileSync(path.join(debugDir, `${baseFilename}.png`), base64Data, 'base64');
        }
        if (data.rawText) {
            fs.writeFileSync(path.join(debugDir, `${baseFilename}_raw.txt`), data.rawText, 'utf8');
        }
        if (data.translatedText) {
            fs.writeFileSync(path.join(debugDir, `${baseFilename}_translated.txt`), data.translatedText, 'utf8');
        }

        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
