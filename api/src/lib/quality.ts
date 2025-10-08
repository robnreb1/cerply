/**
 * Quality Floor - Heuristic Content Scoring
 * 
 * Ensures generated content meets minimum quality standards before canonization.
 * Implements retry logic with stricter generation parameters.
 * 
 * STUB MODE: Set QUALITY_STUB=true for deterministic testing (no model calls)
 */

import type { ContentBody, QualityMetrics } from './canon';

const QUALITY_THRESHOLD = 0.8;
const STUB_MODE = process.env.QUALITY_STUB === 'true';

// Forbidden template phrases that indicate low-quality templated content
const FORBIDDEN_PHRASES = [
  'getting started',
  'key principles',
  'practical applications',
  'introduction to',
  'basic concepts',
  'core fundamentals',
  'essential topics',
  'important concepts',
];

/**
 * Score artifact quality based on multiple heuristics
 */
export function scoreArtifact(
  artifact: ContentBody,
  options: {
    schema?: any;
    forbidPhrases?: string[];
    minLength?: number;
  } = {}
): number {
  // Stub mode: return fixed quality score for fast, deterministic testing
  if (STUB_MODE) {
    return 0.85;
  }

  const forbiddenPhrases = options.forbidPhrases || FORBIDDEN_PHRASES;
  const minLength = options.minLength || 100;

  let score = 1.0;
  const fullText = JSON.stringify(artifact).toLowerCase();
  const penalties: string[] = [];

  // 1. Check for forbidden/template phrases (heavy penalty)
  const foundForbidden = forbiddenPhrases.filter(phrase => fullText.includes(phrase));
  if (foundForbidden.length > 0) {
    score -= foundForbidden.length * 0.15;
    penalties.push(`Forbidden phrases: ${foundForbidden.join(', ')}`);
  }

  // 2. Schema coverage (required fields present & non-empty)
  if (!artifact.title || artifact.title.length < 10) {
    score -= 0.1;
    penalties.push('Title too short or missing');
  }
  if (!artifact.summary || artifact.summary.length < 50) {
    score -= 0.1;
    penalties.push('Summary too short or missing');
  }
  if (artifact.modules && artifact.modules.length === 0) {
    score -= 0.1;
    penalties.push('No modules provided');
  }

  // 3. Length bounds (content depth)
  if (fullText.length < minLength) {
    score -= 0.15;
    penalties.push(`Content too short: ${fullText.length} < ${minLength}`);
  }

  // 4. Unique token ratio (specificity/variety)
  const tokens = fullText.split(/\s+/).filter(t => t.length > 3);
  const uniqueRatio = tokens.length > 0 ? new Set(tokens).size / tokens.length : 0;
  if (uniqueRatio < 0.5) {
    score -= 0.1;
    penalties.push(`Low unique token ratio: ${uniqueRatio.toFixed(2)}`);
  } else if (uniqueRatio > 0.7) {
    score += 0.05; // Bonus for high specificity
  }

  // 5. Module depth (if modules exist)
  if (artifact.modules && artifact.modules.length > 0) {
    const modulesWithDesc = artifact.modules.filter(m => m.description && m.description.length > 20);
    if (modulesWithDesc.length < artifact.modules.length * 0.8) {
      score -= 0.05;
      penalties.push('Modules lack detailed descriptions');
    }
  }

  const finalScore = Math.max(0, Math.min(1, score));

  if (penalties.length > 0) {
    console.log(`[quality] Score ${finalScore.toFixed(2)} with penalties:`, penalties);
  }

  return finalScore;
}

/**
 * Detailed quality metrics breakdown
 */
export function evaluateQualityMetrics(artifact: ContentBody): QualityMetrics {
  // Stub mode: return fixed quality metrics for fast, deterministic testing
  if (STUB_MODE) {
    return {
      coherence: 0.85,
      coverage: 0.85,
      factualAccuracy: 0.85,
      pedagogicalSoundness: 0.85,
      overall: 0.85,
    };
  }

  let coherence = 0.85;
  let coverage = 0.85;
  let factualAccuracy = 0.85;
  let pedagogicalSoundness = 0.85;

  const fullText = JSON.stringify(artifact).toLowerCase();

  // Coherence: Check for template phrases and repetition
  const forbiddenCount = FORBIDDEN_PHRASES.filter(p => fullText.includes(p)).length;
  coherence -= forbiddenCount * 0.1;

  // Coverage: Check schema completeness
  if (artifact.title && artifact.title.length > 10) coverage += 0.05;
  if (artifact.summary && artifact.summary.length > 50) coverage += 0.05;
  if (artifact.modules && artifact.modules.length >= 3) coverage += 0.05;

  // Factual accuracy: Penalize vague/generic content
  const tokens = fullText.split(/\s+/);
  const uniqueRatio = new Set(tokens).size / tokens.length;
  if (uniqueRatio > 0.6) {
    factualAccuracy += 0.1;
  } else if (uniqueRatio < 0.4) {
    factualAccuracy -= 0.1;
  }

  // Pedagogical soundness: Module structure quality
  if (artifact.modules && artifact.modules.length > 0) {
    const wellStructured = artifact.modules.filter(m => 
      m.description && m.description.length > 30
    ).length;
    const ratio = wellStructured / artifact.modules.length;
    pedagogicalSoundness += (ratio - 0.5) * 0.2;
  }

  const overall = (coherence + coverage + factualAccuracy + pedagogicalSoundness) / 4;

  return {
    coherence: Math.max(0, Math.min(1, coherence)),
    coverage: Math.max(0, Math.min(1, coverage)),
    factualAccuracy: Math.max(0, Math.min(1, factualAccuracy)),
    pedagogicalSoundness: Math.max(0, Math.min(1, pedagogicalSoundness)),
    overall: Math.max(0, Math.min(1, overall)),
  };
}

/**
 * Check if artifact meets quality threshold
 */
export function meetsQualityFloor(artifact: ContentBody): boolean {
  const score = scoreArtifact(artifact);
  return score >= QUALITY_THRESHOLD;
}

/**
 * Generate with quality retry logic
 * 
 * First attempt: normal generation
 * If score < threshold: retry with stricter parameters
 */
export async function generateWithQualityRetry<T extends ContentBody>(
  generator: (rigorMode: boolean) => Promise<T> | T,
  options: {
    maxRetries?: number;
    threshold?: number;
  } = {}
): Promise<{ artifact: T; quality_score: number; quality_metrics: QualityMetrics; retried: boolean }> {
  const maxRetries = options.maxRetries || 1;
  const threshold = options.threshold || QUALITY_THRESHOLD;
  
  let artifact = await generator(false);
  let score = scoreArtifact(artifact);
  let retried = false;

  if (score < threshold && maxRetries > 0) {
    console.log(`[quality] First attempt score ${score.toFixed(2)} below threshold, retrying with rigor mode`);
    artifact = await generator(true);
    score = scoreArtifact(artifact);
    retried = true;
  }

  const metrics = evaluateQualityMetrics(artifact);

  return {
    artifact,
    quality_score: score,
    quality_metrics: metrics,
    retried,
  };
}

export { QUALITY_THRESHOLD };

