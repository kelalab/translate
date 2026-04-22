# License Audit & Information

TranslateGemma is built utilizing several open-source frameworks, libraries, and machine learning models. Below is a breakdown of the specific licenses covering the built-in components:

## Frameworks & Core Applications
TranslateGemma's underlying desktop shell and packaging tools are heavily reliant on highly permissive MIT licensing.
- **`electron`**: MIT License
- **`electron-builder`**: MIT License

## Application Logic & Processing Libraries
The backend node libraries powering inference and data parsing predominantly use the permissive MIT and Apache 2.0 licenses. 
- **`node-llama-cpp`**: MIT License (Facilitates the LLM context binding and execution).
- **`pdfjs-dist` (Mozilla PDF.js)**: Apache License 2.0 (Powers the digital PDF extraction logic).
- **`tesseract.js`**: Apache License 2.0 (Handles embedded Optical Character Recognition from images).
- **`adm-zip`**: MIT License (Used to unpackage OpenXML docx structures).
- **`fast-xml-parser`**: MIT License (Used to traverse the unzipped internal docx DOM).
- **`languagedetect`**: MIT License (Performs n-gram character mappings for language auto-detection).

## The Local AI Model
- **TranslateGemma 4B**: The underlying foundation model is released under the **Gemma License**.
  - *Context*: Gemma models (by Google) are "open-weights" models. This means you are legally allowed to download, modify, run commercially, and redistribute the models. 
  - *Caveat*: The Gemma License is a tailored license designed to enforce responsible AI usage. It requires agreeing to specific terms that explicitly forbid utilizing the model for malicious purposes, harassment, or generating illegal content. For this reason, it is distinct from classical OSI-approved permissive licenses like MIT or GPL, but is free for standard developer and commercial usage.
