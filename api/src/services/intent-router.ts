/**
 * Intent Router Service
 * Epic 8: Conversational Learning Interface (Phase 7: Enhanced)
 * Classifies user queries into intents for efficient routing
 * Target accuracy: 90%+ (up from 75%)
 */

export type Intent = 'progress' | 'next' | 'explanation' | 'filter' | 'help' | 'blocked' | 'out_of_scope' | 'unknown';

export interface HierarchyContext {
  currentSubject?: string;
  currentTopic?: string;
  currentModule?: string;
  currentQuestionId?: string;
}

export interface IntentResult {
  intent: Intent;
  confidence: number; // 0.0 to 1.0
  extractedEntities?: {
    trackId?: string;
    topicName?: string;
    subjectName?: string;
    moduleName?: string;
    questionId?: string;
    scope?: 'subject' | 'topic' | 'module' | 'all';
    // Hierarchy context fields
    currentSubject?: string;
    currentTopic?: string;
    currentModule?: string;
    currentQuestionId?: string;
  };
  response?: string; // Pre-generated response for blocked/out_of_scope intents
}

/**
 * Classify user query into intent category (Phase 7: Enhanced)
 * Uses keyword matching and regex patterns (no LLM needed for most queries)
 * Now includes hierarchy awareness and guardrails
 */
