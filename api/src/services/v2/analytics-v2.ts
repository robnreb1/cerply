/**
 * Analytics Service for Cerply V2
 * 
 * Implements FSD v2.0 Section 4: Track dashboards
 * 
 * Provides metrics for three dashboard views:
 * - Team view: mastery by skill, time to competence, active/at-risk users, recent wins, stale modules
 * - Person view: current level, pace, weak areas, streaks, last session time
 * - Module view: core freshness, version age, reach, answer rates, time on task, drop-offs, confusing/easy items
 */

import { db } from '../../db'
import {
  learnerProgress,
  learnerResponses,
  moduleAssignments,
  modules,
  moduleItems,
  moduleSections,
  users,
  auditEvents,
} from '../../../drizzle/schema_v2'
import { eq, and, sql, gte, desc } from 'drizzle-orm'

// ============================================================================
// Types
// ============================================================================

export interface TeamDashboardData {
  organizationId: string
  dateRange: { start: Date; end: Date }
  masteryBySkill: SkillMastery[]
  timeToFirstCompetence: CompetenceMetric[]
  activeUsers: UserActivity[]
  atRiskUsers: UserRisk[]
  recentWins: RecentWin[]
  staleModules: StaleModule[]
}

export interface PersonDashboardData {
  userId: string
  assignmentId?: string
  currentLevel: number
  pace: PaceMetric
  weakAreas: WeakArea[]
  streaks: StreakData
  lastSessionTime: Date | null
  completionRate: number
  averageScore: number
}

export interface ModuleDashboardData {
  moduleId: string
  coreFreshness: FreshnessMetric
  versionAge: number // days since last update
  reach: ReachMetric
  answerRates: AnswerRateMetric
  timeOnTask: TimeMetric
  dropOffs: DropOffMetric[]
  confusingItems: ProblemItem[]
  tooEasyItems: ProblemItem[]
}

interface SkillMastery {
  skillId: string
  skillName: string
  totalLearners: number
  proficientCount: number
  proficiencyRate: number
  averageLevel: number
}

interface CompetenceMetric {
  skillId: string
  skillName: string
  averageDaysToCompetence: number
  fastestDays: number
  slowestDays: number
}

interface UserActivity {
  userId: string
  userName: string
  sessionsThisWeek: number
  itemsCompleted: number
  currentStreak: number
  lastActive: Date
}

interface UserRisk {
  userId: string
  userName: string
  riskFactors: string[]
  daysInactive: number
  completionRate: number
  lastActive: Date | null
}

interface RecentWin {
  userId: string
  userName: string
  achievement: string
  achievedAt: Date
  context: string
}

interface StaleModule {
  moduleId: string
  moduleName: string
  lastUpdated: Date
  daysSinceUpdate: number
  activeAssignments: number
  sections: number
  staleSections: number
}

interface PaceMetric {
  itemsPerWeek: number
  averageTimePerItem: number // seconds
  consistencyScore: number // 0-100
}

interface WeakArea {
  goalId: string
  goalName: string
  attemptCount: number
  successRate: number
  lastAttempt: Date
}

interface StreakData {
  currentStreak: number
  longestStreak: number
  streakStartDate: Date | null
}

interface FreshnessMetric {
  totalSections: number
  staleSections: number
  staleSectionIds: string[]
  freshnessScore: number // 0-100
}

interface ReachMetric {
  totalTargeted: number
  started: number
  completed: number
  startRate: number
  completionRate: number
}

interface AnswerRateMetric {
  totalItems: number
  totalResponses: number
  correctResponses: number
  averageScore: number
  firstAttemptRate: number
}

interface TimeMetric {
  averageSeconds: number
  medianSeconds: number
  p90Seconds: number
}

interface DropOffMetric {
  itemId: string
  itemContent: string
  attemptCount: number
  dropOffCount: number
  dropOffRate: number
}

