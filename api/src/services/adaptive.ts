/**
 * Adaptive Difficulty Engine - Epic 9
 * 
 * Core service for adaptive difficulty adjustment based on learner performance.
 * Uses time-weighted mastery calculation, learning style detection, and dynamic difficulty recommendations.
 * 
 * BRD: L-2 (Adaptive lesson plans with dynamic difficulty adjustment)
 * FSD: §30 (True Adaptive Difficulty Engine)
 * 
 * @module services/adaptive
 */

import { db } from '../db';
import { 
  learnerProfiles, 
  topicComprehension, 
  attempts, 
  confusionLog,
  questions,
  quizzes,
  modulesV2,
  topics
} from '../db/schema';
import { eq, and, desc, sql, isNull, lt } from 'drizzle-orm';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type DifficultyLevel = 'recall' | 'application' | 'analysis' | 'synthesis';
export type LearningStyle = 'visual' | 'verbal' | 'kinesthetic' | 'balanced' | 'unknown';

export interface MasteryScore {
  mastery: number;
  attemptsCount: number;
  recentPerformance: number;
}

export interface DifficultyRecommendation {
  difficulty: DifficultyLevel;
  masteryLevel: number;
  confidence: number;
  reasoning: string;
}

export interface LearningStyleDetection {
  style: LearningStyle;
  confidence: number;
  signals: {
    textConfusion?: number;
    diagramConfusion?: number;
    scenarioConfusion?: number;
    totalAttempts: number;
  };
}

export interface WeakTopic {
  topicId: string;
  topicTitle: string;
  mastery: number;
  attemptsCount: number;
  lastPracticedAt: Date | null;
}

