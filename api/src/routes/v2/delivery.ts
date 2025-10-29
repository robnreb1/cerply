/**
 * Delivery Routes for Cerply V2
 * 
 * Implements FSD v2.0 Section 3: Delivery engine
 * 
 * Routes:
 * - POST /api/v2/delivery/send - Deliver item to channel
 * - POST /api/v2/delivery/variation - Generate item variation
 * - GET /api/v2/delivery/status - Check delivery status
 */

import { FastifyInstance } from 'fastify'
import { deliverItemToLearner, type DeliveryRequest } from '../../services/v2/delivery-engine'
import { db } from '../../db'
import { auditEvents } from '../../../drizzle/schema_v2'
import { eq, and, sql } from 'drizzle-orm'

export default async function deliveryRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v2/delivery/send
   * Deliver a learning item to a channel
   */
  fastify.post('/api/v2/delivery/send', async (request, reply) => {
    const { userId, organizationId, role } = request.user as any
    const body = request.body as DeliveryRequest

    // Validate required fields
    if (!body.assignmentId || !body.itemId || !body.channel) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: assignmentId, itemId, channel',
        },
      })
    }

    // Check permission (Manager can deliver to others, learners to themselves)
    if (role !== 'manager' && role !== 'admin' && body.userId !== userId) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only deliver items to yourself',
        },
      })
    }

    try {
      const result = await deliverItemToLearner({
        ...body,
        userId: body.userId || userId,
        organizationId,
      })

      return reply.send(result)
    } catch (error) {
      console.error('Delivery error:', error)
      return reply.code(500).send({
        error: {
          code: 'DELIVERY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to deliver item',
        },
      })
    }
  })

  /**
   * POST /api/v2/delivery/variation
   * Generate a variation of an item
   */
  fastify.post('/api/v2/delivery/variation', async (request, reply) => {
    const { userId, organizationId } = request.user as any
    const { itemId, variation } = request.body as any

    if (!itemId) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required field: itemId',
        },
      })
    }

    try {
      // This uses the delivery engine's variation generation
      // We deliver with variation=true but don't actually send
      const result = await deliverItemToLearner({
        assignmentId: 'preview', // Preview mode
        userId,
        organizationId,
        itemId,
        channel: 'web',
        variation: variation !== false,
      })

      return reply.send(result)
    } catch (error) {
      console.error('Variation generation error:', error)
      return reply.code(500).send({
        error: {
          code: 'VARIATION_FAILED',
          message: 'Failed to generate variation',
        },
      })
    }
  })

  /**
   * GET /api/v2/delivery/status
   * Check delivery status for an assignment
   */
  fastify.get('/api/v2/delivery/status', async (request, reply) => {
    const { userId, organizationId } = request.user as any
    const { assignmentId, targetUserId } = request.query as any

    if (!assignmentId) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required query param: assignmentId',
        },
      })
    }

    try {
      // Get delivery logs for this assignment
      const deliveries = await db
        .select()
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.eventType, 'item_delivered'),
            sql`metadata->>'assignmentId' = ${assignmentId}`,
            targetUserId ? eq(auditEvents.userId, targetUserId) : sql`true`
          )
        )
        .orderBy(sql`${auditEvents.createdAt} DESC`)
        .limit(50)

      return reply.send({
        deliveries: deliveries.map((d) => ({
          deliveryId: (d.metadata as any)?.deliveryId,
          itemId: (d.metadata as any)?.itemId,
          channel: (d.metadata as any)?.channel,
          deliveredAt: d.createdAt,
        })),
      })
    } catch (error) {
      console.error('Status fetch error:', error)
      return reply.code(500).send({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch delivery status',
        },
      })
    }
  })
}

