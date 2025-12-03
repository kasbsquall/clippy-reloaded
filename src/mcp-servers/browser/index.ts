// Browser MCP Server
// Requirements: 6.4

import { shell } from 'electron';

export interface BrowserResult {
  success: boolean;
  url: string;
  error?: string;
}

export class BrowserServer {
  // Open URL in default browser (Requirement 6.4)
  async openUrl(url: string): Promise<BrowserResult> {
    try {
      // Validate URL
      const parsedUrl = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
          success: false,
          url,
          error: `Invalid protocol: ${parsedUrl.protocol}. Only http and https are allowed.`,
        };
      }

      // Open in default browser
      await shell.openExternal(url);

      return {
        success: true,
        url,
      };
    } catch (error) {
      return {
        success: false,
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Open URL with fallback for non-Electron environments
  async openUrlFallback(url: string): Promise<BrowserResult> {
    try {
      const parsedUrl = new URL(url);
      
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
          success: false,
          url,
          error: `Invalid protocol: ${parsedUrl.protocol}`,
        };
      }

      // Use platform-specific command
      const { exec } = await import('child_process');
      const platform = process.platform;
      
      let command: string;
      if (platform === 'win32') {
        command = `start "" "${url}"`;
      } else if (platform === 'darwin') {
        command = `open "${url}"`;
      } else {
        command = `xdg-open "${url}"`;
      }

      return new Promise((resolve) => {
        exec(command, (error) => {
          if (error) {
            resolve({ success: false, url, error: error.message });
          } else {
            resolve({ success: true, url });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
