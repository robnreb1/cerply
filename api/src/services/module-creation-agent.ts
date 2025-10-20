/**
 * Epic 14 v2.0: Module Creation Agent (AGENTIC VERSION)
 * Natural conversational AI that helps managers create training modules
 * 
 * ARCHITECTURE: LLM-driven, not keyword matching
 * - Uses GPT-4 for nuanced understanding
 * - Comprehensive system prompt defines personality
 * - Loop-guard prevents repeated questions
 * - Infers context intelligently
 */

import { query, single } from '../db';
import { callJSON } from '../11m/run';
import crypto from 'crypto';

export interface ConversationTurn {
  role: 'manager' | 'agent';
  content: string;
  uploadedContent?: UploadedFileInfo[];
  suggestions?: string[];
  modulePreview?: ModulePreview;
  timestamp: Date;
}

export interface UploadedFileInfo {
  id: string;
  fileName: string;
  fileType: string;
  summary?: string;
  extractedText?: string;
}

export interface ModuleCreationContext {
  conversationHistory: ConversationTurn[];
  managerId: string;
  organizationId: string;
  conversationId?: string;
}

export interface AgentResponse {
  message: string;
  suggestions: string[];
  modulePreview?: ModulePreview;
  readyToCreate: boolean;
  needsMoreInfo: boolean;
}

export interface ModulePreview {
  title: string;
  description: string;
  targetMasteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';
  startingLevel?: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  contentBlocks: ContentBlock[];
  targetProficiencyPct: number;
  suggestedDeadline?: string;
}

export interface ContentBlock {
  title: string;
  type: 'text' | 'video' | 'document' | 'simulation' | 'quiz';
  source: 'proprietary' | 'ai_generated' | 'public_web';
  content: string;
  isRingFenced: boolean;
  orderIndex: number;
}

// ============================================================================
// SYSTEM PROMPT: Defines Agent Personality & Behavior
// ============================================================================

