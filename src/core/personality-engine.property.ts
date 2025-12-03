// Property-based tests for PersonalityEngine
// **Feature: clippy-mvp, Property 10: Easter Egg Trigger Detection**

import * as fc from 'fast-check';
import { PersonalityEngineImpl } from './personality-engine';

describe('PersonalityEngine Property Tests', () => {
  let engine: PersonalityEngineImpl;

  beforeEach(() => {
    engine = new PersonalityEngineImpl();
    engine.resetIntroState();
  });

  // **Property 10: Easter Egg Trigger Detection**
  // **Validates: Requirements 4.2**
  describe('Property 10: Easter Egg Trigger Detection', () => {
    it('should trigger easter egg when input contains both "hate" and "clippy" (case-insensitive)', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 50 }),
          fc.string({ maxLength: 50 }),
          fc.constantFrom('hate', 'HATE', 'Hate', 'hAtE'),
          fc.constantFrom('clippy', 'CLIPPY', 'Clippy', 'cLiPpY'),
          (prefix, suffix, hateWord, clippyWord) => {
            // Construct input with both trigger words
            const input = `${prefix} ${hateWord} ${suffix} ${clippyWord}`;
            
            const result = engine.handleEasterEgg(input);
            
            // Should return a non-null easter egg response
            expect(result).not.toBeNull();
            expect(result!.animation).toBe('apologetic');
            expect(result!.text.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT trigger easter egg when "hate" is missing', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 100 }).filter(s => !s.toLowerCase().includes('hate')),
          (input) => {
            const inputWithClippy = input + ' clippy';
            const result = engine.handleEasterEgg(inputWithClippy);
            
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT trigger easter egg when "clippy" is missing', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 100 }).filter(s => !s.toLowerCase().includes('clippy')),
          (input) => {
            const inputWithHate = input + ' hate';
            const result = engine.handleEasterEgg(inputWithHate);
            
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify easter egg triggers via isEasterEggTrigger', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.boolean(),
          fc.string({ maxLength: 30 }),
          (includeHate, includeClippy, filler) => {
            let input = filler;
            if (includeHate) input += ' hate ';
            if (includeClippy) input += ' clippy ';
            
            const isTrigger = engine.isEasterEggTrigger(input);
            const expectedTrigger = includeHate && includeClippy;
            
            expect(isTrigger).toBe(expectedTrigger);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