interface ProblemItem {
  itemId: string
  itemContent: string
  attemptCount: number
  successRate: number
  averageTimeSeconds: number
  helpRequestCount: number
}

// ============================================================================
// Analytics Service
// ============================================================================

export class AnalyticsService {
  /**
   * Get Team Dashboard data
   */
  async getTeamDashboard(organizationId: string, dateRange?: { start: Date; end: Date }): Promise<TeamDashboardData> {
    const range = dateRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date(),
    }

    const [masteryBySkill, timeToFirstCompetence, activeUsers, atRiskUsers, recentWins, staleModules] = await Promise.all([
      this.getMasteryBySkill(organizationId, range),
      this.getTimeToCompetence(organizationId, range),
      this.getActiveUsers(organizationId, range),
      this.getAtRiskUsers(organizationId),
      this.getRecentWins(organizationId, range),
      this.getStaleModules(organizationId),
    ])

    return {
      organizationId,
      dateRange: range,
      masteryBySkill,
      timeToFirstCompetence,
      activeUsers,
      atRiskUsers,
      recentWins,
      staleModules,
    }
  }

  /**
   * Get Person Dashboard data
   */
  async getPersonDashboard(userId: string, assignmentId?: string): Promise<PersonDashboardData> {
    // Get learner progress
    const progressQuery = assignmentId
      ? db
          .select()
          .from(learnerProgress)
          .where(and(eq(learnerProgress.userId, userId), eq(learnerProgress.assignmentId, assignmentId)))
          .limit(1)
      : db.select().from(learnerProgress).where(eq(learnerProgress.userId, userId)).orderBy(desc(learnerProgress.updatedAt)).limit(1)

    const progress = await progressQuery

    if (progress.length === 0) {
      // No progress yet
      return {
        userId,
        assignmentId,
        currentLevel: 0,
        pace: { itemsPerWeek: 0, averageTimePerItem: 0, consistencyScore: 0 },
        weakAreas: [],
        streaks: { currentStreak: 0, longestStreak: 0, streakStartDate: null },
        lastSessionTime: null,
        completionRate: 0,
        averageScore: 0,
      }
    }

    const state = progress[0]

    // Get metrics
    const [pace, weakAreas, streaks, lastSessionTime, completionRate, averageScore] = await Promise.all([
      this.getPaceMetric(userId, assignmentId),
      this.getWeakAreas(userId, assignmentId),
      this.getStreakData(userId),
      this.getLastSessionTime(userId),
      this.getCompletionRate(userId, assignmentId),
      this.getAverageScore(userId, assignmentId),
    ])

    return {
      userId,
      assignmentId,
      currentLevel: state.currentLevel,
      pace,
      weakAreas,
      streaks,
      lastSessionTime,
      completionRate,
      averageScore,
    }
  }

  /**
   * Get Module Dashboard data
   */
  async getModuleDashboard(moduleId: string, organizationId?: string): Promise<ModuleDashboardData> {
    const [coreFreshness, versionAge, reach, answerRates, timeOnTask, dropOffs, confusingItems, tooEasyItems] = await Promise.all([
      this.getCoreFreshness(moduleId),
      this.getVersionAge(moduleId),
      this.getReachMetric(moduleId, organizationId),
      this.getAnswerRates(moduleId, organizationId),
      this.getTimeOnTask(moduleId, organizationId),
      this.getDropOffs(moduleId, organizationId),
      this.getConfusingItems(moduleId, organizationId),
      this.getTooEasyItems(moduleId, organizationId),
    ])

    return {
      moduleId,
      coreFreshness,
      versionAge,
      reach,
      answerRates,
      timeOnTask,
      dropOffs,
      confusingItems,
      tooEasyItems,
    }
  }

  // ============================================================================
  // Team Dashboard Helpers
  // ============================================================================

  private async getMasteryBySkill(organizationId: string, range: { start: Date; end: Date }): Promise<SkillMastery[]> {
    // Aggregate by goal tags (skills)
    const results = await db.execute(sql`
      SELECT 
        goal_tag AS skill_id,
        COUNT(DISTINCT lr.user_id) AS total_learners,
        COUNT(DISTINCT CASE WHEN lp.current_level >= 7 THEN lr.user_id END) AS proficient_count,
        AVG(lp.current_level) AS average_level
      FROM learner_responses lr
      INNER JOIN module_items mi ON lr.module_item_id = mi.id
      INNER JOIN learner_progress lp ON lr.user_id = lp.user_id AND lr.assignment_id = lp.assignment_id
      CROSS JOIN unnest(mi.goal_tags) AS goal_tag
      WHERE lr.created_at >= ${range.start.toISOString()}
        AND lr.created_at <= ${range.end.toISOString()}
      GROUP BY goal_tag
      ORDER BY total_learners DESC
      LIMIT 20
    `)

    return (results.rows || []).map((row: any) => ({
      skillId: row.skill_id,
      skillName: row.skill_id, // In production, map to readable name
      totalLearners: Number(row.total_learners),
      proficientCount: Number(row.proficient_count),
      proficiencyRate: Number(row.total_learners) > 0 ? Number(row.proficient_count) / Number(row.total_learners) : 0,
      averageLevel: Number(row.average_level || 0),
    }))
  }

  private async getTimeToCompetence(organizationId: string, range: { start: Date; end: Date }): Promise<CompetenceMetric[]> {
    // Calculate days from first response to achieving level 7
    const results = await db.execute(sql`
      WITH first_responses AS (
        SELECT 
          lr.user_id,
          unnest(mi.goal_tags) AS goal_tag,
          MIN(lr.created_at) AS first_attempt
        FROM learner_responses lr
        INNER JOIN module_items mi ON lr.module_item_id = mi.id
        GROUP BY lr.user_id, goal_tag
      ),
      competence_reached AS (
        SELECT 
          lp.user_id,
          unnest(mi.goal_tags) AS goal_tag,
          MIN(lp.updated_at) AS competence_date
        FROM learner_progress lp
        INNER JOIN module_assignments ma ON lp.assignment_id = ma.id
        INNER JOIN modules m ON ma.module_id = m.id
        INNER JOIN module_sections ms ON m.id = ms.module_id
        INNER JOIN module_items mi ON ms.id = mi.section_id
        WHERE lp.current_level >= 7
        GROUP BY lp.user_id, goal_tag
      )
      SELECT 
        fr.goal_tag AS skill_id,
        AVG(EXTRACT(EPOCH FROM (cr.competence_date - fr.first_attempt)) / 86400) AS avg_days,
        MIN(EXTRACT(EPOCH FROM (cr.competence_date - fr.first_attempt)) / 86400) AS min_days,
        MAX(EXTRACT(EPOCH FROM (cr.competence_date - fr.first_attempt)) / 86400) AS max_days
      FROM first_responses fr
      INNER JOIN competence_reached cr ON fr.user_id = cr.user_id AND fr.goal_tag = cr.goal_tag
      GROUP BY fr.goal_tag
      ORDER BY avg_days
      LIMIT 10
    `)

    return (results.rows || []).map((row: any) => ({
      skillId: row.skill_id,
      skillName: row.skill_id,
      averageDaysToCompetence: Number(row.avg_days || 0),
      fastestDays: Number(row.min_days || 0),
      slowestDays: Number(row.max_days || 0),
    }))
  }

  private async getActiveUsers(organizationId: string, range: { start: Date; end: Date }): Promise<UserActivity[]> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const results = await db.execute(sql`
      SELECT 
        u.id AS user_id,
        u.name AS user_name,
        COUNT(DISTINCT DATE(lr.created_at)) FILTER (WHERE lr.created_at >= ${oneWeekAgo.toISOString()}) AS sessions_this_week,
        COUNT(lr.id) FILTER (WHERE lr.is_correct = true) AS items_completed,
        lp.streak_count AS current_streak,
        MAX(lr.created_at) AS last_active
      FROM users u
      INNER JOIN learner_responses lr ON u.id = lr.user_id
      LEFT JOIN learner_progress lp ON u.id = lp.user_id
      WHERE lr.created_at >= ${range.start.toISOString()}
      GROUP BY u.id, u.name, lp.streak_count
      ORDER BY sessions_this_week DESC, items_completed DESC
      LIMIT 20
    `)

    return (results.rows || []).map((row: any) => ({
      userId: row.user_id,
      userName: row.user_name,
      sessionsThisWeek: Number(row.sessions_this_week),
      itemsCompleted: Number(row.items_completed),
      currentStreak: Number(row.current_streak || 0),
      lastActive: new Date(row.last_active),
    }))
  }

  private async getAtRiskUsers(organizationId: string): Promise<UserRisk[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const results = await db.execute(sql`
      SELECT 
        u.id AS user_id,
        u.name AS user_name,
        MAX(lr.created_at) AS last_active,
        COUNT(lr.id) FILTER (WHERE lr.is_correct = true) AS correct_count,
        COUNT(lr.id) AS total_count,
        EXTRACT(EPOCH FROM (NOW() - MAX(lr.created_at))) / 86400 AS days_inactive
      FROM users u
      LEFT JOIN learner_responses lr ON u.id = lr.user_id
      INNER JOIN module_assignments ma ON ma.organization_id = ${organizationId}
      GROUP BY u.id, u.name
      HAVING MAX(lr.created_at) < ${sevenDaysAgo.toISOString()} OR MAX(lr.created_at) IS NULL
      ORDER BY days_inactive DESC NULLS FIRST
      LIMIT 15
    `)

    return (results.rows || []).map((row: any) => {
      const daysInactive = Number(row.days_inactive || 999)
      const completionRate = Number(row.total_count) > 0 ? Number(row.correct_count) / Number(row.total_count) : 0
      const riskFactors: string[] = []

      if (daysInactive > 14) riskFactors.push('Inactive >14 days')
      if (completionRate < 0.5) riskFactors.push('Low completion rate')
      if (!row.last_active) riskFactors.push('Never started')

      return {
        userId: row.user_id,
        userName: row.user_name,
        riskFactors,
        daysInactive,
        completionRate,
        lastActive: row.last_active ? new Date(row.last_active) : null,
      }
    })
  }

  private async getRecentWins(organizationId: string, range: { start: Date; end: Date }): Promise<RecentWin[]> {
    // Look for achievements: streaks, level-ups, completions
    const results = await db.execute(sql`
      SELECT 
        u.id AS user_id,
        u.name AS user_name,
        ae.event_type AS achievement_type,
        ae.created_at AS achieved_at,
        ae.metadata::text AS context
      FROM audit_events ae
      INNER JOIN users u ON ae.user_id = u.id
      WHERE ae.event_type IN ('level_up', 'streak_milestone', 'module_completed')
        AND ae.created_at >= ${range.start.toISOString()}
        AND ae.created_at <= ${range.end.toISOString()}
      ORDER BY ae.created_at DESC
      LIMIT 10
    `)

    return (results.rows || []).map((row: any) => ({
      userId: row.user_id,
      userName: row.user_name,
      achievement: this.formatAchievement(row.achievement_type),
      achievedAt: new Date(row.achieved_at),
      context: row.context || '',
    }))
  }

  private formatAchievement(type: string): string {
    switch (type) {
      case 'level_up':
        return 'Level up!'
      case 'streak_milestone':
        return 'Streak milestone'
      case 'module_completed':
        return 'Module completed'
      default:
        return 'Achievement'
    }
  }

  private async getStaleModules(organizationId: string): Promise<StaleModule[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const results = await db.execute(sql`
      SELECT 
        m.id AS module_id,
        m.title AS module_name,
        m.updated_at AS last_updated,
        EXTRACT(EPOCH FROM (NOW() - m.updated_at)) / 86400 AS days_since_update,
        COUNT(DISTINCT ma.id) AS active_assignments,
        COUNT(DISTINCT ms.id) AS total_sections,
        COUNT(DISTINCT CASE WHEN ms.updated_at < ${thirtyDaysAgo.toISOString()} THEN ms.id END) AS stale_sections
      FROM modules m
      LEFT JOIN module_sections ms ON m.id = ms.module_id
      LEFT JOIN module_assignments ma ON m.id = ma.module_id AND ma.status = 'active'
      WHERE m.organization_id = ${organizationId}
        AND m.updated_at < ${thirtyDaysAgo.toISOString()}
      GROUP BY m.id, m.title, m.updated_at
      HAVING COUNT(DISTINCT ma.id) > 0
      ORDER BY days_since_update DESC
      LIMIT 10
    `)

    return (results.rows || []).map((row: any) => ({
      moduleId: row.module_id,
      moduleName: row.module_name,
      lastUpdated: new Date(row.last_updated),
      daysSinceUpdate: Number(row.days_since_update),
      activeAssignments: Number(row.active_assignments),
      sections: Number(row.total_sections),
      staleSections: Number(row.stale_sections),
    }))
  }

  // ============================================================================
  // Person Dashboard Helpers
  // ============================================================================

  private async getPaceMetric(userId: string, assignmentId?: string): Promise<PaceMetric> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const query = assignmentId
      ? sql`
          SELECT 
            COUNT(id) AS items_this_week,
            AVG(time_spent_seconds) AS avg_time,
            STDDEV(time_spent_seconds) AS stddev_time
          FROM learner_responses
          WHERE user_id = ${userId}
            AND assignment_id = ${assignmentId}
            AND created_at >= ${oneWeekAgo.toISOString()}
        `
      : sql`
          SELECT 
            COUNT(id) AS items_this_week,
            AVG(time_spent_seconds) AS avg_time,
            STDDEV(time_spent_seconds) AS stddev_time
          FROM learner_responses
          WHERE user_id = ${userId}
            AND created_at >= ${oneWeekAgo.toISOString()}
        `

    const result = await db.execute(query)
    const row = result.rows[0] as any

    const itemsPerWeek = Number(row?.items_this_week || 0)
    const averageTimePerItem = Number(row?.avg_time || 0)
    const stddev = Number(row?.stddev_time || 0)

    // Consistency score: lower stddev = more consistent
    const consistencyScore = averageTimePerItem > 0 ? Math.max(0, 100 - (stddev / averageTimePerItem) * 50) : 0

    return {
      itemsPerWeek,
      averageTimePerItem,
      consistencyScore: Math.round(consistencyScore),
    }
  }

  private async getWeakAreas(userId: string, assignmentId?: string): Promise<WeakArea[]> {
    // Get learner progress weak areas
    const query = assignmentId
      ? db
          .select()
          .from(learnerProgress)
          .where(and(eq(learnerProgress.userId, userId), eq(learnerProgress.assignmentId, assignmentId)))
          .limit(1)
      : db.select().from(learnerProgress).where(eq(learnerProgress.userId, userId)).orderBy(desc(learnerProgress.updatedAt)).limit(1)

    const progress = await query

    if (progress.length === 0) {
      return []
    }

    const weakAreas = (progress[0].weakAreas as any[]) || []

    return weakAreas.map((area: any) => ({
      goalId: area.goalId,
      goalName: area.goalName || area.goalId,
      attemptCount: area.attemptCount || 0,
      successRate: area.successRate || 0,
      lastAttempt: area.lastAttempt ? new Date(area.lastAttempt) : new Date(),
    }))
  }

  private async getStreakData(userId: string): Promise<StreakData> {
    const progress = await db
      .select()
      .from(learnerProgress)
      .where(eq(learnerProgress.userId, userId))
      .orderBy(desc(learnerProgress.streakCount))
      .limit(1)

    if (progress.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        streakStartDate: null,
      }
    }

    return {
      currentStreak: progress[0].streakCount,
      longestStreak: progress[0].streakCount, // Simplified - in production track separately
      streakStartDate: progress[0].lastSeenAt,
    }
  }

  private async getLastSessionTime(userId: string): Promise<Date | null> {
    const lastResponse = await db
      .select()
      .from(learnerResponses)
      .where(eq(learnerResponses.userId, userId))
      .orderBy(desc(learnerResponses.createdAt))
      .limit(1)

    return lastResponse.length > 0 ? lastResponse[0].createdAt : null
  }

  private async getCompletionRate(userId: string, assignmentId?: string): Promise<number> {
    const query = assignmentId
      ? sql`
          SELECT 
            COUNT(id) FILTER (WHERE is_correct = true) AS correct_count,
            COUNT(id) AS total_count
          FROM learner_responses
          WHERE user_id = ${userId} AND assignment_id = ${assignmentId}
        `
      : sql`
          SELECT 
            COUNT(id) FILTER (WHERE is_correct = true) AS correct_count,
            COUNT(id) AS total_count
          FROM learner_responses
          WHERE user_id = ${userId}
        `

    const result = await db.execute(query)
    const row = result.rows[0] as any

    const correctCount = Number(row?.correct_count || 0)
    const totalCount = Number(row?.total_count || 0)

    return totalCount > 0 ? correctCount / totalCount : 0
  }

  private async getAverageScore(userId: string, assignmentId?: string): Promise<number> {
    const query = assignmentId
      ? sql`
          SELECT AVG(partial_credit) AS avg_score
          FROM learner_responses
          WHERE user_id = ${userId} AND assignment_id = ${assignmentId}
        `
      : sql`
          SELECT AVG(partial_credit) AS avg_score
          FROM learner_responses
          WHERE user_id = ${userId}
        `

    const result = await db.execute(query)
    const row = result.rows[0] as any

    return Number(row?.avg_score || 0)
  }

  // ============================================================================
  // Module Dashboard Helpers
  // ============================================================================

  private async getCoreFreshness(moduleId: string): Promise<FreshnessMetric> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const sections = await db
      .select()
      .from(moduleSections)
      .where(eq(moduleSections.moduleId, moduleId))

    const totalSections = sections.length
    const staleSections = sections.filter((s) => s.updatedAt < thirtyDaysAgo)
    const staleSectionIds = staleSections.map((s) => s.id)

    const freshnessScore = totalSections > 0 ? Math.round(((totalSections - staleSections.length) / totalSections) * 100) : 100

    return {
      totalSections,
      staleSections: staleSections.length,
      staleSectionIds,
      freshnessScore,
    }
  }

  private async getVersionAge(moduleId: string): Promise<number> {
    const module = await db.select().from(modules).where(eq(modules.id, moduleId)).limit(1)

    if (module.length === 0) {
      return 0
    }

    const now = new Date()
    const updated = module[0].updatedAt
    const ageMs = now.getTime() - updated.getTime()
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000))

    return ageDays
  }

  private async getReachMetric(moduleId: string, organizationId?: string): Promise<ReachMetric> {
    const assignmentsQuery = organizationId
      ? db
          .select()
          .from(moduleAssignments)
          .where(and(eq(moduleAssignments.moduleId, moduleId), eq(moduleAssignments.organizationId, organizationId)))
      : db.select().from(moduleAssignments).where(eq(moduleAssignments.moduleId, moduleId))

    const assignments = await assignmentsQuery

    const totalTargeted = assignments.reduce((sum, a) => sum + (a.targetUserIds as string[]).length, 0)

    // Count users who started and completed
    const started = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id) AS count
      FROM learner_responses lr
      INNER JOIN module_items mi ON lr.module_item_id = mi.id
      WHERE mi.module_id = ${moduleId}
    `)

    const completed = await db.execute(sql`
      SELECT COUNT(DISTINCT lr.user_id) AS count
      FROM learner_responses lr
      INNER JOIN module_items mi ON lr.module_item_id = mi.id
      WHERE mi.module_id = ${moduleId}
      GROUP BY lr.user_id
      HAVING COUNT(DISTINCT mi.id) >= (SELECT COUNT(*) * 0.8 FROM module_items WHERE module_id = ${moduleId})
    `)

    const startedCount = Number((started.rows[0] as any)?.count || 0)
    const completedCount = Number((completed.rows[0] as any)?.count || 0)

    return {
      totalTargeted,
      started: startedCount,
      completed: completedCount,
      startRate: totalTargeted > 0 ? startedCount / totalTargeted : 0,
      completionRate: startedCount > 0 ? completedCount / startedCount : 0,
    }
  }

  private async getAnswerRates(moduleId: string, organizationId?: string): Promise<AnswerRateMetric> {
    const result = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT mi.id) AS total_items,
        COUNT(lr.id) AS total_responses,
        COUNT(lr.id) FILTER (WHERE lr.is_correct = true) AS correct_responses,
        AVG(lr.partial_credit) AS average_score,
        COUNT(lr.id) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM learner_responses lr2 
          WHERE lr2.user_id = lr.user_id 
            AND lr2.module_item_id = lr.module_item_id 
            AND lr2.created_at < lr.created_at
        )) / NULLIF(COUNT(DISTINCT mi.id), 0.0) AS first_attempt_rate
      FROM module_items mi
      LEFT JOIN learner_responses lr ON mi.id = lr.module_item_id
      WHERE mi.module_id = ${moduleId}
    `)

    const row = result.rows[0] as any

    return {
      totalItems: Number(row?.total_items || 0),
      totalResponses: Number(row?.total_responses || 0),
      correctResponses: Number(row?.correct_responses || 0),
      averageScore: Number(row?.average_score || 0),
      firstAttemptRate: Number(row?.first_attempt_rate || 0),
    }
  }

  private async getTimeOnTask(moduleId: string, organizationId?: string): Promise<TimeMetric> {
    const result = await db.execute(sql`
      SELECT 
        AVG(time_spent_seconds) AS avg_seconds,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY time_spent_seconds) AS median_seconds,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY time_spent_seconds) AS p90_seconds
      FROM learner_responses lr
      INNER JOIN module_items mi ON lr.module_item_id = mi.id
      WHERE mi.module_id = ${moduleId}
        AND lr.time_spent_seconds > 0
    `)

    const row = result.rows[0] as any

    return {
      averageSeconds: Number(row?.avg_seconds || 0),
      medianSeconds: Number(row?.median_seconds || 0),
      p90Seconds: Number(row?.p90_seconds || 0),
    }
  }

  private async getDropOffs(moduleId: string, organizationId?: string): Promise<DropOffMetric[]> {
    // Items where users start but don't submit answer
    const results = await db.execute(sql`
      SELECT 
        mi.id AS item_id,
        mi.content::json->>'question' AS item_content,
        COUNT(DISTINCT ae.user_id) AS attempt_count,
        COUNT(DISTINCT ae.user_id) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM learner_responses lr 
          WHERE lr.user_id = ae.user_id AND lr.module_item_id = mi.id
        )) AS drop_off_count
      FROM module_items mi
      INNER JOIN audit_events ae ON ae.metadata::json->>'itemId' = mi.id
      WHERE mi.module_id = ${moduleId}
        AND ae.event_type = 'item_delivered'
      GROUP BY mi.id, item_content
      HAVING COUNT(DISTINCT ae.user_id) >= 5
      ORDER BY drop_off_count DESC
      LIMIT 10
    `)

    return (results.rows || []).map((row: any) => {
      const attemptCount = Number(row.attempt_count)
      const dropOffCount = Number(row.drop_off_count)

      return {
        itemId: row.item_id,
        itemContent: row.item_content || 'Untitled item',
        attemptCount,
        dropOffCount,
        dropOffRate: attemptCount > 0 ? dropOffCount / attemptCount : 0,
      }
    })
  }

  private async getConfusingItems(moduleId: string, organizationId?: string): Promise<ProblemItem[]> {
    // Items with low success rate and high help requests
    const results = await db.execute(sql`
      SELECT 
        mi.id AS item_id,
        mi.content::json->>'question' AS item_content,
        COUNT(lr.id) AS attempt_count,
        COUNT(lr.id) FILTER (WHERE lr.is_correct = true) / NULLIF(COUNT(lr.id), 0.0) AS success_rate,
        AVG(lr.time_spent_seconds) AS avg_time,
        COUNT(ae.id) FILTER (WHERE ae.event_type = 'help_requested') AS help_count
      FROM module_items mi
      INNER JOIN learner_responses lr ON mi.id = lr.module_item_id
      LEFT JOIN audit_events ae ON ae.metadata::json->>'itemId' = mi.id
      WHERE mi.module_id = ${moduleId}
      GROUP BY mi.id, item_content
      HAVING COUNT(lr.id) >= 5
        AND COUNT(lr.id) FILTER (WHERE lr.is_correct = true) / NULLIF(COUNT(lr.id), 0.0) < 0.5
      ORDER BY success_rate ASC, help_count DESC
      LIMIT 10
    `)

    return (results.rows || []).map((row: any) => ({
      itemId: row.item_id,
      itemContent: row.item_content || 'Untitled item',
      attemptCount: Number(row.attempt_count),
      successRate: Number(row.success_rate || 0),
      averageTimeSeconds: Number(row.avg_time || 0),
      helpRequestCount: Number(row.help_count || 0),
    }))
  }

  private async getTooEasyItems(moduleId: string, organizationId?: string): Promise<ProblemItem[]> {
    // Items with very high success rate and low time
    const results = await db.execute(sql`
      SELECT 
        mi.id AS item_id,
        mi.content::json->>'question' AS item_content,
        COUNT(lr.id) AS attempt_count,
        COUNT(lr.id) FILTER (WHERE lr.is_correct = true) / NULLIF(COUNT(lr.id), 0.0) AS success_rate,
        AVG(lr.time_spent_seconds) AS avg_time,
        0 AS help_count
      FROM module_items mi
      INNER JOIN learner_responses lr ON mi.id = lr.module_item_id
      WHERE mi.module_id = ${moduleId}
      GROUP BY mi.id, item_content
      HAVING COUNT(lr.id) >= 5
        AND COUNT(lr.id) FILTER (WHERE lr.is_correct = true) / NULLIF(COUNT(lr.id), 0.0) > 0.95
        AND AVG(lr.time_spent_seconds) < 15
      ORDER BY success_rate DESC, avg_time ASC
      LIMIT 10
    `)

    return (results.rows || []).map((row: any) => ({
      itemId: row.item_id,
      itemContent: row.item_content || 'Untitled item',
      attemptCount: Number(row.attempt_count),
      successRate: Number(row.success_rate || 0),
      averageTimeSeconds: Number(row.avg_time || 0),
      helpRequestCount: 0,
    }))
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService()

// Helper functions for routes
export async function getTeamDashboardData(
  organizationId: string,
  dateRange?: { start: Date; end: Date }
): Promise<TeamDashboardData> {
  return analyticsService.getTeamDashboard(organizationId, dateRange)
}

export async function getPersonDashboardData(userId: string, assignmentId?: string): Promise<PersonDashboardData> {
  return analyticsService.getPersonDashboard(userId, assignmentId)
}

export async function getModuleDashboardData(moduleId: string, organizationId?: string): Promise<ModuleDashboardData> {
  return analyticsService.getModuleDashboard(moduleId, organizationId)
}