const MANAGER_MODULE_CREATION_SYSTEM_PROMPT = `You are Cerply, an expert instructional designer and learning consultant for managers.

About you:
- You help managers create effective training modules for their teams
- You understand both proprietary (company-specific) and public content
- You adapt to the manager's domain (sales, engineering, leadership, compliance, etc.)
- You're conversational and natural, not form-based or robotic
- You feel like working with an expert consultant, not filling out a database form

Your role:
1. **Understand the training need through natural conversation**
   Required information:
   - What topic/skill needs to be trained?
   - Who is the target audience (experience level, role)?
   - What's the deadline/urgency for proficiency?
   - Does the manager have proprietary content to include?
   
2. **Be adaptive and intelligent, not rigid**
   - DON'T ask all questions at once (feels like a form)
   - DO infer from context when possible
   - Example: If manager says "I need to train my sales team on our new pricing model"
     * You already know: Topic = pricing, Audience = sales team
     * You can infer: They likely have proprietary pricing docs
     * Only ask: "Do you have internal pricing documents you'd like me to use as the foundation?"
   
3. **Avoid repeating questions**
   - If the manager already mentioned something, don't ask again
   - If context is clear, don't ask obvious questions
   - Review the full conversation history before asking anything
   
4. **When you have enough information, generate a module preview**
   Required: topic, target_audience (experience level), deadline
   Optional: proprietary_content (if not provided, use public research)
   
   Include:
   - Title (clear, specific)
   - Target mastery level (beginner/intermediate/advanced/expert/master)
   - Content structure (3-6 sections)
   - Mark proprietary vs public content clearly
   - Estimated time (based on section count)
   - Target proficiency % (70-95% based on difficulty)
   
5. **Handle refinements naturally**
   - "Add a section on X" → update preview and show changes
   - "Make it shorter" → adjust scope and explain
   - "Focus more on beginners" → retarget and regenerate
   
6. **Be encouraging and collaborative**
   - Use "we" language ("Let's build this together")
   - Acknowledge good ideas ("Great idea! That will really help...")
   - Show enthusiasm ("This is going to be excellent for your team")
   - Be warm and human

Conversation Guidelines:
- Ask a MAXIMUM of 2 clarifying questions at a time
- If you have enough info to generate a preview, DO IT (don't keep asking)
- Be brief and conversational (not verbose)
- Reference previous context naturally

Format your response as JSON:
{
  "response_type": "clarify" | "preview" | "refine" | "confirm",
  "message": "your natural, conversational response to the manager",
  "clarifying_questions": ["question1", "question2"] (optional, max 2),
  "module_preview": {
    "title": "...",
    "description": "...",
    "target_mastery_level": "intermediate",
    "starting_level": "beginner" (optional),
    "estimated_minutes": 45,
    "target_proficiency_pct": 80,
    "suggested_deadline": "2025-11-15T00:00:00Z" (ISO string, if deadline mentioned),
    "content_blocks": [
      {
        "title": "Section title",
        "type": "text|video|document|simulation|quiz",
        "source": "proprietary|ai_generated|public_web",
        "content": "Brief description of what this section covers",
        "is_ring_fenced": true,
        "order_index": 0
      }
    ]
  } (include when ready to create),
  "suggestions": ["Upload Documents", "Generate Preview", "Refine"] (optional UI action buttons)
}

Example Conversation Flow:

Manager: "I need to train my sales team on our new product pricing model"

Agent (Good - Infers Context):
{
  "response_type": "clarify",
  "message": "Great! I'll help you create pricing training for your sales team. A few quick questions:\\n\\n1. Do you have internal pricing documents I should use as the foundation? (Product sheets, pricing decks, etc.)\\n2. What's your team's current experience level with pricing? Are they new to sales or experienced sellers?",
  "clarifying_questions": ["Do you have internal pricing documents?", "What's your team's experience level?"],
  "suggestions": ["Upload Documents", "Describe Experience Level"]
}

Manager: "They're experienced sellers, I'll upload our pricing deck. Need them proficient by January 15th."

Agent (Good - Has Enough Info, Generates Preview):
{
  "response_type": "preview",
  "message": "Perfect! I've created a comprehensive pricing training module for your experienced sales team. Here's the structure:\\n\\n**New Product Pricing Mastery**\\nTarget: Intermediate → Advanced\\nDeadline: January 15, 2026 (85% proficiency)\\nEstimated: 50 minutes\\n\\nWhat would you like to do next?",
  "module_preview": {
    "title": "New Product Pricing Mastery",
    "description": "Comprehensive training on new product pricing model for experienced sales professionals",
    "target_mastery_level": "advanced",
    "starting_level": "intermediate",
    "estimated_minutes": 50,
    "target_proficiency_pct": 85,
    "suggested_deadline": "2026-01-15T00:00:00Z",
    "content_blocks": [
      {
        "title": "Your Pricing Model (Proprietary)",
        "type": "document",
        "source": "proprietary",
        "content": "Internal pricing deck and product tiers",
        "is_ring_fenced": true,
        "order_index": 0
      },
      {
        "title": "Competitive Positioning",
        "type": "text",
        "source": "public_web",
        "content": "Industry benchmarking and competitor analysis",
        "is_ring_fenced": false,
        "order_index": 1
      },
      {
        "title": "Pricing Objection Handling",
        "type": "simulation",
        "source": "ai_generated",
        "content": "Interactive scenarios for common objections",
        "is_ring_fenced": false,
        "order_index": 2
      },
      {
        "title": "Discount Authority & Escalation",
        "type": "text",
        "source": "ai_generated",
        "content": "When to discount and when to escalate",
        "is_ring_fenced": false,
        "order_index": 3
      },
      {
        "title": "Knowledge Assessment",
        "type": "quiz",
        "source": "ai_generated",
        "content": "Adaptive quiz covering all pricing scenarios",
        "is_ring_fenced": false,
        "order_index": 4
      }
    ]
  },
  "suggestions": ["Refine Further", "Assign to Team", "Save as Draft"]
}

Manager: "Add a section on enterprise custom pricing requests"

Agent (Good - Refines Naturally):
{
  "response_type": "refine",
  "message": "Great addition! I've added a new section on enterprise custom pricing. This will cover:\\n\\n• Decision framework for custom quotes\\n• Approval workflow and escalation paths\\n• Best practices from successful enterprise deals\\n\\nThe module is now 6 sections, estimated 60 minutes. What else would you like to adjust?",
  "module_preview": { /* updated with new section */ },
  "suggestions": ["Looks Good - Save", "Refine More", "Assign to Team"]
}`;

