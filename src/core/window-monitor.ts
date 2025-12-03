/**
 * WindowMonitor - Monitors active window changes and emits events
 * 
 * Polls the system for the currently focused window and notifies
 * listeners when the window changes.
 */

import { TitleParser, BrowserType } from './title-parser';
import { getPlatformProvider, PlatformProvider, WindowInfo } from './platform-providers';

export interface WindowMonitorConfig {
  pollInterval: number;  // Default: 1000ms
  enabled: boolean;
}

export interface BrowserContext {
  pageTitle: string;
  browserType: BrowserType;
  applicationName: string;
  processName: string;
  isSupported: boolean;
  timestamp: number;
}

export type WindowChangeCallback = (context: BrowserContext) => void;

const DEFAULT_CONFIG: WindowMonitorConfig = {
  pollInterval: 1000,
  enabled: true,
};

// Windows/processes to ignore (Clippy's own window)
const IGNORED_WINDOWS = [
  'clippy 2.0',
  'clippy',
  'electron',
];

export class WindowMonitor {
  private config: WindowMonitorConfig;
  private provider: PlatformProvider | null;
  private titleParser: TitleParser;
  private pollTimer: NodeJS.Timeout | null = null;
  private lastWindowTitle: string | null = null;
  private lastValidContext: BrowserContext | null = null; // Remember last valid context
  private callbacks: WindowChangeCallback[] = [];
  private isRunning: boolean = false;

  constructor(config: Partial<WindowMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.provider = getPlatformProvider();
    this.titleParser = new TitleParser();
  }

  /**
   * Check if a window should be ignored (e.g., Clippy's own window)
   */
  private shouldIgnoreWindow(title: string, processName: string): boolean {
    const lowerTitle = title.toLowerCase();
    const lowerProcess = processName.toLowerCase();
    
    return IGNORED_WINDOWS.some(ignored => 
      lowerTitle.includes(ignored) || lowerProcess.includes(ignored)
    );
  }

  /**
   * Check if window monitoring is supported on this platform
   */
  isSupported(): boolean {
    return this.provider !== null && this.provider.isSupported();
  }

  /**
   * Start monitoring window changes
   */
  start(): void {
    if (!this.config.enabled || this.isRunning) {
      return;
    }

    if (!this.isSupported()) {
      console.warn('[WindowMonitor] Window monitoring not supported on this platform');
      return;
    }

    this.isRunning = true;
    this.poll();
  }

  /**
   * Stop monitoring window changes
   */
  stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Register a callback for window change events
   */
  onWindowChange(callback: WindowChangeCallback): () => void {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get the current window info (one-time check)
   */
  async getCurrentWindow(): Promise<BrowserContext | null> {
    if (!this.provider) {
      return null;
    }

    try {
      const windowInfo = await this.provider.getActiveWindow();
      if (!windowInfo) {
        return null;
      }

      return this.createBrowserContext(windowInfo);
    } catch (error) {
      console.error('[WindowMonitor] Error getting current window:', error);
      return null;
    }
  }

  /**
   * Update the poll interval
   */
  setPollInterval(interval: number): void {
    this.config.pollInterval = interval;
  }

  /**
   * Get current configuration
   */
  getConfig(): WindowMonitorConfig {
    return { ...this.config };
  }

  /**
   * Poll for window changes
   */
  private async poll(): Promise<void> {
    if (!this.isRunning || !this.provider) {
      return;
    }

    try {
      const windowInfo = await this.provider.getActiveWindow();
      
      if (windowInfo) {
        // Skip Clippy's own window - keep the last valid context
        if (this.shouldIgnoreWindow(windowInfo.title, windowInfo.processName)) {
          // Don't update lastWindowTitle, just skip this poll
          // This way when user clicks back, we won't re-emit
        } else {
          // Check if window title changed (deduplication)
          if (windowInfo.title !== this.lastWindowTitle) {
            this.lastWindowTitle = windowInfo.title;
            const context = this.createBrowserContext(windowInfo);
            this.lastValidContext = context; // Remember this valid context
            this.emitWindowChange(context);
          }
        }
      }
    } catch (error) {
      // Log error but continue polling (error resilience)
      console.error('[WindowMonitor] Error during poll:', error);
    }

    // Schedule next poll
    if (this.isRunning) {
      this.pollTimer = setTimeout(() => this.poll(), this.config.pollInterval);
    }
  }

  /**
   * Get the last valid (non-Clippy) context
   */
  getLastValidContext(): BrowserContext | null {
    return this.lastValidContext;
  }

  /**
   * Create BrowserContext from WindowInfo
   */
  private createBrowserContext(windowInfo: WindowInfo): BrowserContext {
    const parsed = this.titleParser.parse(windowInfo.title, windowInfo.processName);
    
    return {
      pageTitle: parsed.pageTitle,
      browserType: parsed.browserType,
      applicationName: parsed.applicationName,
      processName: windowInfo.processName,
      isSupported: true,
      timestamp: windowInfo.timestamp,
    };
  }

  /**
   * Emit window change event to all callbacks
   */
  private emitWindowChange(context: BrowserContext): void {
    for (const callback of this.callbacks) {
      try {
        callback(context);
      } catch (error) {
        console.error('[WindowMonitor] Error in callback:', error);
      }
    }
  }
}

// Export singleton instance
export const windowMonitor = new WindowMonitor();
