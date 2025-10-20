/**
 * Epic 14 v2.0: Proficiency Update Background Job
 * Runs hourly to update proficiency scores and risk statuses for all active assignments
 */

import { updateAllProficiencies } from '../services/proficiency-tracking';

/**
 * Main job function
 * Should be called by a cron scheduler (e.g., node-cron, external cron, etc.)
 */
export async function runProficiencyUpdateJob(): Promise<void> {
  const startTime = Date.now();
  console.log(`[Proficiency Job] Starting at ${new Date().toISOString()}`);
  
  try {
    const results = await updateAllProficiencies();
    
    const duration = Date.now() - startTime;
    console.log(`[Proficiency Job] Completed in ${duration}ms`);
    console.log(`[Proficiency Job] Results:`, results);
    
    // Log to database (optional - for monitoring)
    // await logJobRun('proficiency_update', 'success', results, duration);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Proficiency Job] Failed after ${duration}ms:`, error);
    
    // Log error to database (optional - for monitoring)
    // await logJobRun('proficiency_update', 'error', { error: error.message }, duration);
    
    // Re-throw to alert monitoring systems
    throw error;
  }
}

/**
 * Setup cron schedule for proficiency updates
 * Run every hour at :00
 */
export function setupProficiencyUpdateCron() {
  // Using node-cron pattern (optional dependency)
  // If node-cron is not installed, this can be triggered externally
  
  try {
    // Try to import node-cron if available
    const cron = require('node-cron');
    
    // Schedule: Every hour at :00
    cron.schedule('0 * * * *', async () => {
      try {
        await runProficiencyUpdateJob();
      } catch (error) {
        console.error('[Proficiency Job] Cron execution failed:', error);
      }
    });
    
    console.log('[Proficiency Job] Cron scheduled: Every hour at :00');
  } catch (error) {
    console.log('[Proficiency Job] node-cron not available - job must be triggered externally');
    console.log('[Proficiency Job] To enable automatic scheduling: npm install node-cron');
  }
}

/**
 * Manual trigger endpoint (for testing or manual runs)
 */
export async function triggerManualUpdate(): Promise<{ success: boolean; results?: any; error?: string }> {
  try {
    const results = await updateAllProficiencies();
    return { success: true, results };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// If this file is run directly, execute the job once
if (require.main === module) {
  console.log('[Proficiency Job] Running manual execution...');
  runProficiencyUpdateJob()
    .then(() => {
      console.log('[Proficiency Job] Manual execution complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Proficiency Job] Manual execution failed:', error);
      process.exit(1);
    });
}

