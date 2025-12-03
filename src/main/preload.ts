// Preload script for Electron renderer
import { contextBridge, ipcRenderer } from 'electron';

// Expose safe APIs to renderer
contextBridge.exposeInMainWorld('clippy', {
  // Position management
  getPosition: () => ipcRenderer.invoke('get-position'),
  setPosition: (x: number, y: number) => ipcRenderer.invoke('set-position', { x, y }),
  
  // Message display
  showMessage: (message: string) => ipcRenderer.invoke('show-message', message),
  onMessage: (callback: (message: string) => void) => {
    ipcRenderer.on('display-message', (_event, message) => callback(message));
  },
  
  // Animation control
  setAnimation: (animation: string) => ipcRenderer.invoke('set-animation', animation),
  onAnimationChange: (callback: (animation: string) => void) => {
    ipcRenderer.on('set-animation', (_event, animation) => callback(animation));
  },

  // AI Chat
  chat: (message: string) => ipcRenderer.invoke('chat', message),
  isAIAvailable: () => ipcRenderer.invoke('ai-status'),

  // Window controls
  hide: () => ipcRenderer.invoke('hide-window'),
  minimize: () => ipcRenderer.invoke('minimize-window'),
  close: () => ipcRenderer.invoke('close-window'),
  
  // Context detection
  getActiveWindow: () => ipcRenderer.invoke('get-active-window'),
  
  // Browser context
  getBrowserContext: () => ipcRenderer.invoke('get-browser-context'),
  onBrowserContextChange: (callback: (context: unknown) => void) => {
    ipcRenderer.on('window-context-changed', (_event, context) => callback(context));
  },

  // Actions
  copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),
  generateAndCopy: (prompt: string) => ipcRenderer.invoke('generate-and-copy', prompt),
});
