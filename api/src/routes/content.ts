/**
 * Content Generation Routes
 * Epic 6: Ensemble Content Generation
 * BRD: B-3, E-14 | FSD: §26 Ensemble Content Generation v1
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { contentGenerations, contentRefinements, contentProvenance, citations } from '../db/schema';
import { requireManager, getSession } from '../middleware/rbac';
import {
  playbackUnderstanding,
  refineUnderstanding,
  generateWithEnsemble,
} from '../services/llm-orchestrator';

const FF_ENSEMBLE_GENERATION_V1 = process.env.FF_ENSEMBLE_GENERATION_V1 === 'true';

export async function registerContentRoutes(app: FastifyInstance) {
  /**
   * GET /api/content/debug
   * Debug endpoint to check LLM configuration
   */
  app.get('/api/content/debug', async (req, reply) => {
    return reply.send({
      featureFlag: FF_ENSEMBLE_GENERATION_V1,
      models: {
        generator1: process.env.LLM_GENERATOR_1 || 'gpt-4o (default)',
        generator2: process.env.LLM_GENERATOR_2 || 'claude-3-5-sonnet-20241022 (default)',
        factChecker: process.env.LLM_FACT_CHECKER || 'gemini-1.5-pro-latest (default)',
      },
      apiKeys: {
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        google: !!process.env.GOOGLE_API_KEY,
      },
    });
  });

  /**
   * POST /api/content/understand
   * Submit artefact and get understanding playback
   * RBAC: Manager/admin only
   * Feature Flag: FF_ENSEMBLE_GENERATION_V1
   */
  app.post(
    '/api/content/understand',
    async (
      req: FastifyRequest<{ Body: { artefact: string; artefactType?: string } }>,
      reply: FastifyReply
    ) => {
      if (!FF_ENSEMBLE_GENERATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const session = getSession(req) || {
        userId: '00000000-0000-0000-0000-000000000002',
        organizationId: '00000000-0000-0000-0000-000000000001',
        role: 'admin',
      };
      const { artefact, artefactType = 'text' } = req.body;

      if (!artefact || artefact.length > 50000) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Artefact required (max 50k chars)',
            details: { maxLength: 50000, provided: artefact?.length }
          }
        });
      }

      try {
        // Call LLM for understanding WITH GRANULARITY DETECTION
        const result = await playbackUnderstanding(artefact);
        const inputType = result.inputType || 'source';
        const granularity = result.granularity || 'topic'; // THE KILLER FEATURE

        // Create generation record
        const [generation] = await db
          .insert(contentGenerations)
          .values({
            organizationId: session.organizationId,
            managerId: session.userId,
            artefactText: artefact,
            understanding: result.content,
            inputType: inputType,
            granularity: granularity, // Store detected granularity
            status: 'understanding',
            totalCostUsd: result.costUsd.toString(),
            totalTokens: result.tokens,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning({ id: contentGenerations.id });

        return reply.send({
          generationId: generation.id,
          understanding: result.content,
          inputType: inputType,
          granularity: granularity, // Return detected granularity
          granularityMetadata: {
            expected: granularity === 'subject' ? '8-12 topics' :
                     granularity === 'module' ? '1 deep module' :
                     '4-6 modules',
            reasoning: granularity === 'subject' ? 'Broad domain-level request' :
                      granularity === 'module' ? 'Specific framework/tool/method' :
                      'Focused skill/concept'
          },
          status: 'understanding',
          cost: result.costUsd,
          tokens: result.tokens
        });
      } catch (error: any) {
        console.error('Understanding error:', error);
        return reply.status(503).send({
          error: {
            code: 'LLM_UNAVAILABLE',
            message: error.message
          }
        });
      }
    }
  );

  /**
   * POST /api/content/refine
   * Refine understanding based on manager feedback
   * RBAC: Manager/admin only
   * Feature Flag: FF_ENSEMBLE_GENERATION_V1
   */
  app.post(
    '/api/content/refine',
    async (
      req: FastifyRequest<{ Body: { generationId: string; feedback: string } }>,
      reply: FastifyReply
    ) => {
      if (!FF_ENSEMBLE_GENERATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const session = getSession(req) || {
        userId: '00000000-0000-0000-0000-000000000002',
        organizationId: '00000000-0000-0000-0000-000000000001',
        role: 'admin',
      };
      const { generationId, feedback } = req.body;

      // Get generation
      const [generation] = await db
        .select()
        .from(contentGenerations)
        .where(eq(contentGenerations.id, generationId))
        .limit(1);

      if (!generation) {
        return reply.status(404).send({
          error: { code: 'GENERATION_NOT_FOUND', message: 'Generation not found' }
        });
      }

      // Check ownership
      if (generation.managerId !== session.userId && session.role !== 'admin') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Not your generation' }
        });
      }

      // Check tenant isolation
      if (generation.organizationId !== session.organizationId) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Generation belongs to different organization' }
        });
      }

      // Check max refinements
      if ((generation.refinementIterations || 0) >= 3) {
        return reply.status(400).send({
          error: {
            code: 'MAX_REFINEMENTS_REACHED',
            message: 'Maximum 3 refinement iterations allowed'
          }
        });
      }

      try {
        // Refine understanding
        const result = await refineUnderstanding(
          generation.artefactText,
          generation.understanding!,
          feedback
        );

        // Store refinement
        await db.insert(contentRefinements).values({
          generationId,
          iteration: (generation.refinementIterations || 0) + 1,
          managerFeedback: feedback,
          llmResponse: result.content,
          createdAt: new Date(),
        });

        // Update generation
        await db
          .update(contentGenerations)
          .set({
            understanding: result.content,
            refinementIterations: (generation.refinementIterations || 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(contentGenerations.id, generationId));

        return reply.send({
          generationId,
          understanding: result.content,
          iteration: (generation.refinementIterations || 0) + 1,
          maxIterations: 3,
          status: 'understanding'
        });
      } catch (error: any) {
        return reply.status(503).send({
          error: { code: 'LLM_UNAVAILABLE', message: error.message }
        });
      }
    }
  );

  /**
   * POST /api/content/generate
   * Trigger 3-LLM ensemble generation (async)
   * RBAC: Manager/admin only
   * Feature Flag: FF_ENSEMBLE_GENERATION_V1
   */
  app.post(
    '/api/content/generate',
    async (
      req: FastifyRequest<{ Body: { generationId: string; contentType: string } }>,
      reply: FastifyReply
    ) => {
      if (!FF_ENSEMBLE_GENERATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const session = getSession(req) || {
        userId: '00000000-0000-0000-0000-000000000002',
        organizationId: '00000000-0000-0000-0000-000000000001',
        role: 'admin',
      };
      const { generationId, contentType } = req.body;

      // Get generation
      const [generation] = await db
        .select()
        .from(contentGenerations)
        .where(eq(contentGenerations.id, generationId))
        .limit(1);

      if (!generation || !generation.understanding) {
        return reply.status(400).send({
          error: {
            code: 'UNDERSTANDING_NOT_APPROVED',
            message: 'Must approve understanding before generating'
          }
        });
      }

      // Check ownership
      if (generation.managerId !== session.userId && session.role !== 'admin') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Not your generation' }
        });
      }

      // Check tenant isolation
      if (generation.organizationId !== session.organizationId) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Generation belongs to different organization' }
        });
      }

      // Update status
      await db
        .update(contentGenerations)
        .set({ status: 'generating', contentType, updatedAt: new Date() })
        .where(eq(contentGenerations.id, generationId));

      // Start async generation (in background) WITH GRANULARITY
      const inputType = (generation.inputType || 'source') as 'source' | 'topic';
      const granularity = generation.granularity as 'subject' | 'topic' | 'module' | undefined;
      generateEnsembleAsync(generationId, generation.understanding, generation.artefactText, inputType, granularity);

      return reply.status(202).send({
        generationId,
        status: 'generating',
        estimatedTimeSeconds: 45,
        pollUrl: `/api/content/generations/${generationId}`
      });
    }
  );

  /**
   * GET /api/content/generations/:id
   * Poll generation status and results
   * RBAC: Manager/admin only
   * Feature Flag: FF_ENSEMBLE_GENERATION_V1
   */
  app.get(
    '/api/content/generations/:id',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!FF_ENSEMBLE_GENERATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const session = getSession(req) || {
        userId: '00000000-0000-0000-0000-000000000002',
        organizationId: '00000000-0000-0000-0000-000000000001',
        role: 'admin',
      };
      const { id } = req.params;

      const [generation] = await db
        .select()
        .from(contentGenerations)
        .where(eq(contentGenerations.id, id))
        .limit(1);

      if (!generation) {
        return reply.status(404).send({
          error: { code: 'GENERATION_NOT_FOUND', message: 'Not found' }
        });
      }

      // Check ownership
      if (generation.managerId !== session.userId && session.role !== 'admin') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Not your generation' }
        });
      }

      // Check tenant isolation
      if (generation.organizationId !== session.organizationId) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Generation belongs to different organization' }
        });
      }

      // Fetch citations if research mode
      const generationCitations = await db
        .select()
        .from(citations)
        .where(eq(citations.generationId, id));

      return reply.send({
        id: generation.id,
        status: generation.status,
        progress: generation.status === 'completed' ? 100 : generation.status === 'generating' ? 50 : 0,
        modules: generation.factCheckerOutput ? (generation.factCheckerOutput as any).modules : [],
        provenance: generation.factCheckerOutput ? (generation.factCheckerOutput as any).provenance : [],
        citations: generationCitations,
        inputType: generation.inputType,
        totalCost: parseFloat(generation.totalCostUsd || '0'),
        totalTokens: generation.totalTokens,
        generationTimeMs: generation.generationTimeMs
      });
    }
  );

  /**
   * PATCH /api/content/generations/:id
   * Edit or approve generated content
   * RBAC: Manager/admin only
   * Feature Flag: FF_ENSEMBLE_GENERATION_V1
   */
  app.patch(
    '/api/content/generations/:id',
    async (
      req: FastifyRequest<{ Params: { id: string }; Body: { modules?: any[]; approved?: boolean } }>,
      reply: FastifyReply
    ) => {
      if (!FF_ENSEMBLE_GENERATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const session = getSession(req) || {
        userId: '00000000-0000-0000-0000-000000000002',
        organizationId: '00000000-0000-0000-0000-000000000001',
        role: 'admin',
      };
      const { id } = req.params;
      const { modules, approved } = req.body;

      const [generation] = await db
        .select()
        .from(contentGenerations)
        .where(eq(contentGenerations.id, id))
        .limit(1);

      if (!generation) {
        return reply.status(404).send({
          error: { code: 'GENERATION_NOT_FOUND', message: 'Not found' }
        });
      }

      // Check ownership
      if (generation.managerId !== session.userId && session.role !== 'admin') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Not your generation' }
        });
      }

      // Check tenant isolation
      if (generation.organizationId !== session.organizationId) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Generation belongs to different organization' }
        });
      }

      // Update modules if provided
      if (modules) {
        const currentOutput = generation.factCheckerOutput as any;
        await db
          .update(contentGenerations)
          .set({
            factCheckerOutput: { ...currentOutput, modules } as any,
            updatedAt: new Date(),
          })
          .where(eq(contentGenerations.id, id));
      }

      // Approve if requested
      if (approved) {
        await db
          .update(contentGenerations)
          .set({
            status: 'approved',
            updatedAt: new Date(),
          })
          .where(eq(contentGenerations.id, id));
      }

      return reply.send({
        generationId: id,
        status: approved ? 'approved' : generation.status,
        publishedAt: approved ? new Date().toISOString() : null
      });
    }
  );

  /**
   * POST /api/content/regenerate/:id
   * Regenerate a specific module
   * RBAC: Manager/admin only
   * Feature Flag: FF_ENSEMBLE_GENERATION_V1
   */
  app.post(
    '/api/content/regenerate/:id',
    async (
      req: FastifyRequest<{ Params: { id: string }; Body: { moduleId: string; instruction: string } }>,
      reply: FastifyReply
    ) => {
      if (!FF_ENSEMBLE_GENERATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const { id } = req.params;
      const { moduleId, instruction } = req.body;

      // For MVP, just return a placeholder
      // In production, this would trigger a new generation job
      return reply.status(202).send({
        generationId: id,
        status: 'generating',
        moduleId
      });
    }
  );
}

