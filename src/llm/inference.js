const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let llama = null;
let model = null;
let context = null;
let session = null;
let localModelName = null;

async function initLocalModel() {
    if (localModelName) return { success: true, modelName: localModelName };

    let getLlama, LlamaChatSession;
    try {
        const nlc = await import('node-llama-cpp');
        getLlama = nlc.getLlama;
        LlamaChatSession = nlc.LlamaChatSession;
    } catch (e) {
        return { success: false, error: "Failed to load node-llama-cpp module: " + e.toString() };
    }

    const isPackaged = app.isPackaged;
    const modelsPath = isPackaged
        ? path.join(process.resourcesPath, 'models')
        : path.join(__dirname, '..', '..', 'models');

    if (!fs.existsSync(modelsPath)) {
        return { success: false, error: "Models directory not found at " + modelsPath };
    }

    const modelFiles = fs.readdirSync(modelsPath).filter(f => f.endsWith('.gguf'));
    if (modelFiles.length === 0) {
        return { success: false, error: "No local models found. Please download a model." };
    }

    const defaultModel = modelFiles[0];
    const modelPath = path.join(modelsPath, defaultModel);

    try {
        llama = await getLlama({
            logger: () => { } // Suppress node-llama-cpp internal warnings and logs
        });
        model = await llama.loadModel({ modelPath });
        context = await model.createContext({
            contextSize: 2048 // Locks the KV cache to a small footprint (approx 4GB total VRAM)
        });
        session = new LlamaChatSession({ contextSequence: context.getSequence() });
        localModelName = defaultModel;
        return { success: true, modelName: defaultModel };
    } catch (e) {
        return { success: false, error: e.toString() };
    }
}

async function fetchOllamaModels() {
    return new Promise((resolve) => {
        const req = http.get('http://localhost:11434/api/tags', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ success: true, models: parsed.models || [] });
                } catch (e) { resolve({ success: false, error: "Parsing error" }); }
            });
        });
        req.on('error', (e) => resolve({ success: false, error: "Ollama offline" }));
        req.setTimeout(2000, () => {
            req.destroy();
            resolve({ success: false, error: "Ollama offline" });
        });
    });
}

async function translateText(sourceLang, targetLang, text, config) {
    // const prompt = `Translate the following text from ${sourceLang} to ${targetLang}. Only provide the translation, no other text.\n\nText: ${text}\n\nTranslation:`;

    const prompt = `You are a professional ${sourceLang} to ${targetLang} translator. Your goal is to accurately convey the meaning and nuances of the original ${sourceLang}  text while adhering to ${targetLang} grammar, vocabulary, and cultural sensitivities. Produce only the ${targetLang} translation, without any additional explanations or commentary. Please translate the following ${sourceLang} text into ${targetLang}: \n\n${text}`;


    if (config.engine === 'ollama') {
        return new Promise((resolve) => {
            const reqData = JSON.stringify({
                model: config.modelName,
                prompt: prompt,
                stream: false
            });
            const req = http.request('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(reqData)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({ success: true, translatedText: parsed.response.trim() });
                    } catch (e) { resolve({ success: false, error: "Failed to parse Ollama response" }); }
                });
            });
            req.on('error', e => resolve({ success: false, error: e.message }));
            req.write(reqData);
            req.end();
        });
    } else {
        try {
            const init = await initLocalModel();
            if (!init.success) throw new Error(init.error);
            const response = await session.prompt(prompt);
            return { success: true, translatedText: response.trim() };
        } catch (e) {
            return { success: false, error: e.toString() };
        }
    }
}

module.exports = {
    initLocalModel,
    fetchOllamaModels,
    translateText
};
