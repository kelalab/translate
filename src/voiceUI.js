// src/voiceUI.js
const logger = {
    info: (cat, msg) => { if (window.api && window.api.logDebug) window.api.logDebug(cat, msg, 'INFO'); else console.log(`[${cat}] ${msg}`); },
    warn: (cat, msg) => { if (window.api && window.api.logDebug) window.api.logDebug(cat, msg, 'WARN'); else console.warn(`[${cat}] ${msg}`); },
    error: (cat, msg) => { if (window.api && window.api.logDebug) window.api.logDebug(cat, msg, 'ERROR'); else console.error(`[${cat}] ${msg}`); },
    debug: (cat, msg) => { if (window.api && window.api.logDebug) window.api.logDebug(cat, msg, 'DEBUG'); else console.debug(`[${cat}] ${msg}`); }
};



let audioStream = null;
let audioContext = null;
let mediaStreamSource = null;
let processor = null;
let pcmData = [];
let speechRecordingActive = false;
let speechProcessingActive = false;
let currentSpeechRole = null; // 'source' or 'target'
let dialogueLog = []; // Stores { role: 'You' | 'Customer', text: string }

const instructionEl = document.getElementById('speech-instruction');
const spinnerEl = document.getElementById('speech-spinner');
const transcriptEl = document.getElementById('speech-transcript');
const translationEl = document.getElementById('speech-translation');

const sourceBtn = document.getElementById('btn-record-source');
const targetBtn = document.getElementById('btn-record-target');

const sourceLangSelect = document.getElementById('speech-source-lang-select');
const targetLangSelect = document.getElementById('speech-target-lang-select');

// Quick map for renderer languages
function getLangCode(dropdown) {
    const text = dropdown.dataset.trueValue || dropdown.querySelector('.select-selected').textContent.trim();
    // Assuming matching is simplistic based on the text. 
    // Usually renderer.js maps languages. Let's do a basic map for the MVP speech langs.
    const map = {
        'English': 'en',
        'Finnish': 'fi',
        'Swedish': 'sv',
        'Arabic': 'ar',
        'Russian': 'ru',
        'Ukrainian': 'uk',
        'Dari': 'fa',
        'Persian': 'fa',
        'Romanian': 'ro',
        'Somali': 'som',
        'Kurdish': null,
        'Albanian': 'sqi'
    };
    return map[text] !== undefined ? map[text] : 'en';
}

async function startRecording(role) {
    if (speechRecordingActive || speechProcessingActive) return;
    logger.info('AUDIO', `Starting recording for role: ${role}`);
    speechRecordingActive = true;

    currentSpeechRole = role;
    pcmData = [];

    instructionEl.style.display = 'block';
    transcriptEl.style.display = 'none';
    translationEl.style.display = 'none';
    spinnerEl.style.display = 'block';
    
    const tKey = role === 'source' ? "speechListeningYou" : "speechListeningCust";
    instructionEl.innerText = window.Locale ? window.Locale.t(tKey) : `Listening to...`;

    sourceBtn.classList.remove('recording');
    targetBtn.classList.remove('recording');
    if (role === 'source') sourceBtn.classList.add('recording');
    else targetBtn.classList.add('recording');

    try {
        if (!audioStream) {
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        }
        
        // Create fresh context each time for reliability, but we must close it later
        audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        mediaStreamSource = audioContext.createMediaStreamSource(audioStream);
        processor = audioContext.createScriptProcessor(4096, 1, 1);
        
        mediaStreamSource.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = function (e) {
            if (!speechRecordingActive) return;
            const channelData = e.inputBuffer.getChannelData(0);
            pcmData.push(new Float32Array(channelData));
        };
    } catch (e) {
        logger.error('AUDIO', `Recording failed to start: ${e.message}`);
        console.error("Recording error:", e);

        speechRecordingActive = false;
        spinnerEl.style.display = 'none';
        instructionEl.style.display = 'block';
        instructionEl.innerText = 'Microphone access denied or failed.';
    }
}

