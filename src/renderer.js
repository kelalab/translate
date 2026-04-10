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

    selected.textContent = defaultVal;

    function renderOptions(filterText = '') {
        optionsContainer.innerHTML = '';

        // Render shortcuts
        const shortcutDiv = document.createElement('div');
        shortcutDiv.className = 'shortcut-group';
        shortcuts.forEach(lang => {
            if (lang.toLowerCase().includes(filterText.toLowerCase())) {
                const opt = document.createElement('div');
                opt.textContent = `⭐ ${lang}`;
                opt.dataset.value = lang;
                opt.addEventListener('click', () => {
                    selected.textContent = lang;
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
            if (lang.toLowerCase().includes(filterText.toLowerCase()) && !shortcuts.includes(lang)) {
                const opt = document.createElement('div');
                opt.textContent = lang;
                opt.dataset.value = lang;
                opt.addEventListener('click', () => {
                    selected.textContent = lang;
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
}

document.addEventListener('click', () => {
    document.querySelectorAll('.select-items').forEach(el => el.classList.add('select-hide'));
});

document.addEventListener('DOMContentLoaded', () => {
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
            localStatus.textContent = local.modelName;
            localStatus.className = 'status-badge success';
        } else {
            localStatus.textContent = 'No Model Found';
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
            engineSelect.innerHTML += `<option value="local">Built-in (Translategemma 4B)</option>`;
        } else {
            engineSelect.innerHTML += `<option value="local">Built-in (Checking...)</option>`;
        }

        if (result.success) {
            ollamaStatus.textContent = "Ollama: Online";
            ollamaStatus.className = "ollama-status online";
            result.models.forEach(m => {
                engineSelect.innerHTML += `<option value="ollama:${m.name}">Ollama: ${m.name}</option>`;
            });
        } else {
            ollamaStatus.textContent = "Ollama: Offline";
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
        errorToast.textContent = msg;
        errorToast.classList.add('show');
        setTimeout(() => errorToast.classList.remove('show'), 5000);
    }

    // Buttons
    document.getElementById('paste-source').addEventListener('click', async () => {
        try {
            sourceText.value = await navigator.clipboard.readText();
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
            const btn = document.getElementById('copy-target');
            btn.innerHTML = '✔️ Copied!';
            setTimeout(() => btn.innerHTML = '📋 Copy', 2000);
        } catch (e) {
            showError('Failed to copy');
        }
    });

    // Translation logic
    translateBtn.addEventListener('click', async () => {
        if (!sourceText.value.trim()) return;

        const sourceLang = document.querySelector('#source-lang-select .select-selected').textContent.replace('⭐ ', '');
        const targetLang = document.querySelector('#target-lang-select .select-selected').textContent.replace('⭐ ', '');

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
        } else {
            showError(result.error);
        }
    });
});
