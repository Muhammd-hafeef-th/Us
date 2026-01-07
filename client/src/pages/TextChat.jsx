import React, { useEffect, useRef, useState } from 'react';
import { Box, TextField, Button, Typography, Paper, List, ListItem, ListItemText, IconButton, Snackbar, Alert } from '@mui/material';
import styled from 'styled-components';
import { useSocket } from '../context/SocketContext';
import ReportIcon from '@mui/icons-material/Report';
import ReportDialog from '../components/ReportDialog';

const ChatContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;

  @media (max-width: 600px) {
    height: calc(100vh - 150px);
    padding: 0.5rem;
  }
`;

const MessagesContainer = styled(Paper)`
  flex-grow: 1;
  overflow-y: auto;
  padding: 1rem;
  margin-bottom: 1rem;
  background-color: ${props => props.theme.palette.background.paper};
  border: 4px solid #000;

  @media (max-width: 600px) {
    padding: 0.5rem;
    margin-bottom: 0.5rem;
  }
`;

const MessageInput = styled(Box)`
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  background-color: ${props => props.theme.palette.background.paper};
  border: 4px solid #000;
  border-radius: 4px;

  @media (max-width: 600px) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const MessageItem = styled(ListItem)`
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background-color: ${props => props.theme.palette.background.default};
  border: 2px solid #000;
  border-radius: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  @media (max-width: 600px) {
    padding: 0.3rem;
    margin-bottom: 0.3rem;
  }
`;

const TextChat = () => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const { socket, onlineUsers } = useSocket();

  useEffect(() => {
    if (socket) {
      // Check if already connected
      if (socket.connected) {
        setIsConnected(true);
        socket.emit('join-room', { roomId: 'text-chat' });
      }

      socket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
        socket.emit('join-room', { roomId: 'text-chat' });
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
        setError('Disconnected from server. Please refresh the page.');
      });

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setError('Failed to connect to server. Please try again later.');
      });

      socket.on('receive-message', (data) => {
        setMessages((prev) => [...prev, data]);
      });

      socket.on('user-joined', (data) => {
        setMessages((prev) => [...prev, {
          id: Date.now(),
          text: `${data.username} joined the chat`,
          isSystem: true
        }]);
      });

      socket.on('user-left', (data) => {
        setMessages((prev) => [...prev, {
          id: Date.now(),
          text: `${data.username || 'A user'} left the chat`,
          isSystem: true
        }]);
      });

      return () => {
        socket.emit('leave-room', { roomId: 'text-chat' });
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('receive-message');
        socket.off('user-joined');
        socket.off('user-left');
      };
    }
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && socket && isConnected) {
      socket.emit('send-message', {
        message: message,
        roomId: 'text-chat',
      });
      setMessage('');
    }
  };

  const handleReport = (message) => {
    setSelectedMessage(message);
    setReportDialogOpen(true);
  };

  const handleSubmitReport = (reportData) => {
    if (socket) {
      socket.emit('report-user', {
        ...reportData,
        messageId: selectedMessage.id,
        roomId: 'text-chat',
      });
    }
  };

  const handleCloseError = () => {
    setError(null);
  };

  return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Typography
        variant="h4"
        sx={{
          mb: 1,
          color: '#000',
          fontWeight: 'bold'
        }}
      >
        Global Text Chat
      </Typography>
      <Typography variant="subtitle1" sx={{ mb: 3, color: '#666' }}>
        {onlineUsers} users online
      </Typography>

      <ChatContainer>
        <MessagesContainer>
          <List>
            {messages.map((msg) => (
              <MessageItem
                key={msg.id}
                sx={{
                  backgroundColor: msg.isSystem ? 'transparent' : (theme) => theme.palette.background.default,
                  border: msg.isSystem ? 'none' : '2px solid #000',
                  justifyContent: msg.isSystem ? 'center' : 'space-between',
                  py: msg.isSystem ? 0.5 : 1
                }}
              >
                {msg.isSystem ? (
                  <Typography variant="caption" sx={{ color: '#666', fontStyle: 'italic' }}>
                    {msg.text}
                  </Typography>
                ) : (
                  <>
                    <ListItemText
                      primary={msg.message || msg.text}
                      secondary={`${msg.sender} - ${msg.timestamp}`}
                      sx={{
                        '& .MuiListItemText-primary': {
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                          wordBreak: 'break-word',
                          color: '#000'
                        },
                        '& .MuiListItemText-secondary': {
                          fontSize: { xs: '0.7rem', sm: '0.8rem' },
                          color: '#666'
                        }
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleReport(msg)}
                      sx={{ ml: 1 }}
                    >
                      <ReportIcon />
                    </IconButton>
                  </>
                )}
              </MessageItem>
            ))}
            <div ref={messagesEndRef} />
          </List>
        </MessagesContainer>

        <MessageInput component="form" onSubmit={handleSendMessage}>
          <TextField
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            variant="outlined"
            size="small"
            disabled={!isConnected}
            sx={{
              '& .MuiInputBase-root': {
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }
            }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!message.trim() || !isConnected}
            sx={{
              minWidth: { xs: '100px', sm: '120px' },
              fontSize: { xs: '0.8rem', sm: '0.9rem' },
              backgroundColor: '#4CAF50',
              '&:hover': {
                backgroundColor: '#45a049'
              }
            }}
          >
            Send
          </Button>
        </MessageInput>
      </ChatContainer>

      <ReportDialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        onSubmit={handleSubmitReport}
      />

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
    </Box>
  );
};

export default TextChat; 