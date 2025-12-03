// Database - SQLite storage layer
// Requirements: 7.1, 7.2, 7.3, 7.4

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { app } from 'electron';

export interface StoredFrustrationSignal {
  id: string;
  type: string;
  timestamp: number;
  applicationContext: string;
  severity: number;
  createdAt: number;
}

export interface StoredContextSnapshot {
  id: string;
  timestamp: number;
  activeApplication: string;
  windowTitle: string;
  visibleContent: string;
  inferredIntent: string;
  confidence: number;
  createdAt: number;
}

export interface StoredActionHistory {
  id: string;
  contextId: string;
  actionType: string;
  parameters: string;
  resultSuccess: boolean;
  resultOutput: string;
  rollbackData: string;
  executedAt: number;
}

export interface UserPreference {
  key: string;
  value: string;
  updatedAt: number;
}

const SCHEMA = `
-- Frustration signals log
CREATE TABLE IF NOT EXISTS frustration_signals (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  application_context TEXT,
  severity REAL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- Context snapshots
CREATE TABLE IF NOT EXISTS context_snapshots (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  active_application TEXT,
  window_title TEXT,
  visible_content TEXT,
  inferred_intent TEXT,
  confidence REAL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- Action history
CREATE TABLE IF NOT EXISTS action_history (
  id TEXT PRIMARY KEY,
  context_id TEXT REFERENCES context_snapshots(id),
  action_type TEXT NOT NULL,
  parameters TEXT,
  result_success INTEGER,
  result_output TEXT,
  rollback_data TEXT,
  executed_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_frustration_timestamp ON frustration_signals(timestamp);
CREATE INDEX IF NOT EXISTS idx_context_timestamp ON context_snapshots(timestamp);
CREATE INDEX IF NOT EXISTS idx_context_intent ON context_snapshots(inferred_intent);
CREATE INDEX IF NOT EXISTS idx_action_context ON action_history(context_id);
`;

export class ClippyDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const defaultPath = dbPath || this.getDefaultDbPath();
    this.db = new Database(defaultPath);
    this.db.pragma('journal_mode = WAL');
  }

  private getDefaultDbPath(): string {
    try {
      return path.join(app.getPath('userData'), 'clippy.sqlite');
    } catch {
      return './clippy.sqlite';
    }
  }

  initialize(): void {
    this.db.exec(SCHEMA);
  }

  close(): void {
    this.db.close();
  }

  // Frustration Signals
  saveFrustrationSignal(signal: Omit<StoredFrustrationSignal, 'id' | 'createdAt'>): StoredFrustrationSignal {
    const id = uuidv4();
    const createdAt = Date.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO frustration_signals (id, type, timestamp, application_context, severity, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, signal.type, signal.timestamp, signal.applicationContext, signal.severity, createdAt);
    
    return { id, ...signal, createdAt };
  }

  getFrustrationSignalById(id: string): StoredFrustrationSignal | null {
    const stmt = this.db.prepare(`
      SELECT id, type, timestamp, application_context as applicationContext, severity, created_at as createdAt
      FROM frustration_signals WHERE id = ?
    `);
    return stmt.get(id) as StoredFrustrationSignal | null;
  }

  // Context Snapshots
  saveContextSnapshot(context: Omit<StoredContextSnapshot, 'id' | 'createdAt'>): StoredContextSnapshot {
    const id = uuidv4();
    const createdAt = Date.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO context_snapshots (id, timestamp, active_application, window_title, visible_content, inferred_intent, confidence, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, context.timestamp, context.activeApplication, context.windowTitle, 
             context.visibleContent, context.inferredIntent, context.confidence, createdAt);
    
    return { id, ...context, createdAt };
  }

  getContextSnapshotById(id: string): StoredContextSnapshot | null {
    const stmt = this.db.prepare(`
      SELECT id, timestamp, active_application as activeApplication, window_title as windowTitle,
             visible_content as visibleContent, inferred_intent as inferredIntent, confidence, created_at as createdAt
      FROM context_snapshots WHERE id = ?
    `);
    return stmt.get(id) as StoredContextSnapshot | null;
  }

  getContextSnapshotsByIntent(intent: string, hoursBack: number): StoredContextSnapshot[] {
    const cutoff = Date.now() - (hoursBack * 60 * 60 * 1000);
    const stmt = this.db.prepare(`
      SELECT id, timestamp, active_application as activeApplication, window_title as windowTitle,
             visible_content as visibleContent, inferred_intent as inferredIntent, confidence, created_at as createdAt
      FROM context_snapshots 
      WHERE inferred_intent = ? AND timestamp >= ?
      ORDER BY timestamp DESC
    `);
    return stmt.all(intent, cutoff) as StoredContextSnapshot[];
  }

  // Action History
  saveActionHistory(action: Omit<StoredActionHistory, 'id' | 'executedAt'>): StoredActionHistory {
    const id = uuidv4();
    const executedAt = Date.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO action_history (id, context_id, action_type, parameters, result_success, result_output, rollback_data, executed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, action.contextId, action.actionType, action.parameters, 
             action.resultSuccess ? 1 : 0, action.resultOutput, action.rollbackData, executedAt);
    
    return { id, ...action, executedAt };
  }

  getActionHistoryById(id: string): StoredActionHistory | null {
    const stmt = this.db.prepare(`
      SELECT id, context_id as contextId, action_type as actionType, parameters,
             result_success as resultSuccess, result_output as resultOutput, rollback_data as rollbackData, executed_at as executedAt
      FROM action_history WHERE id = ?
    `);
    const result = stmt.get(id) as (Omit<StoredActionHistory, 'resultSuccess'> & { resultSuccess: number }) | null;
    if (result) {
      return { ...result, resultSuccess: result.resultSuccess === 1 };
    }
    return null;
  }

  // User Preferences
  setPreference(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_preferences (key, value, updated_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(key, value, Date.now());
  }

  getPreference(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM user_preferences WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value ?? null;
  }

  // Data deletion (Requirements 7.4)
  deleteAllData(): void {
    this.db.exec(`
      DELETE FROM frustration_signals;
      DELETE FROM context_snapshots;
      DELETE FROM action_history;
      DELETE FROM user_preferences;
    `);
  }

  // Count records for verification
  countAllRecords(): number {
    const counts = [
      this.db.prepare('SELECT COUNT(*) as c FROM frustration_signals').get() as { c: number },
      this.db.prepare('SELECT COUNT(*) as c FROM context_snapshots').get() as { c: number },
      this.db.prepare('SELECT COUNT(*) as c FROM action_history').get() as { c: number },
      this.db.prepare('SELECT COUNT(*) as c FROM user_preferences').get() as { c: number },
    ];
    return counts.reduce((sum, r) => sum + r.c, 0);
  }
}
