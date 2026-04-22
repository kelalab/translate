# TranslateGemma User Guide

Welcome to TranslateGemma! This multi-modal, offline translation app allows you to translate texts, read documents, and process text from images using powerful local AI models without sending your data to the cloud.

---

## 1. Navigating the App

When you launch the app, you will find three primary tabs: **Text**, **Documents**, and **Images**. 

- **Language Settings**: Use the dropdown menus at the top of a pane to select your Source Language and your Target Language. You can scroll or search for the exact language you need.
- **UI Localization**: At the top-right corner of the application window, you can toggle the interface language between `EN` (English), `FI` (Finnish), and `SV` (Swedish). Changing this setting will instantly update all buttons, menus, and automatically sort the dropdown language lists alphabetically in the newly selected language. 

---

## 2. Text Translation Mode

Translate standard text segments instantly.

1. **Auto-Detect**: Paste text directly into the Source box on the left. Wait a brief second, and TranslateGemma will automatically detect the language (handling everything from French to Japanese and Arabic) and update your source dropdown!
2. **Right-to-Left (RTL)**: If you type or paste an RTL language like Arabic or Persian, the text field will automatically align to the right to accommodate comfortable typing.
3. **Execute**: Click the **"Translate"** button. Your translation will stream into the right-hand box. You can easily click **"Copy"** at the bottom right.
4. **History Drawer**: Expand the "Translation History" tab at the bottom of the app to review your 20 most recent text translations.

---

## 3. Document Translation Mode

Translate large, multi-page files locally paragraph-by-paragraph.

1. **Upload Documents**: Drag and drop a supported file format into the "Drag & Drop" box.
   - **Supported extensions:** `.txt`, `.docx` (Microsoft Word), and `.pdf`.
2. **Translation Processing**: The app will launch a terminal console showing real-time parsing progress. 
   - Note on PDFs: If TranslateGemma detects a scanned PDF without digital text, it will seamlessly fall back to an OCR (Optical Character Recognition) visual pass on each page. *This may take significantly longer depending on your computer's speed.*
3. **Save**: Once 100% complete, a Save File dialog will open. Text formats are saved cleanly, and Word documents are rebuilt to retain their original font styles!

---

## 4. Image Translation Mode (OCR)

Extract and translate text locked inside image formats.

1. **Input method**: Drag and drop any image file into the image box, or simply press `Ctrl+V` to paste an image straight from your clipboard (e.g. from a screenshot tool).
2. **Extraction Engine**: TranslateGemma uses built-in language models to digitally read the image. Ensure you select the correct **Image Text Language** dropdown before processing so the app fetches the right visual alphabet library.
3. **Translation**: The extracted text will be placed in the source box. Make any edits you like, and then click translate to funnel it through the AI.

---

## 5. Expert Features: External APIs

While the built-in *TranslateGemma 4B* model is powerful, power users may wish to pass requests through remote custom inference servers or local hardware.

### Unlocking the Settings Menu
To see the hidden API gear icon next to the "Built-in" LLM dropdown at the top right, launch the app with an expert flag. Via terminal/shortcut:
`npm start -- --enable-external-api` (or `--advanced-api`)

### Managing Providers
1. Click the **Gear icon (⚙)** to open the API Providers menu.
2. The app inherently supports **Local Ollama** (auto-detecting standard 11434 ports).
3. To add a custom server (e.g. OpenAI or a Remote Ollama tunnel via Ngrok), fill out:
   - **Name**: A nickname for the menu.
   - **Endpoint URL**: The exact REST layer (e.g. `http://remote-server:11434/v1`).
   - **API Key**: If required.
   - **Whitelist Models**: (Optional) Provide a comma-separated list of model names you want to load to keep menus clean (e.g., `llama3, gemma, mistral`).
4. Close the menu, and your custom models will instantly populate the main engine dropdown list!
