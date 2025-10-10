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
  moduleId: string;
  section: string;
  source: string;
  model: string;
  confidence?: number;
  reason?: string;
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
 */
export async function playbackUnderstanding(artefact: string): Promise<LLMResult & { inputType?: string }> {
  const inputType = detectInputType(artefact);
  const prompts = inputType === 'topic' ? RESEARCH_PROMPTS : PROMPTS;
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
  
  return { ...result, inputType };
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
 */
export async function generateWithEnsemble(
  understanding: string,
  artefact: string,
  inputType: 'source' | 'topic' = 'source'
): Promise<EnsembleResult> {
  const start = Date.now();
  const prompts = inputType === 'topic' ? RESEARCH_PROMPTS : PROMPTS;
  
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

// Research Mode Prompts - for topic-based content generation
export const RESEARCH_PROMPTS = {
  understanding: {
    system: 'You are an educational content planner analyzing a learning topic request.',
    user: `The user wants to learn about: "{{TOPIC}}"

Extract and plan:
1. **Core Topic**: Identify the main subject
2. **Domain**: Field of study (Mathematics, Science, History, Business, etc.)
3. **Key Concepts**: 4-6 fundamental concepts that must be covered
4. **Learning Objectives**: What should learners be able to do after studying this?
5. **Prerequisites**: Required prior knowledge (if applicable)
6. **Difficulty Level**: Beginner, Intermediate, or Advanced
7. **Ethical Considerations**: Any sensitive topics or constraints to consider

Format as clear, structured explanation.`
  },
  
  generatorA: {
    system: 'You are an expert educator creating comprehensive technical learning content with proper citations.',
    user: `Create detailed learning content on: {{TOPIC}}

Based on this understanding:
{{UNDERSTANDING}}

Requirements:
1. Cover all key concepts thoroughly with technical accuracy
2. Include definitions, explanations, and examples
3. CITE credible sources for major claims (textbooks, courses, academic papers)
4. Format citations as [Source: Title, Author/Institution]
5. Create 3-5 learning modules with clear objectives
6. Include 2-3 assessment questions per module

Output as JSON:
{
  "modules": [
    {
      "id": "module-1",
      "title": "...",
      "content": "... [Source: Stewart Calculus, Chapter 3] ...",
      "questions": [...]
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
1. Focus on real-world applications and intuitive explanations
2. Include practical examples and use cases
3. CITE credible sources (online courses, educational videos, practical guides)
4. Format citations as [Source: Title, Author/Platform]
5. Create 3-5 learning modules with hands-on focus
6. Include scenario-based assessment questions

Output as JSON (same format as Generator A)`
  },
  
  factChecker: {
    system: 'You are a fact-checker validating educational content and citations for accuracy.',
    user: `Validate this learning content on: {{TOPIC}}

Generator A (Technical): {{GENERATOR_A_OUTPUT}}
Generator B (Practical): {{GENERATOR_B_OUTPUT}}

Tasks:
1. Verify factual accuracy of all claims
2. Validate that citations are credible and relevant
3. Flag any unsupported claims or questionable sources
4. Check for hallucinated citations (sources that don't exist)
5. Synthesize the best content from both generators
6. Ensure comprehensive coverage of the topic
7. Check for ethical issues or policy violations

Output validated modules with confidence scores and citation verification.

JSON format:
{
  "modules": [...],
  "provenance": [...],
  "citationValidation": [
    {"citation": "...", "status": "verified/questionable/unverified", "confidence": 0.9}
  ],
  "ethicalFlags": []
}`
  }
};

