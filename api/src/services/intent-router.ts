/**
 * Intent Router Service
 * Epic 8: Conversational Learning Interface
 * Classifies user queries into intents for efficient routing
 */

export type Intent = 'progress' | 'next' | 'explanation' | 'filter' | 'help' | 'unknown';

export interface IntentResult {
  intent: Intent;
  confidence: number; // 0.0 to 1.0
  extractedEntities?: {
    trackId?: string;
    topicName?: string;
    questionId?: string;
  };
}

/**
 * Classify user query into intent category
 * Uses keyword matching and regex patterns (no LLM needed for most queries)
 */
export function classifyIntent(query: string): IntentResult {
  const lowerQuery = query.toLowerCase().trim();

  // Progress intent
  const progressPatterns = [
    /how am i doing/i,
    /my progress/i,
    /show.*stats/i,
    /what.*score/i,
    /my level/i,
    /my badges/i,
    /my certificate/i,
    /show.*my.*progress/i,
  ];
  
  if (progressPatterns.some(p => p.test(lowerQuery))) {
    return { intent: 'progress', confidence: 0.95 };
  }

  // Next intent
  const nextPatterns = [
    /what.*next/i,
    /next question/i,
    /give me.*question/i,
    /continue/i,
    /what's next/i,
    /show.*next/i,
  ];
  
  if (nextPatterns.some(p => p.test(lowerQuery))) {
    return { intent: 'next', confidence: 0.95 };
  }

  // Explanation intent
  const explanationPatterns = [
    /don't understand/i,
    /confused/i,
    /explain/i,
    /why.*correct/i,
    /why.*wrong/i,
    /help.*understand/i,
    /don't get it/i,
    /unclear/i,
  ];
  
  if (explanationPatterns.some(p => p.test(lowerQuery))) {
    return { intent: 'explanation', confidence: 0.90 };
  }

  // Filter intent
  const filterPatterns = [
    /show.*me.*questions?/i,
    /filter.*by/i,
    /only.*show/i,
    /skip/i,
  ];
  
  if (filterPatterns.some(p => p.test(lowerQuery))) {
    // Extract topic name if mentioned
    const topicMatch = lowerQuery.match(/(?:show|filter).*?([\w\s]+)\s+questions?/i);
    return {
      intent: 'filter',
      confidence: 0.85,
      extractedEntities: topicMatch ? { topicName: topicMatch[1].trim() } : undefined,
    };
  }

  // Help intent
  const helpPatterns = [
    /^help$/i,
    /how.*work/i,
    /what can i/i,
    /what commands/i,
    /^commands$/i,
  ];
  
  if (helpPatterns.some(p => p.test(lowerQuery))) {
    return { intent: 'help', confidence: 0.95 };
  }

  // Unknown intent (requires LLM or fallback to help)
  return { intent: 'unknown', confidence: 0.5 };
}

/**
 * Generate help text for learners
 */
export function getHelpText(): string {
  return `Here are some things you can ask me:

**Progress & Stats:**
- "How am I doing?"
- "Show my progress"
- "What's my current level?"
- "Show my badges"

**Learning:**
- "What's next?"
- "Give me a question"
- "I don't understand this answer"
- "Explain why option A is correct"

**Navigation:**
- "Show me fire safety questions"
- "Skip this topic"

**Other:**
- "Help" - Show this message

Just ask naturally - I'll understand!`;
}

