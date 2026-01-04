import Report from '../models/Report.js';

const onlineUsers = new Map();
const textChatUsers = new Set();

const findMatchingUser = (socketId, interests) => {
  // First pass: look for matching interests
  for (const [id, user] of onlineUsers.entries()) {
    if (
      id !== socketId &&
      !user.roomId && // User must be waiting (no room assigned)
      user.interests &&
      Array.isArray(user.interests)
    ) {
      const common = user.interests.filter(i => interests && interests.includes(i));
      if (common.length > 0) return id;
    }
  }

  // Second pass: any waiting user
  for (const [id, user] of onlineUsers.entries()) {
    if (id !== socketId && !user.roomId) return id;
  }
  return null;
};

const chatSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected');

    const username = `User${Math.floor(Math.random() * 1000)}`;
    onlineUsers.set(socket.id, { interests: [], roomId: null, username });
    io.emit('user-count', onlineUsers.size);

    socket.on('join-room', (data) => {
      // Allow joining without data for matching, or with data for text chat
      const { roomId: requestedRoomId, interests = [] } = data || {};
      const user = onlineUsers.get(socket.id);
      if (!user) return;

      user.interests = Array.isArray(interests) ? interests : [];

      // Handle text chat specifically
      if (requestedRoomId === 'text-chat') {
        user.roomId = 'text-chat';
        textChatUsers.add(socket.id);
        socket.join('text-chat');
        // Notify others in text chat
        socket.to('text-chat').emit('user-joined', { username: user.username });
        return;
      }

      // Video chat matching logic
      // User is looking for a match
      console.log(`User ${socket.id} looking for match with interests:`, user.interests);
      const matchId = findMatchingUser(socket.id, user.interests);

      if (matchId) {
        // Found a match!
        console.log(`Match found! ${socket.id} <-> ${matchId}`);
        const matchUser = onlineUsers.get(matchId);
        const newRoomId = `chat-${socket.id}-${matchId}`;

        // Update both users
        user.roomId = newRoomId;
        matchUser.roomId = newRoomId;

        // Join socket rooms
        socket.join(newRoomId);
        const matchSocket = io.sockets.sockets.get(matchId);
        if (matchSocket) {
          matchSocket.join(newRoomId);
        }

        // Notify both users - Deterministically decide initiator
        // The current socket (User A) triggers the match, so we can make them the priority
        // or just use sort to be safe. Here, we'll make the EXISTING user (matchId) the initiator
        // so they are "called" by the new user, or vice versa. 
        // Let's make the NEW user (socket.id) the initiator.

        io.to(matchId).emit('match-found', {
          roomId: newRoomId,
          initiator: false,
          interests: user.interests
        });

        socket.emit('match-found', {
          roomId: newRoomId,
          initiator: true,
          interests: matchUser.interests
        });

      } else {
        // No match found yet, mark as waiting
        console.log(`No match found for ${socket.id}, waiting...`);
        user.roomId = null;
        // We don't need to do anything else, they are just in the map waiting
      }
    });

    socket.on('send-message', (data) => {
      const user = onlineUsers.get(socket.id);
      if (!user) return;

      const msg = {
        ...data,
        sender: user.username,
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString()
      };

      if (data.roomId === 'text-chat') {
        io.to('text-chat').emit('receive-message', msg);
      } else {
        io.to(data.roomId).emit('receive-message', msg);
      }
    });

    // Handle chat messages in video chat rooms
    socket.on('chat-message', (data) => {
      const { roomId, message } = data;
      if (!roomId || !message) return;

      // Broadcast message to the other user in the room
      socket.to(roomId).emit('chat-message', {
        message,
        senderId: socket.id,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('report-user', async (data) => {
      try {
        const report = new Report({
          ...data,
          reporterId: socket.id,
          reporterUsername: onlineUsers.get(socket.id)?.username
        });
        await report.save();
        socket.emit('report-submitted', { success: true });
      } catch (err) {
        socket.emit('report-submitted', { success: false });
      }
    });

    socket.on('leave-room', (data) => {
      const user = onlineUsers.get(socket.id);
      if (!user) return;

      const { roomId, reason } = data || {};

      // Notify other user in the room with the reason
      if (roomId && roomId !== 'text-chat') {
        socket.to(roomId).emit('user-left', { reason: reason || 'disconnected', username: user.username });
        socket.leave(roomId);
      } else if (roomId === 'text-chat') {
        socket.to('text-chat').emit('user-left', { username: user.username });
        socket.leave('text-chat');
      }

      // Clear user's room assignment so they can match again
      user.roomId = null;
      console.log(`User ${socket.id} left room ${roomId} (reason: ${reason || 'unknown'})`);
    });

    socket.on('signal', (data) => {
      // Broadcast to room except sender
      socket.to(data.roomId).emit('signal', { signal: data.signal, userId: socket.id });
    });

    socket.on('disconnect', () => {
      const user = onlineUsers.get(socket.id);
      if (user?.roomId && user.roomId !== 'text-chat') {
        io.to(user.roomId).emit('user-left', { reason: 'disconnected', username: user.username });
      }
      if (textChatUsers.has(socket.id)) {
        io.to('text-chat').emit('user-left', { username: user.username });
      }

      onlineUsers.delete(socket.id);
      textChatUsers.delete(socket.id);
      io.emit('user-count', onlineUsers.size);
      console.log('Client disconnected');
    });
  });
};

export default chatSocket;
