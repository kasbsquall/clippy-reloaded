// Shared generators for property-based tests
// Used across all property tests with fast-check

import * as fc from 'fast-check';
import { FrustrationSignal } from '../core/emotion-detector';
import { TaskCategory } from '../core/context-engine';
import { ActionType } from '../core/action-executor';
import { v4 as uuidv4 } from 'uuid';

// Task categories
const taskCategories: TaskCategory[] = [
  'writing_email',
  'debugging_code',
  'file_management',
  'web_browsing',
  'document_editing',
  'unknown',
];

// Action types
const actionTypes: ActionType[] = [
  'file_read',
  'file_write',
  'terminal_execute',
  'browser_open',
  'generate_text',
];

// Frustration signal types
const frustrationTypes: FrustrationSignal['type'][] = [
  'repeated_error',
  'rapid_deletion',
  'idle_after_error',
  'rage_click',
];

// Generator for FrustrationSignal
export const frustrationSignalArb = fc.record({
  type: fc.constantFrom(...frustrationTypes),
  timestamp: fc.integer({ min: 0, max: Date.now() + 1000000 }),
  applicationContext: fc.string({ minLength: 1, maxLength: 100 }),
  severity: fc.float({ min: 0, max: 1, noNaN: true }),
});

// Generator for TaskContext
export const taskContextArb = fc.record({
  id: fc.constant(uuidv4()),
  timestamp: fc.integer({ min: 0, max: Date.now() + 1000000 }),
  activeApplication: fc.string({ minLength: 1, maxLength: 50 }),
  windowTitle: fc.string({ minLength: 1, maxLength: 100 }),
  visibleContent: fc.string({ minLength: 0, maxLength: 500 }),
  inferredIntent: fc.constantFrom(...taskCategories),
  confidence: fc.float({ min: 0, max: 1, noNaN: true }),
});

// Generator for ActionRequest
export const actionRequestArb = fc.record({
  id: fc.constant(uuidv4()),
  type: fc.constantFrom(...actionTypes),
  parameters: fc.dictionary(fc.string(), fc.jsonValue()),
  contextId: fc.constant(uuidv4()),
});

// Generator for ActionResult
export const actionResultArb = fc.record({
  success: fc.boolean(),
  actionId: fc.constant(uuidv4()),
  output: fc.option(fc.jsonValue(), { nil: undefined }),
  error: fc.option(fc.string(), { nil: undefined }),
  rollbackAvailable: fc.boolean(),
});

// Generator for overlay position
export const overlayPositionArb = fc.record({
  x: fc.integer({ min: 0, max: 3840 }),
  y: fc.integer({ min: 0, max: 2160 }),
});

// Generator for error events (for repeated error detection)
export const errorEventArb = fc.record({
  errorMessage: fc.string({ minLength: 1, maxLength: 200 }),
  timestamp: fc.integer({ min: 0, max: Date.now() + 1000000 }),
  application: fc.string({ minLength: 1, maxLength: 50 }),
});

// Generator for deletion events (for rapid deletion detection)
export const deletionEventArb = fc.record({
  charactersDeleted: fc.integer({ min: 1, max: 500 }),
  timestamp: fc.integer({ min: 0, max: Date.now() + 1000000 }),
});

// Generator for file paths
export const filePathArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_./'.split('')),
  { minLength: 1, maxLength: 100 }
).filter(s => !s.startsWith('/') && !s.includes('..'));

// Generator for file content
export const fileContentArb = fc.string({ minLength: 0, maxLength: 10000 });

// Generator for terminal commands
export const terminalCommandArb = fc.constantFrom(
  'echo hello',
  'ls -la',
  'pwd',
  'date',
  'whoami'
);

// Generator for URLs
export const urlArb = fc.webUrl();

// Helper to generate timestamps within a window
export const timestampInWindowArb = (windowMs: number): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: windowMs });
