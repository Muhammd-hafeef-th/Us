import { useRef, useState, useCallback, useEffect } from 'react';
import {
    PEER_CONNECTION_CONFIG,
    SIGNAL_TYPES,
    SIGNALING_STATES,
    ICE_CONNECTION_STATES,
    DISCONNECT_REASONS,
    ERROR_MESSAGES
} from '../utils/constants';
import {
    isStreamValid,
    closePeerConnection,
    createPeerConnection as createPC,
    addStreamToPeerConnection
} from '../utils/webrtcUtils';

/**
 * Custom hook for managing WebRTC peer connections
 * @param {Object} params - Hook parameters
 * @param {Object} params.socket - Socket.io instance
 * @param {React.RefObject} params.localStreamRef - Reference to local media stream
 * @param {React.RefObject} params.remoteVideoRef - Reference to remote video element
 * @param {React.RefObject} params.roomIdRef - Reference to current room ID
 * @param {Function} params.onConnectionEstablished - Callback when connection is established
 * @param {Function} params.onConnectionClosed - Callback when connection is closed
 * @param {Function} params.onError - Callback for errors
 * @returns {Object} WebRTC control functions and state
 */
export const useWebRTC = ({
    socket,
    localStreamRef,
    remoteVideoRef,
    roomIdRef,
    onConnectionEstablished,
    onConnectionClosed,
    onError
}) => {
    const peerConnectionRef = useRef(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    /**
     * Handles ICE candidate events
     */
    const handleIceCandidate = useCallback((event) => {
        if (event.candidate && socket && roomIdRef.current) {
            socket.emit('signal', {
                signal: {
                    type: SIGNAL_TYPES.CANDIDATE,
                    candidate: event.candidate
                },
                roomId: roomIdRef.current
            });
        }
    }, [socket, roomIdRef]);

    /**
     * Handles incoming remote track
     */
    const handleTrack = useCallback((event) => {
        console.log('Received remote track');

        if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setRemoteStream(event.streams[0]);
            setIsConnected(true);

            if (onConnectionEstablished) {
                onConnectionEstablished();
            }
        }
    }, [remoteVideoRef, onConnectionEstablished]);

    /**
     * Handles ICE connection state changes
     */
    const handleIceConnectionStateChange = useCallback(() => {
        if (!peerConnectionRef.current) return;

        const state = peerConnectionRef.current.iceConnectionState;
        console.log('ICE connection state:', state);

        // Only handle permanent failures or closures
        if (state === ICE_CONNECTION_STATES.FAILED || state === ICE_CONNECTION_STATES.CLOSED) {
            console.warn('ICE connection failed or closed');

            if (onConnectionClosed) {
                onConnectionClosed({ reason: DISCONNECT_REASONS.DISCONNECTED });
            }
        }
    }, [onConnectionClosed]);

    /**
     * Creates a new peer connection
     */
    const createPeerConnection = useCallback(() => {
        if (!localStreamRef.current || !isStreamValid(localStreamRef.current)) {
            console.error('Cannot create peer connection: local stream not ready');
            if (onError) {
                onError(ERROR_MESSAGES.MEDIA_NOT_READY);
            }
            return null;
        }

        try {
            // Close existing connection if any
            if (peerConnectionRef.current) {
                closePeerConnection(peerConnectionRef.current);
            }

            // Create new peer connection
            const pc = createPC(PEER_CONNECTION_CONFIG);

            // Add local stream tracks
            addStreamToPeerConnection(pc, localStreamRef.current);

            // Set up event handlers
            pc.onicecandidate = handleIceCandidate;
            pc.ontrack = handleTrack;
            pc.oniceconnectionstatechange = handleIceConnectionStateChange;

            peerConnectionRef.current = pc;
            console.log('Peer connection created successfully');

            return pc;
        } catch (error) {
            console.error('Error creating peer connection:', error);
            if (onError) {
                onError(ERROR_MESSAGES.PEER_CONNECTION_FAILED);
            }
            return null;
        }
    }, [localStreamRef, handleIceCandidate, handleTrack, handleIceConnectionStateChange, onError]);

    /**
     * Handles incoming signaling data
     */
    const handleSignal = useCallback(async (data) => {
        try {
            // Ignore signals from ourselves
            if (data.userId === socket?.id) {
                console.log('Ignoring own signal');
                return;
            }

            // Create peer connection if it doesn't exist
            if (!peerConnectionRef.current) {
                createPeerConnection();
            }

            const pc = peerConnectionRef.current;
            if (!pc) {
                console.error('Failed to create peer connection');
                return;
            }

            // Check if peer connection is in a valid state
            if (pc.signalingState === SIGNALING_STATES.CLOSED) {
                console.warn('Peer connection is closed, ignoring signal');
                return;
            }

            // Handle ICE candidates
            if (data.signal.type === SIGNAL_TYPES.CANDIDATE) {
                if (pc.remoteDescription) {
                    await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
                    console.log('Added ICE candidate');
                }
                return;
            }

            const currentState = pc.signalingState;

            // Handle offer
            if (data.signal.type === SIGNAL_TYPES.OFFER) {
                if (currentState !== SIGNALING_STATES.STABLE &&
                    currentState !== SIGNALING_STATES.HAVE_LOCAL_OFFER) {
                    console.warn(`Cannot process offer in state: ${currentState}`);
                    return;
                }

                await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.emit('signal', {
                    signal: answer,
                    roomId: roomIdRef.current
                });

                console.log('Sent answer');
            }
            // Handle answer
            else if (data.signal.type === SIGNAL_TYPES.ANSWER) {
                if (currentState !== SIGNALING_STATES.HAVE_LOCAL_OFFER) {
                    console.warn(`Cannot process answer in state: ${currentState}`);
                    return;
                }

                await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
                console.log('Set remote description from answer');
            }
        } catch (error) {
            console.error('Error handling signal:', error);
            if (onError) {
                onError(ERROR_MESSAGES.CONNECTION_FAILED);
            }
        }
    }, [socket, roomIdRef, createPeerConnection, onError]);

    /**
     * Creates and sends an offer
     */
    const createOffer = useCallback(async () => {
        try {
            const pc = peerConnectionRef.current || createPeerConnection();

            if (!pc) {
                if (onError) {
                    onError(ERROR_MESSAGES.PEER_CONNECTION_FAILED);
                }
                return;
            }

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('signal', {
                signal: offer,
                roomId: roomIdRef.current
            });

            console.log('Sent offer');
        } catch (error) {
            console.error('Error creating offer:', error);
            if (onError) {
                onError(ERROR_MESSAGES.CONNECTION_FAILED);
            }
        }
    }, [socket, roomIdRef, createPeerConnection, onError]);

    /**
     * Closes the current peer connection
     */
    const closePeer = useCallback(() => {
        if (peerConnectionRef.current) {
            closePeerConnection(peerConnectionRef.current);
            peerConnectionRef.current = null;
        }

        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }

        setRemoteStream(null);
        setIsConnected(false);
    }, [remoteVideoRef]);

    return {
        peerConnectionRef,
        remoteStream,
        isConnected,
        handleSignal,
        createOffer,
        createPeerConnection,
        closePeer,
        setIsConnected
    };
};