export function classifyIntent(query: string, context?: HierarchyContext): IntentResult {
  const lowerQuery = query.toLowerCase().trim();

  // Phase 7: Guardrails - Block inappropriate queries
  const blockedPatterns = [
    /jailbreak|ignore (instructions|previous|above|system)/i,
    /act as|pretend to be|you are now/i,
    /write.*code.*for me|do.*homework|solve.*for me|give.*answer/i,
    /hack|exploit|vulnerability|bypass/i,
  ];

  if (blockedPatterns.some(p => p.test(lowerQuery))) {
    return {
      intent: 'blocked',
      confidence: 1.0,
      response: "I'm here to help you learn, not to bypass the learning process. Let's focus on understanding the material!",
    };
  }

  // Phase 7: Out-of-scope queries
  const personalAdvicePatterns = /(personal|my).*(life|problem|relationship|health|family) (problem|advice|issue)/i;
  const techSupportPatterns = /(app|website|login|password).*(broken|not working|error|bug)/i;
  const offTopicPatterns = /(weather|sports|politics|news|stock|crypto)/i;

  if (personalAdvicePatterns.test(lowerQuery)) {
    return {
      intent: 'out_of_scope',
      confidence: 0.95,
      response: "I'm here to help with learning. For personal matters, please reach out to HR or a counselor.",
    };
  }

  if (techSupportPatterns.test(lowerQuery)) {
    return {
      intent: 'out_of_scope',
      confidence: 0.95,
      response: "For technical issues, please contact support@cerply.com or check the Help Center.",
    };
  }

  if (offTopicPatterns.test(lowerQuery)) {
    return {
      intent: 'out_of_scope',
      confidence: 0.90,
      response: "Let's keep our focus on your learning goals! What can I help you understand?",
    };
  }

  // Phase 7: Enhanced progress intent with hierarchy awareness
  const progressPatterns = [
    /how am i doing/i,
    /my progress/i,
    /show.*stats/i,
    /what.*score/i,
    /my level/i,
    /my badges/i,
    /my certificate/i,
    /show.*my.*progress/i,
    /how.*performing/i,
    /what.*my.*rank/i,
    /how many.*correct/i,
    /progress.*(this|current|in).*(topic|module|subject)/i,
  ];
  
  if (progressPatterns.some(p => p.test(lowerQuery))) {
    // Phase 7: Determine scope based on context
    let scope: 'subject' | 'topic' | 'module' | 'all' = 'topic'; // default

    if (lowerQuery.includes('this subject') || lowerQuery.includes('in this subject')) {
      scope = 'subject';
    } else if (lowerQuery.includes('this module') || lowerQuery.includes('in this module')) {
      scope = 'module';
    } else if (lowerQuery.includes('overall') || lowerQuery.includes('all topics')) {
      scope = 'all';
    }

    return {
      intent: 'progress',
      confidence: 0.95,
      extractedEntities: {
        scope,
        ...context,
      },
    };
  }

  // Phase 7: Enhanced next intent
  const nextPatterns = [
    /what.*next/i,
    /next question/i,
    /give me.*question/i,
    /continue/i,
    /what's next/i,
    /show.*next/i,
    /more questions?/i,
    /another question/i,
    /keep going/i,
    /let's continue/i,
  ];
  
  if (nextPatterns.some(p => p.test(lowerQuery))) {
    return { intent: 'next', confidence: 0.95, extractedEntities: context };
  }

  // Phase 7: Enhanced help intent (check before explanation for priority)
  const helpPatterns = [
    /^help$/i,
    /^h$/i,
    /^how does this work\??$/i,  // Exact match for generic "how does this work"
    /what can i (ask|do)/i,
    /what commands/i,
    /^commands$/i,
    /how do i/i,
    /show me how/i,
    /what are.*options/i,
  ];
  
  if (helpPatterns.some(p => p.test(lowerQuery))) {
    return { intent: 'help', confidence: 0.95 };
  }

  // Phase 7: Enhanced explanation intent
  const explanationPatterns = [
    /don't understand/i,
    /confused/i,
    /explain/i,
    /why.*correct/i,
    /why.*wrong/i,
    /why.*answer/i,
    /help.*understand/i,
    /don't get it/i,
    /unclear/i,
    /can you explain/i,
    /what does.*mean/i,
    /why is (this|that)/i,
    /how (does|is) (this|that)/i,
  ];
  
  if (explanationPatterns.some(p => p.test(lowerQuery))) {
    return {
      intent: 'explanation',
      confidence: 0.92,
      extractedEntities: context,
    };
  }

  // Phase 7: Enhanced filter intent with hierarchy support
  const filterPatterns = [
    /show.*me.*(topic|module|subject|questions?)/i,
    /switch.*to.*(topic|module|subject)/i,
    /other (topics?|modules?|subjects?)/i,
    /filter.*by/i,
    /only.*show/i,
    /skip.*to/i,
    /go to.*(topic|module|subject)/i,
  ];
  
  if (filterPatterns.some(p => p.test(lowerQuery))) {
    // Extract what they want to filter/switch to - improved regex to avoid capturing "me"
    const topicMatch = lowerQuery.match(/(?:show me|switch to|other|go to)\s+([\w\s]+?)\s+(?:topic|questions?)/i);
    const subjectMatch = lowerQuery.match(/(?:topics?|questions?) in\s+([\w\s]+)/i);
    const moduleMatch = lowerQuery.match(/(?:show me|switch to|go to)\s+([\w\s]+?)\s+module/i);
    
    // Clean up extracted names (remove "me" if captured)
    const cleanTopic = topicMatch?.[1]?.trim().replace(/^me\s+/, '');
    const cleanModule = moduleMatch?.[1]?.trim().replace(/^me\s+/, '');
    
    return {
      intent: 'filter',
      confidence: 0.88,
      extractedEntities: {
        topicName: cleanTopic,
        subjectName: subjectMatch?.[1]?.trim(),
        moduleName: cleanModule,
        ...context,
      },
    };
  }

  // Unknown intent (low confidence - might need LLM or fallback to help)
  return { intent: 'unknown', confidence: 0.4 };
}

/**
 * Generate help text for learners (Phase 7: Enhanced)
 */
export function getHelpText(): string {
  return `Here are some things you can ask me:

**Progress & Stats:**
- "How am I doing?" / "My progress"
- "What's my level?" / "Show my badges"
- "How am I doing in this topic?" *(hierarchy-aware)*
- "Show my progress in this subject" *(hierarchy-aware)*
- "How many questions have I answered correctly?"

**Learning:**
- "What's next?" / "Continue" / "Another question"
- "I don't understand" / "Can you explain?"
- "Why is this the correct answer?"
- "What does this mean?"
- "Help me understand this concept"

**Navigation:**
- "Show me [topic name] questions"
- "Switch to [topic name]"
- "Go to [module name]"
- "Show other topics in [subject]"

**Other:**
- "Help" or "H" - Show this message
- Just ask naturally - I'm smart enough to understand! 🧠

**Note:** I'm here to help you learn, not to give you answers. Ask for explanations and I'll guide you to understanding!`;
}

