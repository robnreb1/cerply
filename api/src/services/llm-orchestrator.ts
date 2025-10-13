/**
 * LLM Orchestrator Service
 * Epic 6: Ensemble Content Generation
 * Manages multi-LLM pipeline with provenance tracking
 * 
 * NOTE: These models are ONLY for content building (ensemble generation).
 * Standard chat interactions use different models.
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// LLM Models (for content building ONLY, not standard chat)
// PHILOSOPHY: Always use the BEST available models for maximum quality
// OPTIMIZED: Use o3's deep reasoning for validation rather than initial generation (cost optimization)
const UNDERSTANDING_MODEL = process.env.LLM_UNDERSTANDING || 'gpt-4o'; // Fast, cheap for initial understanding
const GENERATOR_1 = process.env.LLM_GENERATOR_1 || 'claude-sonnet-4-5'; // Claude 4.5: Fast, creative first draft
const GENERATOR_2 = process.env.LLM_GENERATOR_2 || 'gpt-4o'; // GPT-4o: Fast, analytical alternative draft
const FACT_CHECKER = process.env.LLM_FACT_CHECKER || 'o3'; // o3: Deep reasoning to validate and select best content

// Lazy initialization of clients (only when needed to avoid startup failures)
let _openai: OpenAI | null = null;
let _anthropic: Anthropic | null = null;
let _gemini: GoogleGenerativeAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required for ensemble generation');
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required for ensemble generation');
    }
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

function getGeminiClient(): GoogleGenerativeAI {
  if (!_gemini) {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY environment variable is required for ensemble generation');
    }
    _gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }
  return _gemini;
}

export interface LLMResult {
  content: string;
  model: string;
  tokens: number;
  costUsd: number;
  durationMs: number;
}

export interface Module {
  id: string;
  title: string;
  content: string;
  questions: Question[];
  examples?: string[];
  provenance?: {
    content_source?: string;
    questions_source?: string[];
    confidence?: number;
  };
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface ProvenanceRecord {
  // Format 1: Old source mode
  moduleId?: string;
  section?: string;
  source?: string;
  model?: string;
  confidence?: number;
  reason?: string;
  // Format 2: Research mode with generator sources
  generatorSource?: string | string[];
  // Format 3: Alternate research mode
  newIds?: string[];
  originalId?: string;
}

export interface EnsembleResult {
  generatorA: LLMResult;
  generatorB: LLMResult;
  factChecker: LLMResult;
  finalModules: Module[];
  provenance: ProvenanceRecord[];
  totalCost: number;
  totalTokens: number;
  totalTime: number;
}

/**
 * Call OpenAI model with retry logic
 */
