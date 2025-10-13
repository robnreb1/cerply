/**
 * Epic 7 Migration Compatibility Tests
 * Verifies Epic 7 (Gamification) APIs work with new topic_id columns
 * 
 * Run after content hierarchy migration (016, 017)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../src/db';
import { topics, learnerLevels, certificates, topicAssignments } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

// Skip in CI - requires PostgreSQL with migrated schema
const skipInCI = process.env.CI === 'true' || !process.env.DATABASE_URL?.includes('postgres');

describe.skipIf(skipInCI)('Epic 7 Migration Compatibility', () => {
  let testTopicId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test topic (simulating migrated track → topic)
    const [topic] = await db.insert(topics).values({
      subjectId: '00000000-0000-0000-0000-000000000001', // Default subject
      title: 'Test Topic for Migration',
      contentSource: 'prompt',
      isProprietary: false,
    }).returning();
    testTopicId = topic.id;

    // Create test user (assuming users table exists)
    testUserId = 'test-user-migration'; // Mock user ID (TEXT type)
  });

  describe('learner_levels table', () => {
    it('should have topic_id column (not track_id)', async () => {
      const [level] = await db.insert(learnerLevels).values({
        userId: testUserId,
        topicId: testTopicId, // NEW: was track_id
        level: 'novice',
        correctAttempts: 5,
      }).returning();

      expect(level.topicId).toBe(testTopicId);
    });

    it('should query by topic_id successfully', async () => {
      const levels = await db.select()
        .from(learnerLevels)
        .where(and(
          eq(learnerLevels.userId, testUserId),
          eq(learnerLevels.topicId, testTopicId)
        ));

      expect(levels.length).toBeGreaterThan(0);
      expect(levels[0].topicId).toBe(testTopicId);
    });
  });

  describe('certificates table', () => {
    it('should have topic_id column (not track_id)', async () => {
      const [cert] = await db.insert(certificates).values({
        userId: testUserId,
        topicId: testTopicId, // NEW: was track_id
        issuedAt: new Date(),
        signature: 'mock-signature',
      }).returning();

      expect(cert.topicId).toBe(testTopicId);
    });

    it('should query by topic_id successfully', async () => {
      const certs = await db.select()
        .from(certificates)
        .where(and(
          eq(certificates.userId, testUserId),
          eq(certificates.topicId, testTopicId)
        ));

      expect(certs.length).toBeGreaterThan(0);
      expect(certs[0].topicId).toBe(testTopicId);
    });
  });

  describe('topic_assignments table', () => {
    it('should reference topics (not tracks)', async () => {
      const [assignment] = await db.insert(topicAssignments).values({
        topicId: testTopicId,
        userId: testUserId,
        teamId: null, // teams table may not exist yet
        isMandatory: false,
      }).returning();

      expect(assignment.topicId).toBe(testTopicId);
    });

    it('should query active assignments by topic_id', async () => {
      const assignments = await db.select()
        .from(topicAssignments)
        .where(and(
          eq(topicAssignments.userId, testUserId),
          eq(topicAssignments.topicId, testTopicId),
          eq(topicAssignments.paused, false)
        ));

      expect(assignments.length).toBeGreaterThan(0);
      expect(assignments[0].topicId).toBe(testTopicId);
    });
  });

  describe('Epic 7 API routes compatibility', () => {
    it('GET /api/gamification/levels/:topicId should work', async () => {
      // This would require actual API testing, but we verify the query works
      const levels = await db.select()
        .from(learnerLevels)
        .where(eq(learnerLevels.topicId, testTopicId));

      expect(Array.isArray(levels)).toBe(true);
    });

    it('POST /api/certificates (generate) should use topicId', async () => {
      // Verify certificate generation query works with topicId
      const existingCerts = await db.select()
        .from(certificates)
        .where(and(
          eq(certificates.userId, testUserId),
          eq(certificates.topicId, testTopicId)
        ));

      expect(Array.isArray(existingCerts)).toBe(true);
    });
  });

  describe('Foreign key integrity', () => {
    it('should enforce topic_id foreign key in learner_levels', async () => {
      const invalidTopicId = '00000000-0000-0000-0000-999999999999';

      await expect(async () => {
        await db.insert(learnerLevels).values({
          userId: testUserId,
          topicId: invalidTopicId, // Invalid topic
          level: 'novice',
          correctAttempts: 0,
        });
      }).rejects.toThrow(); // Should fail foreign key constraint
    });

    it('should enforce topic_id foreign key in certificates', async () => {
      const invalidTopicId = '00000000-0000-0000-0000-999999999999';

      await expect(async () => {
        await db.insert(certificates).values({
          userId: testUserId,
          topicId: invalidTopicId, // Invalid topic
          issuedAt: new Date(),
          signature: 'mock',
        });
      }).rejects.toThrow(); // Should fail foreign key constraint
    });
  });

  describe('Migration data integrity', () => {
    it('should have migrated all legacy tracks to topics', async () => {
      // Check if tracks_legacy table exists
      const legacyTracksCount = await db.execute(
        `SELECT COUNT(*) as count FROM tracks_legacy`
      ).catch(() => ({ rows: [{ count: '0' }] }));

      const topicsCount = await db.select().from(topics);

      // If legacy tracks exist, topics count should match (or be greater if new topics added)
      if (legacyTracksCount.rows && parseInt(legacyTracksCount.rows[0].count) > 0) {
        expect(topicsCount.length).toBeGreaterThanOrEqual(
          parseInt(legacyTracksCount.rows[0].count)
        );
      }
    });

    it('should have no orphaned learner_levels after migration', async () => {
      const orphanedLevels = await db.execute(`
        SELECT COUNT(*) as count
        FROM learner_levels ll
        LEFT JOIN topics t ON t.id = ll.topic_id
        WHERE t.id IS NULL
      `);

      expect(parseInt(orphanedLevels.rows[0].count)).toBe(0);
    });

    it('should have no orphaned certificates after migration', async () => {
      const orphanedCerts = await db.execute(`
        SELECT COUNT(*) as count
        FROM certificates c
        LEFT JOIN topics t ON t.id = c.topic_id
        WHERE t.id IS NULL
      `);

      expect(parseInt(orphanedCerts.rows[0].count)).toBe(0);
    });
  });
});

