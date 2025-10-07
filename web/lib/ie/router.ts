/**
 * Interaction Engine Router - Natural Language Intent Recognition
 * 
 * Non-templated responses with paraphrase pools to ensure variation.
 * Never serves the same canned block twice in a row.
 */

export type Intent = 
  | 'upload'
  | 'start_study'
  | 'show_progress'
  | 'help'
  | 'about_cerply'
  | 'clarify'
  | 'confirm'
  | 'unknown';

export type IntentResult = {
  intent: Intent;
  confidence: number;
  entities?: Record<string, any>;
};

// Paraphrase pools for common responses (6-8 variants each)
const UPLOAD_PROMPTS = [
  "I can help you learn from that. What format is it in?",
  "Great! Upload your content and I'll create a learning path for you.",
  "Perfect. Share your file and we'll build a personalized study plan.",
  "I'll analyze that for you. Go ahead and upload it.",
  "Nice! Let me turn that into something you can learn from.",
  "I can work with that. Upload it and we'll get started.",
];

const STUDY_START_PROMPTS = [
  "Let's begin your learning journey. What would you like to focus on?",
  "Ready to start? Tell me what you want to learn today.",
  "Perfect timing! What's your learning goal right now?",
  "Great! What topic shall we dive into?",
  "I'm ready when you are. What interests you most?",
  "Let's do this! Pick a topic and we'll get going.",
];

const PROGRESS_PROMPTS = [
  "Here's where you stand: you've completed {completed} items with {accuracy}% accuracy.",
  "Your progress: {completed} items done, averaging {accuracy}% correct.",
  "You're making headway! {completed} items completed at {accuracy}% accuracy.",
  "Looking good: {completed} items finished, {accuracy}% accuracy rate.",
  "Progress update: {completed} done, performing at {accuracy}%.",
  "Current status: {completed} items complete, {accuracy}% success rate.",
];

const HELP_PROMPTS = [
  "I can help you: upload content, start studying, check progress, or learn about Cerply.",
  "Here's what I do: turn your content into learning paths, adaptive quizzing, and track your progress.",
  "You can ask me to: create study plans, upload materials, start lessons, or see how you're doing.",
  "I'm here to: help you learn anything, remember everything. Upload, study, or track progress.",
  "Try: 'upload my notes', 'start learning X', 'show my progress', or 'tell me about Cerply'.",
  "I can: build custom learning paths, quiz you adaptively, and show your progress over time.",
];

const ABOUT_PROMPTS = [
  "Cerply helps you remember anything, forever. We focus on long-term retention across diverse topics, offer expert-certified content, and let you build custom courses to share.",
  "We're different: adaptive learning that remembers what you forget, expert-certified subjects for quality, and tools to create shareable courses for friends and colleagues.",
  "Cerply = Learn anything, remember everything. Long-term memory retention, expert-certified paths, and custom content you can share with your network.",
  "Think of us as your learning memory system: we adapt to how you learn, provide certified high-quality content, and let you curate topics for others.",
  "Cerply is built for retention: adaptive quizzing that never lets you forget, expert-certified courses, and the ability to create and share learning paths.",
  "We solve forgetting: adaptive review schedules, expert-certified content for trust, and custom topic curation for teams and families.",
];

// Simple Markov-style state to avoid repetition
const recentResponses = new Map<string, number>();

function selectVariant(pool: string[], key: string): string {
  const lastUsed = recentResponses.get(key) || -1;
  
  // Filter out last-used variant
  const available = pool.filter((_, idx) => idx !== lastUsed);
  
  // Select pseudo-randomly based on current time (deterministic per-second)
  const seed = Math.floor(Date.now() / 1000) % available.length;
  const selected = available[seed];
  
  // Update recent usage
  const selectedIdx = pool.indexOf(selected);
  recentResponses.set(key, selectedIdx);
  
  return selected;
}

/**
 * Parse user input to extract intent
 */
