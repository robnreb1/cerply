/**
 * Admin User Management Routes
 * Manage users, roles, and organization membership
 */

import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { users, userRoles, organizations } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAdmin, getSession } from '../middleware/rbac';

export async function registerAdminUserRoutes(app: FastifyInstance) {
  /**
   * GET /api/admin/users
   * List all users in the admin's organization
   */
  app.get('/api/admin/users', async (req, reply) => {
    if (!requireAdmin(req, reply)) return;

    const session = getSession(req);
    if (!session) return;

    try {
      // Get all users in the organization
      const orgUsers = await db
        .select()
        .from(users)
        .where(eq(users.organizationId, session.organizationId));

      // Get roles for these users
      const userIds = orgUsers.map(u => u.id);
      const roles = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.organizationId, session.organizationId));

      // Combine users with their roles
      const usersWithRoles = orgUsers.map(user => {
        const userRolesList = roles.filter(r => r.userId === user.id).map(r => r.role);
        return {
          id: user.id,
          email: user.email,
          roles: userRolesList,
          createdAt: user.createdAt,
          lastSeenAt: user.lastSeenAt,
        };
      });

      return {
        ok: true,
        users: usersWithRoles,
      };
    } catch (error: any) {
      return reply.status(500).send({
        error: { code: 'USERS_FETCH_FAILED', message: error.message },
      });
    }
  });

  /**
   * GET /api/admin/users/:userId
   * Get a specific user's details
   */
  app.get('/api/admin/users/:userId', async (req, reply) => {
    if (!requireAdmin(req, reply)) return;

    const session = getSession(req);
    if (!session) return;

    const { userId } = req.params as any;

    try {
      // Get user
      const userResult = await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.organizationId, session.organizationId)))
        .limit(1);

      if (userResult.length === 0) {
        return reply.status(404).send({
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
      }

      const user = userResult[0];

      // Get user roles
      const roles = await db
        .select()
        .from(userRoles)
        .where(and(eq(userRoles.userId, userId), eq(userRoles.organizationId, session.organizationId)));

      return {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          roles: roles.map(r => r.role),
          createdAt: user.createdAt,
          lastSeenAt: user.lastSeenAt,
        },
      };
    } catch (error: any) {
      return reply.status(500).send({
        error: { code: 'USER_FETCH_FAILED', message: error.message },
      });
    }
  });

  /**
   * POST /api/admin/users
   * Create a new user in the organization
   * Body: { email: string, roles?: string[] }
   */
  app.post('/api/admin/users', async (req, reply) => {
    if (!requireAdmin(req, reply)) return;

    const session = getSession(req);
    if (!session) return;

    const body = (req.body as any) || {};
    const { email, roles: requestedRoles } = body;

    if (!email) {
      return reply.status(400).send({
        error: { code: 'MISSING_PARAMETER', message: 'Email is required' },
      });
    }

    try {
      // Check if user already exists
      const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (existing.length > 0) {
        return reply.status(409).send({
          error: { code: 'USER_EXISTS', message: 'User with this email already exists' },
        });
      }

      // Create user
      const newUsers = await db
        .insert(users)
        .values({
          email,
          organizationId: session.organizationId,
        })
        .returning();

      const newUser = newUsers[0];

      // Assign roles (default to learner if none specified)
      const rolesToAssign = Array.isArray(requestedRoles) && requestedRoles.length > 0
        ? requestedRoles
        : ['learner'];

      for (const role of rolesToAssign) {
        if (['admin', 'manager', 'learner'].includes(role)) {
          await db.insert(userRoles).values({
            userId: newUser.id,
            organizationId: session.organizationId,
            role,
            grantedBy: session.userId,
          });
        }
      }

      return {
        ok: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          roles: rolesToAssign,
        },
      };
    } catch (error: any) {
      return reply.status(500).send({
        error: { code: 'USER_CREATE_FAILED', message: error.message },
      });
    }
  });

  /**
   * POST /api/admin/users/:userId/roles
   * Assign a role to a user
   * Body: { role: 'admin' | 'manager' | 'learner' }
   */
  app.post('/api/admin/users/:userId/roles', async (req, reply) => {
    if (!requireAdmin(req, reply)) return;

    const session = getSession(req);
    if (!session) return;

    const { userId } = req.params as any;
    const body = (req.body as any) || {};
    const { role } = body;

    if (!role || !['admin', 'manager', 'learner'].includes(role)) {
      return reply.status(400).send({
        error: { code: 'INVALID_ROLE', message: 'Role must be admin, manager, or learner' },
      });
    }

    try {
      // Check if user exists in organization
      const userResult = await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.organizationId, session.organizationId)))
        .limit(1);

      if (userResult.length === 0) {
        return reply.status(404).send({
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
      }

      // Check if role already exists
      const existingRole = await db
        .select()
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, userId),
            eq(userRoles.organizationId, session.organizationId),
            eq(userRoles.role, role)
          )
        )
        .limit(1);

      if (existingRole.length > 0) {
        return {
          ok: true,
          message: 'User already has this role',
        };
      }

      // Assign role
      await db.insert(userRoles).values({
        userId,
        organizationId: session.organizationId,
        role,
        grantedBy: session.userId,
      });

      return {
        ok: true,
        message: 'Role assigned successfully',
      };
    } catch (error: any) {
      return reply.status(500).send({
        error: { code: 'ROLE_ASSIGN_FAILED', message: error.message },
      });
    }
  });

  /**
   * DELETE /api/admin/users/:userId/roles/:role
   * Remove a role from a user
   */
  app.delete('/api/admin/users/:userId/roles/:role', async (req, reply) => {
    if (!requireAdmin(req, reply)) return;

    const session = getSession(req);
    if (!session) return;

    const { userId, role } = req.params as any;

    if (!['admin', 'manager', 'learner'].includes(role)) {
      return reply.status(400).send({
        error: { code: 'INVALID_ROLE', message: 'Invalid role' },
      });
    }

    try {
      // Delete role
      await db
        .delete(userRoles)
        .where(
          and(
            eq(userRoles.userId, userId),
            eq(userRoles.organizationId, session.organizationId),
            eq(userRoles.role, role)
          )
        );

      return {
        ok: true,
        message: 'Role removed successfully',
      };
    } catch (error: any) {
      return reply.status(500).send({
        error: { code: 'ROLE_REMOVE_FAILED', message: error.message },
      });
    }
  });

  /**
   * GET /api/admin/organization
   * Get current organization details
   */
  app.get('/api/admin/organization', async (req, reply) => {
    if (!requireAdmin(req, reply)) return;

    const session = getSession(req);
    if (!session) return;

    try {
      const orgResult = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, session.organizationId))
        .limit(1);

      if (orgResult.length === 0) {
        return reply.status(404).send({
          error: { code: 'ORGANIZATION_NOT_FOUND', message: 'Organization not found' },
        });
      }

      const org = orgResult[0];

      // Get user count
      const userCount = await db
        .select()
        .from(users)
        .where(eq(users.organizationId, session.organizationId));

      return {
        ok: true,
        organization: {
          id: org.id,
          name: org.name,
          domain: org.domain,
          ssoEnabled: !!org.ssoConfig,
          userCount: userCount.length,
          createdAt: org.createdAt,
        },
      };
    } catch (error: any) {
      return reply.status(500).send({
        error: { code: 'ORGANIZATION_FETCH_FAILED', message: error.message },
      });
    }
  });
}

