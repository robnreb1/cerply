/**
 * Push Service for Cerply V2
 * 
 * Implements FSD v2.0 Section 2: Push flow (Module assignments)
 * 
 * Responsibilities:
 * - Create Module assignments with targeting (teams/groups/people)
 * - Set mandatory vs recommended
 * - Configure quiet hours (default 20:00-08:00, timezone-adaptive)
 * - Set daily cap (1-2 mandatory items)
 * - Schedule delivery (now or drip)
 */

import { db } from '../db'
import { moduleAssignments, modules, auditEvents } from '../../drizzle/schema_v2'
import { eq } from 'drizzle-orm'

export interface CreateAssignmentRequest {
  userId: string
  organizationId: string
  moduleId: string
  audience: {
    teams?: string[]
    groups?: string[]
    people?: string[]
  }
  mandatory: boolean
  startDate?: string // ISO date string
  quietHoursStart?: string // HH:MM format
  quietHoursEnd?: string // HH:MM format
  dailyCap?: number
}

export interface ModuleAssignment {
  id: string
  moduleId: string
  organizationId: string
  createdByUserId: string
  audience: any
  mandatory: boolean
  startDate: string | null
  quietHoursStart: string
  quietHoursEnd: string
  dailyCap: number
  status: string
  createdAt: string
  updatedAt: string
}

/**
 * Create a new Module assignment
 */
export async function createAssignment(request: CreateAssignmentRequest): Promise<ModuleAssignment> {
  // Validate audience
  const { teams = [], groups = [], people = [] } = request.audience

  if (teams.length === 0 && groups.length === 0 && people.length === 0) {
    throw new Error('At least one audience target (team, group, or person) is required')
  }

  // Validate module exists
  const [module] = await db.select().from(modules).where(eq(modules.id, request.moduleId))

  if (!module) {
    throw new Error('Module not found')
  }

  // Validate quiet hours format
  const quietStart = request.quietHoursStart || '20:00'
  const quietEnd = request.quietHoursEnd || '08:00'

  if (!isValidTimeFormat(quietStart) || !isValidTimeFormat(quietEnd)) {
    throw new Error('Quiet hours must be in HH:MM format')
  }

  // Create assignment
  const [assignment] = await db
    .insert(moduleAssignments)
    .values({
      moduleId: request.moduleId,
      organizationId: request.organizationId,
      createdByUserId: request.userId,
      audience: {
        teams,
        groups,
        people,
      },
      mandatory: request.mandatory,
      startDate: request.startDate || null,
      quietHoursStart: quietStart,
      quietHoursEnd: quietEnd,
      dailyCap: request.dailyCap || 2,
      status: 'active',
    })
    .returning()

  // Log audit event
  await db.insert(auditEvents).values({
    userId: request.userId,
    organizationId: request.organizationId,
    eventType: 'push',
    entityType: 'assignment',
    entityId: assignment.id,
    metadata: {
      moduleTitle: module.title,
      mandatory: request.mandatory,
      audienceSize: teams.length + groups.length + people.length,
    },
  })

  return assignment as ModuleAssignment
}

/**
 * List assignments for an organization
 */
export async function listAssignments(organizationId: string, status?: string): Promise<ModuleAssignment[]> {
  let query = db.select().from(moduleAssignments).where(eq(moduleAssignments.organizationId, organizationId))

  if (status) {
    query = query.where(eq(moduleAssignments.status, status))
  }

  const assignments = await query.orderBy(moduleAssignments.createdAt)

  return assignments as ModuleAssignment[]
}

/**
 * Get assignment by ID
 */
export async function getAssignment(assignmentId: string): Promise<ModuleAssignment | null> {
  const [assignment] = await db.select().from(moduleAssignments).where(eq(moduleAssignments.id, assignmentId))

  return (assignment as ModuleAssignment) || null
}

/**
 * Update assignment (pause, resume, change schedule)
 */
