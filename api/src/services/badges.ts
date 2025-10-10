/**
 * Badge Service
 * Epic 7: Gamification & Certification System
 * Badge criteria detection and awarding
 */

import { db } from '../db';
import { learnerBadges, badges, attempts, certificates } from '../db/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';

export interface BadgeCriteria {
  type: 'speed' | 'streak' | 'daily_streak' | 'shares' | 'tracks_completed';
  count?: number;
  days?: number;
  maxSeconds?: number;
}

/**
 * Check if learner earned Speed Demon badge
 * 10 questions < 5 seconds each (correct)
 */
export async function checkSpeedDemonBadge(userId: string): Promise<boolean> {
  const recentAttempts = await db
    .select({
      correct: attempts.correct,
      timeMs: attempts.timeMs,
    })
    .from(attempts)
    .where(and(
      eq(attempts.userId, userId),
      eq(attempts.correct, 1)
    ))
    .orderBy(desc(attempts.createdAt))
    .limit(10);

  if (recentAttempts.length < 10) return false;

  // Check if all 10 recent correct attempts were under 5 seconds
  return recentAttempts.every(a => (a.timeMs || 0) < 5000);
}

/**
 * Check if learner earned Perfectionist badge
 * 20 questions in a row correct
 */
export async function checkPerfectionistBadge(userId: string): Promise<boolean> {
  const recentAttempts = await db
    .select({ correct: attempts.correct })
    .from(attempts)
    .where(eq(attempts.userId, userId))
    .orderBy(desc(attempts.createdAt))
    .limit(20);

  if (recentAttempts.length < 20) return false;

  // Check if all 20 recent attempts were correct
  return recentAttempts.every(a => a.correct === 1);
}

/**
 * Check if learner earned 7-Day Consistent badge
 * At least 1 question per day for 7 days
 */
export async function checkConsistentBadge(userId: string): Promise<boolean> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const dailyAttempts = await db
    .select({
      date: sql<string>`DATE(${attempts.createdAt})`,
      count: count(),
    })
    .from(attempts)
    .where(and(
      eq(attempts.userId, userId),
      sql`${attempts.createdAt} >= ${sevenDaysAgo}`
    ))
    .groupBy(sql`DATE(${attempts.createdAt})`);

  // Need attempts on at least 7 different days
  return dailyAttempts.length >= 7;
}

/**
 * Check if learner earned Lifelong Learner badge
 * Complete 5 different tracks
 */
export async function checkLifelongLearnerBadge(userId: string): Promise<boolean> {
  const [result] = await db
    .select({ count: count() })
    .from(certificates)
    .where(eq(certificates.userId, userId));

  return (result?.count || 0) >= 5;
}

/**
 * Award badge to learner
 * Returns true if badge was newly awarded, false if already had it
 */
export async function awardBadge(userId: string, badgeSlug: string): Promise<boolean> {
  // Get badge ID
  const [badge] = await db
    .select({ id: badges.id })
    .from(badges)
    .where(eq(badges.slug, badgeSlug))
    .limit(1);

  if (!badge) {
    console.warn(`[badges] Badge not found: ${badgeSlug}`);
    return false;
  }

  // Check if already earned
  const [existing] = await db
    .select()
    .from(learnerBadges)
    .where(and(
      eq(learnerBadges.userId, userId),
      eq(learnerBadges.badgeId, badge.id)
    ))
    .limit(1);

  if (existing) return false; // Already earned

  // Award badge
  await db.insert(learnerBadges).values({
    userId,
    badgeId: badge.id,
    earnedAt: new Date(),
  });

  console.log(`[badges] Awarded "${badgeSlug}" to user ${userId}`);
  return true;
}

/**
 * Check all badge criteria for a learner
 * Run this periodically (cron job) or after significant events
 * Returns array of newly awarded badge slugs
 */
export async function detectAllBadges(userId: string): Promise<string[]> {
  const newBadges: string[] = [];

  const checks = [
    { slug: 'speed-demon', fn: () => checkSpeedDemonBadge(userId) },
    { slug: 'perfectionist', fn: () => checkPerfectionistBadge(userId) },
    { slug: 'consistent', fn: () => checkConsistentBadge(userId) },
    { slug: 'lifelong-learner', fn: () => checkLifelongLearnerBadge(userId) },
    // Note: 'knowledge-sharer' requires shares tracking, skipped for MVP
  ];

  for (const check of checks) {
    try {
      const earned = await check.fn();
      if (earned) {
        const awarded = await awardBadge(userId, check.slug);
        if (awarded) {
          newBadges.push(check.slug);
        }
      }
    } catch (error) {
      console.error(`[badges] Error checking ${check.slug} for user ${userId}:`, error);
    }
  }

  return newBadges;
}

/**
 * Get all badges earned by a learner
 */
export async function getLearnerBadges(userId: string): Promise<Array<{
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
}>> {
  const earnedBadges = await db
    .select({
      id: badges.id,
      slug: badges.slug,
      name: badges.name,
      description: badges.description,
      icon: badges.icon,
      earnedAt: learnerBadges.earnedAt,
    })
    .from(learnerBadges)
    .leftJoin(badges, eq(learnerBadges.badgeId, badges.id))
    .where(eq(learnerBadges.userId, userId))
    .orderBy(desc(learnerBadges.earnedAt));

  return earnedBadges.map(b => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    description: b.description,
    icon: b.icon,
    earnedAt: b.earnedAt,
  }));
}

/**
 * Get all available badges (for showing progress toward unearned badges)
 */
export async function getAllBadges(): Promise<Array<{
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  criteria: BadgeCriteria;
}>> {
  const allBadges = await db.select().from(badges);

  return allBadges.map(b => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    description: b.description,
    icon: b.icon,
    criteria: b.criteria as BadgeCriteria,
  }));
}

