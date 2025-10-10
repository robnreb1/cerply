/**
 * Gamification Service
 * Epic 7: Gamification & Certification System
 * Handles level calculations, badge detection, and progression tracking
 */

import { db } from '../db';
import { learnerLevels, attempts, tracks } from '../db/schema';
import { eq, and, count, sql, desc } from 'drizzle-orm';

export type Level = 'novice' | 'learner' | 'practitioner' | 'expert' | 'master';

export interface LevelInfo {
  level: Level;
  correctAttempts: number;
  nextLevel: Level | null;
  attemptsToNext: number | null;
}

export interface LevelUpEvent {
  userId: string;
  trackId: string;
  previousLevel: Level;
  newLevel: Level;
  correctAttempts: number;
}

/**
 * Calculate level based on correct attempts
 * Thresholds: novice (0-20), learner (21-50), practitioner (51-100), expert (101-200), master (201+)
 */
export function calculateLevel(correctAttempts: number): Level {
  if (correctAttempts >= 201) return 'master';
  if (correctAttempts >= 101) return 'expert';
  if (correctAttempts >= 51) return 'practitioner';
  if (correctAttempts >= 21) return 'learner';
  return 'novice';
}

/**
 * Get next level and attempts needed
 */
export function getNextLevelInfo(correctAttempts: number): { nextLevel: Level | null; attemptsToNext: number | null } {
  if (correctAttempts < 21) return { nextLevel: 'learner', attemptsToNext: 21 - correctAttempts };
  if (correctAttempts < 51) return { nextLevel: 'practitioner', attemptsToNext: 51 - correctAttempts };
  if (correctAttempts < 101) return { nextLevel: 'expert', attemptsToNext: 101 - correctAttempts };
  if (correctAttempts < 201) return { nextLevel: 'master', attemptsToNext: 201 - correctAttempts };
  return { nextLevel: null, attemptsToNext: null }; // Already at max level
}

/**
 * Get learner's current level for a track
 */
export async function getLearnerLevel(userId: string, trackId: string): Promise<LevelInfo> {
  // Check if level record exists
  const [levelRecord] = await db
    .select()
    .from(learnerLevels)
    .where(and(
      eq(learnerLevels.userId, userId),
      eq(learnerLevels.trackId, trackId)
    ))
    .limit(1);

  if (levelRecord) {
    const { nextLevel, attemptsToNext } = getNextLevelInfo(levelRecord.correctAttempts);
    return {
      level: levelRecord.level as Level,
      correctAttempts: levelRecord.correctAttempts,
      nextLevel,
      attemptsToNext,
    };
  }

  // No record yet - calculate from attempts
  const correctAttemptsCount = await countCorrectAttempts(userId, trackId);
  const level = calculateLevel(correctAttemptsCount);
  const { nextLevel, attemptsToNext } = getNextLevelInfo(correctAttemptsCount);

  return { level, correctAttempts: correctAttemptsCount, nextLevel, attemptsToNext };
}

/**
 * Check if level-up occurred and update DB
 * Call this after each attempt submission
 * Returns LevelUpEvent if level changed, null otherwise
 */
export async function checkLevelUp(
  userId: string,
  trackId: string,
  newCorrectAttempts: number
): Promise<LevelUpEvent | null> {
  // Get current level record
  const [currentRecord] = await db
    .select()
    .from(learnerLevels)
    .where(and(
      eq(learnerLevels.userId, userId),
      eq(learnerLevels.trackId, trackId)
    ))
    .limit(1);

  const previousLevel = currentRecord?.level as Level || 'novice';
  const newLevel = calculateLevel(newCorrectAttempts);

  // Check if level changed
  if (previousLevel !== newLevel) {
    // Update or insert level record
    await db
      .insert(learnerLevels)
      .values({
        userId,
        trackId,
        level: newLevel,
        correctAttempts: newCorrectAttempts,
        leveledUpAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [learnerLevels.userId, learnerLevels.trackId],
        set: {
          level: newLevel,
          correctAttempts: newCorrectAttempts,
          leveledUpAt: new Date(),
        },
      });

    return {
      userId,
      trackId,
      previousLevel,
      newLevel,
      correctAttempts: newCorrectAttempts,
    };
  }

  // No level-up, but update attempts count if record exists
  if (currentRecord) {
    await db
      .update(learnerLevels)
      .set({ correctAttempts: newCorrectAttempts })
      .where(and(
        eq(learnerLevels.userId, userId),
        eq(learnerLevels.trackId, trackId)
      ));
  } else {
    // Create initial record if it doesn't exist
    await db
      .insert(learnerLevels)
      .values({
        userId,
        trackId,
        level: newLevel,
        correctAttempts: newCorrectAttempts,
        leveledUpAt: new Date(),
      })
      .onConflictDoNothing();
  }

  return null; // No level-up
}

/**
 * Count correct attempts for a learner on a track
 * Assumes attempts are linked to items, which are linked to modules, which are linked to plans
 * For track-level attempts, we need to join through items->modules->plans to match trackId
 */
export async function countCorrectAttempts(userId: string, trackId: string): Promise<number> {
  // Note: This assumes attempts table has a way to link to tracks
  // In the current schema, attempts -> items -> modules -> plans
  // We need to verify if tracks reference plans or if there's another relationship
  // For MVP, we'll do a simplified count of all correct attempts for the user
  // TODO: Add proper track filtering once schema relationships are clarified
  
  const [result] = await db
    .select({ count: count() })
    .from(attempts)
    .where(and(
      eq(attempts.userId, userId),
      eq(attempts.correct, 1)
    ));

  return result?.count || 0;
}

/**
 * Get all learner levels for a user across all tracks (with pagination)
 */
export async function getAllLearnerLevels(
  userId: string,
  limit?: number,
  offset?: number
): Promise<{
  data: Array<{
    trackId: string;
    trackTitle: string;
    level: Level;
    correctAttempts: number;
    nextLevel: Level | null;
    attemptsToNext: number | null;
    leveledUpAt: Date;
  }>;
  total: number;
}> {
  // Get total count
  const [countResult] = await db
    .select({ count: count() })
    .from(learnerLevels)
    .where(eq(learnerLevels.userId, userId));
  
  const total = Number(countResult?.count || 0);

  // Get paginated data
  let query = db
    .select({
      trackId: learnerLevels.trackId,
      trackTitle: tracks.title,
      level: learnerLevels.level,
      correctAttempts: learnerLevels.correctAttempts,
      leveledUpAt: learnerLevels.leveledUpAt,
    })
    .from(learnerLevels)
    .leftJoin(tracks, eq(learnerLevels.trackId, tracks.id))
    .where(eq(learnerLevels.userId, userId))
    .orderBy(desc(learnerLevels.leveledUpAt))
    .limit(limit || 50)
    .offset(offset || 0);

  const levels = await query;

  const data = levels.map(l => {
    const { nextLevel, attemptsToNext } = getNextLevelInfo(l.correctAttempts);
    return {
      trackId: l.trackId,
      trackTitle: l.trackTitle || 'Unknown Track',
      level: l.level as Level,
      correctAttempts: l.correctAttempts,
      nextLevel,
      attemptsToNext,
      leveledUpAt: l.leveledUpAt,
    };
  });

  return { data, total };
}