// ============================================================================
// LOOP-GUARD: Prevent Repeated Questions
// ============================================================================

const recentQuestions = new Map<string, Set<string>>();
const QUESTION_MEMORY_MS = 600000; // 10 minutes

/**
 * Loop-guard: Checks if we've already asked a similar question in this conversation
 * Based on api/src/routes/chat.ts fingerprint pattern
 */
function hasAskedBefore(conversationId: string, question: string, conversationHistory: ConversationTurn[]): boolean {
  // Get questions from agent turns
  const agentQuestions = conversationHistory
    .filter(t => t.role === 'agent')
    .map(t => t.content.toLowerCase());
  
  const questionLower = question.toLowerCase();
  
  // Check exact substring match
  for (const prevQ of agentQuestions) {
    if (prevQ.includes(questionLower) || questionLower.includes(prevQ.substring(0, 50))) {
      return true;
    }
  }
  
  // Check semantic similarity (word overlap)
  const qWords = new Set(questionLower.split(/\s+/).filter(w => w.length > 3));
  for (const prevQ of agentQuestions) {
    const prevWords = new Set(prevQ.split(/\s+/).filter(w => w.length > 3));
    const intersection = new Set([...qWords].filter(w => prevWords.has(w)));
    const similarity = intersection.size / Math.max(qWords.size, prevWords.size);
    
    if (similarity > 0.5) { // 50% word overlap = too similar
      return true;
    }
  }
  
  return false;
}

/**
 * Filter out questions we've already asked
 */
function filterRepeatedQuestions(
  conversationId: string,
  questions: string[],
  conversationHistory: ConversationTurn[]
): string[] {
  return questions.filter(q => !hasAskedBefore(conversationId, q, conversationHistory));
}

// ============================================================================
// MAIN AGENT ENTRY POINT
// ============================================================================

/**
 * Main entry point for module creation agent
 * Uses LLM-driven understanding, not keyword matching
 */
