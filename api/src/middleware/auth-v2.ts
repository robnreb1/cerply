/**
 * V2.0 Authentication Middleware
 * Extracts user context from session or JWT for V2 routes
 */

import { FastifyRequest, FastifyReply } from 'fastify'

/**
 * Middleware to load user context
 * Attaches user object to request.user
 */
export async function loadUserContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Try Bearer token (API calls, mobile)
    const authHeader = request.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      
      // For development, accept 'dev-token'
      if (token === 'dev-token') {
        request.user = {
          id: 'dev-user-123',
          email: 'dev@cerply.com',
          organizationId: 'dev-org-123',
          role: 'admin',
        }
        return
      }
      
      // TODO: Implement JWT validation here for production
    }

    // Development mode: allow through with mock user
    if (process.env.NODE_ENV === 'development' || process.env.V2_DEV_MODE === 'true') {
      request.user = {
        id: 'dev-user-123',
        email: 'dev@cerply.com',
        organizationId: 'dev-org-123',
        role: 'admin',
      }
      return
    }

    // Production: require auth
    reply.code(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    })
  } catch (error) {
    console.error('Auth middleware error:', error)
    reply.code(500).send({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
    })
  }
}

/**
 * Require specific role(s)
 */
export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      })
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: `Requires one of: ${allowedRoles.join(', ')}`,
        },
      })
    }
  }
}


