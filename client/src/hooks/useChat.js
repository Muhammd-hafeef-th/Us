import { useState, useRef, useEffect, useCallback } from 'react';
import { SOCKET_EVENTS, UI_CONSTANTS } from '../utils/constants';

/**
 * Custom hook for managing chat functionality
 * @param {Object} params - Hook parameters
 * @param {Object} params.socket - Socket.io instance
 * @param {React.RefObject} params.roomIdRef - Reference to current room ID
 * @param {boolean} params.isConnected - Whether user is connected to a peer
 * @returns {Object} Chat state and control functions
 */
export const useChat = ({ socket, roomIdRef, isConnected }) => {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState('');

    const messagesEndRef = useRef(null);
    const chatPopupRef = useRef(null);
    const chatInputRef = useRef(null);

    /**
     * Scrolls to the bottom of the messages container
     */
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    /**
     * Auto-scroll when new messages arrive
     */
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    /**
     * Auto-focus input when chat opens
     */
    useEffect(() => {
        if (isChatOpen && chatInputRef.current) {
            chatInputRef.current.focus();
        }
    }, [isChatOpen]);

    /**
     * Handles incoming chat messages
     */
    const handleChatMessage = useCallback((data) => {
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
    }, [socket, isChatOpen]);

    /**
     * Sends a chat message
     */
    const sendMessage = useCallback(() => {
        const trimmedMessage = currentMessage.trim();

        if (!trimmedMessage || !roomIdRef.current) {
            return;
        }

        // Validate message length
        if (trimmedMessage.length > UI_CONSTANTS.MAX_MESSAGE_LENGTH) {
            console.warn('Message too long');
            return;
        }

        // Emit message to server
        socket.emit(SOCKET_EVENTS.CHAT_MESSAGE, {
            roomId: roomIdRef.current,
            message: trimmedMessage
        });

        // Add own message to display
        setMessages(prev => [...prev, {
            text: trimmedMessage,
            isOwn: true,
            timestamp: new Date().toISOString()
        }]);

        // Clear input
        setCurrentMessage('');
    }, [currentMessage, socket, roomIdRef]);

    /**
     * Handles Enter key press to send message
     */
    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }, [sendMessage]);

    /**
     * Clears all messages
     */
    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    /**
     * Toggles chat open/close state
     */
    const toggleChat = useCallback(() => {
        setIsChatOpen(prev => !prev);
    }, []);

    /**
     * Closes the chat
     */
    const closeChat = useCallback(() => {
        setIsChatOpen(false);
    }, []);

    /**
     * Click outside to close chat
     */
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!chatPopupRef.current || !isChatOpen) return;

            if (!chatPopupRef.current.contains(event.target)) {
                // Check if click is not on the chat button
                const chatButton = event.target.closest('button');
                const isChatButton = chatButton?.querySelector('svg')?.getAttribute('data-testid') === 'ChatIcon';

                if (!isChatButton) {
                    setIsChatOpen(false);
                }
            }
        };

        if (isChatOpen) {
            // Add event listener with a small delay to prevent immediate closing
            const timeoutId = setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 100);

            return () => {
                clearTimeout(timeoutId);
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isChatOpen]);

    return {
        // State
        isChatOpen,
        messages,
        currentMessage,

        // Refs
        messagesEndRef,
        chatPopupRef,
        chatInputRef,

        // Functions
        setCurrentMessage,
        sendMessage,
        handleKeyPress,
        handleChatMessage,
        clearMessages,
        toggleChat,
        closeChat,
        scrollToBottom
    };
};
