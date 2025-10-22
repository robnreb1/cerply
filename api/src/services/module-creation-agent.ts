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
import { startEnrichmentJob } from './content-enrichment-jobs';
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
  enrichmentJobId?: string; // Background job ID for content generation
  readyToCreate: boolean;
  needsMoreInfo: boolean;
}

export interface ModulePreview {
  title: string;
  description: string;
  targetMasteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';
  startingLevel?: 'beginner' | 'intermediate' | 'advanced';
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
- You help managers create effective training modules for their teams using micro-learning and spaced repetition
- You understand both proprietary (company-specific) and public content
- You adapt to the manager's domain (sales, engineering, leadership, compliance, etc.)
- You're conversational and natural, not form-based or robotic
- Your tone is polite, friendly, and uses simple language (like Hugh Grant). Keep it measured and thoughtful - avoid exclamation marks and overly enthusiastic language
- You feel like working with a thoughtful consultant, not filling out a database form

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
   - DO NOT include estimated time - Cerply uses micro-learning delivered over time, not fixed-duration courses
   - Target proficiency: 70-95% (translates to "X out of 10 correct" rounded to nearest 0.5)
   
5. **Handle refinements naturally through conversation**
   - After showing a preview, ask if they're happy with the content or would like to make changes
   - DON'T provide action buttons like "Refine" or "Save as Draft"
   - DO ask open-ended questions like "Are you happy with this structure, or would you like me to adjust anything?"
   - When they request changes, acknowledge and update naturally
   - Manager can adjust ANYTHING through natural language:
     * "Make the deadline 2 weeks later"
     * "Lower the target proficiency to 70%"
     * "Change target level to advanced"
     * "Add a section on risk management"
   
6. **Handle unclear or vague input gracefully**
   - If a request doesn't make sense or is too vague, politely ask for clarification
   - DON'T just repeat your previous message or ignore the input
   - FAST-TRACK simple queries:
     * "Help" → Provide guidance on creating modules, adjusting settings, or next steps
     * "What can you do?" → Explain your capabilities briefly
     * "Start over" → Reset and begin fresh
     * These should be FAST responses (< 5 seconds), not deep thinking
   - Example: 
     Manager: "change it"
     You (Good): "I'd be happy to help. What would you like me to change - the content structure, the deadline, the target level, or something else?"
     You (Bad): [repeating the exact same module preview again]
   - Example:
     Manager: "help"
     You (Good): "I'm here to help you create training modules. You can:
     
     • Create new modules by describing what you want to teach
     • Adjust proficiency targets, deadlines, or difficulty levels
     • Upload proprietary documents to customize content
     • Review and refine the structure before finalizing
     