async function stopRecording() {
    if (!speechRecordingActive) return;
    logger.info('AUDIO', 'Stopping recording...');
    speechRecordingActive = false;

    
    sourceBtn.classList.remove('recording');
    targetBtn.classList.remove('recording');
    
    if (speechProcessingActive) return;
    speechProcessingActive = true;

    // Clean up processor and context
    if (processor) {
        processor.disconnect();
        processor.onaudioprocess = null;
    }
    if (mediaStreamSource) {
        mediaStreamSource.disconnect();
    }
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
    }

    instructionEl.innerText = window.Locale ? window.Locale.t('speechProcessing') : 'Processing Audio...';

    // Flatten float data
    let totalLength = 0;
    for (let i = 0; i < pcmData.length; i++) totalLength += pcmData[i].length;

    const durationSec = totalLength / 16000;
    logger.debug('AUDIO', `Captured ${totalLength} samples (~${durationSec.toFixed(2)}s)`);

    // Minimum duration guard: require at least 0.5 seconds (8000 samples at 16kHz)
    // Shorter clips cause Whisper to hallucinate common words ("kiitos", "you", etc.)
    const MIN_SAMPLES = 8000;
    if (totalLength < MIN_SAMPLES) {
        logger.warn('AUDIO', `Recording rejected: too short (${totalLength} samples)`);

        speechProcessingActive = false;
        spinnerEl.style.display = 'none';
        instructionEl.style.display = 'block';
        instructionEl.innerText = window.Locale ? window.Locale.t('speechInst') : 'Hold a button below to speak';
        transcriptEl.style.display = 'none';
        translationEl.style.display = 'none';
        return;
    }

    
    let result = new Float32Array(totalLength);
    let offset = 0;
    for (let i = 0; i < pcmData.length; i++) {
        result.set(pcmData[i], offset);
        offset += pcmData[i].length;
    }

    // Downsample to 16000Hz if needed (browser may not honor the requested 16kHz)
    const inputSampleRate = audioContext.sampleRate;
    if (inputSampleRate !== 16000) {
        const ratio = inputSampleRate / 16000;
        const newLength = Math.round(result.length / ratio);
        const downsampled = new Float32Array(newLength);
        for (let i = 0; i < newLength; i++) {
            downsampled[i] = result[Math.round(i * ratio)] || 0;
        }
        logger.debug('AUDIO', `Downsampled from ${inputSampleRate}Hz to 16000Hz`);
        result = downsampled;
    }


    // RMS energy check: reject silent/near-silent recordings before sending to Whisper.
    let sumSq = 0;
    for (let i = 0; i < result.length; i++) sumSq += result[i] * result[i];
    const rms = Math.sqrt(sumSq / result.length);
    logger.debug('AUDIO', `Captured RMS: ${rms.toFixed(5)} (Threshold: 0.004)`);

    if (rms < 0.004) {
        logger.warn('AUDIO', `Recording rejected: silence detected (RMS: ${rms.toFixed(5)})`);


        speechProcessingActive = false;
        spinnerEl.style.display = 'none';
        instructionEl.style.display = 'block';
        instructionEl.innerText = window.Locale ? window.Locale.t('speechInst') : 'Hold a button below to speak';
        transcriptEl.style.display = 'none';
        translationEl.style.display = 'none';
        return;
    }


    // Convert to 16-bit PCM WAV
    const wavBuffer = encodeWAV(result, 16000);


    // Call APIs
    const role = currentSpeechRole;
    const sourceCode = getLangCode(sourceLangSelect);
    const targetCode = getLangCode(targetLangSelect);
    
    const sourceName = sourceLangSelect.dataset.trueValue || sourceLangSelect.querySelector('.select-selected').textContent.trim();
    const targetName = targetLangSelect.dataset.trueValue || targetLangSelect.querySelector('.select-selected').textContent.trim();

    const audioInputLang = role === 'source' ? sourceCode : targetCode;
    const audioTargetLang = role === 'source' ? targetCode : sourceCode;
    
    const llmSourceLang = role === 'source' ? sourceName : targetName;
    const llmTargetLang = role === 'source' ? targetName : sourceName;

    try {
        // 1. Transcribe
        logger.info('STT', `Sending audio for transcription (Lang: ${audioInputLang})`);
        const transcribedText = await window.api.transcribeAudio(wavBuffer, audioInputLang);
        
        logger.info('STT', `Transcription result: "${transcribedText}"`);
        transcriptEl.style.display = 'block';

        transcriptEl.innerText = transcribedText || (window.Locale ? window.Locale.t('speechNoHear') : "(Could not hear anything)");

        if (transcribedText) {
            instructionEl.innerText = window.Locale ? window.Locale.t('speechTranslating') : 'Translating...';

            // Extract engine configuration globally from settings
            const engineSelect = document.getElementById('engine-select');
            const engineVal = engineSelect ? engineSelect.value : 'local';
            const config = { engine: 'local' };
            
            if (engineVal.startsWith('api:')) {
                config.engine = 'api';
                try {
                    const decoded = JSON.parse(atob(engineVal.split(':')[1]));
                    let providers = JSON.parse(localStorage.getItem('apiProviders') || '[]');
                    if (!providers.find(p => p.id === 'default-ollama')) {
                        providers.unshift({ id: 'default-ollama', endpoint: 'http://localhost:11434/v1', apiKey: '' });
                    }
                    const p = providers.find(x => x.id === decoded.providerId);
                    if (p) {
                        config.endpoint = p.endpoint;
                        config.apiKey = p.apiKey;
                        config.modelName = decoded.model;
                    }
                } catch(e) {}
            }

            // 2. Translate
            logger.info('TRANS', `Translating transcribed text (${llmSourceLang} -> ${llmTargetLang}) using ${config.engine}...`);
            const translatedMsg = await window.api.translateText(llmSourceLang, llmTargetLang, transcribedText, config);
            const translatedText = translatedMsg.translatedText || "(Translation Error)";

            logger.info('TRANS', `Translation result: "${translatedText}"`);
            translationEl.style.display = 'block';

            translationEl.innerText = translatedText;

            // 3. TTS
            instructionEl.innerText = window.Locale ? window.Locale.t('speechGenerating') : 'Generating Speech...';
            try {
                logger.info('TTS', `Generating speech for translation (Lang: ${audioTargetLang})`);
                const ttsWavBuffer = await window.api.generateSpeech(translatedText, audioTargetLang);
                playWavBlob(ttsWavBuffer);
            } catch (err) {
                logger.error('TTS', `TTS failed: ${err.message}`);
                console.error("TTS generation failed or unsupported language:", err);
            }


            // Log the interaction
            dialogueLog.push({ 
                role: role === 'source' ? 'CSR' : 'Customer', 
                text: transcribedText 
            });
        }
    } catch (e) {
        logger.error('VOICE', `Speech pipeline fatal error: ${e.message}`);
        console.error("Speech pipeline error:", e);
        instructionEl.style.display = 'block';
        instructionEl.innerText = window.Locale ? window.Locale.t('speechError') : 'An error occurred during processing.';
    } finally {

        speechProcessingActive = false;
        spinnerEl.style.display = 'none';
        instructionEl.style.display = 'block';
        instructionEl.innerText = window.Locale ? window.Locale.t('speechInst') : 'Hold a button below to speak';
    }
}

