import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

/**
 * Socket Context
 * Provides socket.io connection and online user count to the application
 */
const SocketContext = createContext(null);

/**
 * Socket Provider Component
 * Manages socket connection lifecycle and state
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5005';

    console.log('Initializing socket connection to:', serverUrl);

    const newSocket = io(serverUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    /**
     * Handle successful connection
     */
    newSocket.on('connect', () => {
      console.log('Connected to server with socket ID:', newSocket.id);
      setIsConnected(true);
    });

    /**
     * Handle connection errors
     */
    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      setIsConnected(false);
    });

    /**
     * Handle disconnection
     */
    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      setIsConnected(false);
    });

    /**
     * Handle user count updates
     */
    newSocket.on('user-count', (count) => {
      console.log('Received user count:', count);
      setOnlineUsers(count);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up socket connection');
      newSocket.disconnect();
    };
  }, []); // Empty dependency array - run once on mount

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

/**
 * Custom hook to access socket context
 * @returns {Object} Socket context value with socket, onlineUsers, and isConnected
 * @throws {Error} If used outside of SocketProvider
 */
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};