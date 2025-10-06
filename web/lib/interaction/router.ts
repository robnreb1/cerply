/**
 * Natural Language Router
 * 
 * Routes user natural language input to appropriate handlers based on intent.
 * Uses lightweight parsing and keyword matching for fast, deterministic routing.
 */

export interface IntentContext {
  learnerLevel: 'beginner' | 'intermediate' | 'advanced';
  topic: string;
  sessionProgress: number;
  timeAvailable?: number;
  currentContent?: string;
}

export interface IntentResult {
  intent: string;
  confidence: number;
  parameters: Record<string, any>;
  handler: string;
}

export type IntentHandler = (input: string, context: IntentContext) => Promise<IntentResult>;

// Intent patterns with regex and keyword matching
const INTENT_PATTERNS = {
  // Content modification
  shorter: {
    patterns: [
      /make\s+(it\s+)?shorter/i,
      /shorter/i,
      /condense/i,
      /reduce\s+length/i,
      /less\s+words/i
    ],
    keywords: ['shorter', 'condense', 'reduce', 'brief', 'concise'],
    handler: 'content.shorten'
  },
  
  bullets: {
    patterns: [
      /make\s+(it\s+)?bullets?/i,
      /bullet\s+points?/i,
      /list\s+format/i,
      /bullets?/i
    ],
    keywords: ['bullets', 'bullet', 'list', 'points'],
    handler: 'content.bullets'
  },
  
  simplify: {
    patterns: [
      /explain\s+like\s+i'?m\s+12/i,
      /explain\s+like\s+i'?m\s+five/i,
      /simple\s+terms?/i,
      /dumb\s+it\s+down/i,
      /basic\s+explanation/i
    ],
    keywords: ['simple', 'basic', 'explain', 'dumb', 'easy'],
    handler: 'content.simplify'
  },
  
  examples: {
    patterns: [
      /give\s+me\s+examples?/i,
      /show\s+examples?/i,
      /more\s+examples?/i,
      /examples?/i
    ],
    keywords: ['examples', 'example', 'show', 'demonstrate'],
    handler: 'content.examples'
  },
  
  // Time management
  timeConstraint: {
    patterns: [
      /i\s+only\s+have\s+(\d+)\s*(min|minute|mins|minutes?|hour|hours?)/i,
      /(\d+)\s*(min|minute|mins|minutes?|hour|hours?)\s*left/i,
      /quick\s+review/i,
      /time\s+constraint/i
    ],
    keywords: ['minutes', 'mins', 'hours', 'time', 'quick'],
    handler: 'content.timeConstraint'
  },
  
  // Learning preferences
  dontUnderstand: {
    patterns: [
      /i\s+don'?t\s+get\s+it/i,
      /don'?t\s+understand/i,
      /confused/i,
      /not\s+clear/i,
      /explain\s+again/i
    ],
    keywords: ['confused', 'understand', 'clear', 'explain'],
    handler: 'content.clarify'
  },
  
  skip: {
    patterns: [
      /skip\s+(this|it)/i,
      /move\s+on/i,
      /next\s+(topic|section)/i,
      /skip/i
    ],
    keywords: ['skip', 'next', 'move', 'continue'],
    handler: 'navigation.skip'
  },
  
  test: {
    patterns: [
      /test\s+me/i,
      /quiz\s+me/i,
      /questions?/i,
      /practice/i
    ],
    keywords: ['test', 'quiz', 'questions', 'practice'],
    handler: 'assessment.test'
  },
  
  // Navigation
  goBack: {
    patterns: [
      /go\s+back/i,
      /previous/i,
      /before/i,
      /return/i
    ],
    keywords: ['back', 'previous', 'before', 'return'],
    handler: 'navigation.back'
  },
  
  whatsNext: {
    patterns: [
      /what'?s\s+next/i,
      /continue/i,
      /next\s+step/i,
      /proceed/i
    ],
    keywords: ['next', 'continue', 'proceed', 'step'],
    handler: 'navigation.next'
  },
  
  showProgress: {
    patterns: [
      /show\s+progress/i,
      /my\s+progress/i,
      /how\s+am\s+i\s+doing/i,
      /stats?/i
    ],
    keywords: ['progress', 'stats', 'doing', 'performance'],
    handler: 'navigation.progress'
  }
};

