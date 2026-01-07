import Report from '../models/Report.js';
import matchingService from '../services/matchingService.js';
import { validateMessage, validateInterests } from '../utils/validators.js';
import logger from '../utils/logger.js';
import { SOCKET_EVENTS, ROOM_TYPES, DISCONNECT_REASONS } from '../utils/constants.js';

/**
 * Socket.IO event handlers for chat functionality
 * Handles video chat matching, text chat, and signaling
 * @param {SocketIO.Server} io - Socket.IO server instance
 */
const chatSocket = (io) => {
  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    logger.info('New client connected', { socketId: socket.id });

    // Add user to online users
    const user = matchingService.addUser(socket.id);

    // Broadcast updated user count
    io.emit(SOCKET_EVENTS.USER_COUNT, matchingService.getOnlineUserCount());

    /**
     * Handles join room requests for both video and text chat
     */
    socket.on(SOCKET_EVENTS.JOIN_ROOM, (data) => {
      try {
        const { roomId: requestedRoomId, interests = [] } = data || {};
        const user = matchingService.getUser(socket.id);

        if (!user) {
          logger.warn('User not found for join-room', { socketId: socket.id });
          return;
        }

        // Validate and set interests
        const interestValidation = validateInterests(interests);
        if (!interestValidation.isValid) {
          logger.warn('Invalid interests', {
            socketId: socket.id,
            error: interestValidation.error
          });
          return;
        }

        matchingService.updateUser(socket.id, {
          interests: interestValidation.interests
        });

        // Handle text chat room
        if (requestedRoomId === ROOM_TYPES.TEXT_CHAT) {
          matchingService.updateUser(socket.id, { roomId: ROOM_TYPES.TEXT_CHAT });
          matchingService.addToTextChat(socket.id);
          socket.join(ROOM_TYPES.TEXT_CHAT);

          // Notify others in text chat
          socket.to(ROOM_TYPES.TEXT_CHAT).emit(SOCKET_EVENTS.USER_JOINED, {
            username: user.username
          });

          logger.info('User joined text chat', {
            socketId: socket.id,
            username: user.username
          });
          return;
        }

        // Video chat matching logic
        logger.info('User looking for video chat match', {
          socketId: socket.id,
          interests: interestValidation.interests
        });

        const matchId = matchingService.findMatchingUser(
          socket.id,
          interestValidation.interests
        );

        if (matchId) {
          // Match found!
          const matchUser = matchingService.getUser(matchId);
          const newRoomId = matchingService.createRoom(socket.id, matchId);

          // Join socket rooms
          socket.join(newRoomId);
          const matchSocket = io.sockets.sockets.get(matchId);
          if (matchSocket) {
            matchSocket.join(newRoomId);
          }

          // Notify both users
          // The new user (current socket) is the initiator
          io.to(matchId).emit(SOCKET_EVENTS.MATCH_FOUND, {
            roomId: newRoomId,
            initiator: false,
            interests: interestValidation.interests
          });

          socket.emit(SOCKET_EVENTS.MATCH_FOUND, {
            roomId: newRoomId,
            initiator: true,
            interests: matchUser?.interests || []
          });

          logger.info('Match completed', {
            roomId: newRoomId,
            user1: socket.id,
            user2: matchId
          });
        } else {
          // No match found, user is waiting
          matchingService.updateUser(socket.id, { roomId: null });
          logger.info('No match found, user waiting', { socketId: socket.id });
        }
      } catch (error) {
        logger.error('Error in join-room handler', {
          socketId: socket.id,
          error: error.message
        });
      }
    });

    /**
     * Handles text chat messages
     */
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, (data) => {
      try {
        const user = matchingService.getUser(socket.id);
        if (!user) {
          logger.warn('User not found for send-message', { socketId: socket.id });
          return;
        }

        // Validate message
        const validation = validateMessage(data.message);
        if (!validation.isValid) {
          logger.warn('Invalid message', {
            socketId: socket.id,
            error: validation.error
          });
          return;
        }

        const msg = {
          ...data,
          message: validation.message,
          sender: user.username,
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString()
        };

        // Broadcast to appropriate room
        if (data.roomId === ROOM_TYPES.TEXT_CHAT) {
          io.to(ROOM_TYPES.TEXT_CHAT).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, msg);
        } else {
          io.to(data.roomId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, msg);
        }

        logger.debug('Message sent', {
          socketId: socket.id,
          roomId: data.roomId
        });
      } catch (error) {
        logger.error('Error in send-message handler', {
          socketId: socket.id,
          error: error.message
        });
      }
    });

    /**
     * Handles video chat messages
     */
    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, (data) => {
      try {
        const { roomId, message } = data;

        if (!roomId || !message) {
          logger.warn('Invalid chat message data', { socketId: socket.id });
          return;
        }

        // Validate message
        const validation = validateMessage(message);
        if (!validation.isValid) {
          logger.warn('Invalid chat message', {
            socketId: socket.id,
            error: validation.error
          });
          return;
        }

        // Broadcast to other user in the room
        socket.to(roomId).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
          message: validation.message,
          senderId: socket.id,
          timestamp: new Date().toISOString()
        });

        logger.debug('Chat message sent', {
          socketId: socket.id,
          roomId
        });
      } catch (error) {
        logger.error('Error in chat-message handler', {
          socketId: socket.id,
          error: error.message
        });
      }
    });

    /**
     * Handles user reports
     */
    socket.on(SOCKET_EVENTS.REPORT_USER, async (data) => {
      try {
        const user = matchingService.getUser(socket.id);

        const report = new Report({
          ...data,
          reporterId: socket.id,
          reporterUsername: user?.username
        });

        await report.save();

        socket.emit(SOCKET_EVENTS.REPORT_SUBMITTED, { success: true });

        logger.info('User report submitted', {
          reporterId: socket.id,
          reportedUser: data.reportedUserId
        });
      } catch (err) {
        logger.error('Error saving report', {
          socketId: socket.id,
          error: err.message
        });
        socket.emit(SOCKET_EVENTS.REPORT_SUBMITTED, { success: false });
      }
    });

    /**
     * Handles leave room requests
     */
    socket.on(SOCKET_EVENTS.LEAVE_ROOM, (data) => {
      try {
        const user = matchingService.getUser(socket.id);
        if (!user) {
          logger.warn('User not found for leave-room', { socketId: socket.id });
          return;
        }

        const { roomId, reason } = data || {};

        // Notify other user in the room
        if (roomId && roomId !== ROOM_TYPES.TEXT_CHAT) {
          socket.to(roomId).emit(SOCKET_EVENTS.USER_LEFT, {
            reason: reason || DISCONNECT_REASONS.DISCONNECTED,
            username: user.username
          });
          socket.leave(roomId);

          logger.info('User left video chat room', {
            socketId: socket.id,
            roomId,
            reason
          });
        } else if (roomId === ROOM_TYPES.TEXT_CHAT) {
          socket.to(ROOM_TYPES.TEXT_CHAT).emit(SOCKET_EVENTS.USER_LEFT, {
            username: user.username
          });
          socket.leave(ROOM_TYPES.TEXT_CHAT);

          logger.info('User left text chat', { socketId: socket.id });
        }

        // Clear user's room assignment
        matchingService.leaveRoom(socket.id);
      } catch (error) {
        logger.error('Error in leave-room handler', {
          socketId: socket.id,
          error: error.message
        });
      }
    });

    /**
     * Handles WebRTC signaling
     */
    socket.on(SOCKET_EVENTS.SIGNAL, (data) => {
      try {
        const { roomId, signal } = data;

        if (!roomId || !signal) {
          logger.warn('Invalid signal data', { socketId: socket.id });
          return;
        }

        // Broadcast to room except sender
        socket.to(roomId).emit(SOCKET_EVENTS.SIGNAL, {
          signal,
          userId: socket.id
        });

        logger.debug('Signal forwarded', {
          socketId: socket.id,
          roomId,
          signalType: signal.type
        });
      } catch (error) {
        logger.error('Error in signal handler', {
          socketId: socket.id,
          error: error.message
        });
      }
    });

    /**
     * Handles disconnection
     */
    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      try {
        const user = matchingService.getUser(socket.id);

        // Notify room if user was in one
        if (user?.roomId && user.roomId !== ROOM_TYPES.TEXT_CHAT) {
          io.to(user.roomId).emit(SOCKET_EVENTS.USER_LEFT, {
            reason: DISCONNECT_REASONS.DISCONNECTED,
            username: user.username
          });
        }

        // Notify text chat if user was there
        if (matchingService.isInTextChat(socket.id)) {
          io.to(ROOM_TYPES.TEXT_CHAT).emit(SOCKET_EVENTS.USER_LEFT, {
            username: user?.username
          });
        }

        // Remove user and update count
        matchingService.removeUser(socket.id);
        io.emit(SOCKET_EVENTS.USER_COUNT, matchingService.getOnlineUserCount());

        logger.info('Client disconnected', {
          socketId: socket.id,
          username: user?.username
        });
      } catch (error) {
        logger.error('Error in disconnect handler', {
          socketId: socket.id,
          error: error.message
        });
      }
    });
  });
};

export default chatSocket;