async function callOpenAI(
  model: string,
  prompt: string,
  systemPrompt: string,
  retries: number = 3
): Promise<LLMResult> {
  const start = Date.now();
  const client = getOpenAIClient();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // GPT-5 and newer reasoning models have different parameter requirements
      const params: any = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
      };
      
      // Use the correct parameter names based on model
      if (model.startsWith('gpt-5') || model.startsWith('o1') || model.startsWith('o3')) {
        // GPT-5/o1/o3 use max_completion_tokens and don't support custom temperature
        params.max_completion_tokens = 4000;
        // Temperature defaults to 1 (only supported value for these models)
      } else {
        // Standard models support temperature and use max_tokens
        params.max_tokens = 4000;
        params.temperature = 0.7;
      }
      
      const response = await client.chat.completions.create(params);

      const tokens = response.usage?.total_tokens || 0;
      const cost = calculateOpenAICost(model, tokens);
      
      return {
        content: response.choices[0].message.content || '',
        model,
        tokens,
        costUsd: cost,
        durationMs: Date.now() - start,
      };
    } catch (error: any) {
      if (attempt === retries) throw new Error(`OpenAI error after ${retries} attempts: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
    }
  }
  throw new Error('Unreachable');
}

/**
 * Call Anthropic model with retry logic
 */
async function callAnthropic(
  model: string,
  prompt: string,
  systemPrompt: string,
  retries: number = 3
): Promise<LLMResult> {
  const start = Date.now();
  const client = getAnthropicClient();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });

      const tokens = response.usage.input_tokens + response.usage.output_tokens;
      const cost = calculateAnthropicCost(model, tokens);
      
      return {
        content: response.content[0].type === 'text' ? response.content[0].text : '',
        model,
        tokens,
        costUsd: cost,
        durationMs: Date.now() - start,
      };
    } catch (error: any) {
      if (attempt === retries) throw new Error(`Anthropic error after ${retries} attempts: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw new Error('Unreachable');
}

/**
 * Call Google Gemini model with retry logic
 */
async function callGemini(
  model: string,
  prompt: string,
  systemPrompt: string,
  retries: number = 3
): Promise<LLMResult> {
  const start = Date.now();
  const client = getGeminiClient();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const geminiModel = client.getGenerativeModel({ 
        model,
        systemInstruction: systemPrompt,
      });

      const result = await geminiModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Gemini doesn't provide detailed token counts in the same way
      // Estimate based on text length (rough approximation: 1 token ≈ 4 chars)
      const estimatedTokens = Math.ceil((prompt.length + text.length) / 4);
      const cost = calculateGeminiCost(model, estimatedTokens);
      
      return {
        content: text,
        model,
        tokens: estimatedTokens,
        costUsd: cost,
        durationMs: Date.now() - start,
      };
    } catch (error: any) {
      if (attempt === retries) throw new Error(`Gemini error after ${retries} attempts: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw new Error('Unreachable');
}

/**
 * Step 1: Playback Understanding
 * LLM reads artefact and explains its understanding
 * NOW WITH GRANULARITY DETECTION
 */
export async function playbackUnderstanding(artefact: string): Promise<LLMResult & { inputType?: string; granularity?: string }> {
  const inputType = detectInputType(artefact);
  
  // CRITICAL: Detect granularity for intelligent prompting
  const granularity = detectGranularity(artefact);
  
  // Select prompts based on granularity
  let prompts;
  if (granularity === 'subject') {
    prompts = SUBJECT_PROMPTS;
  } else if (granularity === 'module') {
    prompts = MODULE_PROMPTS;
  } else {
    // Default to topic-level (or use RESEARCH_PROMPTS for backward compatibility)
    prompts = inputType === 'topic' ? TOPIC_PROMPTS : PROMPTS;
  }
  
  const systemPrompt = prompts.understanding.system;
  const userPrompt = prompts.understanding.user
    .replace('{{ARTEFACT}}', artefact)
    .replace('{{TOPIC}}', artefact);
  
  // Route to correct API based on model type
  let result;
  if (UNDERSTANDING_MODEL.startsWith('gpt-') || UNDERSTANDING_MODEL.startsWith('o1') || UNDERSTANDING_MODEL.startsWith('o3')) {
    result = await callOpenAI(UNDERSTANDING_MODEL, userPrompt, systemPrompt);
  } else if (UNDERSTANDING_MODEL.startsWith('claude-')) {
    result = await callAnthropic(UNDERSTANDING_MODEL, userPrompt, systemPrompt);
  } else {
    result = await callGemini(UNDERSTANDING_MODEL, userPrompt, systemPrompt);
  }
  
  return { ...result, inputType, granularity };
}

/**
 * Step 2: Refine Understanding
 * Manager provides feedback, LLM adjusts understanding
 */
export async function refineUnderstanding(
  artefact: string,
  previousUnderstanding: string,
  feedback: string
): Promise<LLMResult> {
  const systemPrompt = PROMPTS.refinement.system;
  const userPrompt = PROMPTS.refinement.user
    .replace('{{ARTEFACT}}', artefact)
    .replace('{{PREVIOUS_UNDERSTANDING}}', previousUnderstanding)
    .replace('{{FEEDBACK}}', feedback);
  
  // Route to correct API based on model type
  if (UNDERSTANDING_MODEL.startsWith('gpt-') || UNDERSTANDING_MODEL.startsWith('o1') || UNDERSTANDING_MODEL.startsWith('o3')) {
    return callOpenAI(UNDERSTANDING_MODEL, userPrompt, systemPrompt);
  } else if (UNDERSTANDING_MODEL.startsWith('claude-')) {
    return callAnthropic(UNDERSTANDING_MODEL, userPrompt, systemPrompt);
  } else {
    return callGemini(UNDERSTANDING_MODEL, userPrompt, systemPrompt);
  }
}

/**
 * Step 3: Generate with Ensemble
 * Generator A and Generator B create content independently
 * Fact-Checker verifies and selects best elements
 * NOW WITH GRANULARITY-AWARE PROMPTS
 */
export async function generateWithEnsemble(
  understanding: string,
  artefact: string,
  inputType: 'source' | 'topic' = 'source',
  granularity?: 'subject' | 'topic' | 'module'
): Promise<EnsembleResult> {
  const start = Date.now();
  
  // CRITICAL: Use granularity-aware prompts
  let prompts;
  if (granularity === 'subject') {
    prompts = SUBJECT_PROMPTS;
  } else if (granularity === 'module') {
    prompts = MODULE_PROMPTS;
  } else if (inputType === 'topic') {
    prompts = TOPIC_PROMPTS;
  } else {
    prompts = PROMPTS;
  }
  
  // Generator A (Claude, GPT, or Gemini - depends on configuration)
  const generatorAPrompt = prompts.generatorA.user
    .replace('{{UNDERSTANDING}}', understanding)
    .replace('{{ARTEFACT}}', artefact)
    .replace('{{TOPIC}}', artefact);
  let generatorA;
  if (GENERATOR_1.startsWith('gpt-') || GENERATOR_1.startsWith('o1') || GENERATOR_1.startsWith('o3')) {
    generatorA = await callOpenAI(GENERATOR_1, generatorAPrompt, prompts.generatorA.system);
  } else if (GENERATOR_1.startsWith('claude-')) {
    generatorA = await callAnthropic(GENERATOR_1, generatorAPrompt, prompts.generatorA.system);
  } else {
    generatorA = await callGemini(GENERATOR_1, generatorAPrompt, prompts.generatorA.system);
  }

  // Generator B (GPT-4o or Claude)
  const generatorBPrompt = prompts.generatorB.user
    .replace('{{UNDERSTANDING}}', understanding)
    .replace('{{ARTEFACT}}', artefact)
    .replace('{{TOPIC}}', artefact);
  let generatorB;
  if (GENERATOR_2.startsWith('gpt-') || GENERATOR_2.startsWith('o1') || GENERATOR_2.startsWith('o3')) {
    generatorB = await callOpenAI(GENERATOR_2, generatorBPrompt, prompts.generatorB.system);
  } else if (GENERATOR_2.startsWith('claude-')) {
    generatorB = await callAnthropic(GENERATOR_2, generatorBPrompt, prompts.generatorB.system);
  } else {
    generatorB = await callGemini(GENERATOR_2, generatorBPrompt, prompts.generatorB.system);
  }

  // Fact-Checker (o3, Gemini, or Claude - depends on configuration)
  const factCheckerPrompt = prompts.factChecker.user
    .replace('{{GENERATOR_A_OUTPUT}}', generatorA.content)
    .replace('{{GENERATOR_B_OUTPUT}}', generatorB.content)
    .replace('{{ARTEFACT}}', artefact)
    .replace('{{TOPIC}}', artefact);
  let factChecker;
  if (FACT_CHECKER.startsWith('gpt-') || FACT_CHECKER.startsWith('o1') || FACT_CHECKER.startsWith('o3')) {
    factChecker = await callOpenAI(FACT_CHECKER, factCheckerPrompt, prompts.factChecker.system);
  } else if (FACT_CHECKER.startsWith('claude-')) {
    factChecker = await callAnthropic(FACT_CHECKER, factCheckerPrompt, prompts.factChecker.system);
  } else {
    factChecker = await callGemini(FACT_CHECKER, factCheckerPrompt, prompts.factChecker.system);
  }

  // Parse fact-checker output (JSON with provenance)
  // Strip markdown code fences if present (common LLM behavior)
  let jsonContent = factChecker.content.trim();
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.replace(/^```json\s*\n/, '').replace(/\n```\s*$/, '');
  } else if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.replace(/^```\s*\n/, '').replace(/\n```\s*$/, '');
  }
  
  let factCheckerData;
  try {
    factCheckerData = JSON.parse(jsonContent);
  } catch (error: any) {
    console.error('[Ensemble] JSON parse error:', error.message);
    console.error('[Ensemble] Raw content:', factChecker.content);
    throw new Error(`Fact-checker returned invalid JSON: ${error.message}`);
  }
  
  return {
    generatorA,
    generatorB,
    factChecker,
    finalModules: factCheckerData.modules,
    provenance: factCheckerData.provenance,
    totalCost: generatorA.costUsd + generatorB.costUsd + factChecker.costUsd,
    totalTokens: generatorA.tokens + generatorB.tokens + factChecker.tokens,
    totalTime: Date.now() - start,
  };
}

/**
 * Calculate OpenAI cost based on model and tokens
 * NOTE: Rates are estimates based on published pricing - actual costs may vary
 * TODO: Update with validated production pricing after measuring real costs
 */
function calculateOpenAICost(model: string, tokens: number): number {
  const rates: Record<string, { input: number; output: number }> = {
    'o3': { input: 0.01 / 1000, output: 0.03 / 1000 }, // Latest reasoning model - monitor actual costs
    'o1': { input: 0.015 / 1000, output: 0.06 / 1000 },
    'gpt-5': { input: 0.005 / 1000, output: 0.015 / 1000 },
    'gpt-4o': { input: 0.0025 / 1000, output: 0.01 / 1000 },
    'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
  };
  // Simplified: Assume 50/50 input/output split (update with real usage data)
  const rate = rates[model] || rates['o3'];
  return (tokens / 2) * (rate.input + rate.output);
}

/**
 * Calculate Anthropic cost based on model and tokens
 * NOTE: Rates are estimates based on published pricing - actual costs may vary
 * TODO: Update with validated production pricing after measuring real costs
 */
function calculateAnthropicCost(model: string, tokens: number): number {
  const rates: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-5': { input: 0.003 / 1000, output: 0.015 / 1000 }, // Claude 4.5 Sonnet - TBD
    'claude-3-7-sonnet-20250219': { input: 0.003 / 1000, output: 0.015 / 1000 },
    'claude-3-5-sonnet-latest': { input: 0.003 / 1000, output: 0.015 / 1000 },
    'claude-3-5-sonnet-20241022': { input: 0.003 / 1000, output: 0.015 / 1000 },
    'claude-3-haiku-20240307': { input: 0.00025 / 1000, output: 0.00125 / 1000 },
  };
  const rate = rates[model] || rates['claude-sonnet-4-5'];
  return (tokens / 2) * (rate.input + rate.output);
}

/**
 * Calculate Google Gemini cost based on model and tokens
 * NOTE: Rates are estimates based on published pricing - actual costs may vary
 * TODO: Update with validated production pricing after measuring real costs
 */
function calculateGeminiCost(model: string, tokens: number): number {
  const rates: Record<string, { input: number; output: number }> = {
    'gemini-1.5-pro': { input: 0.00125 / 1000, output: 0.005 / 1000 },
    'gemini-2.5-pro': { input: 0.00125 / 1000, output: 0.005 / 1000 }, // TBD when available
    'gemini-2.0-flash': { input: 0.00075 / 1000, output: 0.003 / 1000 },
  };
  const rate = rates[model] || rates['gemini-1.5-pro'];
  return (tokens / 2) * (rate.input + rate.output);
}

/**
 * Detect if input is a topic request vs source material
 */
export function detectInputType(input: string): 'source' | 'topic' {
  // File uploads are always source mode (handled at route level)
  // Text-based inputs default to research mode
  const topicIndicators = /^(teach me|learn about|explain|what (is|are)|how (does|do|to)|understand|create training on)/i;
  const isShort = input.trim().length < 200;
  const hasTopicRequest = topicIndicators.test(input.trim());
  
  // Default to research for text inputs unless it's clearly a long document
  return (hasTopicRequest || isShort) ? 'topic' : 'source';
}

/**
 * Detect granularity level: Subject → Topic → Module
 * This is THE critical feature - intelligent curriculum design
 * 
 * SUBJECT (broad): "Leadership" → Generate 8-12 topics
 * TOPIC (focused): "Effective Delegation" → Generate 4-6 modules
 * MODULE (specific): "SMART Goals Framework" → Generate 1 deep module
 */
export function detectGranularity(input: string): 'subject' | 'topic' | 'module' {
  const trimmed = input.trim().toLowerCase();
  const wordCount = trimmed.split(/\s+/).length;
  
  // SUBJECT indicators: Very broad, domain-level, usually 1-2 words
  const subjectPatterns = [
    // Business domains (single words)
    /^(leadership|management|communication|finance|marketing|sales|hr|operations|strategy|innovation|entrepreneurship|accounting|economics|negotiation|productivity|teamwork)$/i,
    // Professional skills (single words)
    /^(soft skills|hard skills|technical skills|interpersonal skills|analytical skills)$/i,
    // Industries/fields (1-2 words)
    /^(financial services|healthcare|technology|education|retail|manufacturing|consulting)$/i,
    // Academic domains
    /^(mathematics|science|history|literature|philosophy|psychology|sociology|biology|chemistry|physics)$/i,
  ];
  
  // MODULE indicators: Very specific, includes framework/tool/method keywords
  const modulePatterns = [
    // Specific frameworks/models/tools (contains these keywords)
    /(framework|model|method|technique|tool|principle|rule|law|theory|formula|matrix|system|approach)/i,
    // Named concepts (proper nouns + concept word)
    /(smart|swot|pestle|porter|maslow|herzberg|mcgregor|drucker|covey|goleman|kotter|lewin|tuckman|belbin|johari|eisenhower|pareto|5 whys|raci|kanban|scrum|agile)/i,
  ];
  
  // Check for SUBJECT (broad scope)
  if (wordCount <= 2 && subjectPatterns.some(pattern => pattern.test(trimmed))) {
    return 'subject';
  }
  
  // Check for MODULE (specific tool/framework)
  if (modulePatterns.some(pattern => pattern.test(trimmed))) {
    return 'module';
  }
  
  // Default to TOPIC (focused skill/concept)
  // Examples: "effective delegation", "active listening", "conflict resolution"
  return 'topic';
}

/**
 * Get granularity metadata for logging/debugging
 */
export function getGranularityMetadata(input: string) {
  const granularity = detectGranularity(input);
  const wordCount = input.trim().split(/\s+/).length;
  
  return {
    granularity,
    wordCount,
    expectedOutput: 
      granularity === 'subject' ? '8-12 topics' :
      granularity === 'topic' ? '4-6 modules' :
      '1 deep module',
    reasoning: 
      granularity === 'subject' ? 'Broad domain-level request' :
      granularity === 'topic' ? 'Focused skill/concept' :
      'Specific framework/tool/method',
  };
}

// Export for tests
export const PROMPTS = {
  understanding: {
    system: 'You are an expert learning designer analyzing source material. Your role is to understand what the material covers and explain it clearly to a manager.',
    user: `Please read the following artefact and explain your understanding:

{{ARTEFACT}}

Respond with a clear summary starting with "I understand this covers..." Include the main topics, key concepts, and intended audience if apparent.`
  },
  
  refinement: {
    system: 'You are refining your understanding based on manager feedback. Adjust your summary to reflect their priorities.',
    user: `Original artefact:
{{ARTEFACT}}

Your previous understanding:
{{PREVIOUS_UNDERSTANDING}}

Manager feedback:
{{FEEDBACK}}

Provide an updated understanding incorporating their feedback.`
  },
  
  generatorA: {
    system: 'You are Generator A, powered by GPT-5 with extended thinking. You are an expert at creating pedagogically sound micro-learning modules. Use your reasoning capabilities to generate clear, structured content with questions that test comprehension. Take time to think through the best pedagogical approach.',
    user: `Based on this understanding:
{{UNDERSTANDING}}

Source material:
{{ARTEFACT}}

Create 3-5 micro-learning modules. Each module should have:
1. A clear title
2. 2-3 paragraphs of explanation (max 300 words)
3. 3-5 multiple choice questions with explanations
4. Real-world examples

Output as JSON: { "modules": [{id: "module-1", title, content, questions: [{id: "q1", text, options, correctAnswer, explanation}], examples}] }`
  },
  
  generatorB: {
    system: 'You are Generator B, powered by Claude 4.5 Sonnet. You are an expert at creating engaging learning content with a focus on practical application and diverse teaching styles. Use your nuanced understanding to create content with different pedagogical approaches.',
    user: `Based on this understanding:
{{UNDERSTANDING}}

Source material:
{{ARTEFACT}}

Create 3-5 micro-learning modules with a different pedagogical approach than standard content. Focus on:
- Storytelling and scenarios
- Visual descriptions (for future illustration)
- Analogies and metaphors
- Kinesthetic learning cues

Output as JSON: { "modules": [{id: "module-1", title, content, questions: [{id: "q1", text, options, correctAnswer, explanation}], examples}] }`
  },
  
  factChecker: {
    system: 'You are a fact-checker and content judge powered by Gemini 2.5 Pro. Your role is to verify accuracy, remove hallucinations, and select the best elements from both generators. Use your multimodal reasoning to ensure the highest quality content.',
    user: `Generator A (GPT-5) output:
{{GENERATOR_A_OUTPUT}}

Generator B (Claude 4.5) output:
{{GENERATOR_B_OUTPUT}}

Source material (ground truth):
{{ARTEFACT}}

Tasks:
1. Verify all facts against source material
2. Remove any hallucinations or unsupported claims
3. Select clearest explanations (may mix from A and B)
4. Select best questions (diversity and pedagogical value)
5. Ensure progression from simple to complex

Output JSON:
{
  "modules": [{
    "id": "module-1",
    "title": "...",
    "content": "...",
    "questions": [{
      "id": "q1",
      "text": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "..."
    }],
    "provenance": {
      "content_source": "generator-a",
      "questions_source": ["generator-a-q1", "generator-b-q2"],
      "confidence": 0.95
    }
  }],
  "provenance": [{
    "moduleId": "module-1",
    "section": "content",
    "source": "generator-a",
    "model": "gpt-4o",
    "reason": "Clearer explanation with better structure"
  }]
}`
  }
};

// GRANULARITY-AWARE PROMPTS - THE CRITICAL FEATURE
// Subject → Topics, Topic → Modules, Module → Deep Content

/**
 * SUBJECT-LEVEL PROMPTS: Generate 8-12 topics from broad domain
 * Example: "Leadership" → ["Delegation", "Conflict Resolution", "Team Building", ...]
 */
export const SUBJECT_PROMPTS = {
  understanding: {
    system: 'You are a curriculum designer analyzing a broad subject area to create comprehensive topic coverage.',
    user: `The manager wants to create training on: "{{TOPIC}}"

This is a SUBJECT-LEVEL request (broad domain).

Your task:
1. **Subject**: Identify the broad domain (e.g., "Leadership", "Financial Services")
2. **Scope**: Define what this subject encompasses
3. **Topic Breakdown**: Identify 8-12 focused topics that comprehensively cover this subject
4. **Learning Goals**: What should learners achieve after mastering this subject?
5. **Audience**: Who needs this training?
6. **Prerequisites**: Required background knowledge

Output a clear plan for breaking this subject into teachable topics.`
  },
  
  generatorA: {
    system: 'You are an expert curriculum designer creating a comprehensive topic list for a subject area.',
    user: `Create a comprehensive curriculum for: {{TOPIC}}

Based on this understanding:
{{UNDERSTANDING}}

Requirements:
1. Generate 8-12 distinct, focused TOPICS (not modules)
2. Each topic should be a self-contained skill/concept
3. Topics should progress logically (foundational → advanced)
4. Topics should not overlap significantly
5. Each topic should be teachable in 4-6 modules
6. CITE authoritative sources for curriculum structure (e.g., professional certification bodies, academic programs)

Output as JSON:
{
  "subjectTitle": "...",
  "topics": [
    {
      "id": "topic-1",
      "title": "...",
      "description": "Brief 1-sentence description",
      "difficulty": "beginner|intermediate|advanced",
      "estimatedModules": 5
    }
  ],
  "citations": [{"title": "...", "source": "...", "relevance": "..."}]
}`
  },
  
  generatorB: {
    system: 'You are an expert learning architect creating practical topic structures for corporate training.',
    user: `Create a practical training curriculum for: {{TOPIC}}

Based on this understanding:
{{UNDERSTANDING}}

Requirements:
1. Generate 8-12 focused TOPICS with practical application emphasis
2. Topics should align with real-world job responsibilities
3. Include mix of foundational and advanced topics
4. Consider learning progression and dependencies
5. Cite industry standards, professional certifications, or best practices

Output as JSON (same format as Generator A)`
  },
  
  factChecker: {
    system: 'You are validating curriculum structure and topic coverage for completeness and accuracy.',
    user: `Validate this curriculum structure for: {{TOPIC}}

Generator A: {{GENERATOR_A_OUTPUT}}
Generator B: {{GENERATOR_B_OUTPUT}}

Tasks:
1. Verify 8-12 topics are distinct and non-overlapping
2. Ensure comprehensive coverage of the subject
3. Validate logical progression
4. Check citations are credible
5. Synthesize best topic list from both generators
6. Flag any missing critical topics

Output final validated topic list with provenance.`
  }
};

/**
 * TOPIC-LEVEL PROMPTS: Generate 4-6 modules from focused skill/concept
 * Example: "Effective Delegation" → ["What to Delegate", "How to Delegate", ...]
 */
export const TOPIC_PROMPTS = {
  understanding: {
    system: 'You are an instructional designer analyzing a focused learning topic to create module structure.',
    user: `The manager wants to create training on: "{{TOPIC}}"

This is a TOPIC-LEVEL request (focused skill/concept).

Your task:
1. **Topic**: Identify the specific skill or concept
2. **Learning Objectives**: What should learners be able to DO after completing this topic?
3. **Module Breakdown**: Identify 4-6 modules that teach this topic progressively
4. **Pedagogical Approach**: How should this be taught?
5. **Assessment Strategy**: How will competency be measured?

Output a clear plan for breaking this topic into learning modules.`
  },
  
  generatorA: {
    system: 'You are an expert educator creating comprehensive technical learning content with proper citations.',
    user: `Create detailed learning content on: {{TOPIC}}

Based on this understanding:
{{UNDERSTANDING}}

Requirements:
1. Generate 4-6 distinct MODULES (not topics, not single module)
2. Each module should teach one aspect of the topic
3. Modules should progress logically (basics → advanced)
4. Include 2-3 paragraphs of explanation per module (max 300 words)
5. Include 3-5 assessment questions per module with explanations
6. CITE credible sources for major claims
7. Format citations as [Source: Title, Author/Institution]

Output as JSON:
{
  "topicTitle": "...",
  "modules": [
    {
      "id": "module-1",
      "title": "...",
      "content": "... [Source: ...] ...",
      "questions": [
        {
          "id": "q1",
          "text": "...",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "A",
          "explanation": "..."
        }
      ],
      "examples": ["..."]
    }
  ],
  "citations": [
    {"title": "...", "author": "...", "type": "textbook/paper/course", "relevance": "..."}
  ]
}`
  },
  
  generatorB: {
    system: 'You are an expert educator creating practical, application-focused learning content with proper citations.',
    user: `Create practical learning content on: {{TOPIC}}

Based on this understanding:
{{UNDERSTANDING}}

Requirements:
1. Generate 4-6 MODULES with hands-on focus
2. Focus on real-world applications and scenarios
3. Include practical examples and case studies
4. Each module: 2-3 paragraphs, 3-5 scenario-based questions
5. CITE credible sources (courses, videos, guides)
6. Format citations as [Source: Title, Author/Platform]

Output as JSON (same format as Generator A)`
  },
  
  factChecker: {
    system: 'You are a fact-checker validating educational content and citations for accuracy.',
    user: `Validate this learning content on: {{TOPIC}}

Generator A (Technical): {{GENERATOR_A_OUTPUT}}
Generator B (Practical): {{GENERATOR_B_OUTPUT}}

Tasks:
1. Verify factual accuracy of all claims
2. Validate 4-6 modules are distinct and progress logically
3. Ensure each module has 3-5 quality questions
4. Check citations are credible (no hallucinations)
5. Synthesize best content from both generators
6. Flag ethical issues or policy violations

Output validated modules with confidence scores and citation verification.

JSON format:
{
  "topicTitle": "...",
  "modules": [...],
  "provenance": [...],
  "citationValidation": [
    {"citation": "...", "status": "verified/questionable/unverified", "confidence": 0.9}
  ],
  "ethicalFlags": []
}`
  }
};

/**
 * MODULE-LEVEL PROMPTS: Generate 1 deep module for specific framework/tool
 * Example: "SMART Goals Framework" → 1 comprehensive module
 */
export const MODULE_PROMPTS = {
  understanding: {
    system: 'You are an instructional designer analyzing a specific framework/tool/method to create deep learning content.',
    user: `The manager wants to create training on: "{{TOPIC}}"

This is a MODULE-LEVEL request (specific framework/tool/method).

Your task:
1. **Framework/Tool**: Identify the specific concept
2. **Purpose**: What problem does this solve? When is it used?
3. **Components**: Break down the framework into its parts
4. **Application**: Step-by-step guide to using it
5. **Common Mistakes**: Pitfalls to avoid
6. **Assessment**: How to test deep understanding (5-8 questions)

Output a clear plan for teaching this specific framework/tool/method in depth.`
  },
  
  generatorA: {
    system: 'You are an expert creating comprehensive, in-depth content on specific frameworks and methods.',
    user: `Create comprehensive training content on: {{TOPIC}}

Based on this understanding:
{{UNDERSTANDING}}

Requirements:
1. Generate 1 COMPREHENSIVE MODULE (not multiple modules)
2. Content should be 500-800 words (detailed explanation)
3. Include:
   - Definition and purpose
   - Step-by-step guide to using the framework
   - Visual description (for diagram/illustration)
   - Real-world example with full walkthrough
   - Common mistakes and how to avoid them
4. Include 5-8 assessment questions (comprehensive coverage)
5. CITE authoritative sources (original creator, academic papers, textbooks)

Output as JSON:
{
  "moduleTitle": "...",
  "content": "...",
  "stepByStepGuide": ["Step 1: ...", "Step 2: ..."],
  "visualDescription": "Describe how to illustrate this (for designer)",
  "examples": [
    {
      "scenario": "...",
      "application": "Step-by-step walkthrough..."
    }
  ],
  "commonMistakes": ["Mistake 1: ...", "How to avoid: ..."],
  "questions": [
    {
      "id": "q1",
      "text": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "..."
    }
  ],
  "citations": [...]
}`
  },
  
  generatorB: {
    system: 'You are an expert creating practical, applied content on specific frameworks and tools.',
    user: `Create practical training content on: {{TOPIC}}

Based on this understanding:
{{UNDERSTANDING}}

Requirements:
1. Generate 1 PRACTICAL MODULE focused on application
2. Content should be 500-800 words with hands-on emphasis
3. Include multiple real-world scenarios
4. Include 5-8 scenario-based assessment questions
5. Focus on how practitioners actually use this in the field
6. CITE practical guides, case studies, practitioner resources

Output as JSON (same format as Generator A)`
  },
  
  factChecker: {
    system: 'You are validating comprehensive framework/tool content for accuracy and completeness.',
    user: `Validate this training content on: {{TOPIC}}

Generator A (Comprehensive): {{GENERATOR_A_OUTPUT}}
Generator B (Practical): {{GENERATOR_B_OUTPUT}}

Tasks:
1. Verify factual accuracy of framework description
2. Validate step-by-step guide is complete and correct
3. Ensure 5-8 high-quality questions test deep understanding
4. Check examples are realistic and helpful
5. Verify citations are authoritative
6. Synthesize best content from both generators

Output single validated module with deep content.

JSON format:
{
  "moduleTitle": "...",
  "content": "...",
  "stepByStepGuide": [...],
  "visualDescription": "...",
  "examples": [...],
  "commonMistakes": [...],
  "questions": [...],
  "citations": [...],
  "provenance": [...],
  "citationValidation": [...],
  "ethicalFlags": []
}`
  }
};

// Keep legacy RESEARCH_PROMPTS for backward compatibility
// (alias to TOPIC_PROMPTS)
export const RESEARCH_PROMPTS = TOPIC_PROMPTS;

