/**
 * Agent Tools Registry
 * Epic 13: Tool definitions for agent orchestrator
 * 
 * Each tool is a self-contained function that the agent can call.
 * Tools are registered with the orchestrator and exposed via OpenAI function calling.
 */

import { searchTopics as searchTopicsService } from './topic-search';
import { detectGranularity as detectGranularityService } from '../services/llm-orchestrator';
import { db } from '../db';
import { topics, attempts, agentConversations } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Tool interface definition
 */
export interface AgentTool {
  name: string;
  description: string; // For LLM to understand when to use this tool
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  execute: (params: any) => Promise<any>;
  timeout?: number; // Optional timeout in milliseconds (default: 10000)
}

/**
 * Tool call result (for tracking)
 */
export interface ToolCall {
  toolName: string;
  parameters: any;
  result: any;
  timestamp: string;
}

/**
 * Tool 1: Search Topics
 * Searches the database for existing learning content
 */
export const searchTopicsTool: AgentTool = {
  name: 'searchTopics',
  description: 'Search for existing learning content in our library. Use when user mentions a specific topic to see if we have content available.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The topic to search for (e.g., "quantum physics", "leadership")',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 5)',
      },
    },
    required: ['query'],
  },
  async execute({ query, limit = 5, userId }) {
    try {
      // Use the topic-search service (returns { matches: [], source: string })
      const result = await searchTopicsService(query, limit, true);
      
      // Find exact match (confidence = 1.0) or best matches
      const exactMatch = result.matches.find((m) => m.confidence === 1.0);
      const fuzzyMatches = result.matches.filter((m) => m.confidence < 1.0);
      
      return {
        found: result.matches.length > 0,
        exactMatch: exactMatch ? {
          topicId: exactMatch.topicId,
          title: exactMatch.title,
          description: exactMatch.description,
        } : null,
        fuzzyMatches: fuzzyMatches.map((m) => ({
          topicId: m.topicId,
          title: m.title,
          description: m.description,
          confidence: m.confidence,
        })),
        message: exactMatch 
          ? `Found exact match: "${exactMatch.title}"`
          : result.matches.length > 0
          ? `Found ${result.matches.length} similar topic(s)`
          : 'No existing content found for this topic',
        source: result.source,
      };
    } catch (error: any) {
      console.error('[Tool:searchTopics] Error:', error.message);
      return {
        found: false,
        error: error.message,
      };
    }
  },
  timeout: 5000,
};

/**
 * Tool 2: Detect Granularity
 * Classifies user input as subject (broad), topic (focused), or module (specific)
 */
export const detectGranularityTool: AgentTool = {
  name: 'detectGranularity',
  description: 'Classify user input as SUBJECT (broad domain like "physics"), TOPIC (focused skill like "quantum mechanics"), or MODULE (specific framework like "Schrödinger equation"). Use this to understand the scope of what the user wants to learn.',
  parameters: {
    type: 'object',
    properties: {
      input: {
        type: 'string',
        description: 'The user\'s learning request to classify',
      },
    },
    required: ['input'],
  },
  async execute({ input }) {
    try {
      const granularity = detectGranularityService(input);
      
      const guidance = {
        subject: 'User provided a broad domain. Guide them to choose a specific topic within this subject.',
        topic: 'User provided a focused skill/concept. Search for existing content or generate new modules.',
        module: 'User provided a very specific request. Consider aggregating to parent topic level or creating focused content.',
      };

      return {
        granularity,
        input,
        guidance: guidance[granularity],
        nextAction: 
          granularity === 'subject' ? 'Ask user to specify a topic within this subject' :
          granularity === 'topic' ? 'Search for existing content or generate new content' :
          'Create focused module content',
      };
    } catch (error: any) {
      console.error('[Tool:detectGranularity] Error:', error.message);
      return {
        granularity: 'topic', // Default fallback
        error: error.message,
      };
    }
  },
  timeout: 2000,
};

/**
 * Tool 3: Get User Progress
 * Retrieves the user's current learning state and active modules
 */
