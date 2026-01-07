/**
 * Application-wide constants and configuration values
 * Centralizes all magic numbers, timeouts, and configuration
 */

/**
 * WebRTC Configuration
 */
export const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
];

export const PEER_CONNECTION_CONFIG = {
    iceServers: ICE_SERVERS
};

/**
 * Timing Constants (in milliseconds)
 */
export const TIMING = {
    ERROR_AUTO_HIDE_DURATION: 6000,
    AUTO_SEARCH_DELAY: 1000,
    CLICK_OUTSIDE_DELAY: 100,
    MEDIA_INIT_RETRY_DELAY: 500
};

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
 * ICE Connection States
 */
export const ICE_CONNECTION_STATES = {
    NEW: 'new',
    CHECKING: 'checking',
    CONNECTED: 'connected',
    COMPLETED: 'completed',
    FAILED: 'failed',
    DISCONNECTED: 'disconnected',
    CLOSED: 'closed'
};

/**
 * Signaling States
 */
export const SIGNALING_STATES = {
    STABLE: 'stable',
    HAVE_LOCAL_OFFER: 'have-local-offer',
    HAVE_REMOTE_OFFER: 'have-remote-offer',
    HAVE_LOCAL_PRANSWER: 'have-local-pranswer',
    HAVE_REMOTE_PRANSWER: 'have-remote-pranswer',
    CLOSED: 'closed'
};

/**
 * Signal Types
 */
export const SIGNAL_TYPES = {
    OFFER: 'offer',
    ANSWER: 'answer',
    CANDIDATE: 'candidate'
};

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
    MEDIA_ACCESS_DENIED: 'Failed to access camera and microphone. Please check your permissions.',
    MEDIA_NOT_READY: 'Please wait for camera to initialize...',
    CONNECTION_FAILED: 'Failed to create video connection. Please try again.',
    PEER_CONNECTION_FAILED: 'Failed to initialize connection. Please refresh and try again.',
    SERVER_CONNECTION_FAILED: 'Failed to connect to server. Please try again later.',
    USER_SKIPPED: 'User skipped you',
    USER_DISCONNECTED: 'The other user has disconnected'
};

/**
 * Socket Events
 */
export const SOCKET_EVENTS = {
    // Emitted events
    JOIN_ROOM: 'join-room',
    LEAVE_ROOM: 'leave-room',
    SIGNAL: 'signal',
    CHAT_MESSAGE: 'chat-message',
    SEND_MESSAGE: 'send-message',
    REPORT_USER: 'report-user',

    // Received events
    MATCH_FOUND: 'match-found',
    USER_LEFT: 'user-left',
    RECEIVE_MESSAGE: 'receive-message',
    USER_COUNT: 'user-count',
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    CONNECT_ERROR: 'connect_error',
    REPORT_SUBMITTED: 'report-submitted',
    USER_JOINED: 'user-joined'
};

/**
 * UI Constants
 */
export const UI_CONSTANTS = {
    MAX_MESSAGE_LENGTH: 500,
    CHAT_POPUP_WIDTH: 400,
    CHAT_POPUP_HEIGHT: 500,
    VIDEO_ASPECT_RATIO: '16/9'
};
