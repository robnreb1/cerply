/**
 * V2.0 Fastify Type Extensions
 * Extends FastifyRequest to include user context for V2 routes
 */

import { FastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string
      email: string
      organizationId: string
      role: 'admin' | 'manager' | 'learner' | 'certifier' | 'consultant'
      name?: string
    }
  }
}

export {}

