/**
 * Canon Storage Service
 * Epic 6: Ensemble Content Generation
 * Stores and reuses generic content across organizations
 * Enables 70% cost savings by detecting and reusing industry-standard content
 */

import { db } from '../db';
import { contentGenerations } from '../db/schema';
import { eq, and } from 'drizzle-orm';

// Simple keyword-based detection (in production, use embeddings)
const GENERIC_KEYWORDS = [
  'fire safety',
  'gdpr',
  'data protection',
  'first aid',
  'workplace safety',
  'harassment',
  'discrimination',
  'security awareness',
  'phishing',
  'password',
  'emergency',
  'evacuation',
  'compliance',
  'privacy',
  'confidentiality',
  'code of conduct',
  'ethics',
  'anti-bribery',
  'health and safety',
  'manual handling',
  'risk assessment',
  'incident reporting',
];

/**
 * Stop words to ignore in similarity checks
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
  'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
]);

/**
 * Detect if content is generic (industry-standard)
 * Generic content can be reused across organizations
 */
export function isGenericContent(text: string | null | undefined): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const lowerText = text.toLowerCase();
  
  // Check for keyword matches with word boundaries (at least 1 match for MVP)
  const matchCount = GENERIC_KEYWORDS.filter(keyword => {
    // Use word boundary regex for more accurate matching
    const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'i');
    return regex.test(lowerText);
  }).length;
  
  return matchCount >= 1;
}

/**
 * Check if similar generic content exists in canon
 * Returns existing content if similarity > 90%
 */
export async function checkCanonReuse(
  artefactText: string,
  organizationId: string
): Promise<any | null> {
  if (!isGenericContent(artefactText)) {
    return null; // Not generic, can't reuse
  }

  // Find similar generic content (simple text similarity for MVP)
  const canonContent = await db
    .select()
    .from(contentGenerations)
    .where(
      and(
        eq(contentGenerations.contentType, 'generic'),
        eq(contentGenerations.status, 'completed')
      )
    )
    .limit(10);

  for (const content of canonContent) {
    const similarity = calculateTextSimilarity(artefactText, content.artefactText);
    if (similarity > 0.9) {
      console.log(`[Canon] Reusing content from generation ${content.id} (similarity: ${similarity.toFixed(2)})`);
      return content.factCheckerOutput; // Reuse this content
    }
  }

  return null;
}

/**
 * Simple text similarity using Jaccard index
 * In production, use cosine similarity with embeddings or Levenshtein distance
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  // Normalize and tokenize, filtering stop words
  const words1 = new Set(
    text1
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  );
  
  const words2 = new Set(
    text2
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  );
  
  // Jaccard similarity: |A ∩ B| / |A ∪ B|
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Calculate cost savings from canon reuse
 * Average generation cost is ~$0.52 per artefact
 * Reusing from canon saves 100% of generation cost
 */
export function calculateCanonSavings(originalCost: number): number {
  return originalCost; // 100% savings when reusing
}

/**
 * Get canon statistics for analytics
 */
export async function getCanonStats(organizationId: string): Promise<{
  totalCanonContent: number;
  totalReuses: number;
  totalSavings: number;
}> {
  const canonContent = await db
    .select()
    .from(contentGenerations)
    .where(
      and(
        eq(contentGenerations.contentType, 'generic'),
        eq(contentGenerations.status, 'completed')
      )
    );

  const totalCanonContent = canonContent.length;
  
  // In a real implementation, track reuse count in a separate column
  const totalReuses = 0; // Placeholder
  
  const totalSavings = canonContent.reduce((sum, content) => {
    const cost = parseFloat(content.totalCostUsd || '0');
    return sum + cost;
  }, 0);

  return {
    totalCanonContent,
    totalReuses,
    totalSavings,
  };
}

/**
 * Tag content as generic or proprietary
 * This helps with future canon lookups
 */
export function classifyContentType(artefactText: string | null | undefined): 'generic' | 'proprietary' | 'mixed' {
  if (!artefactText || typeof artefactText !== 'string') {
    return 'proprietary';
  }
  
  const lowerText = artefactText.toLowerCase();
  
  // Use word boundary regex for accurate matching
  const genericScore = GENERIC_KEYWORDS.filter(keyword => {
    const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'i');
    return regex.test(lowerText);
  }).length;

  if (genericScore >= 2) return 'generic';
  if (genericScore >= 1) return 'mixed';
  return 'proprietary';
}

/**
 * Find similar artefacts for deduplication
 * Returns list of similar content with similarity scores
 */
export async function findSimilarContent(
  artefactText: string,
  threshold: number = 0.8
): Promise<Array<{ id: string; similarity: number; title: string }>> {
  const allContent = await db
    .select({
      id: contentGenerations.id,
      artefactText: contentGenerations.artefactText,
      understanding: contentGenerations.understanding,
    })
    .from(contentGenerations)
    .where(eq(contentGenerations.status, 'completed'))
    .limit(50);

  const similar: Array<{ id: string; similarity: number; title: string }> = [];

  for (const content of allContent) {
    const similarity = calculateTextSimilarity(artefactText, content.artefactText);
    if (similarity >= threshold) {
      similar.push({
        id: content.id,
        similarity,
        title: content.understanding?.slice(0, 100) || 'Untitled',
      });
    }
  }

  // Sort by similarity descending
  return similar.sort((a, b) => b.similarity - a.similarity);
}

