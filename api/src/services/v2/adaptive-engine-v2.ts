/**
 * Adaptive Learning Engine V2 for Cerply
 * 
 * Implements FSD v2.0 Section 9.5: Adaptive Learning Engine
 * 
 * Clean rewrite following FSD requirements:
 * - Adjust difficulty from performance signals (correctness, speed, doubt, time-since-last)
 * - Mix item shapes to keep interest
 * - Plan next session for spaced repetition
 * - Detect weak areas and bring them back
 * - Flag stale items for manager refresh
 * - Prioritize recent, weak, or urgent topics
 */

import { db } from '../../db'
import { learnerProgress, learnerResponses, moduleItems, moduleAssignments } from '../../../drizzle/schema_v2'
import { eq, and, gte, sql } from 'drizzle-orm'

export interface LearnerState {
  userId: string
  assignmentId: string
  currentLevel: number // 0-10
  phase: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  streakDays: number
  lastSessionAt: string | null
  weakAreas: WeakArea[]
}

export interface WeakArea {
  goalId: string
  difficulty: number
  lastAttempt: string
  attempts: number
  successRate: number
}

export interface NextItemRecommendation {
  item: any
  rationale: string
  estimatedDifficulty: number
  goalsFocused: string[]
}

export interface PerformanceSignals {
  correct: boolean
  answerTimeMs: number
  hintsUsed: number
  confidence?: 'high' | 'medium' | 'low'
  timeSinceLastPractice: number // days
}

/**
 * Get or create learner state for an assignment
 */
export async function getLearnerState(userId: string, assignmentId: string): Promise<LearnerState> {
  const [progress] = await db
    .select()
    .from(learnerProgress)
    .where(and(eq(learnerProgress.userId, userId), eq(learnerProgress.moduleAssignmentId, assignmentId)))

  if (!progress) {
    // Create initial state
    const [newProgress] = await db
      .insert(learnerProgress)
      .values({
        userId,
        moduleAssignmentId: assignmentId,
        currentLevel: 0,
        phase: 'beginner',
        streakDays: 0,
        lastSessionAt: null,
        weakAreas: [],
      })
      .returning()

    return {
      userId: newProgress.userId,
      assignmentId: newProgress.moduleAssignmentId,
      currentLevel: newProgress.currentLevel,
      phase: newProgress.phase as any,
      streakDays: newProgress.streakDays,
      lastSessionAt: newProgress.lastSessionAt,
      weakAreas: newProgress.weakAreas as WeakArea[],
    }
  }

  return {
    userId: progress.userId,
    assignmentId: progress.moduleAssignmentId,
    currentLevel: progress.currentLevel,
    phase: progress.phase as any,
    streakDays: progress.streakDays,
    lastSessionAt: progress.lastSessionAt,
    weakAreas: progress.weakAreas as WeakArea[],
  }
}

/**
 * Update learner state after a response
 */
export async function updateLearnerState(
  userId: string,
  assignmentId: string,
  signals: PerformanceSignals
): Promise<LearnerState> {
  const state = await getLearnerState(userId, assignmentId)

  // Adjust current level based on performance
  const levelAdjustment = calculateLevelAdjustment(signals, state.currentLevel)
  const newLevel = Math.max(0, Math.min(10, state.currentLevel + levelAdjustment))

  // Determine phase from level
  const newPhase = determinePhase(newLevel)

  // Update streak
  const now = new Date()
  const lastSession = state.lastSessionAt ? new Date(state.lastSessionAt) : null
  let newStreak = state.streakDays

  if (lastSession) {
    const daysSinceLastSession = Math.floor((now.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24))

    if (daysSinceLastSession === 0) {
      // Same day, keep streak
    } else if (daysSinceLastSession === 1) {
      // Consecutive day, increment streak
      newStreak++
    } else {
      // Streak broken, reset
      newStreak = 1
    }
  } else {
    // First session
    newStreak = 1
  }

  // Update database
  const [updated] = await db
    .update(learnerProgress)
    .set({
      currentLevel: newLevel,
      phase: newPhase,
      streakDays: newStreak,
      lastSessionAt: now.toISOString(),
      updatedAt: now.toISOString(),
    })
    .where(and(eq(learnerProgress.userId, userId), eq(learnerProgress.moduleAssignmentId, assignmentId)))
    .returning()

  return {
    userId: updated.userId,
    assignmentId: updated.moduleAssignmentId,
    currentLevel: updated.currentLevel,
    phase: updated.phase as any,
    streakDays: updated.streakDays,
    lastSessionAt: updated.lastSessionAt,
    weakAreas: updated.weakAreas as WeakArea[],
  }
}