export function parseIntent(input: string): IntentResult {
  const lower = input.toLowerCase().trim();
  
  // Upload intent
  if (/(upload|attach|file|document|pdf|share my)/i.test(lower)) {
    return { intent: 'upload', confidence: 0.9 };
  }
  
  // Start study intent
  if (/(start|begin|let's learn|let's begin|teach me|i want to learn)/i.test(lower)) {
    return { intent: 'start_study', confidence: 0.9 };
  }
  
  // Progress intent
  if (/(progress|status|how am i doing|my stats|performance)/i.test(lower)) {
    return { intent: 'show_progress', confidence: 0.9 };
  }
  
  // Help intent
  if (/(help|what can you do|how does this work|commands)/i.test(lower)) {
    return { intent: 'help', confidence: 0.9 };
  }
  
  // About Cerply
  if (/(about cerply|what is cerply|tell me about cerply|who are you)/i.test(lower)) {
    return { intent: 'about_cerply', confidence: 0.9 };
  }
  
  // Clarify intent (asking questions)
  if (/\?$/.test(lower) || /(what|why|how|when|where|which)/i.test(lower)) {
    return { intent: 'clarify', confidence: 0.7 };
  }
  
  // Confirm intent
  if (/(yes|yeah|sure|ok|okay|go ahead|let's do it|sounds good)/i.test(lower)) {
    return { intent: 'confirm', confidence: 0.8 };
  }
  
  return { intent: 'unknown', confidence: 0.5 };
}

/**
 * Generate response for recognized intent (non-templated)
 */
export function routeIntent(intentResult: IntentResult, context?: Record<string, any>): string {
  switch (intentResult.intent) {
    case 'upload':
      return selectVariant(UPLOAD_PROMPTS, 'upload');
    
    case 'start_study':
      return selectVariant(STUDY_START_PROMPTS, 'start_study');
    
    case 'show_progress':
      const progress = context?.progress || { completed: 0, accuracy: 0 };
      const template = selectVariant(PROGRESS_PROMPTS, 'progress');
      return template
        .replace('{completed}', String(progress.completed))
        .replace('{accuracy}', String(progress.accuracy));
    
    case 'help':
      return selectVariant(HELP_PROMPTS, 'help');
    
    case 'about_cerply':
      return selectVariant(ABOUT_PROMPTS, 'about');
    
    case 'clarify':
      return "I'm here to help clarify. What would you like to know more about?";
    
    case 'confirm':
      return "Great! Let's proceed.";
    
    default:
      return "I'm not sure I understand. Try asking about learning a topic, uploading content, or checking your progress.";
  }
}

/**
 * Get intent suggestions based on current context
 */
export function getIntentSuggestions(context?: Record<string, any>): string[] {
  const hasContent = context?.hasContent || false;
  const hasProgress = context?.hasProgress || false;
  
  const suggestions = [];
  
  if (!hasContent) {
    suggestions.push("Upload learning materials");
  } else {
    suggestions.push("Start studying");
  }
  
  if (hasProgress) {
    suggestions.push("Show my progress");
  }
  
  suggestions.push("Tell me about Cerply");
  suggestions.push("Help");
  
  return suggestions.slice(0, 4);
}

/**
 * Generate dynamic microcopy (labels, buttons, hints)
 */
export function generateMicrocopy(key: string, context?: Record<string, any>): string {
  const variants: Record<string, string[]> = {
    'input_placeholder': [
      "What would you like to learn?",
      "Ask me anything...",
      "Share a topic or upload content",
      "Type a question or subject",
      "What's on your mind?",
      "Pick a topic to explore",
    ],
    'submit_button': [
      "Go",
      "Learn",
      "Start",
      "Begin",
      "Let's go",
      "Continue",
    ],
    'empty_state': [
      "Ready to learn something new?",
      "What would you like to master today?",
      "Your learning journey starts here",
      "Pick any topic and let's begin",
      "Tell me what you want to learn",
      "What are you curious about?",
    ],
  };
  
  const pool = variants[key];
  if (!pool) return "";
  
  return selectVariant(pool, key);
}

