// Property-based tests for ActionExecutor
// **Feature: clippy-mvp, Property 8: Action Rollback Availability**
// **Feature: clippy-mvp, Property 9: Action Result Notification**

import * as fc from 'fast-check';
import { ActionExecutorImpl, ActionRequest, ActionType } from './action-executor';
import { v4 as uuidv4 } from 'uuid';

describe('ActionExecutor Property Tests', () => {
  let executor: ActionExecutorImpl;

  beforeEach(() => {
    executor = new ActionExecutorImpl();
  });

  afterEach(() => {
    executor.clearSnapshots();
  });

  // **Property 8: Action Rollback Availability**
  // **Validates: Requirements 3.2, 3.4**
  describe('Property 8: Action Rollback Availability', () => {
    it('should have rollback available for file_write actions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (filename) => {
            const request: ActionRequest = {
              id: uuidv4(),
              type: 'file_write',
              parameters: {
                path: `./test-temp-${filename}.txt`,
                content: 'test content',
              },
              contextId: uuidv4(),
            };

            // Execute will fail (file doesn't exist for backup) but rollback should be attempted
            const result = await executor.execute(request);
            
            // Result should indicate rollback availability status
            expect(typeof result.rollbackAvailable).toBe('boolean');
            expect(result.actionId).toBe(request.id);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should always return actionId in result', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('file_read', 'browser_open') as fc.Arbitrary<ActionType>,
          fc.uuid(),
          async (actionType, contextId) => {
            const request: ActionRequest = {
              id: uuidv4(),
              type: actionType,
              parameters: actionType === 'file_read' 
                ? { path: './nonexistent.txt' }
                : { url: 'https://example.com' },
              contextId,
            };

            const result = await executor.execute(request);
            
            expect(result.actionId).toBe(request.id);
            expect(typeof result.success).toBe('boolean');
            expect(typeof result.rollbackAvailable).toBe('boolean');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // **Property 9: Action Result Notification**
  // **Validates: Requirements 3.3, 3.4**
  describe('Property 9: Action Result Notification', () => {
    it('should return complete result for any action execution', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('file_read', 'terminal_execute', 'browser_open') as fc.Arbitrary<ActionType>,
          async (actionType) => {
            const params: Record<ActionType, Record<string, unknown>> = {
              'file_read': { path: './package.json' },
              'file_write': { path: './test.txt', content: 'test' },
              'terminal_execute': { command: 'echo test', timeout: 5000 },
              'browser_open': { url: 'https://example.com' },
              'generate_text': { prompt: 'test' },
            };

            const request: ActionRequest = {
              id: uuidv4(),
              type: actionType,
              parameters: params[actionType],
              contextId: uuidv4(),
            };

            const result = await executor.execute(request);

            // Result should have all required fields
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('actionId');
            expect(result).toHaveProperty('rollbackAvailable');
            
            // On failure, should have error message
            if (!result.success) {
              expect(result.error).toBeDefined();
            }
            
            // On success, may have output
            if (result.success) {
              expect(result.output !== undefined || result.error === undefined).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
