// ContextEngine - Captures and analyzes user context
// Requirements: 2.1, 2.2, 2.3, 2.4

import { v4 as uuidv4 } from 'uuid';
import { ClippyDatabase } from './database';
import { BrowserContext } from './window-monitor';
import { BrowserType } from './title-parser';

export interface TaskContext {
  id: string;
  timestamp: number;
  activeApplication: string;
  windowTitle: string;
  visibleContent: string;
  inferredIntent: TaskCategory;
  confidence: number;
  browserContext?: BrowserContextInfo;
}

export interface BrowserContextInfo {
  pageTitle: string;
  browserType: BrowserType;
  applicationName: string;
  processName: string;
  timestamp: number;
}

export type TaskCategory =
  | 'writing_email'
  | 'debugging_code'
  | 'file_management'
  | 'web_browsing'
  | 'document_editing'
  | 'unknown';

const INTENT_PATTERNS: Record<TaskCategory, RegExp[]> = {
  writing_email: [/outlook|gmail|mail/i, /compose|reply/i],
  debugging_code: [/debug|error|exception/i, /vscode|intellij/i],
  file_management: [/explorer|finder|files/i, /copy|move|delete/i],
  web_browsing: [/chrome|firefox|safari/i, /http:|https:/i],
  document_editing: [/word|docs|notion/i, /\.docx|\.md/i],
  unknown: [],
};

const RECURRING_THRESHOLD = 3;
const RECURRING_HOURS = 24;

export class ContextEngineImpl {
  private database: ClippyDatabase | null = null;
  private contextHistory: TaskContext[] = [];
  private currentBrowserContext: BrowserContextInfo | null = null;

  constructor(database?: ClippyDatabase) {
    this.database = database || null;
  }

  /**
   * Update the current browser context from WindowMonitor
   */
  updateBrowserContext(context: BrowserContext): void {
    this.currentBrowserContext = {
      pageTitle: context.pageTitle,
      browserType: context.browserType,
      applicationName: context.applicationName,
      processName: context.processName,
      timestamp: context.timestamp,
    };
  }

  /**
   * Get the current browser context
   */
  getBrowserContext(): BrowserContextInfo | null {
    return this.currentBrowserContext;
  }

  /**
   * Clear the browser context
   */
  clearBrowserContext(): void {
    this.currentBrowserContext = null;
  }

  async captureContext(app: string, title: string, content = ''): Promise<TaskContext> {
    const intent = this.inferIntentFromContext(app, title, content);
    const context: TaskContext = {
      id: uuidv4(),
      timestamp: Date.now(),
      activeApplication: app,
      windowTitle: title,
      visibleContent: content,
      inferredIntent: intent,
      confidence: this.calcConfidence(intent, app, title, content),
    };

    // Include browser context if available
    if (this.currentBrowserContext) {
      context.browserContext = { ...this.currentBrowserContext };
    }

    return context;
  }

  inferIntent(ctx: TaskContext): TaskCategory {
    return this.inferIntentFromContext(ctx.activeApplication, ctx.windowTitle, ctx.visibleContent);
  }

  async storeContext(ctx: TaskContext): Promise<void> {
    this.contextHistory.push(ctx);
    if (this.database) {
      this.database.saveContextSnapshot({
        timestamp: ctx.timestamp,
        activeApplication: ctx.activeApplication,
        windowTitle: ctx.windowTitle,
        visibleContent: ctx.visibleContent,
        inferredIntent: ctx.inferredIntent,
        confidence: ctx.confidence,
      });
    }
  }

  async getRecurringPatterns(hours = RECURRING_HOURS): Promise<TaskContext[]> {
    const cutoff = Date.now() - hours * 3600000;
    const groups = new Map<TaskCategory, TaskContext[]>();
    for (const c of this.contextHistory.filter(c => c.timestamp >= cutoff)) {
      const g = groups.get(c.inferredIntent) || [];
      g.push(c);
      groups.set(c.inferredIntent, g);
    }
    const result: TaskContext[] = [];
    for (const [intent, ctxs] of groups) {
      if (intent !== 'unknown' && ctxs.length >= RECURRING_THRESHOLD) {
        result.push(...ctxs);
      }
    }
    return result;
  }

  isRecurringPattern(intent: TaskCategory, hours = RECURRING_HOURS): boolean {
    const cutoff = Date.now() - hours * 3600000;
    return this.contextHistory.filter(c => c.inferredIntent === intent && c.timestamp >= cutoff).length >= RECURRING_THRESHOLD;
  }

  getContextById(id: string): TaskContext | undefined {
    return this.contextHistory.find(c => c.id === id);
  }

  getAllContextIds(): string[] {
    return this.contextHistory.map(c => c.id);
  }

  private inferIntentFromContext(app: string, title: string, content: string): TaskCategory {
    const text = `${app} ${title} ${content}`;
    let best: TaskCategory = 'unknown';
    let bestScore = 0;
    for (const [cat, patterns] of Object.entries(INTENT_PATTERNS)) {
      if (cat === 'unknown') continue;
      const score = patterns.filter(p => p.test(text)).length;
      if (score > bestScore) {
        bestScore = score;
        best = cat as TaskCategory;
      }
    }
    return best;
  }

  private calcConfidence(intent: TaskCategory, app: string, title: string, content: string): number {
    if (intent === 'unknown') return 0;
    const patterns = INTENT_PATTERNS[intent];
    const text = `${app} ${title} ${content}`;
    const matches = patterns.filter(p => p.test(text)).length;
    return Math.min(matches / patterns.length, 1);
  }

  clearHistory(): void {
    this.contextHistory = [];
  }
}

export interface ContextEngine {
  captureContext(app: string, title: string, content?: string): Promise<TaskContext>;
  inferIntent(ctx: TaskContext): TaskCategory;
  getRecurringPatterns(hours: number): Promise<TaskContext[]>;
  storeContext(ctx: TaskContext): Promise<void>;
}
