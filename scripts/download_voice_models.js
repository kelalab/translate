const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');
const { execSync } = require('child_process');

const modelsDir = path.join(__dirname, '../models/voice');
const mmsDir = path.join(modelsDir, 'mms');
const binDir = path.join(__dirname, '../bin');

const whisperBinUrlWin = 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.8.4/whisper-bin-x64.zip';
const piperBinUrlWin = 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip';
const sherpaBinUrlWin = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.39/sherpa-onnx-v1.12.39-win-x64-static-MD-Release.tar.bz2';
const whisperModelUrl = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin';
const downloadFile = (url, destPath) => {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
            console.log(`[SKIP] ${path.basename(destPath)} already exists and is not empty.`);
            return resolve(destPath);
        }

        console.log(`[DOWNLOADING] ${url} to ${path.basename(destPath)}...`);
        const file = fs.createWriteStream(destPath);

        const request = https.get(url, (response) => {
            if ([301, 302, 307, 308].includes(response.statusCode)) {
                file.close();
                fs.unlinkSync(destPath);
                let loc = response.headers.location;
                if (loc.startsWith('/')) {
                    const parsedUrl = new URL(url);
                    loc = `${parsedUrl.protocol}//${parsedUrl.host}${loc}`;
                }
                downloadFile(loc, destPath).then(resolve).catch(reject);
            } else if (response.statusCode >= 300) {
                file.close();
                fs.unlinkSync(destPath);
                return reject(`Failed to get, status: ${response.statusCode}`);
            } else {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`[SUCCESS] ${path.basename(destPath)} downloaded.`);
                    resolve(destPath);
                });
            }
        }).on('error', (err) => {
            file.close();
            fs.unlinkSync(destPath);
            reject(err.message);
        });
    });
};

const unzipFile = (zipPath, extractTo) => {
    return new Promise((resolve, reject) => {
        try {
            console.log(`[EXTRACTING] ${path.basename(zipPath)}...`);
            if (!fs.existsSync(extractTo)) fs.mkdirSync(extractTo, { recursive: true });
            if (zipPath.endsWith('.tar.bz2')) {
                execSync(`tar -xf "${zipPath}" -C "${extractTo}"`, { stdio: 'inherit' });
            } else {
                const zip = new AdmZip(zipPath);
                zip.extractAllTo(extractTo, true);
            }
            console.log(`[SUCCESS] Extracted ${path.basename(zipPath)}`);
            resolve();
        } catch (e) {
            reject(e);
        }
    });
};

const setupDirs = () => {
    if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });
    if (!fs.existsSync(mmsDir)) fs.mkdirSync(mmsDir, { recursive: true });
    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });
};

const ttsModels = [
    { lang: 'en_US', url: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx' },
    { lang: 'fi_FI', url: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/fi/fi_FI/harri/medium/fi_FI-harri-medium.onnx' },
    { lang: 'sv_SE', url: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/sv/sv_SE/nst/medium/sv_SE-nst-medium.onnx' },
    { lang: 'ar_JO', url: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/ar/ar_JO/kareem/low/ar_JO-kareem-low.onnx' },
    { lang: 'ru_RU', url: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/ru/ru_RU/denis/medium/ru_RU-denis-medium.onnx' },
    { lang: 'uk_UA', url: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/uk/uk_UA/ukrainian_tts/medium/uk_UA-ukrainian_tts-medium.onnx' },
    { lang: 'fa_IR', url: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/fa/fa_IR/amir/medium/fa_IR-amir-medium.onnx' },
    { lang: 'ro_RO', url: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/ro/ro_RO/mihai/medium/ro_RO-mihai-medium.onnx' }
];

const mmsModels = [
    { lang: 'som', url: 'https://huggingface.co/willwade/mms-tts-multilingual-models-onnx/resolve/main/som/' },
    { lang: 'sqi', url: 'https://huggingface.co/willwade/mms-tts-multilingual-models-onnx/resolve/main/sqi/' },
    { lang: 'fin', url: 'https://huggingface.co/willwade/mms-tts-multilingual-models-onnx/resolve/main/fin/' }
];

async function run() {
    setupDirs();

    try {
        if (process.platform === 'win32') {
            // Download Binaries
            const whisperZip = path.join(binDir, 'whisper_win.zip');
            const piperZip = path.join(binDir, 'piper_win.zip');
            const sherpaZip = path.join(binDir, 'sherpa_win.tar.bz2');
            
            await downloadFile(whisperBinUrlWin, whisperZip);
            await downloadFile(piperBinUrlWin, piperZip);
            await downloadFile(sherpaBinUrlWin, sherpaZip);

            await unzipFile(whisperZip, path.join(binDir, 'whisper'));
            await unzipFile(piperZip, path.join(binDir, 'piper'));
            await unzipFile(sherpaZip, path.join(binDir, 'sherpa'));
            
            // Clean up zips
            if (fs.existsSync(whisperZip)) fs.unlinkSync(whisperZip);
            if (fs.existsSync(piperZip)) fs.unlinkSync(piperZip);
            if (fs.existsSync(sherpaZip)) fs.unlinkSync(sherpaZip);
        } else {
            console.warn("Only Windows binaries are automatically downloaded. Please compile Whisper/Piper manually on this OS.");
        }

        // Download Whisper Model
        await downloadFile(whisperModelUrl, path.join(modelsDir, 'ggml-small.bin'));

        // Download TTS Models and their configuration files
        for (const model of ttsModels) {
            try {
                const onnxPath = path.join(modelsDir, `${model.lang}.onnx`);
                const jsonPath = path.join(modelsDir, `${model.lang}.onnx.json`);
                await downloadFile(model.url, onnxPath);
                await downloadFile(model.url + '.json', jsonPath);
            } catch(e) {
                console.warn(`[WARN] Skipping ${model.lang} TTS model due to error: ${e}`);
            }
        }

        // Download MMS Models
        for (const model of mmsModels) {
            try {
                const langDir = path.join(mmsDir, model.lang);
                if (!fs.existsSync(langDir)) fs.mkdirSync(langDir, { recursive: true });
                await downloadFile(`${model.url}model.onnx`, path.join(langDir, 'model.onnx'));
                await downloadFile(`${model.url}tokens.txt`, path.join(langDir, 'tokens.txt'));
            } catch(e) {
                console.warn(`[WARN] Skipping ${model.lang} MMS model due to error: ${e}`);
            }
        }

        console.log("All Voice translation dependencies setup successfully.");
    } catch (e) {
        console.error(`[FATAL] Error during download:`, e.message || e);
    }
}

run();
