/**
 * Notification Service
 * Epic 7: Gamification & Certification System
 * Manager notifications via email and in-app
 */

import { db } from '../db';
import { managerNotifications, users, teams, teamMembers } from '../db/schema';
import { eq, and, desc, gte, count } from 'drizzle-orm';
import type { LevelUpEvent } from './gamification';

// Email service configuration
const FROM_EMAIL = process.env.FROM_EMAIL || 'notifications@cerply.com';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';

export interface NotificationEvent {
  type: 'level_up' | 'certificate' | 'badge' | 'at_risk';
  learnerId: string;
  learnerName: string;
  content: any;
}

/**
 * Get learner's manager
 */
async function getLearnerManager(learnerId: string): Promise<{ id: string; email: string } | null> {
  // Find team where learner is a member
  const [membership] = await db
    .select({
      managerId: teams.managerId,
      managerEmail: users.email,
    })
    .from(teamMembers)
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .leftJoin(users, eq(teams.managerId, users.id))
    .where(eq(teamMembers.userId, learnerId))
    .limit(1);

  if (!membership || !membership.managerId || !membership.managerEmail) return null;

  return {
    id: membership.managerId,
    email: membership.managerEmail,
  };
}

/**
 * Send notification to manager (in-app + email)
 */
export async function notifyManager(event: NotificationEvent | LevelUpEvent): Promise<void> {
  const learnerId = 'learnerId' in event ? event.learnerId : event.userId;
  const manager = await getLearnerManager(learnerId);
  if (!manager) {
    console.log(`[notifications] No manager found for learner ${learnerId}`);
    return; // No manager found
  }

  // Determine event type
  const eventType = 'type' in event ? event.type : 'level_up';

  // Get learner name
  const [learner] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, learnerId))
    .limit(1);

  const learnerName = learner?.email || 'Unknown Learner';

  // Create in-app notification
  await db.insert(managerNotifications).values({
    managerId: manager.id,
    learnerId,
    type: eventType,
    content: event,
    read: false,
    sentAt: new Date(),
  });

  console.log(`[notifications] Created in-app notification for manager ${manager.id} about learner ${learnerId}`);

  // Check manager notification preferences
  const prefs = await getManagerNotificationPreferences(manager.id);
  if (prefs.notificationFrequency === 'off') {
    return; // Manager opted out
  }

  // For immediate notifications, send email
  if (prefs.notificationFrequency === 'immediate') {
    await sendEmail({
      to: manager.email,
      subject: getEmailSubject(eventType, learnerName),
      body: renderEmailTemplate(eventType, event, learnerName),
    });
  }
  // Note: Daily/weekly digests handled by separate cron job
}

/**
 * Get manager notification preferences
 * For MVP: Default to 'immediate'
 * TODO: Add user_preferences table in future epic
 */
async function getManagerNotificationPreferences(managerId: string): Promise<{ notificationFrequency: 'immediate' | 'daily' | 'weekly' | 'off' }> {
  // For MVP: Default to 'immediate' (preferences UI in future epic)
  return { notificationFrequency: 'immediate' };
}

/**
 * Get email subject based on event type
 */
function getEmailSubject(eventType: string, learnerName: string): string {
  switch (eventType) {
    case 'level_up':
      return `🎉 ${learnerName} leveled up!`;
    case 'certificate':
      return `🏆 ${learnerName} earned a certificate!`;
    case 'badge':
      return `⭐ ${learnerName} unlocked a badge!`;
    case 'at_risk':
      return `⚠️ ${learnerName} needs support`;
    default:
      return `Update on ${learnerName}`;
  }
}

/**
 * Render email template
 */
