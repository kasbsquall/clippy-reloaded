// Property-based tests for ContextEngine
// **Feature: clippy-mvp, Property 5: Context Capture Completeness**
// **Feature: clippy-mvp, Property 6: Context Storage Uniqueness**
// **Feature: clippy-mvp, Property 7: Recurring Pattern Detection**
// **Feature: browser-tab-detection, Property 5: Context Integration**

import * as fc from 'fast-check';
import { ContextEngineImpl, TaskCategory } from './context-engine';
import { BrowserContext } from './window-monitor';
import { BrowserType } from './title-parser';

describe('ContextEngine Property Tests', () => {
  let engine: ContextEngineImpl;

  beforeEach(() => {
    engine = new ContextEngineImpl();
  });

  afterEach(() => {
    engine.clearHistory();
  });

  // **Property 5: Context Capture Completeness**
  // **Validates: Requirements 2.1, 2.2**
  describe('Property 5: Context Capture Completeness', () => {
    it('should capture context with all required fields populated', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ maxLength: 200 }),
          async (app, title, content) => {
            const context = await engine.captureContext(app, title, content);

            // All required fields should be present and valid
            expect(context.id).toBeTruthy();
            expect(context.id.length).toBeGreaterThan(0);
            expect(context.timestamp).toBeGreaterThan(0);
            expect(context.activeApplication).toBe(app);
            expect(context.windowTitle).toBe(title);
            expect(context.visibleContent).toBe(content);
            
            // inferredIntent should be a valid TaskCategory
            const validCategories: TaskCategory[] = [
              'writing_email', 'debugging_code', 'file_management',
              'web_browsing', 'document_editing', 'unknown'
            ];
            expect(validCategories).toContain(context.inferredIntent);
            
            // confidence should be between 0 and 1
            expect(context.confidence).toBeGreaterThanOrEqual(0);
            expect(context.confidence).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Property 6: Context Storage Uniqueness**
  // **Validates: Requirements 2.3**
  describe('Property 6: Context Storage Uniqueness', () => {
    it('should generate unique IDs for all stored contexts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 20 }),
          async (count) => {
            engine.clearHistory();
            const ids: string[] = [];

            for (let i = 0; i < count; i++) {
              const context = await engine.captureContext(`app-${i}`, `title-${i}`);
              await engine.storeContext(context);
              ids.push(context.id);
            }

            // All IDs should be unique
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(count);
            
            // Verify through getAllContextIds
            const storedIds = engine.getAllContextIds();
            expect(storedIds.length).toBe(count);
            expect(new Set(storedIds).size).toBe(count);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Property 7: Recurring Pattern Detection**
  // **Validates: Requirements 2.4**
  describe('Property 7: Recurring Pattern Detection', () => {
    it('should detect recurring patterns when 3+ contexts share same intent within 24 hours', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('debugging_code', 'writing_email', 'file_management') as fc.Arbitrary<TaskCategory>,
          fc.integer({ min: 3, max: 10 }),
          async (intent, count) => {
            engine.clearHistory();
            
            // Create contexts that will match the intent
            const appMap: Record<string, string> = {
              'debugging_code': 'vscode',
              'writing_email': 'outlook',
              'file_management': 'explorer',
            };
            
            for (let i = 0; i < count; i++) {
              const context = await engine.captureContext(
                appMap[intent] || 'unknown',
                `${intent} window ${i}`
              );
              await engine.storeContext(context);
            }

            // Should detect as recurring pattern
            const isRecurring = engine.isRecurringPattern(intent, 24);
            expect(isRecurring).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT detect recurring pattern with fewer than 3 contexts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('debugging_code', 'writing_email') as fc.Arbitrary<TaskCategory>,
          async (intent) => {
            engine.clearHistory();
            
            const appMap: Record<string, string> = {
              'debugging_code': 'vscode',
              'writing_email': 'outlook',
            };
            
            // Only add 2 contexts
            for (let i = 0; i < 2; i++) {
              const context = await engine.captureContext(
                appMap[intent],
                `${intent} window ${i}`
              );
              await engine.storeContext(context);
            }

            const isRecurring = engine.isRecurringPattern(intent, 24);
            expect(isRecurring).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: browser-tab-detection, Property 5: Context Integration**
   * 
   * For any window change event received by the Context Engine, the current
   * context SHALL be updated to include the browser information from the event.
   * 
   * **Validates: Requirements 4.1**
   */
  describe('Property 5: Context Integration (browser-tab-detection)', () => {
    // Generator for BrowserContext
    const browserContextArb = fc.record({
      pageTitle: fc.string({ minLength: 0, maxLength: 100 }),
      browserType: fc.constantFrom('chrome', 'firefox', 'edge', 'unknown') as fc.Arbitrary<BrowserType>,
      applicationName: fc.string({ minLength: 1, maxLength: 50 }),
      processName: fc.string({ minLength: 1, maxLength: 30 }),
      isSupported: fc.constant(true),
      timestamp: fc.integer({ min: 1, max: Date.now() + 1000000 }),
    });

    it('should update browser context when window change event is received', () => {
      fc.assert(
        fc.property(
          browserContextArb,
          (browserContext: BrowserContext) => {
            engine.clearBrowserContext();
            
            // Update browser context
            engine.updateBrowserContext(browserContext);
            
            // Get the stored context
            const storedContext = engine.getBrowserContext();
            
            // Should have stored the context
            expect(storedContext).not.toBeNull();
            expect(storedContext!.pageTitle).toBe(browserContext.pageTitle);
            expect(storedContext!.browserType).toBe(browserContext.browserType);
            expect(storedContext!.applicationName).toBe(browserContext.applicationName);
            expect(storedContext!.processName).toBe(browserContext.processName);
            expect(storedContext!.timestamp).toBe(browserContext.timestamp);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include browser context in captured context when available', async () => {
      await fc.assert(
        fc.asyncProperty(
          browserContextArb,
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (browserContext: BrowserContext, app, title) => {
            engine.clearBrowserContext();
            
            // Set browser context
            engine.updateBrowserContext(browserContext);
            
            // Capture a new context
            const captured = await engine.captureContext(app, title);
            
            // Should include browser context
            expect(captured.browserContext).toBeDefined();
            expect(captured.browserContext!.pageTitle).toBe(browserContext.pageTitle);
            expect(captured.browserContext!.browserType).toBe(browserContext.browserType);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT include browser context when not set', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (app, title) => {
            engine.clearBrowserContext();
            
            // Capture context without setting browser context
            const captured = await engine.captureContext(app, title);
            
            // Should not have browser context
            expect(captured.browserContext).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update browser context on subsequent window changes', () => {
      fc.assert(
        fc.property(
          fc.array(browserContextArb, { minLength: 2, maxLength: 10 }),
          (contexts: BrowserContext[]) => {
            engine.clearBrowserContext();
            
            // Update with each context
            for (const ctx of contexts) {
              engine.updateBrowserContext(ctx);
            }
            
            // Should have the last context
            const lastContext = contexts[contexts.length - 1];
            const storedContext = engine.getBrowserContext();
            
            expect(storedContext).not.toBeNull();
            expect(storedContext!.pageTitle).toBe(lastContext.pageTitle);
            expect(storedContext!.browserType).toBe(lastContext.browserType);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
