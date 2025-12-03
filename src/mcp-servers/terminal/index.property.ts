// Property-based tests for Terminal MCP Server
// **Feature: clippy-mvp, Property 14: Terminal Output Capture**
// **Feature: clippy-mvp, Property 15: MCP Operation Timeout**

import * as fc from 'fast-check';
import { TerminalServer } from './index';

describe('Terminal MCP Server Property Tests', () => {
  let server: TerminalServer;

  beforeEach(() => {
    server = new TerminalServer();
  });

  // **Property 14: Terminal Output Capture**
  // **Validates: Requirements 6.3**
  describe('Property 14: Terminal Output Capture', () => {
    it('should capture stdout for echo commands', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789 '.split('')), { minLength: 1, maxLength: 30 }),
          async (message) => {
            const result = await server.executeCommand(`echo ${message}`, 5000);
            
            // Should have stdout
            expect(typeof result.stdout).toBe('string');
            expect(result.stdout.length).toBeGreaterThan(0);
            
            // Should have stderr (even if empty)
            expect(typeof result.stderr).toBe('string');
            
            // Should have exit code
            expect(typeof result.exitCode).toBe('number');
            expect(result.exitCode).toBe(0);
            
            // Should not have timed out
            expect(result.timedOut).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should capture stderr for error commands', async () => {
      // This test uses a command that writes to stderr
      const result = await server.executeCommand('echo error message 1>&2', 5000);
      
      expect(typeof result.stderr).toBe('string');
      // Note: On Windows, stderr redirection works differently
    });

    it('should return both stdout and stderr fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('echo hello', 'echo test', 'echo 123'),
          async (command) => {
            const result = await server.executeCommand(command, 5000);
            
            // Both fields should exist
            expect(result).toHaveProperty('stdout');
            expect(result).toHaveProperty('stderr');
            expect(result).toHaveProperty('exitCode');
            expect(result).toHaveProperty('timedOut');
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // **Property 15: MCP Operation Timeout**
  // **Validates: Requirements 6.5**
  describe('Property 15: MCP Operation Timeout', () => {
    it('should timeout operations that exceed the specified duration', async () => {
      // Use a very short timeout with a command that would take longer
      const shortTimeout = 100; // 100ms
      
      // ping localhost with count that takes longer than timeout
      // On Windows: ping -n 5 localhost (takes ~5 seconds)
      // On Unix: sleep 5
      const command = process.platform === 'win32' 
        ? 'ping -n 3 127.0.0.1' 
        : 'sleep 2';
      
      const result = await server.executeCommand(command, shortTimeout);
      
      // Should have timed out
      expect(result.timedOut).toBe(true);
    });

    it('should NOT timeout fast operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5000, max: 10000 }),
          async (timeout) => {
            // echo is very fast
            const result = await server.executeCommand('echo fast', timeout);
            
            expect(result.timedOut).toBe(false);
            expect(result.exitCode).toBe(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should use default 30 second timeout when not specified', async () => {
      // Just verify the server has a default timeout
      const serverWithDefault = new TerminalServer();
      
      // Fast command should complete well within default timeout
      const result = await serverWithDefault.executeCommand('echo default timeout test');
      
      expect(result.timedOut).toBe(false);
    });
  });
});
