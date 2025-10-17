/**
 * Affirmative Response Classifier
 * Uses fast LLM to determine if user response is affirmative or needs refinement
 */

import { callOpenAI } from './llm-orchestrator';

export interface ClassificationResult {
  isAffirmative: boolean;
  confidence: number;
  isRejection?: boolean; // NEW: Explicit rejection like "no, I meant X"
  correctedInput?: string | null; // NEW: Extract "X" from "no, I meant X"
}

/**
 * Classify if user response is affirmative (yes/confirm) or refinement (needs clarification)
 * @param userInput The user's response
 * @param conversationContext Recent conversation messages for context
 * @returns Classification result
 */
export async function classifyAffirmativeResponse(
  userInput: string,
  conversationContext: string = ''
): Promise<ClassificationResult> {
  try {
    // Enhanced prompt to detect rejections and extract corrected input
    const systemPrompt = `You are a classifier. Determine if the user's response is AFFIRMATIVE, REJECTION, or REFINEMENT.

CRITICAL RULES:
1. If the previous message asked "WHAT/WHICH aspect?", then ANY descriptive answer is REFINEMENT
2. ONLY classify as AFFIRMATIVE if the previous message asked "Is that what you're looking for?" AND the user agrees
3. If user says "no, I meant X" or "actually X" or similar, classify as REJECTION and extract X

Return only JSON: {"isAffirmative": true/false, "confidence": 0-1, "isRejection": true/false, "correctedInput": "X or null"}

Examples:
Context: "Does that work for you?" / "Is that what you're looking for?"
- "yes" → {"isAffirmative": true, "confidence": 1.0, "isRejection": false, "correctedInput": null}
- "sounds great" → {"isAffirmative": true, "confidence": 0.95, "isRejection": false, "correctedInput": null}
- "no, I meant physics" → {"isAffirmative": false, "confidence": 1.0, "isRejection": true, "correctedInput": "physics"}
- "actually, I want astrophysics" → {"isAffirmative": false, "confidence": 1.0, "isRejection": true, "correctedInput": "astrophysics"}
- "no, chemistry instead" → {"isAffirmative": false, "confidence": 1.0, "isRejection": true, "correctedInput": "chemistry"}

Context: "Could you tell me which specific aspect?"
- "basics" → {"isAffirmative": false, "confidence": 0.95, "isRejection": false, "correctedInput": null}
- "astrophysics" → {"isAffirmative": false, "confidence": 0.95, "isRejection": false, "correctedInput": null}

Context: "What would you like to learn?"
- "python" → {"isAffirmative": false, "confidence": 0.95, "isRejection": false, "correctedInput": null}`;

    const userPrompt = conversationContext 
      ? `Recent conversation:\n${conversationContext}\n\nUser response: "${userInput}"\n\nClassify (detect rejections like "no, I meant X" and extract X):`
      : `User response: "${userInput}"\n\nClassify:`;

    // Use gpt-4o-mini with very low temperature for fast, consistent classification
    const result = await callOpenAI('gpt-4o-mini', userPrompt, systemPrompt, 3, 0.1);
    
    // Strip markdown code fences if present
    let cleanContent = result.content.trim();
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }
    
    const parsed = JSON.parse(cleanContent);
    
    return {
      isAffirmative: parsed.isAffirmative === true,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      isRejection: parsed.isRejection === true,
      correctedInput: parsed.correctedInput || null,
    };
  } catch (error) {
    console.error('[affirmative-classifier] Classification failed:', error);
    
    // Fallback: Simple pattern matching as safety net
    const simplifiedInput = userInput.toLowerCase().trim();
    const clearAffirmatives = ['yes', 'yep', 'yeah', 'yup', 'sure', 'ok', 'okay', 'correct', 'right'];
    const isSimpleAffirmative = clearAffirmatives.some(word => simplifiedInput === word);
    
    // Check for explicit rejections like "no, I meant..."
    const rejectionPattern = /^no,?\s+(i\s+meant\s+)?(.+)$/i;
    const rejectionMatch = simplifiedInput.match(rejectionPattern);
    
    return {
      isAffirmative: isSimpleAffirmative,
      confidence: isSimpleAffirmative ? 0.8 : 0.3,
      isRejection: !!rejectionMatch,
      correctedInput: rejectionMatch ? rejectionMatch[2] : null,
    };
  }
}

