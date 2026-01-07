import logger from '../utils/logger.js';

/**
 * User Matching Service
 * Handles user matching logic for video chat
 */

// In-memory storage for online users
const onlineUsers = new Map();
const textChatUsers = new Set();

/**
 * Adds a user to the online users map
 * @param {string} socketId - Socket ID of the user
 * @param {Object} userData - User data (interests, username, etc.)
 */
export const addUser = (socketId, userData = {}) => {
    const username = userData.username || `User${Math.floor(Math.random() * 1000)}`;

    onlineUsers.set(socketId, {
        interests: userData.interests || [],
        roomId: null,
        username,
        ...userData
    });

    logger.info('User added', { socketId, username });
    return onlineUsers.get(socketId);
};

/**
 * Removes a user from the online users map
 * @param {string} socketId - Socket ID of the user
 */
export const removeUser = (socketId) => {
    const user = onlineUsers.get(socketId);
    onlineUsers.delete(socketId);
    textChatUsers.delete(socketId);

    if (user) {
        logger.info('User removed', { socketId, username: user.username });
    }

    return user;
};

/**
 * Gets a user by socket ID
 * @param {string} socketId - Socket ID of the user
 * @returns {Object|undefined} User object or undefined
 */
export const getUser = (socketId) => {
    return onlineUsers.get(socketId);
};

/**
 * Updates a user's data
 * @param {string} socketId - Socket ID of the user
 * @param {Object} updates - Updates to apply
 * @returns {Object|undefined} Updated user object
 */
export const updateUser = (socketId, updates) => {
    const user = onlineUsers.get(socketId);

    if (user) {
        Object.assign(user, updates);
        logger.debug('User updated', { socketId, updates });
    }

    return user;
};

/**
 * Gets the total count of online users
 * @returns {number} Number of online users
 */
export const getOnlineUserCount = () => {
    return onlineUsers.size;
};

/**
 * Adds a user to text chat
 * @param {string} socketId - Socket ID of the user
 */
export const addToTextChat = (socketId) => {
    textChatUsers.add(socketId);
    logger.info('User joined text chat', { socketId });
};

/**
 * Checks if a user is in text chat
 * @param {string} socketId - Socket ID of the user
 * @returns {boolean} True if user is in text chat
 */
export const isInTextChat = (socketId) => {
    return textChatUsers.has(socketId);
};

/**
 * Finds a matching user for video chat
 * First tries to match by interests, then falls back to any waiting user
 * @param {string} socketId - Socket ID of the requesting user
 * @param {Array} interests - Array of interests
 * @returns {string|null} Socket ID of matched user or null
 */
export const findMatchingUser = (socketId, interests = []) => {
    logger.debug('Finding match', { socketId, interests });

    // First pass: look for matching interests
    for (const [id, user] of onlineUsers.entries()) {
        if (
            id !== socketId &&
            !user.roomId && // User must be waiting (no room assigned)
            user.interests &&
            Array.isArray(user.interests) &&
            user.interests.length > 0
        ) {
            const commonInterests = user.interests.filter(i =>
                interests && interests.includes(i)
            );

            if (commonInterests.length > 0) {
                logger.info('Match found with common interests', {
                    user1: socketId,
                    user2: id,
                    commonInterests
                });
                return id;
            }
        }
    }

    // Second pass: any waiting user
    for (const [id, user] of onlineUsers.entries()) {
        if (id !== socketId && !user.roomId) {
            logger.info('Match found (no common interests)', {
                user1: socketId,
                user2: id
            });
            return id;
        }
    }

    logger.debug('No match found', { socketId });
    return null;
};

/**
 * Creates a room for two users
 * @param {string} socketId1 - First user's socket ID
 * @param {string} socketId2 - Second user's socket ID
 * @returns {string} Room ID
 */
export const createRoom = (socketId1, socketId2) => {
    const roomId = `chat-${socketId1}-${socketId2}`;

    const user1 = onlineUsers.get(socketId1);
    const user2 = onlineUsers.get(socketId2);

    if (user1) user1.roomId = roomId;
    if (user2) user2.roomId = roomId;

    logger.info('Room created', { roomId, user1: socketId1, user2: socketId2 });

    return roomId;
};

/**
 * Removes a user from their current room
 * @param {string} socketId - Socket ID of the user
 * @returns {string|null} Previous room ID or null
 */
export const leaveRoom = (socketId) => {
    const user = onlineUsers.get(socketId);

    if (user && user.roomId) {
        const previousRoomId = user.roomId;
        user.roomId = null;

        logger.info('User left room', { socketId, roomId: previousRoomId });
        return previousRoomId;
    }

    return null;
};

/**
 * Gets all users (for debugging purposes)
 * @returns {Map} Map of all online users
 */
export const getAllUsers = () => {
    return onlineUsers;
};

export default {
    addUser,
    removeUser,
    getUser,
    updateUser,
    getOnlineUserCount,
    addToTextChat,
    isInTextChat,
    findMatchingUser,
    createRoom,
    leaveRoom,
    getAllUsers
};