export const getUserProgressTool: AgentTool = {
  name: 'getUserProgress',
  description: 'Get the user\'s current learning progress, including active topics and modules. Use this to understand what they\'re already learning before suggesting new content.',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The user ID to get progress for',
      },
    },
    required: ['userId'],
  },
  async execute({ userId }) {
    try {
      // TODO: Epic 14/15 - Implement proper user progress tracking
      // For now, return stub to enable agent functionality
      // Will be enhanced with proper module/topic assignment tracking
      
      return {
        hasActiveContent: false,
        activeModules: [],
        recentActivity: false,
        message: 'User progress tracking will be implemented in Epic 14 (Manager Module Workflows)',
      };
    } catch (error: any) {
      console.error('[Tool:getUserProgress] Error:', error.message);
      return {
        hasActiveContent: false,
        error: error.message,
      };
    }
  },
  timeout: 5000,
};

/**
 * Tool 4: Generate Content
 * Creates new learning content (triggers content generation workflow)
 */
export const generateContentTool: AgentTool = {
  name: 'generateContent',
  description: 'Generate new learning content for a topic. ONLY use this after user has confirmed they want to learn this specific topic. Do NOT use for meta-requests like "learn something new".',
  parameters: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        description: 'The confirmed topic to generate content for',
      },
      userId: {
        type: 'string',
        description: 'The user ID requesting content',
      },
      granularity: {
        type: 'string',
        description: 'The scope level: subject, topic, or module',
        enum: ['subject', 'topic', 'module'],
      },
    },
    required: ['topic', 'userId'],
  },
  async execute({ topic, userId, granularity = 'topic' }) {
    try {
      // This tool signals that content generation should start
      // The actual generation happens in the content generation workflow
      // For now, return a signal that can be picked up by the API route
      
      return {
        action: 'START_GENERATION',
        topic,
        userId,
        granularity,
        message: `Content generation initiated for: ${topic}`,
      };
    } catch (error: any) {
      console.error('[Tool:generateContent] Error:', error.message);
      return {
        action: 'ERROR',
        error: error.message,
      };
    }
  },
  timeout: 1000,
};

/**
 * Tool 5: Confirm With User
 * Asks the user a clarifying question (should be used sparingly)
 */
export const confirmWithUserTool: AgentTool = {
  name: 'confirmWithUser',
  description: 'Ask the user a clarifying question. Use sparingly - only when you genuinely need more information to proceed. Most questions should be handled naturally in your response.',
  parameters: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: 'The question to ask the user',
      },
      context: {
        type: 'string',
        description: 'Brief context for why you\'re asking',
      },
    },
    required: ['question'],
  },
  async execute({ question, context }) {
    // This tool is somewhat special - it signals to the orchestrator
    // that the agent wants to ask a question
    // The question will be incorporated into the agent's response
    
    return {
      action: 'ASK_QUESTION',
      question,
      context: context || 'Clarification needed',
    };
  },
  timeout: 1000,
};

/**
 * Tool 6: Store Decision
 * Logs important workflow decisions for analytics and debugging
 */
export const storeDecisionTool: AgentTool = {
  name: 'storeDecision',
  description: 'Log an important decision point in the conversation workflow. Use this to track key moments like topic selection, granularity detection, or user corrections.',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The user ID',
      },
      decision: {
        type: 'string',
        description: 'The decision being made (e.g., "user_confirmed_topic", "granularity_detected")',
      },
      data: {
        type: 'object',
        description: 'Additional data about the decision',
      },
    },
    required: ['userId', 'decision'],
  },
  async execute({ userId, decision, data = {} }) {
    try {
      // Store decision point in agent_conversations table with special marker
      await db
        .insert(agentConversations)
        .values({
          userId,
          role: 'system',
          content: `DECISION: ${decision}`,
          toolCalls: data,
          timestamp: new Date(),
          createdAt: new Date(),
        });

      return {
        stored: true,
        decision,
      };
    } catch (error: any) {
      console.error('[Tool:storeDecision] Error:', error.message);
      return {
        stored: false,
        error: error.message,
      };
    }
  },
  timeout: 3000,
};

/**
 * Register all default tools with the orchestrator
 */
export function registerDefaultTools(orchestrator: any): void {
  orchestrator.registerTool(searchTopicsTool);
  orchestrator.registerTool(detectGranularityTool);
  orchestrator.registerTool(getUserProgressTool);
  orchestrator.registerTool(generateContentTool);
  orchestrator.registerTool(confirmWithUserTool);
  orchestrator.registerTool(storeDecisionTool);
  
  console.log('[AgentTools] Registered 6 default tools');
}

