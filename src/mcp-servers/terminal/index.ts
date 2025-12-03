// Terminal MCP Server
// Requirements: 6.3, 6.5

import { exec, ExecOptions } from 'child_process';

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds (Requirement 6.5)

export class TerminalServer {
  private defaultTimeout: number;

  constructor(defaultTimeout?: number) {
    this.defaultTimeout = defaultTimeout || DEFAULT_TIMEOUT_MS;
  }

  // Execute command with stdout/stderr capture (Requirement 6.3)
  async executeCommand(command: string, timeout?: number): Promise<CommandResult> {
    const timeoutMs = timeout || this.defaultTimeout;

    return new Promise((resolve) => {
      const options: ExecOptions = {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        windowsHide: true,
      };

      const child = exec(command, options, (error, stdout, stderr) => {
        const timedOut = error?.killed === true && error?.signal === 'SIGTERM';
        
        resolve({
          stdout: String(stdout || ''),
          stderr: String(stderr || ''),
          exitCode: error ? (error.code || 1) : 0,
          timedOut,
        });
      });

      // Handle timeout (Requirement 6.5)
      setTimeout(() => {
        if (child.exitCode === null) {
          child.kill('SIGTERM');
        }
      }, timeoutMs);
    });
  }

  // Execute command with streaming output
  async executeWithStream(
    command: string,
    onStdout: (data: string) => void,
    onStderr: (data: string) => void,
    timeout?: number
  ): Promise<CommandResult> {
    const timeoutMs = timeout || this.defaultTimeout;

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const child = exec(command, {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
      });

      child.stdout?.on('data', (data: string) => {
        stdout += data;
        onStdout(data);
      });

      child.stderr?.on('data', (data: string) => {
        stderr += data;
        onStderr(data);
      });

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
      }, timeoutMs);

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
          timedOut,
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: stderr + err.message,
          exitCode: 1,
          timedOut,
        });
      });
    });
  }
}