export async function updateAssignment(
  assignmentId: string,
  updates: {
    status?: 'active' | 'paused' | 'completed'
    quietHoursStart?: string
    quietHoursEnd?: string
    dailyCap?: number
  }
): Promise<ModuleAssignment> {
  // Validate quiet hours if provided
  if (updates.quietHoursStart && !isValidTimeFormat(updates.quietHoursStart)) {
    throw new Error('quietHoursStart must be in HH:MM format')
  }

  if (updates.quietHoursEnd && !isValidTimeFormat(updates.quietHoursEnd)) {
    throw new Error('quietHoursEnd must be in HH:MM format')
  }

  const [updated] = await db
    .update(moduleAssignments)
    .set({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(moduleAssignments.id, assignmentId))
    .returning()

  if (!updated) {
    throw new Error('Assignment not found')
  }

  return updated as ModuleAssignment
}

/**
 * Pause assignment (stop sending items)
 */
export async function pauseAssignment(assignmentId: string): Promise<void> {
  await updateAssignment(assignmentId, { status: 'paused' })
}

/**
 * Resume assignment (restart sending items)
 */
export async function resumeAssignment(assignmentId: string): Promise<void> {
  await updateAssignment(assignmentId, { status: 'active' })
}

/**
 * Complete assignment (mark as finished)
 */
export async function completeAssignment(assignmentId: string): Promise<void> {
  await updateAssignment(assignmentId, { status: 'completed' })
}

/**
 * Get assignments for a specific user
 */
export async function getUserAssignments(userId: string, organizationId: string): Promise<ModuleAssignment[]> {
  // Get all assignments for the org
  const allAssignments = await listAssignments(organizationId, 'active')

  // Filter to assignments that target this user
  const userAssignments = allAssignments.filter((assignment) => {
    const audience = assignment.audience as any

    // Check if user is in people array
    if (audience.people && audience.people.includes(userId)) {
      return true
    }

    // TODO: Check if user is in any of the teams or groups
    // This would require joining with team_members table
    // For now, just return people-targeted assignments

    return false
  })

  return userAssignments
}

/**
 * Check if current time is within quiet hours for a user
 */
export function isQuietHours(quietHoursStart: string, quietHoursEnd: string, userTimezone: string = 'UTC'): boolean {
  // Get current time in user's timezone
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: userTimezone,
  })

  const currentTime = formatter.format(now)
  const [currentHour, currentMin] = currentTime.split(':').map(Number)
  const currentMinutes = currentHour * 60 + currentMin

  const [startHour, startMin] = quietHoursStart.split(':').map(Number)
  const startMinutes = startHour * 60 + startMin

  const [endHour, endMin] = quietHoursEnd.split(':').map(Number)
  const endMinutes = endHour * 60 + endMin

  // Handle quiet hours that span midnight
  if (startMinutes > endMinutes) {
    // e.g., 20:00 - 08:00
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  } else {
    // e.g., 22:00 - 23:59
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }
}

/**
 * Check if user has reached daily cap for mandatory items
 */
export async function hasReachedDailyCap(
  userId: string,
  assignmentId: string,
  dailyCap: number
): Promise<boolean> {
  // TODO: Query learner_responses to count items completed today
  // For now, return false (no cap reached)
  return false
}

// ============================================================================
// Helper Functions
// ============================================================================

function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
  return timeRegex.test(time)
}

/**
 * Get timezone for a user (placeholder)
 */
export function getUserTimezone(userId: string): string {
  // TODO: Get from user preferences
  // For now, return UTC
  return 'UTC'
}

/**
 * Calculate next delivery time based on schedule
 */
export function calculateNextDelivery(
  assignment: ModuleAssignment,
  userTimezone: string
): Date | null {
  if (assignment.status !== 'active') {
    return null
  }

  const now = new Date()

  // If start date is in the future, return start date
  if (assignment.startDate) {
    const startDate = new Date(assignment.startDate)
    if (startDate > now) {
      return startDate
    }
  }

  // Check if we're in quiet hours
  if (isQuietHours(assignment.quietHoursStart, assignment.quietHoursEnd, userTimezone)) {
    // Calculate when quiet hours end
    const [endHour, endMin] = assignment.quietHoursEnd.split(':').map(Number)
    const nextDelivery = new Date()
    nextDelivery.setHours(endHour, endMin, 0, 0)

    // If end time has already passed today, schedule for tomorrow
    if (nextDelivery <= now) {
      nextDelivery.setDate(nextDelivery.getDate() + 1)
    }

    return nextDelivery
  }

  // Not in quiet hours, can deliver now
  return now
}

