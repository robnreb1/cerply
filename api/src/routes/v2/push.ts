/**
 * Push Routes for Cerply V2
 * 
 * Implements FSD v2.0 Section 2: Push delivery
 * 
 * Routes:
 * - POST /api/v2/push/assign - Create Module assignment
 * - GET /api/v2/push/assignments - List assignments
 * - PATCH /api/v2/push/assignments/:id - Update assignment
 * - DELETE /api/v2/push/assignments/:id - Cancel assignment
 * - POST /api/v2/push/nudge - Send reminder nudge
 */

import { FastifyInstance } from 'fastify'
import {
  createModuleAssignment,
  updateModuleAssignment,
  getModuleAssignments,
  type CreateAssignmentRequest,
} from '../../services/v2/push-service'
import { sendNudgeToLearner } from '../../services/v2/delivery-engine'
import { db } from '../../db'
import { moduleAssignments, auditEvents } from '../../../drizzle/schema_v2'
import { eq, and } from 'drizzle-orm'

export default async function pushRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v2/push/assign
   * Create a new Module assignment
   */
  fastify.post('/api/v2/push/assign', async (request, reply) => {
    const { userId, organizationId } = request.user as any

    const body = request.body as CreateAssignmentRequest

    // Validate required fields
    if (!body.moduleId || !body.targetUserIds || body.targetUserIds.length === 0) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: moduleId, targetUserIds',
        },
      })
    }

    try {
      const result = await createModuleAssignment({
        ...body,
        userId,
        organizationId,
      })

      // Log assignment
      await db.insert(auditEvents).values({
        eventType: 'module_assigned',
        userId,
        metadata: {
          assignmentId: result.assignmentId,
          moduleId: body.moduleId,
          targetUserIds: body.targetUserIds,
          isMandatory: body.isMandatory,
        },
      })

      return reply.code(201).send(result)
    } catch (error) {
      console.error('Assignment creation error:', error)
      return reply.code(500).send({
        error: {
          code: 'ASSIGNMENT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create assignment',
        },
      })
    }
  })

  /**
   * GET /api/v2/push/assignments
   * List Module assignments for user or organization
   */
  fastify.get('/api/v2/push/assignments', async (request, reply) => {
    const { userId, organizationId, role } = request.user as any
    const { scope } = request.query as any // 'mine' | 'org'

    try {
      const assignments = await getModuleAssignments(organizationId, scope === 'mine' ? userId : undefined)

      return reply.send({ assignments })
    } catch (error) {
      console.error('Fetch assignments error:', error)
      return reply.code(500).send({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch assignments',
        },
      })
    }
  })

  /**
   * PATCH /api/v2/push/assignments/:id
   * Update an existing assignment
   */
  fastify.patch('/api/v2/push/assignments/:id', async (request, reply) => {
    const { userId, organizationId, role } = request.user as any
    const { id } = request.params as any
    const updates = request.body as any

    // Check permission (Manager/Admin only)
    if (role !== 'manager' && role !== 'admin') {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only managers and admins can update assignments',
        },
      })
    }

    try {
      const result = await updateModuleAssignment(id, updates, userId)

      // Log update
      await db.insert(auditEvents).values({
        eventType: 'assignment_updated',
        userId,
        metadata: {
          assignmentId: id,
          updates,
        },
      })

      return reply.send(result)
    } catch (error) {
      console.error('Assignment update error:', error)
      return reply.code(500).send({
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update assignment',
        },
      })
    }
  })

  /**
   * DELETE /api/v2/push/assignments/:id
   * Cancel an assignment
   */
  fastify.delete('/api/v2/push/assignments/:id', async (request, reply) => {
    const { userId, organizationId, role } = request.user as any
    const { id } = request.params as any

    // Check permission
    if (role !== 'manager' && role !== 'admin') {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only managers and admins can delete assignments',
        },
      })
    }

    try {
      // Soft delete - mark as cancelled
      await db
        .update(moduleAssignments)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(and(eq(moduleAssignments.id, id), eq(moduleAssignments.organizationId, organizationId)))

      // Log deletion
      await db.insert(auditEvents).values({
        eventType: 'assignment_cancelled',
        userId,
        metadata: {
          assignmentId: id,
        },
      })

      return reply.send({ success: true })
    } catch (error) {
      console.error('Assignment deletion error:', error)
      return reply.code(500).send({
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete assignment',
        },
      })
    }
  })

  /**
   * POST /api/v2/push/nudge
   * Send a reminder nudge to learner
   */
  fastify.post('/api/v2/push/nudge', async (request, reply) => {
    const { userId, organizationId, role } = request.user as any
    const { targetUserId, assignmentId, channel, channelId } = request.body as any

    // Check permission (Manager/Admin can nudge others, learners can only nudge themselves)
    if (role !== 'manager' && role !== 'admin' && targetUserId !== userId) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only nudge yourself',
        },
      })
    }

    try {
      const result = await sendNudgeToLearner(targetUserId, assignmentId, channel, channelId)

      return reply.send(result)
    } catch (error) {
      console.error('Nudge error:', error)
      return reply.code(500).send({
        error: {
          code: 'NUDGE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to send nudge',
        },
      })
    }
  })
}

