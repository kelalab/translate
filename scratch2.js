const path = require('path');
(async () => {
    const { getLlama, LlamaChatSession } = await import('node-llama-cpp');
    try {
        const llama = await getLlama({ logger: () => {} });
        const model = await llama.loadModel({ modelPath: path.join(__dirname, 'models/translategemma-4b.gguf') });
        const context = await model.createContext();
        const session = new LlamaChatSession({ contextSequence: context.getSequence() });
        
        console.log("seq clearHistory?", typeof session.sequence.clearHistory);
        console.log("session properties", Object.keys(session));
        console.log("sequence properties", Object.keys(session.sequence.__proto__));
        process.exit(0);
    } catch(e) { console.error(e); process.exit(1); }
})();
