/**
 * Simple logging utility for consistent server-side logging
 */

const LOG_LEVELS = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG'
};

/**
 * Formats a log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 * @returns {string} Formatted log message
 */
const formatLog = (level, message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
};

/**
 * Logs an info message
 * @param {string} message - Message to log
 * @param {Object} meta - Additional metadata
 */
export const info = (message, meta = {}) => {
    console.log(formatLog(LOG_LEVELS.INFO, message, meta));
};

/**
 * Logs a warning message
 * @param {string} message - Message to log
 * @param {Object} meta - Additional metadata
 */
export const warn = (message, meta = {}) => {
    console.warn(formatLog(LOG_LEVELS.WARN, message, meta));
};

/**
 * Logs an error message
 * @param {string} message - Message to log
 * @param {Object} meta - Additional metadata (can include error object)
 */
export const error = (message, meta = {}) => {
    console.error(formatLog(LOG_LEVELS.ERROR, message, meta));
};

/**
 * Logs a debug message (only in development)
 * @param {string} message - Message to log
 * @param {Object} meta - Additional metadata
 */
export const debug = (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(formatLog(LOG_LEVELS.DEBUG, message, meta));
    }
};

export default {
    info,
    warn,
    error,
    debug
};
