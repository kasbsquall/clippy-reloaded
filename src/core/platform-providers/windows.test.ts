/**
 * Unit tests for WindowsPowerShellProvider
 */

import { WindowsPowerShellProvider } from './windows';

describe('WindowsPowerShellProvider', () => {
  let provider: WindowsPowerShellProvider;

  beforeEach(() => {
    provider = new WindowsPowerShellProvider();
  });

  describe('isSupported', () => {
    it('should return true on Windows platform', () => {
      // This test will pass on Windows, fail on other platforms
      const isWindows = process.platform === 'win32';
      expect(provider.isSupported()).toBe(isWindows);
    });
  });

  describe('getPlatformName', () => {
    it('should return Windows (PowerShell)', () => {
      expect(provider.getPlatformName()).toBe('Windows (PowerShell)');
    });
  });

  describe('getCapabilities', () => {
    it('should return correct capabilities object', () => {
      const capabilities = provider.getCapabilities();
      
      expect(capabilities.platform).toBe('win32');
      expect(capabilities.processName).toBe(true);
      expect(typeof capabilities.windowDetection).toBe('boolean');
    });
  });

  describe('getActiveWindow', () => {
    // Only run these tests on Windows
    const runOnWindows = process.platform === 'win32' ? it : it.skip;

    runOnWindows('should return WindowInfo with title and processName', async () => {
      const result = await provider.getActiveWindow();
      
      // Should return a result (there's always an active window)
      expect(result).not.toBeNull();
      
      if (result) {
        expect(typeof result.title).toBe('string');
        expect(typeof result.processName).toBe('string');
        expect(typeof result.timestamp).toBe('number');
        expect(result.timestamp).toBeGreaterThan(0);
      }
    });

    runOnWindows('should return timestamp close to current time', async () => {
      const before = Date.now();
      const result = await provider.getActiveWindow();
      const after = Date.now();
      
      if (result) {
        expect(result.timestamp).toBeGreaterThanOrEqual(before);
        expect(result.timestamp).toBeLessThanOrEqual(after);
      }
    });

    it('should return null on unsupported platforms', async () => {
      // Mock platform check
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      
      const unsupportedProvider = new WindowsPowerShellProvider();
      const result = await unsupportedProvider.getActiveWindow();
      
      expect(result).toBeNull();
      
      // Restore platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });
});
