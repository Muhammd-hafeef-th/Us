import { VALIDATION_LIMITS } from './constants.js';

/**
 * Validates a room ID
 * @param {string} roomId - The room ID to validate
 * @returns {boolean} True if valid
 */
export const isValidRoomId = (roomId) => {
    if (!roomId || typeof roomId !== 'string') {
        return false;
    }

    // Room ID should be non-empty string
    return roomId.trim().length > 0;
};

/**
 * Validates a message
 * @param {string} message - The message to validate
 * @returns {Object} Validation result with isValid and error properties
 */
export const validateMessage = (message) => {
    if (!message || typeof message !== 'string') {
        return { isValid: false, error: 'Message must be a non-empty string' };
    }

    const trimmedMessage = message.trim();

    if (trimmedMessage.length === 0) {
        return { isValid: false, error: 'Message cannot be empty' };
    }

    if (trimmedMessage.length > VALIDATION_LIMITS.MAX_MESSAGE_LENGTH) {
        return { isValid: false, error: `Message too long (max ${VALIDATION_LIMITS.MAX_MESSAGE_LENGTH} characters)` };
    }

    return { isValid: true, message: trimmedMessage };
};

/**
 * Validates interests array
 * @param {Array} interests - Array of interests to validate
 * @returns {Object} Validation result
 */
export const validateInterests = (interests) => {
    if (!interests) {
        return { isValid: true, interests: [] };
    }

    if (!Array.isArray(interests)) {
        return { isValid: false, error: 'Interests must be an array' };
    }

    if (interests.length > VALIDATION_LIMITS.MAX_INTERESTS) {
        return { isValid: false, error: `Too many interests (max ${VALIDATION_LIMITS.MAX_INTERESTS})` };
    }

    // Filter out invalid interests
    const validInterests = interests
        .filter(i => typeof i === 'string' && i.trim().length > 0)
        .map(i => i.trim());

    return { isValid: true, interests: validInterests };
};

/**
 * Validates username
 * @param {string} username - The username to validate
 * @returns {Object} Validation result
 */
export const validateUsername = (username) => {
    if (!username || typeof username !== 'string') {
        return { isValid: false, error: 'Username must be a string' };
    }

    const trimmedUsername = username.trim();

    if (trimmedUsername.length < VALIDATION_LIMITS.MIN_USERNAME_LENGTH) {
        return { isValid: false, error: `Username too short (min ${VALIDATION_LIMITS.MIN_USERNAME_LENGTH} characters)` };
    }

    if (trimmedUsername.length > VALIDATION_LIMITS.MAX_USERNAME_LENGTH) {
        return { isValid: false, error: `Username too long (max ${VALIDATION_LIMITS.MAX_USERNAME_LENGTH} characters)` };
    }

    return { isValid: true, username: trimmedUsername };
};

/**
 * Sanitizes user input to prevent XSS
 * @param {string} input - The input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return '';

    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};
