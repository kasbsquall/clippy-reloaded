// Main React App component
import React, { useState, useEffect } from 'react';
import { Clippy } from './components/Clippy';
import { AnimationType } from '../core/personality-engine';

declare global {
  interface Window {
    clippy: {
      getPosition: () => Promise<{ x: number; y: number } | null>;
      setPosition: (x: number, y: number) => Promise<void>;
      showMessage: (message: string) => Promise<void>;
      onMessage: (callback: (message: string) => void) => void;
      setAnimation: (animation: string) => Promise<void>;
      onAnimationChange: (callback: (animation: string) => void) => void;
    };
  }
}

const App: React.FC = () => {
  const [animation, setAnimation] = useState<AnimationType>('idle');
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    // Listen for messages from main process
    if (window.clippy) {
      window.clippy.onMessage((msg: string) => {
        setMessage(msg);
      });

      window.clippy.onAnimationChange((anim: string) => {
        setAnimation(anim as AnimationType);
      });
    }
  }, []);

  const handleMessageDismiss = (): void => {
    setMessage(undefined);
    setAnimation('idle');
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
      }}
    >
      <Clippy
        animation={animation}
        message={message}
        onMessageDismiss={handleMessageDismiss}
      />
    </div>
  );
};

export default App;
