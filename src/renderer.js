const languages = [
    "English", "Finnish", "Swedish", "Spanish", "French", "German",
    "Italian", "Portuguese", "Dutch", "Polish", "Russian", "Danish",
    "Norwegian", "Greek", "Turkish", "Czech", "Hungarian", "Romanian",
    "Bulgarian", "Croatian", "Serbian", "Slovak", "Slovenian", "Estonian",
    "Latvian", "Lithuanian", "Ukrainian"
].sort();

const shortcuts = ["English", "Finnish", "Swedish"];

function setupCustomSelect(selectId, defaultVal, limitLangs = null) {
    const selectWrap = document.getElementById(selectId);
    const selected = selectWrap.querySelector('.select-selected');
    const itemsGroup = selectWrap.querySelector('.select-items');
    const searchInput = selectWrap.querySelector('.select-search');
    const optionsContainer = selectWrap.querySelector('.select-options');

    selected.textContent = window.Locale ? window.Locale.tLang(defaultVal) : defaultVal;
    selectWrap.dataset.trueValue = defaultVal;

    function renderOptions(filterText = '') {
        optionsContainer.innerHTML = '';

        // Render shortcuts
        const shortcutDiv = document.createElement('div');
        shortcutDiv.className = 'shortcut-group';
        shortcuts.forEach(lang => {
            if (limitLangs && !limitLangs.includes(lang)) return;
            const locLang = window.Locale ? window.Locale.tLang(lang) : lang;
            if (lang.toLowerCase().includes(filterText.toLowerCase()) || locLang.toLowerCase().includes(filterText.toLowerCase())) {
                const opt = document.createElement('div');
                opt.textContent = `⭐ ${locLang}`;
                opt.dataset.value = lang;
                opt.addEventListener('click', () => {
                    selectWrap.dataset.trueValue = lang;
                    selected.textContent = window.Locale ? window.Locale.tLang(lang) : lang;
                    itemsGroup.classList.add('select-hide');
                    selectWrap.dispatchEvent(new Event('change'));
                });
                shortcutDiv.appendChild(opt);
            }
        });
        if (shortcutDiv.children.length > 0) {
            optionsContainer.appendChild(shortcutDiv);
        }

        // Render others
        languages.forEach(lang => {
            if (limitLangs && !limitLangs.includes(lang)) return;
            const locLang = window.Locale ? window.Locale.tLang(lang) : lang;
            if ((lang.toLowerCase().includes(filterText.toLowerCase()) || locLang.toLowerCase().includes(filterText.toLowerCase())) && !shortcuts.includes(lang)) {
                const opt = document.createElement('div');
                opt.textContent = locLang;
                opt.dataset.value = lang;
                opt.addEventListener('click', () => {
                    selectWrap.dataset.trueValue = lang;
                    selected.textContent = window.Locale ? window.Locale.tLang(lang) : lang;
                    itemsGroup.classList.add('select-hide');
                    selectWrap.dispatchEvent(new Event('change'));
                });
                optionsContainer.appendChild(opt);
            }
        });
    }

    selected.addEventListener('click', (e) => {
        e.stopPropagation();
        itemsGroup.classList.toggle('select-hide');
        searchInput.focus();
        renderOptions('');
    });

    searchInput.addEventListener('input', (e) => {
        renderOptions(e.target.value);
    });

    renderOptions('');

    // Expose a setter for programmatic updates
    selectWrap.setLanguage = (lang) => {
        if (languages.includes(lang) || shortcuts.includes(lang)) {
            selectWrap.dataset.trueValue = lang;
            selected.textContent = window.Locale ? window.Locale.tLang(lang) : lang;
        }
    };

    // Expose re-rendering for dynamic locale switching
    selectWrap.reRenderOptions = () => {
        renderOptions(searchInput.value || '');
    };
}

document.addEventListener('click', () => {
    document.querySelectorAll('.select-items').forEach(el => el.classList.add('select-hide'));
});

