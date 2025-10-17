/**
 * Topic Search Service
 * Fuzzy search topics in database + LLM-generated suggestions
 * Handles Subject-level requests by suggesting specific Topics
 */

import { db } from '../db';
import { topics } from '../db/schema';
import { like, or, eq } from 'drizzle-orm';
import { callOpenAI } from './llm-orchestrator';

interface TopicMatch {
  topicId: string | null;
  title: string;
  description: string;
  exists: boolean;
  confidence: number;
}

interface SearchResult {
  matches: TopicMatch[];
  source: 'database' | 'generated' | 'hybrid' | 'none';
}

/**
 * Search for topics using fuzzy matching + optional LLM generation
 * @param query User's topic interest or subject
 * @param limit Maximum number of results to return
 * @param skipLLMGeneration If true, only search DB (much faster, ~10ms vs 4-5s)
 * @returns TopicMatches from DB and/or LLM
 */
export async function searchTopics(
  query: string, 
  limit: number = 5, 
  skipLLMGeneration: boolean = true // Default to fast mode
): Promise<SearchResult> {
  try {
    // Step 1: Fuzzy search in database (fast, ~10ms)
    const dbMatches = await fuzzySearchDB(query, limit);
    
    // Step 2: If insufficient matches AND LLM enabled, generate via LLM (slow, 4-5s)
    let generatedTopics: TopicMatch[] = [];
    if (!skipLLMGeneration && dbMatches.length < 3) {
      generatedTopics = await generateTopicSuggestions(query, 5 - dbMatches.length);
    }
    
    // Combine results (DB matches first, then generated)
    const allMatches = [...dbMatches, ...generatedTopics];
    
    const source = 
      dbMatches.length > 0 && generatedTopics.length > 0 ? 'hybrid' : 
      dbMatches.length > 0 ? 'database' : 
      generatedTopics.length > 0 ? 'generated' : 'none';
    
    return {
      matches: allMatches.slice(0, limit),
      source,
    };
  } catch (error) {
    console.error('[topic-search] Search failed:', error);
    throw new Error('TOPIC_SEARCH_FAILED');
  }
}

/**
 * Fuzzy search topics in database
 * Uses similarity scoring to rank matches
 */
async function fuzzySearchDB(query: string, limit: number): Promise<TopicMatch[]> {
  try {
    const searchTerm = `%${query.toLowerCase()}%`;
    
    // Search topics by title and description
    const results = await db
      .select()
      .from(topics)
      .where(
        or(
          like(topics.title, searchTerm),
          like(topics.description, searchTerm)
        )
      )
      .limit(limit * 2); // Get more for similarity ranking
    
    // Calculate similarity and rank
    const ranked = results
      .map((topic) => ({
        topicId: topic.id,
        title: topic.title,
        description: topic.description || '',
        exists: true,
        confidence: calculateSimilarity(query, topic.title),
      }))
      .filter((t) => t.confidence > 0.5) // Threshold: 50% similarity minimum
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
    
    return ranked;
  } catch (error) {
    console.error('[topic-search] Database search failed:', error);
    return [];
  }
}

/**
 * Generate topic suggestions using LLM
 * Called when database doesn't have enough matches
 */
async function generateTopicSuggestions(subject: string, count: number): Promise<TopicMatch[]> {
  try {
    // Simplified prompt for faster response
    const prompt = `Generate ${count} practical learning topics for "${subject}".

Return only JSON array:
[{"title": "Topic Name", "description": "One sentence what they'll learn"}, ...]

Keep topics specific, 3-8 words, different from each other.`;

    const systemPrompt = 'You are a curriculum expert. Return only valid JSON.';

    // Use gpt-4o-mini for fast topic generation (2-3x faster than gpt-4o)
    const result = await callOpenAI('gpt-4o-mini', prompt, systemPrompt, 3, 0.7);
    
    // Strip markdown code fences if present
    let cleanContent = result.content.trim();
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }
    
    const parsed = JSON.parse(cleanContent);
    
    if (!Array.isArray(parsed)) {
      throw new Error('LLM did not return an array');
    }
    
    return parsed.map((t: any) => ({
      topicId: null,
      title: t.title,
      description: t.description,
      exists: false,
      confidence: 1.0, // LLM-generated are always high confidence
    }));
  } catch (error) {
    console.error('[topic-search] LLM generation failed:', error);
    // Return fallback generic topics
    return [
      {
        topicId: null,
        title: `Introduction to ${subject}`,
        description: `Learn the fundamentals of ${subject}`,
        exists: false,
        confidence: 0.8,
      },
      {
        topicId: null,
        title: `Practical ${subject} Skills`,
        description: `Develop hands-on skills in ${subject}`,
        exists: false,
        confidence: 0.8,
      },
      {
        topicId: null,
        title: `Advanced ${subject} Techniques`,
        description: `Master advanced concepts in ${subject}`,
        exists: false,
        confidence: 0.8,
      },
    ];
  }
}

/**
 * Calculate similarity between two strings
 * Uses simple word overlap algorithm
 * Returns score 0-1 (1 = identical)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // Substring match (one contains the other)
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = Math.min(s1.length, s2.length);
    const longer = Math.max(s1.length, s2.length);
    return 0.7 + (shorter / longer) * 0.3; // 0.7 to 1.0
  }
  
  // Word overlap
  const words1 = s1.split(/\s+/).filter(w => w.length > 2); // Ignore short words
  const words2 = s2.split(/\s+/).filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0.0;
  
  const overlap = words1.filter(w => words2.includes(w)).length;
  const maxWords = Math.max(words1.length, words2.length);
  
  return overlap / maxWords;
}

/**
 * Get topic by ID (for when user selects a topic)
 */
export async function getTopicById(topicId: string): Promise<any | null> {
  try {
    const results = await db
      .select()
      .from(topics)
      .where(eq(topics.id, topicId))
      .limit(1);
    
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('[topic-search] Failed to fetch topic:', error);
    return null;
  }
}

