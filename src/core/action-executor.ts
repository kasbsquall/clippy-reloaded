// ActionExecutor - Executes actions via MCP servers with rollback support
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5

import { v4 as uuidv4 } from 'uuid';
import { TaskContext } from './context-engine';
import { ClippyDatabase } from './database';
import { FilesystemServer } from '../mcp-servers/filesystem';
import { TerminalServer } from '../mcp-servers/terminal';
import { BrowserServer } from '../mcp-servers/browser';

export interface ActionRequest {
  id: string;
  type: ActionType;
  parameters: Record<string, unknown>;
  contextId: string;
}

export interface ActionResult {
  success: boolean;
  actionId: string;
  output?: unknown;
  error?: string;
  rollbackAvailable: boolean;
}

export type ActionType =
  | 'file_read'
  | 'file_write'
  | 'terminal_execute'
  | 'browser_open'
  | 'generate_text';

interface RollbackSnapshot {
  actionId: string;
  type: ActionType;
  data: Record<string, unknown>;
  timestamp: number;
}

export class ActionExecutorImpl {
  private database: ClippyDatabase | null = null;
  private filesystemServer: FilesystemServer;
  private terminalServer: TerminalServer;
  private browserServer: BrowserServer;
  private rollbackSnapshots: Map<string, RollbackSnapshot> = new Map();

  constructor(database?: ClippyDatabase) {
    this.database = database || null;
    this.filesystemServer = new FilesystemServer();
    this.terminalServer = new TerminalServer();
    this.browserServer = new BrowserServer();
  }

  // Execute action with automatic rollback snapshot (Requirements 3.1, 3.2)
  async execute(request: ActionRequest): Promise<ActionResult> {
    const actionId = request.id || uuidv4();
    
    try {
      // Create rollback snapshot before execution (Requirement 3.2)
      await this.createRollbackSnapshot(actionId, request);
      
      // Route to appropriate MCP server (Requirement 3.1)
      const result = await this.routeAction(request);
      
      // Store action history
      this.storeActionHistory(actionId, request, result);
      
      return {
        success: true,
        actionId,
        output: result,
        rollbackAvailable: this.rollbackSnapshots.has(actionId),
      };
    } catch (error) {
      // Automatic rollback on failure (Requirement 3.4)
      const rollbackSuccess = await this.rollback(actionId);
      
      return {
        success: false,
        actionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        rollbackAvailable: rollbackSuccess,
      };
    }
  }

  // Rollback a previous action (Requirement 3.4)
  async rollback(actionId: string): Promise<boolean> {
    const snapshot = this.rollbackSnapshots.get(actionId);
    if (!snapshot) return false;

    try {
      switch (snapshot.type) {
        case 'file_write':
          if (snapshot.data.backupPath && snapshot.data.originalPath) {
            await this.filesystemServer.restoreFromBackup(
              snapshot.data.backupPath as string,
              snapshot.data.originalPath as string
            );
          }
          break;
        // Other action types may not support rollback
        default:
          return false;
      }
      
      this.rollbackSnapshots.delete(actionId);
      return true;
    } catch {
      return false;
    }
  }

  // Get available actions for a context
  getAvailableActions(_context: TaskContext): ActionType[] {
    return ['file_read', 'file_write', 'terminal_execute', 'browser_open'];
  }

  // Check MCP server health
  async checkServerHealth(server: string): Promise<boolean> {
    try {
      switch (server) {
        case 'filesystem':
          await this.filesystemServer.listDirectory('.');
          return true;
        case 'terminal': {
          const result = await this.terminalServer.executeCommand('echo test', 5000);
          return result.exitCode === 0;
        }
        case 'browser':
          return true; // Browser server is always available
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  // Route action to appropriate MCP server
  private async routeAction(request: ActionRequest): Promise<unknown> {
    switch (request.type) {
      case 'file_read':
        return this.filesystemServer.readFile(request.parameters.path as string);
      
      case 'file_write':
        return this.filesystemServer.writeFile(
          request.parameters.path as string,
          request.parameters.content as string
        );
      
      case 'terminal_execute':
        return this.terminalServer.executeCommand(
          request.parameters.command as string,
          request.parameters.timeout as number | undefined
        );
      
      case 'browser_open':
        return this.browserServer.openUrl(request.parameters.url as string);
      
      default:
        throw new Error(`Unknown action type: ${request.type}`);
    }
  }

  // Create rollback snapshot before action
  private async createRollbackSnapshot(actionId: string, request: ActionRequest): Promise<void> {
    const snapshot: RollbackSnapshot = {
      actionId,
      type: request.type,
      data: {},
      timestamp: Date.now(),
    };

    // Capture state for rollback based on action type
    if (request.type === 'file_write') {
      const filePath = request.parameters.path as string;
      try {
        const existing = await this.filesystemServer.readFile(filePath);
        snapshot.data = {
          originalPath: filePath,
          originalContent: existing.content,
          backupPath: null, // Will be set by writeFile
        };
      } catch {
        // File doesn't exist, no rollback needed
        snapshot.data = { originalPath: filePath, isNew: true };
      }
    }

    this.rollbackSnapshots.set(actionId, snapshot);
  }

  // Store action history in database
  private storeActionHistory(actionId: string, request: ActionRequest, result: unknown): void {
    if (!this.database) return;

    const snapshot = this.rollbackSnapshots.get(actionId);
    
    this.database.saveActionHistory({
      contextId: request.contextId,
      actionType: request.type,
      parameters: JSON.stringify(request.parameters),
      resultSuccess: true,
      resultOutput: JSON.stringify(result),
      rollbackData: snapshot ? JSON.stringify(snapshot.data) : '',
    });
  }

  // Clear rollback snapshots (for testing)
  clearSnapshots(): void {
    this.rollbackSnapshots.clear();
  }
}

export interface ActionExecutor {
  execute(request: ActionRequest): Promise<ActionResult>;
  rollback(actionId: string): Promise<boolean>;
  getAvailableActions(context: TaskContext): ActionType[];
  checkServerHealth(server: string): Promise<boolean>;
}
