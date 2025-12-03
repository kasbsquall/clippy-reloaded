// Property-based tests for Database
// **Feature: clippy-mvp, Property 4: Frustration Signal Persistence Round-Trip**
// **Feature: clippy-mvp, Property 16: Interaction History Completeness**
// **Feature: clippy-mvp, Property 17: Data Deletion Completeness**

import * as fc from 'fast-check';
import { ClippyDatabase } from './database';
import * as fs from 'fs';

const TEST_DB_PATH = './test-clippy.sqlite';

describe('Database Property Tests', () => {
  let db: ClippyDatabase;

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    db = new ClippyDatabase(TEST_DB_PATH);
    db.initialize();
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  // **Property 4: Frustration Signal Persistence Round-Trip**
  // **Validates: Requirements 1.5**
  describe('Property 4: Frustration Signal Persistence Round-Trip', () => {
    it('should return identical data when saving and retrieving frustration signals', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constantFrom('repeated_error', 'rapid_deletion', 'idle_after_error', 'rage_click'),
            timestamp: fc.integer({ min: 0, max: Date.now() + 1000000 }),
            applicationContext: fc.string({ minLength: 1, maxLength: 100 }),
            severity: fc.float({ min: 0, max: 1, noNaN: true }),
          }),
          (signal) => {
            const saved = db.saveFrustrationSignal(signal);
            const retrieved = db.getFrustrationSignalById(saved.id);

            expect(retrieved).not.toBeNull();
            expect(retrieved!.type).toBe(signal.type);
            expect(retrieved!.timestamp).toBe(signal.timestamp);
            expect(retrieved!.applicationContext).toBe(signal.applicationContext);
            expect(retrieved!.severity).toBeCloseTo(signal.severity, 5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Property 16: Interaction History Completeness**
  // **Validates: Requirements 7.2**
  describe('Property 16: Interaction History Completeness', () => {
    it('should store all required fields for action history', () => {
      fc.assert(
        fc.property(
          fc.record({
            actionType: fc.constantFrom('file_read', 'file_write', 'terminal_execute', 'browser_open'),
            parameters: fc.json(),
            resultSuccess: fc.boolean(),
            resultOutput: fc.string({ maxLength: 500 }),
            rollbackData: fc.json(),
          }),
          (action) => {
            // First create a context to satisfy foreign key
            const context = db.saveContextSnapshot({
              timestamp: Date.now(),
              activeApplication: 'test-app',
              windowTitle: 'test-window',
              visibleContent: '',
              inferredIntent: 'unknown',
              confidence: 0.5,
            });

            const saved = db.saveActionHistory({
              contextId: context.id,
              actionType: action.actionType,
              parameters: action.parameters,
              resultSuccess: action.resultSuccess,
              resultOutput: action.resultOutput,
              rollbackData: action.rollbackData,
            });

            const retrieved = db.getActionHistoryById(saved.id);

            expect(retrieved).not.toBeNull();
            expect(retrieved!.contextId).toBe(context.id);
            expect(retrieved!.actionType).toBe(action.actionType);
            expect(retrieved!.parameters).toBe(action.parameters);
            expect(retrieved!.resultSuccess).toBe(action.resultSuccess);
            expect(retrieved!.resultOutput).toBe(action.resultOutput);
            expect(retrieved!.executedAt).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Property 17: Data Deletion Completeness**
  // **Validates: Requirements 7.4**
  describe('Property 17: Data Deletion Completeness', () => {
    it('should delete all records when deleteAllData is called', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (count) => {
            // Add some data
            for (let i = 0; i < count; i++) {
              db.saveFrustrationSignal({
                type: 'repeated_error',
                timestamp: Date.now(),
                applicationContext: `app-${i}`,
                severity: 0.5,
              });
              db.saveContextSnapshot({
                timestamp: Date.now(),
                activeApplication: `app-${i}`,
                windowTitle: `title-${i}`,
                visibleContent: '',
                inferredIntent: 'unknown',
                confidence: 0.5,
              });
            }

            // Verify data exists
            expect(db.countAllRecords()).toBeGreaterThan(0);

            // Delete all data
            db.deleteAllData();

            // Verify all data is deleted
            expect(db.countAllRecords()).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
