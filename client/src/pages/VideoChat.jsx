import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Typography, IconButton, CircularProgress, Snackbar, Alert, TextField } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';

// Custom hooks
import { useWebRTC } from '../hooks/useWebRTC';
import { useChat } from '../hooks/useChat';

// Utilities and constants
import {
  SOCKET_EVENTS,
  TIMING,
  ERROR_MESSAGES,
  DISCONNECT_REASONS
} from '../utils/constants';
import { isStreamValid, toggleTrack, stopMediaStream } from '../utils/webrtcUtils';

// Styled components
import {
  VideoContainer,
  LocalVideoBox,
  RemoteVideoBox,
  Controls,
  CameraButton,
  StatusMessage,
  ChatPopup,
  ChatHeader,
  MessagesContainer,
  MessageBubble,
  ChatInputContainer
} from './VideoChat.styles';

/**
 * VideoChat Component
 * Main component for video chat functionality with WebRTC peer-to-peer connection
 * Features: Video/audio streaming, text chat, user matching, skip functionality
 */
const VideoChat = () => {
  // Router and context
  const location = useLocation();
  const { socket, onlineUsers } = useSocket();

  // Refs
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const roomIdRef = useRef(null);

  // State
  const [isWaiting, setIsWaiting] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [error, setError] = useState(null);

  // Extract interests from location state
  const interests = location.state?.interests || '';

  /**
   * WebRTC hook for peer connection management
   */
  const {
    remoteStream,
    isConnected,
    handleSignal,
    createOffer,
    createPeerConnection,
    closePeer,
    setIsConnected
  } = useWebRTC({
    socket,
    localStreamRef,
    remoteVideoRef,
    roomIdRef,
    onConnectionEstablished: () => {
      setIsWaiting(false);
    },
    onConnectionClosed: (data) => {
      handleUserLeft(data);
    },
    onError: (errorMessage) => {
      setError(errorMessage);
    }
  });

  /**
   * Chat hook for message management
   */
  const {
    isChatOpen,
    messages,
    currentMessage,
    messagesEndRef,
    chatPopupRef,
    chatInputRef,
    setCurrentMessage,
    sendMessage,
    handleKeyPress,
    handleChatMessage,
    clearMessages,
    toggleChat,
    closeChat
  } = useChat({
    socket,
    roomIdRef,
    isConnected
  });

  /**
   * Initialize media stream on component mount
   */
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Validate stream has tracks
        if (isStreamValid(stream)) {
          console.log('Media initialized with', stream.getTracks().length, 'tracks');
          setIsMediaReady(true);
        } else {
          console.error('Stream has no tracks');
          setError(ERROR_MESSAGES.MEDIA_ACCESS_DENIED);
          setIsMediaReady(false);
        }
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setError(ERROR_MESSAGES.MEDIA_ACCESS_DENIED);
        setIsMediaReady(false);
      }
    };

    initializeMedia();

    // Cleanup on unmount
    return () => {
      // Close peer connection
      closePeer();

      // Notify server we're leaving
      if (roomIdRef.current && socket) {
        socket.emit(SOCKET_EVENTS.LEAVE_ROOM, {
          roomId: roomIdRef.current,
          reason: DISCONNECT_REASONS.SKIP
        });
      }

      // Stop all media tracks
      if (localVideoRef.current?.srcObject) {
        stopMediaStream(localVideoRef.current.srcObject);
      }
    };
  }, []); // Run once on mount

  /**
   * Setup socket event handlers
   */
  useEffect(() => {
    if (!socket) return;

    /**
     * Handles match found event from server
     */
    const handleMatchFound = async ({ roomId: newRoomId, initiator }) => {
      roomIdRef.current = newRoomId;
      setIsWaiting(false);

      if (initiator) {
        // Create and send offer if we're the initiator
        await createOffer();
      } else {
        // Wait for offer, but ensure peer connection is ready
        createPeerConnection();
      }
    };

    // Register event listeners
    socket.on(SOCKET_EVENTS.SIGNAL, handleSignal);
    socket.on(SOCKET_EVENTS.MATCH_FOUND, handleMatchFound);
    socket.on(SOCKET_EVENTS.USER_LEFT, handleUserLeft);
    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, handleChatMessage);
    socket.on(SOCKET_EVENTS.CONNECT_ERROR, (error) => {
      console.error('Connection error:', error);
      setError(ERROR_MESSAGES.SERVER_CONNECTION_FAILED);
    });

    // Cleanup listeners
    return () => {
      socket.off(SOCKET_EVENTS.SIGNAL);
      socket.off(SOCKET_EVENTS.MATCH_FOUND);
      socket.off(SOCKET_EVENTS.USER_LEFT);
      socket.off(SOCKET_EVENTS.CHAT_MESSAGE);
      socket.off(SOCKET_EVENTS.CONNECT_ERROR);
    };
  }, [socket, handleSignal, handleChatMessage, createOffer, createPeerConnection]);

  /**
   * Handles user left event
   * @param {Object} data - Event data containing reason for leaving
   */
  const handleUserLeft = (data) => {
    // Close peer connection and clear remote video
    closePeer();

    // Clear chat
    clearMessages();
    closeChat();

    // Show appropriate message based on reason
    const { reason } = data || {};
    if (reason === DISCONNECT_REASONS.SKIP) {
      setError(ERROR_MESSAGES.USER_SKIPPED);
    } else {
      setError(ERROR_MESSAGES.USER_DISCONNECTED);
    }

    // Automatically search for new match
    setTimeout(() => {
      setError(null);
      startChat();
    }, TIMING.AUTO_SEARCH_DELAY);
  };

  /**
   * Starts searching for a chat partner
   */
  const startChat = () => {
    console.log('Start chat clicked. Media ready:', isMediaReady);

    // Validate media stream is ready
    if (!localStreamRef.current || !isStreamValid(localStreamRef.current)) {
      setError(ERROR_MESSAGES.MEDIA_NOT_READY);
      return;
    }

    setIsWaiting(true);
    setError(null);

    // Emit join room event
    socket.emit(SOCKET_EVENTS.JOIN_ROOM, {
      roomId: null,
      interests: interests ? interests.split(',').map(i => i.trim()) : []
    });
  };

  /**
   * Skips current chat and searches for new partner
   */
  const skipChat = () => {
    // Close current connection
    closePeer();

    // Notify server we're leaving with skip reason
    socket.emit(SOCKET_EVENTS.LEAVE_ROOM, {
      roomId: roomIdRef.current,
      reason: DISCONNECT_REASONS.SKIP
    });

    // Clear chat
    clearMessages();
    closeChat();

    // Reset state
    setError(null);

    // Automatically start searching for next match
    startChat();
  };

  /**
   * Toggles camera on/off
   */
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const newState = toggleTrack(localStreamRef.current, 'video', !isCameraOn);
      if (newState !== null) {
        setIsCameraOn(newState);
      }
    }
  };

  /**
   * Closes error snackbar
   */
  const handleCloseError = () => {
    setError(null);
  };

  return (
    <Box sx={{
      textAlign: 'center',
      py: { xs: 2, sm: 3, md: 4 },
      px: { xs: 1, sm: 2, md: 3 }
    }}>
      {/* Page Title */}
      <Typography
        variant="h4"
        sx={{
          mb: { xs: 2, sm: 3, md: 4 },
          color: 'primary.main',
          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
        }}
      >
        Video Chat
      </Typography>

      {/* Video Container */}
      <VideoContainer>
        {/* Local Video */}
        <LocalVideoBox>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              display: isCameraOn ? 'block' : 'none'
            }}
          />
          <CameraButton onClick={toggleCamera} aria-label="Toggle camera">
            {isCameraOn ? <VideocamIcon /> : <VideocamOffIcon />}
          </CameraButton>
        </LocalVideoBox>

        {/* Remote Video */}
        <RemoteVideoBox>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              display: isConnected ? 'block' : 'none'
            }}
          />
          {!isConnected && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: '#fff',
                zIndex: 1
              }}
            >
              {isWaiting ? (
                <StatusMessage>
                  {onlineUsers === 1 ? (
                    <>
                      <Typography
                        variant="h6"
                        gutterBottom
                        sx={{
                          color: 'white',
                          fontSize: { xs: '1rem', sm: '1.25rem' }
                        }}
                      >
                        You're the only one online right now
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'white',
                          mb: 2,
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                      >
                        Share this link with friends to start chatting!
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Typography
                        variant="h6"
                        gutterBottom
                        sx={{
                          color: 'white',
                          fontSize: { xs: '1rem', sm: '1.25rem' }
                        }}
                      >
                        Finding a match...
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'white',
                          mb: 2,
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                      >
                        {onlineUsers} users online
                      </Typography>
                      <CircularProgress size={60} thickness={4} sx={{ color: 'white' }} />
                    </>
                  )}
                </StatusMessage>
              ) : (
                <Typography
                  variant="body1"
                  sx={{
                    color: 'white',
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    textAlign: 'center',
                    px: 2
                  }}
                >
                  Waiting for stranger...
                </Typography>
              )}
            </Box>
          )}
        </RemoteVideoBox>
      </VideoContainer>

      {/* Controls */}
      <Controls isConnected={isConnected}>
        {!isConnected ? (
          <Button
            variant="contained"
            color="primary"
            onClick={startChat}
            disabled={isWaiting || !isMediaReady}
            sx={{
              width: { xs: '100%', sm: 'auto' },
              minWidth: { xs: '200px', sm: '120px' }
            }}
          >
            {!isMediaReady ? 'Loading Camera...' : isWaiting ? 'Searching...' : 'Start Chat'}
          </Button>
        ) : (
          <>
            <IconButton
              onClick={toggleChat}
              aria-label="Toggle chat"
              sx={{
                backgroundColor: '#000',
                color: '#fff',
                border: '3px solid #000',
                boxShadow: '4px 4px 0px #000',
                '&:hover': {
                  backgroundColor: '#333',
                  transform: 'translate(2px, 2px)',
                  boxShadow: '2px 2px 0px #000',
                }
              }}
            >
              <ChatIcon />
            </IconButton>
            <Button
              variant="contained"
              color="secondary"
              onClick={skipChat}
              sx={{
                width: { xs: '100%', sm: 'auto' },
                minWidth: { xs: '200px', sm: '120px' }
              }}
            >
              Skip
            </Button>
          </>
        )}
      </Controls>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={TIMING.ERROR_AUTO_HIDE_DURATION}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      {/* Chat Popup */}
      {isChatOpen && isConnected && (
        <ChatPopup ref={chatPopupRef}>
          <ChatHeader>
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.75rem',
                fontFamily: 'Press Start 2P, cursive'
              }}
            >
              Chat
            </Typography>
            <IconButton
              onClick={closeChat}
              aria-label="Close chat"
              sx={{
                color: '#fff',
                padding: '4px',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
              size="small"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </ChatHeader>

          <MessagesContainer>
            {messages.length === 0 ? (
              <Typography
                sx={{
                  textAlign: 'center',
                  color: '#666',
                  fontSize: '0.7rem',
                  fontFamily: 'Press Start 2P, cursive',
                  marginTop: '20px'
                }}
              >
                No messages yet
              </Typography>
            ) : (
              messages.map((msg, index) => (
                <MessageBubble key={index} isOwn={msg.isOwn}>
                  {msg.text}
                </MessageBubble>
              ))
            )}
            <div ref={messagesEndRef} />
          </MessagesContainer>

          <ChatInputContainer>
            <TextField
              fullWidth
              size="small"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              inputRef={chatInputRef}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'Press Start 2P, cursive',
                  fontSize: '0.7rem',
                  backgroundColor: '#fff',
                  '& fieldset': {
                    border: '2px solid #000',
                  },
                  '&:hover fieldset': {
                    border: '2px solid #000',
                  },
                  '&.Mui-focused fieldset': {
                    border: '2px solid #000',
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  fontFamily: 'Press Start 2P, cursive',
                  fontSize: '0.6rem',
                  opacity: 0.6,
                }
              }}
            />
            <IconButton
              onClick={sendMessage}
              disabled={!currentMessage.trim()}
              aria-label="Send message"
              sx={{
                backgroundColor: '#000',
                color: '#fff',
                border: '2px solid #000',
                boxShadow: '3px 3px 0px #000',
                '&:hover': {
                  backgroundColor: '#333',
                  transform: 'translate(2px, 2px)',
                  boxShadow: '1px 1px 0px #000',
                },
                '&.Mui-disabled': {
                  backgroundColor: '#ccc',
                  color: '#666',
                  border: '2px solid #999',
                }
              }}
            >
              <SendIcon />
            </IconButton>
          </ChatInputContainer>
        </ChatPopup>
      )}
    </Box>
  );
};

export default VideoChat;