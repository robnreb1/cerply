/**
 * RBAC Middleware
 * Role-based access control for API routes
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { readSSOSession } from '../routes/sso';

export type Role = 'admin' | 'manager' | 'learner';

/**
 * Require authentication
 * Returns 401 if no valid session
 */
export function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const session = readSSOSession(req);

  if (!session) {
    reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return false;
  }

  // Attach session to request for use in route handlers
  (req as any).session = session;
  return true;
}

/**
 * Require specific role
 * Returns 403 if user doesn't have required role
 */
export function requireRole(...allowedRoles: Role[]) {
  return function (req: FastifyRequest, reply: FastifyReply): boolean {
    const session = readSSOSession(req);

    if (!session) {
      reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return false;
    }

    if (!allowedRoles.includes(session.role as Role)) {
      reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
          details: { required: allowedRoles, current: session.role },
        },
      });
      return false;
    }

    // Attach session to request
    (req as any).session = session;
    return true;
  };
}

/**
 * Require admin role
 * Also accepts requests authenticated via ADMIN_TOKEN (security.admin plugin)
 */
export function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  // Check if already authenticated by security.admin plugin (via ADMIN_TOKEN)
  const adminToken = process.env.ADMIN_TOKEN?.trim();
  if (adminToken) {
    const authHeader = req.headers.authorization as string | undefined;
    const xAdminToken = req.headers['x-admin-token'] as string | undefined;
    
    // Check Authorization: Bearer <token>
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token === adminToken) {
        // Authenticated via admin token - allow access
        return true;
      }
    }
    
    // Check x-admin-token header
    if (xAdminToken?.trim() === adminToken) {
      // Authenticated via admin token - allow access
      return true;
    }
  }
  
  // Otherwise, check for admin role via SSO session
  return requireRole('admin')(req, reply);
}

/**
 * Require manager or admin role
 * Also accepts requests authenticated via ADMIN_TOKEN
 */
export function requireManager(req: FastifyRequest, reply: FastifyReply) {
  // Check if already authenticated by admin token
  const adminToken = process.env.ADMIN_TOKEN?.trim();
  if (adminToken) {
    const authHeader = req.headers.authorization as string | undefined;
    const xAdminToken = req.headers['x-admin-token'] as string | undefined;
    
    // Check Authorization: Bearer <token>
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token === adminToken) {
        return true;
      }
    }
    
    // Check x-admin-token header
    if (xAdminToken?.trim() === adminToken) {
      return true;
    }
  }
  
  // Otherwise, check for manager/admin role via SSO session
  return requireRole('admin', 'manager')(req, reply);
}

/**
 * Require any authenticated user (admin, manager, or learner)
 * Also accepts requests authenticated via ADMIN_TOKEN
 */
export function requireAnyRole(req: FastifyRequest, reply: FastifyReply) {
  // Check if already authenticated by admin token
  const adminToken = process.env.ADMIN_TOKEN?.trim();
  if (adminToken) {
    const authHeader = req.headers.authorization as string | undefined;
    const xAdminToken = req.headers['x-admin-token'] as string | undefined;
    
    // Check Authorization: Bearer <token>
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token === adminToken) {
        return true;
      }
    }
    
    // Check x-admin-token header
    if (xAdminToken?.trim() === adminToken) {
      return true;
    }
  }
  
  // Otherwise, check for any role via SSO session
  return requireRole('admin', 'manager', 'learner')(req, reply);
}

/**
 * Check if current user has role
 */
export function hasRole(req: FastifyRequest, role: Role): boolean {
  const session = readSSOSession(req);
  return session?.role === role;
}

/**
 * Get current user session from request
 */
export function getSession(req: FastifyRequest) {
  return readSSOSession(req);
}

