/**
 * Explanation Engine Service
 * Epic 8: Conversational Learning Interface
 * Generates ELI12-style explanations when learners are confused
 */

import OpenAI from 'openai';
import { db } from '../db';
import { items, confusionLog } from '../db/schema';
import { eq } from 'drizzle-orm';

const CHAT_LLM_MODEL = process.env.CHAT_LLM_MODEL || 'gpt-4o-mini';
const EXPLANATION_CACHE_TTL = parseInt(process.env.EXPLANATION_CACHE_TTL || '3600', 10); // 1 hour

// Lazy initialization of OpenAI client (only when needed)
let openai: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

// In-memory cache for explanations
const explanationCache = new Map<string, { explanation: string; model: string; timestamp: number }>();

export interface ExplanationResult {
  explanation: string;
  model: string;
  tokensUsed: number;
  cost: number;
  cached: boolean;
  confusionLogId?: string;
  alternatives?: string[];
  relatedResources?: Array<{ title: string; url: string }>;
}

/**
 * Generate explanation for a question that learner is confused about
 */
export async function generateExplanation(
  questionId: string,
  learnerQuery: string,
  userId: string
): Promise<ExplanationResult> {
  // Check cache first
  const cacheKey = `${questionId}:${learnerQuery}`;
  const cached = explanationCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < EXPLANATION_CACHE_TTL * 1000) {
    console.log('[Explanation Engine] Cache hit:', cacheKey);
    return {
      explanation: cached.explanation,
      model: cached.model,
      tokensUsed: 0,
      cost: 0,
      cached: true,
    };
  }

  // Fetch question from DB
  const [question] = await db.select().from(items).where(eq(items.id, questionId)).limit(1);
  
  if (!question) {
    throw new Error('Question not found');
  }

  // Generate explanation using LLM
  const prompt = buildExplanationPrompt(question, learnerQuery);
  
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: CHAT_LLM_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful learning assistant. Explain concepts in simple, clear language suitable for a 12-year-old (ELI12 style). Be encouraging and constructive.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 300,
  });

  const explanation = completion.choices[0]?.message?.content || 'I apologize, but I could not generate an explanation at this time.';
  const tokensUsed = completion.usage?.total_tokens || 0;
  const cost = calculateCost(CHAT_LLM_MODEL, tokensUsed);

  // Cache explanation
  explanationCache.set(cacheKey, { explanation, model: CHAT_LLM_MODEL, timestamp: now });

  // Log to confusion_log for adaptive difficulty signals
  const [confusionEntry] = await db.insert(confusionLog).values({
    userId,
    questionId,
    query: learnerQuery,
    explanationProvided: explanation,
    helpful: null, // Will be updated when learner provides feedback
  }).returning();

  return {
    explanation,
    model: CHAT_LLM_MODEL,
    tokensUsed,
    cost,
    cached: false,
    confusionLogId: confusionEntry.id,
  };
}

/**
 * Build LLM prompt for explanation
 */
function buildExplanationPrompt(question: any, learnerQuery: string): string {
  const options = Array.isArray(question.options) 
    ? question.options 
    : (question.options?.values || []);
  
  const correctAnswerIndex = typeof question.answer === 'number' ? question.answer : 0;
  const correctAnswer = options[correctAnswerIndex] || 'Unknown';

  return `A learner is confused about this question:

**Question:** ${question.stem || 'Question text not available'}

**Options:**
${options.map((opt: string, i: number) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n')}

**Correct Answer:** ${String.fromCharCode(65 + correctAnswerIndex)}) ${correctAnswer}

**Learner's Question:** "${learnerQuery}"

Please explain why the correct answer is right in simple, encouraging language. Use analogies or examples if helpful. Keep it under 200 words.`;
}

/**
 * Calculate cost for LLM usage
 */
function calculateCost(model: string, tokens: number): number {
  // gpt-4o-mini pricing: ~$0.00015 per 1K tokens (input) + $0.00060 per 1K tokens (output)
  // Approximate average: $0.0004 per 1K tokens
  if (model.includes('gpt-4o-mini')) {
    return (tokens / 1000) * 0.0004;
  }
  // gpt-4o pricing: ~$0.0025 per 1K tokens (input) + $0.0100 per 1K tokens (output)
  // Approximate average: $0.006 per 1K tokens
  if (model.includes('gpt-4o')) {
    return (tokens / 1000) * 0.006;
  }
  // Default fallback
  return (tokens / 1000) * 0.0004;
}

/**
 * Mark explanation as helpful or not helpful
 */
export async function markExplanationHelpful(
  confusionLogId: string,
  helpful: boolean
): Promise<void> {
  await db.update(confusionLog)
    .set({ helpful })
    .where(eq(confusionLog.id, confusionLogId));
}

/**
 * Get confusion statistics for a user (useful for adaptive difficulty)
 */
export async function getUserConfusionStats(userId: string): Promise<{
  totalConfusions: number;
  helpfulCount: number;
  unhelpfulCount: number;
  topConfusedQuestions: string[];
}> {
  const confusions = await db.select()
    .from(confusionLog)
    .where(eq(confusionLog.userId, userId));

  const helpfulCount = confusions.filter(c => c.helpful === true).length;
  const unhelpfulCount = confusions.filter(c => c.helpful === false).length;

  // Find most confused questions (appears most in log)
  const questionCounts = new Map<string, number>();
  confusions.forEach(c => {
    questionCounts.set(c.questionId, (questionCounts.get(c.questionId) || 0) + 1);
  });

  const topConfusedQuestions = Array.from(questionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([questionId]) => questionId);

  return {
    totalConfusions: confusions.length,
    helpfulCount,
    unhelpfulCount,
    topConfusedQuestions,
  };
}

