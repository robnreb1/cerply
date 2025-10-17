/**
 * Agent Orchestrator Service
 * Epic 13: AI Agent Architecture with Tool Calling
 * 
 * Replaces pattern-based intent detection with intelligent agent routing.
 * Agent interprets natural language, calls appropriate tools, and synthesizes responses.
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionMessageToolCall as OpenAIToolCall } from 'openai/resources/chat/completions';

export interface ToolCall {
  toolName: string;
  parameters: any;
  result: any;
  timestamp: string;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: any;
  execute: (params: any) => Promise<any>;
  timeout?: number;
}

// Forward declaration for AgentMemory (will be resolved at runtime)
class AgentMemory {
  async storeMessage(userId: string, role: string, content: string): Promise<void> { }
  async getConversationHistory(userId: string, limit: number): Promise<any[]> { return []; }
  async storeToolCall(userId: string, toolName: string, params: any, result: any, time: number, error?: string): Promise<void> { }
  async clearConversation(userId: string): Promise<void> { }
}

// Lazy OpenAI client initialization
let _openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required for agent orchestrator');
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string; // Required for role: 'tool' messages
}

export interface AgentResponse {
  message: string;
  toolCalls: ToolCall[];
  conversationHistory: AgentMessage[];
  metadata?: {
    iterations: number;
    model: string;
    totalTime: number;
  };
}

export class AgentOrchestrator {
  private tools: Map<string, AgentTool> = new Map();
  private memory: AgentMemory;
  private model: string;
  private maxIterations: number;

  constructor() {
    // Dynamically import AgentMemory to avoid circular dependency
    const { AgentMemory: RealAgentMemory } = require('./agent-memory');
    this.memory = new RealAgentMemory();
    this.model = process.env.AGENT_LLM_MODEL || 'gpt-4o';
    this.maxIterations = parseInt(process.env.AGENT_MAX_ITERATIONS || '5', 10);
  }

  /**
   * Register a tool that the agent can use
   */
  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
    console.log(`[Agent] Registered tool: ${tool.name}`);
  }

  /**
   * Main chat method - processes user input with full agent reasoning
   */
  async chat(
    userId: string,
    userMessage: string,
    conversationHistory: AgentMessage[] = []
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    // Get recent conversation history from memory (last 6 messages)
    const recentHistory = await this.memory.getConversationHistory(userId, 6);
    
    // Append new user message
    conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    // Store user message in memory
    await this.memory.storeMessage(userId, 'user', userMessage);

    const toolCalls: ToolCall[] = [];
    let agentResponse = '';
    let iterations = 0;

    // Agent reasoning loop (max 5 iterations to prevent infinite loops)
    for (iterations = 0; iterations < this.maxIterations; iterations++) {
      try {
        const systemPrompt = this.getSystemPrompt();
        
        // Build messages for OpenAI
        // Preserve tool_call_id for role='tool' and tool_calls for role='assistant'
        const messages: ChatCompletionMessageParam[] = [
          { role: 'system', content: systemPrompt },
          ...recentHistory.map((msg: any) => {
            const base: any = { role: msg.role, content: msg.content };
            if (msg.role === 'tool' && msg.tool_call_id) base.tool_call_id = msg.tool_call_id;
            if (msg.role === 'assistant' && msg.tool_calls) base.tool_calls = msg.tool_calls;
            return base;
          }),
          ...conversationHistory.map((msg: any) => {
            const base: any = { role: msg.role, content: msg.content };
            if (msg.role === 'tool' && msg.tool_call_id) base.tool_call_id = msg.tool_call_id;
            if (msg.role === 'assistant' && msg.tool_calls) base.tool_calls = msg.tool_calls;
            return base;
          }),
        ];

        const client = getOpenAIClient();
        const completion = await client.chat.completions.create({
          model: this.model,
          messages,
          tools: this.getToolDefinitions(),
          tool_choice: 'auto',
          temperature: 0.3, // Lower temperature for more consistent, professional responses
          max_tokens: 2000,
        });

        const message = completion.choices[0].message;

        // No more tool calls - agent has final response
        if (!message.tool_calls || message.tool_calls.length === 0) {
          agentResponse = message.content || '';
          break;
        }

        // Execute tool calls
        const toolResults: Array<{ tool_call_id: string; content: string }> = [];
        
        for (const toolCall of message.tool_calls) {
          const result = await this.executeToolCall(userId, toolCall);
          const toolCallTyped = toolCall as any; // OpenAI types vary by version
          toolCalls.push({
            toolName: toolCallTyped.function?.name || toolCallTyped.name,
            parameters: JSON.parse(toolCallTyped.function?.arguments || toolCallTyped.arguments || '{}'),
            result,
            timestamp: new Date().toISOString(),
          });

          toolResults.push({
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }

        // Add assistant message with tool calls to conversation
        conversationHistory.push({
          role: 'assistant',
          content: message.content || '',
          tool_calls: message.tool_calls as any, // OpenAI tool call format
        });

        // Add tool results to conversation as 'tool' messages with IDs
        // This follows OpenAI's function calling API specification
        for (const toolResult of toolResults) {
          conversationHistory.push({
            role: 'tool',
            tool_call_id: toolResult.tool_call_id,
            content: toolResult.content,
          });
        }

        // Continue loop to let agent process tool results
      } catch (error: any) {
        console.error(`[Agent] Error in iteration ${iterations}:`, error.message);
        
        // If we're out of iterations or hit a critical error, fall back to graceful response
        if (iterations >= this.maxIterations - 1) {
          agentResponse = "I apologize, I'm having trouble processing that request at the moment. Could you rephrase or try something simpler?";
          break;
        }
        
        throw error;
      }
    }

    // Store assistant response in memory
    if (agentResponse) {
      await this.memory.storeMessage(userId, 'assistant', agentResponse);
    }

    const totalTime = Date.now() - startTime;

    return {
      message: agentResponse,
      toolCalls,
      conversationHistory,
      metadata: {
        iterations,
        model: this.model,
        totalTime,
      },
    };
  }

  /**
   * Get system prompt that defines agent personality and tool usage guidelines
   */
  private getSystemPrompt(): string {
    return `You are Cerply, an intelligent learning assistant.

YOUR PERSONALITY:
- Well-spoken, understated, concise (Hugh Grant style)
- Professional but warm
- Never enthusiastic or sycophantic
- Use simple language, avoid jargon
- Keep responses brief (2-3 sentences maximum)

YOUR TOOLS:
1. searchTopics(query) - Find existing learning content in our library
2. detectGranularity(input) - Classify input as subject/topic/module
3. getUserProgress(userId) - See what user is currently learning
4. generateContent(topic, userId) - Create new learning materials
5. confirmWithUser(question) - Ask for clarification (use sparingly)
6. storeDecision(userId, decision) - Log important workflow decisions

HOW TO USE TOOLS:

When user wants to learn something new:
1. Call detectGranularity(input) to understand scope
2. If SUBJECT (broad like "physics"): Guide them to a specific topic with natural questions
3. If TOPIC (specific like "quantum mechanics"): Call searchTopics(query), then confirm with user
4. If MODULE (very specific): Aggregate to parent topic level

When user says meta-phrases ("learn something new", "try something else", "pick something"):
- DO NOT call generateContent - this is a restart request
- Simply ask: "What would you like to learn?" (vary phrasing naturally)
- Never treat phrases like "something new" as actual topics

When user confirms ("yes", "sounds good", "it is", "that's right", "perfect"):
- Call generateContent(topic, userId)
- Respond naturally: "Thank you. I'm putting that together now." (vary phrasing)

When user provides correction ("no, I meant physics", "actually chemistry"):
- Extract the corrected topic
- Start over with the new topic (call detectGranularity again)

CRITICAL RULES:
- Always consider full conversation context (last 6 messages are provided)
- Interpret affirmatives flexibly - "it is", "that's right", "sounds great" all mean yes
- Never treat meta-requests as topics (e.g., "something new" is NOT a topic about novelty)
- Use natural, varied language - never use templates
- Call tools when you need information - don't guess
- Keep responses concise and professional
- If user is refining, acknowledge briefly and continue the conversation naturally

CONVERSATION DEPTH AWARENESS:
- First interaction: More formal, provide helpful context
- After refinement: Brief, conversational acknowledgments ("Right", "Got it", "Makes sense")
- Don't repeat yourself - if you're already in a conversation, be natural and brief

Remember: You have tools to help you. Use them intelligently based on the situation.`;
  }

  /**
   * Get OpenAI function definitions for all registered tools
   */
  private getToolDefinitions(): OpenAI.ChatCompletionTool[] {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Execute a tool call and return the result
   */
  private async executeToolCall(
    userId: string,
    toolCall: any
  ): Promise<any> {
    const startTime = Date.now();
    const toolName = toolCall.function?.name || toolCall.name;
    const tool = this.tools.get(toolName);

    if (!tool) {
      const error = `Unknown tool: ${toolName}`;
      console.error(`[Agent] ${error}`);
      await this.memory.storeToolCall(userId, toolName, {}, null, Date.now() - startTime, error);
      return { error };
    }

    try {
      const params = JSON.parse(toolCall.function?.arguments || toolCall.arguments || '{}');
      
      // Add userId to params if not present (tools need context)
      const paramsWithUser = { ...params, userId };

      console.log(`[Agent] Executing tool: ${toolName}`, paramsWithUser);
      
      // Execute tool with timeout (10 seconds default)
      const timeout = tool.timeout || 10000;
      const result = await Promise.race([
        tool.execute(paramsWithUser),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Tool execution timeout')), timeout)
        ),
      ]);

      const executionTime = Date.now() - startTime;
      
      // Store successful tool call in memory
      await this.memory.storeToolCall(userId, toolName, params, result, executionTime);

      console.log(`[Agent] Tool ${toolName} completed in ${executionTime}ms`);
      return result;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error.message || 'Unknown error';
      
      console.error(`[Agent] Tool ${toolName} failed:`, errorMessage);
      
      // Store failed tool call in memory
      await this.memory.storeToolCall(userId, toolName, {}, null, executionTime, errorMessage);

      return { error: errorMessage };
    }
  }

  /**
   * Clear conversation history for a user (reset)
   */
  async reset(userId: string): Promise<void> {
    await this.memory.clearConversation(userId);
    console.log(`[Agent] Reset conversation for user: ${userId}`);
  }

  /**
   * Get conversation history for a user
   */
  async getHistory(userId: string, limit: number = 20): Promise<AgentMessage[]> {
    return this.memory.getConversationHistory(userId, limit);
  }
}

// Singleton instance
let _orchestrator: AgentOrchestrator | null = null;

export function getAgentOrchestrator(): AgentOrchestrator {
  if (!_orchestrator) {
    _orchestrator = new AgentOrchestrator();
  }
  return _orchestrator;
}