/**
 * Calculate level adjustment based on performance signals
 */
function calculateLevelAdjustment(signals: PerformanceSignals, currentLevel: number): number {
  let adjustment = 0

  // Correctness (primary signal)
  if (signals.correct) {
    adjustment += 0.5 // Move up on success
  } else {
    adjustment -= 0.3 // Move down on failure
  }

  // Answer speed (if too fast, might be guessing; if too slow, struggling)
  const expectedTimeMs = 60000 // 60 seconds baseline
  const timeRatio = signals.answerTimeMs / expectedTimeMs

  if (signals.correct && timeRatio < 0.5) {
    // Very fast and correct = too easy
    adjustment += 0.3
  } else if (!signals.correct && timeRatio > 2) {
    // Slow and incorrect = too hard
    adjustment -= 0.2
  }

  // Hints used (indicates struggle)
  if (signals.hintsUsed > 0) {
    adjustment -= 0.1 * signals.hintsUsed
  }

  // Confidence (if provided)
  if (signals.confidence === 'low') {
    adjustment -= 0.2
  } else if (signals.confidence === 'high' && signals.correct) {
    adjustment += 0.1
  }

  // Time since last practice (rusty?)
  if (signals.timeSinceLastPractice > 7 && !signals.correct) {
    adjustment -= 0.2 // Rusty, be more forgiving
  }

  return adjustment
}

/**
 * Determine phase from level (0-10 scale with named phases)
 */
function determinePhase(level: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  if (level <= 3) return 'beginner'
  if (level <= 6) return 'intermediate'
  if (level <= 9) return 'advanced'
  return 'expert'
}

/**
 * Recommend next item based on learner state
 */
export async function recommendNextItem(
  userId: string,
  assignmentId: string,
  moduleId: string
): Promise<NextItemRecommendation | null> {
  const state = await getLearnerState(userId, assignmentId)

  // Get assignment to check compliance_critical flag
  const [assignment] = await db.select().from(moduleAssignments).where(eq(moduleAssignments.id, assignmentId))

  if (!assignment) {
    throw new Error('Assignment not found')
  }

  // Get recent responses to avoid immediate repeats
  const recentResponses = await db
    .select()
    .from(learnerResponses)
    .where(eq(learnerResponses.userId, userId))
    .orderBy(sql`${learnerResponses.createdAt} DESC`)
    .limit(10)

  const recentItemIds = new Set(recentResponses.map((r: any) => r.moduleItemId))

  // Get candidate items at appropriate difficulty
  const targetDifficulty = state.currentLevel
  const difficultyRange = 2 // ±2 levels

  const candidates = await db
    .select()
    .from(moduleItems)
    .where(
      and(
        eq(moduleItems.moduleId, moduleId),
        gte(moduleItems.difficultyLevel, targetDifficulty - difficultyRange),
        sql`${moduleItems.difficultyLevel} <= ${targetDifficulty + difficultyRange}`
      )
    )

  // Filter out recently seen items (unless compliance critical)
  const availableItems = candidates.filter((item) => {
    // If compliance critical, allow repeats
    if (assignment.complianceCritical) return true

    // Otherwise, exclude recently seen
    return !recentItemIds.has(item.id)
  })

  if (availableItems.length === 0) {
    return null
  }

  // Prioritize based on weak areas
  let selectedItem = availableItems[0]
  let rationale = 'Next item in sequence'

  if (state.weakAreas.length > 0) {
    // Find items that address weak areas
    const weakGoalIds = new Set(state.weakAreas.map((w) => w.goalId))

    for (const item of availableItems) {
      const itemGoals = (item.goalTags as string[]) || []
      const addressesWeakArea = itemGoals.some((g: string) => weakGoalIds.has(g))

      if (addressesWeakArea) {
        selectedItem = item
        rationale = 'Targets weak area that needs reinforcement'
        break
      }
    }
  }

  // Mix item shapes for variety (if multiple available)
  const lastItemType = recentResponses[0] ? (await getItemType(recentResponses[0].moduleItemId)) : null

  if (lastItemType && availableItems.length > 1) {
    const differentShapes = availableItems.filter(async (item: any) => {
      const itemType = await getItemType(item.id)
      return itemType !== lastItemType
    })

    if (differentShapes.length > 0) {
      selectedItem = differentShapes[0]
      rationale += ' (varied format for engagement)'
    }
  }

  return {
    item: selectedItem,
    rationale,
    estimatedDifficulty: selectedItem.difficultyLevel,
    goalsFocused: selectedItem.goalTags as string[],
  }
}

