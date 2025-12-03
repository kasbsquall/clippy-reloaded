// EventManager - Coordinates all engines via event bus
// Requirements: 1.4, 3.3

import { EmotionDetectorImpl, FrustrationSignal } from './emotion-detector';
import { ContextEngineImpl, TaskContext } from './context-engine';
import { ActionExecutorImpl, ActionResult, ActionRequest } from './action-executor';
import { PersonalityEngineImpl, ClippyMessage } from './personality-engine';
import { ClippyDatabase } from './database';
import { v4 as uuidv4 } from 'uuid';

export type EventType =
  | 'frustration_detected'
  | 'context_ready'
  | 'action_executed'
  | 'message_ready'
  | 'ui_update';

export interface EventPayload {
  type: EventType;
  data: unknown;
  timestamp: number;
}

type EventCallback = (payload: EventPayload) => void;

export class EventManagerImpl {
  private emotionDetector: EmotionDetectorImpl;
  private contextEngine: ContextEngineImpl;
  private actionExecutor: ActionExecutorImpl;
  private personalityEngine: PersonalityEngineImpl;
  private database: ClippyDatabase;
  private listeners: Map<EventType, EventCallback[]> = new Map();
  private isRunning = false;

  constructor(dbPath?: string) {
    this.database = new ClippyDatabase(dbPath);
    this.database.initialize();

    this.emotionDetector = new EmotionDetectorImpl(this.database);
    this.contextEngine = new ContextEngineImpl(this.database);
    this.actionExecutor = new ActionExecutorImpl(this.database);
    this.personalityEngine = new PersonalityEngineImpl();

    this.setupInternalListeners();
  }

  // Start the event manager
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.emotionDetector.startMonitoring();

    // Show introduction on first start
    if (!this.personalityEngine.hasShownIntroduction()) {
      const intro = this.personalityEngine.generateIntroduction();
      this.emit({ type: 'message_ready', data: intro, timestamp: Date.now() });
    }
  }

  // Stop the event manager
  stop(): void {
    this.isRunning = false;
    this.emotionDetector.stopMonitoring();
  }

  // Emit an event
  emit(event: EventPayload): void {
    const callbacks = this.listeners.get(event.type) || [];
    for (const callback of callbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error(`Error in event callback for ${event.type}:`, error);
      }
    }
  }

  // Subscribe to events
  on(type: EventType, callback: EventCallback): void {
    const callbacks = this.listeners.get(type) || [];
    callbacks.push(callback);
    this.listeners.set(type, callbacks);
  }

  // Unsubscribe from events
  off(type: EventType, callback: EventCallback): void {
    const callbacks = this.listeners.get(type) || [];
    this.listeners.set(type, callbacks.filter(cb => cb !== callback));
  }

  // Process user input for easter eggs
  processUserInput(input: string): ClippyMessage | null {
    return this.personalityEngine.handleEasterEgg(input);
  }

  // Get engines for direct access
  getEmotionDetector(): EmotionDetectorImpl {
    return this.emotionDetector;
  }

  getContextEngine(): ContextEngineImpl {
    return this.contextEngine;
  }

  getActionExecutor(): ActionExecutorImpl {
    return this.actionExecutor;
  }

  getPersonalityEngine(): PersonalityEngineImpl {
    return this.personalityEngine;
  }

  // Cleanup
  shutdown(): void {
    this.stop();
    this.database.close();
  }

  // Setup internal event flow
  private setupInternalListeners(): void {
    // Frustration detected -> Capture context (Requirement 1.4)
    this.emotionDetector.onFrustration(async (signal: FrustrationSignal) => {
      this.emit({
        type: 'frustration_detected',
        data: signal,
        timestamp: Date.now(),
      });

      // Capture context
      const context = await this.contextEngine.captureContext(
        signal.applicationContext,
        'Unknown Window', // Would be populated by actual window detection
        ''
      );
      await this.contextEngine.storeContext(context);

      this.emit({
        type: 'context_ready',
        data: context,
        timestamp: Date.now(),
      });
    });

    // Context ready -> Execute action
    this.on('context_ready', async (event) => {
      const context = event.data as TaskContext;
      
      // Determine and execute appropriate action
      const availableActions = this.actionExecutor.getAvailableActions(context);
      if (availableActions.length > 0) {
        const request: ActionRequest = {
          id: uuidv4(),
          type: availableActions[0],
          parameters: {},
          contextId: context.id,
        };

        const result = await this.actionExecutor.execute(request);
        
        this.emit({
          type: 'action_executed',
          data: result,
          timestamp: Date.now(),
        });
      }
    });

    // Action executed -> Generate message (Requirement 3.3)
    this.on('action_executed', (event) => {
      const result = event.data as ActionResult;
      
      // Get context for response generation
      const context = this.contextEngine.getContextById(result.actionId);
      const message = this.personalityEngine.generateResponse(
        result,
        context || {
          id: '',
          timestamp: Date.now(),
          activeApplication: '',
          windowTitle: '',
          visibleContent: '',
          inferredIntent: 'unknown',
          confidence: 0,
        }
      );

      this.emit({
        type: 'message_ready',
        data: message,
        timestamp: Date.now(),
      });
    });
  }
}

export interface EventManager {
  emit(event: EventPayload): void;
  on(type: EventType, callback: EventCallback): void;
  off(type: EventType, callback: EventCallback): void;
}
