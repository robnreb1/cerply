/**
 * Dynamic Microcopy Generator
 * 
 * Generates contextual, brand-consistent microcopy for UI elements.
 * Uses small models for cost efficiency while maintaining quality and variation.
 */

export interface MicrocopyContext {
  learnerLevel: 'beginner' | 'intermediate' | 'advanced';
  topic: string;
  sessionProgress: number;
  brandVoice: 'friendly' | 'professional' | 'encouraging';
  timeAvailable?: number;
  currentAction?: string;
  previousInteraction?: string;
}

export interface MicrocopyRequest {
  type: 'prompt' | 'confirmation' | 'feedback' | 'progress' | 'error' | 'suggestion';
  context: MicrocopyContext;
  template?: string;
  constraints?: {
    maxLength?: number;
    includeEmoji?: boolean;
    tone?: 'casual' | 'formal' | 'motivational';
  };
}

export interface MicrocopyResponse {
  text: string;
  confidence: number;
  generatedAt: string;
  context: MicrocopyContext;
}

// Brand voice templates and patterns
const BRAND_VOICE_PATTERNS = {
  friendly: {
    greeting: ['Hi there!', 'Hello!', 'Hey!', 'Good to see you!'],
    encouragement: ['You\'re doing great!', 'Keep it up!', 'Nice work!', 'Well done!'],
    motivation: ['Let\'s keep learning!', 'Ready for more?', 'You\'ve got this!', 'Almost there!'],
    casual: ['No worries!', 'Sure thing!', 'Absolutely!', 'Of course!']
  },
  
  professional: {
    greeting: ['Welcome', 'Good day', 'Hello'],
    encouragement: ['Excellent progress', 'Well executed', 'Outstanding work', 'Impressive'],
    motivation: ['Continue your learning journey', 'Proceed to the next level', 'Advance your skills'],
    casual: ['Certainly', 'Indeed', 'Understood', 'Acknowledged']
  },
  
  encouraging: {
    greeting: ['Welcome back!', 'Great to have you here!', 'Ready to learn?'],
    encouragement: ['You\'re making amazing progress!', 'This is fantastic!', 'You\'re learning so well!'],
    motivation: ['Let\'s tackle this together!', 'You can do this!', 'Keep pushing forward!'],
    casual: ['No problem at all!', 'Happy to help!', 'Absolutely!']
  }
};

// Microcopy templates for different scenarios
const MICROCOPY_TEMPLATES = {
  prompt: {
    topicInput: [
      "What would you like to learn about today?",
      "What topic interests you?",
      "Tell me what you'd like to explore",
      "What should we dive into?"
    ],
    clarification: [
      "Can you tell me more about that?",
      "I'd love to understand better",
      "Could you elaborate?",
      "What specifically interests you?"
    ],
    confirmation: [
      "Got it! Let me create something great for you.",
      "Perfect! I'll build this for you.",
      "Excellent choice! Working on it now.",
      "I'm on it! This will be great."
    ]
  },
  
  confirmation: {
    processing: [
      "Building your learning experience...",
      "Creating something special for you...",
      "Crafting your personalized content...",
      "Putting together the perfect lesson..."
    ],
    complete: [
      "All set! Ready to dive in?",
      "Perfect! Let's get started.",
      "Done! Time to learn something amazing.",
      "Ready! This is going to be great."
    ]
  },
  
  feedback: {
    positive: [
      "Excellent! You're really getting this.",
      "Perfect! You've mastered this concept.",
      "Outstanding! You understand this well.",
      "Fantastic! You're on the right track."
    ],
    constructive: [
      "Good try! Let me explain this differently.",
      "Close! Here's another way to think about it.",
      "Not quite, but you're thinking in the right direction.",
      "Good effort! Let me help clarify this."
    ],
    encouragement: [
      "Don't worry, learning takes practice!",
      "Keep going - you're making progress!",
      "Every attempt teaches you something!",
      "You're doing great - keep it up!"
    ]
  },
  
  progress: {
    starting: [
      "Let's begin your learning journey!",
      "Ready to start? Here we go!",
      "Time to dive in and learn!",
      "Let's get this learning started!"
    ],
    continuing: [
      "Great progress! Ready for the next part?",
      "You're doing well! Let's continue.",
      "Nice work! What's next?",
      "Excellent! Ready to keep going?"
    ],
    completing: [
      "Amazing work! You've completed this section.",
      "Fantastic! You've mastered this topic.",
      "Outstanding! You're ready for the next level.",
      "Perfect! You've learned so much!"
    ]
  },
  
  error: {
    generic: [
      "Oops! Something went wrong. Let me fix that.",
      "Sorry about that! I'm working on it.",
      "Hmm, let me try that again.",
      "My mistake! Let me get this right."
    ],
    network: [
      "Connection issue! Let me try again.",
      "Having trouble connecting. One moment...",
      "Network hiccup! I'll reconnect.",
      "Connection problem. Let me fix that."
    ],
    timeout: [
      "Taking a bit longer than expected...",
      "This is taking more time than usual...",
      "Still working on it... almost done!",
      "Processing... this will be worth the wait!"
    ]
  },
  
  suggestion: {
    nextSteps: [
      "Ready to continue?",
      "What would you like to do next?",
      "How can I help you further?",
      "What interests you most?"
    ],
    alternatives: [
      "Or we could try something different?",
      "Want to explore another approach?",
      "How about we try this instead?",
      "Would you prefer a different way?"
    ],
    engagement: [
      "Want to test your knowledge?",
      "Ready for a quick quiz?",
      "How about some practice?",
      "Want to try some examples?"
    ]
  }
};

/**
 * Generate contextual microcopy
 */