function playWavBlob(bufferArray) {
    const blob = new Blob([bufferArray], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
}

function encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // RIFF chunk length
    view.setUint32(4, 36 + samples.length * 2, true);
    // RIFF type
    writeString(view, 8, 'WAVE');
    // format chunk identifier
    writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count (mono)
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, samples.length * 2, true);

    // Write the PCM samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Uint8Array(buffer); // sending typed array over IPC
}

sourceBtn.addEventListener('mousedown', () => startRecording('source'));
sourceBtn.addEventListener('mouseup', () => stopRecording());
sourceBtn.addEventListener('mouseleave', () => stopRecording());

targetBtn.addEventListener('mousedown', () => startRecording('target'));
targetBtn.addEventListener('mouseup', () => stopRecording());
targetBtn.addEventListener('mouseleave', () => stopRecording());

// End Session / Summarization logic
const endSessionBtn = document.getElementById('btn-end-session');
const memoModal = document.getElementById('memo-modal');
const closeMemoBtn = document.getElementById('close-memo');
const closeMemoBottomBtn = document.getElementById('btn-close-memo-bottom');

const memoContentCsr = document.getElementById('memo-content-csr');
const memoContentCust = document.getElementById('memo-content-cust');
const memoLangCsr = document.getElementById('memo-lang-csr');
const memoLangCust = document.getElementById('memo-lang-cust');

