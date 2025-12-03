/**
 * Platform Provider Types
 * 
 * Interfaces for cross-platform window detection
 */

export interface WindowInfo {
  title: string;
  processName: string;
  timestamp: number;
}

export interface PlatformProvider {
  /**
   * Check if this provider is supported on the current platform
   */
  isSupported(): boolean;

  /**
   * Get the currently active/focused window
   */
  getActiveWindow(): Promise<WindowInfo | null>;

  /**
   * Get the platform name for this provider
   */
  getPlatformName(): string;
}

export interface PlatformCapabilities {
  platform: string;
  windowDetection: boolean;
  processName: boolean;
}
