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
    const localStatus = document.getElementById('local-status');
    const ollamaStatus = document.getElementById('ollama-status');
    const engineSelect = document.getElementById('engine-select');
    const translateBtn = document.getElementById('translate-btn');
    const sourceText = document.getElementById('source-text');
    const targetText = document.getElementById('target-text');
    const errorToast = document.getElementById('error-toast');

    // Init Logic
    async function initApp() {
        // Check local model
        const local = await window.api.getLocalModelStatus();
        if (local.success) {
            localStatus.removeAttribute('data-i18n');
            localStatus.textContent = local.modelName;
            localStatus.className = 'status-badge success';
            // Set tooltip since text might truncate
            localStatus.title = local.modelName;
        } else {
            localStatus.setAttribute('data-i18n', 'noModel');
            localStatus.textContent = window.Locale ? window.Locale.t('noModel') : 'No Model Found';
            localStatus.className = 'status-badge error';
            showError("Built-in model not found. " + local.error);
        }

        // Check Ollama
        checkOllama();
        setInterval(checkOllama, 10000); // Check every 10s
    }

    async function checkOllama() {
        const result = await window.api.getOllamaModels();
        const currentSelection = engineSelect.value;

        let hasLocal = false;
        Array.from(engineSelect.options).forEach(opt => {
            if (opt.value === 'local') hasLocal = true;
        });

        engineSelect.innerHTML = '';
        if (hasLocal) {
            engineSelect.innerHTML += `<option value="local" data-i18n="builtIn">${window.Locale ? window.Locale.t('builtIn') : 'Built-in'}</option>`;
        } else {
            engineSelect.innerHTML += `<option value="local" data-i18n="builtInChecking">${window.Locale ? window.Locale.t('builtInChecking') : 'Checking...'}</option>`;
        }

        if (result.success) {
            ollamaStatus.textContent = window.Locale ? window.Locale.t('online') : "Ollama: Online";
            ollamaStatus.className = "ollama-status online";
            result.models.forEach(m => {
                engineSelect.innerHTML += `<option value="ollama:${m.name}">Ollama: ${m.name}</option>`;
            });
        } else {
            ollamaStatus.textContent = window.Locale ? window.Locale.t('offline') : "Ollama: Offline";
            ollamaStatus.className = "ollama-status offline";
        }

        // Restore selection if possible
        if (currentSelection) {
            engineSelect.value = currentSelection;
            if (engineSelect.selectedIndex === -1) engineSelect.value = 'local';
        }
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
        if (engineVal.startsWith('ollama:')) {
            config.engine = 'ollama';
            config.modelName = engineVal.split(':')[1];
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
