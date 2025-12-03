/**
 * Windows PowerShell Provider
 * 
 * Uses PowerShell to detect the active window on Windows systems
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { PlatformProvider, WindowInfo, PlatformCapabilities } from './types';

const execAsync = promisify(exec);

// PowerShell script to get the foreground window title and process name
// Uses UTF-8 encoding to handle special characters (tildes, emojis, etc.)
const POWERSHELL_SCRIPT = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WindowHelper {
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern IntPtr GetForegroundWindow();
    
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@

$hwnd = [WindowHelper]::GetForegroundWindow()
$title = New-Object System.Text.StringBuilder 512
[WindowHelper]::GetWindowText($hwnd, $title, 512) | Out-Null

$processId = 0
[WindowHelper]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null

$process = Get-Process -Id $processId -ErrorAction SilentlyContinue
$processName = if ($process) { $process.ProcessName } else { "" }

Write-Output "$($title.ToString())|$processName"
`.trim();

// Script file path
const SCRIPT_PATH = join(tmpdir(), 'clippy-window-detect.ps1');

export class WindowsPowerShellProvider implements PlatformProvider {
  private readonly timeout: number;

  constructor(timeout: number = 5000) {
    this.timeout = timeout;
  }

  /**
   * Check if running on Windows
   */
  isSupported(): boolean {
    return process.platform === 'win32';
  }

  /**
   * Get platform name
   */
  getPlatformName(): string {
    return 'Windows (PowerShell)';
  }

  /**
   * Get platform capabilities
   */
  getCapabilities(): PlatformCapabilities {
    return {
      platform: 'win32',
      windowDetection: this.isSupported(),
      processName: true,
    };
  }

  /**
   * Ensure the PowerShell script file exists (always overwrite to get latest version)
   */
  private ensureScriptFile(): void {
    // Always write to ensure we have the latest script with UTF-8 support
    writeFileSync(SCRIPT_PATH, POWERSHELL_SCRIPT, 'utf8');
  }

  /**
   * Get the currently active window using PowerShell
   */
  async getActiveWindow(): Promise<WindowInfo | null> {
    if (!this.isSupported()) {
      return null;
    }

    try {
      // Ensure script file exists
      this.ensureScriptFile();

      const { stdout, stderr } = await execAsync(
        `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${SCRIPT_PATH}"`,
        { timeout: this.timeout, encoding: 'utf8' }
      );

      if (stderr) {
        console.error('[WindowsPowerShellProvider] PowerShell stderr:', stderr);
      }

      const output = stdout.trim();
      console.log('[WindowsPowerShellProvider] Raw output:', output);
      
      if (!output) {
        return null;
      }

      // Parse the output: "Window Title|ProcessName"
      const separatorIndex = output.lastIndexOf('|');
      if (separatorIndex === -1) {
        return {
          title: output,
          processName: '',
          timestamp: Date.now(),
        };
      }

      const title = output.substring(0, separatorIndex);
      const processName = output.substring(separatorIndex + 1);

      return {
        title,
        processName,
        timestamp: Date.now(),
      };
    } catch (error) {
      // Log error but don't throw - return null to indicate failure
      console.error('[WindowsPowerShellProvider] Error getting active window:', error);
      return null;
    }
  }

  /**
   * Clean up the script file
   */
  cleanup(): void {
    try {
      if (existsSync(SCRIPT_PATH)) {
        unlinkSync(SCRIPT_PATH);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Export singleton instance
export const windowsProvider = new WindowsPowerShellProvider();
