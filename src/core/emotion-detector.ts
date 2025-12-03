// EmotionDetector - Detects user frustration signals
// Requirements: 1.1, 1.2, 1.3, 1.4

import { ClippyDatabase } from './database';

export interface FrustrationSignal {
  type: 'repeated_error' | 'rapid_deletion' | 'idle_after_error' | 'rage_click';
  timestamp: number;
  applicationContext: string;
  severity: number;
}

export interface ErrorEvent {
  errorMessage: string;
  timestamp: number;
  application: string;
}

export interface DeletionEvent {
  charactersDeleted: number;
  timestamp: number;
}

export type FrustrationCallback = (signal: FrustrationSignal) => void;

// Configuration constants
const REPEATED_ERROR_THRESHOLD = 3;
const REPEATED_ERROR_WINDOW_MS = 60000; // 60 seconds
const RAPID_DELETION_THRESHOLD = 50; // characters
const RAPID_DELETION_WINDOW_MS = 5000; // 5 seconds
const FLOW_STATE_IDLE_THRESHOLD_MS = 300000; // 5 minutes of productive work

export class EmotionDetectorImpl {
  private errorHistory: ErrorEvent[] = [];
  private deletionHistory: DeletionEvent[] = [];
  private callbacks: FrustrationCallback[] = [];
  private isMonitoring = false;
  private lastActivityTimestamp = Date.now();
  private productiveWorkStart: number | null = null;
  private database: ClippyDatabase | null = null;

  constructor(database?: ClippyDatabase) {
    this.database = database || null;
  }

  startMonitoring(): void {
    this.isMonitoring = true;
    this.lastActivityTimestamp = Date.now();
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
  }

  onFrustration(callback: FrustrationCallback): void {
    this.callbacks.push(callback);
  }

  offFrustration(callback: FrustrationCallback): void {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }

  // Check if user is in flow state (productive work without interruption)
  isInFlowState(): boolean {
    if (this.productiveWorkStart === null) return false;
    const flowDuration = Date.now() - this.productiveWorkStart;
    return flowDuration >= FLOW_STATE_IDLE_THRESHOLD_MS;
  }

  // Get current frustration level (0-1)
  getFrustrationLevel(): number {
    const now = Date.now();
    
    // Count recent errors
    const recentErrors = this.errorHistory.filter(
      e => now - e.timestamp < REPEATED_ERROR_WINDOW_MS
    );
    
    // Count recent deletions
    const recentDeletions = this.deletionHistory.filter(
      d => now - d.timestamp < RAPID_DELETION_WINDOW_MS
    );
    const totalDeleted = recentDeletions.reduce((sum, d) => sum + d.charactersDeleted, 0);
    
    // Calculate frustration components
    const errorFrustration = Math.min(recentErrors.length / REPEATED_ERROR_THRESHOLD, 1);
    const deletionFrustration = Math.min(totalDeleted / RAPID_DELETION_THRESHOLD, 1);
    
    // Combined frustration (weighted average)
    return Math.min((errorFrustration * 0.6 + deletionFrustration * 0.4), 1);
  }

  // Record an error event and check for frustration
  recordError(event: ErrorEvent): FrustrationSignal | null {
    if (!this.isMonitoring) return null;
    
    this.errorHistory.push(event);
    this.lastActivityTimestamp = event.timestamp;
    this.productiveWorkStart = null; // Reset flow state on error
    
    // Clean old events
    this.cleanOldEvents();
    
    // Check for repeated errors (Requirement 1.1)
    const signal = this.checkRepeatedErrors(event);
    if (signal) {
      this.emitSignal(signal);
      return signal;
    }
    
    return null;
  }

  // Record a deletion event and check for frustration
  recordDeletion(event: DeletionEvent): FrustrationSignal | null {
    if (!this.isMonitoring) return null;
    
    this.deletionHistory.push(event);
    this.lastActivityTimestamp = event.timestamp;
    
    // Clean old events
    this.cleanOldEvents();
    
    // Check for rapid deletion (Requirement 1.2)
    const signal = this.checkRapidDeletion(event);
    if (signal) {
      this.emitSignal(signal);
      return signal;
    }
    
    return null;
  }

  // Record productive activity (for flow state detection)
  recordProductiveActivity(): void {
    if (!this.isMonitoring) return;
    
    this.lastActivityTimestamp = Date.now();
    if (this.productiveWorkStart === null) {
      this.productiveWorkStart = Date.now();
    }
  }

  // Check for repeated identical errors within window (Requirement 1.1)
  private checkRepeatedErrors(latestEvent: ErrorEvent): FrustrationSignal | null {
    const windowStart = latestEvent.timestamp - REPEATED_ERROR_WINDOW_MS;
    
    const recentIdenticalErrors = this.errorHistory.filter(
      e => e.timestamp >= windowStart && e.errorMessage === latestEvent.errorMessage
    );
    
    if (recentIdenticalErrors.length >= REPEATED_ERROR_THRESHOLD) {
      return {
        type: 'repeated_error',
        timestamp: latestEvent.timestamp,
        applicationContext: latestEvent.application,
        severity: Math.min(recentIdenticalErrors.length / REPEATED_ERROR_THRESHOLD, 1),
      };
    }
    
    return null;
  }

  // Check for rapid deletion within window (Requirement 1.2)
  private checkRapidDeletion(latestEvent: DeletionEvent): FrustrationSignal | null {
    const windowStart = latestEvent.timestamp - RAPID_DELETION_WINDOW_MS;
    
    const recentDeletions = this.deletionHistory.filter(
      d => d.timestamp >= windowStart
    );
    
    const totalDeleted = recentDeletions.reduce((sum, d) => sum + d.charactersDeleted, 0);
    
    if (totalDeleted >= RAPID_DELETION_THRESHOLD) {
      return {
        type: 'rapid_deletion',
        timestamp: latestEvent.timestamp,
        applicationContext: 'text_editor', // Generic context for deletions
        severity: Math.min(totalDeleted / (RAPID_DELETION_THRESHOLD * 2), 1),
      };
    }
    
    return null;
  }

  // Clean old events outside their respective windows
  private cleanOldEvents(): void {
    const now = Date.now();
    this.errorHistory = this.errorHistory.filter(
      e => now - e.timestamp < REPEATED_ERROR_WINDOW_MS * 2
    );
    this.deletionHistory = this.deletionHistory.filter(
      d => now - d.timestamp < RAPID_DELETION_WINDOW_MS * 2
    );
  }

  // Emit signal to all callbacks and persist to database
  private emitSignal(signal: FrustrationSignal): void {
    // Persist to database (Requirement 1.5)
    if (this.database) {
      this.database.saveFrustrationSignal({
        type: signal.type,
        timestamp: signal.timestamp,
        applicationContext: signal.applicationContext,
        severity: signal.severity,
      });
    }
    
    // Notify callbacks (Requirement 1.4)
    for (const callback of this.callbacks) {
      callback(signal);
    }
  }

  // Should notification be suppressed? (Requirement 1.3)
  shouldSuppressNotification(isCritical: boolean): boolean {
    if (isCritical) return false;
    return this.isInFlowState();
  }

  // Clear history (for testing)
  clearHistory(): void {
    this.errorHistory = [];
    this.deletionHistory = [];
    this.productiveWorkStart = null;
  }
}

// Export interface for dependency injection
export interface EmotionDetector {
  startMonitoring(): void;
  stopMonitoring(): void;
  onFrustration(callback: FrustrationCallback): void;
  isInFlowState(): boolean;
  getFrustrationLevel(): number;
}
