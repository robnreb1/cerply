/**
 * Welcome Workflow Implementation
 * Handles learner onboarding and intelligent routing
 */

import { WorkflowState, WorkflowTransition } from '../lib/workflow-state';

/**
 * Execute the Welcome workflow
 * Handles: New learning, Continue, Shortcuts, Free-text
 */
export async function executeWelcomeWorkflow(
  userInput: string,
  currentState: WorkflowState
): Promise<WorkflowTransition> {
  try {
    // Step 1: Detect intent
    const intent = await detectIntent(userInput, currentState);

    // Step 2: Route based on intent
    if (intent.intent === 'shortcut') {
      return handleShortcut(intent.shortcutType, userInput);
    } else if (intent.intent === 'continue') {
      return await handleContinue(currentState);
    } else if (intent.intent === 'new_session') {
      // User wants to start fresh - prompt for what they want to learn
      // Use varied responses to feel natural, not templated
      const restartMessages = [
        "Perfect. What would you like to learn?",
        "Right, let's start fresh. What interests you?",
        "Great. What would you like to focus on?",
        "Understood. What should we explore?",
        "Makes sense. What topic would you like to begin with?",
        "Got it. What would you like to learn about?",
        "Certainly. What area interests you?",
        "Of course. What would you like to explore?",
      ];
      const selectedMessage = restartMessages[Math.floor(Math.random() * restartMessages.length)];
      
      return {
        nextWorkflow: 'learner_welcome',
        data: { restartSession: true },
        action: 'CONTINUE',
        messageToDisplay: selectedMessage,
      };
    } else if (intent.intent === 'learning') {
      return await handleLearning(userInput, currentState);
    } else {
      // Unclear intent - continue conversation
      return {
        nextWorkflow: 'learner_welcome',
        data: {},
        action: 'CONTINUE',
        messageToDisplay: "I'm not sure I understood that. Could you tell me what you'd like to learn, or type 'continue' to resume where you left off?",
      };
    }
  } catch (error) {
    console.error('[welcome-workflow] Error:', error);
    return {
      nextWorkflow: 'learner_welcome',
      data: {},
      action: 'CONTINUE',
      messageToDisplay: "I'm sorry, something went wrong. Could you try again?",
      uiComponent: 'error',
    };
  }
}

/**
 * Detect user intent (shortcut, learning, continue, other)
 */
async function detectIntent(userInput: string, state: WorkflowState): Promise<any> {
  try {
    const response = await fetch('/api/workflow/detect-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': 'test-admin-token', // TODO: Get from auth context
      },
      body: JSON.stringify({
        userInput,
        conversationHistory: state.conversationHistory,
        userId: 'test-user', // TODO: Get from auth context
      }),
    });

    if (!response.ok) {
      throw new Error('Intent detection failed');
    }

    return await response.json();
  } catch (error) {
    console.error('[welcome-workflow] Intent detection error:', error);
    
    // Fallback: simple pattern matching
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('continue') || lowerInput.includes('resume')) {
      return { intent: 'continue', suggestedRoute: 'route_to_continue' };
    }
    
    if (lowerInput.includes('upload')) {
      return { intent: 'shortcut', shortcutType: 'upload', suggestedRoute: 'route_to_shortcut' };
    }
    
    if (lowerInput.includes('progress')) {
      return { intent: 'shortcut', shortcutType: 'progress', suggestedRoute: 'route_to_shortcut' };
    }
    
    if (lowerInput.includes('teach') || lowerInput.includes('learn')) {
      return { intent: 'learning', learningTopic: userInput, suggestedRoute: 'route_to_learning' };
    }
    
    return { intent: 'unclear', suggestedRoute: 'continue_conversation' };
  }
}

/**
 * Handle shortcut routing
 */
function handleShortcut(shortcutType: string, userInput: string): WorkflowTransition {
  const shortcutMessages: Record<string, string> = {
    upload: "The upload feature is coming soon. You'll be able to upload documents, PDFs, and other content to create custom learning materials.",
    progress: "The progress dashboard is coming soon. You'll be able to track your learning journey, completion rates, and achievements.",
    curate: "The curator interface is coming soon. Managers will be able to create and certify custom content for their teams.",
    search: "The content search is coming soon. You'll be able to explore our full library of topics and modules.",
    certify: "The certification feature is coming soon. You'll be able to earn verified certificates for completed topics.",
    about: "Cerply is an intelligent learning platform that helps you master any topic through adaptive, spaced repetition. We use research-backed methods to ensure long-term retention.",
    challenge: "The challenge feature is coming soon. You'll be able to test your knowledge and compete with others.",
    new: "Let me help you start learning something new. What would you like to learn?",
  };

  const message = shortcutMessages[shortcutType] || "This feature is coming soon.";

  return {
    nextWorkflow: 'learner_welcome',
    data: { shortcutType },
    action: 'STUB',
    messageToDisplay: message,
  };
}

/**
 * Handle "Continue" path - get active modules
 */
