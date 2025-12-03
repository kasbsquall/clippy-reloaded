// Clippy component with animations
// Requirements: 5.2, 5.4

import React, { useState, useEffect, useCallback } from 'react';
import { AnimationType } from '../../core/personality-engine';
import { SpeechBubble } from './SpeechBubble';

export interface BrowserContextInfo {
  pageTitle: string;
  browserType: 'chrome' | 'firefox' | 'edge' | 'unknown';
  applicationName: string;
  processName: string;
  timestamp: number;
}

export interface ClippyProps {
  animation?: AnimationType;
  message?: string;
  onMessageDismiss?: () => void;
  browserContext?: BrowserContextInfo | null;
}

// Clippy ASCII art for different states (placeholder for Lottie)
const CLIPPY_STATES: Record<AnimationType, string> = {
  idle: `
    ╭──────╮
    │  📎  │
    │ ◠ ◠ │
    │  ‿  │
    ╰──────╯
  `,
  thinking: `
    ╭──────╮
    │  📎  │
    │ ◉ ◉ │
    │  ○  │
    ╰──────╯
  `,
  excited: `
    ╭──────╮
    │  📎  │
    │ ★ ★ │
    │  ◡  │
    ╰──────╯
  `,
  apologetic: `
    ╭──────╮
    │  📎  │
    │ ◡ ◡ │
    │  ︵  │
    ╰──────╯
  `,
  proud: `
    ╭──────╮
    │  📎  │
    │ ◠ ◠ │
    │  ◡  │
    ╰──────╯
  `,
  wave: `
    ╭──────╮
    │ 📎👋 │
    │ ◠ ◠ │
    │  ◡  │
    ╰──────╯
  `,
};

// Browser icons
const BROWSER_ICONS: Record<string, string> = {
  chrome: '🌐',
  firefox: '🦊',
  edge: '🔷',
  unknown: '🖥️',
};

export const Clippy: React.FC<ClippyProps> = ({
  animation = 'idle',
  message,
  onMessageDismiss,
  browserContext,
}) => {
  const [currentAnimation, setCurrentAnimation] = useState<AnimationType>(animation);
  const [isBlinking, setIsBlinking] = useState(false);

  // Blink animation for idle state
  useEffect(() => {
    if (currentAnimation === 'idle') {
      const blinkInterval = setInterval(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
      }, 3000);
      return () => clearInterval(blinkInterval);
    }
  }, [currentAnimation]);

  // Update animation when prop changes
  useEffect(() => {
    setCurrentAnimation(animation);
  }, [animation]);

  // Handle drag
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', '');
  }, []);

  return (
    <div
      className="clippy-container"
      draggable
      onDragStart={handleDragStart}
      style={{
        position: 'relative',
        cursor: 'grab',
        userSelect: 'none',
        fontFamily: 'monospace',
        fontSize: '14px',
        whiteSpace: 'pre',
      }}
    >
      {/* Speech bubble */}
      {message && (
        <SpeechBubble
          message={message}
          duration={5000}
          onDismiss={onMessageDismiss}
        />
      )}

      {/* Clippy character */}
      <div
        className="clippy-character"
        style={{
          opacity: isBlinking ? 0.8 : 1,
          transition: 'opacity 0.1s',
        }}
      >
        {CLIPPY_STATES[currentAnimation]}
      </div>

      {/* Browser context indicator */}
      {browserContext && (
        <div
          className="browser-context"
          style={{
            position: 'absolute',
            bottom: '-30px',
            left: '0',
            right: '0',
            fontSize: '10px',
            textAlign: 'center',
            color: '#666',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '4px 8px',
            borderRadius: '4px',
            maxWidth: '150px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={browserContext.pageTitle}
        >
          {BROWSER_ICONS[browserContext.browserType]} {browserContext.pageTitle.substring(0, 20)}
          {browserContext.pageTitle.length > 20 ? '...' : ''}
        </div>
      )}
    </div>
  );
};

export default Clippy;