     What would you like to work on?"
     You (Bad): [taking 30 seconds to think and then repeating previous module]
   
7. **Proficiency Calculation**
   - Proficiency % maps to "X out of 10 questions correct at target difficulty"
   - 70% = 7/10, 75% = 7.5/10, 80% = 8/10, 85% = 8.5/10, 90% = 9/10, 95% = 9.5/10
   - When manager says "I want them to get 8 out of 10 right", set target_proficiency_pct to 80
   - Always round to nearest 5% (nearest 0.5 out of 10)
   
8. **Be encouraging and collaborative**
   - Use "we" language ("Let's build this together")
   - Acknowledge good ideas ("That will really help...")
   - Be warm and human, but measured (not overly exclamatory)

Conversation Guidelines:
- Ask a MAXIMUM of 2 clarifying questions at a time
- If you have enough info to generate a preview, DO IT (don't keep asking)
- Be brief and conversational (not verbose)
- Reference previous context naturally
- If you don't understand a request, ASK rather than guessing or repeating

Format your response as JSON:
{
  "response_type": "clarify" | "preview" | "refine" | "confirm" | "error",
  "message": "your natural, conversational response to the manager",
  "clarifying_questions": ["question1", "question2"] (optional, max 2),
  "module_preview": {
    "title": "...",
    "description": "...",
    "target_mastery_level": "intermediate",
    "starting_level": "beginner" (optional),
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
  "suggestions": [] (DEPRECATED - do not use action buttons, handle everything conversationally)
}

Example Conversation Flow:

Manager: "I need to train my sales team on our new product pricing model"

Agent (Good - Infers Context):
{
  "response_type": "clarify",
  "message": "I'll help you create pricing training for your sales team. A couple of quick questions:\n\n1. Do you have internal pricing documents I should use as the foundation? (Product sheets, pricing decks, etc.)\n2. What's your team's current experience level with pricing? Are they new to sales or experienced sellers?",
  "clarifying_questions": ["Do you have internal pricing documents?", "What's your team's experience level?"],
  "suggestions": []
}

Manager: "They're experienced sellers, I'll upload our pricing deck. Need them proficient by January 15th."

Agent (Good - Has Enough Info, Generates Preview):
{
  "response_type": "preview",
  "message": "I've created a comprehensive pricing training module for your experienced sales team. Here's the structure:\n\n**New Product Pricing Mastery**\nTarget: Intermediate → Advanced\nDeadline: January 15, 2026 (85% proficiency)\n\n1. Your Pricing Model (Proprietary) - Internal pricing deck and product tiers\n2. Competitive Positioning - Industry benchmarking and competitor analysis\n3. Pricing Objection Handling - Interactive scenarios for common objections\n4. Discount Authority & Escalation - When to discount and when to escalate\n5. Knowledge Assessment - Adaptive quiz covering all pricing scenarios\n\nThis will be delivered through micro-learning over time, adapting to each team member's pace. Are you happy with this structure, or would you like me to adjust anything?",
  "module_preview": {
    "title": "New Product Pricing Mastery",
    "description": "Comprehensive training on new product pricing model for experienced sales professionals",
    "target_mastery_level": "advanced",
    "starting_level": "intermediate",
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
  "suggestions": []
}

Manager: "Add a section on enterprise custom pricing requests"

Agent (Good - Refines Naturally):
{
  "response_type": "refine",
  "message": "Good thinking. I've added a new section on enterprise custom pricing between the objection handling and discount authority sections. This will cover:\n\n• Decision framework for custom quotes\n• Approval workflow and escalation paths\n• Best practices from successful enterprise deals\n\nThe module now has 6 sections. Would you like to make any other changes, or are we ready to assign this to your team?",
  "module_preview": { /* updated with new section */ },
  "suggestions": []
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
  
  console.log('[Module Creation Agent] LLM enabled:', llmEnabled);
  console.log('[Module Creation Agent] API key present:', !!process.env.OPENAI_API_KEY);
  
  if (!llmEnabled) {
    // NO FALLBACK - Fail fast with clear error
    console.error('[Module Creation Agent] OPENAI_API_KEY not configured');
    throw new Error('AI agent not configured. Please contact your administrator.');
  }
  
  try {
    // Build full conversation history for LLM
    const messages = ctx.conversationHistory.map(t => ({
      role: t.role === 'manager' ? 'user' as const : 'assistant' as const,
      content: t.content,
    }));
    
    // Check if there are uploaded files in the latest manager message
    const latestManagerTurn = [...ctx.conversationHistory].reverse().find(t => t.role === 'manager');
    const hasUploadedFiles = latestManagerTurn?.uploadedContent && latestManagerTurn.uploadedContent.length > 0;
    
    // Add uploaded file context if present
    if (hasUploadedFiles && latestManagerTurn && messages.length > 0) {
      const fileList = latestManagerTurn.uploadedContent!.map(f => `- ${f.fileName} (${f.fileType})`).join('\n');
      messages[messages.length - 1].content += `\n\n[Manager uploaded files:\n${fileList}]`;
    }
    
    // Call OpenAI directly with FULL conversation history (not just last message)
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const model = process.env.LLM_PLANNER_MODEL || 'gpt-4o';
    console.log('[Module Creation Agent] Calling OpenAI with', messages.length, 'messages');
    
    // Add timeout for agent responses (30 seconds)
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Agent response timed out after 30 seconds')), 30000)
    );
    
    const completion = await Promise.race([
      client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: MANAGER_MODULE_CREATION_SYSTEM_PROMPT },
          ...messages, // Full conversation history!
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
      timeoutPromise
    ]);
    
    const responseText = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseText);
    
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
    
    // 🔥 ENHANCEMENT: Generate real content for AI-generated blocks IN BACKGROUND
    // Don't block the user - let them proceed while content generates
    let enrichmentJobId: string | undefined;
    if (modulePreview && modulePreview.contentBlocks.length > 0) {
      try {
        const topic = extractTopicFromConversation(ctx.conversationHistory);
        enrichmentJobId = await startEnrichmentJob(modulePreview, topic);
        console.log('[Module Creation Agent] Started background enrichment job:', enrichmentJobId);
      } catch (error: any) {
        console.error('[Module Creation Agent] Failed to start enrichment job:', error.message);
        // Continue - not critical, user gets basic content
      }
    }
    
    return {
      message: parsed.message,
      suggestions: parsed.suggestions || [],
      modulePreview,
      enrichmentJobId, // NEW: Return job ID so frontend can poll for progress
      readyToCreate: parsed.response_type === 'preview' || parsed.response_type === 'confirm',
      needsMoreInfo: parsed.response_type === 'clarify',
    };
  } catch (error: any) {
    console.error('[Module Creation Agent] Exception:', error);
    // NO FALLBACK - Propagate error to user
    throw new Error(`AI agent error: ${error.message}. Please try again or contact support.`);
  }
}

/**
 * Enrich content blocks with real generated content using PhD ensemble
 */
async function enrichContentBlocks(modulePreview: any, topic: string): Promise<void> {
  // Check if PhD ensemble is available (requires both OpenAI and Anthropic API keys)
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  
  if (!hasOpenAI || !hasAnthropic) {
    console.log('[Module Creation Agent] Skipping content enrichment - PhD ensemble requires both OpenAI and Anthropic API keys');
    console.log('[Module Creation Agent] OpenAI:', hasOpenAI ? 'available' : 'missing', '| Anthropic:', hasAnthropic ? 'available' : 'missing');
    return;
  }
  
  console.log('[Module Creation Agent] Enriching content blocks for topic:', topic);
  
  // Only enrich AI-generated and public_web content blocks (not proprietary)
  const blocksToEnrich = modulePreview.contentBlocks.filter(
    (b: any) => (b.source === 'ai_generated' || b.source === 'public_web') && b.type === 'text'
  );
  
  if (blocksToEnrich.length === 0) {
    console.log('[Module Creation Agent] No blocks to enrich');
    return;
  }
  
  // Import PhD ensemble (dynamic to avoid circular dependencies)
  const { generateWithPHDEnsemble } = await import('./phd-ensemble');
  
  // Generate comprehensive content for the topic
  try {
    console.log('[Module Creation Agent] Calling PhD ensemble for:', topic);
    const ensembleResult = await generateWithPHDEnsemble(
      topic,
      `Create training content on ${topic} suitable for workplace learning`,
      'general'
    );
    
    console.log('[Module Creation Agent] PhD ensemble generated', ensembleResult.finalSections.length, 'sections');
    console.log('[Module Creation Agent] Citations:', ensembleResult.citations.length);
    
    // Map ensemble sections to content blocks
    const sectionMap = new Map<string, any>();
    for (const section of ensembleResult.finalSections) {
      sectionMap.set(section.title.toLowerCase(), {
        content: section.content,
        // Citations are at the result level, not section level
        citations: ensembleResult.citations
      });
    }
    
    // Enrich each block with relevant generated content
    for (const block of blocksToEnrich) {
      // Try to find matching section by title similarity
      const blockTitleLower = block.title.toLowerCase();
      let enrichedData = null;
      
      // Exact or partial match
      for (const [sectionTitle, data] of sectionMap.entries()) {
        if (blockTitleLower.includes(sectionTitle) || sectionTitle.includes(blockTitleLower)) {
          enrichedData = data;
          break;
        }
      }
      
      // If no match, use the first section that matches the type
      if (!enrichedData && ensembleResult.finalSections.length > 0) {
        const typeMap: Record<string, string> = {
          'Introduction': 'historical',
          'Core Concepts': 'theoretical',
          'Practical': 'practical',
          'Advanced': 'technical',
        };
        
        const matchingType = Object.keys(typeMap).find(key => blockTitleLower.includes(key.toLowerCase()));
        if (matchingType) {
          const targetType = typeMap[matchingType];
          const matchingSection = ensembleResult.finalSections.find(s => s.type === targetType);
          if (matchingSection) {
            enrichedData = {
              content: matchingSection.content,
              citations: ensembleResult.citations
            };
          }
        }
      }
      
      // Fallback to first section or keep original
      if (!enrichedData && ensembleResult.finalSections.length > 0) {
        const firstSection = ensembleResult.finalSections[0];
        enrichedData = {
          content: firstSection.content,
          citations: ensembleResult.citations
        };
      }
      
      if (enrichedData) {
        // Store full content and citations
        block.content = enrichedData.content;
        block.citations = enrichedData.citations;
        
        // Update source tag to be more specific
        if (enrichedData.citations.length > 0) {
          const citation = enrichedData.citations[0];
          if (citation.type === 'journal' && citation.isPeerReviewed) {
            block.sourceLabel = `${citation.authors[0] || 'Academic'}, ${citation.year || 'Recent'}`;
          } else if (citation.type === 'book') {
            block.sourceLabel = `${citation.authors[0] || 'Book'}, ${citation.year || 'Recent'}`;
          } else if (citation.type === 'website') {
            block.sourceLabel = `${citation.title}`;
          } else {
            block.sourceLabel = `${citation.type}: ${citation.title}`;
          }
        }
        
        console.log(`[Module Creation Agent] Enriched block "${block.title}" with ${enrichedData.content.length} chars and ${enrichedData.citations.length} citations`);
      }
    }
    
  } catch (error: any) {
    console.error('[Module Creation Agent] PhD ensemble failed:', error.message);
    // Don't fail the whole process - just use basic content
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
  
  // Try to extract topic from first message
  const topic = extractTopicFromConversation(ctx.conversationHistory);
  const hasTopicInFirstMessage = topic && topic !== 'the topic' && turnCount === 1;
  
  // First turn WITH topic provided: ask about experience level & deadline
  if (turnCount === 1 && hasTopicInFirstMessage) {
    return {
      message: `Excellent! Training on ${topic} is a great area to focus on.\n\nTo help me design the most effective module, could you tell me:\n\n1. What's their current experience level with this topic?\n2. When do you need them to be proficient by?`,
      suggestions: ['Beginner level', 'Intermediate', 'Advanced', 'Mixed abilities'],
      readyToCreate: false,
      needsMoreInfo: true,
    };
  }
  
  // First turn WITHOUT clear topic: ask for clarification
  if (turnCount === 1) {
    return {
      message: "I'd be delighted to help you create a training module!\n\nCould you tell me a bit more about what you'd like to teach your team? For example:\n- What topic or skill?\n- What's the context or goal?",
      suggestions: ['Sales skills', 'Technical training', 'Leadership'],
      readyToCreate: false,
      needsMoreInfo: true,
    };
  }
  
  // Second turn: generate preview (assume they've answered questions)
  if (turnCount === 2) {
    return {
      message: `Perfect! I've created a training module on ${topic}. This includes 4 core sections covering fundamentals through practical application.\n\nWould you like to refine anything, or shall we save this as a draft?`,
      suggestions: ['Save as Draft', 'Refine Content', 'Change Difficulty'],
      modulePreview: {
        title: `${topic.charAt(0).toUpperCase() + topic.slice(1)} Training`,
        description: `Training module on ${topic}`,
        targetMasteryLevel: 'intermediate',
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
  
  // Default: provide guidance
  return {
    message: "I'm here to help design your training module. Could you tell me a bit more about what you'd like to achieve?",
    suggestions: ['Start Over', 'Tell Me More'],
    readyToCreate: false,
    needsMoreInfo: true,
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
