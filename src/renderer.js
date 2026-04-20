const languages = [
    "English", "Finnish", "Swedish", "Spanish", "French", "German",
    "Italian", "Portuguese", "Dutch", "Polish", "Russian", "Danish",
    "Norwegian", "Greek", "Turkish", "Czech", "Hungarian", "Romanian",
    "Bulgarian", "Croatian", "Serbian", "Slovak", "Slovenian", "Estonian",
    "Latvian", "Lithuanian", "Ukrainian"
].sort();

const shortcuts = ["English", "Finnish", "Swedish"];

function setupCustomSelect(selectId, defaultVal) {
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
            const locLang = window.Locale ? window.Locale.tLang(lang) : lang;
            if (lang.toLowerCase().includes(filterText.toLowerCase()) || locLang.toLowerCase().includes(filterText.toLowerCase())) {
                const opt = document.createElement('div');
                opt.textContent = `⭐ ${locLang}`;
                opt.dataset.value = lang;
                opt.addEventListener('click', () => {
                    selectWrap.dataset.trueValue = lang;
                    selected.textContent = window.Locale ? window.Locale.tLang(lang) : lang;
                    itemsGroup.classList.add('select-hide');
                });
                shortcutDiv.appendChild(opt);
            }
        });
        if (shortcutDiv.children.length > 0) {
            optionsContainer.appendChild(shortcutDiv);
        }

        // Render others
        languages.forEach(lang => {
            const locLang = window.Locale ? window.Locale.tLang(lang) : lang;
            if ((lang.toLowerCase().includes(filterText.toLowerCase()) || locLang.toLowerCase().includes(filterText.toLowerCase())) && !shortcuts.includes(lang)) {
                const opt = document.createElement('div');
                opt.textContent = locLang;
                opt.dataset.value = lang;
                opt.addEventListener('click', () => {
                    selectWrap.dataset.trueValue = lang;
                    selected.textContent = window.Locale ? window.Locale.tLang(lang) : lang;
                    itemsGroup.classList.add('select-hide');
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
    let builtInHtml = '';

    // Init Logic
    async function initApp() {
        advancedApiEnabled = await window.api.getAdvancedApiFlag();
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

    // --- Localization UI ---
    document.querySelectorAll('.locale-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const lang = e.target.dataset.lang;
            if (window.Locale) window.Locale.setLocale(lang);
            renderHistory(); // Re-render history to translate UI buttons inside it
            document.getElementById('source-lang-select').reRenderOptions();
            document.getElementById('target-lang-select').reRenderOptions();
        });
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
});
