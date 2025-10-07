/**
 * Idempotency Service
 * Stores X-Idempotency-Key to prevent duplicate operations
 * Epic 3: Team Management & Learner Assignment
 */

import { FastifyRequest, FastifyReply } from 'fastify';

interface IdempotencyRecord {
  key: string;
  response: any;
  createdAt: number;
}

class IdempotencyService {
  private store: Map<string, IdempotencyRecord> = new Map();
  private ttlMs: number = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get cached response for idempotency key
   */
  get(key: string): any | null {
    const record = this.store.get(key);
    if (!record) return null;

    // Check if expired
    if (Date.now() - record.createdAt > this.ttlMs) {
      this.store.delete(key);
      return null;
    }

    return record.response;
  }

  /**
   * Store response for idempotency key
   */
  set(key: string, response: any): void {
    this.store.set(key, {
      key,
      response,
      createdAt: Date.now(),
    });
  }

  /**
   * Middleware: Check idempotency key and return cached response if exists
   */
  middleware() {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      // Only apply to non-GET requests
      if (req.method === 'GET') {
        return;
      }

      const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
      if (!idempotencyKey) {
        // No idempotency key - proceed normally
        return;
      }

      // Check if we have a cached response
      const cached = this.get(idempotencyKey);
      if (cached) {
        console.log(`[idempotency] Returning cached response for key: ${idempotencyKey}`);
        reply.status(cached.statusCode || 200).send(cached.body);
        return;
      }

      // Store the key in the request for use in route handlers
      (req as any).idempotencyKey = idempotencyKey;
    };
  }

  /**
   * Store response for a request (call from route handler after successful operation)
   */
  storeResponse(req: FastifyRequest, statusCode: number, body: any): void {
    const idempotencyKey = (req as any).idempotencyKey;
    if (idempotencyKey) {
      this.set(idempotencyKey, { statusCode, body });
      console.log(`[idempotency] Cached response for key: ${idempotencyKey}`);
    }
  }
}

export const idempotencyService = new IdempotencyService();

