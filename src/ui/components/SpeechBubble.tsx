// Speech bubble component with auto-dismiss
// Requirements: 5.4

import React, { useState, useEffect, useCallback } from 'react';

export interface SpeechBubbleProps {
  message: string;
  duration?: number;
  onDismiss?: () => void;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  message,
  duration = 5000,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-dismiss after duration (Requirement 5.4)
  useEffect(() => {
    if (!isHovered && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, isHovered, onDismiss]);

  const handleClick = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      className="speech-bubble"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: '10px',
        padding: '12px 16px',
        backgroundColor: '#fffef0',
        border: '2px solid #333',
        borderRadius: '12px',
        boxShadow: '2px 2px 8px rgba(0,0,0,0.2)',
        maxWidth: '250px',
        minWidth: '150px',
        fontSize: '13px',
        lineHeight: '1.4',
        cursor: 'pointer',
        zIndex: 1000,
      }}
    >
      {/* Bubble tail */}
      <div
        style={{
          position: 'absolute',
          bottom: '-10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: '10px solid #333',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-7px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid #fffef0',
        }}
      />

      {/* Message text */}
      <p style={{ margin: 0, color: '#333' }}>{message}</p>

      {/* Dismiss hint */}
      <small
        style={{
          display: 'block',
          marginTop: '8px',
          color: '#888',
          fontSize: '10px',
        }}
      >
        Click to dismiss
      </small>
    </div>
  );
};

export default SpeechBubble;
