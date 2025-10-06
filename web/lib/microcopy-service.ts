/**
 * Microcopy Service
 * 
 * Centralized service for generating dynamic microcopy throughout the app.
 * Replaces static strings with context-aware, brand-consistent copy.
 */

import { generateMicrocopy, type MicrocopyContext, type MicrocopyRequest } from './interaction/microcopy';

interface AppContext {
  learnerLevel: 'beginner' | 'intermediate' | 'advanced';
  currentPhase: 'input' | 'preview' | 'auth-gate' | 'session';
  topic?: string;
  sessionProgress?: number;
  timeAvailable?: number;
  brandVoice?: 'friendly' | 'professional' | 'encouraging';
}

class MicrocopyService {
  private cache = new Map<string, string>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps = new Map<string, number>();

  /**
   * Get dynamic microcopy for a specific scenario
   */
  async getMicrocopy(
    scenario: string,
    context: AppContext,
    options: {
      fallback?: string;
      maxLength?: number;
      includeEmoji?: boolean;
      tone?: 'casual' | 'formal' | 'motivational';
    } = {}
  ): Promise<string> {
    const cacheKey = this.getCacheKey(scenario, context, options);
    
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const microcopyContext: MicrocopyContext = {
        learnerLevel: context.learnerLevel,
        topic: context.topic || 'general',
        sessionProgress: context.sessionProgress || 0,
        brandVoice: context.brandVoice || 'encouraging',
        timeAvailable: context.timeAvailable,
        currentAction: context.currentPhase
      };

      const request: MicrocopyRequest = {
        type: scenario as any,
        context: microcopyContext,
        constraints: {
          maxLength: options.maxLength,
          includeEmoji: options.includeEmoji,
          tone: options.tone
        }
      };

      const response = await generateMicrocopy(request);
      
      // Cache the result
      this.cache.set(cacheKey, response.text);
      this.cacheTimestamps.set(cacheKey, Date.now());
      
      return response.text;
    } catch (error) {
      console.error('Error generating microcopy:', error);
      return options.fallback || this.getStaticFallback(scenario);
    }
  }

  /**
   * Get multiple microcopy items in batch
   */
  async getBatchMicrocopy(
    requests: Array<{
      scenario: string;
      context: AppContext;
      options?: any;
    }>
  ): Promise<string[]> {
    const results = await Promise.all(
      requests.map(req => 
        this.getMicrocopy(req.scenario, req.context, req.options)
      )
    );
    
    return results;
  }

  /**
   * Clear cache (useful for testing or when context changes significantly)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Get cache key for a request
   */
  private getCacheKey(scenario: string, context: AppContext, options: any): string {
    const contextStr = JSON.stringify({
      learnerLevel: context.learnerLevel,
      currentPhase: context.currentPhase,
      topic: context.topic,
      sessionProgress: Math.floor((context.sessionProgress || 0) * 10) / 10, // Round to 1 decimal
      brandVoice: context.brandVoice
    });
    
    const optionsStr = JSON.stringify(options);
    
    return `${scenario}:${contextStr}:${optionsStr}`;
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) return false;
    
    return Date.now() - timestamp < this.cacheTimeout;
  }

  /**
   * Get static fallback for when microcopy generation fails
   */
  private getStaticFallback(scenario: string): string {
    const fallbacks: Record<string, string> = {
      'prompt.topicInput': 'What would you like to learn about?',
      'prompt.confirmation': 'Got it! Let me create something great for you.',
      'confirmation.processing': 'Building your learning experience...',
      'confirmation.complete': 'All set! Ready to dive in?',
      'feedback.positive': 'Excellent! You\'re really getting this.',
      'feedback.constructive': 'Good try! Let me explain this differently.',
      'feedback.encouragement': 'Keep going - you\'re making progress!',
      'progress.starting': 'Let\'s begin your learning journey!',
      'progress.continuing': 'Great progress! Ready for the next part?',
      'progress.completing': 'Amazing work! You\'ve completed this section.',
      'error.generic': 'Oops! Something went wrong. Let me fix that.',
      'error.network': 'Connection issue! Let me try again.',
      'error.timeout': 'Taking a bit longer than expected...',
      'suggestion.nextSteps': 'Ready to continue?',
      'suggestion.alternatives': 'Want to explore another approach?',
      'suggestion.engagement': 'Want to test your knowledge?'
    };

    return fallbacks[scenario] || 'Ready to continue?';
  }
}

// Singleton instance
export const microcopyService = new MicrocopyService();

/**
 * Convenience functions for common scenarios
 */
export async function getTopicInputPrompt(context: AppContext): Promise<string> {
  return microcopyService.getMicrocopy('prompt.topicInput', context, {
    fallback: 'What would you like to learn about?',
    maxLength: 60
  });
}

export async function getConfirmationMessage(context: AppContext): Promise<string> {
  return microcopyService.getMicrocopy('prompt.confirmation', context, {
    fallback: 'Got it! Let me create something great for you.',
    maxLength: 80
  });
}

export async function getProcessingMessage(context: AppContext): Promise<string> {
  return microcopyService.getMicrocopy('confirmation.processing', context, {
    fallback: 'Building your learning experience...',
    maxLength: 50
  });
}

export async function getFeedbackMessage(
  type: 'positive' | 'constructive' | 'encouragement',
  context: AppContext
): Promise<string> {
  return microcopyService.getMicrocopy(`feedback.${type}`, context, {
    fallback: type === 'positive' ? 'Excellent!' : 'Keep going!',
    maxLength: 100
  });
}

export async function getProgressMessage(
  phase: 'starting' | 'continuing' | 'completing',
  context: AppContext
): Promise<string> {
  return microcopyService.getMicrocopy(`progress.${phase}`, context, {
    fallback: 'Ready to continue?',
    maxLength: 80
  });
}

export async function getErrorMessage(
  type: 'generic' | 'network' | 'timeout',
  context: AppContext
): Promise<string> {
  return microcopyService.getMicrocopy(`error.${type}`, context, {
    fallback: 'Something went wrong. Let me fix that.',
    maxLength: 100
  });
}

export async function getSuggestionMessage(
  type: 'nextSteps' | 'alternatives' | 'engagement',
  context: AppContext
): Promise<string> {
  return microcopyService.getMicrocopy(`suggestion.${type}`, context, {
    fallback: 'Ready to continue?',
    maxLength: 60
  });
}

export { microcopyService, type AppContext };
