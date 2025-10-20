/**
 * Epic 14 v2.0: Proficiency Tracking & Deadline Management
 * Calculates learner proficiency based on performance at target difficulty levels
 * Manages risk status and triggers notifications for at-risk/overdue assignments
 */

import { query, single } from '../db';
import { getDifficultyNumber, getDifficultyLabel } from './module-creation-agent';

export interface ProficiencyCalculation {
  assignmentId: string;
  userId: string;
  moduleId: string;
  currentProficiencyPct: number;
  targetProficiencyPct: number;
  targetDifficultyLevel: number;
  recentAttemptsCount: number;
  correctCount: number;
  incorrectCount: number;
  riskStatus: 'on_track' | 'at_risk' | 'overdue' | 'achieved';
  daysUntilDeadline: number | null;
}

export interface RiskStatusUpdate {
  assignmentId: string;
  oldStatus: string;
  newStatus: string;
  reason: string;
  shouldNotify: boolean;
}

/**
 * Calculate proficiency for a specific assignment
 * Based on recent performance at the target difficulty level
 */
export async function calculateAssignmentProficiency(assignmentId: string): Promise<ProficiencyCalculation | null> {
  // Get assignment details
  const assignment = await single<any>(
    `SELECT 
      ma.id as assignment_id,
      ma.user_id,
      ma.module_id,
      ma.target_proficiency_pct,
      ma.current_proficiency_pct,
      ma.deadline_at,
      ma.risk_status,
      mm.target_mastery_level
     FROM module_assignments ma
     INNER JOIN manager_modules mm ON ma.module_id = mm.id
     WHERE ma.id = $1`,
    [assignmentId]
  );
  
  if (!assignment) return null;
  
  const targetDifficultyLevel = getDifficultyNumber(assignment.target_mastery_level || 'intermediate');
  
  // Get recent attempts at target difficulty
  // Note: This assumes question_performance_stats table exists and tracks per-user stats
  const recentAttempts = await query<any>(
    `SELECT 
      perceived_difficulty,
      correct_count,
      incorrect_count,
      attempts_count,
      last_attempted_at
     FROM question_performance_stats
     WHERE module_id = $1 
       AND user_id = $2
       AND perceived_difficulty = $3
     ORDER BY last_attempted_at DESC
     LIMIT 20`,
    [assignment.module_id, assignment.user_id, getDifficultyLabel(targetDifficultyLevel)]
  );
  
  // Calculate proficiency
  let correctCount = 0;
  let incorrectCount = 0;
  let totalAttempts = 0;
  
  for (const attempt of recentAttempts.rows) {
    correctCount += attempt.correct_count || 0;
    incorrectCount += attempt.incorrect_count || 0;
    totalAttempts += attempt.attempts_count || 0;
  }
  
  // Calculate proficiency percentage
  let proficiencyPct = 0;
  if (totalAttempts >= 5) {
    // Need at least 5 attempts for meaningful proficiency
    proficiencyPct = Math.round((correctCount / (correctCount + incorrectCount)) * 100);
  }
  
  // Calculate days until deadline
  let daysUntilDeadline: number | null = null;
  if (assignment.deadline_at) {
    const deadline = new Date(assignment.deadline_at);
    const now = new Date();
    daysUntilDeadline = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  // Determine risk status
  const riskStatus = determineRiskStatus({
    currentProficiencyPct: proficiencyPct,
    targetProficiencyPct: assignment.target_proficiency_pct,
    daysUntilDeadline,
    hasDeadline: !!assignment.deadline_at,
  });
  
  return {
    assignmentId: assignment.assignment_id,
    userId: assignment.user_id,
    moduleId: assignment.module_id,
    currentProficiencyPct: proficiencyPct,
    targetProficiencyPct: assignment.target_proficiency_pct,
    targetDifficultyLevel,
    recentAttemptsCount: totalAttempts,
    correctCount,
    incorrectCount,
    riskStatus,
    daysUntilDeadline,
  };
}

/**
 * Determine risk status based on proficiency and deadline
 */
function determineRiskStatus(params: {
  currentProficiencyPct: number;
  targetProficiencyPct: number;
  daysUntilDeadline: number | null;
  hasDeadline: boolean;
}): 'on_track' | 'at_risk' | 'overdue' | 'achieved' {
  const { currentProficiencyPct, targetProficiencyPct, daysUntilDeadline, hasDeadline } = params;
  
  // Achieved target
  if (currentProficiencyPct >= targetProficiencyPct) {
    return 'achieved';
  }
  
  // No deadline set
  if (!hasDeadline || daysUntilDeadline === null) {
    return 'on_track';
  }
  
  // Overdue (past deadline, not achieved)
  if (daysUntilDeadline < 0) {
    return 'overdue';
  }
  
  // At risk (within 7 days, less than 70% of target proficiency)
  if (daysUntilDeadline <= 7 && currentProficiencyPct < targetProficiencyPct * 0.7) {
    return 'at_risk';
  }
  
  // On track
  return 'on_track';
}

/**
 * Update proficiency for an assignment
 * Returns whether risk status changed (for notification purposes)
 */
export async function updateAssignmentProficiency(assignmentId: string): Promise<RiskStatusUpdate | null> {
  const calculation = await calculateAssignmentProficiency(assignmentId);
  
  if (!calculation) return null;
  
  // Get current status
  const current = await single<any>(
    'SELECT risk_status FROM module_assignments WHERE id = $1',
    [assignmentId]
  );
  
  const oldStatus = current?.risk_status || 'on_track';
  const newStatus = calculation.riskStatus;
  
  // Update assignment
  await query(
    `UPDATE module_assignments 
     SET current_proficiency_pct = $1,
         risk_status = $2,
         last_proficiency_update = NOW()
     WHERE id = $3`,
    [calculation.currentProficiencyPct, newStatus, assignmentId]
  );
  
  // Create proficiency snapshot for historical tracking
  await query(
    `INSERT INTO proficiency_snapshots (
      assignment_id, module_id, user_id, proficiency_pct,
      target_difficulty_level, recent_attempts_count,
      correct_count, incorrect_count, risk_status, days_until_deadline
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      assignmentId,
      calculation.moduleId,
      calculation.userId,
      calculation.currentProficiencyPct,
      calculation.targetDifficultyLevel,
      calculation.recentAttemptsCount,
      calculation.correctCount,
      calculation.incorrectCount,
      newStatus,
      calculation.daysUntilDeadline,
    ]
  );
  
  // Determine if status changed and if we should notify
  const statusChanged = oldStatus !== newStatus;
  const shouldNotify = statusChanged && (
    newStatus === 'at_risk' || 
    newStatus === 'overdue' || 
    newStatus === 'achieved'
  );
  
  let reason = '';
  if (newStatus === 'achieved') {
    reason = `Learner achieved ${calculation.currentProficiencyPct}% proficiency (target: ${calculation.targetProficiencyPct}%)`;
  } else if (newStatus === 'at_risk') {
    reason = `Only ${calculation.daysUntilDeadline} days until deadline, currently at ${calculation.currentProficiencyPct}%`;
  } else if (newStatus === 'overdue') {
    reason = `Deadline passed, proficiency ${calculation.currentProficiencyPct}% (target: ${calculation.targetProficiencyPct}%)`;
  }
  
  return {
    assignmentId,
    oldStatus,
    newStatus,
    reason,
    shouldNotify,
  };
}

/**
 * Background job: Update proficiency for all active assignments
 * Should be run hourly
 */
export async function updateAllProficiencies(): Promise<{
  processed: number;
  notifications: number;
  errors: number;
}> {
  console.log('[Proficiency Tracking] Starting proficiency update job...');
  
  let processed = 0;
  let notifications = 0;
  let errors = 0;
  
  try {
    // Get all active assignments (not archived, not completed)
    const assignments = await query<any>(
      `SELECT ma.id, ma.user_id, ma.module_id, ma.risk_status
       FROM module_assignments ma
       INNER JOIN manager_modules mm ON ma.module_id = mm.id
       WHERE ma.status IN ('assigned', 'in_progress')
         AND mm.status = 'active'
         AND mm.paused_at IS NULL
       ORDER BY ma.last_proficiency_update ASC NULLS FIRST
       LIMIT 500` // Process in batches to avoid long-running jobs
    );
    
    console.log(`[Proficiency Tracking] Found ${assignments.rows.length} assignments to process`);
    
    for (const assignment of assignments.rows) {
      try {
        const update = await updateAssignmentProficiency(assignment.id);
        processed++;
        
        if (update && update.shouldNotify) {
          // Queue notification
          await queueNotification(assignment.id, update.newStatus);
          notifications++;
        }
      } catch (error: any) {
        console.error(`[Proficiency Tracking] Error processing assignment ${assignment.id}:`, error);
        errors++;
      }
    }
    
    console.log(`[Proficiency Tracking] Complete: ${processed} processed, ${notifications} notifications queued, ${errors} errors`);
  } catch (error: any) {
    console.error('[Proficiency Tracking] Fatal error in proficiency update job:', error);
    errors++;
  }
  
  return { processed, notifications, errors };
}

/**
 * Queue a notification for an assignment status change
 */
async function queueNotification(
  assignmentId: string,
  notificationType: 'at_risk' | 'overdue' | 'achieved' | 'deadline_reminder'
): Promise<void> {
  // Get assignment details
  const assignment = await single<any>(
    `SELECT ma.user_id, ma.module_id, mm.created_by as manager_id
     FROM module_assignments ma
     INNER JOIN manager_modules mm ON ma.module_id = mm.id
     WHERE ma.id = $1`,
    [assignmentId]
  );
  
  if (!assignment) return;
  
  // Create notification for learner
  await query(
    `INSERT INTO module_assignment_notifications (
      assignment_id, notification_type, recipient_user_id, recipient_role
    ) VALUES ($1, $2, $3, $4)`,
    [assignmentId, notificationType, assignment.user_id, 'learner']
  );
  
  // Create notification for manager (except for 'achieved' - optional)
  if (notificationType !== 'achieved') {
    await query(
      `INSERT INTO module_assignment_notifications (
        assignment_id, notification_type, recipient_user_id, recipient_role
      ) VALUES ($1, $2, $3, $4)`,
      [assignmentId, notificationType, assignment.manager_id, 'manager']
    );
  }
}

/**
 * Get proficiency trend for an assignment (last 7 days)
 */
export async function getProficiencyTrend(assignmentId: string): Promise<{
  date: string;
  proficiencyPct: number;
  riskStatus: string;
}[]> {
  const snapshots = await query<any>(
    `SELECT 
      DATE(snapshot_at) as snapshot_date,
      proficiency_pct,
      risk_status
     FROM proficiency_snapshots
     WHERE assignment_id = $1
       AND snapshot_at >= NOW() - INTERVAL '7 days'
     ORDER BY snapshot_at ASC`,
    [assignmentId]
  );
  
  return snapshots.rows.map(s => ({
    date: s.snapshot_date,
    proficiencyPct: s.proficiency_pct,
    riskStatus: s.risk_status,
  }));
}

/**
 * Get at-risk assignments for a manager
 */
export async function getAtRiskAssignments(managerId: string): Promise<any[]> {
  const atRisk = await query<any>(
    `SELECT 
      ma.id as assignment_id,
      ma.user_id,
      ma.current_proficiency_pct,
      ma.target_proficiency_pct,
      ma.deadline_at,
      ma.risk_status,
      mm.id as module_id,
      mm.title as module_title,
      u.email as user_email
     FROM module_assignments ma
     INNER JOIN manager_modules mm ON ma.module_id = mm.id
     INNER JOIN users u ON ma.user_id = u.id
     WHERE mm.created_by = $1
       AND ma.risk_status IN ('at_risk', 'overdue')
     ORDER BY 
       CASE ma.risk_status 
         WHEN 'overdue' THEN 1
         WHEN 'at_risk' THEN 2
         ELSE 3
       END,
       ma.deadline_at ASC`,
    [managerId]
  );
  
  return atRisk.rows;
}

