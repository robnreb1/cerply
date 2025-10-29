/**
 * V2.0 Authentication Middleware
 * Extracts user context from session or JWT for V2 routes
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { getSession, readCookie } from '../session'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

/**
 * Middleware to load user context from session
 * Attaches user object to request.user
 */
export async function loadUserContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Try session cookie first (web app)
    const sessionId = readCookie(request, 'session_id')
    
    if (sessionId) {
      const session = await getSession(sessionId)
      if (session) {
        // Load user from session (session would need to store userId)
        // For now, use a fallback mechanism
        const userId = (session as any).userId
        if (userId) {
          const userRecord = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1)
          
          if (userRecord.length > 0) {
            const user = userRecord[0]
            request.user = {
              id: user.id,
              email: user.email,
              organizationId: user.organizationId,
              role: (user as any).role || 'learner',
              name: user.displayName || undefined,
            }
            return
          }
        }
      }
    }

    // Try Bearer token (API calls, mobile)
    const authHeader = request.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      // TODO: Implement JWT validation here
      // For now, mock a user for development
      if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
        request.user = {
          id: 'dev-user-123',
          email: 'dev@cerply.com',
          organizationId: 'dev-org-123',
          role: 'admin',
          name: 'Dev User',
        }
        return
      }
    }

    // No valid auth found
    // For V2 development, allow through with a mock user if in dev mode
    if (process.env.NODE_ENV === 'development' || process.env.V2_DEV_MODE === 'true') {
      request.user = {
        id: 'dev-user-123',
        email: 'dev@cerply.com',
        organizationId: 'dev-org-123',
        role: 'admin',
        name: 'Dev User',
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

