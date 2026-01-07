/**
 * WebRTC utility functions for stream and connection management
 */

/**
 * Validates if a media stream is ready and has active tracks
 * @param {MediaStream} stream - The media stream to validate
 * @returns {boolean} True if stream is valid and has tracks
 */
export const isStreamValid = (stream) => {
    if (!stream) return false;
    if (!stream.getTracks || typeof stream.getTracks !== 'function') return false;

    const tracks = stream.getTracks();
    return tracks.length > 0 && tracks.some(track => track.readyState === 'live');
};

/**
 * Stops all tracks in a media stream
 * @param {MediaStream} stream - The media stream to stop
 */
export const stopMediaStream = (stream) => {
    if (!stream) return;

    try {
        const tracks = stream.getTracks();
        tracks.forEach(track => {
            track.stop();
            console.log(`Stopped ${track.kind} track`);
        });
    } catch (error) {
        console.error('Error stopping media stream:', error);
    }
};

/**
 * Toggles a specific track type in a media stream
 * @param {MediaStream} stream - The media stream
 * @param {string} trackType - Type of track ('video' or 'audio')
 * @param {boolean} enabled - Whether to enable or disable the track
 * @returns {boolean} The new enabled state, or null if track not found
 */
export const toggleTrack = (stream, trackType, enabled) => {
    if (!stream) return null;

    const tracks = trackType === 'video'
        ? stream.getVideoTracks()
        : stream.getAudioTracks();

    if (tracks.length === 0) {
        console.warn(`No ${trackType} tracks found in stream`);
        return null;
    }

    tracks[0].enabled = enabled;
    return tracks[0].enabled;
};

/**
 * Gets the current state of a video track
 * @param {MediaStream} stream - The media stream
 * @returns {boolean} True if video track is enabled
 */
export const isVideoEnabled = (stream) => {
    if (!stream) return false;

    const videoTracks = stream.getVideoTracks();
    return videoTracks.length > 0 && videoTracks[0].enabled;
};

/**
 * Gets the current state of an audio track
 * @param {MediaStream} stream - The media stream
 * @returns {boolean} True if audio track is enabled
 */
export const isAudioEnabled = (stream) => {
    if (!stream) return false;

    const audioTracks = stream.getAudioTracks();
    return audioTracks.length > 0 && audioTracks[0].enabled;
};

/**
 * Validates if a peer connection is in a valid state
 * @param {RTCPeerConnection} peerConnection - The peer connection to validate
 * @returns {boolean} True if peer connection is valid and not closed
 */
export const isPeerConnectionValid = (peerConnection) => {
    if (!peerConnection) return false;

    const state = peerConnection.signalingState;
    return state !== 'closed';
};

/**
 * Safely closes a peer connection
 * @param {RTCPeerConnection} peerConnection - The peer connection to close
 */
export const closePeerConnection = (peerConnection) => {
    if (!peerConnection) return;

    try {
        if (peerConnection.signalingState !== 'closed') {
            peerConnection.close();
            console.log('Peer connection closed');
        }
    } catch (error) {
        console.error('Error closing peer connection:', error);
    }
};

/**
 * Creates a new RTCPeerConnection with the given configuration
 * @param {RTCConfiguration} config - The WebRTC configuration
 * @returns {RTCPeerConnection} The created peer connection
 */
export const createPeerConnection = (config) => {
    try {
        return new RTCPeerConnection(config);
    } catch (error) {
        console.error('Error creating peer connection:', error);
        throw error;
    }
};

/**
 * Adds tracks from a stream to a peer connection
 * @param {RTCPeerConnection} peerConnection - The peer connection
 * @param {MediaStream} stream - The media stream
 */
export const addStreamToPeerConnection = (peerConnection, stream) => {
    if (!peerConnection || !stream) {
        console.error('Invalid peer connection or stream');
        return;
    }

    try {
        stream.getTracks().forEach(track => {
            peerConnection.addTrack(track, stream);
            console.log(`Added ${track.kind} track to peer connection`);
        });
    } catch (error) {
        console.error('Error adding tracks to peer connection:', error);
        throw error;
    }
};
