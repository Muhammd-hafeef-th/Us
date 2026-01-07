import styled from 'styled-components';
import { Box, Paper, IconButton } from '@mui/material';

/**
 * Container for video elements in a grid layout
 * Responsive: Single column on mobile, two columns on desktop
 */
export const VideoContainer = styled(Box)`
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

/**
 * Base video box component with 16:9 aspect ratio
 */
export const VideoBox = styled(Paper)`
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

/**
 * Local video box with "You" label
 */
export const LocalVideoBox = styled(VideoBox)`
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

/**
 * Remote video box with "Stranger" label
 */
export const RemoteVideoBox = styled(VideoBox)`
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

/**
 * Controls container - centered when not connected, right-aligned when connected
 */
export const Controls = styled(Box)`
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

/**
 * Camera toggle button overlaid on video
 */
export const CameraButton = styled(IconButton)`
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

/**
 * Status message overlay for video box
 */
export const StatusMessage = styled(Box)`
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

/**
 * Chat popup container with retro styling
 */
export const ChatPopup = styled(Paper)`
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

/**
 * Chat header with title and close button
 */
export const ChatHeader = styled(Box)`
  padding: 12px 16px;
  background-color: #000;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 3px solid #000;
`;

/**
 * Scrollable messages container
 */
export const MessagesContainer = styled(Box)`
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

/**
 * Individual message bubble
 */
export const MessageBubble = styled(Box)`
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

/**
 * Chat input container with send button
 */
export const ChatInputContainer = styled(Box)`
  padding: 12px;
  background-color: #fff;
  border-top: 3px solid #000;
  display: flex;
  gap: 8px;
`;
