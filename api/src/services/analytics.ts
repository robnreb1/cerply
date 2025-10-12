/**
 * Analytics Service: Team comprehension metrics, at-risk identification, retention curves
 * Epic 4: Manager Dashboard - Analytics & Insights
 * BRD: B-2, B-14 | FSD: §24 Manager Dashboard & Analytics v1
 */

import { eq, and, gte, lte, sql, isNull, or, desc, asc } from 'drizzle-orm';
import { db } from '../db';
import {
  teams,
  teamMembers,
  users,
  organizations,
  tracks,
  attempts,
  reviewSchedule,
  items,
  modules,
  plans,
  teamTrackSubscriptions,
  teamAnalyticsSnapshots,
  learnerAnalytics,
  retentionCurves,
  analyticsConfig,
} from '../db/schema';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface TeamAnalytics {
  teamId: string;
  teamName: string;
  avgComprehension: number; // 0.0 - 1.0
  activeLearners: number;
  atRiskCount: number;
  totalAttempts: number;
  completionRate: number; // % of assigned tracks completed
  trendingUp: boolean; // compared to last week
  lastUpdated: string;
}

export interface LearnerStatus {
  userId: string;
  name: string | null;
  email: string;
  comprehensionRate: number;
  totalAttempts: number;
  lastAttemptAt: string | null;
  overdueReviews: number;
  isAtRisk: boolean;
}

export interface RetentionCurve {
  dayOffset: number; // 0, 7, 14, 30
  retentionRate: number; // 0.0 - 1.0
  sampleSize: number;
}

export interface TrackPerformance {
  trackId: string;
  trackTitle: string;
  avgComprehension: number;
  completionRate: number;
  weakTopics: string[]; // topics with <70% comprehension
  activeLearners: number;
  totalAttempts: number;
}

export interface OrganizationOverview {
  organizationId: string;
  organizationName: string;
  totalTeams: number;
  activeLearners: number;
  avgComprehension: number;
  totalAtRiskCount: number;
  totalAttempts: number;
}

export interface AnalyticsCache {
  key: string;
  data: any;
  timestamp: number;
  ttl: number; // in milliseconds
}

// Simple in-memory cache
const analyticsCache = new Map<string, AnalyticsCache>();

// ============================================================================
// Configuration & Helpers
// ============================================================================

/**
 * Get analytics config for an organization
 */
async function getAnalyticsConfig(organizationId: string): Promise<{
  atRiskMinComprehension: number;
  atRiskMaxOverdue: number;
  cacheTtlMinutes: number;
}> {
  const config = await db
    .select()
    .from(analyticsConfig)
    .where(eq(analyticsConfig.organizationId, organizationId))
    .limit(1);

  if (config.length > 0) {
    return {
      atRiskMinComprehension: parseFloat(config[0].atRiskMinComprehension || '0.7'),
      atRiskMaxOverdue: config[0].atRiskMaxOverdue || 5,
      cacheTtlMinutes: config[0].cacheTtlMinutes || 60,
    };
  }

  // Default values
  return {
    atRiskMinComprehension: 0.7,
    atRiskMaxOverdue: 5,
    cacheTtlMinutes: 60,
  };
}

/**
 * Get data from cache if valid
 */
function getCachedData(key: string): any | null {
  const cached = analyticsCache.get(key);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    analyticsCache.delete(key);
    return null;
  }

  return cached.data;
}

/**
 * Store data in cache
 */
function setCachedData(key: string, data: any, ttlMinutes: number): void {
  analyticsCache.set(key, {
    key,
    data,
    timestamp: Date.now(),
    ttl: ttlMinutes * 60 * 1000,
  });
}

/**
 * Check if learner is at risk based on config
 */
function isLearnerAtRisk(
  comprehensionRate: number,
  overdueReviews: number,
  config: { atRiskMinComprehension: number; atRiskMaxOverdue: number }
): boolean {
  return comprehensionRate < config.atRiskMinComprehension || overdueReviews > config.atRiskMaxOverdue;
}

// ============================================================================
// Core Analytics Functions
// ============================================================================

/**
 * Compute team analytics (with caching)
 */
