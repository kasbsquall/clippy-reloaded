/**
 * TitleParser - Parses window titles to extract browser type and page title
 * 
 * Supports Chrome, Firefox, Edge and identifies unknown browsers
 */

export type BrowserType = 'chrome' | 'firefox' | 'edge' | 'unknown';

export interface ParsedTitle {
  pageTitle: string;
  browserType: BrowserType;
  applicationName: string;
}

// Browser title patterns - order matters for matching
const BROWSER_PATTERNS: Array<{ pattern: RegExp; type: BrowserType; suffix: string }> = [
  { pattern: /\s*-\s*Google Chrome$/i, type: 'chrome', suffix: ' - Google Chrome' },
  { pattern: /\s*—\s*Mozilla Firefox$/i, type: 'firefox', suffix: ' — Mozilla Firefox' },
  { pattern: /\s*-\s*Mozilla Firefox$/i, type: 'firefox', suffix: ' - Mozilla Firefox' },
  { pattern: /\s*-\s*Microsoft Edge$/i, type: 'edge', suffix: ' - Microsoft Edge' },
];

// Process names that indicate browsers
const BROWSER_PROCESS_NAMES: Record<string, BrowserType> = {
  'chrome': 'chrome',
  'chrome.exe': 'chrome',
  'firefox': 'firefox',
  'firefox.exe': 'firefox',
  'msedge': 'edge',
  'msedge.exe': 'edge',
};

export class TitleParser {
  /**
   * Detects the browser type from window title and process name
   */
  detectBrowser(windowTitle: string, processName: string = ''): BrowserType {
    // First check process name for more reliable detection
    const normalizedProcess = processName.toLowerCase();
    if (BROWSER_PROCESS_NAMES[normalizedProcess]) {
      return BROWSER_PROCESS_NAMES[normalizedProcess];
    }

    // Fall back to title pattern matching
    for (const { pattern, type } of BROWSER_PATTERNS) {
      if (pattern.test(windowTitle)) {
        return type;
      }
    }

    return 'unknown';
  }

  /**
   * Extracts the page title by removing the browser suffix
   */
  extractPageTitle(windowTitle: string, browserType: BrowserType): string {
    if (browserType === 'unknown' || !windowTitle) {
      return windowTitle || '';
    }

    for (const { pattern, type } of BROWSER_PATTERNS) {
      if (type === browserType && pattern.test(windowTitle)) {
        return windowTitle.replace(pattern, '').trim();
      }
    }

    return windowTitle;
  }

  /**
   * Extracts application name from non-browser window titles
   */
  extractApplicationName(windowTitle: string, processName: string = ''): string {
    // If we have a process name, use it
    if (processName) {
      // Remove .exe extension if present
      return processName.replace(/\.exe$/i, '');
    }

    // Try to extract from title (often "Document - Application" format)
    const dashIndex = windowTitle.lastIndexOf(' - ');
    if (dashIndex > 0) {
      return windowTitle.substring(dashIndex + 3).trim();
    }

    return windowTitle || 'Unknown';
  }

  /**
   * Parses a window title and returns structured information
   */
  parse(windowTitle: string, processName: string = ''): ParsedTitle {
    const browserType = this.detectBrowser(windowTitle, processName);
    const pageTitle = this.extractPageTitle(windowTitle, browserType);
    const applicationName = browserType !== 'unknown' 
      ? this.getBrowserDisplayName(browserType)
      : this.extractApplicationName(windowTitle, processName);

    return {
      pageTitle,
      browserType,
      applicationName,
    };
  }

  /**
   * Gets the display name for a browser type
   */
  private getBrowserDisplayName(browserType: BrowserType): string {
    switch (browserType) {
      case 'chrome': return 'Google Chrome';
      case 'firefox': return 'Mozilla Firefox';
      case 'edge': return 'Microsoft Edge';
      default: return 'Unknown Browser';
    }
  }
}

// Export singleton instance
export const titleParser = new TitleParser();
