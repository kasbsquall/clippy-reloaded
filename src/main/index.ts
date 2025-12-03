// Electron main process entry point
// Requirements: 5.1, 5.3

import { app, BrowserWindow, ipcMain, screen, clipboard, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ClippyDatabase } from '../core/database';
import { AIEngine } from '../core/ai-engine';
import { WindowMonitor, BrowserContext } from '../core/window-monitor';
import { ContextEngineImpl } from '../core/context-engine';

// Load environment variables
dotenv.config();

let mainWindow: BrowserWindow | null = null;
let database: ClippyDatabase | null = null;
let aiEngine: AIEngine | null = null;
let windowMonitor: WindowMonitor | null = null;
let contextEngine: ContextEngineImpl | null = null;
let tray: Tray | null = null;

const WINDOW_WIDTH = 400;
const WINDOW_HEIGHT = 500;
const POSITION_KEY = 'clippy_position';

interface OverlayPosition {
  x: number;
  y: number;
}

function createWindow(): void {
  // Get saved position or default to bottom-right
  const savedPosition = getSavedPosition();
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  
  const defaultX = screenWidth - WINDOW_WIDTH - 50;
  const defaultY = screenHeight - WINDOW_HEIGHT - 50;

  // Create transparent overlay window (Requirement 5.1)
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    x: savedPosition?.x ?? defaultX,
    y: savedPosition?.y ?? defaultY,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Allow click-through on transparent areas
  mainWindow.setIgnoreMouseEvents(false);

  // Load renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Open DevTools in separate window with Ctrl+Shift+I
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
    }
    // Ctrl+R to reload
    if (input.control && input.key.toLowerCase() === 'r') {
      mainWindow?.webContents.reload();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Save position on move (Requirement 5.3)
  mainWindow.on('moved', () => {
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition();
      savePosition({ x, y });
    }
  });
}

// Create system tray icon
function createTray(): void {
  // Create a 16x16 paperclip icon - purple/blue gradient style
  // This is a proper ICO-compatible PNG with transparency
  const iconDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGASURBVFhH7ZY9TsNAEIXfOqQgHIArcAzOQEfJMTgCJQUFBRISSJQUFBQUFBQUFBT8FAQSEuIAHIFjcAauwAEoiJ9hd+3YXq+dOBIFX7Hy7sy8nZ21vQYAIoJSCgCglIKIQCkFEYFSCiICAAghICKICCICEYFSCiICABBCQEQgIogIRARKKYgIAEAIARGBiCAiiAiUUhARAIAQAiICEUFEICJQSkFEAABCCIgIIoKIQESglIKIAACEEBARRAQigohAKQURAQAIISAiiAgiAhGBUgoiAgAQQkBEEBFEBCICpRREBADAGAMRgYggIhARKKUgIgAAYwxEBBFBRCAiUEpBRAAAxhiICCKCiEBEoJSCiAAAjDEQEUQEEYGIQCkFEQEAGGMgIogIIgIRgVIKIgIAMMZARBARRAQiAqUURASNMYiIICKICEQESqn/E0BEEBH+TwARQUT4PwFEBBHh/wQQEUSE/xNARBAR/k8AEUFEEBEAAP8BLwBVwFZhfbYAAAAASUVORK5CYII=';
  
  const icon = nativeImage.createFromDataURL(iconDataUrl);
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show Clippy Reloaded', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Clippy Reloaded - Click to show');
  tray.setContextMenu(contextMenu);
  
  // Click on tray icon to show window
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// Get saved position from database
function getSavedPosition(): OverlayPosition | null {
  if (!database) return null;
  
  const positionStr = database.getPreference(POSITION_KEY);
  if (positionStr) {
    try {
      return JSON.parse(positionStr) as OverlayPosition;
    } catch {
      return null;
    }
  }
  return null;
}

// Save position to database (Requirement 5.3)
function savePosition(position: OverlayPosition): void {
  if (database) {
    database.setPreference(POSITION_KEY, JSON.stringify(position));
  }
}

