const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const { translateText } = require('./llm/inference.js');

class DocumentParser {
    constructor() {}

    async processDocument(filePath, sourceLang, targetLang, config, onProgress) {
        const ext = path.extname(filePath).toLowerCase();
        
        onProgress(`Starting to process document: ${path.basename(filePath)}...`);

        if (ext === '.txt') {
            return await this.processTextFile(filePath, sourceLang, targetLang, config, onProgress);
        } else if (ext === '.docx') {
            return await this.processWordDoc(filePath, sourceLang, targetLang, config, onProgress);
        } else {
            throw new Error('Unsupported file type. Only .txt and .docx are supported.');
        }
    }

    async processTextFile(filePath, sourceLang, targetLang, config, onProgress) {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Split by paragraph blocks (double newline)
        const paragraphs = content.split(/\n\s*\n/);
        const translatedParagraphs = [];

        for (let i = 0; i < paragraphs.length; i++) {
            const p = paragraphs[i].trim();
            if (!p) {
                translatedParagraphs.push('');
                continue;
            }
            onProgress(`[${i+1}/${paragraphs.length}] Translating section...`);
            
            try {
                const res = await translateText(sourceLang, targetLang, p, config);
                if (res.success) {
                    onProgress(`> Result: ${res.translatedText}`);
                    translatedParagraphs.push(res.translatedText);
                } else {
                    onProgress(`[ERROR]: ${res.error}`);
                    translatedParagraphs.push(p); // Fallback to original
                }
            } catch (e) {
                onProgress(`[ERROR]: ${e.message}`);
                translatedParagraphs.push(p);
            }
        }

        const outStr = translatedParagraphs.join('\n\n');
        return { buffer: Buffer.from(outStr, 'utf-8'), ext: '.txt' };
    }

    async processWordDoc(filePath, sourceLang, targetLang, config, onProgress) {
        const zip = new AdmZip(filePath);
        const zipEntries = zip.getEntries();
        
        const docEntry = zipEntries.find(e => e.entryName === "word/document.xml");
        if (!docEntry) throw new Error("Invalid .docx file structure.");

        const xmlData = docEntry.getData().toString("utf8");

        const options = {
            ignoreAttributes: false,
            preserveOrder: true,
            allowBooleanAttributes: true,
            parseTagValue: false
        };
        const parser = new XMLParser(options);
        const builder = new XMLBuilder(options);
        
        let docObj = parser.parse(xmlData);

        let totalParagraphs = 0;
        let pCount = 0;

        const countParagraphs = (nodes) => {
            if (!Array.isArray(nodes)) return;
            for (let node of nodes) {
                const key = Object.keys(node)[0];
                if (key === 'w:p') totalParagraphs++;
                else countParagraphs(node[key]);
            }
        };

        const translateNodes = async (nodes) => {
            if (!Array.isArray(nodes)) return;
            for (let node of nodes) {
                Object.keys(node).forEach(k => {
                   if(k.startsWith(':@')) return; // ignore attributes object
                });

                const key = Object.keys(node).find(k => !k.startsWith(':@'));
                if (!key) continue;
                
                if (key === 'w:p') {
                    pCount++;
                    let pTextParts = [];
                    let textNodeRefs = [];
                    
                    const extractText = (innerNodes) => {
                        for (let inner of innerNodes) {
                            const innerKey = Object.keys(inner).find(k => !k.startsWith(':@'));
                            if (!innerKey) continue;

                            if (innerKey === 'w:t') {
                                if (inner['w:t'] && inner['w:t'].length > 0) {
                                    let txtVal = inner['w:t'][0]['#text'];
                                    // if it's purely a string value, then it does not have #text object mapping natively.
                                    if(typeof inner['w:t'][0] === 'string' || typeof inner['w:t'][0] === 'number') {
                                        txtVal = String(inner['w:t'][0]);
                                        pTextParts.push(txtVal);
                                        textNodeRefs.push({ ref: inner['w:t'], index: 0, isDirect: true });
                                    } else if (inner['w:t'][0]['#text'] !== undefined) {
                                        pTextParts.push(inner['w:t'][0]['#text']);
                                        textNodeRefs.push({ ref: inner['w:t'][0], index: '#text', isDirect: false });
                                    }
                                }
                            } else if (Array.isArray(inner[innerKey])) {
                                extractText(inner[innerKey]);
                            }
                        }
                    };

                    extractText(node['w:p']);
                    const fullText = pTextParts.join('');

                    if (fullText.trim().length > 0) {
                        onProgress(`[${pCount}/${totalParagraphs}] Translating chunk...`);
                        try {
                            const res = await translateText(sourceLang, targetLang, fullText, config);
                            if (res.success) {
                                onProgress(`> Result: ${res.translatedText}`);
                                if (textNodeRefs.length > 0) {
                                    let head = textNodeRefs[0];
                                    if(head.isDirect) {
                                        head.ref[head.index] = res.translatedText;
                                    } else {
                                        head.ref[head.index] = res.translatedText;
                                    }
                                    for (let i = 1; i < textNodeRefs.length; i++) {
                                        let sib = textNodeRefs[i];
                                        if (sib.isDirect) sib.ref[sib.index] = '';
                                        else sib.ref[sib.index] = '';
                                    }
                                }
                            } else {
                                onProgress(`[ERROR]: ${res.error}`);
                            }
                        } catch (e) {
                            onProgress(`[ERROR]: ${e.message}`);
                        }
                    }
                } else if (Array.isArray(node[key])) {
                    await translateNodes(node[key]);
                }
            }
        };

        countParagraphs(docObj);
        onProgress(`Identified ${totalParagraphs} paragraphs inside DOCX... mapping chunk allocations.`);
        await translateNodes(docObj);

        onProgress(`Finished translating document blocks. Re-compiling OpenXML structure...`);
        const newXmlData = builder.build(docObj);
        
        zip.updateFile("word/document.xml", Buffer.from(newXmlData, "utf8"));
        return { buffer: zip.toBuffer(), ext: '.docx' };
    }
}

module.exports = new DocumentParser();