/**
 * Detect weak areas from recent performance
 */
export async function detectWeakAreas(userId: string, assignmentId: string, moduleId: string): Promise<WeakArea[]> {
  // Get last 30 responses for this module
  const recentResponses = await db
    .select({
      itemId: learnerResponses.moduleItemId,
      correct: learnerResponses.correct,
      createdAt: learnerResponses.createdAt,
    })
    .from(learnerResponses)
    .innerJoin(moduleItems, eq(learnerResponses.moduleItemId, moduleItems.id))
    .where(and(eq(learnerResponses.userId, userId), eq(moduleItems.moduleId, moduleId)))
    .orderBy(sql`${learnerResponses.createdAt} DESC`)
    .limit(30)

  // Group by goal and calculate success rates
  const goalPerformance = new Map<string, { attempts: number; successes: number; lastAttempt: string }>()

  for (const response of recentResponses) {
    const item = await db.select().from(moduleItems).where(eq(moduleItems.id, response.itemId)).limit(1)

    if (item.length === 0) continue

    const goals = (item[0].goalTags as string[]) || []

    for (const goalId of goals) {
      const current = goalPerformance.get(goalId) || { attempts: 0, successes: 0, lastAttempt: response.createdAt }

      current.attempts++
      if (response.correct) current.successes++
      if (response.createdAt > current.lastAttempt) current.lastAttempt = response.createdAt

      goalPerformance.set(goalId, current)
    }
  }

  // Identify weak areas (success rate < 60% with at least 3 attempts)
  const weakAreas: WeakArea[] = []

  for (const [goalId, perf] of goalPerformance) {
    if (perf.attempts >= 3) {
      const successRate = perf.successes / perf.attempts

      if (successRate < 0.6) {
        weakAreas.push({
          goalId,
          difficulty: successRate * 10, // Convert to 0-10 scale
          lastAttempt: perf.lastAttempt,
          attempts: perf.attempts,
          successRate,
        })
      }
    }
  }

  // Update learner progress with weak areas
  await db
    .update(learnerProgress)
    .set({
      weakAreas,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(learnerProgress.userId, userId), eq(learnerProgress.moduleAssignmentId, assignmentId)))

  return weakAreas
}

/**
 * Plan next session time for spaced repetition
 */
export function calculateNextSessionTime(state: LearnerState, lastPerformance: PerformanceSignals): Date {
  const now = new Date()

  // Base interval based on current level
  let intervalHours = 24 // Default: 1 day

  if (state.currentLevel <= 3) {
    // Beginner: more frequent practice
    intervalHours = 12 // 12 hours
  } else if (state.currentLevel <= 6) {
    // Intermediate: daily practice
    intervalHours = 24 // 1 day
  } else if (state.currentLevel <= 9) {
    // Advanced: every 2 days
    intervalHours = 48 // 2 days
  } else {
    // Expert: every 3 days
    intervalHours = 72 // 3 days
  }

  // Adjust based on last performance
  if (!lastPerformance.correct) {
    // Failed - practice sooner
    intervalHours = Math.max(6, intervalHours / 2)
  } else if (lastPerformance.confidence === 'low') {
    // Uncertain - practice a bit sooner
    intervalHours = intervalHours * 0.75
  }

  const nextSession = new Date(now.getTime() + intervalHours * 60 * 60 * 1000)
  return nextSession
}

/**
 * Flag stale items that need refresh
 */
export async function flagStaleItems(moduleId: string, daysThreshold: number = 90): Promise<string[]> {
  const thresholdDate = new Date()
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold)

  const staleItems = await db
    .select({ id: moduleItems.id })
    .from(moduleItems)
    .where(and(eq(moduleItems.moduleId, moduleId), sql`${moduleItems.generatedAt} < ${thresholdDate.toISOString()}`))

  return staleItems.map((item: any) => item.id)
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getItemType(itemId: string): Promise<string | null> {
  const [item] = await db.select({ itemType: moduleItems.itemType }).from(moduleItems).where(eq(moduleItems.id, itemId))

  return item?.itemType || null
}

