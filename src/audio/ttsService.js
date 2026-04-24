const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const logger = require('../logger');


const BIN_DIR = path.join(__dirname, '../../bin');
const MODELS_DIR = path.join(__dirname, '../../models/voice');
const MMS_MODELS_DIR = path.join(MODELS_DIR, 'mms');

const PIPER_CLI = path.join(BIN_DIR, 'piper', 'piper', 'piper.exe');
const SHERPA_CLI = path.join(BIN_DIR, 'sherpa', 'sherpa-onnx-v1.12.39-win-x64-static-MD-Release', 'bin', 'sherpa-onnx-offline-tts.exe');

// Language to model name mapping based on the downloader script
const LANG_MAP = {
    'en': 'en_US',
    'fi': 'fi_FI',
    'sv': 'sv_SE',
    'ar': 'ar_JO',
    'ru': 'ru_RU',
    'uk': 'uk_UA',
    'fa': 'fa_IR',
    'ro': 'ro_RO',
};

const SHERPA_LANG_MAP = {
    'som': 'som',
    'sqi': 'sqi',
};

/**
 * Perform TTS on a given text sequence
 * @param {string} text 
 * @param {string} targetLang (e.g. 'fi', 'en', 'ar')
 * @returns {Promise<Buffer>} The output WAV audio buffer
 */
async function generateSpeech(text, targetLang) {
    return new Promise((resolve, reject) => {
        const isSherpa = !!SHERPA_LANG_MAP[targetLang];
        const modelIso = isSherpa ? SHERPA_LANG_MAP[targetLang] : LANG_MAP[targetLang];
        
        if (!modelIso) {
            logger.error('TTS', `TTS model for language '${targetLang}' not mapped or supported.`);
            return reject(new Error(`TTS model for language '${targetLang}' not mapped or supported.`));
        }

        logger.info('TTS', `Starting speech generation for lang: ${targetLang} (Engine: ${isSherpa ? 'Sherpa' : 'Piper'})`);
        logger.debug('TTS', `Input text: "${text}"`);


        const tempId = crypto.randomUUID();
        const tempWavPath = path.join(os.tmpdir(), `translategemma_out_${tempId}.wav`);
        
        // Safety: Prevent Piper from crashing via Buffer Overrun when fed unsupported foreign alphabets
        if (['en', 'fi', 'sv', 'ro'].includes(targetLang)) {
            const hasCyrillicOrArabic = /[\u0400-\u04FF\u0600-\u06FF]/.test(text);
            if (hasCyrillicOrArabic) {
                logger.error('TTS', `Aborting TTS: Input contains Cyrillic/Arabic chars but engine is set to ${targetLang}`);
                return reject(new Error("Translation failure detected: output contains unsupported Cyrillic/Arabic characters. TTS aborted to prevent engine crash."));
            }
        }

        
        let engineExecutable = null;
        let args = [];
        let useStdin = true;

        if (isSherpa) {
            if (!fs.existsSync(SHERPA_CLI)) return reject(new Error('Sherpa CLI not found. Download the models.'));
            const modelJsonDir = path.join(MMS_MODELS_DIR, modelIso);
            const onnxPath = path.join(modelJsonDir, `model.onnx`);
            const tokensPath = path.join(modelJsonDir, `tokens.txt`);
            if (!fs.existsSync(onnxPath)) return reject(new Error(`Sherpa Model for ${targetLang} not found.`));
            
            engineExecutable = SHERPA_CLI;
            args = [
                `--vits-model=${onnxPath}`,
                `--vits-tokens=${tokensPath}`,
                `--output-filename=${tempWavPath}`,
                `"${text.replace(/"/g, '\\"')}"`
            ];
            useStdin = false; // Sherpa takes text as cmd arg
        } else {
            if (!fs.existsSync(PIPER_CLI)) return reject(new Error('Piper CLI not found.'));
            const onnxPath = path.join(MODELS_DIR, `${modelIso}.onnx`);
            if (!fs.existsSync(onnxPath)) return reject(new Error(`Piper Model for ${targetLang} not found.`));

            engineExecutable = PIPER_CLI;
            args = [
                '--model', onnxPath,
                '--output_file', tempWavPath
            ];
        }

        logger.debug('TTS', `Spawning ${engineExecutable} with args: ${args.join(' ')}`);
        const ls = spawn(engineExecutable, args, { 
            shell: !useStdin,
            cwd: path.dirname(engineExecutable)
        });

        let errStr = '';

        ls.stderr.on('data', (data) => {
            errStr += data.toString('utf8');
            logger.debug('TTS-STDERR', data.toString('utf8').trim());
        });


        ls.on('close', (code) => {
            if (code !== 0) {
                if (fs.existsSync(tempWavPath)) fs.unlinkSync(tempWavPath);
                logger.error('TTS', `TTS process failed with code ${code}. Error: ${errStr}`);
                return reject(new Error(`${isSherpa ? 'Sherpa' : 'Piper'} closed with code ${code}`));
            }

            try {
                // Read the generated file into a buffer
                const pcmBuffer = fs.readFileSync(tempWavPath);
                fs.unlinkSync(tempWavPath); // clean up
                logger.info('TTS', `Speech generation successful. Buffer size: ${pcmBuffer.length} bytes`);
                resolve(pcmBuffer);
            } catch (e) {
                logger.error('TTS', `Failed to read output WAV: ${e.message}`);
                reject(e);
            }
        });


        if (useStdin) {
            ls.stdin.write(text, 'utf-8');
            ls.stdin.end();
        }
    });
}

module.exports = {
    generateSpeech
};
