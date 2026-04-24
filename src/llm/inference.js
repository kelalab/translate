const fs = require('fs');
const path = require('path');
const http = require('http');
const { app } = require('electron');
const logger = require('../logger');



let llama = null;
let model = null;
let context = null;
let session = null;
let isResetting = false;
let localModelName = null;

async function initLocalModel() {
    if (localModelName) return { success: true, modelName: localModelName };

    let getLlama, LlamaChatSession;
    try {
        logger.info('LLM', 'Loading node-llama-cpp module...');
        const nlc = await import('node-llama-cpp');
        getLlama = nlc.getLlama;
        LlamaChatSession = nlc.LlamaChatSession;
    } catch (e) {
        logger.error('LLM', `Failed to load node-llama-cpp: ${e.message}`);
        return { success: false, error: "Failed to load node-llama-cpp module: " + e.toString() };
    }


    const isPackaged = app.isPackaged;
    const modelsPath = isPackaged
        ? path.join(process.resourcesPath, 'models')
        : path.join(__dirname, '..', '..', 'models');

    if (!fs.existsSync(modelsPath)) {
        logger.error('LLM', `Models directory not found at: ${modelsPath}`);
        return { success: false, error: "Models directory not found at " + modelsPath };
    }


    const modelFiles = fs.readdirSync(modelsPath).filter(f => f.endsWith('.gguf'));
    if (modelFiles.length === 0) {
        logger.warn('LLM', 'No .gguf models found in models directory.');
        return { success: false, error: "No local models found. Please download a model." };
    }


    const defaultModel = modelFiles[0];
    const modelPath = path.join(modelsPath, defaultModel);

    try {
        logger.info('LLM', `Initializing Llama with model: ${defaultModel}`);
        llama = await getLlama({
            logger: (msg) => {
                // Pipe significant llama logs to our debug log if they contain 'error' or 'fail'
                if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('fail')) {
                    logger.error('LLAMA-CORE', msg);
                } else {
                    logger.debug('LLAMA-CORE', msg);
                }
            }
        });
        model = await llama.loadModel({ modelPath });
        context = await model.createContext({
            contextSize: 2048 // Locks the KV cache to a small footprint (approx 4GB total VRAM)
        });
        session = new LlamaChatSession({ contextSequence: context.getSequence() });
        localModelName = defaultModel;
        logger.info('LLM', 'Local model initialized successfully.');
        return { success: true, modelName: defaultModel };
    } catch (e) {
        logger.error('LLM', `Model initialization failed: ${e.message}`);
        return { success: false, error: e.toString() };
    }

}

async function checkProvider(endpoint, apiKey) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        
        let url = endpoint;
        if (!url.endsWith('/')) url += '/';
        url += 'models';

        logger.info('API', `Checking provider at: ${url}`);
        const res = await fetch(url, { headers });

        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        
        let models = [];
        if (data && data.data && Array.isArray(data.data)) {
            models = data.data.map(m => { return { name: m.id }; });
        } else if (Array.isArray(data)) {
            models = data.map(m => { return { name: m.id || m.name }; });
        } else if (data && data.models) {
             // native ollama format
            models = data.models.map(m => { return { name: m.name }; });
        }
        
        logger.info('API', `Found ${models.length} models from provider.`);
        return { success: true, models: models };
    } catch(e) {
        logger.error('API', `Provider check failed: ${e.message}`);
        return { success: false, error: e.message };
    }

}

const glossary = {
    "Kela": {
        "Finnish": "Kela",
        "Swedish": "FPA",
        "English": "Kela"
    },
    "Kansaneläkelaitos": {
        "Finnish": "Kansaneläkelaitos",
        "Swedish": "Folkpensionsanstalten",
        "English": "The Social Insurance Institution of Finland"
    }
};

async function translateText(sourceLang, targetLang, text, config) {
    let terminologyInstructions = "";
    const activeRules = [];

    // Evaluate if any source terms exist in the provided text
    for (const [baseTerm, translations] of Object.entries(glossary)) {
        const sourceTerm = translations[sourceLang];
        const targetTerm = translations[targetLang];

        // If the glossary has the terms for both languages and the source term is found in the text
        if (sourceTerm && targetTerm && text.includes(sourceTerm)) {
            // Avoid adding a rule if the word shouldn't be translated (e.g. Kela -> Kela)
            if (sourceTerm !== targetTerm) {
                activeRules.push(`- Translate "${sourceTerm}" strictly to "${targetTerm}"`);
            }
        }
    }

    if (activeRules.length > 0) {
        terminologyInstructions = "\nIMPORTANT TERMINOLOGY RULES:\n" + activeRules.join("\n") + "\n";
    }


    const prompt = `You are a professional ${sourceLang} to ${targetLang} translator. Your goal is to accurately convey the meaning and nuances of the original ${sourceLang} text while adhering to ${targetLang} grammar, vocabulary, and cultural sensitivities. Produce only the ${targetLang} translation, without any additional explanations or commentary.${terminologyInstructions}\nPlease translate the following ${sourceLang} text into ${targetLang}: \n\n${text}`;

    logger.info('TRANS', `Requesting translation: ${sourceLang} -> ${targetLang} (${config.engine})`);
    logger.debug('TRANS', `Prompt: ${prompt}`);

    if (config.engine === 'api') {

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;
            
            let url = config.endpoint;
            if (!url.endsWith('/')) url += '/';
            // Determine if the endpoint is an OpenAI chat completions or if it's explicitly the Native Ollama generate
            if (!url.includes('/chat/completions') && !url.includes('/api/generate')) {
                url += 'chat/completions';
            }

            const isChatMode = url.includes('chat');
            const payload = {
                model: config.modelName,
                stream: false
            };
            
            if (isChatMode) {
                payload.messages = [{ role: "user", content: prompt }];
            } else {
                payload.prompt = prompt;
            }

            const res = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });
            
            if (!res.ok) throw new Error("HTTP error " + res.status);
            const data = await res.json();
            
            let translated = "";
            if (data.choices && data.choices[0] && data.choices[0].message) {
                translated = data.choices[0].message.content; // OpenAI Chat Completions
            } else if (data.response) {
                translated = data.response; // Ollama generate
            } else {
                 throw new Error("Unknown response format");
            }
            logger.debug('TRANS', `API Response: ${translated}`);
            return { success: true, translatedText: translated.trim() };
        } catch(e) {
            logger.error('TRANS', `API translation failed: ${e.message}`);
            return { success: false, error: "API Failure: " + e.message };
        }

    } else {
        try {
            while (isResetting) {
                await new Promise(r => setTimeout(r, 100));
            }

            const init = await initLocalModel();
            if (!init.success) throw new Error(init.error);

            session.setChatHistory([]);
            const response = await session.prompt(prompt);

            logger.debug('TRANS', `Local Response: ${response}`);
            return { success: true, translatedText: response.trim() };
        } catch (e) {
            logger.error('TRANS', `Local translation failed: ${e.message}`);
            return { success: false, error: e.toString() };
        }

    }
}