export interface AdaptiveAttemptData {
  questionId: string;
  correct: boolean;
  partialCredit?: number;
  responseTimeMs?: number;
  difficultyLevel: DifficultyLevel;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Calculate mastery level for a user+topic with time decay
 * Recent attempts weighted more heavily (exponential decay with 30-day half-life)
 * 
 * Mastery calculation formula:
 * - Correctness: 40% weight
 * - Partial credit: 30% weight  
 * - Confusion (inverse): 20% weight
 * - Response time (normalized): 10% weight
 * 
 * @param userId - User UUID
 * @param topicId - Topic UUID
 * @returns Mastery score 0.00 - 1.00
 */
export async function calculateMasteryLevel(
  userId: string,
  topicId: string
): Promise<number> {
  // Fetch recent 20 attempts for this user+topic
  const recentAttempts = await db
    .select({
      attemptId: attempts.id,
      correct: attempts.correct,
      partialCredit: attempts.partialCredit,
      responseTimeMs: attempts.responseTimeMs,
      createdAt: attempts.createdAt,
      itemId: attempts.itemId,
    })
    .from(attempts)
    .innerJoin(questions, eq(attempts.itemId, questions.id))
    .innerJoin(quizzes, eq(questions.quizId, quizzes.id))
    .innerJoin(modulesV2, eq(quizzes.moduleId, modulesV2.id))
    .where(
      and(
        eq(attempts.userId, userId),
        eq(modulesV2.topicId, topicId)
      )
    )
    .orderBy(desc(attempts.createdAt))
    .limit(20);

  if (recentAttempts.length === 0) {
    return 0.0;
  }

  // Get confusion count for this user+topic
  const confusionCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(confusionLog)
    .innerJoin(questions, eq(confusionLog.questionId, questions.id))
    .innerJoin(quizzes, eq(questions.quizId, quizzes.id))
    .innerJoin(modulesV2, eq(quizzes.moduleId, modulesV2.id))
    .where(
      and(
        eq(confusionLog.userId, userId),
        eq(modulesV2.topicId, topicId)
      )
    );

  const totalConfusion = confusionCount[0]?.count ?? 0;

  // Calculate weighted score with time decay
  const now = Date.now();
  let totalScore = 0;
  let totalWeight = 0;

  // Calculate average response time for normalization
  const responseTimes = recentAttempts
    .filter((a: any) => a.responseTimeMs != null)
    .map((a: any) => a.responseTimeMs as number);
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((sum: number, t: number) => sum + t, 0) / responseTimes.length
    : 5000; // 5 second default

  recentAttempts.forEach((att: any) => {
    // Time decay: recent attempts weighted more (30-day half-life)
    const ageMs = now - new Date(att.createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const timeWeight = Math.exp(-ageDays / 30);

    // Performance components
    const correctnessScore = att.correct ? 1.0 : 0.0;
    const partialCreditScore = att.partialCredit ? Number(att.partialCredit) : 0.0;
    
    // Response time score (faster is better, normalized)
    let responseTimeScore = 0.5; // default neutral
    if (att.responseTimeMs && avgResponseTime > 0) {
      const normalized = att.responseTimeMs / avgResponseTime;
      responseTimeScore = Math.max(0, Math.min(1, 1.5 - normalized * 0.5));
    }

    // Confusion penalty (per attempt basis)
    const confusionPenalty = totalConfusion > 0 ? Math.min(0.3, totalConfusion / recentAttempts.length * 0.1) : 0;

    // Weighted average: correctness 40%, partial credit 30%, confusion 20%, response time 10%
    const attemptScore = (
      correctnessScore * 0.4 +
      partialCreditScore * 0.3 +
      (1 - confusionPenalty) * 0.2 +
      responseTimeScore * 0.1
    );

    totalScore += attemptScore * timeWeight;
    totalWeight += timeWeight;
  });

  const mastery = totalWeight > 0 ? totalScore / totalWeight : 0.0;
  return Math.max(0, Math.min(1, mastery)); // Clamp to 0.00 - 1.00
}

/**
 * Recommend next difficulty level based on mastery and recent performance
 * 
 * Difficulty mapping (Bloom's Taxonomy):
 * - < 0.50 mastery → "recall" (Remember facts)
 * - 0.50 - 0.75 mastery → "application" (Apply concepts)
 * - 0.75 - 0.90 mastery → "analysis" (Break down problems)
 * - > 0.90 mastery → "synthesis" (Create solutions)
 * 
 * Adjusts based on recent trend (last 3 attempts)
 * 
 * @param userId - User UUID
 * @param topicId - Topic UUID
 * @returns Difficulty recommendation with confidence and reasoning
 */
export async function recommendDifficultyLevel(
  userId: string,
  topicId: string
): Promise<DifficultyRecommendation> {
  const mastery = await calculateMasteryLevel(userId, topicId);

  // Get recent trend (last 3 attempts)
  const recentAttempts = await db
    .select({
      correct: attempts.correct,
      partialCredit: attempts.partialCredit,
      createdAt: attempts.createdAt,
    })
    .from(attempts)
    .innerJoin(questions, eq(attempts.itemId, questions.id))
    .innerJoin(quizzes, eq(questions.quizId, quizzes.id))
    .innerJoin(modulesV2, eq(quizzes.moduleId, modulesV2.id))
    .where(
      and(
        eq(attempts.userId, userId),
        eq(modulesV2.topicId, topicId)
      )
    )
    .orderBy(desc(attempts.createdAt))
    .limit(3);

  const recentScores = recentAttempts.map((a: any) => 
    a.partialCredit ? Number(a.partialCredit) : (a.correct ? 1.0 : 0.0)
  );
  const avgRecent = recentScores.length > 0
    ? recentScores.reduce((sum: number, s: number) => sum + s, 0) / recentScores.length
    : mastery;

  // Determine difficulty based on mastery + recent trend
  let difficulty: DifficultyLevel;
  let reasoning: string;

  if (mastery < 0.50) {
    difficulty = 'recall';
    reasoning = 'Building foundational knowledge. Focus on remembering key facts and concepts.';
  } else if (mastery < 0.75) {
    // Check if recent performance suggests readiness to advance
    if (avgRecent > 0.85 && recentScores.length >= 3) {
      difficulty = 'analysis';
      reasoning = 'Strong recent performance! Advancing to analysis level to break down complex problems.';
    } else {
      difficulty = 'application';
      reasoning = 'Applying concepts to new situations. Practice using knowledge in different contexts.';
    }
  } else if (mastery < 0.90) {
    // Check if ready for synthesis
    if (avgRecent > 0.90 && recentScores.length >= 3) {
      difficulty = 'synthesis';
      reasoning = 'Mastery achieved! Creating novel solutions and designing new approaches.';
    } else {
      difficulty = 'analysis';
      reasoning = 'Breaking down complex problems. Analyzing relationships and evaluating solutions.';
    }
  } else {
    difficulty = 'synthesis';
    reasoning = 'Expert level! Designing novel solutions and creating innovative approaches.';
  }

  // Confidence based on sample size and consistency
  const sampleSizeConfidence = Math.min(1.0, recentAttempts.length / 20);
  const consistencyScore = recentScores.length >= 2
    ? 1 - Math.min(1, calculateStandardDeviation(recentScores))
    : 0.5;
  const confidence = (sampleSizeConfidence * 0.6 + consistencyScore * 0.4);

  return {
    difficulty,
    masteryLevel: mastery,
    confidence: Math.max(0, Math.min(1, confidence)),
    reasoning,
  };
}

/**
 * Detect learning style from confusion patterns and performance by question type
 * 
 * Detection algorithm:
 * - Visual learners: Struggle more with text-heavy questions, prefer diagrams
 * - Verbal learners: Struggle with diagrams, prefer text explanations
 * - Kinesthetic learners: Prefer interactive/scenario questions
 * - Balanced: Consistent performance across question types
 * 
 * Requires minimum 20 attempts for reliable classification
 * 
 * @param userId - User UUID
 * @returns Learning style with confidence score
 */
export async function detectLearningStyle(
  userId: string
): Promise<LearningStyleDetection> {
  // Get confusion by question type
  const confusionData = await db
    .select({
      questionType: questions.type,
      confusionCount: sql<number>`count(*)`,
    })
    .from(confusionLog)
    .innerJoin(questions, eq(confusionLog.questionId, questions.id))
    .where(eq(confusionLog.userId, userId))
    .groupBy(questions.type);

  const totalConfusion = confusionData.reduce((sum: number, d: any) => sum + Number(d.confusionCount), 0);

  // Need at least 20 data points for reliable detection
  if (totalConfusion < 20) {
    return {
      style: 'unknown',
      confidence: 0.0,
      signals: {
        totalAttempts: totalConfusion,
      },
    };
  }

  // Extract confusion counts by type (mcq ~ text, free ~ verbal reasoning)
  const confusionByType: Record<string, number> = {};
  confusionData.forEach((d: any) => {
    confusionByType[d.questionType] = Number(d.confusionCount);
  });

  const textConfusion = confusionByType['mcq'] ?? 0;
  const freeConfusion = confusionByType['free'] ?? 0;
  const explainerConfusion = confusionByType['explainer'] ?? 0;

  // Determine learning style based on confusion patterns
  let style: LearningStyle;
  let styleConfidence: number;

  // Visual learners: high text confusion, low explainer confusion
  if (textConfusion > freeConfusion * 1.3 && explainerConfusion < textConfusion * 0.7) {
    style = 'visual';
    styleConfidence = Math.min(1.0, (textConfusion / (freeConfusion + 1)) / 2);
  }
  // Verbal learners: high explainer confusion, low text confusion
  else if (explainerConfusion > textConfusion * 1.3 && textConfusion < freeConfusion * 0.7) {
    style = 'verbal';
    styleConfidence = Math.min(1.0, (explainerConfusion / (textConfusion + 1)) / 2);
  }
  // Kinesthetic learners: prefer free-form over structured
  else if (freeConfusion < textConfusion * 0.7 && freeConfusion < explainerConfusion * 0.7) {
    style = 'kinesthetic';
    styleConfidence = Math.min(1.0, ((textConfusion + explainerConfusion) / (freeConfusion * 2 + 1)) / 2);
  }
  // Balanced: relatively even confusion across types
  else {
    style = 'balanced';
    const variance = calculateStandardDeviation([textConfusion, freeConfusion, explainerConfusion]);
    styleConfidence = Math.max(0.3, 1.0 - variance / totalConfusion);
  }

  // Adjust confidence based on sample size
  const sampleConfidence = Math.min(1.0, totalConfusion / 50);
  const finalConfidence = styleConfidence * sampleConfidence;

  return {
    style,
    confidence: Math.max(0, Math.min(1, finalConfidence)),
    signals: {
      textConfusion,
      diagramConfusion: explainerConfusion, // Using explainer as proxy
      scenarioConfusion: freeConfusion,
      totalAttempts: totalConfusion,
    },
  };
}

/**
 * Identify weak topics where user has mastery < threshold
 * Sorted by attempts count (DESC) then mastery (ASC) to prioritize practiced but weak topics
 * 
 * @param userId - User UUID
 * @param threshold - Mastery threshold (default: 0.70)
 * @returns Array of weak topics with details
 */
export async function identifyWeakTopics(
  userId: string,
  threshold: number = 0.70
): Promise<WeakTopic[]> {
  const weakComprehension = await db
    .select({
      topicId: topicComprehension.topicId,
      mastery: topicComprehension.masteryLevel,
      attemptsCount: topicComprehension.attemptsCount,
      lastPracticedAt: topicComprehension.lastPracticedAt,
      topicTitle: topics.title,
    })
    .from(topicComprehension)
    .innerJoin(topics, eq(topicComprehension.topicId, topics.id))
    .where(
      and(
        eq(topicComprehension.userId, userId),
        lt(topicComprehension.masteryLevel, sql`${threshold}`)
      )
    )
    .orderBy(
      desc(topicComprehension.attemptsCount),
      sql`${topicComprehension.masteryLevel} ASC`
    );

  return weakComprehension.map((row: any) => ({
    topicId: row.topicId,
    topicTitle: row.topicTitle,
    mastery: Number(row.mastery),
    attemptsCount: row.attemptsCount,
    lastPracticedAt: row.lastPracticedAt,
  }));
}

/**
 * Update learner profile with new performance signals
 * Called periodically (e.g., every 5 attempts) to refresh learning style and consistency
 * 
 * @param userId - User UUID
 * @param signals - Optional performance signals to include
 */
export async function updateLearnerProfile(
  userId: string,
  signals?: {
    avgResponseTime?: number;
    consistencyScore?: number;
    learningStyle?: LearningStyle;
  }
): Promise<void> {
  // Detect learning style if not provided
  let learningStyle = signals?.learningStyle;
  if (!learningStyle) {
    const detection = await detectLearningStyle(userId);
    if (detection.confidence > 0.5) {
      learningStyle = detection.style;
    }
  }

  // Calculate average response time from recent attempts
  let avgResponseTime = signals?.avgResponseTime;
  if (!avgResponseTime) {
    const recentAttempts = await db
      .select({ responseTimeMs: attempts.responseTimeMs })
      .from(attempts)
      .where(
        and(
          eq(attempts.userId, userId),
          sql`${attempts.responseTimeMs} IS NOT NULL`
        )
      )
      .orderBy(desc(attempts.createdAt))
      .limit(50);

    if (recentAttempts.length > 0) {
      const times = recentAttempts
        .filter((a: any) => a.responseTimeMs != null)
        .map((a: any) => a.responseTimeMs as number);
      avgResponseTime = times.reduce((sum: number, t: number) => sum + t, 0) / times.length;
    }
  }

  // Calculate consistency score (inverse of standard deviation)
  let consistencyScore = signals?.consistencyScore;
  if (!consistencyScore) {
    const recentScores = await db
      .select({ 
        correct: attempts.correct,
        partialCredit: attempts.partialCredit,
      })
      .from(attempts)
      .where(eq(attempts.userId, userId))
      .orderBy(desc(attempts.createdAt))
      .limit(20);

    if (recentScores.length >= 5) {
      const scores = recentScores.map((a: any) => 
        a.partialCredit ? Number(a.partialCredit) : (a.correct ? 1.0 : 0.0)
      );
      const stdDev = calculateStandardDeviation(scores);
      consistencyScore = Math.max(0, 1.0 - stdDev);
    }
  }

  // Upsert learner profile
  const existingProfile = await db
    .select()
    .from(learnerProfiles)
    .where(eq(learnerProfiles.userId, userId))
    .limit(1);

  if (existingProfile.length > 0) {
    // Update existing profile
    await db
      .update(learnerProfiles)
      .set({
        learningStyle: learningStyle ?? existingProfile[0].learningStyle,
        avgResponseTime: avgResponseTime?.toString() ?? existingProfile[0].avgResponseTime,
        consistencyScore: consistencyScore?.toString() ?? existingProfile[0].consistencyScore,
        updatedAt: new Date(),
      })
      .where(eq(learnerProfiles.userId, userId));
  } else {
    // Create new profile
    await db.insert(learnerProfiles).values({
      userId,
      learningStyle: learningStyle ?? 'unknown',
      avgResponseTime: avgResponseTime?.toString(),
      consistencyScore: consistencyScore?.toString(),
    });
  }
}

/**
 * Record attempt for adaptive difficulty tracking
 * Updates topic_comprehension with new mastery level and difficulty recommendation
 * 
 * @param userId - User UUID
 * @param topicId - Topic UUID
 * @param attemptData - Attempt details
 * @returns Updated mastery level
 */
export async function recordAttemptForAdaptive(
  userId: string,
  topicId: string,
  attemptData: AdaptiveAttemptData
): Promise<number> {
  // Get or create topic comprehension record
  const existing = await db
    .select()
    .from(topicComprehension)
    .where(
      and(
        eq(topicComprehension.userId, userId),
        eq(topicComprehension.topicId, topicId)
      )
    )
    .limit(1);

  // Count confusion for this question
  const questionConfusion = await db
    .select({ count: sql<number>`count(*)` })
    .from(confusionLog)
    .where(
      and(
        eq(confusionLog.userId, userId),
        eq(confusionLog.questionId, attemptData.questionId)
      )
    );

  const confusionIncrement = Number(questionConfusion[0]?.count ?? 0) > 0 ? 1 : 0;

  // Update comprehension metrics
  const newAttemptsCount = (existing[0]?.attemptsCount ?? 0) + 1;
  const newCorrectCount = (existing[0]?.correctCount ?? 0) + (attemptData.correct ? 1 : 0);
  const newPartialCreditSum = Number(existing[0]?.partialCreditSum ?? 0) + (attemptData.partialCredit ?? 0);
  const newConfusionCount = (existing[0]?.confusionCount ?? 0) + confusionIncrement;

  // Recalculate mastery level
  const newMastery = await calculateMasteryLevel(userId, topicId);

  // Get recommended difficulty for next attempt
  const recommendation = await recommendDifficultyLevel(userId, topicId);

  if (existing.length > 0) {
    // Update existing record
    await db
      .update(topicComprehension)
      .set({
        masteryLevel: newMastery.toString(),
        difficultyLevel: recommendation.difficulty,
        attemptsCount: newAttemptsCount,
        correctCount: newCorrectCount,
        partialCreditSum: newPartialCreditSum.toString(),
        confusionCount: newConfusionCount,
        lastPracticedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(topicComprehension.userId, userId),
          eq(topicComprehension.topicId, topicId)
        )
      );
  } else {
    // Create new record
    await db.insert(topicComprehension).values({
      userId,
      topicId,
      masteryLevel: newMastery.toString(),
      difficultyLevel: recommendation.difficulty,
      attemptsCount: newAttemptsCount,
      correctCount: newCorrectCount,
      partialCreditSum: newPartialCreditSum.toString(),
      confusionCount: newConfusionCount,
      lastPracticedAt: new Date(),
    });
  }

  // Update learner profile every 5 attempts
  if (newAttemptsCount % 5 === 0) {
    await updateLearnerProfile(userId);
  }

  return newMastery;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate standard deviation of an array of numbers
 */
function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Map mastery level to difficulty level (simple mapping without recent trend)
 */
export function mapMasteryToDifficulty(mastery: number): DifficultyLevel {
  if (mastery < 0.50) return 'recall';
  if (mastery < 0.75) return 'application';
  if (mastery < 0.90) return 'analysis';
  return 'synthesis';
}

