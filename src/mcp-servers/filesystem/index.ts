// Filesystem MCP Server
// Requirements: 6.1, 6.2

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface FileReadResult {
  content: string;
  encoding: string;
  path: string;
}

export interface FileWriteResult {
  success: boolean;
  backupPath: string | null;
  path: string;
}

const BACKUP_DIR = '.clippy-backups';

export class FilesystemServer {
  private backupDir: string;

  constructor(backupDir?: string) {
    this.backupDir = backupDir || BACKUP_DIR;
  }

  // Read file with encoding detection (Requirement 6.1)
  async readFile(filePath: string): Promise<FileReadResult> {
    const absolutePath = path.resolve(filePath);
    
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    const buffer = fs.readFileSync(absolutePath);
    const encoding = this.detectEncoding(buffer);
    const content = buffer.toString(encoding as BufferEncoding);

    return {
      content,
      encoding,
      path: absolutePath,
    };
  }

  // Write file with automatic backup (Requirement 6.2)
  async writeFile(filePath: string, content: string): Promise<FileWriteResult> {
    const absolutePath = path.resolve(filePath);
    let backupPath: string | null = null;

    // Create backup if file exists
    if (fs.existsSync(absolutePath)) {
      backupPath = await this.createBackup(absolutePath);
    }

    // Ensure directory exists
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(absolutePath, content, 'utf-8');

    return {
      success: true,
      backupPath,
      path: absolutePath,
    };
  }

  // List directory contents
  async listDirectory(dirPath: string): Promise<string[]> {
    const absolutePath = path.resolve(dirPath);
    
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Directory not found: ${absolutePath}`);
    }

    const stats = fs.statSync(absolutePath);
    if (!stats.isDirectory()) {
      throw new Error(`Not a directory: ${absolutePath}`);
    }

    return fs.readdirSync(absolutePath);
  }

  // Restore from backup
  async restoreFromBackup(backupPath: string, originalPath: string): Promise<boolean> {
    if (!fs.existsSync(backupPath)) {
      return false;
    }

    const content = fs.readFileSync(backupPath);
    fs.writeFileSync(originalPath, content);
    return true;
  }

  // Create backup of file
  private async createBackup(filePath: string): Promise<string> {
    const dir = path.dirname(filePath);
    const backupDir = path.join(dir, this.backupDir);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const fileName = path.basename(filePath);
    const timestamp = Date.now();
    const backupName = `${fileName}.${timestamp}.${uuidv4().slice(0, 8)}.bak`;
    const backupPath = path.join(backupDir, backupName);

    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  }

  // Detect file encoding
  private detectEncoding(buffer: Buffer): string {
    // Check for BOM markers
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return 'utf-8';
    }
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
      return 'utf-16le';
    }
    if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
      return 'utf-16be';
    }
    // Default to UTF-8
    return 'utf-8';
  }
}