/**
 * Background async generation
 * In production, use a proper job queue (Bull, BullMQ, etc.)
 */
async function generateEnsembleAsync(
  generationId: string,
  understanding: string,
  artefact: string,
  inputType: 'source' | 'topic' = 'source',
  granularity?: 'subject' | 'topic' | 'module'
) {
  try {
    const result = await generateWithEnsemble(understanding, artefact, inputType, granularity);

    // Store results
    await db
      .update(contentGenerations)
      .set({
        status: 'completed',
        generatorAOutput: result.generatorA as any,
        generatorBOutput: result.generatorB as any,
        factCheckerOutput: {
          modules: result.finalModules,
          provenance: result.provenance
        } as any,
        totalCostUsd: result.totalCost.toString(),
        totalTokens: result.totalTokens,
        generationTimeMs: result.totalTime,
        updatedAt: new Date(),
      })
      .where(eq(contentGenerations.id, generationId));

    // Store provenance records
    for (const prov of result.provenance) {
      // Handle multiple provenance formats
      if (prov.moduleId) {
        if (prov.section && prov.source && prov.model) {
          // Format 1: Old source mode {moduleId, section, source, model}
          await db.insert(contentProvenance).values({
            generationId,
            moduleId: prov.moduleId,
            sectionType: prov.section,
            sourceLlm: prov.source,
            sourceModel: prov.model,
            confidenceScore: prov.confidence?.toString(),
            selectedBy: 'fact-checker',
            createdAt: new Date(),
          });
        } else if (prov.generatorSource) {
          // Format 2: Research mode {moduleId, generatorSource: ["A.module-1", "B.module-1"]}
          const sources = Array.isArray(prov.generatorSource) ? prov.generatorSource.join(', ') : prov.generatorSource;
          await db.insert(contentProvenance).values({
            generationId,
            moduleId: prov.moduleId,
            sectionType: 'module',
            sourceLlm: 'ensemble',
            sourceModel: sources,
            confidenceScore: null,
            selectedBy: 'fact-checker',
            createdAt: new Date(),
          });
        }
      } else if (prov.newIds && prov.originalId) {
        // Format 3: Alternate research mode {newIds: [...], originalId: "..."}
        for (const newId of prov.newIds) {
          await db.insert(contentProvenance).values({
            generationId,
            moduleId: newId,
            sectionType: 'module',
            sourceLlm: 'ensemble',
            sourceModel: prov.originalId,
            confidenceScore: null,
            selectedBy: 'fact-checker',
            createdAt: new Date(),
          });
        }
      }
    }

    // Store citations if research mode
    if (inputType === 'topic' && result.finalModules) {
      console.log('[CITATIONS] Research mode detected, checking for citations...');
      console.log('[CITATIONS] Module count:', result.finalModules.length);
      for (const module of result.finalModules) {
        // Extract citations from module content (handle both 'citations' and 'sources' fields)
        const moduleCitations = (module as any).citations || (module as any).sources;
        console.log('[CITATIONS] Module', (module as any).id, 'has citations?', !!moduleCitations, 'type:', typeof moduleCitations);
        if (moduleCitations && Array.isArray(moduleCitations)) {
          console.log('[CITATIONS] Found', moduleCitations.length, 'citations in module', (module as any).id);
          for (const citation of moduleCitations) {
            // Handle both object and string citation formats
            const citationText = typeof citation === 'string' ? citation : (citation.text || citation.title || '');
            const title = typeof citation === 'string' ? citation : citation.title;
            const author = typeof citation === 'string' ? null : citation.author;
            const sourceType = typeof citation === 'string' ? 'reference' : (citation.type || citation.sourceType);
            
            await db.insert(citations).values({
              generationId,
              citationText: citationText,
              title: title,
              author: author,
              sourceType: sourceType,
              url: typeof citation === 'string' ? null : citation.url,
              relevance: typeof citation === 'string' ? null : citation.relevance,
              validationStatus: typeof citation === 'string' ? 'unverified' : (citation.validationStatus || citation.status),
              confidenceScore: typeof citation === 'string' ? null : citation.confidence?.toString(),
              createdAt: new Date(),
            });
            console.log('[CITATIONS] Inserted citation:', citationText.substring(0, 50));
          }
        }
      }
      console.log('[CITATIONS] Citation extraction complete');
    }
  } catch (error: any) {
    console.error('Generation error:', error.message || error);
    if (error.stack) console.error('Stack:', error.stack);
    await db
      .update(contentGenerations)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(contentGenerations.id, generationId));
  }
}

