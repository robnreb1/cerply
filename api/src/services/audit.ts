/**
 * Audit Events Service
 * Epic 7 Phase 2: Gamification & Certification System
 * Emits structured events for compliance, analytics, and observability
 */

import { db } from '../db';
import { auditEvents } from '../db/schema';

const PERSIST_AUDIT_EVENTS = process.env.PERSIST_AUDIT_EVENTS === 'true';

export interface BaseAuditEvent {
  eventType: string;
  timestamp: Date;
  userId: string;
  organizationId?: string;
  performedBy?: string; // For actions performed by managers/admins
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface BadgeAwardedEvent extends BaseAuditEvent {
  eventType: 'badge_awarded';
  badgeId: string;
  badgeSlug: string;
  badgeName: string;
}

export interface LevelChangedEvent extends BaseAuditEvent {
  eventType: 'level_changed';
  trackId: string;
  previousLevel: string;
  newLevel: string;
  correctAttempts: number;
}

export interface CertificateIssuedEvent extends BaseAuditEvent {
  eventType: 'certificate_issued';
  certificateId: string;
  trackId: string;
  trackTitle?: string;
}

export interface CertificateDownloadedEvent extends BaseAuditEvent {
  eventType: 'certificate_downloaded';
  certificateId: string;
}

export interface CertificateRevokedEvent extends BaseAuditEvent {
  eventType: 'certificate_revoked';
  certificateId: string;
  reason: string;
}

export interface NotificationMarkedReadEvent extends BaseAuditEvent {
  eventType: 'notification_marked_read';
  notificationId: string;
  notificationType: string;
}

export type AuditEvent =
  | BadgeAwardedEvent
  | LevelChangedEvent
  | CertificateIssuedEvent
  | CertificateDownloadedEvent
  | CertificateRevokedEvent
  | NotificationMarkedReadEvent;

// In-memory counters for KPIs (reset on server restart)
// In production, these would be sent to a metrics service like Prometheus/DataDog
const counters = {
  badges_awarded: 0,
  levels_changed: 0,
  certificates_issued: 0,
  certificates_downloaded: 0,
  certificates_revoked: 0,
  notifications_marked_read: 0,
};

/**
 * Emit an audit event
 * For MVP: Logs to console in structured format
 * For Production: Send to analytics service (Segment, Mixpanel, etc.) + persist to DB
 */
export async function emitAuditEvent(event: AuditEvent): Promise<void> {
  // Increment counter
  switch (event.eventType) {
    case 'badge_awarded':
      counters.badges_awarded++;
      break;
    case 'level_changed':
      counters.levels_changed++;
      break;
    case 'certificate_issued':
      counters.certificates_issued++;
      break;
    case 'certificate_downloaded':
      counters.certificates_downloaded++;
      break;
    case 'certificate_revoked':
      counters.certificates_revoked++;
      break;
    case 'notification_marked_read':
      counters.notifications_marked_read++;
      break;
  }

  // Log structured event
  console.log('[audit]', JSON.stringify({
    ...event,
    timestamp: event.timestamp.toISOString(),
  }));

  // Optionally persist to database (PERSIST_AUDIT_EVENTS=true)
  if (PERSIST_AUDIT_EVENTS) {
    try {
      await db.insert(auditEvents).values({
        eventType: event.eventType,
        userId: event.userId,
        organizationId: event.organizationId || null,
        performedBy: event.performedBy || null,
        requestId: event.requestId || null,
        metadata: event.metadata || null,
        occurredAt: event.timestamp,
      });
    } catch (error) {
      console.error('[audit] Failed to persist event:', error);
      // Don't fail the main operation if audit persistence fails
    }
  }

  // TODO: Send to analytics service
  // await analytics.track(event.userId, event.eventType, event);
}

/**
 * Get current event counters
 */
export function getAuditCounters() {
  return {
    ...counters,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Reset counters (for testing)
 */
export function resetAuditCounters() {
  counters.badges_awarded = 0;
  counters.levels_changed = 0;
  counters.certificates_issued = 0;
  counters.certificates_downloaded = 0;
  counters.certificates_revoked = 0;
  counters.notifications_marked_read = 0;
}

/**
 * Helper to emit badge awarded event
 */
export async function emitBadgeAwarded(params: {
  userId: string;
  organizationId?: string;
  badgeId: string;
  badgeSlug: string;
  badgeName: string;
  requestId?: string;
}): Promise<void> {
  await emitAuditEvent({
    eventType: 'badge_awarded',
    timestamp: new Date(),
    ...params,
  });
}

/**
 * Helper to emit level changed event
 */
export async function emitLevelChanged(params: {
  userId: string;
  organizationId?: string;
  trackId: string;
  previousLevel: string;
  newLevel: string;
  correctAttempts: number;
  requestId?: string;
}): Promise<void> {
  await emitAuditEvent({
    eventType: 'level_changed',
    timestamp: new Date(),
    ...params,
  });
}

/**
 * Helper to emit certificate issued event
 */
export async function emitCertificateIssued(params: {
  userId: string;
  organizationId?: string;
  certificateId: string;
  trackId: string;
  trackTitle?: string;
  requestId?: string;
}): Promise<void> {
  await emitAuditEvent({
    eventType: 'certificate_issued',
    timestamp: new Date(),
    ...params,
  });
}

/**
 * Helper to emit certificate downloaded event
 */
export async function emitCertificateDownloaded(params: {
  userId: string;
  organizationId?: string;
  certificateId: string;
  performedBy?: string;
  requestId?: string;
}): Promise<void> {
  await emitAuditEvent({
    eventType: 'certificate_downloaded',
    timestamp: new Date(),
    ...params,
  });
}

/**
 * Helper to emit certificate revoked event
 */
export async function emitCertificateRevoked(params: {
  userId: string;
  organizationId?: string;
  certificateId: string;
  reason: string;
  performedBy?: string;
  requestId?: string;
}): Promise<void> {
  await emitAuditEvent({
    eventType: 'certificate_revoked',
    timestamp: new Date(),
    ...params,
  });
}

/**
 * Helper to emit notification marked read event
 */
export async function emitNotificationMarkedRead(params: {
  userId: string;
  organizationId?: string;
  notificationId: string;
  notificationType: string;
  performedBy?: string;
  requestId?: string;
}): Promise<void> {
  await emitAuditEvent({
    eventType: 'notification_marked_read',
    timestamp: new Date(),
    ...params,
  });
}

