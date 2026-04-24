const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

class Logger {
    constructor() {
        this.debugEnabled = false;
        this.logFilePath = null;
        this.init();
    }

    init() {
        // Create debug directory in the user data folder or project root
        // Using project root/debug for visibility as requested
        const debugDir = path.join(process.cwd(), 'debug');
        if (!fs.existsSync(debugDir)) {
            fs.mkdirSync(debugDir, { recursive: true });
        }
        this.logFilePath = path.join(debugDir, 'app.log');

        // Check for debug flag
        this.debugEnabled = process.argv.includes('--enable-debug') || 
                            process.argv.includes('-d') || 
                            process.env.DEBUG === '1' ||
                            (app && app.commandLine.hasSwitch('enable-debug'));

        
        this.info('MAIN', `Logger initialized. Debug mode: ${this.debugEnabled}`);
    }

    setDebugEnabled(enabled) {
        this.debugEnabled = enabled;
    }

    log(level, category, message) {
        const levelValue = LOG_LEVELS[level] || 0;
        
        // Always log ERROR and WARN. Only log INFO and DEBUG if debugEnabled is true.
        if (levelValue > LOG_LEVELS.WARN && !this.debugEnabled) {
            return;
        }

        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] [${category}] ${message}\n`;

        // Write to file
        try {
            fs.appendFileSync(this.logFilePath, logEntry);
        } catch (err) {
            console.error('Failed to write to log file:', err);
        }

        // Also output to console for development visibility
        if (level === 'ERROR') {
            console.error(logEntry.trim());
        } else if (level === 'WARN') {
            console.warn(logEntry.trim());
        } else {
            console.log(logEntry.trim());
        }
    }

    error(category, message) { this.log('ERROR', category, message); }
    warn(category, message) { this.log('WARN', category, message); }
    info(category, message) { this.log('INFO', category, message); }
    debug(category, message) { this.log('DEBUG', category, message); }
}

const logger = new Logger();
module.exports = logger;