document.addEventListener('DOMContentLoaded', () => {
    if (window.Locale) window.Locale.initLocale();

    setupCustomSelect('source-lang-select', 'English');
    setupCustomSelect('target-lang-select', 'Finnish');
    setupCustomSelect('image-source-lang-select', 'English');
    setupCustomSelect('image-target-lang-select', 'Finnish', ['Finnish', 'Swedish']);
    setupCustomSelect('doc-source-lang-select', 'English');
    setupCustomSelect('doc-target-lang-select', 'Finnish');

    // UI Elements
    const apiSettingsBtn = document.getElementById('api-settings-btn');
    const engineSelect = document.getElementById('engine-select');
    const translateBtn = document.getElementById('translate-btn');
    const sourceText = document.getElementById('source-text');
    const targetText = document.getElementById('target-text');
    const errorToast = document.getElementById('error-toast');
    
    // Settings Modal Elements
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    const providerList = document.getElementById('provider-list');
    const addProviderBtn = document.getElementById('add-provider-btn');
    const provNameInput = document.getElementById('prov-name');
    const provEndpointInput = document.getElementById('prov-endpoint');
    const provKeyInput = document.getElementById('prov-key');
    const provModelsInput = document.getElementById('prov-models');

    let advancedApiEnabled = false;
    let debugModeEnabled = false;
    let builtInHtml = '';

    // Init Logic
    async function initApp() {
        advancedApiEnabled = await window.api.getAdvancedApiFlag();
        debugModeEnabled = await window.api.getDebugFlag();
        if (advancedApiEnabled) {
            apiSettingsBtn.style.display = 'inline-block';
        }

        const local = await window.api.getLocalModelStatus();
        if (local.success) {
            builtInHtml = `<option value="local">${local.modelName} (Built-in)</option>`;
        } else {
            builtInHtml = `<option value="error" disabled>Built-in Error: ${local.error}</option>`;
            showError("Built-in model not found. " + local.error);
        }

        checkProviders();
        setInterval(checkProviders, 15000); // Check every 15s to be gentle
        
        engineSelect.addEventListener('change', () => {
            translateBtn.disabled = engineSelect.value === 'error';
        });
    }

    function getProviders() {
        let providers = [];
        try {
            providers = JSON.parse(localStorage.getItem('apiProviders') || '[]');
        } catch(e) {}

        // Always implicitly check localhost Ollama first
        const hasLocalOllama = providers.find(p => p.id === 'default-ollama');
        if (!hasLocalOllama) {
            providers.unshift({
                id: 'default-ollama',
                name: 'Local Ollama',
                endpoint: 'http://localhost:11434/v1',
                apiKey: ''
            });
        }
        return providers;
    }

    function saveProviders(providers) {
        localStorage.setItem('apiProviders', JSON.stringify(providers));
    }

    async function checkProviders() {
        const currentSelection = engineSelect.value;
        const providers = getProviders();
        let optionsHtml = builtInHtml;

        for (const p of providers) {
            // Only non-default providers require the advanced flag to be visible
            if (!advancedApiEnabled && p.id !== 'default-ollama') continue;

            const res = await window.api.checkProvider(p.endpoint, p.apiKey);
            if (res.success && res.models && res.models.length > 0) {
                let filteredModels = res.models;
                if (p.modelsWhitelist) {
                    const allowedOpts = p.modelsWhitelist.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
                    filteredModels = filteredModels.filter(m => allowedOpts.includes(m.name.toLowerCase()));
                }
                filteredModels.sort((a,b) => a.name.localeCompare(b.name));

                if (filteredModels.length > 0) {
                    optionsHtml += `<optgroup label="${p.name}">`;
                    filteredModels.forEach(m => {
                        const valueStr = JSON.stringify({ providerId: p.id, model: m.name });
                        // Encode to avoid HTML attribute break
                        const encodedVal = btoa(valueStr);
                        optionsHtml += `<option value="api:${encodedVal}">${m.name}</option>`;
                    });
                    optionsHtml += `</optgroup>`;
                }
            }
        }

        engineSelect.innerHTML = optionsHtml;

        // Restore selection
        if (currentSelection && currentSelection !== 'error') {
            engineSelect.value = currentSelection;
            if (engineSelect.selectedIndex === -1) engineSelect.value = builtInHtml.includes('value="error"') ? 'error' : 'local';
        } else {
            engineSelect.value = builtInHtml.includes('value="error"') ? 'error' : 'local';
        }

        // Disable selector if 1 or 0 options
        if (engineSelect.options.length <= 1) {
            engineSelect.disabled = true;
        } else {
            engineSelect.disabled = false;
        }

        translateBtn.disabled = engineSelect.value === 'error';
    }

    // Modal UI Logic
    apiSettingsBtn.addEventListener('click', () => {
        renderProviderList();
        settingsModal.style.display = 'flex';
    });
    
    closeSettings.addEventListener('click', () => {
        settingsModal.style.display = 'none';
        checkProviders();
    });

    addProviderBtn.addEventListener('click', () => {
        const n = provNameInput.value.trim();
        const e = provEndpointInput.value.trim();
        const k = provKeyInput.value.trim();
        const m = provModelsInput.value.trim();
        if (!n || !e) return showError("Name and Endpoint are required.");

        const p = getProviders();
        p.push({ id: 'p_' + Date.now(), name: n, endpoint: e, apiKey: k, modelsWhitelist: m });
        saveProviders(p);
        provNameInput.value = ''; provEndpointInput.value = ''; provKeyInput.value = ''; provModelsInput.value = '';
        renderProviderList();
    });

    function renderProviderList() {
        providerList.innerHTML = '';
        const p = getProviders();
        p.forEach(prov => {
            if (prov.id === 'default-ollama') return; // Hide default ollama from list

            const div = document.createElement('div');
            div.className = 'provider-item';
            
            const details = document.createElement('div');
            details.className = 'provider-item-details';
            let extras = prov.endpoint;
            if (prov.modelsWhitelist) extras += `<br><span style="color:#888;">Filter: ${prov.modelsWhitelist}</span>`;
            details.innerHTML = `<strong>${prov.name}</strong><span>${extras}</span>`;
            
            const delBtn = document.createElement('button');
            delBtn.className = 'icon-btn';
            delBtn.textContent = '🗑';
            delBtn.addEventListener('click', () => {
                const newP = getProviders().filter(x => x.id !== prov.id);
                saveProviders(newP);
                renderProviderList();
            });

            div.appendChild(details);
            div.appendChild(delBtn);
            providerList.appendChild(div);
        });
    }

    // --- Tabs Logic ---
    const tabBtns = document.querySelectorAll('.main-tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.style.display = 'none');
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).style.display = 'flex';
        });
    });

    // --- Document Processing Logic ---
    const docDropZone = document.getElementById('doc-drop-zone');
    const docProgressBox = document.getElementById('doc-progress-box');
    const docStreamingConsole = document.getElementById('doc-streaming-console');
    const docResetBtn = document.getElementById('doc-reset-btn');

    let currentPdfJobId = 0;

    if (window.api && window.api.onDocumentProgress) {
        window.api.onDocumentProgress((data) => {
            if (docStreamingConsole) {
                docStreamingConsole.textContent += data.status + '\n';
                docStreamingConsole.scrollTop = docStreamingConsole.scrollHeight;
            }
        });
    }

    async function processPdfFrontend(file, sourceLang, targetLang, config) {
        currentPdfJobId++;
        const thisJobId = currentPdfJobId;

        if (!window.pdfjsLib) {
            docStreamingConsole.textContent += `\n[FATAL ERROR] PDF.js library failed to load.\n`;
            return;
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const numPages = pdfDoc.numPages;

            docStreamingConsole.textContent += `[INFO] Loaded PDF containing ${numPages} page(s).\n`;

            const translatedParagraphs = [];
            const tessLangMap = { "English": "eng", "Finnish": "fin", "Swedish": "swe", "Spanish": "spa", "French": "fra", "German": "deu", "Italian": "ita", "Portuguese": "por", "Dutch": "nld", "Polish": "pol", "Russian": "rus", "Danish": "dan", "Norwegian": "nor", "Greek": "ell", "Turkish": "tur", "Czech": "ces", "Hungarian": "hun", "Romanian": "ron", "Bulgarian": "bul", "Croatian": "hrv", "Serbian": "srp", "Slovak": "slk", "Slovenian": "slv", "Estonian": "est", "Latvian": "lav", "Lithuanian": "lit", "Ukrainian": "ukr" };
            const reqLangCode = tessLangMap[sourceLang] || 'eng';

            for (let i = 1; i <= numPages; i++) {
                if (currentPdfJobId !== thisJobId) {
                    docStreamingConsole.textContent += `\n[INFO] Processing cancelled by user.\n`;
                    return;
                }

                docStreamingConsole.textContent += `\n[Page ${i}/${numPages}] Extracting text...\n`;
                docStreamingConsole.scrollTop = docStreamingConsole.scrollHeight;

                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                let fullText = textContent.items.map(s => s.str).join(' ');

                let isScannedOcr = false;
                let ocrDataUrl = null;

                if (!fullText || fullText.trim().length < 20) {
                    isScannedOcr = true;
                    docStreamingConsole.textContent += `[Page ${i}/${numPages}] Scanning scanned image structure (OCR Fallback)...\n`;
                    docStreamingConsole.scrollTop = docStreamingConsole.scrollHeight;

                    const viewport = page.getViewport({ scale: 2.0 });
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                    ocrDataUrl = canvas.toDataURL('image/png');

                    if (typeof Tesseract === 'undefined') throw new Error("Tesseract library missing.");

                    const { data: { text } } = await Tesseract.recognize(ocrDataUrl, reqLangCode, {
                        logger: m => {}
                    });

                    fullText = text || '';
                    docStreamingConsole.textContent += `[Page ${i}/${numPages}] OCR Extracted ${fullText.length} characters.\n`;
                } else {
                    docStreamingConsole.textContent += `[Page ${i}/${numPages}] Digital text nodes successfully identified.\n`;
                }

                if (!fullText.trim()) {
                    translatedParagraphs.push("");
                    continue;
                }

                docStreamingConsole.textContent += `[Page ${i}/${numPages}] Dispatching to engine...\n`;
                docStreamingConsole.scrollTop = docStreamingConsole.scrollHeight;

                const res = await window.api.translateText(sourceLang, targetLang, fullText, config);
                if (res.success) {
                    docStreamingConsole.textContent += `> Result: ${res.translatedText.substring(0, 50)}...\n`;
                    translatedParagraphs.push(res.translatedText);
                } else {
                    docStreamingConsole.textContent += `[ERROR]: ${res.error}\n`;
                    translatedParagraphs.push(fullText);
                }

                if (debugModeEnabled && isScannedOcr) {
                    try {
                        docStreamingConsole.textContent += `[DEBUG] Dispatching OCR pipeline artifacts to debug root...\n`;
                        await window.api.saveDebugArtifacts({
                            page: i,
                            image: ocrDataUrl,
                            rawText: fullText,
                            translatedText: res.success ? res.translatedText : null
                        });
                    } catch(err) {}
                }
            }

            const outStr = translatedParagraphs.join('\n\n--- Page Break ---\n\n');
            const buffer = new TextEncoder().encode(outStr);

            docStreamingConsole.textContent += `\n[SUCCESS] Document parsed! Prompting save dialog...\n`;
            docStreamingConsole.scrollTop = docStreamingConsole.scrollHeight;

            const saveRes = await window.api.saveDocumentDialog(buffer, '.txt');
            if (saveRes.success) {
                docStreamingConsole.textContent += `[SAVED] File successfully saved to: ${saveRes.filePath}\n`;
            } else {
                docStreamingConsole.textContent += `[CANCELED] Save dialog was canceled.\n`;
            }
        } catch (e) {
            docStreamingConsole.textContent += `\n[FATAL ERROR] ${e.message}\n`;
            console.error(e);
        }
    }

    docDropZone.addEventListener('dragover', (e) => { e.preventDefault(); docDropZone.classList.add('dragover'); });
    docDropZone.addEventListener('dragleave', () => docDropZone.classList.remove('dragover'));
    docDropZone.addEventListener('drop', async (e) => {
        e.preventDefault(); 
        docDropZone.classList.remove('dragover');
        
        if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
        const file = e.dataTransfer.files[0];
        const fname = file.name.toLowerCase();

        try {
            // Cancel any ongoing backend tasks
            if (window.api && window.api.cancelProcessing) window.api.cancelProcessing();
            currentPdfJobId++;

            // Execute clean local buffer sweep safely with timeout shield
            try {
                if (window.api && window.api.resetLlmContext) {
                    await Promise.race([
                        window.api.resetLlmContext(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 800))
                    ]);
                }
            } catch (err) { console.warn("IPC Reset Timeout Suppressed:", err); }

            if (!fname.endsWith('.txt') && !fname.endsWith('.docx') && !fname.endsWith('.pdf')) {
                return showError("Only .txt, .docx, and .pdf files are supported. Found: " + file.name);
            }

            docDropZone.style.display = 'none';
                docProgressBox.style.display = 'flex';
                docStreamingConsole.textContent = 'Initializing...\n';

            const sourceWrap = document.getElementById('doc-source-lang-select');
            const targetWrap = document.getElementById('doc-target-lang-select');
            const sourceLang = sourceWrap.dataset.trueValue || 'English';
            const targetLang = targetWrap.dataset.trueValue || 'Finnish';

            const engineSelect = document.getElementById('engine-select');
            const engineVal = engineSelect.value;
            const config = { engine: 'local' };
            if (engineVal.startsWith('api:')) {
                config.engine = 'api';
                try {
                    const decoded = JSON.parse(atob(engineVal.split(':')[1]));
                    const p = getProviders().find(x => x.id === decoded.providerId);
                    if (p) { config.endpoint = p.endpoint; config.apiKey = p.apiKey; config.modelName = decoded.model; }
                } catch(err) {}
            }

            if (file.name.toLowerCase().endsWith('.pdf')) {
                await processPdfFrontend(file, sourceLang, targetLang, config);
                return;
            }

            try {
                const filePath = window.api.getFilePath ? window.api.getFilePath(file) : file.path;
                const res = await window.api.processDocument(filePath, sourceLang, targetLang, config);
                if (res.success) {
                    docStreamingConsole.textContent += `\n[SUCCESS] Document parsed and assembled! Prompting save dialog...\n`;
                    const saveRes = await window.api.saveDocumentDialog(res.buffer, res.ext);
                    if (saveRes.success) {
                        docStreamingConsole.textContent += `[SAVED] File successfully saved to: ${saveRes.filePath}\n`;
                    } else {
                        docStreamingConsole.textContent += `[CANCELED] Save dialog was canceled.\n`;
                    }
                } else {
                    docStreamingConsole.textContent += `\n[ERROR] ${res.error}\n`;
                }
            } catch (err) {
                docStreamingConsole.textContent += `\n[FATAL ERROR] ${err.message}\n`;
            }
        } catch (criticalError) {
            showError("App failure handling drop: " + criticalError.message);
            console.error(criticalError);
        }
    });

    docResetBtn.addEventListener('click', () => {
        if (window.api && window.api.cancelProcessing) window.api.cancelProcessing();
        currentPdfJobId++;
        docProgressBox.style.display = 'none';
        docDropZone.style.display = 'flex';
        docStreamingConsole.textContent = '';
    });

    // --- Image OCR Logic ---
    const imageDropZone = document.getElementById('image-drop-zone');
    const imagePreview = document.getElementById('image-preview');
    const imageDropMsg = document.getElementById('image-drop-msg');
    const imageSplitView = document.getElementById('image-split-view');
    const imageSourceText = document.getElementById('image-source-text');
    const imageTargetText = document.getElementById('image-target-text');
    const imageTranslateBtn = document.getElementById('image-translate-btn');

    imageDropZone.addEventListener('dragover', (e) => { e.preventDefault(); imageDropZone.classList.add('dragover'); });
    imageDropZone.addEventListener('dragleave', () => imageDropZone.classList.remove('dragover'));
    imageDropZone.addEventListener('drop', async (e) => {
        e.preventDefault(); imageDropZone.classList.remove('dragover');
        
        if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
        const file = e.dataTransfer.files[0];

        try {
            if (window.api && window.api.resetLlmContext) {
                await Promise.race([
                    window.api.resetLlmContext(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 800))
                ]);
            }
        } catch(err) {}

        processImage(file);
    });

    document.addEventListener('paste', (e) => {
        if (document.getElementById('tab-images').style.display !== 'none') {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (let index in items) {
                const item = items[index];
                if (item.kind === 'file') {
                    processImage(item.getAsFile());
                    break;
                }
            }
        }
    });

    let currentImageDataUrl = null;

    async function runOCR() {
        if (!currentImageDataUrl) return;
        
        imageSourceText.value = 'Running OCR...';
        imageTargetText.value = '';
        
        try {
            // Determine Tesseract language code from Image Source dropdown
            const sourceWrap = document.getElementById('image-source-lang-select');
            const sourceLang = sourceWrap.dataset.trueValue || 'English';
            const tessLangMap = { "English": "eng", "Finnish": "fin", "Swedish": "swe", "Spanish": "spa", "French": "fra", "German": "deu", "Italian": "ita", "Portuguese": "por", "Dutch": "nld", "Polish": "pol", "Russian": "rus", "Danish": "dan", "Norwegian": "nor", "Greek": "ell", "Turkish": "tur", "Czech": "ces", "Hungarian": "hun", "Romanian": "ron", "Bulgarian": "bul", "Croatian": "hrv", "Serbian": "srp", "Slovak": "slk", "Slovenian": "slv", "Estonian": "est", "Latvian": "lav", "Lithuanian": "lit", "Ukrainian": "ukr" };
            const tLang = tessLangMap[sourceLang] || "eng";

            const { data: { text } } = await Tesseract.recognize(currentImageDataUrl, tLang, {
                logger: m => {
                    if(m.status === 'recognizing text') {
                        imageSourceText.value = `Running OCR... ${Math.round(m.progress * 100)}%`;
                    }
                }
            });
            imageSourceText.value = text;
            handleAutoDetect(text);
        } catch (err) {
            imageSourceText.value = '';
            showError("OCR failed: " + err.message);
        }
    }

    document.getElementById('image-source-lang-select').addEventListener('change', runOCR);

    async function processImage(file) {
        if (!file.type.startsWith('image/')) return showError("Please drop an image file.");
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            currentImageDataUrl = e.target.result;
            imagePreview.src = currentImageDataUrl;
            imagePreview.style.display = 'block';
            imageDropMsg.style.display = 'none';
            imageSplitView.style.display = 'flex';
            
            runOCR();
        };
        reader.readAsDataURL(file);
    }

    initApp();

    function showError(msg) {
        errorToast.textContent = window.Locale ? (window.Locale.t(msg) || msg) : msg;
        errorToast.classList.add('show');
        setTimeout(() => errorToast.classList.remove('show'), 5000);
    }

    async function handleAutoDetect(text) {
        if (!text || text.trim().length < 2) return;
        const detected = await window.api.detectLanguage(text);
        if (detected && languages.includes(detected)) {
            document.getElementById('source-lang-select').setLanguage(detected);
        }
    }

    let detectTimeout;
    sourceText.addEventListener('input', (e) => {
        clearTimeout(detectTimeout);
        detectTimeout = setTimeout(() => {
            handleAutoDetect(e.target.value);
        }, 800);
    });

    document.getElementById('paste-source').addEventListener('click', async () => {
        try {
            const pasted = await navigator.clipboard.readText();
            sourceText.value = pasted;
            handleAutoDetect(pasted);
        } catch (e) {
            showError('Failed to read clipboard');
        }
    });

    document.getElementById('clear-source').addEventListener('click', () => {
        sourceText.value = '';
        targetText.value = '';
    });

    document.getElementById('copy-target').addEventListener('click', async () => {
        if (!targetText.value) return;
        try {
            await navigator.clipboard.writeText(targetText.value);
            const btnText = document.getElementById('copy-target-text');
            btnText.textContent = window.Locale ? window.Locale.t('copied') : '✔️ Copied!';
            setTimeout(() => {
                btnText.textContent = window.Locale ? window.Locale.t('copy') : '📋 Copy';
            }, 2000);
        } catch (e) {
            showError('errCopy');
        }
    });

    // Translation logic
    translateBtn.addEventListener('click', async () => {
        if (!sourceText.value.trim()) return;

        const sourceWrap = document.getElementById('source-lang-select');
        const targetWrap = document.getElementById('target-lang-select');
        const sourceLang = sourceWrap.dataset.trueValue || 'English';
        const targetLang = targetWrap.dataset.trueValue || 'Finnish';

        const engineVal = engineSelect.value;
        const config = { engine: 'local' };
        if (engineVal.startsWith('api:')) {
            config.engine = 'api';
            try {
                const decoded = JSON.parse(atob(engineVal.split(':')[1]));
                const p = getProviders().find(x => x.id === decoded.providerId);
                if (p) {
                    config.endpoint = p.endpoint;
                    config.apiKey = p.apiKey;
                    config.modelName = decoded.model;
                }
            } catch(e) {
                 showError("Failed to parse API config");
                 return;
            }
        }

        translateBtn.disabled = true;
        document.querySelector('.btn-text').style.display = 'none';
        document.querySelector('.btn-spinner').style.display = 'inline-block';

        const result = await window.api.translateText(sourceLang, targetLang, sourceText.value, config);

        document.querySelector('.btn-text').style.display = 'inline-block';
        document.querySelector('.btn-spinner').style.display = 'none';
        translateBtn.disabled = false;

        if (result.success) {
            targetText.value = result.translatedText;
            saveHistory(sourceLang, targetLang, sourceText.value, result.translatedText);
        } else {
            showError(result.error);
        }
    });

    // --- Image OCR Translation Action ---
    imageTranslateBtn.addEventListener('click', async () => {
        if (!imageSourceText.value.trim()) return;

        const sourceWrap = document.getElementById('image-source-lang-select');
        const targetWrap = document.getElementById('image-target-lang-select');
        const sourceLang = sourceWrap.dataset.trueValue || 'English';
        const targetLang = targetWrap.dataset.trueValue || 'Finnish';

        const engineVal = engineSelect.value;
        const config = { engine: 'local' };
        if (engineVal.startsWith('api:')) {
            config.engine = 'api';
            try {
                const decoded = JSON.parse(atob(engineVal.split(':')[1]));
                const p = getProviders().find(x => x.id === decoded.providerId);
                if (p) { config.endpoint = p.endpoint; config.apiKey = p.apiKey; config.modelName = decoded.model; }
            } catch(e) {}
        }

        imageTranslateBtn.disabled = true;
        imageTranslateBtn.querySelector('.btn-text').style.display = 'none';
        imageTranslateBtn.querySelector('.btn-spinner').style.display = 'inline-block';

        const result = await window.api.translateText(sourceLang, targetLang, imageSourceText.value, config);

        imageTranslateBtn.querySelector('.btn-text').style.display = 'inline-block';
        imageTranslateBtn.querySelector('.btn-spinner').style.display = 'none';
        imageTranslateBtn.disabled = false;

        if (result.success) {
            imageTargetText.value = result.translatedText;
            saveHistory(sourceLang, targetLang, imageSourceText.value, result.translatedText);
        } else {
            showError(result.error);
        }
    });

    // Make sure we update the selects dynamically on locale change
    document.querySelectorAll('.locale-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const lang = e.target.dataset.lang;
            if (window.Locale) window.Locale.setLocale(lang);
            renderHistory(); 
            document.getElementById('source-lang-select').reRenderOptions();
            document.getElementById('target-lang-select').reRenderOptions();
            document.getElementById('image-source-lang-select').reRenderOptions();
            document.getElementById('image-target-lang-select').reRenderOptions();
            document.getElementById('doc-source-lang-select').reRenderOptions();
            document.getElementById('doc-target-lang-select').reRenderOptions();
        });
    });

    // Image Tab Copy Button
    document.getElementById('copy-image-target').addEventListener('click', async () => {
        if (!imageTargetText.value) return;
        try {
            await navigator.clipboard.writeText(imageTargetText.value);
            const btnText = document.getElementById('copy-image-target-text');
            btnText.textContent = window.Locale ? window.Locale.t('copied') : '✔️ Copied!';
            setTimeout(() => {
                btnText.textContent = window.Locale ? window.Locale.t('copy') : '📋 Copy';
            }, 2000);
        } catch (e) {
            showError('errCopy');
        }
    });

    // --- Translation History ---
    const historyToggle = document.getElementById('history-toggle');
    const historyContent = document.getElementById('history-content');
    const historyList = document.getElementById('history-list');

    historyToggle.addEventListener('click', () => {
        const expanded = historyContent.classList.toggle('expanded');
        historyToggle.querySelector('.accordion-icon').style.transform = expanded ? 'rotate(180deg)' : 'rotate(0deg)';
        if (expanded) renderHistory();
    });

    function getHistory() {
        try {
            return JSON.parse(localStorage.getItem('translationHistory') || '[]');
        } catch {
            return [];
        }
    }

    function saveHistory(sourceL, targetL, sourceTxt, targetTxt) {
        let h = getHistory();
        h.unshift({ sourceL, targetL, sourceTxt, targetTxt, time: Date.now() });
        if (h.length > 20) h = h.slice(0, 20); // Cap at 20
        localStorage.setItem('translationHistory', JSON.stringify(h));
        if (historyContent.classList.contains('expanded')) {
            renderHistory();
        }
    }

    function renderHistory() {
        historyList.innerHTML = '';
        const h = getHistory();
        if (h.length === 0) {
            historyList.innerHTML = '<div style="padding: 1rem; color: #666; text-align: center;">No history yet.</div>';
            return;
        }

        h.forEach(item => {
            const wrap = document.createElement('div');
            wrap.className = 'history-card';
            
            const head = document.createElement('div');
            head.className = 'history-card-header';
            head.textContent = `${window.Locale ? window.Locale.tLang(item.sourceL) : item.sourceL} ➔ ${window.Locale ? window.Locale.tLang(item.targetL) : item.targetL}`;
            
            const body = document.createElement('div');
            body.className = 'history-card-body';
            
            const srcDiv = document.createElement('div');
            srcDiv.className = 'history-src';
            srcDiv.textContent = item.sourceTxt;
            
            const tgtDiv = document.createElement('div');
            tgtDiv.className = 'history-tgt';
            tgtDiv.textContent = item.targetTxt;
            
            const reuseBtn = document.createElement('button');
            reuseBtn.className = 'history-reuse-btn';
            reuseBtn.textContent = window.Locale ? window.Locale.t('historyReuse') : 'Reuse';
            reuseBtn.addEventListener('click', () => {
                sourceText.value = item.sourceTxt;
                targetText.value = item.targetTxt;
                document.getElementById('source-lang-select').setLanguage(item.sourceL);
                document.getElementById('target-lang-select').setLanguage(item.targetL);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            
            body.appendChild(srcDiv);
            body.appendChild(tgtDiv);
            body.appendChild(reuseBtn);
            
            wrap.appendChild(head);
            wrap.appendChild(body);
            historyList.appendChild(wrap);
        });
    }

    initApp();
});