async function handleContinue(state: WorkflowState): Promise<WorkflowTransition> {
  try {
    const response = await fetch('/api/learner/active-modules?userId=test-user', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': 'test-admin-token', // TODO: Get from auth context
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch active modules');
    }

    const data = await response.json();

    if (data.hasActiveModules && data.activeModules.length > 0) {
      // User has active modules - resume first one
      const topModule = data.activeModules[0];
      
      return {
        nextWorkflow: 'module',
        data: {
          topicId: topModule.topicId,
          topicTitle: topModule.topicTitle,
          moduleId: topModule.moduleId,
          moduleTitle: topModule.moduleTitle,
        },
        action: 'STUB',
        messageToDisplay: `Welcome back! Let's continue with "${topModule.topicTitle}". (Module workflow coming soon)`,
      };
    } else {
      // No active modules - prompt for new topic
      return {
        nextWorkflow: 'learner_welcome',
        data: {},
        action: 'CONTINUE',
        messageToDisplay: "You don't have any active learning modules yet. What would you like to learn?",
      };
    }
  } catch (error) {
    console.error('[welcome-workflow] Continue error:', error);
    return {
      nextWorkflow: 'learner_welcome',
      data: {},
      action: 'CONTINUE',
      messageToDisplay: "I couldn't load your active modules. What would you like to learn?",
    };
  }
}

/**
 * Handle learning request
 * Detects granularity, searches for existing topics, or suggests topics
 */
async function handleLearning(userInput: string, state: WorkflowState): Promise<WorkflowTransition> {
  try {
    // CRITICAL: Step 1 - Detect granularity (Subject/Topic/Module)
    const granularityResponse = await fetch('/api/workflow/detect-granularity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': 'test-admin-token',
      },
      body: JSON.stringify({ userInput }),
    });

    if (!granularityResponse.ok) {
      throw new Error('Granularity detection failed');
    }

    const granularityResult = await granularityResponse.json();
    console.log('[welcome-workflow] Granularity detected:', granularityResult);

    // If SUBJECT: Use conversational refinement (don't generate entire subject)
    // Let LLM guide the user from broad → narrow → specific through natural conversation
    if (granularityResult.granularity === 'subject') {
      return {
        nextWorkflow: 'learner_welcome',
        data: {
          originalQuery: userInput,
          subjectName: userInput,
          refinementLevel: 'subject', // Track how deep we are in refinement
        },
        action: 'SUBJECT_REFINEMENT',
        messageToDisplay: `Subject-level refinement needed for: ${userInput}`,
      };
    }

    // If MODULE: Aggregate up to parent topic (not implemented yet - treat as topic for now)
    // Future: Extract parent topic and generate at that level

    // If TOPIC (or MODULE for now): Search for existing topics in DB
    const searchResponse = await fetch('/api/topics/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': 'test-admin-token',
      },
      body: JSON.stringify({ 
        query: userInput,
        userId: '00000000-0000-0000-0000-000000000001',
      }),
    });

    if (!searchResponse.ok) {
      throw new Error('Topic search failed');
    }

    const searchResult = await searchResponse.json();

    // If exact topic found, proceed to Module workflow (stub for now)
    if (searchResult.exactMatch) {
      return {
        nextWorkflow: 'module',
        data: {
          topicId: searchResult.exactMatch.id,
          topicTitle: searchResult.exactMatch.title,
        },
        action: 'STUB',
        messageToDisplay: `Perfect! I found an existing topic: "${searchResult.exactMatch.title}". (Module workflow coming soon - this is where you'd start learning)`,
      };
    }

    // If fuzzy matches found, show suggestions
    if (searchResult.fuzzyMatches && searchResult.fuzzyMatches.length > 0) {
      return {
        nextWorkflow: 'learner_welcome',
        data: {
          topicSuggestions: searchResult.fuzzyMatches,
          originalQuery: userInput,
        },
        action: 'SHOW_TOPIC_SELECTION',
        messageToDisplay: `I found some related topics. Which would you like to learn?`,
      };
    }

    // No matches - use conversational confirmation (LLM will clarify)
    return {
      nextWorkflow: 'learner_welcome',
      data: {
        topicTitle: userInput,
        needsConfirmation: true,
      },
      action: 'CONFIRM_TOPIC',
      messageToDisplay: `I'd like to help you learn "${userInput}". Let me confirm this is what you're looking for before we begin.`,
    };
  } catch (error) {
    console.error('[welcome-workflow] Learning error:', error);
    return {
      nextWorkflow: 'learner_welcome',
      data: {},
      action: 'CONTINUE',
      messageToDisplay: "I had trouble understanding that. Could you rephrase what you'd like to learn?",
    };
  }
}

/**
 * Suggest topics when user provides subject-level request
 */
async function suggestTopics(query: string, understanding: any): Promise<WorkflowTransition> {
  try {
    const response = await fetch('/api/topics/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': 'test-admin-token',
      },
      body: JSON.stringify({
        query,
        userId: 'test-user',
        limit: 5,
      }),
    });

    if (!response.ok) {
      throw new Error('Topic search failed');
    }

    const data = await response.json();

    return {
      nextWorkflow: 'learner_welcome',
      data: {
        topics: data.matches,
        originalQuery: query,
        understanding: understanding.understanding,
      },
      action: 'CONTINUE',
      messageToDisplay: `"${query}" is quite broad. Let me suggest some focused topics:`,
      uiComponent: 'topic_selection',
    };
  } catch (error) {
    console.error('[welcome-workflow] Topic suggestion error:', error);
    return {
      nextWorkflow: 'learner_welcome',
      data: {},
      action: 'CONTINUE',
      messageToDisplay: `"${query}" is quite broad. Could you be more specific about what aspect you'd like to focus on?`,
    };
  }
}

