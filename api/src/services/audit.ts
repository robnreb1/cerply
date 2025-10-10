/**
 * Audit Events Service
 * Epic 7 Phase 2: Gamification & Certification System
 * Emits structured events for compliance, analytics, and observability
 */

import { db } from '../db';

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
  | NotificationMarkedReadEvent;

// In-memory counters for KPIs (reset on server restart)
// In production, these would be sent to a metrics service like Prometheus/DataDog
const counters = {
  badges_awarded: 0,
  levels_changed: 0,
  certificates_issued: 0,
  certificates_downloaded: 0,
  notifications_marked_read: 0,
};

/**
 * Emit an audit event
 * For MVP: Logs to console in structured format
 * For Production: Send to analytics service (Segment, Mixpanel, etc.)
 */
export function emitAuditEvent(event: AuditEvent): void {
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
    case 'notification_marked_read':
      counters.notifications_marked_read++;
      break;
  }

  // Log structured event
  console.log('[audit]', JSON.stringify({
    ...event,
    timestamp: event.timestamp.toISOString(),
  }));

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
  counters.notifications_marked_read = 0;
}

/**
 * Helper to emit badge awarded event
 */
export function emitBadgeAwarded(params: {
  userId: string;
  organizationId?: string;
  badgeId: string;
  badgeSlug: string;
  badgeName: string;
  requestId?: string;
}) {
  emitAuditEvent({
    eventType: 'badge_awarded',
    timestamp: new Date(),
    ...params,
  });
}

/**
 * Helper to emit level changed event
 */
export function emitLevelChanged(params: {
  userId: string;
  organizationId?: string;
  trackId: string;
  previousLevel: string;
  newLevel: string;
  correctAttempts: number;
  requestId?: string;
}) {
  emitAuditEvent({
    eventType: 'level_changed',
    timestamp: new Date(),
    ...params,
  });
}

/**
 * Helper to emit certificate issued event
 */
export function emitCertificateIssued(params: {
  userId: string;
  organizationId?: string;
  certificateId: string;
  trackId: string;
  trackTitle?: string;
  requestId?: string;
}) {
  emitAuditEvent({
    eventType: 'certificate_issued',
    timestamp: new Date(),
    ...params,
  });
}

/**
 * Helper to emit certificate downloaded event
 */
export function emitCertificateDownloaded(params: {
  userId: string;
  organizationId?: string;
  certificateId: string;
  performedBy?: string;
  requestId?: string;
}) {
  emitAuditEvent({
    eventType: 'certificate_downloaded',
    timestamp: new Date(),
    ...params,
  });
}

/**
 * Helper to emit notification marked read event
 */
export function emitNotificationMarkedRead(params: {
  userId: string;
  organizationId?: string;
  notificationId: string;
  notificationType: string;
  performedBy?: string;
  requestId?: string;
}) {
  emitAuditEvent({
    eventType: 'notification_marked_read',
    timestamp: new Date(),
    ...params,
  });
}

