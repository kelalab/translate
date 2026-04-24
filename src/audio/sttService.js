const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const logger = require('../logger');


const BIN_DIR = path.join(__dirname, '../../bin/whisper');
const MODELS_DIR = path.join(__dirname, '../../models/voice');

// Determine path based on OS. Currently assuming Windows based on architecture setup.
const WHISPER_CLI = path.join(BIN_DIR, 'Release', 'whisper-cli.exe');
const WHISPER_MODEL = path.join(MODELS_DIR, 'ggml-small.bin');

/**
 * Perform STT on a 16kHz WAV PCM buffer
 * @param {Buffer} wavBuffer 
 * @param {string} sourceLang (e.g. 'fi', 'en', or 'auto')
 * @returns {Promise<string>} Transcribed text
 */
async function transcribeAudio(wavBuffer, sourceLang = 'auto') {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(WHISPER_CLI)) {
            return reject(new Error('Whisper CLI not found. Please run the download models script.'));
        }
        if (!fs.existsSync(WHISPER_MODEL)) {
            return reject(new Error('Whisper Model not found. Please run the download models script.'));
        }

        // Create temporary `.wav` file
        const tempId = crypto.randomUUID();
        const tempWavPath = path.join(os.tmpdir(), `translategemma_in_${tempId}.wav`);
        
        fs.writeFileSync(tempWavPath, wavBuffer);

        const args = [
            '-m', WHISPER_MODEL,
            '-f', tempWavPath,
            '-nt',          // no timestamps
            '-np'           // no prints (suppress progress output)
        ];

        // Ensure we pass the language if specified.
        if (sourceLang && sourceLang !== 'auto') {
            args.push('-l', sourceLang);
        }
        
        logger.info('STT', `Spawning Whisper CLI with lang: ${sourceLang}`);
        logger.debug('STT', `CLI Args: ${args.join(' ')}`);

        const ls = spawn(WHISPER_CLI, args);


        let outputStr = '';
        let errStr = '';

        ls.stdout.on('data', (data) => {
            outputStr += data.toString('utf8');
        });

        ls.stderr.on('data', (data) => {
            errStr += data.toString('utf8');
            logger.debug('STT-STDERR', data.toString('utf8').trim());
        });


        ls.on('error', (err) => {
            logger.error('STT', `Spawn Error: ${err.message}`);
            reject(err);
        });


        ls.on('close', (code) => {
            logger.info('STT', `Whisper process exited with code: ${code}`);
            try { fs.unlinkSync(tempWavPath); } catch(e) {}


            if (code !== 0) {
                console.error(`Whisper error: ${errStr}`);
                return reject(new Error(`Whisper closed with code ${code}`));
            }

            // Clean up whisper output: remove leading/trailing whitespace, newlines sometimes added
            const cleanResult = outputStr.trim().replace(/^\[.*\]\s*/g, ''); // replace timestamp tags if any slipped through
            logger.debug('STT', `Transcription result: "${cleanResult}"`);
            resolve(cleanResult);
        });

    });
}

module.exports = {
    transcribeAudio
};
