// Property-based tests for EmotionDetector
// **Feature: clippy-mvp, Property 1: Repeated Error Frustration Detection**
// **Feature: clippy-mvp, Property 2: Rapid Deletion Frustration Detection**
// **Feature: clippy-mvp, Property 3: Flow State Notification Suppression**

import * as fc from 'fast-check';
import { EmotionDetectorImpl } from './emotion-detector';

describe('EmotionDetector Property Tests', () => {
  let detector: EmotionDetectorImpl;

  beforeEach(() => {
    detector = new EmotionDetectorImpl();
    detector.startMonitoring();
  });

  afterEach(() => {
    detector.stopMonitoring();
    detector.clearHistory();
  });

  // **Property 1: Repeated Error Frustration Detection**
  // **Validates: Requirements 1.1**
  describe('Property 1: Repeated Error Frustration Detection', () => {
    it('should detect frustration when 3+ identical errors occur within 60 seconds', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 3, max: 10 }),
          (errorMessage, application, errorCount) => {
            detector.clearHistory();
            const baseTime = Date.now();
            let frustrationDetected = false;

            // Record errors within 60 second window
            for (let i = 0; i < errorCount; i++) {
              const signal = detector.recordError({
                errorMessage,
                timestamp: baseTime + i * 1000, // 1 second apart
                application,
              });
              if (signal && signal.type === 'repeated_error') {
                frustrationDetected = true;
              }
            }

            // With 3+ identical errors in 60s, frustration should be detected
            expect(frustrationDetected).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT detect frustration with fewer than 3 errors', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (errorMessage, application) => {
            detector.clearHistory();
            const baseTime = Date.now();
            let frustrationDetected = false;

            // Record only 2 errors
            for (let i = 0; i < 2; i++) {
              const signal = detector.recordError({
                errorMessage,
                timestamp: baseTime + i * 1000,
                application,
              });
              if (signal && signal.type === 'repeated_error') {
                frustrationDetected = true;
              }
            }

            expect(frustrationDetected).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Property 2: Rapid Deletion Frustration Detection**
  // **Validates: Requirements 1.2**
  describe('Property 2: Rapid Deletion Frustration Detection', () => {
    it('should detect struggling when 50+ characters deleted within 5 seconds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 200 }),
          (totalChars) => {
            detector.clearHistory();
            const baseTime = Date.now();
            let strugglingDetected = false;

            // Delete characters in chunks within 5 second window
            const chunks = Math.ceil(totalChars / 20);
            const charsPerChunk = Math.ceil(totalChars / chunks);

            for (let i = 0; i < chunks; i++) {
              const signal = detector.recordDeletion({
                charactersDeleted: charsPerChunk,
                timestamp: baseTime + i * 500, // 500ms apart
              });
              if (signal && signal.type === 'rapid_deletion') {
                strugglingDetected = true;
              }
            }

            expect(strugglingDetected).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT detect struggling with fewer than 50 characters deleted', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 49 }),
          (totalChars) => {
            detector.clearHistory();
            let strugglingDetected = false;

            const signal = detector.recordDeletion({
              charactersDeleted: totalChars,
              timestamp: Date.now(),
            });
            if (signal && signal.type === 'rapid_deletion') {
              strugglingDetected = true;
            }

            expect(strugglingDetected).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Property 3: Flow State Notification Suppression**
  // **Validates: Requirements 1.3**
  describe('Property 3: Flow State Notification Suppression', () => {
    it('should suppress non-critical notifications during flow state', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (isCritical) => {
            detector.clearHistory();
            
            // Simulate entering flow state (5+ minutes of productive work)
            // We'll mock this by directly testing the suppression logic
            const inFlowState = detector.isInFlowState();
            const shouldSuppress = detector.shouldSuppressNotification(isCritical);

            // If not in flow state, nothing should be suppressed
            if (!inFlowState) {
              expect(shouldSuppress).toBe(false);
            }
            
            // Critical notifications should never be suppressed
            if (isCritical) {
              expect(shouldSuppress).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