/**
 * Parse user input and determine intent
 */
export function parseIntent(input: string, context: IntentContext): IntentResult {
  const normalizedInput = input.toLowerCase().trim();
  
  // Try pattern matching first
  for (const [intentName, config] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of config.patterns) {
      const match = normalizedInput.match(pattern);
      if (match) {
        const parameters = extractParameters(match, intentName);
        return {
          intent: intentName,
          confidence: 0.9,
          parameters,
          handler: config.handler
        };
      }
    }
  }
  
  // Fallback to keyword matching
  const keywordMatches = findKeywordMatches(normalizedInput);
  if (keywordMatches.length > 0) {
    const bestMatch = keywordMatches[0];
    return {
      intent: bestMatch.intent,
      confidence: 0.7,
      parameters: {},
      handler: bestMatch.handler
    };
  }
  
  // Default to general conversation
  return {
    intent: 'conversation',
    confidence: 0.5,
    parameters: {},
    handler: 'conversation.general'
  };
}

/**
 * Extract parameters from regex matches
 */
function extractParameters(match: RegExpMatchArray, intentName: string): Record<string, any> {
  const parameters: Record<string, any> = {};
  
  switch (intentName) {
    case 'timeConstraint':
      if (match[1] && match[2]) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        parameters.minutes = unit.includes('hour') ? value * 60 : value;
      }
      break;
      
    case 'simplify':
      if (match[0].includes('12') || match[0].includes('five')) {
        parameters.ageLevel = 'child';
      }
      break;
  }
  
  return parameters;
}

/**
 * Find keyword matches with scoring
 */
function findKeywordMatches(input: string): Array<{intent: string, handler: string, score: number}> {
  const matches: Array<{intent: string, handler: string, score: number}> = [];
  
  for (const [intentName, config] of Object.entries(INTENT_PATTERNS)) {
    let score = 0;
    for (const keyword of config.keywords) {
      if (input.includes(keyword)) {
        score += 1;
      }
    }
    
    if (score > 0) {
      matches.push({
        intent: intentName,
        handler: config.handler,
        score: score / config.keywords.length
      });
    }
  }
  
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Route intent to appropriate handler
 */
export async function routeIntent(
  input: string, 
  context: IntentContext,
  handlers: Record<string, IntentHandler>
): Promise<any> {
  const intentResult = parseIntent(input, context);
  const handler = handlers[intentResult.handler];
  
  if (!handler) {
    // Fallback to general conversation handler
    const fallbackHandler = handlers['conversation.general'];
    if (fallbackHandler) {
      return await fallbackHandler(input, context);
    }
    
    throw new Error(`No handler found for intent: ${intentResult.handler}`);
  }
  
  return await handler(input, context);
}

/**
 * Get intent suggestions based on context
 */
export function getIntentSuggestions(context: IntentContext): string[] {
  const suggestions: string[] = [];
  
  // Content modification suggestions
  suggestions.push("Make this shorter");
  suggestions.push("Give me examples");
  
  // Time-based suggestions
  if (context.timeAvailable && context.timeAvailable < 30) {
    suggestions.push("I only have 15 minutes");
  }
  
  // Learning level suggestions
  if (context.learnerLevel === 'beginner') {
    suggestions.push("Explain like I'm 12");
  }
  
  // Navigation suggestions
  suggestions.push("What's next?");
  suggestions.push("Show my progress");
  
  return suggestions;
}

/**
 * Validate intent result
 */
export function validateIntentResult(result: IntentResult): boolean {
  return (
    result.intent &&
    result.confidence > 0 &&
    result.handler &&
    typeof result.parameters === 'object'
  );
}