export async function computeTeamAnalytics(
  teamId: string,
  trackId?: string,
  forceRefresh: boolean = false
): Promise<TeamAnalytics> {
  // Check cache
  const cacheKey = `team:${teamId}:track:${trackId || 'all'}`;
  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log(`[analytics] Cache HIT: ${cacheKey}`);
      return cached;
    }
  }
  console.log(`[analytics] Cache MISS: ${cacheKey}`);

  // Get team info and org config
  const [teamInfo] = await db
    .select({
      id: teams.id,
      name: teams.name,
      organizationId: teams.organizationId,
    })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!teamInfo) {
    throw new Error('Team not found');
  }

  const config = await getAnalyticsConfig(teamInfo.organizationId);

  // Get team members
  const members = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  const memberIds = members.map((m) => m.userId);

  if (memberIds.length === 0) {
    // No members, return zeros
    const result: TeamAnalytics = {
      teamId,
      teamName: teamInfo.name,
      avgComprehension: 0,
      activeLearners: 0,
      atRiskCount: 0,
      totalAttempts: 0,
      completionRate: 0,
      trendingUp: false,
      lastUpdated: new Date().toISOString(),
    };
    setCachedData(cacheKey, result, config.cacheTtlMinutes);
    return result;
  }

  // Build attempts query based on track filter
  let attemptsData: any[];

  if (trackId) {
    // Query with track filtering (requires joins)
    // For now, get all attempts for team members - track filtering would need proper schema
    attemptsData = await db
      .select({
        userId: attempts.userId,
        correct: attempts.correct,
        createdAt: attempts.createdAt,
      })
      .from(attempts)
      .where(sql`${attempts.userId} IN (${sql.join(memberIds.map((id) => sql`${id}`), sql`, `)})`);
  } else {
    // Get all attempts for team members
    attemptsData = await db
      .select({
        userId: attempts.userId,
        correct: attempts.correct,
        createdAt: attempts.createdAt,
      })
      .from(attempts)
      .where(sql`${attempts.userId} IN (${sql.join(memberIds.map((id) => sql`${id}`), sql`, `)})`)
  }

  // Calculate metrics
  const totalAttempts = attemptsData.length;
  const correctAttempts = attemptsData.filter((a) => a.correct === 1).length;
  const avgComprehension = totalAttempts > 0 ? correctAttempts / totalAttempts : 0;

  // Get active learners (learners with at least 1 attempt)
  const activeLearnerIds = new Set(attemptsData.map((a) => a.userId));
  const activeLearners = activeLearnerIds.size;

  // Get at-risk count
  const atRiskLearners = await getAtRiskLearnersInternal(teamId, trackId, config);
  const atRiskCount = atRiskLearners.length;

  // Calculate trend (compare with last week)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const recentAttempts = attemptsData.filter(
    (a) => new Date(a.createdAt) >= oneWeekAgo
  );
  const recentCorrect = recentAttempts.filter((a) => a.correct === 1).length;
  const recentComprehension = recentAttempts.length > 0 ? recentCorrect / recentAttempts.length : 0;

  const trendingUp = recentComprehension > avgComprehension;

  // Completion rate (placeholder - would need track structure data)
  const completionRate = activeLearners > 0 ? Math.min(1.0, totalAttempts / (activeLearners * 20)) : 0;

  const result: TeamAnalytics = {
    teamId,
    teamName: teamInfo.name,
    avgComprehension: Math.round(avgComprehension * 1000) / 1000, // round to 3 decimals
    activeLearners,
    atRiskCount,
    totalAttempts,
    completionRate: Math.round(completionRate * 1000) / 1000,
    trendingUp,
    lastUpdated: new Date().toISOString(),
  };

  // Cache result
  setCachedData(cacheKey, result, config.cacheTtlMinutes);

  return result;
}

/**
 * Get at-risk learners (internal helper with config)
 */
