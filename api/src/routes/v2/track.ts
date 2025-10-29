/**
 * Track Routes for Cerply V2
 * 
 * Implements FSD v2.0 Section 4: Track dashboards
 * 
 * Routes:
 * - GET /api/v2/track/team - Team dashboard data
 * - GET /api/v2/track/person/:userId - Person dashboard data
 * - GET /api/v2/track/module/:moduleId - Module dashboard data
 */

import { FastifyInstance } from 'fastify'
import {
  getTeamDashboardData,
  getPersonDashboardData,
  getModuleDashboardData,
} from '../services/v2/analytics-v2'

export default async function trackRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v2/track/team
   * Get team dashboard data
   */
  fastify.get('/api/v2/track/team', async (request, reply) => {
    const { organizationId, role } = request.user as any
    const { startDate, endDate } = request.query as any

    // Check permission (Manager/Admin only)
    if (role !== 'manager' && role !== 'admin') {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only managers and admins can view team dashboards',
        },
      })
    }

    try {
      const dateRange =
        startDate && endDate
          ? {
              start: new Date(startDate),
              end: new Date(endDate),
            }
          : undefined

      const dashboard = await getTeamDashboardData(organizationId, dateRange)

      return reply.send(dashboard)
    } catch (error) {
      console.error('Team dashboard error:', error)
      return reply.code(500).send({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch team dashboard data',
        },
      })
    }
  })

  /**
   * GET /api/v2/track/person/:userId
   * Get person dashboard data
   */
  fastify.get('/api/v2/track/person/:userId', async (request, reply) => {
    const { userId: requestingUserId, organizationId, role } = request.user as any
    const { userId } = request.params as any
    const { assignmentId } = request.query as any

    // Check permission (Manager/Admin can view any user, learners can view themselves)
    if (role !== 'manager' && role !== 'admin' && userId !== requestingUserId) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only view your own dashboard',
        },
      })
    }

    try {
      const dashboard = await getPersonDashboardData(userId, assignmentId)

      return reply.send(dashboard)
    } catch (error) {
      console.error('Person dashboard error:', error)
      return reply.code(500).send({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch person dashboard data',
        },
      })
    }
  })

  /**
   * GET /api/v2/track/module/:moduleId
   * Get module dashboard data
   */
  fastify.get('/api/v2/track/module/:moduleId', async (request, reply) => {
    const { organizationId, role } = request.user as any
    const { moduleId } = request.params as any

    // Check permission (Manager/Admin/Certifier only)
    if (role !== 'manager' && role !== 'admin' && role !== 'certifier') {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only managers, certifiers, and admins can view module dashboards',
        },
      })
    }

    try {
      const dashboard = await getModuleDashboardData(moduleId, organizationId)

      return reply.send(dashboard)
    } catch (error) {
      console.error('Module dashboard error:', error)
      return reply.code(500).send({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch module dashboard data',
        },
      })
    }
  })
}

