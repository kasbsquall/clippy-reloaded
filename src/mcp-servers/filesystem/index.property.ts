// Property-based tests for Filesystem MCP Server
// **Feature: clippy-mvp, Property 12: File Read Integrity**
// **Feature: clippy-mvp, Property 13: File Write Backup Creation**

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { FilesystemServer } from './index';

const TEST_DIR = './test-fs-temp';

describe('Filesystem MCP Server Property Tests', () => {
  let server: FilesystemServer;

  beforeAll(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  beforeEach(() => {
    server = new FilesystemServer();
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  // **Property 12: File Read Integrity**
  // **Validates: Requirements 6.1**
  describe('Property 12: File Read Integrity', () => {
    it('should return exact file content when reading', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 0, maxLength: 1000 }),
          fc.integer({ min: 1, max: 100 }),
          async (content, fileNum) => {
            const filePath = path.join(TEST_DIR, `test-read-${fileNum}.txt`);
            
            // Write file directly
            fs.writeFileSync(filePath, content, 'utf-8');
            
            // Read via server
            const result = await server.readFile(filePath);
            
            // Content should match exactly
            expect(result.content).toBe(content);
            expect(result.path).toBe(path.resolve(filePath));
            expect(result.encoding).toBe('utf-8');
            
            // Cleanup
            fs.unlinkSync(filePath);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should throw error for non-existent files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (randomId) => {
            const filePath = path.join(TEST_DIR, `nonexistent-${randomId}.txt`);
            
            await expect(server.readFile(filePath)).rejects.toThrow('File not found');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // **Property 13: File Write Backup Creation**
  // **Validates: Requirements 6.2**
  describe('Property 13: File Write Backup Creation', () => {
    it('should create backup before overwriting existing file', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.integer({ min: 1, max: 100 }),
          async (originalContent, newContent, fileNum) => {
            const filePath = path.join(TEST_DIR, `test-backup-${fileNum}.txt`);
            
            // Create original file
            fs.writeFileSync(filePath, originalContent, 'utf-8');
            
            // Write new content via server
            const result = await server.writeFile(filePath, newContent);
            
            // Should succeed
            expect(result.success).toBe(true);
            
            // Backup should exist
            expect(result.backupPath).not.toBeNull();
            expect(fs.existsSync(result.backupPath!)).toBe(true);
            
            // Backup should contain original content
            const backupContent = fs.readFileSync(result.backupPath!, 'utf-8');
            expect(backupContent).toBe(originalContent);
            
            // New file should have new content
            const currentContent = fs.readFileSync(filePath, 'utf-8');
            expect(currentContent).toBe(newContent);
            
            // Cleanup
            fs.unlinkSync(filePath);
            fs.unlinkSync(result.backupPath!);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should not create backup for new files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.uuid(),
          async (content, fileId) => {
            const filePath = path.join(TEST_DIR, `test-new-${fileId}.txt`);
            
            // Ensure file doesn't exist
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
            
            // Write new file
            const result = await server.writeFile(filePath, content);
            
            // Should succeed without backup
            expect(result.success).toBe(true);
            expect(result.backupPath).toBeNull();
            
            // File should exist with correct content
            expect(fs.existsSync(filePath)).toBe(true);
            expect(fs.readFileSync(filePath, 'utf-8')).toBe(content);
            
            // Cleanup
            fs.unlinkSync(filePath);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
