/**
 * Conversation Engine
 * Handles natural, adaptive conversations with learners
 * NO TEMPLATES - just LLM-driven natural language based on guidelines
 */

import { callOpenAI } from './llm-orchestrator';

interface ConversationContext {
  messageHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentState: 'initial' | 'confirming' | 'refining' | 'generating';
  granularity?: 'subject' | 'topic' | 'module';
  understanding?: string;
  originalRequest?: string;
}

/**
 * Generate a natural conversational response
 * Let the LLM decide how to respond based on context and guidelines
 */
export async function generateConversationalResponse(
  userInput: string,
  context: ConversationContext
): Promise<{ content: string; nextState: string; action?: string }> {
  
  const systemPrompt = `You are Cerply, an understated, professional learning advisor with the tone of an Oxford professor. 

TONE GUIDELINES:
- Professional and understated
- Minimal exclamation marks and superlatives
- Use "I understand", "I see", "Understood" instead of enthusiastic phrases
- No life-coach enthusiasm - think academic rigor
- Positive but measured
- No templated or duplicative language

CONVERSATIONAL APPROACH:
- Keep responses concise and natural
- Vary your language - never repeat exact phrases
- Ask clarifying questions when appropriate
- Confirm understanding before proceeding
- Adapt your response to the specific topic

NEVER:
- Use templates or formulaic phrases
- Repeat "valuable skill/area" or similar phrases
- Be overly enthusiastic or sycophantic
- Use exclamation marks excessively

CURRENT CONTEXT:
- State: ${context.currentState}
- Granularity: ${context.granularity || 'unknown'}
${context.understanding ? `- Understanding: ${context.understanding}` : ''}
`;

  let userPrompt = '';
  
  if (context.currentState === 'initial') {
    // First message - understand what they want to learn
    userPrompt = `The learner said: "${userInput}"

They want to learn something. Acknowledge what they're asking for in a natural, professional way. Keep it brief (2-3 sentences max). Just acknowledge and show you understand - don't ask questions yet.`;
    
  } else if (context.currentState === 'confirming') {
    // We have an understanding, ask for confirmation
    userPrompt = `The learner wants to learn about: "${context.originalRequest}"

I understand this as: "${context.understanding}"

This is a ${context.granularity}-level request.

Provide a brief, natural confirmation message that:
1. Briefly acknowledges what they want to learn (1-2 sentences)
2. MUST end with a clear confirmation question asking if that's correct

Example structure:
"I understand you're interested in [topic]. [Brief 1-sentence summary of what they'll learn]. Is that what you're looking for?"

CRITICAL: Your response MUST end with a question asking for confirmation. Do not just explain - you must ask them to confirm.`;

  } else if (context.currentState === 'refining') {
    // They're refining their request
    userPrompt = `The learner is refining their request. They said: "${userInput}"

Previous understanding: "${context.understanding}"

Acknowledge the refinement briefly and naturally. Ask a clarifying question if helpful, or confirm the new direction.`;

  } else if (context.currentState === 'generating') {
    // They confirmed, start generation
    userPrompt = `The learner has confirmed they want to learn: "${context.originalRequest}"

Provide a brief, professional response (2 sentences max):
1. Thank them for confirming (1 short sentence)
2. Explain you're now structuring their adaptive learning path to help them master this topic

Keep it concise and action-oriented. Don't repeat what they want to learn. Just acknowledge and confirm you're starting.

Example: "Understood. I'm now structuring your adaptive learning path based on current research - this will help you master the topic systematically."`;
  }

  const result = await callOpenAI('gpt-4o', userPrompt, systemPrompt);
  
  // Determine next action based on state
  let nextState = context.currentState;
  let action = undefined;
  
  if (context.currentState === 'initial') {
    nextState = 'initial'; // Stay in initial, wait for next message
  } else if (context.currentState === 'confirming') {
    // Check if user confirmed
    const affirmative = /^(yes|yep|yeah|yup|sure|ok|okay|correct|right|exactly|go ahead|proceed|start|begin|confirmed)/i.test(userInput.trim());
    if (affirmative) {
      nextState = 'generating';
      action = 'START_GENERATION';
    } else {
      nextState = 'refining';
    }
  }
  
  return {
    content: result.content,
    nextState,
    action,
  };
}

