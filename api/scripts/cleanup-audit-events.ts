#!/usr/bin/env tsx
/**
 * Cleanup Audit Events
 * Epic 7: Gamification Polish
 * 
 * Deletes audit events older than RETAIN_AUDIT_DAYS (default: 180 days).
 * Run weekly via cron or GitHub Actions.
 * 
 * Usage:
 *   RETAIN_AUDIT_DAYS=180 npx tsx scripts/cleanup-audit-events.ts
 */

import { db } from '../src/db';
import { auditEvents } from '../src/db/schema';
import { lt } from 'drizzle-orm';

const RETAIN_AUDIT_DAYS = parseInt(process.env.RETAIN_AUDIT_DAYS || '180', 10);

async function cleanupOldAuditEvents() {
  const cutoffDate = new Date(Date.now() - RETAIN_AUDIT_DAYS * 24 * 60 * 60 * 1000);
  
  console.log(`[cleanup] Deleting audit events older than ${cutoffDate.toISOString()} (${RETAIN_AUDIT_DAYS} days)`);
  
  try {
    const result = await db
      .delete(auditEvents)
      .where(lt(auditEvents.occurredAt, cutoffDate));
    
    console.log(`[cleanup] Deleted old audit events`);
    console.log(`[cleanup] Cutoff: ${cutoffDate.toISOString()}`);
    console.log(`[cleanup] Retention: ${RETAIN_AUDIT_DAYS} days`);
    
    process.exit(0);
  } catch (error) {
    console.error('[cleanup] Error deleting old audit events:', error);
    process.exit(1);
  }
}

cleanupOldAuditEvents();

