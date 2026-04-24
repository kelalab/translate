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

## Speech & Audio Components

TranslateGemma's real-time speech translation pipeline utilizes several specialized engines:
- **`whisper.cpp`**: MIT License (Highly optimized C++ port of OpenAI's Whisper model).
- **`Piper`**: MIT License (Fast, local neural text-to-speech engine).
- **`Sherpa-ONNX`**: Apache License 2.0 (High-performance speech synthesis and recognition framework).

## Machine Learning Models

### Large Language Model
- **TranslateGemma 4B**: Released under the **Gemma License**. This is an "open-weights" license by Google which permits commercial use and redistribution while enforcing responsible AI usage policies.

### Speech Models
- **Whisper Models**: Released under the **MIT License** (by OpenAI).
- **Piper Voices**: Most voices are licensed under **Creative Commons Attribution 4.0 (CC BY 4.0)** or **MIT**, depending on the specific dataset used for training (e.g., LibriTTS, Thorsten).
- **Meta MMS (Massively Multilingual Speech)**: Released by Meta AI under the **CC-BY-NC 4.0** (Creative Commons Attribution-NonCommercial 4.0 International) for the model weights. 
  - *Important Note*: The Meta MMS models included for low-resource languages (Somali, Albanian) are intended for non-commercial evaluation and customer service research purposes within this application.