async function summarizeConversation(conversationLog, targetLang, config) {
    const transcript = conversationLog.map(entry => `${entry.role}: ${entry.text}`).join('\n');
    const headerMap = {
        'Finnish': { topics: 'Käsitellyt aiheet', actions: 'Toimenpiteet' },
        'Swedish': { topics: 'Ämnen som behandlats', actions: 'Åtgärdspunkter' },
        'Spanish': { topics: 'Temas tratados', actions: 'Puntos de acción' },
        'French': { topics: 'Sujets abordés', actions: 'Points d\'action' },
        'German': { topics: 'Behandelte Themen', actions: 'Aktionspunkte' },
        'Russian': { topics: 'Темы обсуждения', actions: 'План действий' },
        'Arabic': { topics: 'المواضيع التي تمت تغطيتها', actions: 'نقاط العمل' },
        'Chinese': { topics: '讨论主题', actions: '行动要点' },
        'Japanese': { topics: '議論されたトピック', actions: 'アクションポイント' }
    };
    const h = headerMap[targetLang] || { topics: 'Topics', actions: 'Action Points' };

    const prompt = `You are a professional meeting assistant. Below is a transcript of a conversation between a Customer Service Representative (CSR) and a Customer.
Please provide a high-level summary of the topics covered and any specific action points agreed upon.
Provide the summary in ${targetLang}.

Transcript:
${transcript}

Format:
${h.actions}:
- ...`;

    logger.info('SUMM', `Requesting conversation summary in ${targetLang} (${config.engine})`);
    logger.debug('SUMM', `Prompt: ${prompt}`);

    if (config.engine === 'api') {

        // Reuse the logic from translateText but with the summarization prompt
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;
            
            let url = config.endpoint;
            if (!url.endsWith('/')) url += '/';
            if (!url.includes('/chat/completions') && !url.includes('/api/generate')) {
                url += 'chat/completions';
            }

            const isChatMode = url.includes('chat');
            const payload = {
                model: config.modelName,
                stream: false
            };
            
            if (isChatMode) {
                payload.messages = [{ role: "user", content: prompt }];
            } else {
                payload.prompt = prompt;
            }

            const res = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });
            
            if (!res.ok) throw new Error("HTTP error " + res.status);
            const data = await res.json();
            
            let summarized = "";
            if (data.choices && data.choices[0] && data.choices[0].message) {
                summarized = data.choices[0].message.content;
            } else if (data.response) {
                summarized = data.response;
            } else {
                 throw new Error("Unknown response format");
            }
            logger.debug('SUMM', `API Response: ${summarized}`);
            return { success: true, summary: summarized.trim() };
        } catch(e) {
            logger.error('SUMM', `API summarization failed: ${e.message}`);
            return { success: false, error: "API Failure: " + e.message };
        }

    } else {
        try {
            while (isResetting) {
                await new Promise(r => setTimeout(r, 100));
            }

            const init = await initLocalModel();
            if (!init.success) throw new Error(init.error);

            session.setChatHistory([]);
            const response = await session.prompt(prompt);

            logger.debug('SUMM', `Local Response: ${response}`);
            return { success: true, summary: response.trim() };
        } catch (e) {
            logger.error('SUMM', `Local summarization failed: ${e.message}`);
            return { success: false, error: e.toString() };
        }

    }
}

async function resetLocalContext() {
    if (context && !isResetting) {
        logger.info('LLM', 'Resetting local KV cache context...');
        isResetting = true;
        try {
            const nlc = await import('node-llama-cpp');
            await context.dispose();
            context = await model.createContext({ contextSize: 2048 });
            session = new nlc.LlamaChatSession({ contextSequence: context.getSequence() });
            logger.info('LLM', 'Context reset successful.');
        } catch(e) {
            logger.error('LLM', `Context reset failed: ${e.message}`);
        }
        isResetting = false;
    }
}


module.exports = {
    initLocalModel,
    checkProvider,
    translateText,
    summarizeConversation,
    resetLocalContext
};
