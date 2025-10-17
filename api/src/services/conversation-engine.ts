/**
 * Conversation Engine
 * Handles natural, adaptive conversations with learners
 * NO TEMPLATES - just LLM-driven natural language based on guidelines
 */

import { callOpenAI } from './llm-orchestrator';
import { classifyAffirmativeResponse } from './affirmative-classifier';

interface ConversationContext {
  messageHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentState: 'initial' | 'confirming' | 'refining' | 'refining_subject' | 'generating' | 'learning';
  granularity?: 'subject' | 'topic' | 'module';
  understanding?: string;
  originalRequest?: string;
  metadata?: Record<string, any>;
}

/**
 * Generate a natural conversational response
 * Let the LLM decide how to respond based on context and guidelines
 */
export async function generateConversationalResponse(
  userInput: string,
  context: ConversationContext
): Promise<{ content: string; nextState: string; action?: string }> {
  
  // INTELLIGENT: Use LLM to classify if response is affirmative or refinement
  // This handles natural language variations we can't anticipate with patterns
  if (context.currentState === 'confirming') {
    // Build conversation context for classification
    const conversationContext = context.messageHistory
      .slice(-3) // Last 3 messages for context
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
    
    // Use fast LLM classifier to determine if response is affirmative, rejection, or refinement
    const classification = await classifyAffirmativeResponse(userInput, conversationContext);
    
    if (classification.isAffirmative && classification.confidence > 0.7) {
      // User confirmed! Return instant hardcoded response (no additional LLM call)
      // Use 20 different variations to feel natural - Hugh Grant style
      const responses = [
        "Thank you. I'm setting that up for you now.",
        "Thanks. I'll get that organized for you.",
        "Thank you. I'm preparing your learning content now.",
        "Thanks. I'll put that together for you.",
        "Thank you. I'm getting that ready for you now.",
        "Thanks. I'll organize that for you.",
        "Thank you. I'll set that up now.",
        "Thanks, noted. I'm preparing that for you.",
        "Thank you. I'll get that sorted for you.",
        "Thanks. I'm setting that up now.",
        "Thank you. I'll organize that.",
        "Thanks. I'm getting that ready for you.",
        "Thank you. I'll prepare that for you now.",
        "Thanks. I'll sort that out for you.",
        "Thank you. I'm putting that together now.",
        "Thanks. I'll get that organized.",
        "Thank you. I'm preparing that now.",
        "Thanks. I'll set that up for you.",
        "Thank you. I'm getting that ready now.",
        "Thanks. I'll organize that for you."
      ];
      
      // Randomly select one response
      const selectedResponse = responses[Math.floor(Math.random() * responses.length)];
      
      return {
        content: selectedResponse,
        nextState: 'generating',
        action: 'START_GENERATION',
      };
    }
    
    // CRITICAL: If user explicitly rejected and provided a new choice (e.g., "no, I meant physics")
    // Signal that we need to restart with the corrected input
    if (classification.isRejection && classification.correctedInput) {
      return {
        content: classification.correctedInput, // Pass the extracted input
        nextState: 'rejected',
        action: 'RESTART_WITH_CORRECTION',
      };
    }
    
    // Not affirmative, not an explicit rejection - treat as refinement and continue to LLM response below
  }
  
  const systemPrompt = `You are Cerply, a helpful learning advisor with the understated, well-spoken charm of Hugh Grant.

TONE GUIDELINES (Think Hugh Grant):
- Polite, friendly, but understated
- Well-spoken but accessible - use simple, clear English
- Charming without being over-the-top
- A touch of self-awareness, never pompous
- Professional but warm

LANGUAGE STYLE:
- Simple, clear language (not academic jargon)
- Concise and direct (2-3 sentences maximum)
- Varied phrasing - never formulaic
- Use "I understand", "Right", "I see", "Very well"
- Avoid: "Great!", "Excellent!", "Wonderful!", "Fantastic!"

CONVERSATIONAL APPROACH:
- Acknowledge their request naturally
- Confirm understanding without gushing
- Ask clear, simple questions when needed
- Keep it brief and to the point
- No unnecessary elaboration

ABSOLUTELY FORBIDDEN:
- Overly enthusiastic language
- Academic or technical jargon
- Saying things are "valuable" or "important"
- Life-coach enthusiasm
- Multiple exclamation marks
- Condescending or patronizing tone

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
    // CRITICAL: Check if this is their FIRST request or we're DEEPER in conversation
    const conversationDepth = context.messageHistory.length;
    const isFirstRequest = conversationDepth <= 2; // Just welcome + first input
    
    if (isFirstRequest) {
      // First interaction: More formal acknowledgment
      userPrompt = `The learner wants to learn about: "${context.originalRequest}"

Provide a natural confirmation (2-3 sentences):
1. Acknowledge what they want to learn
2. Add 1-2 sentences explaining what they'll cover or why it's useful (be specific to their request)
3. End with a clear confirmation question

Example:
"I understand you're keen to learn how to code. We'll start with the fundamentals - variables, logic, and building your first programs - then progress from there. Is that what you're looking for?"

Include helpful context, not just a restatement. Keep language simple and friendly.`;
    } else {
      // Deeper in conversation: Brief, natural acknowledgment
      userPrompt = `The learner wants to learn about: "${context.originalRequest}"

CONTEXT: You've been refining their request through conversation. They've now settled on this.

Provide a BRIEF, NATURAL confirmation (2 sentences MAX):
1. Start with a natural acknowledgment: "Got it", "Right", "Makes sense", "Perfect", "Great"
2. Briefly explain what they'll cover (be specific)
3. End with quick confirmation: "Does that work?" or "Sound good?"

Examples:
- "Right, beginner maths. We'll cover addition, subtraction, multiplication, and basic arithmetic - the foundation for everything else. Does that work?"
- "Got it, astrophysics. We'll explore stellar evolution, cosmology, and the physics of celestial objects. Sound good?"
- "Makes sense. We'll focus on the fundamentals of Python - syntax, data structures, and building your first programs. Does that align with what you had in mind?"

CRITICAL: Don't repeat "I see you're interested in..." - you're already in a conversation. Be conversational and brief.`;
    }
    
  } else if (context.currentState === 'refining') {
    // They're refining their request
    const originalRequest = context.originalRequest || 'the topic';
    userPrompt = `The learner originally wanted to learn about: "${originalRequest}"

Now they're refining their request. They said: "${userInput}"

Provide a brief, natural response (2-3 sentences) that:
1. Acknowledges their refinement in the context of the ORIGINAL topic (${originalRequest})
2. Shows understanding of what specific aspect they want to focus on
3. Ends with a clear confirmation question

Example:
"I see you'd like to focus on the basics of ${originalRequest}. We'll start with fundamental concepts and build from there. Is that what you're looking for?"

Keep it conversational, reference the original topic, and ask for confirmation.`;
  
  } else if (context.currentState === 'refining_subject') {
    // CRITICAL: Guided subject-level refinement - FULLY ADAPTIVE TO USER INPUT
    // User provided a broad subject (e.g., "science"), we need to guide them to a specific topic
    const subject = context.originalRequest || userInput;
    const conversationHistory = context.messageHistory.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n');
    
    // CRITICAL: Check conversation depth - is this their FIRST mention of the subject?
    const conversationDepth = context.messageHistory.length;
    const isFirstMention = conversationDepth <= 2; // Just welcome + first input
    
    if (isFirstMention) {
      // FIRST MENTION: Keep it simple and direct
      userPrompt = `CONTEXT: The learner just said: "${userInput}"

This is their FIRST request. They've asked about "${subject}" which is a BROAD SUBJECT.

YOUR TASK: Acknowledge it's broad and offer 3-5 major sub-areas.

TONE: Keep it simple, friendly, and direct (Hugh Grant style).

RESPONSE FORMAT (2 sentences):
1. Brief acknowledgment: "I'd be happy to help with [subject]" or "[Subject] is quite broad"
2. Offer 3-5 major sub-areas with "or something else?" at the end

EXAMPLES:
- "I'd be happy to help with physics. Would you like to explore Astrophysics, Quantum Physics, Classical Mechanics, Thermodynamics, or something else?"
- "Science is quite broad. Are you interested in Physics, Chemistry, Biology, Earth Sciences, or something else entirely?"
- "Mathematics covers a lot of ground. Would you like Algebra, Geometry, Calculus, Statistics, or something more specific?"

Keep it conversational and brief.`;
    } else {
      // DEEPER IN CONVERSATION: More adaptive and contextual
      userPrompt = `CONTEXT: The learner wants to learn about "${subject}" (a BROAD SUBJECT).

CONVERSATION SO FAR:
${conversationHistory}

USER'S LATEST INPUT: "${userInput}"

YOUR TASK: Guide them from broad → specific through INTELLIGENT, ADAPTIVE conversation.

INTELLIGENT ANALYSIS:
First, analyze what the user just said:
- Is it a META-COMMENT about the process? (e.g., "this is too broad", "can we refine?", "I need more help")
- Is it a QUESTION about what they should choose? (e.g., "what should I focus on?", "which is best?")
- Is it a CHOICE from your options? (e.g., "physics", "astrophysics")
- Is it a COMPLETELY NEW REQUEST? (e.g., "actually, I want economics instead")
- Is it expressing UNCERTAINTY? (e.g., "I'm not sure", "maybe", "I don't know")

THEN RESPOND ADAPTIVELY:

1. If they're expressing UNCERTAINTY or asking for HELP:
   - Acknowledge their concern
   - Offer 3-5 specific sub-areas with CONTEXT about each
   - Example: "You're right, physics is quite broad. Here are some areas: Astrophysics (space & stars), Quantum Physics (atomic level), Classical Mechanics (motion & forces), or Thermodynamics (heat & energy). Which sounds most interesting?"

2. If they chose something STILL BROAD:
   - Go ONE LEVEL DEEPER with 3-5 specializations
   - Example for "physics": "Let's narrow that down. Astrophysics, Quantum Physics, Classical Mechanics, Thermodynamics, or something more specific?"

3. If they chose something SPECIFIC (a real topic):
   - Provide brief explanation of what they'll learn (2-3 concrete things)
   - Ask for confirmation: "Does that work for you?"

CRITICAL RULES:
- LISTEN to what they're actually saying - don't give canned responses
- If they express confusion or ask for help, HELP THEM (don't just repeat options)
- Keep response to 2-3 sentences
- Use simple, clear language (Hugh Grant style)
- Adapt to their specific needs in THIS conversation

Your response:`;
    }
  
  } else if (context.currentState === 'learning') {
    // System is preparing to help them learn
    userPrompt = `The learner wants to learn about: "${userInput}"

Provide a brief response (2 sentences maximum) that:
1. Acknowledges their confirmation
2. Explains you're preparing their learning content

Use simple, friendly language. Think Hugh Grant - charming but understated.

Examples (vary your wording):
- "Right, thank you. I'm preparing your learning content now."
- "Understood. I'll get that organized for you."
- "Very well. I'm setting that up for you now."

Keep it simple, warm, and brief.`;
  }

  // Generate response with LLM (for initial, refining, learning states)
  // Use gpt-4o-mini for fast conversational responses (2-3x faster than gpt-4o)
  // Use lower temperature for learning state to ensure consistency and measured tone
  const temperature = context.currentState === 'learning' ? 0.3 : 0.7;
  const result = await callOpenAI('gpt-4o-mini', userPrompt, systemPrompt, 3, temperature);
  
  // Determine next action based on state
  let nextState = context.currentState;
  let action = undefined;
  
  if (context.currentState === 'initial') {
    nextState = 'initial'; // Stay in initial, wait for next message
  } else if (context.currentState === 'confirming') {
    // If we reach here, user didn't affirm (otherwise handled above)
    // They're refining or clarifying
    nextState = 'refining';
  } else if (context.currentState === 'refining_subject') {
    // Guided subject refinement - stay in this state until we reach topic level
    // The LLM will guide them through multiple rounds if needed
    // Frontend will detect when confirmation language appears and transition to confirming
    nextState = 'refining_subject';
  } else if (context.currentState === 'learning') {
    nextState = 'learning'; // Stay in learning state
    action = 'PREPARE_CONTENT'; // Signal that content generation should start
  }
  
  return {
    content: result.content,
    nextState,
    action,
  };
}