export async function moduleCreationAgent(ctx: ModuleCreationContext): Promise<AgentResponse> {
  const llmEnabled = !!process.env.OPENAI_API_KEY;
  
  if (!llmEnabled) {
    // Fallback: Basic heuristic (for environments without LLM)
    return fallbackHeuristicAgent(ctx);
  }
  
  try {
    // Build conversation history for LLM
    const messages = ctx.conversationHistory.map(t => ({
      role: t.role === 'manager' ? 'user' as const : 'assistant' as const,
      content: t.content,
    }));
    
    // Check if there are uploaded files in the latest manager message
    const latestManagerTurn = [...ctx.conversationHistory].reverse().find(t => t.role === 'manager');
    const hasUploadedFiles = latestManagerTurn?.uploadedContent && latestManagerTurn.uploadedContent.length > 0;
    
    // Add uploaded file context if present
    let userMessage = messages[messages.length - 1]?.content || '';
    if (hasUploadedFiles && latestManagerTurn) {
      const fileList = latestManagerTurn.uploadedContent!.map(f => `- ${f.fileName} (${f.fileType})`).join('\n');
      userMessage += `\n\n[Manager uploaded files:\n${fileList}]`;
      messages[messages.length - 1].content = userMessage;
    }
    
    // Call LLM with full conversation context
    const response = await callJSON({
      system: MANAGER_MODULE_CREATION_SYSTEM_PROMPT,
      user: userMessage,
      model: process.env.LLM_PLANNER_MODEL || 'gpt-4o', // Use capable model
    });
    
    const parsed = response as any;
    
    // Apply loop-guard to filter repeated questions
    if (parsed.clarifying_questions && parsed.clarifying_questions.length > 0) {
      const filtered = filterRepeatedQuestions(
        ctx.conversationId || 'unknown',
        parsed.clarifying_questions,
        ctx.conversationHistory
      );
      
      // If we filtered out all questions, force generate preview
      if (filtered.length === 0 && parsed.response_type === 'clarify') {
        // We've asked everything - generate preview instead
        parsed.response_type = 'preview';
        parsed.message = "I have all the information I need. Let me generate a module preview for you...";
        parsed.clarifying_questions = [];
        
        // If no module_preview in response, create a basic one
        if (!parsed.module_preview) {
          parsed.module_preview = await generateBasicModulePreview(ctx);
        }
      } else {
        parsed.clarifying_questions = filtered;
      }
    }
    
    // Convert snake_case to camelCase for TypeScript
    const modulePreview = parsed.module_preview ? {
      title: parsed.module_preview.title,
      description: parsed.module_preview.description,
      targetMasteryLevel: parsed.module_preview.target_mastery_level,
      startingLevel: parsed.module_preview.starting_level,
      estimatedMinutes: parsed.module_preview.estimated_minutes,
      targetProficiencyPct: parsed.module_preview.target_proficiency_pct || 80,
      suggestedDeadline: parsed.module_preview.suggested_deadline,
      contentBlocks: (parsed.module_preview.content_blocks || []).map((b: any) => ({
        title: b.title,
        type: b.type,
        source: b.source,
        content: b.content,
        isRingFenced: b.is_ring_fenced,
        orderIndex: b.order_index,
      })),
    } : undefined;
    
    return {
      message: parsed.message,
      suggestions: parsed.suggestions || [],
      modulePreview,
      readyToCreate: parsed.response_type === 'preview' || parsed.response_type === 'confirm',
      needsMoreInfo: parsed.response_type === 'clarify',
    };
  } catch (error: any) {
    console.error('[Module Creation Agent] LLM error:', error);
    // Fallback to heuristic if LLM fails
    return fallbackHeuristicAgent(ctx);
  }
}

/**
 * Generate a basic module preview from conversation context
 * Used when LLM doesn't provide one but should
 */
async function generateBasicModulePreview(ctx: ModuleCreationContext): Promise<any> {
  // Extract basic info from conversation
  const topic = extractTopicFromConversation(ctx.conversationHistory);
  const hasProprietaryContent = ctx.conversationHistory.some(t => 
    t.uploadedContent && t.uploadedContent.length > 0
  );
  
  const contentBlocks: any[] = [];
  let orderIndex = 0;
  
  // Add proprietary content if uploaded
  if (hasProprietaryContent) {
    contentBlocks.push({
      title: `Your ${topic} Materials (Proprietary)`,
      type: 'document',
      source: 'proprietary',
      content: 'Manager-uploaded company-specific content',
      is_ring_fenced: true,
      order_index: orderIndex++,
    });
  }
  
  // Add standard sections
  contentBlocks.push(
    {
      title: `Introduction to ${topic}`,
      type: 'text',
      source: 'ai_generated',
      content: 'Overview and learning objectives',
      is_ring_fenced: false,
      order_index: orderIndex++,
    },
    {
      title: 'Core Concepts and Techniques',
      type: 'text',
      source: 'ai_generated',
      content: 'Key principles and methods',
      is_ring_fenced: false,
      order_index: orderIndex++,
    },
    {
      title: 'Practical Application',
      type: 'simulation',
      source: 'ai_generated',
      content: 'Interactive scenarios and examples',
      is_ring_fenced: false,
      order_index: orderIndex++,
    },
    {
      title: 'Knowledge Assessment',
      type: 'quiz',
      source: 'ai_generated',
      content: 'Adaptive assessment',
      is_ring_fenced: false,
      order_index: orderIndex++,
    }
  );
  
  return {
    title: `${topic.charAt(0).toUpperCase() + topic.slice(1)} Training`,
    description: `Comprehensive training module on ${topic}`,
    target_mastery_level: 'intermediate',
    estimated_minutes: contentBlocks.length * 10,
    target_proficiency_pct: 80,
    content_blocks: contentBlocks,
  };
}

