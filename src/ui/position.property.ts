// Property-based tests for Position Persistence
// **Feature: clippy-mvp, Property 11: Position Persistence Round-Trip**

import * as fc from 'fast-check';
import * as fs from 'fs';
import { ClippyDatabase } from '../core/database';

const TEST_DB_PATH = './test-position.sqlite';
const POSITION_KEY = 'clippy_position';

interface OverlayPosition {
  x: number;
  y: number;
}

describe('Position Persistence Property Tests', () => {
  let db: ClippyDatabase;

  beforeEach(() => {
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

  // **Property 11: Position Persistence Round-Trip**
  // **Validates: Requirements 5.3**
  describe('Property 11: Position Persistence Round-Trip', () => {
    it('should return identical position when saving and retrieving', () => {
      fc.assert(
        fc.property(
          fc.record({
            x: fc.integer({ min: 0, max: 3840 }),
            y: fc.integer({ min: 0, max: 2160 }),
          }),
          (position: OverlayPosition) => {
            // Save position
            db.setPreference(POSITION_KEY, JSON.stringify(position));
            
            // Retrieve position
            const savedStr = db.getPreference(POSITION_KEY);
            expect(savedStr).not.toBeNull();
            
            const retrieved = JSON.parse(savedStr!) as OverlayPosition;
            
            // Should be identical
            expect(retrieved.x).toBe(position.x);
            expect(retrieved.y).toBe(position.y);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle position updates correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              x: fc.integer({ min: 0, max: 3840 }),
              y: fc.integer({ min: 0, max: 2160 }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (positions: OverlayPosition[]) => {
            // Save multiple positions (simulating user moving Clippy)
            for (const pos of positions) {
              db.setPreference(POSITION_KEY, JSON.stringify(pos));
            }
            
            // Final position should be the last one
            const savedStr = db.getPreference(POSITION_KEY);
            const retrieved = JSON.parse(savedStr!) as OverlayPosition;
            const lastPosition = positions[positions.length - 1];
            
            expect(retrieved.x).toBe(lastPosition.x);
            expect(retrieved.y).toBe(lastPosition.y);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case positions (screen boundaries)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { x: 0, y: 0 },
            { x: 3840, y: 2160 },
            { x: 0, y: 2160 },
            { x: 3840, y: 0 },
            { x: 1920, y: 1080 }
          ),
          (position: OverlayPosition) => {
            db.setPreference(POSITION_KEY, JSON.stringify(position));
            
            const savedStr = db.getPreference(POSITION_KEY);
            const retrieved = JSON.parse(savedStr!) as OverlayPosition;
            
            expect(retrieved.x).toBe(position.x);
            expect(retrieved.y).toBe(position.y);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
