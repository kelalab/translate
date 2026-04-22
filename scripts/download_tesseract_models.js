const fs = require('fs');
const path = require('path');
const https = require('https');

const modelsDir = path.join(__dirname, '../models/tesseract');

const langs = [
    "eng", "fin", "swe", "spa", "fra", "deu", "ita", "por", "nld", "pol", "rus", "dan",
    "nor", "ell", "tur", "ces", "hun", "ron", "bul", "hrv", "srp", "slk", "slv", "est",
    "lav", "lit", "ukr", "chi_sim", "jpn", "ara", "fas", "sqi"
];

if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

console.log(`Starting download for ${langs.length} Tesseract language models (fast tier)...`);

// Default tesseract.js CDN endpoint
const baseUrl = "https://tessdata.projectnaptha.com/4.0.0_fast/";

const downloadItem = (lang) => {
    return new Promise((resolve, reject) => {
        const fileName = `${lang}.traineddata.gz`;
        const fileUrl = `${baseUrl}${fileName}`;
        const destPath = path.join(modelsDir, fileName);
        
        if (fs.existsSync(destPath)) {
            console.log(`[SKIP] ${fileName} already exists.`);
            return resolve();
        }

        console.log(`[DOWNLOADING] ${fileName}...`);
        const file = fs.createWriteStream(destPath);
        
        https.get(fileUrl, (response) => {
            if (response.statusCode >= 300) {
                fs.unlinkSync(destPath);
                return reject(`Failed to get ${lang}, status: ${response.statusCode}`);
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`[SUCCESS] ${fileName} downloaded.`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlinkSync(destPath);
            reject(err.message);
        });
    });
};

async function run() {
    for (const lang of langs) {
        try {
            await downloadItem(lang);
        } catch (e) {
            console.error(`[ERROR] ${e}`);
        }
    }
    console.log("All Tesseract language models downloaded to /models/tesseract/ for offline use.");
}

run();
