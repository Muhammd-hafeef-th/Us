import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Typography, Paper, IconButton, CircularProgress, Snackbar, Alert, TextField } from '@mui/material';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useSocket } from '../context/SocketContext';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';

const VideoContainer = styled(Box)`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-top: 1rem;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  padding: 0 1rem;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const VideoBox = styled(Paper)`
  position: relative;
  aspect-ratio: 16/9;
  background-color: #000;
  border: 4px solid #000;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 100%;
  margin: 0 auto;

  @media (max-width: 767px) {
    max-width: 100%;
    margin-bottom: 1rem;
  }
`;

const LocalVideoBox = styled(VideoBox)`
  &::after {
    content: 'You';
    position: absolute;
    top: 10px;
    left: 10px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    z-index: 2;
  }
`;

const RemoteVideoBox = styled(VideoBox)`
  &::after {
    content: 'Stranger';
    position: absolute;
    top: 10px;
    left: 10px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    z-index: 2;
  }
`;

const Controls = styled(Box)`
  display: flex;
  justify-content: ${props => props.isConnected ? 'flex-end' : 'center'};
  gap: 1rem;
  margin-top: 1rem;
  padding: 0 1rem;
  flex-wrap: wrap;

  @media (max-width: 767px) {
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
`;

const CameraButton = styled(IconButton)`
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  z-index: 2;
  &:hover {
    background-color: rgba(0, 0, 0, 0.7);
  }

  @media (max-width: 767px) {
    padding: 8px;
  }
`;

const StatusMessage = styled(Box)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  width: 90%;
  max-width: 400px;
  z-index: 2;
  padding: 1rem;

  @media (max-width: 767px) {
    width: 95%;
  }
`;

const ChatPopup = styled(Paper)`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  max-width: calc(100vw - 40px);
  height: 500px;
  max-height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border: 3px solid #000;
  box-shadow: 8px 8px 0px #000;
  z-index: 1000;
  font-family: 'Press Start 2P', cursive;

  @media (max-width: 767px) {
    width: calc(100vw - 40px);
    height: 400px;
  }
`;

const ChatHeader = styled(Box)`
  padding: 12px 16px;
  background-color: #000;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 3px solid #000;
`;

const MessagesContainer = styled(Box)`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background-color: #f5f5f5;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #e0e0e0;
    border: 2px solid #000;
  }

  &::-webkit-scrollbar-thumb {
    background: #000;
    border: 1px solid #000;
  }
`;

const MessageBubble = styled(Box)`
  padding: 8px 12px;
  background-color: ${props => props.isOwn ? '#000' : '#fff'};
  color: ${props => props.isOwn ? '#fff' : '#000'};
  border: 2px solid #000;
  box-shadow: 3px 3px 0px #000;
  align-self: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
  max-width: 70%;
  word-wrap: break-word;
  font-size: 0.7rem;
  line-height: 1.4;
`;

const ChatInputContainer = styled(Box)`
  padding: 12px;
  background-color: #fff;
  border-top: 3px solid #000;
  display: flex;
  gap: 8px;
`;

const VideoChat = () => {
  const location = useLocation();
  const { socket, onlineUsers } = useSocket();
  const localStreamRef = useRef(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [error, setError] = useState(null);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnection = useRef();
  const interests = location.state?.interests || '';
  const roomId = useRef(null);

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const messagesEndRef = useRef(null);
  const chatPopupRef = useRef(null);
  const chatInputRef = useRef(null);

  // Initialize media stream once on mount
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

        // Ensure stream has tracks before marking as ready
        if (stream.getTracks().length > 0) {
          console.log('Media initialized with', stream.getTracks().length, 'tracks');
          setIsMediaReady(true);
        } else {
          console.error('Stream has no tracks');
          setError('Failed to initialize media properly');
          setIsMediaReady(false);
        }
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setError('Failed to access camera and microphone. Please check your permissions.');
        setIsMediaReady(false);
      }
    };

    initializeMedia();

    // Cleanup on unmount - disconnect from room if user leaves page
    return () => {
      // Close peer connection if exists
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }

      // Notify server we're leaving with skip reason (same behavior as skip)
      if (roomId.current && socket) {
        socket.emit('leave-room', { roomId: roomId.current, reason: 'skip' });
      }

      // Stop all media tracks
      if (localVideoRef.current?.srcObject) {
        const tracks = localVideoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []); // Empty dependency - run once on mount

  // Setup socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleMatchFound = async ({ roomId: newRoomId, initiator }) => {
      roomId.current = newRoomId;
      setIsWaiting(false);

      if (initiator) {
        try {
          if (!peerConnection.current) {
            createPeerConnection();
          }

          // Verify peer connection was created successfully
          if (!peerConnection.current) {
            setError('Failed to initialize connection. Please refresh and try again.');
            return;
          }

          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);
          socket.emit('signal', {
            signal: offer,
            roomId: newRoomId
          });
        } catch (err) {
          console.error('Error creating offer:', err);
          setError('Failed to create video connection. Please try again.');
        }
      } else {
        // Wait for offer, but ensure PC is ready
        if (!peerConnection.current) {
          createPeerConnection();
        }
      }
    };

    socket.on('signal', handleSignal);
    socket.on('match-found', handleMatchFound);
    socket.on('user-left', handleUserLeft);
    socket.on('chat-message', handleChatMessage);
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setError('Failed to connect to server. Please try again later.');
    });

    return () => {
      socket.off('signal');
      socket.off('match-found');
      socket.off('user-left');
      socket.off('chat-message');
      socket.off('connect_error');
    };
  }, [socket]); // Only depend on socket

  // removed handleUserConnected as it is now inside match-found logic

  const handleSignal = async (data) => {
    try {
      // Ignore signals from ourselves (shouldn't happen with server fix, but defensive)
      if (data.userId === socket?.id) {
        console.log('Ignoring own signal');
        return;
      }

      if (!peerConnection.current) {
        createPeerConnection();
      }

      // Check if peer connection is in a valid state
      if (peerConnection.current.signalingState === 'closed') {
        console.warn('Peer connection is closed, ignoring signal');
        return;
      }

      // Handle ICE candidates
      if (data.signal.type === 'candidate') {
        if (peerConnection.current.remoteDescription) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
        }
        return;
      }

      // Validate signaling state before setting remote description
      const currentState = peerConnection.current.signalingState;

      if (data.signal.type === 'offer') {
        // Can receive offer in 'stable' or 'have-local-offer' state
        if (currentState !== 'stable' && currentState !== 'have-local-offer') {
          console.warn(`Cannot process offer in state: ${currentState}`);
          return;
        }
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.signal));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.emit('signal', {
          signal: answer,
          roomId: roomId.current
        });
      } else if (data.signal.type === 'answer') {
        // Can only receive answer in 'have-local-offer' state
        if (currentState !== 'have-local-offer') {
          console.warn(`Cannot process answer in state: ${currentState}`);
          return;
        }
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.signal));
      }
    } catch (err) {
      console.error('Error handling signal:', err);
      setError('Failed to establish video connection. Please try again.');
    }
  };

  const handleUserLeft = (data) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setIsConnected(false);
    setRemoteStream(null);

    // Clear chat messages
    setMessages([]);
    setIsChatOpen(false);

    // Show different messages based on reason
    const { reason } = data || {};
    if (reason === 'skip') {
      setError('User skipped you');
      // Automatically search for new match when skipped
      setTimeout(() => {
        setError(null);
        startChat();
      }, 1000); // Small delay to show the message
    } else {
      setError('The other user has disconnected');
      // Auto-search on disconnect too
      setTimeout(() => {
        setError(null);
        startChat();
      }, 1000);
    }
  };

  const createPeerConnection = () => {
    if (!localStreamRef.current) {
      console.error('Cannot create peer connection: local stream not ready');
      setError('Please wait for camera to initialize...');
      return;
    }

    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };

    peerConnection.current = new RTCPeerConnection(configuration);

    localStreamRef.current.getTracks().forEach(track => {
      peerConnection.current.addTrack(track, localStreamRef.current);
    });

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal', {
          signal: {
            type: 'candidate',
            candidate: event.candidate
          },
          roomId: roomId.current
        });
      }
    };

    peerConnection.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setRemoteStream(event.streams[0]);
        setIsConnected(true);
        setIsWaiting(false);
      }
    };

    peerConnection.current.oniceconnectionstatechange = () => {
      const state = peerConnection.current.iceConnectionState;
      console.log('ICE connection state:', state);

      // Only handle permanent failures or closures
      // 'disconnected' can be temporary during connection setup
      if (state === 'failed' || state === 'closed') {
        handleUserLeft({ reason: 'disconnected' });
      }
    };
  };

  const startChat = () => {
    console.log('Start chat clicked. Media ready:', isMediaReady, 'Local stream:', !!localStreamRef.current, 'Tracks:', localStreamRef.current?.getTracks().length);

    if (!localStreamRef.current || !localStreamRef.current.getTracks || localStreamRef.current.getTracks().length === 0) {
      setError('Please wait for camera to initialize...');
      return;
    }

    setIsWaiting(true);
    setError(null);
    socket.emit('join-room', {
      roomId: null,
      interests: interests ? interests.split(',').map(i => i.trim()) : []
    });
  };

  const skipChat = () => {
    // Close current peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Clear remote video
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Notify server we're leaving this room with skip reason
    socket.emit('leave-room', { roomId: roomId.current, reason: 'skip' });

    // Keep camera running and immediately search for new match
    setIsConnected(false);
    setRemoteStream(null);
    setError(null);

    // Clear chat messages and close chat box
    setMessages([]);
    setIsChatOpen(false);

    // Automatically start searching for next match
    startChat();
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const handleCloseError = () => {
    setError(null);
  };

  // Chat functions
  const handleChatMessage = (data) => {
    const { message, senderId } = data;
    setMessages(prev => [...prev, {
      text: message,
      isOwn: senderId === socket?.id,
      timestamp: new Date().toISOString()
    }]);

    // Auto-open chat when receiving a message
    if (!isChatOpen) {
      setIsChatOpen(true);
    }
  };

  const sendMessage = () => {
    if (!currentMessage.trim() || !roomId.current) return;

    socket.emit('chat-message', {
      roomId: roomId.current,
      message: currentMessage
    });

    // Add own message to display
    setMessages(prev => [...prev, {
      text: currentMessage,
      isOwn: true,
      timestamp: new Date().toISOString()
    }]);

    setCurrentMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Click outside to close chat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatPopupRef.current && !chatPopupRef.current.contains(event.target)) {
        // Check if click is not on the chat button either
        const chatButton = event.target.closest('button');
        const isChatButton = chatButton?.querySelector('svg')?.getAttribute('data-testid') === 'ChatIcon';

        if (!isChatButton && isChatOpen) {
          setIsChatOpen(false);
        }
      }
    };

    if (isChatOpen) {
      // Add event listener with a small delay to prevent immediate closing
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isChatOpen]);

  // Auto-focus input when chat opens
  useEffect(() => {
    if (isChatOpen && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [isChatOpen]);

  return (
    <Box sx={{
      textAlign: 'center',
      py: { xs: 2, sm: 3, md: 4 },
      px: { xs: 1, sm: 2, md: 3 }
    }}>
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

      <VideoContainer>
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
          <CameraButton onClick={toggleCamera}>
            {isCameraOn ? <VideocamIcon /> : <VideocamOffIcon />}
          </CameraButton>
        </LocalVideoBox>

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
              onClick={() => setIsChatOpen(!isChatOpen)}
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

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
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
              onClick={() => setIsChatOpen(false)}
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