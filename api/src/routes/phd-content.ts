/**
 * PhD-Level Content Generation Routes
 * Pilot: Python Coding, Enterprise Architecture, Starting a Tech Business in UK
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateWithPHDEnsemble } from '../services/phd-ensemble';
import { db } from '../db';
import { 
  topics, 
  subjects, 
  contentCorpus, 
  topicCitations, 
  suggestedModules,
  phdEnsembleProvenance,
  verificationFlags
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

interface PHDPilotRequest {
  topics: Array<{
    title: string;
    subject: string;
    category?: 'python_coding' | 'enterprise_architecture' | 'tech_startup_uk';
  }>;
}

interface PHDPilotTopicRequest {
  title: string;
  subject: string;
  category?: 'python_coding' | 'enterprise_architecture' | 'tech_startup_uk';
}

export default async function phdContentRoutes(app: FastifyInstance) {
  /**
   * POST /api/content/phd-pilot
   * Generate PhD-level content for pilot topics
   */
  app.post(
    '/api/content/phd-pilot',
    async (
      req: FastifyRequest<{ Body: PHDPilotRequest }>,
      reply: FastifyReply
    ) => {
      const { topics: pilotTopics } = req.body;

      if (!pilotTopics || pilotTopics.length === 0) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'topics array is required',
          },
        });
      }

      console.log(`[PHD-Pilot] Starting batch generation for ${pilotTopics.length} topics`);

      const results = [];

      for (const pilotTopic of pilotTopics) {
        try {
          console.log(`[PHD-Pilot] Generating: ${pilotTopic.title}`);

          const result = await generatePHDTopic(
            pilotTopic.title,
            pilotTopic.subject,
            pilotTopic.category
          );

          results.push({
            title: pilotTopic.title,
            topicId: result.topicId,
            status: 'completed',
            cost: result.cost,
            wordCount: result.wordCount,
            citationCount: result.citationCount,
            verificationAccuracy: result.verificationAccuracy,
            critiques: result.critiques,
          });

          console.log(`[PHD-Pilot] ✅ Completed: ${pilotTopic.title} ($${result.cost.toFixed(2)})`);
        } catch (error: any) {
          console.error(`[PHD-Pilot] ❌ Failed: ${pilotTopic.title}`, error.message);
          results.push({
            title: pilotTopic.title,
            status: 'failed',
            error: error.message,
          });
        }
      }

      const totalCost = results
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + (r.cost || 0), 0);

      return reply.send({
        batchStatus: 'completed',
        totalTopics: pilotTopics.length,
        completedTopics: results.filter(r => r.status === 'completed').length,
        failedTopics: results.filter(r => r.status === 'failed').length,
        totalCost,
        results,
      });
    }
  );

  /**
   * POST /api/content/phd-topic
   * Generate a single PhD-level topic
   */
  app.post(
    '/api/content/phd-topic',
    async (
      req: FastifyRequest<{ Body: PHDPilotTopicRequest }>,
      reply: FastifyReply
    ) => {
      const { title, subject, category } = req.body;

      if (!title || !subject) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'title and subject are required',
          },
        });
      }

      try {
        const result = await generatePHDTopic(title, subject, category);

        return reply.send({
          topicId: result.topicId,
          title,
          subject,
          wordCount: result.wordCount,
          citationCount: result.citationCount,
          sectionCount: result.sectionCount,
          moduleCount: result.moduleCount,
          verificationAccuracy: result.verificationAccuracy,
          critiques: result.critiques,
          cost: result.cost,
          timeSeconds: result.timeSeconds,
        });
      } catch (error: any) {
        console.error('[PHD-Topic] Generation error:', error);
        return reply.status(500).send({
          error: {
            code: 'GENERATION_FAILED',
            message: error.message,
          },
        });
      }
    }
  );

  /**
   * GET /api/content/phd-topic/:topicId
   * Retrieve PhD-level topic content
   */
  app.get(
    '/api/content/phd-topic/:topicId',
    async (
      req: FastifyRequest<{ Params: { topicId: string } }>,
      reply: FastifyReply
    ) => {
      const { topicId } = req.params;

      try {
        // Get topic
        const [topic] = await db
          .select()
          .from(topics)
          .where(eq(topics.id, topicId))
          .limit(1);

        if (!topic) {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: 'Topic not found' },
          });
        }

        // Get sections
        const sections = await db
          .select()
          .from(contentCorpus)
          .where(eq(contentCorpus.topicId, topicId))
          .orderBy(contentCorpus.orderIndex);

        // Get citations
        const citations = await db
          .select()
          .from(topicCitations)
          .where(eq(topicCitations.topicId, topicId))
          .orderBy(topicCitations.citationNumber);

        // Get suggested modules
        const modules = await db
          .select()
          .from(suggestedModules)
          .where(eq(suggestedModules.topicId, topicId))
          .orderBy(suggestedModules.orderIndex);

        // Get provenance
        const [provenance] = await db
          .select()
          .from(phdEnsembleProvenance)
          .where(eq(phdEnsembleProvenance.topicId, topicId))
          .limit(1);

        // Get verification flags
        const flags = await db
          .select()
          .from(verificationFlags)
          .where(eq(verificationFlags.topicId, topicId));

        return reply.send({
          topic,
          sections,
          citations,
          suggestedModules: modules,
          provenance,
          verificationFlags: flags,
        });
      } catch (error: any) {
        console.error('[PHD-Topic] Retrieval error:', error);
        return reply.status(500).send({
          error: {
            code: 'RETRIEVAL_FAILED',
            message: error.message,
          },
        });
      }
    }
  );
}

