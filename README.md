# TranslateGemma

TranslateGemma is a powerful, offline, and multi-modal desktop translation application. Designed with privacy and performance in mind, it utilizes the local **TranslateGemma 4B** AI model to provide fast, high-quality translations natively on your machine without relying on cloud services. 

Whether you need to translate simple text snippets, multi-page PDFs with complex formatting, or images containing text, TranslateGemma handles it seamlessly. It also intelligently integrates with local **Ollama** instances and supports custom REST APIs for advanced users.

## Features

- **Local Inference:** 100% offline translations powered by `node-llama-cpp`. Say goodbye to API fees and privacy concerns.
- **Auto-Language Detection:** Intelligent n-gram language detection algorithm with CJK fast-path regex fallbacks.
- **Rich Document Parsing (.txt, .pdf, .docx):** Translates large documents paragraph-by-paragraph. Handles scanned PDFs using an embedded OCR fallback mechanism.
- **Image Translation (OCR):** Tesseract.js integration translates text embedded directly within images using dynamically allocated language packs.
- **Bi-Directional Text Support:** Elegant LTR and RTL capabilities via HTML5 `dir="auto"`.
- **Glossary Support:** Built-in dynamic prompt-level terminology preservation (e.g. strict translation strings for specific brand names or terms).
- **Multilingual Interface:** User interface completely localized into English, Finnish, and Swedish.
- **OpenAI-Compatible Remote APIs:** Connect your own external REST APIs (Advanced Mode).

---

## Documentation Index

Explore the detailed markdown documentation below to master TranslateGemma's architecture, learn how to use its features, and access localized user guides.

### 📚 Technical Specifications
- [Technical Architecture & Specifications](docs/tech_spec.md)
  *Detailed breakdown of the Electron internals, LLM context management, document processing logic, and OCR integrations.*

### 📖 User Guides
- [English User Guide](docs/user_guide_en.md)
- [Suomenkielinen Käyttöopas (Finnish)](docs/user_guide_fi.md)
- [Svensk Användarguide (Swedish)](docs/user_guide_sv.md)

---

## Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) (Version 18 or newer recommended)
- Depending on your OS, you may require build tools to compile `node-llama-cpp` for your specific GPU architecture.

### Installation
1. Clone the repository and navigate into the `translate` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Download the prerequisite offline models for OCR using the built-in script:
   ```bash
   node scripts/download_tesseract_models.js
   ```
4. Start the application:
   ```bash
   npm start
   ```

### Building the Desktop Executable
TranslateGemma uses electron-builder. To create a standalone installer or executable:
```bash
npm run build
```

---
*Developed by Antigravity*