async function getAtRiskLearnersInternal(
  teamId: string,
  trackId: string | undefined,
  config: { atRiskMinComprehension: number; atRiskMaxOverdue: number }
): Promise<LearnerStatus[]> {
  // Get team members
  const members = await db
    .select({
      userId: teamMembers.userId,
      email: users.email,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId));

  const atRiskLearners: LearnerStatus[] = [];

  for (const member of members) {
    // Get learner attempts
    const learnerAttempts = await db
      .select({
        correct: attempts.correct,
        createdAt: attempts.createdAt,
      })
      .from(attempts)
      .where(eq(attempts.userId, member.userId));

    const totalAttempts = learnerAttempts.length;
    const correctAttempts = learnerAttempts.filter((a) => a.correct === 1).length;
    const comprehensionRate = totalAttempts > 0 ? correctAttempts / totalAttempts : 1.0;

    // Get overdue reviews
    const now = new Date();
    const overdueReviews = await db
      .select({ id: reviewSchedule.id })
      .from(reviewSchedule)
      .where(
        and(
          eq(reviewSchedule.userId, member.userId),
          lte(reviewSchedule.nextAt, now)
        )
      );

    const overdueCount = overdueReviews.length;

    // Check if at risk
    const isAtRisk = isLearnerAtRisk(comprehensionRate, overdueCount, config);

    if (isAtRisk) {
      const lastAttempt = learnerAttempts.length > 0
        ? learnerAttempts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        : null;

      atRiskLearners.push({
        userId: member.userId,
        name: null, // Would need to join with user profile table if exists
        email: member.email,
        comprehensionRate: Math.round(comprehensionRate * 1000) / 1000,
        totalAttempts,
        lastAttemptAt: lastAttempt ? lastAttempt.createdAt.toISOString() : null,
        overdueReviews: overdueCount,
        isAtRisk: true,
      });
    }
  }

  return atRiskLearners;
}

/**
 * Get at-risk learners (public API with pagination)
 */
export async function getAtRiskLearners(
  teamId: string,
  trackId?: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ learners: LearnerStatus[]; total: number }> {
  // Get team org for config
  const [teamInfo] = await db
    .select({ organizationId: teams.organizationId })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!teamInfo) {
    throw new Error('Team not found');
  }

  const config = await getAnalyticsConfig(teamInfo.organizationId);

  // Get all at-risk learners
  const allAtRisk = await getAtRiskLearnersInternal(teamId, trackId, config);

  // Apply pagination
  const total = allAtRisk.length;
  const learners = allAtRisk.slice(offset, offset + limit);

  return { learners, total };
}

/**
 * Compute retention curve (D0, D7, D14, D30)
 */
export async function computeRetentionCurve(
  teamId: string,
  trackId?: string
): Promise<RetentionCurve[]> {
  const cacheKey = `retention:${teamId}:${trackId || 'all'}`;
  const cached = getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  // Get team members
  const members = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  const memberIds = members.map((m) => m.userId);

  if (memberIds.length === 0) {
    return [];
  }

  const dayOffsets = [0, 7, 14, 30];
  const retentionData: RetentionCurve[] = [];

  for (const dayOffset of dayOffsets) {
    // Calculate retention for this day offset
    // Logic: For items first attempted X days ago, what % are still recalled correctly?
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - dayOffset);

    // Get attempts around target date (±1 day window)
    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - 1);
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 1);

    const initialAttempts = await db
      .select({
        itemId: attempts.itemId,
        userId: attempts.userId,
        correct: attempts.correct,
      })
      .from(attempts)
      .where(
        and(
          sql`${attempts.userId} IN (${sql.join(memberIds.map((id) => sql`${id}`), sql`, `)})`,
          gte(attempts.createdAt, startDate),
          lte(attempts.createdAt, endDate)
        )
      );

    if (initialAttempts.length === 0) {
      retentionData.push({
        dayOffset,
        retentionRate: 0,
        sampleSize: 0,
      });
      continue;
    }

    // For D0, retention is initial correct rate
    if (dayOffset === 0) {
      const correctCount = initialAttempts.filter((a) => a.correct === 1).length;
      retentionData.push({
        dayOffset: 0,
        retentionRate: Math.round((correctCount / initialAttempts.length) * 1000) / 1000,
        sampleSize: initialAttempts.length,
      });
      continue;
    }

    // For D7, D14, D30: check how many are still in review schedule and correctly recalled
    const itemUserPairs = initialAttempts
      .filter((a) => a.userId !== null)
      .map((a) => ({ itemId: a.itemId, userId: a.userId as string }));

    // Get recent attempts for these items (in the last 3 days)
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 3);

    let retainedCount = 0;
    let sampleSize = 0;

    for (const pair of itemUserPairs) {
      const recentAttempts = await db
        .select({ correct: attempts.correct })
        .from(attempts)
        .where(
          and(
            eq(attempts.userId, pair.userId),
            eq(attempts.itemId, pair.itemId),
            gte(attempts.createdAt, recentDate)
          )
        )
        .orderBy(desc(attempts.createdAt))
        .limit(1);

      if (recentAttempts.length > 0) {
        sampleSize++;
        if (recentAttempts[0].correct === 1) {
          retainedCount++;
        }
      }
    }

    const retentionRate = sampleSize > 0 ? retainedCount / sampleSize : 0;

    retentionData.push({
      dayOffset,
      retentionRate: Math.round(retentionRate * 1000) / 1000,
      sampleSize,
    });
  }

  // Cache result
  const [teamInfo] = await db
    .select({ organizationId: teams.organizationId })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (teamInfo) {
    const config = await getAnalyticsConfig(teamInfo.organizationId);
    setCachedData(cacheKey, retentionData, config.cacheTtlMinutes);
  }

  return retentionData;
}

