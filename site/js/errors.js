/**
 * Centralized error logging and handling for Scorched Earth
 * Provides consistent error tracking and debugging capabilities
 */

class ErrorLogger {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
        this.isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    }

    /**
     * Log an error with context
     * @param {Error|string} error - The error to log
     * @param {string} context - Where the error occurred
     * @param {Object} data - Additional data for debugging
     */
    log(error, context = 'Unknown', data = {}) {
        const errorInfo = {
            message: error?.message || String(error),
            context,
            data,
            timestamp: new Date().toISOString(),
            stack: error?.stack
        };

        // Store error
        this.errors.push(errorInfo);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // Console output in development
        if (this.isDevelopment) {
            console.error(`[${context}]`, error, data);
        } else {
            // In production, less verbose
            console.error(`[${context}]`, errorInfo.message);
        }

        return errorInfo;
    }

    /**
     * Log a warning
     */
    warn(message, context = 'Warning', data = {}) {
        if (this.isDevelopment) {
            console.warn(`[${context}]`, message, data);
        }
    }

    /**
     * Get recent errors for debugging
     */
    getRecentErrors(count = 10) {
        return this.errors.slice(-count);
    }

    /**
     * Clear error log
     */
    clear() {
        this.errors = [];
    }

    /**
     * Handle localStorage operations safely
     */
    safeLocalStorage(operation, key, value = null) {
        try {
            switch (operation) {
                case 'get':
                    return localStorage.getItem(key);
                case 'set':
                    localStorage.setItem(key, value);
                    return true;
                case 'remove':
                    localStorage.removeItem(key);
                    return true;
                case 'clear':
                    localStorage.clear();
                    return true;
                default:
                    return false;
            }
        } catch (error) {
            // Handle quota exceeded or security errors
            if (error.name === 'QuotaExceededError') {
                this.log(error, 'LocalStorage:QuotaExceeded', { key, operation });
                // Try to clear old data
                try {
                    const snapshots = Object.keys(localStorage).filter(k => k.includes('snapshot'));
                    if (snapshots.length > 0) {
                        localStorage.removeItem(snapshots[0]);
                        // Retry operation
                        if (operation === 'set') {
                            return this.safeLocalStorage(operation, key, value);
                        }
                    }
                } catch (clearError) {
                    this.log(clearError, 'LocalStorage:ClearFailed');
                }
            } else {
                this.log(error, 'LocalStorage:Error', { key, operation });
            }
            return false;
        }
    }

    /**
     * Wrap a function with error handling
     */
    wrap(fn, context = 'Unknown') {
        return (...args) => {
            try {
                return fn(...args);
            } catch (error) {
                this.log(error, context, { args });
                // Re-throw in development for debugging
                if (this.isDevelopment) {
                    throw error;
                }
            }
        };
    }

    /**
     * Wrap an async function with error handling
     */
    wrapAsync(fn, context = 'Unknown') {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.log(error, context, { args });
                // Re-throw in development for debugging
                if (this.isDevelopment) {
                    throw error;
                }
            }
        };
    }

    /**
     * Generate a formatted error report string with build metadata
     */
    getFullReport() {
        const version = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';
        const hash = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'local';
        const buildDate = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : 'n/a';

        let report = `Scorched Earth Error Report\n`;
        report += `Version: ${version} (${hash})\n`;
        report += `Built: ${buildDate}\n`;
        report += `Browser: ${navigator.userAgent}\n`;
        report += `URL: ${window.location.href}\n`;
        report += `Time: ${new Date().toISOString()}\n`;
        report += `Errors: ${this.errors.length}\n`;
        report += `${'='.repeat(50)}\n\n`;

        if (this.errors.length === 0) {
            report += 'No errors recorded.\n';
        } else {
            for (const err of this.errors) {
                report += `[${err.timestamp}] [${err.context}]\n`;
                report += `  ${err.message}\n`;
                if (err.stack) {
                    report += `  Stack: ${err.stack.split('\n').slice(0, 3).join('\n  ')}\n`;
                }
                if (err.data && Object.keys(err.data).length > 0) {
                    report += `  Data: ${JSON.stringify(err.data)}\n`;
                }
                report += '\n';
            }
        }

        return report;
    }

    /**
     * Copy error report to clipboard
     * @returns {Promise<boolean>} whether the copy succeeded
     */
    async copyErrorReport() {
        const report = this.getFullReport();
        try {
            await navigator.clipboard.writeText(report);
            return true;
        } catch {
            // Fallback for older browsers or non-HTTPS
            const textarea = document.createElement('textarea');
            textarea.value = report;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                return true;
            } catch {
                return false;
            } finally {
                document.body.removeChild(textarea);
            }
        }
    }
}

// Create singleton instance
const errorLogger = new ErrorLogger();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = errorLogger;
} else {
    window.errorLogger = errorLogger;
}

export default errorLogger;