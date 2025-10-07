/**
 * Team Management Routes
 * Epic 3: Team Management & Learner Assignment
 * BRD: B3 Group Learning | FSD: §23 Team Management & Assignments v1
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, sql, isNull, or } from 'drizzle-orm';
import { db } from '../db';
import {
  teams,
  teamMembers,
  users,
  organizations,
  tracks,
  teamTrackSubscriptions,
  userRoles,
} from '../db/schema';
import { requireManager, getSession } from '../middleware/rbac';
import { eventService } from '../services/events';
import { idempotencyService } from '../services/idempotency';

export async function registerTeamRoutes(app: FastifyInstance) {
  /**
   * POST /api/teams
   * Create a new team
   * RBAC: admin or manager
   * Idempotency: X-Idempotency-Key supported
   */
  app.post('/api/teams', async (req: FastifyRequest, reply: FastifyReply) => {
    // Check RBAC
    if (!requireManager(req, reply)) return;

    const session = getSession(req);
    if (!session) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { name } = req.body as { name: string };

    if (!name || name.trim().length === 0) {
      return reply.status(400).send({
        error: { code: 'INVALID_INPUT', message: 'Team name is required' },
      });
    }

    try {
      // Check idempotency
      const idempotencyKey = (req as any).idempotencyKey;
      if (idempotencyKey) {
        const cached = idempotencyService.get(idempotencyKey);
        if (cached) {
          return reply.status(cached.statusCode).send(cached.body);
        }
      }

      // Create team
      const [team] = await db
        .insert(teams)
        .values({
          organizationId: session.organizationId,
          name: name.trim(),
          managerId: session.userId,
        })
        .returning();

      // Emit event
      await eventService.teamCreated({
        team_id: team.id,
        org_id: team.organizationId,
        by: session.userId,
      });

      const response = {
        id: team.id,
        name: team.name,
        org_id: team.organizationId,
        manager_id: team.managerId,
        created_at: team.createdAt,
      };

      // Store for idempotency
      if (idempotencyKey) {
        idempotencyService.storeResponse(req, 200, response);
      }

      return reply.status(200).send(response);
    } catch (error: any) {
      console.error('[api/teams] Create team error:', error);
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create team' },
      });
    }
  });

  /**
   * POST /api/teams/:id/members
   * Add members to a team
   * RBAC: admin or team manager
   * Accepts: application/json { emails: string[] } OR text/csv (one email per line)
   * Idempotency: Per-email (won't add duplicates)
   */
  app.post('/api/teams/:id/members', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    // Check RBAC
    if (!requireManager(req, reply)) return;

    const session = getSession(req);
    if (!session) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { id: teamId } = req.params;

    try {
      // Get team and verify access
      const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);

      if (!team) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Team not found' },
        });
      }

      // Check if user is admin or team manager
      if (session.role !== 'admin' && team.managerId !== session.userId) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'You can only manage your own teams' },
        });
      }

      // Parse emails from JSON or CSV
      let emails: string[] = [];
      const contentType = req.headers['content-type'] || '';

      if (contentType.includes('application/json')) {
        const body = req.body as { emails: string[] };
        emails = body.emails || [];
      } else if (contentType.includes('text/csv')) {
        const csvContent = req.body as string;
        emails = csvContent
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && line.includes('@'));
      } else {
        return reply.status(400).send({
          error: {
            code: 'INVALID_CONTENT_TYPE',
            message: 'Content-Type must be application/json or text/csv',
          },
        });
      }

      if (emails.length === 0) {
        return reply.status(400).send({
          error: { code: 'INVALID_INPUT', message: 'No emails provided' },
        });
      }

      const added: string[] = [];
      const skipped: string[] = [];
      const errors: Array<{ email: string; reason: string }> = [];

      for (const email of emails) {
        try {
          // Check if user exists
          let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

          // Create user if doesn't exist
          if (!user) {
            [user] = await db
              .insert(users)
              .values({
                email,
                organizationId: team.organizationId,
              })
              .returning();

            // Grant learner role by default
            await db.insert(userRoles).values({
              userId: user.id,
              organizationId: team.organizationId,
              role: 'learner',
            });

            console.log(`[api/teams] Created new user: ${email}`);
          }

          // Check if already a member
          const existing = await db
            .select()
            .from(teamMembers)
            .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id)))
            .limit(1);

          if (existing.length > 0) {
            skipped.push(email);
            continue;
          }

          // Add to team
          await db.insert(teamMembers).values({
            teamId,
            userId: user.id,
          });

          // Emit event
          await eventService.memberAdded({
            team_id: teamId,
            user_id: user.id,
            email,
          });

          added.push(email);
        } catch (error: any) {
          console.error(`[api/teams] Failed to add ${email}:`, error);
          errors.push({ email, reason: error.message });
        }
      }

      const response = { added, skipped, errors: errors.length > 0 ? errors : undefined };

      return reply.status(200).send(response);
    } catch (error: any) {
      console.error('[api/teams] Add members error:', error);
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to add members' },
      });
    }
  });

  /**
   * POST /api/teams/:id/subscriptions
   * Subscribe a team to a track
   * RBAC: admin or team manager
   */
  app.post(
    '/api/teams/:id/subscriptions',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      // Check RBAC
      if (!requireManager(req, reply)) return;

      const session = getSession(req);
      if (!session) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { id: teamId } = req.params;
      const { track_id, cadence, start_at } = req.body as {
        track_id: string;
        cadence: 'daily' | 'weekly' | 'monthly';
        start_at?: string;
      };

      if (!track_id || !cadence) {
        return reply.status(400).send({
          error: { code: 'INVALID_INPUT', message: 'track_id and cadence are required' },
        });
      }

      if (!['daily', 'weekly', 'monthly'].includes(cadence)) {
        return reply.status(400).send({
          error: { code: 'INVALID_INPUT', message: 'cadence must be daily, weekly, or monthly' },
        });
      }

      try {
        // Get team and verify access
        const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);

        if (!team) {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: 'Team not found' },
          });
        }

        if (session.role !== 'admin' && team.managerId !== session.userId) {
          return reply.status(403).send({
            error: { code: 'FORBIDDEN', message: 'You can only manage your own teams' },
          });
        }

        // Verify track exists
        const [track] = await db.select().from(tracks).where(eq(tracks.id, track_id)).limit(1);

        if (!track) {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: 'Track not found' },
          });
        }

        // Check if subscription already exists
        const existing = await db
          .select()
          .from(teamTrackSubscriptions)
          .where(and(eq(teamTrackSubscriptions.teamId, teamId), eq(teamTrackSubscriptions.trackId, track_id)))
          .limit(1);

        if (existing.length > 0) {
          return reply.status(409).send({
            error: { code: 'ALREADY_SUBSCRIBED', message: 'Team is already subscribed to this track' },
          });
        }

        // Create subscription
        const startAt = start_at ? new Date(start_at) : new Date();
        const [subscription] = await db
          .insert(teamTrackSubscriptions)
          .values({
            teamId,
            trackId: track_id,
            cadence,
            startAt,
            active: true,
          })
          .returning();

        // Compute next_due_at based on cadence
        const nextDueAt = new Date(startAt);
        if (cadence === 'daily') {
          nextDueAt.setDate(nextDueAt.getDate() + 1);
        } else if (cadence === 'weekly') {
          nextDueAt.setDate(nextDueAt.getDate() + 7);
        } else if (cadence === 'monthly') {
          nextDueAt.setMonth(nextDueAt.getMonth() + 1);
        }

        // Emit event
        await eventService.subscriptionCreated({
          team_id: teamId,
          track_id,
          cadence,
          start_at: startAt.toISOString(),
        });

        return reply.status(200).send({
          subscription_id: subscription.id,
          next_due_at: nextDueAt.toISOString(),
        });
      } catch (error: any) {
        console.error('[api/teams] Subscribe error:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to create subscription' },
        });
      }
    }
  );

  /**
   * GET /api/teams/:id/overview
   * Get team overview with metrics
   * RBAC: admin or team manager
   */
  app.get('/api/teams/:id/overview', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const startTime = Date.now();

    // Check RBAC
    if (!requireManager(req, reply)) return;

    const session = getSession(req);
    if (!session) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { id: teamId } = req.params;

    try {
      // Get team and verify access
      const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);

      if (!team) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Team not found' },
        });
      }

      if (session.role !== 'admin' && team.managerId !== session.userId) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'You can only view your own teams' },
        });
      }

      // Get members count
      const membersResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId));
      const membersCount = Number(membersResult[0]?.count || 0);

      // Get active tracks count
      const tracksResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(teamTrackSubscriptions)
        .where(and(eq(teamTrackSubscriptions.teamId, teamId), eq(teamTrackSubscriptions.active, true)));
      const activeTracks = Number(tracksResult[0]?.count || 0);

      // TODO: Implement actual metrics from M3 daily selector
      // For now, return stub values
      const dueToday = 0; // Would query /api/daily/next for each learner
      const atRisk = 0; // Would check last 10 attempts for each learner

      const latency = Date.now() - startTime;

      reply.header('x-overview-latency-ms', String(latency));

      return reply.status(200).send({
        members_count: membersCount,
        active_tracks: activeTracks,
        due_today: dueToday,
        at_risk: atRisk,
      });
    } catch (error: any) {
      console.error('[api/teams] Overview error:', error);
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get team overview' },
      });
    }
  });

  /**
   * GET /api/tracks
   * List canonical and org tracks
   * RBAC: admin or manager
   */
  app.get('/api/tracks', async (req: FastifyRequest, reply: FastifyReply) => {
    // Check RBAC
    if (!requireManager(req, reply)) return;

    const session = getSession(req);
    if (!session) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      // Get canonical tracks (org_id IS NULL) and org tracks
      const allTracks = await db
        .select()
        .from(tracks)
        .where(or(isNull(tracks.organizationId), eq(tracks.organizationId, session.organizationId)));

      const result = allTracks.map((track) => ({
        id: track.id,
        title: track.title,
        source: track.organizationId === null ? 'canon' : 'org',
        plan_ref: track.planRef,
      }));

      return reply.status(200).send(result);
    } catch (error: any) {
      console.error('[api/tracks] List tracks error:', error);
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list tracks' },
      });
    }
  });
}

