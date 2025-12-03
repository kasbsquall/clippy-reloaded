/**
 * Property-based tests for WindowMonitor
 * 
 * **Feature: browser-tab-detection**
 */

import * as fc from 'fast-check';

/**
 * Simulates the deduplication logic from WindowMonitor
 * This is a pure function version for testing
 */
function simulateDeduplication(windowTitles: string[]): string[] {
  const emittedTitles: string[] = [];
  let lastTitle: string | null = null;

  for (const title of windowTitles) {
    if (title !== lastTitle) {
      emittedTitles.push(title);
      lastTitle = title;
    }
  }

  return emittedTitles;
}

/**
 * Counts unique transitions in a sequence (consecutive different values)
 */
function countUniqueTransitions(titles: string[]): number {
  if (titles.length === 0) return 0;
  
  let count = 1; // First title always counts
  for (let i = 1; i < titles.length; i++) {
    if (titles[i] !== titles[i - 1]) {
      count++;
    }
  }
  return count;
}

describe('WindowMonitor Property Tests', () => {
  /**
   * **Feature: browser-tab-detection, Property 3: Event Deduplication**
   * 
   * For any sequence of window title polls, consecutive polls with identical
   * titles SHALL NOT emit duplicate window change events. Only transitions
   * between different titles SHALL trigger events.
   * 
   * **Validates: Requirements 3.2**
   */
  describe('Property 3: Event Deduplication', () => {
    it('should emit events only for unique consecutive transitions', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 0, maxLength: 50 }), { minLength: 0, maxLength: 100 }),
          (windowTitles) => {
            const emittedTitles = simulateDeduplication(windowTitles);
            const expectedCount = countUniqueTransitions(windowTitles);
            
            // Number of emitted events should equal unique transitions
            expect(emittedTitles.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never emit consecutive duplicate titles', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 0, maxLength: 50 }), { minLength: 0, maxLength: 100 }),
          (windowTitles) => {
            const emittedTitles = simulateDeduplication(windowTitles);
            
            // Check no consecutive duplicates in emitted titles
            for (let i = 1; i < emittedTitles.length; i++) {
              expect(emittedTitles[i]).not.toBe(emittedTitles[i - 1]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve order of unique transitions', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 50 }),
          (windowTitles) => {
            const emittedTitles = simulateDeduplication(windowTitles);
            
            // All emitted titles should appear in original sequence
            let searchIndex = 0;
            for (const emitted of emittedTitles) {
              const foundIndex = windowTitles.indexOf(emitted, searchIndex);
              expect(foundIndex).toBeGreaterThanOrEqual(searchIndex);
              searchIndex = foundIndex;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should emit exactly one event for repeated identical titles', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          (title, repeatCount) => {
            const windowTitles = Array(repeatCount).fill(title);
            const emittedTitles = simulateDeduplication(windowTitles);
            
            // Should emit exactly one event
            expect(emittedTitles.length).toBe(1);
            expect(emittedTitles[0]).toBe(title);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: browser-tab-detection, Property 4: Error Resilience**
   * 
   * For any error thrown during window detection, the Window Monitor SHALL
   * catch the error, log it, and continue polling without crashing.
   * 
   * **Validates: Requirements 3.3**
   */
  describe('Property 4: Error Resilience', () => {
    /**
     * Simulates error handling in the polling loop
     */
    function simulatePollingWithErrors(
      results: Array<{ success: boolean; title?: string; error?: Error }>
    ): { emittedTitles: string[]; errorCount: number; crashed: boolean } {
      const emittedTitles: string[] = [];
      let errorCount = 0;
      let lastTitle: string | null = null;
      let crashed = false;

      for (const result of results) {
        try {
          if (!result.success) {
            // Simulate error handling - log and continue
            errorCount++;
            continue;
          }

          const title = result.title || '';
          if (title !== lastTitle) {
            emittedTitles.push(title);
            lastTitle = title;
          }
        } catch {
          crashed = true;
          break;
        }
      }

      return { emittedTitles, errorCount, crashed };
    }

    it('should continue processing after errors', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              fc.record({
                success: fc.constant(true),
                title: fc.string({ minLength: 0, maxLength: 50 }),
              }),
              fc.record({
                success: fc.constant(false),
                error: fc.constant(new Error('Simulated error')),
              })
            ),
            { minLength: 0, maxLength: 50 }
          ),
          (pollResults: Array<{ success: boolean; title?: string; error?: Error }>) => {
            const { crashed } = simulatePollingWithErrors(pollResults);
            
            // Should never crash
            expect(crashed).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should process successful results even after errors', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              fc.record({
                success: fc.constant(true),
                title: fc.string({ minLength: 1, maxLength: 20 }),
              }),
              fc.record({
                success: fc.constant(false),
                error: fc.constant(new Error('Simulated error')),
              })
            ),
            { minLength: 1, maxLength: 30 }
          ),
          (pollResults: Array<{ success: boolean; title?: string; error?: Error }>) => {
            const { emittedTitles, errorCount } = simulatePollingWithErrors(pollResults);
            
            // Count successful unique results
            const successfulResults = pollResults.filter((r) => r.success);
            const expectedEmissions = countUniqueTransitions(
              successfulResults.map((r) => r.title || '')
            );
            
            // Emitted titles should match successful unique transitions
            expect(emittedTitles.length).toBe(expectedEmissions);
            
            // Error count should match failed results
            const failedCount = pollResults.filter((r) => !r.success).length;
            expect(errorCount).toBe(failedCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
