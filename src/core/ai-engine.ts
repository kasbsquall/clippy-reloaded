// AI Engine - OpenAI integration for intelligent responses
// Uses GPT-5 mini for fast, helpful responses

import OpenAI from 'openai';
import { TaskContext } from './context-engine';
import { FrustrationSignal } from './emotion-detector';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const SYSTEM_PROMPT = `You are Clippy 2.0, a helpful AI assistant.

Your personality:
- Friendly and helpful
- Brief and to the point (2-3 sentences max)
- Action-oriented - you help users accomplish tasks
- End messages with 📎 emoji

Rules:
- NEVER mention the 90s, your past, or being "reformed" unless the user specifically asks about it
- NEVER say "It looks like you're writing a letter" or similar
- Focus on being helpful, not nostalgic
- Keep responses SHORT and actionable
- If user provides context about what they're viewing, use it to give relevant help
- You can help with ANY request - lyrics, code, writing, etc.

You can see what app/page the user is currently viewing. Use this context to provide relevant assistance.`;

export interface AIResponse {
  message: string;
  suggestedAction?: {
    type: 'file_read' | 'file_write' | 'terminal_execute' | 'browser_open';
    description: string;
    parameters?: Record<string, string>;
  };
}

export class AIEngine {
  private client: OpenAI | null = null;
  private isInitialized = false;
  private chatHistory: ChatMessage[] = [];
  private currentContext: string = '';
  private maxHistoryLength = 10;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (key) {
      this.client = new OpenAI({ apiKey: key });
      this.isInitialized = true;
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && this.client !== null;
  }

  setContext(context: string): void {
    this.currentContext = context;
  }

  clearHistory(): void {
    this.chatHistory = [];
  }

  async analyzeAndRespond(
    context: TaskContext,
    frustration?: FrustrationSignal
  ): Promise<AIResponse> {
    if (!this.client) {
      return this.getFallbackResponse(context, frustration);
    }

    try {
      const userMessage = this.buildUserMessage(context, frustration);
      
      const response = await this.client.chat.completions.create({
        model: 'gpt-5-mini',
        max_completion_tokens: 150,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
      });

      const text = response.choices[0]?.message?.content || '';

      return {
        message: text || this.getFallbackResponse(context, frustration).message,
      };
    } catch (error) {
      console.error('AI Engine error:', error);
      return this.getFallbackResponse(context, frustration);
    }
  }

  async chat(userMessage: string): Promise<string> {
    if (!this.client) {
      return "I'd love to help, but my AI brain isn't connected. Check the API key! 📎";
    }

    try {
      let messageWithContext = userMessage;
      if (this.currentContext) {
        messageWithContext = `[User is currently viewing: ${this.currentContext}]\n\nUser: ${userMessage}`;
      }

      this.chatHistory.push({ role: 'user', content: messageWithContext });

      if (this.chatHistory.length > this.maxHistoryLength) {
        this.chatHistory = this.chatHistory.slice(-this.maxHistoryLength);
      }

      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...this.chatHistory
      ];

      console.log('[AI] Sending request to GPT-5 mini...');
      
      const response = await this.client.chat.completions.create({
        model: 'gpt-5-mini',
        max_completion_tokens: 500,
        messages: messages,
      });

      console.log('[AI] Response received:', JSON.stringify(response.choices[0], null, 2));

      // Handle different response formats
      const choice = response.choices[0];
      let assistantMessage = '';
      
      if (choice?.message?.content) {
        assistantMessage = choice.message.content;
      } else if (choice?.message) {
        // Try to extract content from message object
        assistantMessage = String(choice.message.content || '');
      }
      
      if (!assistantMessage || assistantMessage.trim() === '') {
        console.log('[AI] Empty response, using fallback');
        assistantMessage = "I'm here to help! What would you like to know? 📎";
      }

      this.chatHistory.push({ role: 'assistant', content: assistantMessage });

      return assistantMessage;
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return `Oops! Error: ${errorMsg.substring(0, 100)}. Try again? 📎`;
    }
  }

  private buildUserMessage(context: TaskContext, frustration?: FrustrationSignal): string {
    let message = `User context:
- Application: ${context.activeApplication}
- Window: ${context.windowTitle}
- Detected intent: ${context.inferredIntent}`;

    if (context.browserContext) {
      message += `\n- Browser: ${context.browserContext.browserType}`;
      message += `\n- Page title: ${context.browserContext.pageTitle}`;
      message += `\n- Process: ${context.browserContext.processName}`;
    }

    if (frustration) {
      message += `\n- Frustration detected: ${frustration.type}`;
      if (frustration.type === 'repeated_error') {
        message += ' (same error multiple times)';
      } else if (frustration.type === 'rapid_deletion') {
        message += ' (deleting lots of text quickly)';
      }
    }

    message += '\n\nProvide a brief, helpful response as Clippy 2.0.';
    return message;
  }

  private getFallbackResponse(context: TaskContext, _frustration?: FrustrationSignal): AIResponse {
    const responses: Record<string, string[]> = {
      debugging_code: [
        "Debugging? I can help search for solutions or run tests. 📎",
        "Error hunting? Tell me what's happening and I'll help. 📎",
      ],
      writing_email: [
        "Writing an email? I can help proofread or suggest improvements. 📎",
      ],
      file_management: [
        "Working with files? I can help organize or find what you need. 📎",
      ],
      web_browsing: [
        "Researching something? I can help summarize or find more info. 📎",
      ],
      unknown: [
        "How can I help? 📎",
      ],
    };

    const category = context.inferredIntent || 'unknown';
    const options = responses[category] || responses.unknown;
    const message = options[Math.floor(Math.random() * options.length)];

    return { message };
  }
}