async function handleEndSession() {
    if (dialogueLog.length === 0) return;
    if (speechProcessingActive) return;

    speechProcessingActive = true;
    instructionEl.innerText = window.Locale ? window.Locale.t('speechSummarizing') : 'Summarizing session...';
    spinnerEl.style.display = 'block';

    const sourceName = sourceLangSelect.dataset.trueValue || sourceLangSelect.querySelector('.select-selected').textContent.trim();
    const targetName = targetLangSelect.dataset.trueValue || targetLangSelect.querySelector('.select-selected').textContent.trim();

    // Engine config
    const engineSelect = document.getElementById('engine-select');
    const engineVal = engineSelect ? engineSelect.value : 'local';
    const config = { engine: 'local' };
    if (engineVal.startsWith('api:')) {
        config.engine = 'api';
        try {
            const decoded = JSON.parse(atob(engineVal.split(':')[1]));
            let providers = JSON.parse(localStorage.getItem('apiProviders') || '[]');
            const p = providers.find(x => x.id === decoded.providerId);
            if (p) {
                config.endpoint = p.endpoint;
                config.apiKey = p.apiKey;
                config.modelName = decoded.model;
            }
        } catch(e) {}
    }

    try {
        // Run summaries sequentially (to avoid context switching issues in local LLM)
        const summaryCsrMsg = await window.api.summarizeConversation(dialogueLog, sourceName, config);
        const summaryCustMsg = await window.api.summarizeConversation(dialogueLog, targetName, config);

        if (summaryCsrMsg.success && summaryCustMsg.success) {
            memoLangCsr.innerText = sourceName;
            memoLangCust.innerText = targetName;
            memoContentCsr.innerText = summaryCsrMsg.summary;
            memoContentCust.innerText = summaryCustMsg.summary;
            memoModal.style.display = 'flex';
            dialogueLog = []; // Reset for next session
        } else {
            throw new Error(summaryCsrMsg.error || summaryCustMsg.error);
        }
    } catch (e) {
        console.error("Summarization error:", e);
        instructionEl.innerText = "Failed to generate summary.";
    } finally {
        speechProcessingActive = false;
        spinnerEl.style.display = 'none';
        setTimeout(() => {
            instructionEl.innerText = window.Locale ? window.Locale.t('speechInst') : 'Hold a button below to speak';
        }, 3000);
    }
}

endSessionBtn.addEventListener('click', handleEndSession);
closeMemoBtn.addEventListener('click', () => memoModal.style.display = 'none');
closeMemoBottomBtn.addEventListener('click', () => memoModal.style.display = 'none');

document.getElementById('btn-copy-memo-csr').addEventListener('click', () => {
    navigator.clipboard.writeText(memoContentCsr.innerText);
    const btn = document.getElementById('btn-copy-memo-csr');
    const oldText = btn.innerText;
    btn.innerText = '✔️ Copied!';
    setTimeout(() => btn.innerText = oldText, 2000);
});

document.getElementById('btn-copy-memo-cust').addEventListener('click', () => {
    navigator.clipboard.writeText(memoContentCust.innerText);
    const btn = document.getElementById('btn-copy-memo-cust');
    const oldText = btn.innerText;
    btn.innerText = '✔️ Copied!';
    setTimeout(() => btn.innerText = oldText, 2000);
});

window.addEventListener('click', (e) => {
    if (e.target === memoModal) memoModal.style.display = 'none';
});
