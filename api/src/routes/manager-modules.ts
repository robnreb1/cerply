/**
 * Epic 14: Manager Module Workflows
 * Routes for creating, refining, assigning, and tracking training modules
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { query, single } from '../db';
import { requireManager } from '../middleware/rbac';
import { getSession } from '../middleware/rbac';

// Types
interface CreateModuleRequest {
  topicId: string;
  title: string;
  description?: string;
  isMandatory?: boolean;
  targetRoles?: string[];
  estimatedMinutes?: number;
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

interface AssignModuleRequest {
  userIds?: string[];
  teamIds?: string[];
  roleFilters?: string[];
  isMandatory?: boolean;
  dueDate?: string;
}

interface UpdateContentRequest {
  sections?: Array<{ id: string; content: string }>;
  questions?: Array<{ id: string; stem?: string; options?: any; guidance_text?: string }>;
  guidance?: Array<{ id: string; text: string }>;
}

interface ProprietaryContentRequest {
  contentType: 'document' | 'case_study' | 'policy' | 'video';
  title: string;
  content?: string;
  sourceUrl?: string;
}

export async function registerManagerModuleRoutes(app: FastifyInstance) {
  
  // ============================================================================
  // MODULE CRUD OPERATIONS
  // ============================================================================
  
  /**
   * POST /api/curator/modules/create
   * Create a new module from a topic
   */
  app.post('/api/curator/modules/create', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requireManager(req, reply)) return;
    
    const body = req.body as CreateModuleRequest;
    const session = getSession(req);
    const userId = session?.userId || '00000000-0000-0000-0000-000000000001'; // Test user UUID for dev/test
    
    const { topicId, title, description, isMandatory, targetRoles, estimatedMinutes, difficultyLevel } = body;
    
    if (!topicId || !title) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'topicId and title are required',
        },
      });
    }
    
    // Validate difficulty level if provided
    if (difficultyLevel && !['beginner', 'intermediate', 'advanced', 'expert'].includes(difficultyLevel)) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'difficultyLevel must be one of: beginner, intermediate, advanced, expert',
        },
      });
    }
    
    // Verify topic exists
    const topic = await single<any>(
      'SELECT id, title FROM topics WHERE id = $1',
      [topicId]
    );
    
    if (!topic) {
      return reply.status(404).send({
        error: {
          code: 'TOPIC_NOT_FOUND',
          message: 'Topic not found',
        },
      });
    }
    
    // Create module
    const module = await single<any>(
      `INSERT INTO manager_modules (
        topic_id, created_by, title, description, status, is_mandatory, target_roles, estimated_minutes, difficulty_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        topicId,
        userId,
        title,
        description || null,
        'draft',
        isMandatory || false,
        JSON.stringify(targetRoles || []),
        estimatedMinutes || null,
        difficultyLevel || null,
      ]
    );
    
    return reply.send({
      moduleId: module.id,
      status: 'draft',
      message: 'Module created successfully',
      module,
    });
  });
  
  /**
   * GET /api/curator/modules
   * List all modules created by or accessible to manager
   */
  app.get('/api/curator/modules', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requireManager(req, reply)) return;
    
    const session = getSession(req);
    const userId = session?.userId || '00000000-0000-0000-0000-000000000001'; // Test user UUID for dev/test
    const query_params = req.query as any;
    const status = query_params.status;
    const teamId = query_params.teamId;
    
    // Build query
    let sql = `
      SELECT 
        mm.*,
        t.title as topic_title,
        t.description as topic_description,
        COUNT(DISTINCT ma.user_id) as assignment_count,
        COUNT(DISTINCT CASE WHEN ma.status = 'completed' THEN ma.user_id END) as completion_count,
        COUNT(DISTINCT CASE WHEN ma.status = 'in_progress' THEN ma.user_id END) as in_progress_count
      FROM manager_modules mm
      LEFT JOIN topics t ON mm.topic_id = t.id
      LEFT JOIN module_assignments ma ON mm.id = ma.module_id
      WHERE mm.created_by = $1
    `;
    
    const params: any[] = [userId];
    let paramIndex = 2;
    
    if (status) {
      sql += ` AND mm.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    sql += ` GROUP BY mm.id, t.id ORDER BY mm.created_at DESC`;
    
    const result = await query<any>(sql, params);
    
    return reply.send({ modules: result.rows });
  });
  
  /**
   * GET /api/curator/modules/:id
   * Get module details including content and questions
   */
  app.get('/api/curator/modules/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requireManager(req, reply)) return;
    
    const { id } = (req as any).params as { id: string };
    const session = getSession(req);
    const userId = session?.userId || '00000000-0000-0000-0000-000000000001'; // Test user UUID for dev/test
    
    // Get module
    const module = await single<any>(
      `SELECT mm.*, t.title as topic_title, t.description as topic_description
       FROM manager_modules mm
       LEFT JOIN topics t ON mm.topic_id = t.id
       WHERE mm.id = $1 AND mm.created_by = $2`,
      [id, userId]
    );
    
    if (!module) {
      return reply.status(404).send({
        error: {
          code: 'MODULE_NOT_FOUND',
          message: 'Module not found or access denied',
        },
      });
    }
    
    // Get content corpus
    const content = await query<any>(
      `SELECT * FROM content_corpus WHERE topic_id = $1 ORDER BY order_index`,
      [module.topic_id]
    );
    
    // Get questions (from modules_v2 -> quizzes -> questions hierarchy)
    const questions = await query<any>(
      `SELECT q.* FROM questions q
       INNER JOIN quizzes qz ON q.quiz_id = qz.id
       INNER JOIN modules_v2 m ON qz.module_id = m.id
       WHERE m.topic_id = $1
       ORDER BY qz.order_index, q.id`,
      [module.topic_id]
    );
    
    // Get proprietary content
    const proprietaryContent = await query<any>(
      `SELECT * FROM module_proprietary_content WHERE module_id = $1 ORDER BY created_at DESC`,
      [id]
    );
    
    // Get recent edits
    const recentEdits = await query<any>(
      `SELECT * FROM module_content_edits WHERE module_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [id]
    );
    
    return reply.send({
      module,
      content: content.rows,
      questions: questions.rows,
      proprietaryContent: proprietaryContent.rows,
      recentEdits: recentEdits.rows,
    });
  });
  
  /**
   * PUT /api/curator/modules/:id
   * Update module metadata
   */
  app.put('/api/curator/modules/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requireManager(req, reply)) return;
    
    const { id } = (req as any).params as { id: string };
    const session = getSession(req);
    const userId = session?.userId || '00000000-0000-0000-0000-000000000001'; // Test user UUID for dev/test
    const body = req.body as Partial<CreateModuleRequest> & { status?: string };
    
    // Verify ownership
    const existing = await single<any>(
      'SELECT id FROM manager_modules WHERE id = $1 AND created_by = $2',
      [id, userId]
    );
    
    if (!existing) {
      return reply.status(404).send({
        error: {
          code: 'MODULE_NOT_FOUND',
          message: 'Module not found or access denied',
        },
      });
    }
    
    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (body.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(body.title);
    }
    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(body.description);
    }
    if (body.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(body.status);
    }
    if (body.isMandatory !== undefined) {
      updates.push(`is_mandatory = $${paramIndex++}`);
      params.push(body.isMandatory);
    }
    if (body.targetRoles !== undefined) {
      updates.push(`target_roles = $${paramIndex++}`);
      params.push(JSON.stringify(body.targetRoles));
    }
    if (body.estimatedMinutes !== undefined) {
      updates.push(`estimated_minutes = $${paramIndex++}`);
      params.push(body.estimatedMinutes);
    }
    if (body.difficultyLevel !== undefined) {
      // Validate difficulty level
      if (body.difficultyLevel && !['beginner', 'intermediate', 'advanced', 'expert'].includes(body.difficultyLevel)) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'difficultyLevel must be one of: beginner, intermediate, advanced, expert',
          },
        });
      }
      updates.push(`difficulty_level = $${paramIndex++}`);
      params.push(body.difficultyLevel);
    }
    
    if (updates.length === 0) {
      return reply.send({ success: true, message: 'No changes to apply' });
    }
    
    updates.push(`updated_at = NOW()`);
    params.push(id);
    
    const sql = `UPDATE manager_modules SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const updated = await single<any>(sql, params);
    
    return reply.send({ success: true, module: updated });
  });
  
  /**
   * POST /api/curator/modules/:id/pause
   * Pause a module (prevents new assignments/starts)
   */
  app.post('/api/curator/modules/:id/pause', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requireManager(req, reply)) return;
    
    const { id } = (req as any).params as { id: string };
    const session = getSession(req);
    const userId = session?.userId || '00000000-0000-0000-0000-000000000001';
    
    // Verify ownership
    const existing = await single<any>(
      'SELECT id, title, paused_at FROM manager_modules WHERE id = $1 AND created_by = $2',
      [id, userId]
    );
    
    if (!existing) {
      return reply.status(404).send({
        error: {
          code: 'MODULE_NOT_FOUND',
          message: 'Module not found or access denied',
        },
      });
    }
    
    if (existing.paused_at) {
      return reply.status(400).send({
        error: {
          code: 'ALREADY_PAUSED',
          message: 'Module is already paused',
        },
      });
    }
    
    // Pause the module
    const updated = await single<any>(
      'UPDATE manager_modules SET paused_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    
    return reply.send({ 
      success: true, 
      message: `Module "${existing.title}" has been paused`,
      module: updated 
    });
  });
  
  /**
   * POST /api/curator/modules/:id/unpause
   * Unpause a module (resume normal operation)
   */
  app.post('/api/curator/modules/:id/unpause', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requireManager(req, reply)) return;
    
    const { id } = (req as any).params as { id: string };
    const session = getSession(req);
    const userId = session?.userId || '00000000-0000-0000-0000-000000000001';
    
    // Verify ownership
    const existing = await single<any>(
      'SELECT id, title, paused_at FROM manager_modules WHERE id = $1 AND created_by = $2',
      [id, userId]
    );
    
    if (!existing) {
      return reply.status(404).send({
        error: {
          code: 'MODULE_NOT_FOUND',
          message: 'Module not found or access denied',
        },
      });
    }
    
    if (!existing.paused_at) {
      return reply.status(400).send({
        error: {
          code: 'NOT_PAUSED',
          message: 'Module is not currently paused',
        },
      });
    }
    
    // Unpause the module
    const updated = await single<any>(
      'UPDATE manager_modules SET paused_at = NULL, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    
    return reply.send({ 
      success: true, 
      message: `Module "${existing.title}" has been unpaused`,
      module: updated 
    });
  });
  
  /**
   * DELETE /api/curator/modules/:id
   * Archive a module
   */
  app.delete('/api/curator/modules/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requireManager(req, reply)) return;
    
    const { id } = (req as any).params as { id: string };
    const session = getSession(req);
    const userId = session?.userId || '00000000-0000-0000-0000-000000000001'; // Test user UUID for dev/test
    
    // Verify ownership
    const existing = await single<any>(
      'SELECT id FROM manager_modules WHERE id = $1 AND created_by = $2',
      [id, userId]
    );
    
    if (!existing) {
      return reply.status(404).send({
        error: {
          code: 'MODULE_NOT_FOUND',
          message: 'Module not found or access denied',
        },
      });
    }
    
    // Archive instead of delete
    await query(
      `UPDATE manager_modules SET status = 'archived', updated_at = NOW() WHERE id = $1`,
      [id]
    );
    
    return reply.send({ success: true, message: 'Module archived successfully' });
  });
  
  // ============================================================================
  // CONTENT REFINEMENT
  // ============================================================================
  
  /**
   * PUT /api/curator/modules/:id/content
   * Edit module content (sections, questions, guidance)
   */
  app.put('/api/curator/modules/:id/content', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requireManager(req, reply)) return;
    
    const { id } = (req as any).params as { id: string };
    const session = getSession(req);
    const userId = session?.userId || '00000000-0000-0000-0000-000000000001'; // Test user UUID for dev/test
    const body = req.body as UpdateContentRequest;
    
    // Verify ownership
    const module = await single<any>(
      'SELECT id, topic_id FROM manager_modules WHERE id = $1 AND created_by = $2',
      [id, userId]
    );
    
    if (!module) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Module not found or access denied',
        },
      });
    }
    
    // Update sections
    if (body.sections && body.sections.length > 0) {
      for (const section of body.sections) {
        if (!section.id) continue;
        
        // Get before state
        const before = await single<any>(
          'SELECT * FROM content_corpus WHERE id = $1',
          [section.id]
        );
        
        if (before) {
          // Update content
          await query(
            'UPDATE content_corpus SET content = $1, updated_at = NOW() WHERE id = $2',
            [section.content, section.id]
          );
          
          // Log edit
          await query(
            `INSERT INTO module_content_edits (
              module_id, edited_by, edit_type, section_id, before_content, after_content
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              id,
              userId,
              'section_edit',
              section.id,
              JSON.stringify(before),
              JSON.stringify(section),
            ]
          );
        }
      }
    }
    
    // Update questions
    if (body.questions && body.questions.length > 0) {
      for (const question of body.questions) {
        if (!question.id) continue;
        
        const before = await single<any>(
          'SELECT * FROM questions WHERE id = $1',
          [question.id]
        );
        
        if (before) {
          const updates: string[] = [];
          const params: any[] = [];
          let paramIndex = 1;
          
          if (question.stem !== undefined) {
            updates.push(`stem = $${paramIndex++}`);
            params.push(question.stem);
          }
          if (question.options !== undefined) {
            updates.push(`options = $${paramIndex++}`);
            params.push(JSON.stringify(question.options));
          }
          if (question.guidance_text !== undefined) {
            updates.push(`guidance_text = $${paramIndex++}`);
            params.push(question.guidance_text);
          }
          
          if (updates.length > 0) {
            params.push(question.id);
            await query(
              `UPDATE questions SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
              params
            );
            
            // Log edit
            await query(
              `INSERT INTO module_content_edits (
                module_id, edited_by, edit_type, section_id, before_content, after_content
              ) VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                id,
                userId,
                'question_edit',
                question.id,
                JSON.stringify(before),
                JSON.stringify(question),
              ]
            );
          }
        }
      }
    }
    
    // Update module timestamp
    await query(
      'UPDATE manager_modules SET updated_at = NOW() WHERE id = $1',
      [id]
    );
    
    return reply.send({ success: true, message: 'Content updated successfully' });
  });
  
  /**
   * POST /api/curator/modules/:id/proprietary
   * Add proprietary content to module
   */
  app.post('/api/curator/modules/:id/proprietary', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requireManager(req, reply)) return;
    
    const { id } = (req as any).params as { id: string };
    const session = getSession(req);
    const userId = session?.userId || '00000000-0000-0000-0000-000000000001'; // Test user UUID for dev/test
    const body = req.body as ProprietaryContentRequest;
    
    const { contentType, title, content, sourceUrl } = body;
    
    if (!contentType || !title) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'contentType and title are required',
        },
      });
    }
    
    // Verify ownership
    const module = await single<any>(
      'SELECT id FROM manager_modules WHERE id = $1 AND created_by = $2',
      [id, userId]
    );
    
    if (!module) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Module not found or access denied',
        },
      });
    }
    
    // Insert proprietary content
    const proprietaryContent = await single<any>(
      `INSERT INTO module_proprietary_content (
        module_id, content_type, title, content, source_url, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [id, contentType, title, content || null, sourceUrl || null, userId]
    );
    
    return reply.send({ success: true, proprietaryContent });
  });
  
  /**
   * DELETE /api/curator/modules/:id/proprietary/:contentId
   * Remove proprietary content from module
   */
  app.delete('/api/curator/modules/:id/proprietary/:contentId', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requireManager(req, reply)) return;
    
    const { id, contentId } = (req as any).params as { id: string; contentId: string };
    const session = getSession(req);
    const userId = session?.userId || '00000000-0000-0000-0000-000000000001'; // Test user UUID for dev/test
    
    // Verify ownership
    const module = await single<any>(
      'SELECT id FROM manager_modules WHERE id = $1 AND created_by = $2',
      [id, userId]
    );
    
    if (!module) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Module not found or access denied',
        },
      });
    }
    
    // Delete proprietary content
    await query(
      'DELETE FROM module_proprietary_content WHERE id = $1 AND module_id = $2',
      [contentId, id]
    );
    
    return reply.send({ success: true, message: 'Proprietary content removed' });
  });
  
  // ============================================================================
  // TEAM ASSIGNMENT
  // ============================================================================
  
  /**
   * POST /api/curator/modules/:id/assign
   * Assign module to team members
   */
  app.post('/api/curator/modules/:id/assign', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requireManager(req, reply)) return;
    
    const { id } = (req as any).params as { id: string };
    const session = getSession(req);
    const userId = session?.userId || '00000000-0000-0000-0000-000000000001'; // Test user UUID for dev/test
    const body = req.body as AssignModuleRequest;
    
    const { userIds, teamIds, roleFilters, isMandatory, dueDate } = body;
    
    // Verify ownership
    const module = await single<any>(
      'SELECT id, status FROM manager_modules WHERE id = $1 AND created_by = $2',
      [id, userId]
    );
    
    if (!module) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Module not found or access denied',
        },
      });
    }
    
    // Resolve target users
    let targetUserIds: string[] = userIds || [];
    
    // Add users from teams
    if (teamIds && teamIds.length > 0) {
      const teamMembers = await query<any>(
        `SELECT DISTINCT user_id FROM team_members WHERE team_id = ANY($1::uuid[])`,
        [teamIds]
      );
      targetUserIds.push(...teamMembers.rows.map((tm: any) => tm.user_id));
    }
    
    // Filter by role if specified
    if (roleFilters && roleFilters.length > 0 && targetUserIds.length > 0) {
      const filteredUsers = await query<any>(
        `SELECT DISTINCT u.id FROM users u
         INNER JOIN user_roles ur ON u.id = ur.user_id
         WHERE u.id = ANY($1::uuid[]) AND ur.role = ANY($2::text[])`,
        [targetUserIds, roleFilters]
      );
      targetUserIds = filteredUsers.rows.map((u: any) => u.id);
    }
    
    // Deduplicate
    targetUserIds = [...new Set(targetUserIds)];
    
    if (targetUserIds.length === 0) {
      return reply.status(400).send({
        error: {
          code: 'NO_USERS_TO_ASSIGN',
          message: 'No users found matching the criteria',
        },
      });
    }
    
    // Create assignments
    let assignedCount = 0;
    for (const targetUserId of targetUserIds) {
      try {
        await query(
          `INSERT INTO module_assignments (
            module_id, user_id, assigned_by, due_date, status
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (module_id, user_id) DO NOTHING`,
          [id, targetUserId, userId, dueDate || null, 'assigned']
        );
        assignedCount++;
      } catch (err) {
        // Ignore conflicts
        console.warn('Assignment conflict:', err);
      }
    }
    
    // Update module status to 'active' if it was draft
    if (module.status === 'draft') {
      await query(
        `UPDATE manager_modules SET 
          status = 'active', 
          is_mandatory = $1, 
          updated_at = NOW() 
         WHERE id = $2`,
        [isMandatory || false, id]
      );
    }
    
    return reply.send({
      success: true,
      assigned: assignedCount,
      total: targetUserIds.length,
      userIds: targetUserIds,
    });
  });
  
  /**
   * DELETE /api/curator/modules/:id/assign/:assignmentId
   * Remove an assignment
   */
  app.delete('/api/curator/modules/:id/assign/:assignmentId', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requireManager(req, reply)) return;
    
    const { id, assignmentId } = (req as any).params as { id: string; assignmentId: string };
    const session = getSession(req);
    const userId = session?.userId || '00000000-0000-0000-0000-000000000001'; // Test user UUID for dev/test
    
    // Verify ownership
    const module = await single<any>(
      'SELECT id FROM manager_modules WHERE id = $1 AND created_by = $2',
      [id, userId]
    );
    
    if (!module) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Module not found or access denied',
        },
      });
    }
    
    // Delete assignment
    await query(
      'DELETE FROM module_assignments WHERE id = $1 AND module_id = $2',
      [assignmentId, id]
    );
    
    return reply.send({ success: true, message: 'Assignment removed' });
  });
  
  // ============================================================================
  // PROGRESS TRACKING
  // ============================================================================
  
  /**
   * GET /api/curator/modules/:id/progress
   * View module progress for assigned team members
   */
  app.get('/api/curator/modules/:id/progress', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requireManager(req, reply)) return;
    
    const { id } = (req as any).params as { id: string };
    const session = getSession(req);
    const userId = session?.userId || '00000000-0000-0000-0000-000000000001'; // Test user UUID for dev/test
    
    // Verify ownership
    const module = await single<any>(
      'SELECT * FROM manager_modules WHERE id = $1 AND created_by = $2',
      [id, userId]
    );
    
    if (!module) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Module not found or access denied',
        },
      });
    }
    
    // Get all assignments with user details
    const assignments = await query<any>(
      `SELECT 
        ma.*,
        u.id as user_id,
        u.email as user_email
      FROM module_assignments ma
      INNER JOIN users u ON ma.user_id = u.id
      WHERE ma.module_id = $1
      ORDER BY ma.assigned_at DESC`,
      [id]
    );
    
    // Calculate aggregate stats
    const rows = assignments.rows;
    const now = new Date();
    
    const stats = {
      assigned: rows.length,
      inProgress: rows.filter((a: any) => a.status === 'in_progress').length,
      completed: rows.filter((a: any) => a.status === 'completed').length,
      overdue: rows.filter((a: any) => 
        a.due_date && 
        new Date(a.due_date) < now &&
        a.status !== 'completed'
      ).length,
      avgMasteryScore: 0,
      avgTimeSpent: 0,
    };
    
    // Calculate averages
    const completedRows = rows.filter((a: any) => a.mastery_score !== null);
    if (completedRows.length > 0) {
      stats.avgMasteryScore = 
        completedRows.reduce((sum: number, a: any) => sum + parseFloat(a.mastery_score), 0) / 
        completedRows.length;
    }
    
    if (rows.length > 0) {
      stats.avgTimeSpent = 
        rows.reduce((sum: number, a: any) => sum + (a.time_spent_seconds || 0), 0) / 
        rows.length;
    }
    
    return reply.send({ 
      module,
      stats, 
      assignments: rows 
    });
  });
  
  /**
   * GET /api/curator/modules/:id/analytics
   * Detailed analytics for a module
   */
  app.get('/api/curator/modules/:id/analytics', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requireManager(req, reply)) return;
    
    const { id } = (req as any).params as { id: string };
    const session = getSession(req);
    const userId = session?.userId || '00000000-0000-0000-0000-000000000001'; // Test user UUID for dev/test
    
    // Verify ownership
    const module = await single<any>(
      'SELECT * FROM manager_modules WHERE id = $1 AND created_by = $2',
      [id, userId]
    );
    
    if (!module) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Module not found or access denied',
        },
      });
    }
    
    // Get progress over time (assignments per day)
    const progressOverTime = await query<any>(
      `SELECT 
        DATE(completed_at) as completion_date,
        COUNT(*) as completions
       FROM module_assignments
       WHERE module_id = $1 AND status = 'completed'
       GROUP BY DATE(completed_at)
       ORDER BY completion_date DESC
       LIMIT 30`,
      [id]
    );
    
    // Get struggling learners (low mastery or overdue)
    const strugglingLearners = await query<any>(
      `SELECT 
        ma.*,
        u.email as user_email
       FROM module_assignments ma
       INNER JOIN users u ON ma.user_id = u.id
       WHERE ma.module_id = $1 
         AND (
           (ma.mastery_score IS NOT NULL AND ma.mastery_score < 0.60) 
           OR (ma.due_date IS NOT NULL AND ma.due_date < NOW() AND ma.status != 'completed')
         )
       ORDER BY ma.mastery_score ASC NULLS LAST, ma.due_date ASC NULLS LAST`,
      [id]
    );
    
    // Get content quality metrics (from edits)
    const editMetrics = await query<any>(
      `SELECT 
        edit_type,
        COUNT(*) as edit_count
       FROM module_content_edits
       WHERE module_id = $1
       GROUP BY edit_type`,
      [id]
    );
    
    return reply.send({
      module,
      progressOverTime: progressOverTime.rows,
      strugglingLearners: strugglingLearners.rows,
      editMetrics: editMetrics.rows,
    });
  });
}

