const translations = {
    en: {
        title: "Translategemma",
        loading: "Loading Model...",
        online: "Ollama: Online",
        offline: "Ollama: Offline",
        paste: "📋 Paste",
        clear: "✖ Clear",
        copy: "📋 Copy",
        copied: "✔️ Copied!",
        translate: "Translate",
        historyTitle: "Translation History",
        historyReuse: "Reuse",
        sourcePlace: "Enter text to translate...",
        targetPlace: "Translation will appear here...",
        errClip: "Failed to read clipboard",
        errCopy: "Failed to copy",
        noModel: "No Model Found",
        builtIn: "Built-in (Translategemma 4B)",
        builtInChecking: "Built-in (Checking...)",
        tabText: "Text",
        tabDoc: "Documents",
        tabImg: "Images",
        extractedSource: "Extracted Source Text",
        translatedText: "Translated Text",
        imageDrop: "Drag & Drop Image or Paste from Clipboard",
        ocrRunning: "Running OCR...",
        ocrFailed: "OCR failed: ",
        imgSrcLang: "Image Text Language:",
        imgTgtLang: "Translate To:",
        docSrcLang: "Document Language:",
        docTgtLang: "Translate To:",
        docDrop: "Drag & Drop Word (.docx) or Text (.txt) Document here",
        docReset: "Reset / Process Another Document"
    },
    fi: {
        title: "Translategemma",
        loading: "Ladataan mallia...",
        online: "Ollama: Yhdistetty",
        offline: "Ollama: Ei yhteyttä",
        paste: "📋 Liitä",
        clear: "✖ Tyhjennä",
        copy: "📋 Kopioi",
        copied: "✔️ Kopioitu!",
        translate: "Käännä",
        historyTitle: "Käännöshistoria",
        historyReuse: "Käytä",
        sourcePlace: "Kirjoita käännettävä teksti...",
        targetPlace: "Käännös ilmestyy tähän...",
        errClip: "Leikepöydän luku epäonnistui",
        errCopy: "Kopiointi epäonnistui",
        noModel: "Mallia ei löydy",
        builtIn: "Sisäänrakennettu (Translategemma 4B)",
        builtInChecking: "Sisäänrakennettu (Tarkistetaan...)",
        tabText: "Teksti",
        tabDoc: "Asiakirjat",
        tabImg: "Kuvat",
        extractedSource: "Tunnistettu lähdeteksti",
        translatedText: "Käännetty teksti",
        imageDrop: "Raahaa kuva tähän tai liitä leikepöydältä",
        ocrRunning: "Tunnistetaan tekstiä...",
        ocrFailed: "Tekstintunnistus epäonnistui: ",
        imgSrcLang: "Kuvan kieli:",
        imgTgtLang: "Käännä kielelle:",
        docSrcLang: "Asiakirjan kieli:",
        docTgtLang: "Käännä kielelle:",
        docDrop: "Raahaa Asiakirja (.docx) tai Tekstitiedosto (.txt) tähän",
        docReset: "Nollaa / Käännä toinen asiakirja"
    },
    sv: {
        title: "Translategemma",
        loading: "Laddar modell...",
        online: "Ollama: Ansluten",
        offline: "Ollama: Frånkopplad",
        paste: "📋 Klistra in",
        clear: "✖ Rensa",
        copy: "📋 Kopiera",
        copied: "✔️ Kopierad!",
        translate: "Översätt",
        historyTitle: "Översättningshistorik",
        historyReuse: "Återanvänd",
        sourcePlace: "Ange text för att översätta...",
        targetPlace: "Översättningen visas här...",
        errClip: "Kunde inte läsa urklipp",
        errCopy: "Kopiering misslyckades",
        noModel: "Ingen modell hittades",
        builtIn: "Inbyggd (Translategemma 4B)",
        builtInChecking: "Inbyggd (Kontrollerar...)",
        tabText: "Text",
        tabDoc: "Dokument",
        tabImg: "Bilder",
        extractedSource: "Extraherad källtext",
        translatedText: "Översatt text",
        imageDrop: "Dra bild hit eller klistra in",
        ocrRunning: "Kör OCR...",
        ocrFailed: "OCR misslyckades: ",
        imgSrcLang: "Bildens textspråk:",
        imgTgtLang: "Översätt till:",
        docSrcLang: "Dokumentspråk:",
        docTgtLang: "Översätt till:",
        docDrop: "Dra och släpp Word- (.docx) eller textdokument (.txt) här",
        docReset: "Återställ / Översätt ett annat dokument"
    }
};

