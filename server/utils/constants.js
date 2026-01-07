/**
 * Server-side constants and configuration
 */

/**
 * Room Types
 */
export const ROOM_TYPES = {
    TEXT_CHAT: 'text-chat',
    VIDEO_CHAT: 'video-chat'
};

/**
 * Disconnect Reasons
 */
export const DISCONNECT_REASONS = {
    SKIP: 'skip',
    DISCONNECTED: 'disconnected',
    ERROR: 'error'
};

/**
 * Socket Events
 */
export const SOCKET_EVENTS = {
    // Connection events
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    CONNECT_ERROR: 'connect_error',

    // Room events
    JOIN_ROOM: 'join-room',
    LEAVE_ROOM: 'leave-room',

    // Signaling events
    SIGNAL: 'signal',

    // Chat events
    SEND_MESSAGE: 'send-message',
    RECEIVE_MESSAGE: 'receive-message',
    CHAT_MESSAGE: 'chat-message',

    // User events
    USER_COUNT: 'user-count',
    USER_JOINED: 'user-joined',
    USER_LEFT: 'user-left',
    MATCH_FOUND: 'match-found',

    // Report events
    REPORT_USER: 'report-user',
    REPORT_SUBMITTED: 'report-submitted'
};

/**
 * Connection Configuration
 */
export const CONNECTION_CONFIG = {
    PING_TIMEOUT: 60000,
    PING_INTERVAL: 25000,
    RECONNECTION_ATTEMPTS: 5,
    RECONNECTION_DELAY: 1000
};

/**
 * Validation Limits
 */
export const VALIDATION_LIMITS = {
    MAX_MESSAGE_LENGTH: 500,
    MAX_INTERESTS: 10,
    MAX_USERNAME_LENGTH: 50,
    MIN_USERNAME_LENGTH: 3
};
