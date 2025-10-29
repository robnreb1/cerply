/**
 * Export Routes for Cerply V2
 * 
 * Implements FSD v2.0 Section 4: PDF exports
 * 
 * Routes:
 * - POST /api/v2/export/module - Export module to PDF
 * - POST /api/v2/export/dashboard/team - Export team dashboard
 * - POST /api/v2/export/dashboard/person - Export person dashboard
 * - POST /api/v2/export/dashboard/module - Export module dashboard
 * - GET /api/v2/export/download/:exportId - Download exported file
 */

import { FastifyInstance } from 'fastify'
import {
  exportModuleToPDF,
  exportTeamDashboardToPDF,
  exportPersonDashboardToPDF,
  exportModuleDashboardToPDF,
  type ExportRequest,
} from '../../services/v2/export-service'

export default async function exportRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v2/export/module
   * Export a module to PDF
   */
  fastify.post('/api/v2/export/module', async (request, reply) => {
    const { userId, organizationId, role } = request.user as any
    const { moduleId, includeProvenance, includeVersionHistory, watermark } = request.body as any

    // Check permission
    if (!['manager', 'admin', 'certifier'].includes(role)) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only managers, certifiers, and admins can export modules',
        },
      })
    }

    if (!moduleId) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required field: moduleId',
        },
      })
    }

    try {
      const exportRequest: ExportRequest = {
        userId,
        organizationId,
        userRole: role,
        exportType: 'module',
        targetId: moduleId,
        options: {
          includeProvenance,
          includeVersionHistory,
          watermark,
          format: 'pdf',
        },
      }

      const result = await exportModuleToPDF(exportRequest)

      if (!result.success) {
        return reply.code(500).send({
          error: {
            code: 'EXPORT_FAILED',
            message: result.error || 'Failed to export module',
          },
        })
      }

      return reply.send(result)
    } catch (error) {
      console.error('Module export error:', error)
      return reply.code(500).send({
        error: {
          code: 'EXPORT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to export module',
        },
      })
    }
  })

  /**
   * POST /api/v2/export/dashboard/team
   * Export team dashboard to PDF
   */
  fastify.post('/api/v2/export/dashboard/team', async (request, reply) => {
    const { userId, organizationId, role } = request.user as any
    const { watermark } = request.body as any

    // Check permission
    if (!['manager', 'admin'].includes(role)) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only managers and admins can export team dashboards',
        },
      })
    }

    try {
      const exportRequest: ExportRequest = {
        userId,
        organizationId,
        userRole: role,
        exportType: 'dashboard',
        targetId: organizationId,
        options: {
          watermark: watermark || 'Internal Use Only',
          format: 'pdf',
        },
      }

      const result = await exportTeamDashboardToPDF(exportRequest)

      if (!result.success) {
        return reply.code(500).send({
          error: {
            code: 'EXPORT_FAILED',
            message: result.error || 'Failed to export team dashboard',
          },
        })
      }

      return reply.send(result)
    } catch (error) {
      console.error('Team dashboard export error:', error)
      return reply.code(500).send({
        error: {
          code: 'EXPORT_FAILED',
          message: 'Failed to export team dashboard',
        },
      })
    }
  })

  /**
   * POST /api/v2/export/dashboard/person
   * Export person dashboard to PDF
   */
  fastify.post('/api/v2/export/dashboard/person', async (request, reply) => {
    const { userId: requestingUserId, organizationId, role } = request.user as any
    const { targetUserId, watermark } = request.body as any

    // Check permission
    if (!['manager', 'admin'].includes(role)) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only managers and admins can export person dashboards',
        },
      })
    }

    if (!targetUserId) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required field: targetUserId',
        },
      })
    }

    try {
      const exportRequest: ExportRequest = {
        userId: requestingUserId,
        organizationId,
        userRole: role,
        exportType: 'dashboard',
        targetId: targetUserId,
        options: {
          watermark: watermark || 'Internal Use Only',
          format: 'pdf',
        },
      }

      const result = await exportPersonDashboardToPDF(exportRequest)

      if (!result.success) {
        return reply.code(500).send({
          error: {
            code: 'EXPORT_FAILED',
            message: result.error || 'Failed to export person dashboard',
          },
        })
      }

      return reply.send(result)
    } catch (error) {
      console.error('Person dashboard export error:', error)
      return reply.code(500).send({
        error: {
          code: 'EXPORT_FAILED',
          message: 'Failed to export person dashboard',
        },
      })
    }
  })

  /**
   * POST /api/v2/export/dashboard/module
   * Export module dashboard to PDF
   */
  fastify.post('/api/v2/export/dashboard/module', async (request, reply) => {
    const { userId, organizationId, role } = request.user as any
    const { moduleId, watermark } = request.body as any

    // Check permission
    if (!['manager', 'admin', 'certifier'].includes(role)) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only managers, certifiers, and admins can export module dashboards',
        },
      })
    }

    if (!moduleId) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required field: moduleId',
        },
      })
    }

    try {
      const exportRequest: ExportRequest = {
        userId,
        organizationId,
        userRole: role,
        exportType: 'dashboard',
        targetId: moduleId,
        options: {
          watermark: watermark || 'Internal Use Only',
          format: 'pdf',
        },
      }

      const result = await exportModuleDashboardToPDF(exportRequest)

      if (!result.success) {
        return reply.code(500).send({
          error: {
            code: 'EXPORT_FAILED',
            message: result.error || 'Failed to export module dashboard',
          },
        })
      }

      return reply.send(result)
    } catch (error) {
      console.error('Module dashboard export error:', error)
      return reply.code(500).send({
        error: {
          code: 'EXPORT_FAILED',
          message: 'Failed to export module dashboard',
        },
      })
    }
  })

  /**
   * GET /api/v2/export/download/:exportId
   * Download an exported file
   */
  fastify.get('/api/v2/export/download/:exportId', async (request, reply) => {
    const { userId, role } = request.user as any
    const { exportId } = request.params as any

    // Check permission
    if (!['manager', 'admin', 'certifier'].includes(role)) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only managers, certifiers, and admins can download exports',
        },
      })
    }

    try {
      // TODO: In production, fetch the file from storage and stream it
      // For now, return a placeholder response
      return reply.code(501).send({
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'File download not yet implemented. Use export endpoints to generate exports.',
          details: {
            exportId,
            note: 'In production, this will stream the PDF file',
          },
        },
      })
    } catch (error) {
      console.error('Export download error:', error)
      return reply.code(500).send({
        error: {
          code: 'DOWNLOAD_FAILED',
          message: 'Failed to download export',
        },
      })
    }
  })
}

