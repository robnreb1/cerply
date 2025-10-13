/**
 * Free-Text Answer Validation Service
 * Epic 8: Conversational Learning Interface
 * Validates learner's free-text answers using NLP + LLM
 */

import OpenAI from 'openai';
import Levenshtein from 'fast-levenshtein';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const LLM_UNDERSTANDING = process.env.LLM_UNDERSTANDING || 'gpt-4o';

export interface ValidationResult {
  correct: boolean;
  partialCredit: number; // 0.0 to 1.0
  feedback: string;
  method: 'fuzzy' | 'llm';
}

/**
 * Validate free-text answer against canonical answer
 */
export async function validateFreeTextAnswer(
  learnerAnswer: string,
  canonicalAnswer: string,
  questionStem: string
): Promise<ValidationResult> {
  // Step 1: Fuzzy matching (fast, cheap)
  const similarity = calculateSimilarity(learnerAnswer, canonicalAnswer);
  
  if (similarity > 0.90) {
    // Very close match - accept immediately
    return {
      correct: true,
      partialCredit: 1.0,
      feedback: `Exactly right! ${canonicalAnswer}`,
      method: 'fuzzy',
    };
  }

  if (similarity > 0.70 && similarity <= 0.90) {
    // Close match - give partial credit
    return {
      correct: true,
      partialCredit: similarity,
      feedback: `Good! You're on the right track. The canonical answer is: "${canonicalAnswer}"`,
      method: 'fuzzy',
    };
  }

  // Step 2: LLM validation (for complex answers)
  return await validateWithLLM(learnerAnswer, canonicalAnswer, questionStem);
}

/**
 * Calculate similarity using Levenshtein distance
 */
function calculateSimilarity(text1: string, text2: string): number {
  const norm1 = text1.toLowerCase().trim();
  const norm2 = text2.toLowerCase().trim();
  
  const distance = Levenshtein.get(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  
  return maxLength === 0 ? 1.0 : 1 - (distance / maxLength);
}

/**
 * Validate answer using LLM (for semantic understanding)
 */
async function validateWithLLM(
  learnerAnswer: string,
  canonicalAnswer: string,
  questionStem: string
): Promise<ValidationResult> {
  const prompt = `You are grading a learner's answer to a question.

**Question:** ${questionStem}

**Canonical Answer:** ${canonicalAnswer}

**Learner's Answer:** ${learnerAnswer}

Please evaluate:
1. Is the learner's answer correct, partially correct, or incorrect?
2. What partial credit score (0.0 to 1.0) should they receive?
3. Provide constructive feedback in 1-2 sentences.

Respond in JSON format:
{
  "correct": true/false,
  "partialCredit": 0.0 to 1.0,
  "feedback": "Your constructive feedback here"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: LLM_UNDERSTANDING,
      messages: [
        {
          role: 'system',
          content: 'You are a fair and encouraging grader. Accept answers that demonstrate understanding, even if phrasing differs. Provide constructive feedback.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for consistent grading
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    
    return {
      correct: result.correct ?? false,
      partialCredit: result.partialCredit ?? 0.0,
      feedback: result.feedback || 'Unable to evaluate answer.',
      method: 'llm',
    };
  } catch (err) {
    console.error('[Free-Text Validator] LLM response parse error:', err);
    
    return {
      correct: false,
      partialCredit: 0.0,
      feedback: 'Sorry, I could not evaluate your answer. Please try rephrasing or selecting a multiple choice option.',
      method: 'llm',
    };
  }
}

/**
 * Check if question should use free-text input
 * (vs forcing multiple choice)
 */
export function shouldUseFreeText(questionType: string, optionCount: number): boolean {
  // Force MCQ for yes/no or binary questions
  if (optionCount === 2) {
    return false;
  }

  // Force MCQ for categorical questions (3-4 distinct options)
  if (questionType === 'mcq' && optionCount <= 4) {
    return false; // Still allow MCQ as primary, but free-text as alternative
  }

  // Encourage free-text for open-ended questions
  if (questionType === 'free') {
    return true;
  }

  // Default: Allow both MCQ and free-text
  return true;
}