function renderEmailTemplate(eventType: string, event: any, learnerName: string): string {
  if (eventType === 'level_up') {
    const e = event as LevelUpEvent;
    return `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>🎉 ${learnerName} leveled up!</h2>
          <p><strong>${learnerName}</strong> has progressed from <strong>${e.previousLevel}</strong> to <strong>${e.newLevel}</strong>.</p>
          <p>Correct attempts: ${e.correctAttempts}</p>
          <p><a href="https://app.cerply.com/manager/dashboard">View Team Dashboard</a></p>
        </body>
      </html>
    `;
  }

  if (eventType === 'certificate') {
    return `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>🏆 ${learnerName} earned a certificate!</h2>
          <p><strong>${learnerName}</strong> has completed a track and earned a certificate.</p>
          <p><a href="https://app.cerply.com/manager/dashboard">View Team Dashboard</a></p>
        </body>
      </html>
    `;
  }

  if (eventType === 'badge') {
    return `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>⭐ ${learnerName} unlocked a badge!</h2>
          <p><strong>${learnerName}</strong> has earned a new achievement badge.</p>
          <p><a href="https://app.cerply.com/manager/dashboard">View Team Dashboard</a></p>
        </body>
      </html>
    `;
  }

  // Generic notification
  return `
    <html>
      <body style="font-family: Arial, sans-serif;">
        <h2>Update on ${learnerName}</h2>
        <p>Notification: ${JSON.stringify(event)}</p>
        <p><a href="https://app.cerply.com/manager/dashboard">View Team Dashboard</a></p>
      </body>
    </html>
  `;
}

/**
 * Send email via SendGrid or mock for dev
 */
async function sendEmail(options: { to: string; subject: string; body: string }): Promise<void> {
  if (SENDGRID_API_KEY) {
    // SendGrid implementation
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: options.to }] }],
          from: { email: FROM_EMAIL },
          subject: options.subject,
          content: [{ type: 'text/html', value: options.body }],
        }),
      });

      if (!response.ok) {
        console.error('[notifications] SendGrid error:', await response.text());
      } else {
        console.log(`[notifications] Email sent to ${options.to}`);
      }
    } catch (error) {
      console.error('[notifications] Failed to send email:', error);
    }
  } else {
    // Mock email for dev
    console.log('[notifications] [MOCK EMAIL]', options.to, options.subject);
  }
}

/**
 * Get unread notifications for a manager
 */
export async function getManagerNotifications(
  managerId: string,
  unreadOnly: boolean = false,
  limit: number = 50
): Promise<Array<{
  id: string;
  learnerId: string;
  learnerName: string;
  type: string;
  content: any;
  read: boolean;
  sentAt: Date;
}>> {
  const whereCondition = unreadOnly
    ? and(
        eq(managerNotifications.managerId, managerId),
        eq(managerNotifications.read, false)
      )
    : eq(managerNotifications.managerId, managerId);

  const notifications = await db
    .select({
      id: managerNotifications.id,
      learnerId: managerNotifications.learnerId,
      learnerEmail: users.email,
      type: managerNotifications.type,
      content: managerNotifications.content,
      read: managerNotifications.read,
      sentAt: managerNotifications.sentAt,
    })
    .from(managerNotifications)
    .leftJoin(users, eq(managerNotifications.learnerId, users.id))
    .where(whereCondition!)
    .orderBy(desc(managerNotifications.sentAt))
    .limit(limit);

  return notifications.map(n => ({
    id: n.id,
    learnerId: n.learnerId,
    learnerName: n.learnerEmail || 'Unknown',
    type: n.type,
    content: n.content,
    read: n.read,
    sentAt: n.sentAt,
  }));
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string, managerId: string): Promise<boolean> {
  // Verify ownership
  const [notif] = await db
    .select()
    .from(managerNotifications)
    .where(and(
      eq(managerNotifications.id, notificationId),
      eq(managerNotifications.managerId, managerId)
    ))
    .limit(1);

  if (!notif) return false;

  await db
    .update(managerNotifications)
    .set({ read: true })
    .where(eq(managerNotifications.id, notificationId));

  return true;
}

/**
 * Get unread count for a manager
 */
export async function getUnreadCount(managerId: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(managerNotifications)
    .where(and(
      eq(managerNotifications.managerId, managerId),
      eq(managerNotifications.read, false)
    ));

  return result?.count || 0;
}