/**
 * Get per-track performance breakdown
 */
export async function getTrackPerformance(
  teamId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ tracks: TrackPerformance[]; total: number }> {
  // Get team subscriptions
  const subscriptions = await db
    .select({
      trackId: teamTrackSubscriptions.trackId,
      trackTitle: tracks.title,
    })
    .from(teamTrackSubscriptions)
    .innerJoin(tracks, eq(teamTrackSubscriptions.trackId, tracks.id))
    .where(eq(teamTrackSubscriptions.teamId, teamId));

  const total = subscriptions.length;

  const trackPerformances: TrackPerformance[] = [];

  for (const sub of subscriptions.slice(offset, offset + limit)) {
    // Get analytics for this track
    const analytics = await computeTeamAnalytics(teamId, sub.trackId);

    trackPerformances.push({
      trackId: sub.trackId,
      trackTitle: sub.trackTitle,
      avgComprehension: analytics.avgComprehension,
      completionRate: analytics.completionRate,
      weakTopics: [], // Would need topic-level data to populate
      activeLearners: analytics.activeLearners,
      totalAttempts: analytics.totalAttempts,
    });
  }

  return { tracks: trackPerformances, total };
}

/**
 * Get organization-level overview
 */
export async function getOrganizationOverview(organizationId: string): Promise<OrganizationOverview> {
  const cacheKey = `org:${organizationId}`;
  const cached = getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  // Get org info
  const [orgInfo] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!orgInfo) {
    throw new Error('Organization not found');
  }

  // Get all teams
  const orgTeams = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.organizationId, organizationId));

  if (orgTeams.length === 0) {
    const result: OrganizationOverview = {
      organizationId,
      organizationName: orgInfo.name,
      totalTeams: 0,
      activeLearners: 0,
      avgComprehension: 0,
      totalAtRiskCount: 0,
      totalAttempts: 0,
    };
    const config = await getAnalyticsConfig(organizationId);
    setCachedData(cacheKey, result, config.cacheTtlMinutes);
    return result;
  }

  // Aggregate analytics from all teams
  const teamAnalytics = await Promise.all(
    orgTeams.map((team) => computeTeamAnalytics(team.id))
  );

  const totalTeams = orgTeams.length;
  const activeLearners = teamAnalytics.reduce((sum, t) => sum + t.activeLearners, 0);
  const avgComprehension =
    teamAnalytics.reduce((sum, t) => sum + t.avgComprehension, 0) / totalTeams;
  const totalAtRiskCount = teamAnalytics.reduce((sum, t) => sum + t.atRiskCount, 0);
  const totalAttempts = teamAnalytics.reduce((sum, t) => sum + t.totalAttempts, 0);

  const result: OrganizationOverview = {
    organizationId,
    organizationName: orgInfo.name,
    totalTeams,
    activeLearners,
    avgComprehension: Math.round(avgComprehension * 1000) / 1000,
    totalAtRiskCount,
    totalAttempts,
  };

  const config = await getAnalyticsConfig(organizationId);
  setCachedData(cacheKey, result, config.cacheTtlMinutes);

  return result;
}

/**
 * Clear analytics cache (for on-demand refresh)
 */
export function clearAnalyticsCache(pattern?: string): void {
  if (!pattern) {
    analyticsCache.clear();
    console.log('[analytics] Cache cleared (all)');
    return;
  }

  const keys = Array.from(analyticsCache.keys());
  const matchingKeys = keys.filter((key) => key.includes(pattern));
  
  for (const key of matchingKeys) {
    analyticsCache.delete(key);
  }

  console.log(`[analytics] Cache cleared (${matchingKeys.length} keys matching "${pattern}")`);
}