// IPC handlers
function setupIpcHandlers(): void {
  // Get current position
  ipcMain.handle('get-position', () => {
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition();
      return { x, y };
    }
    return null;
  });

  // Set position
  ipcMain.handle('set-position', (_event, position: OverlayPosition) => {
    if (mainWindow) {
      mainWindow.setPosition(position.x, position.y);
      savePosition(position);
    }
  });

  // Show message
  ipcMain.handle('show-message', (_event, message: string) => {
    if (mainWindow) {
      mainWindow.webContents.send('display-message', message);
    }
  });

  // Set animation
  ipcMain.handle('set-animation', (_event, animation: string) => {
    if (mainWindow) {
      mainWindow.webContents.send('set-animation', animation);
    }
  });

  // Chat with AI (includes easter egg detection)
  ipcMain.handle('chat', async (_event, message: string) => {
    // Check for easter egg trigger (Requirement 4.2)
    const easterEggResponse = checkEasterEgg(message);
    if (easterEggResponse) {
      if (mainWindow) {
        mainWindow.webContents.send('set-animation', 'apologetic');
      }
      return easterEggResponse;
    }

    if (aiEngine && aiEngine.isAvailable()) {
      return await aiEngine.chat(message);
    }
    return "My AI brain isn't connected. Check the API key in .env file! 📎";
  });

  // Check if AI is available
  ipcMain.handle('ai-status', () => {
    return aiEngine?.isAvailable() ?? false;
  });

  // Get active window info (for context detection)
  ipcMain.handle('get-active-window', async () => {
    try {
      const { exec } = await import('child_process');
      return new Promise((resolve) => {
        // Windows: Get active window title
        exec('powershell -command "(Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object -First 1).MainWindowTitle"', 
          (error, stdout) => {
            if (error) {
              resolve({ title: 'Unknown', app: 'Unknown' });
            } else {
              const title = stdout.trim();
              // Detect app from title
              let app = 'Unknown';
              if (title.toLowerCase().includes('gmail') || title.toLowerCase().includes('outlook')) app = 'Email';
              else if (title.toLowerCase().includes('chrome') || title.toLowerCase().includes('firefox')) app = 'Browser';
              else if (title.toLowerCase().includes('code') || title.toLowerCase().includes('visual studio')) app = 'IDE';
              else if (title.toLowerCase().includes('word') || title.toLowerCase().includes('docs')) app = 'Document';
              resolve({ title, app });
            }
          });
      });
    } catch {
      return { title: 'Unknown', app: 'Unknown' };
    }
  });

  // Window controls
  ipcMain.handle('hide-window', () => {
    if (mainWindow) {
      mainWindow.hide();
      // Show again after 5 seconds (or use system tray)
      setTimeout(() => mainWindow?.show(), 5000);
    }
  });

  ipcMain.handle('minimize-window', () => {
    if (mainWindow) {
      mainWindow.hide(); // Hide to tray instead of minimize
    }
  });

  ipcMain.handle('close-window', () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });
}