const languageNames = {
    "English": { en: "English", fi: "Englanti", sv: "Engelska" },
    "Finnish": { en: "Finnish", fi: "Suomi", sv: "Finska" },
    "Swedish": { en: "Swedish", fi: "Ruotsi", sv: "Svenska" },
    "Spanish": { en: "Spanish", fi: "Espanja", sv: "Spanska" },
    "French": { en: "French", fi: "Ranska", sv: "Franska" },
    "German": { en: "German", fi: "Saksa", sv: "Tyska" },
    "Italian": { en: "Italian", fi: "Italia", sv: "Italienska" },
    "Portuguese": { en: "Portuguese", fi: "Portugali", sv: "Portugisiska" },
    "Dutch": { en: "Dutch", fi: "Hollanti", sv: "Holländska" },
    "Polish": { en: "Polish", fi: "Puola", sv: "Polska" },
    "Russian": { en: "Russian", fi: "Venäjä", sv: "Ryska" },
    "Danish": { en: "Danish", fi: "Tanska", sv: "Danska" },
    "Norwegian": { en: "Norwegian", fi: "Norja", sv: "Norska" },
    "Greek": { en: "Greek", fi: "Kreikka", sv: "Grekiska" },
    "Turkish": { en: "Turkish", fi: "Turkki", sv: "Turkiska" },
    "Czech": { en: "Czech", fi: "Tšekki", sv: "Tjeckiska" },
    "Hungarian": { en: "Hungarian", fi: "Unkari", sv: "Ungerska" },
    "Romanian": { en: "Romanian", fi: "Romania", sv: "Rumänska" },
    "Bulgarian": { en: "Bulgarian", fi: "Bulgaria", sv: "Bulgariska" },
    "Croatian": { en: "Croatian", fi: "Kroatia", sv: "Kroatiska" },
    "Serbian": { en: "Serbian", fi: "Serbia", sv: "Serbiska" },
    "Slovak": { en: "Slovak", fi: "Slovakia", sv: "Slovakiska" },
    "Slovenian": { en: "Slovenian", fi: "Slovenia", sv: "Slovenska" },
    "Estonian": { en: "Estonian", fi: "Viro", sv: "Estniska" },
    "Latvian": { en: "Latvian", fi: "Latvia", sv: "Lettiska" },
    "Lithuanian": { en: "Lithuanian", fi: "Liettua", sv: "Litauiska" },
    "Ukrainian": { en: "Ukrainian", fi: "Ukraina", sv: "Ukrainska" }
};

let currentLang = 'en';

function setLocale(lang) {
    if (['en', 'fi', 'sv'].includes(lang)) {
        currentLang = lang;
        localStorage.setItem('ui_language', lang);
        applyLocalizations();
    }
}

function getLocale() {
    return currentLang;
}

function t(key) {
    return translations[currentLang][key] || key;
}

function tLang(englishName) {
    if (languageNames[englishName]) {
        return languageNames[englishName][currentLang] || englishName;
    }
    return englishName;
}

function applyLocalizations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
    
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
        const parts = el.getAttribute('data-i18n-attr').split(':');
        if (parts.length === 2) {
            el.setAttribute(parts[0], t(parts[1]));
        }
    });

    // Re-render currently selected languages visually
    const sl = document.getElementById('source-lang-select');
    if (sl && sl.dataset.trueValue) {
        sl.querySelector('.select-selected').textContent = tLang(sl.dataset.trueValue);
    }
    const tl = document.getElementById('target-lang-select');
    if (tl && tl.dataset.trueValue) {
        tl.querySelector('.select-selected').textContent = tLang(tl.dataset.trueValue);
    }
}

// Automatically match system default
function initLocale() {
    const saved = localStorage.getItem('ui_language');
    if (saved && ['en', 'fi', 'sv'].includes(saved)) {
        currentLang = saved;
    } else {
        const sys = navigator.language.substring(0, 2);
        if (sys === 'fi' || sys === 'sv') {
            currentLang = sys;
        } else {
            currentLang = 'en';
        }
    }
    applyLocalizations();
}

window.Locale = {
    setLocale,
    getLocale,
    t,
    tLang,
    initLocale
};
