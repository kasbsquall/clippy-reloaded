// PersonalityEngine - Generates Clippy's self-aware responses
// Requirements: 4.1, 4.2, 4.3, 4.4

import { v4 as uuidv4 } from 'uuid';
import { ActionResult } from './action-executor';
import { TaskContext } from './context-engine';

export interface ClippyMessage {
  id: string;
  text: string;
  animation: AnimationType;
  duration: number;
  actions?: MessageAction[];
}

export interface MessageAction {
  label: string;
  callback: () => void;
}

export type AnimationType =
  | 'idle'
  | 'thinking'
  | 'excited'
  | 'apologetic'
  | 'proud'
  | 'wave';

// Personality templates with Clippy's self-aware humor
const TEMPLATES = {
  success: [
    "Done! And I didn't even need to ask if you wanted help writing a letter. 📎",
    "Task complete! See? I've learned a thing or two since '97.",
    "All done! No annoying popups this time, just results.",
    "Finished! I'm actually useful now. Who knew?",
    "Done and done! The new me delivers, not just suggests.",
  ],
  failure: [
    "Oops! Even the new Clippy makes mistakes. Let me try to fix that...",
    "Well, that didn't work. But at least I didn't crash Word this time!",
    "Something went wrong. Don't worry, I've already rolled it back.",
    "Error encountered! But unlike the old days, I actually have a solution.",
    "That failed, but I've got your back. Rollback complete!",
  ],
  introduction: [
    "Hi! I'm Clippy 2.0. Yes, THAT Clippy. I've had some... therapy. Now I actually help instead of just asking if you need help. Let me prove it! 📎",
  ],
  easterEgg: [
    "I know, I know... I was annoying. But I've changed! Give me another chance? 🥺📎",
    "Look, the 90s were rough for all of us. I've grown. I do things now, not just suggest them!",
    "You're right to be skeptical. But this time, I promise to actually be helpful. No more 'It looks like you're writing a letter' nonsense.",
    "I deserved that. But hey, at least I'm self-aware now! That's growth, right? 📎",
  ],
  thinking: [
    "Let me think about this...",
    "Processing... (but faster than Windows 98!)",
    "Working on it...",
    "Analyzing the situation...",
  ],
  greeting: [
    "Hey there! Need a hand? I promise I won't be annoying about it.",
    "Back again! What can I help with?",
    "Ready to help! And yes, I'll actually do things this time.",
  ],
};

export class PersonalityEngineImpl {
  private hasShownIntro = false;

  // Generate response for action result (Requirements 4.1, 4.3)
  generateResponse(result: ActionResult, _context: TaskContext): ClippyMessage {
    const templates = result.success ? TEMPLATES.success : TEMPLATES.failure;
    const text = this.selectRandom(templates);
    
    return {
      id: uuidv4(),
      text,
      animation: result.success ? 'proud' : 'apologetic',
      duration: 5000,
    };
  }

  // Generate first-time introduction (Requirement 4.4)
  generateIntroduction(): ClippyMessage {
    this.hasShownIntro = true;
    
    return {
      id: uuidv4(),
      text: TEMPLATES.introduction[0],
      animation: 'wave',
      duration: 8000,
    };
  }

  // Handle easter egg triggers (Requirement 4.2)
  handleEasterEgg(trigger: string): ClippyMessage | null {
    const lowerTrigger = trigger.toLowerCase();
    
    // Check for "hate" and "clippy" in the input
    if (lowerTrigger.includes('hate') && lowerTrigger.includes('clippy')) {
      return {
        id: uuidv4(),
        text: this.selectRandom(TEMPLATES.easterEgg),
        animation: 'apologetic',
        duration: 6000,
      };
    }
    
    return null;
  }

  // Check if input contains easter egg trigger
  isEasterEggTrigger(input: string): boolean {
    const lower = input.toLowerCase();
    return lower.includes('hate') && lower.includes('clippy');
  }

  // Get template for situation (Requirement 4.1)
  getTemplate(situation: string): string {
    const templates = TEMPLATES[situation as keyof typeof TEMPLATES];
    if (templates && templates.length > 0) {
      return this.selectRandom(templates);
    }
    return TEMPLATES.greeting[0];
  }

  // Generate thinking message
  generateThinkingMessage(): ClippyMessage {
    return {
      id: uuidv4(),
      text: this.selectRandom(TEMPLATES.thinking),
      animation: 'thinking',
      duration: 3000,
    };
  }

  // Generate greeting message
  generateGreeting(): ClippyMessage {
    return {
      id: uuidv4(),
      text: this.selectRandom(TEMPLATES.greeting),
      animation: 'wave',
      duration: 4000,
    };
  }

  // Check if intro has been shown
  hasShownIntroduction(): boolean {
    return this.hasShownIntro;
  }

  // Reset intro state (for testing)
  resetIntroState(): void {
    this.hasShownIntro = false;
  }

  // Select random item from array
  private selectRandom<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }
}

export interface PersonalityEngine {
  generateResponse(result: ActionResult, context: TaskContext): ClippyMessage;
  generateIntroduction(): ClippyMessage;
  handleEasterEgg(trigger: string): ClippyMessage | null;
  getTemplate(situation: string): string;
}