/**
 * Generate a single PhD-level topic with full pipeline
 */
async function generatePHDTopic(
  title: string,
  subject: string,
  category?: 'python_coding' | 'enterprise_architecture' | 'tech_startup_uk'
) {
  const startTime = Date.now();

  // Generate content using PhD ensemble
  const ensembleResult = await generateWithPHDEnsemble(title, subject, category);

  // Create topic record
  const topicId = randomUUID();

  // Find or create subject
  let subjectRecord = await db
    .select()
    .from(subjects)
    .where(eq(subjects.title, subject))
    .limit(1);

  let subjectId: string;
  if (subjectRecord.length === 0) {
    const [newSubject] = await db
      .insert(subjects)
      .values({
        title: subject,
        description: `Content on ${subject}`,
        active: true,
      })
      .returning();
    subjectId = newSubject.id;
  } else {
    subjectId = subjectRecord[0].id;
  }

  // Insert topic
  await db.insert(topics).values({
    id: topicId,
    subjectId,
    title,
    description: `Comprehensive ${title} content`,
    isCertified: false,
    contentSource: 'phd-ensemble',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Insert content sections
  for (const section of ensembleResult.finalSections) {
    await db.insert(contentCorpus).values({
      topicId,
      sectionType: section.type,
      title: section.title,
      content: section.content,
      orderIndex: section.orderIndex,
      codeExamples: section.codeExamples || null,
      diagrams: section.diagrams || null,
      formulas: section.formulas || null,
      wordCount: section.content.split(/\s+/).length,
    });
  }

  // Insert citations
  for (const citation of ensembleResult.citations) {
    await db.insert(topicCitations).values({
      topicId,
      citationNumber: citation.id,
      type: citation.type,
      title: citation.title,
      authors: citation.authors || [],
      year: citation.year,
      publisher: citation.publisher,
      doi: citation.doi,
      url: citation.url,
      isbn: citation.isbn,
      isPeerReviewed: citation.isPeerReviewed || false,
      isPrimarySource: citation.isPrimarySource || false,
    });
  }

  // Insert suggested modules
  for (const module of ensembleResult.suggestedModules) {
    await db.insert(suggestedModules).values({
      topicId,
      title: module.title,
      orderIndex: module.orderIndex,
      learningObjectives: module.learningObjectives,
      keyConcepts: module.keyConcepts,
      estimatedHours: module.estimatedHours.toString(),
      prerequisites: module.prerequisites || [],
      assessmentType: module.assessmentType,
      assessmentDescription: module.assessmentDescription,
    });
  }

  // Insert provenance
  await db.insert(phdEnsembleProvenance).values({
    topicId,
    leadModel: 'gpt-5',
    critiqueModel: 'claude-opus-4',
    verifyModel: 'gpt-4o',
    leadOutputLength: ensembleResult.leadOutput.wordCount,
    critiqueScore: (
      (ensembleResult.critiqueOutput.scores.logicalCoherence +
        ensembleResult.critiqueOutput.scores.factualRigor +
        ensembleResult.critiqueOutput.scores.pedagogicalQuality +
        ensembleResult.critiqueOutput.scores.accessibility) /
      40
    ).toString(), // Average score 0-1
    verificationAccuracy: ensembleResult.verificationOutput.accuracy.toString(),
    flaggedClaims: ensembleResult.verificationFlags.length,
    totalCitations: ensembleResult.citations.length,
    verifiedCitations: ensembleResult.verificationOutput.verifiedClaims,
    leadCostUsd: ensembleResult.leadOutput.costUsd.toString(),
    critiqueCostUsd: ensembleResult.critiqueOutput.costUsd.toString(),
    verifyCostUsd: ensembleResult.verificationOutput.costUsd.toString(),
    totalCostUsd: ensembleResult.totalCost.toString(),
    leadTimeMs: ensembleResult.leadOutput.timeMs,
    critiqueTimeMs: ensembleResult.critiqueOutput.timeMs,
    verifyTimeMs: ensembleResult.verificationOutput.timeMs,
    totalTimeMs: ensembleResult.totalTime,
  });

  // Insert verification flags
  for (const flag of ensembleResult.verificationFlags) {
    await db.insert(verificationFlags).values({
      topicId,
      claimText: flag.claimText,
      issueType: flag.issueType,
      severity: flag.severity,
      recommendation: flag.recommendation,
      resolved: false,
    });
  }

  return {
    topicId,
    wordCount: ensembleResult.leadOutput.wordCount,
    citationCount: ensembleResult.citations.length,
    sectionCount: ensembleResult.finalSections.length,
    moduleCount: ensembleResult.suggestedModules.length,
    verificationAccuracy: ensembleResult.verificationOutput.accuracy,
    critiques: ensembleResult.critiqueOutput.critiques,
    cost: ensembleResult.totalCost,
    timeSeconds: (Date.now() - startTime) / 1000,
  };
}

