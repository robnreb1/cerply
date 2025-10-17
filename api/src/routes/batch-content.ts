/**
 * Batch Content Generation Routes
 * Epic 6.6: Content Library Seeding
 * BRD: B-3 | FSD: §27 Batch Generation v1
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireManager, getSession } from '../middleware/rbac';
import { BatchGenerationService, TopicInput } from '../services/batch-generation';

const FF_BATCH_GENERATION_V1 = process.env.FF_BATCH_GENERATION_V1 === 'true';

export async function registerBatchContentRoutes(app: FastifyInstance) {
  const batchService = new BatchGenerationService();

  /**
   * POST /api/content/batch/upload
   * Upload CSV and create batch job
   * RBAC: Manager/admin only
   * Feature Flag: FF_BATCH_GENERATION_V1
   */
  app.post(
    '/api/content/batch/upload',
    async (
      req: FastifyRequest<{ Body: { csvData: string; phase: 'uat' | 'production' } }>,
      reply: FastifyReply
    ) => {
      if (!FF_BATCH_GENERATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const { csvData, phase } = req.body;

      if (!csvData || !phase) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'csvData and phase required'
          }
        });
      }

      if (phase !== 'uat' && phase !== 'production') {
        return reply.status(400).send({
          error: {
            code: 'INVALID_PHASE',
            message: 'Phase must be "uat" or "production"'
          }
        });
      }

      try {
        // Parse CSV
        const topics = parseCSV(csvData);

        if (topics.length === 0) {
          return reply.status(400).send({
            error: {
              code: 'EMPTY_CSV',
              message: 'CSV contains no valid topics'
            }
          });
        }

        // Validate topic count for phase
        if (phase === 'uat' && topics.length > 20) {
          return reply.status(400).send({
            error: {
              code: 'UAT_LIMIT_EXCEEDED',
              message: 'UAT phase limited to 20 topics',
              details: { provided: topics.length, max: 20 }
            }
          });
        }

        if (phase === 'production' && topics.length > 400) {
          return reply.status(400).send({
            error: {
              code: 'PRODUCTION_LIMIT_EXCEEDED',
              message: 'Production phase limited to 400 topics',
              details: { provided: topics.length, max: 400 }
            }
          });
        }

        // Create batch
        const { batchId } = await batchService.createBatch(topics, phase);

        // Start processing asynchronously (in background)
        processBatchAsync(batchId, batchService);

        return reply.status(201).send({
          batchId,
          status: 'queued',
          totalTopics: topics.length,
          phase,
          estimatedTimeMinutes: Math.ceil(topics.length * 0.5), // ~30 seconds per topic
          pollUrl: `/api/content/batch/${batchId}/progress`
        });
      } catch (error: any) {
        console.error('[batch] Upload error:', error);
        return reply.status(500).send({
          error: {
            code: 'BATCH_CREATION_FAILED',
            message: error.message
          }
        });
      }
    }
  );

  /**
   * GET /api/content/batch/:batchId/progress
   * Get batch progress and statistics
   * RBAC: Manager/admin only
   * Feature Flag: FF_BATCH_GENERATION_V1
   */
  app.get(
    '/api/content/batch/:batchId/progress',
    async (
      req: FastifyRequest<{ Params: { batchId: string } }>,
      reply: FastifyReply
    ) => {
      if (!FF_BATCH_GENERATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const { batchId } = req.params;

      try {
        const progress = await batchService.getBatchProgress(batchId);
        
        return reply.send(progress);
      } catch (error: any) {
        console.error('[batch] Progress error:', error);
        
        if (error.message.includes('not found')) {
          return reply.status(404).send({
            error: {
              code: 'BATCH_NOT_FOUND',
              message: 'Batch not found'
            }
          });
        }
        
        return reply.status(500).send({
          error: {
            code: 'PROGRESS_CHECK_FAILED',
            message: error.message
          }
        });
      }
    }
  );

  /**
   * POST /api/content/batch/:batchId/approve
   * Approve UAT batch (allows proceeding to production)
   * RBAC: Manager/admin only
   * Feature Flag: FF_BATCH_GENERATION_V1
   */
  app.post(
    '/api/content/batch/:batchId/approve',
    async (
      req: FastifyRequest<{ Params: { batchId: string } }>,
      reply: FastifyReply
    ) => {
      if (!FF_BATCH_GENERATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const session = getSession(req) || {
        userId: '00000000-0000-0000-0000-000000000002',
        organizationId: '00000000-0000-0000-0000-000000000001',
        role: 'admin',
      };

      const { batchId } = req.params;

      try {
        await batchService.approveBatch(batchId, session.userId);
        
        return reply.send({
          success: true,
          batchId,
          approvedBy: session.userId,
          approvedAt: new Date().toISOString()
        });
      } catch (error: any) {
        console.error('[batch] Approval error:', error);
        
        if (error.message.includes('not found')) {
          return reply.status(404).send({
            error: {
              code: 'BATCH_NOT_FOUND',
              message: 'Batch not found'
            }
          });
        }
        
        if (error.message.includes('Only UAT')) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_PHASE',
              message: 'Only UAT batches can be approved'
            }
          });
        }
        
        return reply.status(500).send({
          error: {
            code: 'APPROVAL_FAILED',
            message: error.message
          }
        });
      }
    }
  );

  /**
   * POST /api/content/batch/:batchId/reject
   * Reject UAT batch
   * RBAC: Manager/admin only
   * Feature Flag: FF_BATCH_GENERATION_V1
   */
  app.post(
    '/api/content/batch/:batchId/reject',
    async (
      req: FastifyRequest<{ Params: { batchId: string }; Body: { reason: string } }>,
      reply: FastifyReply
    ) => {
      if (!FF_BATCH_GENERATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const { batchId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return reply.status(400).send({
          error: {
            code: 'REASON_REQUIRED',
            message: 'Rejection reason required'
          }
        });
      }

      try {
        await batchService.rejectBatch(batchId, reason);
        
        return reply.send({
          success: true,
          batchId,
          reason
        });
      } catch (error: any) {
        console.error('[batch] Rejection error:', error);
        
        if (error.message.includes('not found')) {
          return reply.status(404).send({
            error: {
              code: 'BATCH_NOT_FOUND',
              message: 'Batch not found'
            }
          });
        }
        
        return reply.status(500).send({
          error: {
            code: 'REJECTION_FAILED',
            message: error.message
          }
        });
      }
    }
  );

  /**
   * POST /api/content/batch/:batchId/pause
   * Pause batch processing
   * RBAC: Manager/admin only
   * Feature Flag: FF_BATCH_GENERATION_V1
   */
  app.post(
    '/api/content/batch/:batchId/pause',
    async (
      req: FastifyRequest<{ Params: { batchId: string }; Body: { reason?: string } }>,
      reply: FastifyReply
    ) => {
      if (!FF_BATCH_GENERATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const { batchId } = req.params;
      const { reason } = req.body;

      try {
        await batchService.pauseBatch(batchId, reason || 'Manual pause by manager');
        
        return reply.send({
          success: true,
          batchId,
          status: 'paused'
        });
      } catch (error: any) {
        console.error('[batch] Pause error:', error);
        
        if (error.message.includes('not found')) {
          return reply.status(404).send({
            error: {
              code: 'BATCH_NOT_FOUND',
              message: 'Batch not found'
            }
          });
        }
        
        return reply.status(500).send({
          error: {
            code: 'PAUSE_FAILED',
            message: error.message
          }
        });
      }
    }
  );

  /**
   * POST /api/content/batch/:batchId/resume
   * Resume paused batch processing
   * RBAC: Manager/admin only
   * Feature Flag: FF_BATCH_GENERATION_V1
   */
  app.post(
    '/api/content/batch/:batchId/resume',
    async (
      req: FastifyRequest<{ Params: { batchId: string } }>,
      reply: FastifyReply
    ) => {
      if (!FF_BATCH_GENERATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const { batchId } = req.params;

      try {
        // Restart batch processing
        processBatchAsync(batchId, batchService);
        
        return reply.send({
          success: true,
          batchId,
          status: 'processing'
        });
      } catch (error: any) {
        console.error('[batch] Resume error:', error);
        
        return reply.status(500).send({
          error: {
            code: 'RESUME_FAILED',
            message: error.message
          }
        });
      }
    }
  );
}

/**
 * Parse CSV data into topic inputs
 */
function parseCSV(csvData: string): TopicInput[] {
  const lines = csvData.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV must contain header row and at least one data row');
  }
  
  // Parse header
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const titleIdx = header.indexOf('title');
  const categoryIdx = header.indexOf('category');
  const difficultyIdx = header.indexOf('difficulty');
  
  if (titleIdx === -1 || categoryIdx === -1 || difficultyIdx === -1) {
    throw new Error('CSV must contain columns: title, category, difficulty');
  }
  
  // Parse data rows
  const topics: TopicInput[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const values = line.split(',').map(v => v.trim());
    
    const title = values[titleIdx];
    const category = values[categoryIdx];
    const difficulty = values[difficultyIdx] as 'beginner' | 'intermediate' | 'advanced';
    
    if (!title || !category || !difficulty) {
      console.warn(`[batch] Skipping invalid row ${i + 1}: missing required fields`);
      continue;
    }
    
    if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
      console.warn(`[batch] Skipping invalid row ${i + 1}: invalid difficulty "${difficulty}"`);
      continue;
    }
    
    topics.push({ title, category, difficulty });
  }
  
  return topics;
}

/**
 * Process batch asynchronously in background
 * In production, use a proper job queue (Bull, BullMQ, etc.)
 */
async function processBatchAsync(batchId: string, batchService: BatchGenerationService) {
  try {
    console.log(`[batch] Starting async processing for batch ${batchId}`);
    await batchService.processBatch(batchId);
    console.log(`[batch] Completed processing for batch ${batchId}`);
  } catch (error: any) {
    console.error(`[batch] Async processing error for batch ${batchId}:`, error.message);
  }
}

