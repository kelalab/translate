# TranslateGemma Technical Specification

TranslateGemma is a modular Electron-based desktop application designed for fast, offline, multimodal AI translations. This specification covers the primary components of its architecture and logic.

## 1. Application Architecture

The application operates on the standard Electron `Main` / `Renderer` process paradigm with secure Inter-Process Communication (IPC).

- **`src/main.js`**: Bootstraps the application, registers the main window, and acts as the secure IPC host. It provisions local inference handlers (`invoke`), interacts with local file systems via `dialog`, and manages document saves (e.g. `save-document-dialog`).
- **`src/preload.js`**: The context bridge cleanly mapping frontend JavaScript demands (file ingestion, configuration API calls) securely to the `node` environment.
- **`src/renderer.js`**: Drives the user interface, DOM manipulation, custom dropdown widget sorting, OCR dispatcher handlers (via Tesseract.js in the browser context), and drag-and-drop zone interactions.

## 2. LLM Inference Engine (`src/llm/inference.js`)

The backend engine provides a dual-approach to language inference.

### Local Node-Llama-Cpp Integration
The primary built-in driver is handled via `node-llama-cpp`, allowing GPU bindings via GGUF models. 
- **Initialization**: Scans `process.resourcesPath/models` or `./models` for `.gguf` weights dynamically.
- **KV Cache Optimization**: The inference context defaults to 2048 tokens (`contextSize: 2048`), heavily clamping VRAM overhead (down to ~4GB) ensuring broad hardware compatibility. 
- **Session Lifecycles**: A timeout shield guarantees clean VRAM resets via `dispose()` context hooks when transitioning between heavily saturated requests.

### Glossary & Strict Prompt Construction
TranslateGemma incorporates a hardcoded terminology engine (glossary).
- The text is pre-evaluated against known entities (e.g., *Kela -> Kansaneläkelaitos*).
- Matching subsets dynamically prepend *IMPORTANT TERMINOLOGY RULES* directives into the prompt before dispatching to the LLM.

### API Fallbacks & Providers
Through REST HTTP calls, the engine maps OpenAI-compatible API schemas (and native Ollama schemas). 
- Configurable endpoints receive `/chat/completions` or `/api/generate` queries.
- Advanced Mode reads `localStorage` custom JSON mappings to override inference workflows.

## 3. Document Parsing Pipeline (`src/documentParser.js`)

Translating robust documents introduces chunking logic across `.txt`, `.pdf`, and `.docx` structures.

### DOCX OpenXML Processing
Powered by `adm-zip` and `fast-xml-parser`:
- Deconstructs `word/document.xml`.
- Walk the DOM utilizing recursive identification to isolate raw `<w:t>` tags nested within `<w:p>` blocks.
- Appends translated mutations in memory while retaining formatting, re-compiling the Zip structure.

### PDF Extraction & OCR (`pdfjs-dist` + `tesseract.js`)
Processed via `src/renderer.js` frontend rendering logic:
1. `pdfjs-dist` renders vectors page-by-page. Digital text strings are natively grouped.
2. If text densities reflect less than 20 characters per page (identifying a scanned document), a rasterized `<canvas>` is instantly passed to an embedded `Tesseract.js` worker pool.
3. The extracted text strings run through the LLM chunk dispatcher, appending standard `--- Page Break ---` separators.

## 4. Language Detection & Direction Modalities

### Auto-Detection (`languagedetect`)
The `detect-language` IPC channel analyzes clipboard/input strings.
- Latin and Cyrillic character pools analyze bi/tri-grams using frequency mapping to resolve standard western languages.
- **CJK Fast-Path**: A raw Unicode match validates scripts inherently unsupported by n-gram profilers (Hiragana `[\u3040-\u309f...]/Chinese Hanzi`).

### Bi-Directional Layouts (RTL)
The renderer interface implements zero-JS semantic BIDI layouts. Input spaces are tagged with `dir="auto"`. Text starting with Right-to-Left scripts (Arabic, Persian, Hebrew) natively snap cursor and alignment directions gracefully.