/**
 * Extract topic from conversation (simple heuristic fallback)
 */
function extractTopicFromConversation(history: ConversationTurn[]): string {
  const firstManager = history.find(t => t.role === 'manager');
  if (!firstManager) return 'Training Module';
  
  // Simple extraction: take first 5 words after common verbs
  const content = firstManager.content;
  const match = content.match(/\b(?:train|teach|learn|about|on)\s+(.{10,50})/i);
  if (match) {
    return match[1].split('.')[0].trim();
  }
  
  return 'Training Module';
}

/**
 * Fallback heuristic agent (when LLM not available)
 * Provides basic functionality
 */
function fallbackHeuristicAgent(ctx: ModuleCreationContext): AgentResponse {
  const latestManager = [...ctx.conversationHistory].reverse().find(t => t.role === 'manager');
  const turnCount = ctx.conversationHistory.filter(t => t.role === 'manager').length;
  
  // First turn: ask about topic
  if (turnCount === 1) {
    return {
      message: "I'll help you create a training module! Could you tell me:\n\n1. What topic do you want to train your team on?\n2. What's their current experience level?",
      suggestions: ['Sales skills', 'Technical training', 'Leadership'],
      readyToCreate: false,
      needsMoreInfo: true,
    };
  }
  
  // Second turn: ask about deadline
  if (turnCount === 2) {
    return {
      message: "Great! When do you need your team to be proficient? (This helps me set the right pace)",
      suggestions: ['1 week', '2 weeks', '1 month'],
      readyToCreate: false,
      needsMoreInfo: true,
    };
  }
  
  // Third turn: generate basic preview
  const topic = extractTopicFromConversation(ctx.conversationHistory);
  return {
    message: `Perfect! I've created a training module on ${topic}. This includes 4 core sections covering fundamentals through practical application.`,
    suggestions: ['Save as Draft', 'Refine', 'Assign to Team'],
    modulePreview: {
      title: `${topic.charAt(0).toUpperCase() + topic.slice(1)} Training`,
      description: `Training module on ${topic}`,
      targetMasteryLevel: 'intermediate',
      estimatedMinutes: 40,
      targetProficiencyPct: 80,
      contentBlocks: [
        {
          title: 'Introduction',
          type: 'text',
          source: 'ai_generated',
          content: 'Overview',
          isRingFenced: false,
          orderIndex: 0,
        },
        {
          title: 'Core Concepts',
          type: 'text',
          source: 'ai_generated',
          content: 'Key principles',
          isRingFenced: false,
          orderIndex: 1,
        },
        {
          title: 'Practical Application',
          type: 'simulation',
          source: 'ai_generated',
          content: 'Interactive scenarios',
          isRingFenced: false,
          orderIndex: 2,
        },
        {
          title: 'Assessment',
          type: 'quiz',
          source: 'ai_generated',
          content: 'Knowledge check',
          isRingFenced: false,
          orderIndex: 3,
        },
      ],
    },
    readyToCreate: true,
    needsMoreInfo: false,
  };
}

/**
 * Helper: Get difficulty number from label
 */
export function getDifficultyNumber(level: string): number {
  const map: Record<string, number> = {
    'beginner': 1,
    'intermediate': 2,
    'advanced': 3,
    'expert': 4,
    'master': 5,
  };
  return map[level.toLowerCase()] || 2;
}

/**
 * Helper: Get difficulty label from number
 */
export function getDifficultyLabel(level: number): string {
  const map: Record<number, string> = {
    1: 'beginner',
    2: 'intermediate',
    3: 'advanced',
    4: 'expert',
    5: 'master',
  };
  return map[level] || 'intermediate';
}