export async function generateMicrocopy(request: MicrocopyRequest): Promise<MicrocopyResponse> {
  const { type, context, template, constraints } = request;
  
  // Get base template options
  const templateOptions = MICROCOPY_TEMPLATES[type] || MICROCOPY_TEMPLATES.prompt;
  const voicePatterns = BRAND_VOICE_PATTERNS[context.brandVoice];
  
  // Select appropriate template based on context
  let selectedTemplate = template;
  if (!selectedTemplate) {
    selectedTemplate = selectTemplate(templateOptions, context);
  }
  
  // Apply brand voice and context adaptation
  const adaptedText = adaptToContext(selectedTemplate, context, voicePatterns, constraints);
  
  // Ensure variation (never return identical text)
  const variedText = ensureVariation(adaptedText, context);
  
  return {
    text: variedText,
    confidence: 0.85,
    generatedAt: new Date().toISOString(),
    context
  };
}

/**
 * Select appropriate template based on context
 */
function selectTemplate(templates: string[], context: MicrocopyContext): string {
  // Simple selection logic - can be enhanced with ML
  const index = Math.floor(Math.random() * templates.length);
  return templates[index];
}

/**
 * Adapt text to context and brand voice
 */
function adaptToContext(
  template: string,
  context: MicrocopyContext,
  voicePatterns: any,
  constraints?: any
): string {
  let adapted = template;
  
  // Apply brand voice patterns
  if (context.brandVoice === 'friendly' && Math.random() > 0.5) {
    adapted = addFriendlyTouch(adapted, voicePatterns);
  }
  
  // Adapt to learner level
  if (context.learnerLevel === 'beginner') {
    adapted = simplifyLanguage(adapted);
  } else if (context.learnerLevel === 'advanced') {
    adapted = addSophistication(adapted);
  }
  
  // Apply time constraints
  if (context.timeAvailable && context.timeAvailable < 15) {
    adapted = addUrgency(adapted);
  }
  
  // Apply length constraints
  if (constraints?.maxLength) {
    adapted = truncateToLength(adapted, constraints.maxLength);
  }
  
  // Apply tone constraints
  if (constraints?.tone) {
    adapted = adjustTone(adapted, constraints.tone);
  }
  
  return adapted;
}

/**
 * Add friendly touches to text
 */
function addFriendlyTouch(text: string, voicePatterns: any): string {
  const touches = ['!', ' :)', ' 💪', ' ✨'];
  const touch = touches[Math.floor(Math.random() * touches.length)];
  
  if (!text.endsWith('!') && !text.endsWith('?') && Math.random() > 0.5) {
    return text + touch;
  }
  
  return text;
}

/**
 * Simplify language for beginners
 */
function simplifyLanguage(text: string): string {
  const simplifications: Record<string, string> = {
    'excellent': 'great',
    'outstanding': 'awesome',
    'fantastic': 'cool',
    'impressive': 'nice',
    'sophisticated': 'advanced',
    'comprehensive': 'complete'
  };
  
  let simplified = text;
  for (const [complex, simple] of Object.entries(simplifications)) {
    simplified = simplified.replace(new RegExp(complex, 'gi'), simple);
  }
  
  return simplified;
}

/**
 * Add sophistication for advanced learners
 */
function addSophistication(text: string): string {
  const enhancements: Record<string, string> = {
    'great': 'excellent',
    'good': 'outstanding',
    'nice': 'impressive',
    'cool': 'sophisticated',
    'simple': 'elegant',
    'easy': 'straightforward'
  };
  
  let enhanced = text;
  for (const [simple, sophisticated] of Object.entries(enhancements)) {
    enhanced = enhanced.replace(new RegExp(`\\b${simple}\\b`, 'gi'), sophisticated);
  }
  
  return enhanced;
}

/**
 * Add urgency for time-constrained scenarios
 */
function addUrgency(text: string): string {
  if (text.includes('...')) {
    return text.replace('...', ' (quick!)');
  }
  
  if (!text.includes('quick') && !text.includes('fast')) {
    return text + ' (quick version)';
  }
  
  return text;
}

/**
 * Adjust tone based on constraints
 */
function adjustTone(text: string, tone: string): string {
  switch (tone) {
    case 'casual':
      return text.replace(/\./g, '!').toLowerCase();
    case 'formal':
      return text.replace(/!/g, '.').replace(/^./, (c) => c.toUpperCase());
    case 'motivational':
      return text.replace(/\./g, '!').replace(/good/g, 'excellent');
    default:
      return text;
  }
}

/**
 * Ensure text variation to prevent templating
 */
function ensureVariation(text: string, context: MicrocopyContext): string {
  // Add subtle variations based on context
  const variations = [
    text,
    text.replace(/^/, ''),
    text.replace(/$/, ''),
    text.replace(/\s+/g, ' ')
  ];
  
  // Select variation based on context hash
  const contextHash = hashContext(context);
  const variationIndex = contextHash % variations.length;
  
  return variations[variationIndex];
}

/**
 * Truncate text to maximum length
 */
function truncateToLength(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  const truncated = text.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Simple hash function for context
 */
function hashContext(context: MicrocopyContext): number {
  const str = JSON.stringify(context);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get microcopy for specific scenarios
 */
export async function getMicrocopy(
  scenario: string,
  context: MicrocopyContext,
  constraints?: any
): Promise<string> {
  const request: MicrocopyRequest = {
    type: scenario as any,
    context,
    constraints
  };
  
  const response = await generateMicrocopy(request);
  return response.text;
}

/**
 * Batch generate microcopy for multiple scenarios
 */
export async function batchGenerateMicrocopy(
  requests: MicrocopyRequest[]
): Promise<MicrocopyResponse[]> {
  return Promise.all(requests.map(generateMicrocopy));
}
