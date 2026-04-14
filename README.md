# TranslateGemma

TranslateGemma is a standalone, offline, cross-platform desktop translation application powered by the Google Gemma models (specifically tailored for translation). It leverages `node-llama-cpp` for local inference and provides the alternative option to connect to an external Ollama instance. 

Enjoy robust privacy by keeping your data local, fast responses without API costs, and a highly responsive application built using Electron.

## Features

- **Offline Local Translation:** Uses a 4B parameter Translategemma GGUF model via `node-llama-cpp` for fully offline, fast translation in your machine.
- **Ollama Integration:** Seamlessly connect to a local or networked Ollama instance to use different LLMs.
- **Language Auto-Detection:** Uses `languagedetect` to predict the source language if needed.
- **Privacy-First:** Your data never leaves your computer unless you explicitly choose an external network setting.

## Requirements and Dependencies

### System Requirements

- **OS:** Windows, macOS, or Linux
- **RAM:** Minimum 8 GB (16 GB recommended for 4B local model inference)
- **CPU/GPU:** A relatively modern CPU is required. For fast local inference, a supported GPU (Vulkan, CUDA, or Metal) is recommended. The app falls back to Vulkan where applicable.

### Software Dependencies

- [Node.js](https://nodejs.org/) (minimum v18 recommended)
- `node-llama-cpp` for internal model inference
- (Optional) [Ollama](https://ollama.com/) if using the Ollama backend
- (Optional) Build tools corresponding to your OS to compile the local C++ addons inside `node-llama-cpp`

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kelalab/translategemma.git
   cd translategemma
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Download Model:**
   The application expects a GGUF format model inside the `models/` directory for local offline inference. Run the built-in script which downloads or acts as a placeholder for the model:
   ```bash
   node scripts/download_model.js
   ```
   *(Note: For production, replace the dummy file with a real `translategemma-4b-it-q4_k_m.gguf` model.)*

## Usage (Development)

To run the application locally in development mode:

```bash
npm start
```

## Build for Production

You can build an executable installer for your operating system using `electron-builder`:

```bash
npm run build
```
This will output a setup executable in the `dist` directory (e.g., `dist/TranslateGemma Setup 1.0.0.exe` on Windows).

## Privacy

Everything runs either locally on this app or via the local API you connect it to (like Ollama). No tracking or cloud APIs are used ensuring your translations remain completely confidential.

## License

ISC License
