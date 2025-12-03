/**
 * Property-based tests for TitleParser
 * 
 * **Feature: browser-tab-detection**
 */

import * as fc from 'fast-check';
import { TitleParser, BrowserType } from './title-parser';

describe('TitleParser Property Tests', () => {
  const parser = new TitleParser();

  // Browser suffixes for generating test titles
  const browserSuffixes: Array<{ suffix: string; type: BrowserType }> = [
    { suffix: ' - Google Chrome', type: 'chrome' },
    { suffix: ' — Mozilla Firefox', type: 'firefox' },
    { suffix: ' - Mozilla Firefox', type: 'firefox' },
    { suffix: ' - Microsoft Edge', type: 'edge' },
  ];

  /**
   * **Feature: browser-tab-detection, Property 1: Title Parsing Preserves Information**
   * 
   * For any valid browser window title string, parsing the title SHALL extract
   * a non-empty page title and correctly identify the browser type based on
   * the title suffix pattern.
   * 
   * **Validates: Requirements 1.2, 1.3**
   */
  describe('Property 1: Title Parsing Preserves Information', () => {
    it('should extract the original page title from browser-formatted titles', () => {
      fc.assert(
        fc.property(
          // Generate random page titles (non-empty after trim, no browser suffixes)
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => 
            s.trim().length > 0 &&
            !s.includes('Google Chrome') &&
            !s.includes('Mozilla Firefox') &&
            !s.includes('Microsoft Edge')
          ),
          // Pick a random browser suffix
          fc.constantFrom(...browserSuffixes),
          (pageTitle, browser) => {
            const fullTitle = pageTitle + browser.suffix;
            const parsed = parser.parse(fullTitle);
            
            // The extracted page title should match the trimmed original
            // (extractPageTitle trims whitespace which is expected behavior)
            expect(parsed.pageTitle).toBe(pageTitle.trim());
            // Browser type should be correctly identified
            expect(parsed.browserType).toBe(browser.type);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return non-empty application name for any parsed title', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (windowTitle) => {
            const parsed = parser.parse(windowTitle);
            
            // Application name should never be empty
            expect(parsed.applicationName.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: browser-tab-detection, Property 2: Browser Detection Consistency**
   * 
   * For any window title containing a known browser suffix (Chrome, Firefox, Edge),
   * the browser detection function SHALL return the corresponding browser type.
   * For titles without known suffixes, it SHALL return "unknown".
   * 
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
   */
  describe('Property 2: Browser Detection Consistency', () => {
    it('should consistently detect browser type from title suffix', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.constantFrom(...browserSuffixes),
          (prefix, browser) => {
            const fullTitle = prefix + browser.suffix;
            const detectedType = parser.detectBrowser(fullTitle);
            
            expect(detectedType).toBe(browser.type);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return "unknown" for titles without browser suffixes', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 200 }).filter(s =>
            !s.includes('Google Chrome') &&
            !s.includes('Mozilla Firefox') &&
            !s.includes('Microsoft Edge')
          ),
          (windowTitle) => {
            const detectedType = parser.detectBrowser(windowTitle);
            
            expect(detectedType).toBe('unknown');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect browser from process name regardless of title', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.constantFrom(
            { process: 'chrome.exe', expected: 'chrome' as BrowserType },
            { process: 'firefox.exe', expected: 'firefox' as BrowserType },
            { process: 'msedge.exe', expected: 'edge' as BrowserType }
          ),
          (windowTitle, { process, expected }) => {
            const detectedType = parser.detectBrowser(windowTitle, process);
            
            expect(detectedType).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