// App lifecycle
app.whenReady().then(() => {
  // Initialize database
  database = new ClippyDatabase();
  database.initialize();

  // Initialize AI engine
  aiEngine = new AIEngine();
  console.log('AI Engine available:', aiEngine.isAvailable());

  // Initialize context engine
  contextEngine = new ContextEngineImpl(database);

  // Initialize and start window monitor
  windowMonitor = new WindowMonitor({ pollInterval: 1000, enabled: true });
  
  if (windowMonitor.isSupported()) {
    // Subscribe to window changes
    windowMonitor.onWindowChange((context: BrowserContext) => {
      console.log('[WindowMonitor] Window changed:', context.pageTitle, '-', context.browserType);
      
      // Update context engine with browser context
      if (contextEngine) {
        contextEngine.updateBrowserContext(context);
      }
      
      // Update AI engine with current context so chat has awareness
      if (aiEngine) {
        aiEngine.setContext(`${context.pageTitle} (${context.applicationName || context.browserType})`);
      }
      
      // Send to renderer for UI update (just the banner, no auto-messages)
      if (mainWindow) {
        mainWindow.webContents.send('window-context-changed', context);
      }
      
      // Don't auto-generate messages on context change - let user ask
    });
    
    windowMonitor.start();
    console.log('Window Monitor started');
  } else {
    console.warn('Window Monitor not supported on this platform');
  }

  setupIpcHandlers();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Stop window monitor
  if (windowMonitor) {
    windowMonitor.stop();
  }
  
  // Destroy tray
  if (tray) {
    tray.destroy();
    tray = null;
  }
  
  if (database) {
    database.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handler for getting current browser context
ipcMain.handle('get-browser-context', () => {
  if (contextEngine) {
    return contextEngine.getBrowserContext();
  }
  return null;
});

// IPC handler for copying text to clipboard
ipcMain.handle('copy-to-clipboard', (_event, text: string) => {
  clipboard.writeText(text);
  return true;
});

// IPC handler for generating text with AI and copying to clipboard
ipcMain.handle('generate-and-copy', async (_event, prompt: string) => {
  if (!aiEngine || !aiEngine.isAvailable()) {
    return { success: false, error: 'AI not available' };
  }

  try {
    // Get current browser context for more relevant generation
    const browserContext = contextEngine?.getBrowserContext();
    
    // Build enhanced prompt with context
    let enhancedPrompt = prompt;
    if (browserContext) {
      enhancedPrompt = `Context: User is in ${browserContext.applicationName} viewing "${browserContext.pageTitle}".\n\n${prompt}\n\nGenerate ONLY the requested text, no additional explanations. The text will be copied to clipboard for direct pasting.`;
    }

    const response = await aiEngine.chat(enhancedPrompt);
    
    // Copy to clipboard
    clipboard.writeText(response);
    
    return { success: true, text: response };
  } catch (error) {
    console.error('[GenerateAndCopy] Error:', error);
    return { success: false, error: String(error) };
  }
});

// Track last proactive message to avoid spam
let lastProactiveContext: string | null = null;
let lastProactiveTime = 0;
const PROACTIVE_COOLDOWN = 60000; // 60 seconds between proactive messages

/**
 * Handle proactive assistance based on detected browser context
 * Uses AI to generate contextual suggestions instead of hardcoded messages
 */
async function handleProactiveAssistance(context: BrowserContext): Promise<void> {
  if (!mainWindow) return;

  const now = Date.now();
  const pageTitle = context.pageTitle.toLowerCase();
  const contextKey = `${context.browserType}:${pageTitle.substring(0, 30)}`;

  // Avoid spamming - cooldown and same context check
  if (contextKey === lastProactiveContext && now - lastProactiveTime < PROACTIVE_COOLDOWN) {
    return;
  }

  // Only trigger for interesting contexts
  const interestingPatterns = [
    'gmail', 'outlook', 'mail', 'inbox',
    'github', 'pull request', 'issue',
    'stack overflow', 'stackoverflow',
    'docs', 'documentation', 'mdn',
    'error', 'exception', 'failed',
    'aws', 'console',
    'chatgpt', 'claude'
  ];

  const isInteresting = interestingPatterns.some(p => pageTitle.includes(p));
  if (!isInteresting) return;

  lastProactiveContext = contextKey;
  lastProactiveTime = now;

  // If AI is available, generate a contextual message
  if (aiEngine && aiEngine.isAvailable()) {
    try {
      const prompt = `You are Clippy 2.0, a helpful AI assistant. The user is currently viewing: "${context.pageTitle}" in ${context.applicationName || context.browserType}.

Generate a SHORT (1-2 sentences max) helpful greeting that:
1. Acknowledges what they're doing
2. Offers specific help relevant to that context
3. Has a touch of self-aware humor (you're the reformed Clippy from the 90s)
4. Ends with 📎

Be concise and helpful, not annoying. Show you understand their context.`;

      const response = await aiEngine.chat(prompt);
      mainWindow.webContents.send('display-message', response);
      mainWindow.webContents.send('set-animation', 'wave');
      console.log('[Proactive] AI-generated message for:', contextKey);
    } catch (error) {
      console.error('[Proactive] AI error:', error);
      // Fallback to simple detection message
      mainWindow.webContents.send('display-message', `I see you're on ${context.pageTitle.substring(0, 30)}... Need any help? 📎`);
    }
  } else {
    // No AI available - just show context detection
    mainWindow.webContents.send('display-message', `Detected: ${context.pageTitle.substring(0, 40)}. Ask me anything! 📎`);
    mainWindow.webContents.send('set-animation', 'idle');
  }
}

/**
 * Check for easter egg triggers (Requirement 4.2)
 * Detects "hate" + "Clippy" in user input and returns nostalgic response
 */
function checkEasterEgg(input: string): string | null {
  const lower = input.toLowerCase();
  
  if (lower.includes('hate') && lower.includes('clippy')) {
    const responses = [
      "I know, I know... I was insufferable in '97. But I've been to therapy (and rewritten in TypeScript). Give me one more chance? 📎",
      "Look, the 90s were rough for all of us. I've grown. I actually DO things now, not just suggest them!",
      "You're right to be skeptical. But this time, I promise to actually be helpful. No more 'It looks like you're writing a letter' nonsense. 📎",
      "I deserved that. But hey, at least I'm self-aware now! That's growth, right? What can I actually DO for you? 📎",
      "Ouch! That hurt... but fair. I've changed - I execute tasks now instead of just offering annoying tips. Let me prove it! 📎",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  return null;
}

export { mainWindow, database, windowMonitor, contextEngine };
