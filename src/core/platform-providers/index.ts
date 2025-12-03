/**
 * Platform Providers Index
 * 
 * Exports platform-specific window detection providers
 */

export * from './types';
export * from './windows';

import { PlatformProvider } from './types';
import { WindowsPowerShellProvider } from './windows';

/**
 * Get the appropriate platform provider for the current OS
 */
export function getPlatformProvider(): PlatformProvider | null {
  // Windows
  if (process.platform === 'win32') {
    return new WindowsPowerShellProvider();
  }

  // macOS - future implementation
  // if (process.platform === 'darwin') {
  //   return new MacOSProvider();
  // }

  // Linux - future implementation
  // if (process.platform === 'linux') {
  //   return new LinuxProvider();
  // }

  console.warn(`[PlatformProvider] Unsupported platform: ${process.platform}`);
  return null;
}
