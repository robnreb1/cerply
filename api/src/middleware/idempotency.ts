/**
 * Idempotency Middleware
 * Epic 7: Gamification Polish
 * Prevents duplicate mutations by storing and replaying responses
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { db } from '../db';
import { idempotencyKeys } from '../db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { getSession } from './rbac';

const IDEMPOTENCY_TTL_HOURS = 24;

interface StoredResponse {
  statusCode: number;
  body: any;
  headers?: Record<string, string>;
}

/**
 * Hash response body for conflict detection
 */
function hashResponse(body: any): string {
  const normalized = JSON.stringify(body);
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Get user ID from session or throw
 */
function getUserId(req: FastifyRequest): string {
  const session = getSession(req);
  if (!session) {
    throw new Error('Idempotency requires authenticated session');
  }
  return session.userId;
}

/**
 * Check for stored idempotency key and replay if found
 * Returns true if response was replayed (short-circuit)
 */
export async function checkIdempotencyKey(
  req: FastifyRequest,
  reply: FastifyReply,
  route: string
): Promise<boolean> {
  const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
  
  if (!idempotencyKey) {
    return false; // No idempotency key provided
  }

  try {
    const userId = getUserId(req);
    const now = new Date();

    // Look up existing key
    const [existing] = await db
      .select()
      .from(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.key, idempotencyKey),
          eq(idempotencyKeys.route, route),
          eq(idempotencyKeys.userId, userId),
          gte(idempotencyKeys.expiresAt, now)
        )
      )
      .limit(1);

    if (!existing) {
      return false; // Key not found, proceed with request
    }

    // Check for conflicting body (same key, different request)
    const currentBodyHash = hashResponse(req.body);
    if (currentBodyHash !== existing.responseHash) {
      // Different body with same idempotency key = conflict
      reply.status(409).send({
        error: {
          code: 'CONFLICT',
          message: 'Idempotency key conflict: different request body',
          details: {
            idempotencyKey,
            originalTimestamp: existing.createdAt,
          },
        },
      });
      return true; // Short-circuit
    }

    // Replay stored response
    reply.status(existing.statusCode);
    
    // Set stored headers
    if (existing.responseHeaders) {
      const headers = existing.responseHeaders as Record<string, string>;
      Object.entries(headers).forEach(([key, value]) => {
        reply.header(key, value);
      });
    }
    
    // Add replay indicator
    reply.header('X-Idempotency-Replay', 'true');
    reply.send(existing.responseBody);
    
    return true; // Short-circuit (replayed)
  } catch (error) {
    console.error('[idempotency] Error checking key:', error);
    // On error, proceed without idempotency protection
    return false;
  }
}

/**
 * Store response with idempotency key for future replay
 */
export async function storeIdempotencyKey(
  req: FastifyRequest,
  route: string,
  statusCode: number,
  responseBody: any,
  responseHeaders?: Record<string, string>
): Promise<void> {
  const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
  
  if (!idempotencyKey) {
    return; // No idempotency key to store
  }

  try {
    const userId = getUserId(req);
    const responseHash = hashResponse(responseBody);
    const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000);

    await db
      .insert(idempotencyKeys)
      .values({
        key: idempotencyKey,
        route,
        userId,
        statusCode,
        responseHash,
        responseBody,
        responseHeaders: responseHeaders || null,
        expiresAt,
      })
      .onConflictDoNothing(); // If another request beat us, ignore

    console.log(`[idempotency] Stored key ${idempotencyKey} for route ${route}`);
  } catch (error) {
    // Log but don't fail the request
    console.error('[idempotency] Error storing key:', error);
  }
}

/**
 * Wrapper to apply idempotency to a route handler
 */
export function withIdempotency(
  route: string,
  handler: (req: FastifyRequest, reply: FastifyReply) => Promise<any>
) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    // Check for replay
    const wasReplayed = await checkIdempotencyKey(req, reply, route);
    if (wasReplayed) {
      return reply; // Already sent
    }

    // Execute handler
    const result = await handler(req, reply);
    
    // Store for future replay (if response was successful)
    if (reply.statusCode >= 200 && reply.statusCode < 300) {
      await storeIdempotencyKey(req, route, reply.statusCode, result);
    }

    return result;
  };
}

