const chalk = require('chalk');
const moment = require('moment');

class Logger {
    constructor(options = {}) {
        this.level = options.level || 'info';
        this.enableConsole = options.enableConsole !== false;
        this.enableFile = options.enableFile || false;
    }
    
    _formatMessage(level, message, data = null) {
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        const levelStr = level.toUpperCase().padEnd(5);
        let formatted = `[${timestamp}] ${levelStr} ${message}`;
        
        if (data) {
            formatted += `\n${JSON.stringify(data, null, 2)}`;
        }
        
        return formatted;
    }
    
    _colorize(level, message) {
        switch (level) {
            case 'error': return chalk.red(message);
            case 'warn': return chalk.yellow(message);
            case 'success': return chalk.green(message);
            case 'info': return chalk.blue(message);
            case 'debug': return chalk.gray(message);
            default: return message;
        }
    }
    
    _log(level, message, data = null) {
        if (!this.enableConsole) return;
        
        const formatted = this._formatMessage(level, message, data);
        const colorized = this._colorize(level, formatted);
        
        console.log(colorized);
    }
    
    error(message, data = null) {
        this._log('error', `❌ ${message}`, data);
    }
    
    warn(message, data = null) {
        this._log('warn', `⚠️  ${message}`, data);
    }
    
    success(message, data = null) {
        this._log('success', `✅ ${message}`, data);
    }
    
    info(message, data = null) {
        this._log('info', `ℹ️  ${message}`, data);
    }
    
    debug(message, data = null) {
        this._log('debug', `🔍 ${message}`, data);
    }
    
    transaction(txHash, description) {
        this.info(`Transaction sent: ${description}`);
        this.debug(`TX Hash: ${txHash}`);
    }
    
    contract(address, name) {
        this.info(`Connected to ${name} at ${address}`);
    }
}

module.exports = Logger;