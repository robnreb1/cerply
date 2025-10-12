#!/usr/bin/env tsx
/**
 * Cleanup Idempotency Keys
 * Epic 7: Gamification Polish
 * 
 * Deletes idempotency keys older than 24 hours.
 * Run daily via cron or GitHub Actions.
 * 
 * Usage:
 *   npx tsx scripts/cleanup-idempotency-keys.ts
 */

import { db } from '../src/db';
import { idempotencyKeys } from '../src/db/schema';
import { lt } from 'drizzle-orm';

const RETENTION_HOURS = 24;

async function cleanupExpiredKeys() {
  const cutoffDate = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000);
  
  console.log(`[cleanup] Deleting idempotency keys older than ${cutoffDate.toISOString()}`);
  
  try {
    const result = await db
      .delete(idempotencyKeys)
      .where(lt(idempotencyKeys.expiresAt, cutoffDate));
    
    console.log(`[cleanup] Deleted expired idempotency keys`);
    console.log(`[cleanup] Cutoff: ${cutoffDate.toISOString()}`);
    
    process.exit(0);
  } catch (error) {
    console.error('[cleanup] Error deleting expired keys:', error);
    process.exit(1);
  }
}

cleanupExpiredKeys();

