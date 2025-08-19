import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { query } from '../db';

/**
 * Helper: split long text into ~800-char chunks at sentence boundaries.
 */
function splitIntoChunks(text: string, maxLen = 800) {
  const chunks: { content: string; start: number; end: number }[] = [];
  let i = 0;
  while (i < text.length) {
    const slice = text.slice(i, i + maxLen);
    // try to cut at a sentence end near the end of the slice
    const lastPunct = Math.max(
      slice.lastIndexOf('. '),
      slice.lastIndexOf('! '),
      slice.lastIndexOf('? ')
    );
    const cut = lastPunct > maxLen * 0.6 ? lastPunct + 1 : slice.length;
    const content = slice.slice(0, cut).trim();
    const start = i;
    const end = i + cut;
    if (content) {
      chunks.push({ content, start, end });
    }
    i = end;
  }
  return chunks;
}

/**
 * This file ONLY registers routes. No app.listen, no plugin re-registers.
 * NOTE: @fastify/multipart must be registered once in src/index.ts (already done).
 */
export default async function registerIngest(app: FastifyInstance) {
  /**
   * POST /ingest/url
   * Body: { url: string }
   * Calls AI /extract_text to fetch+extract, then stores chunks in artefact_chunks.
   */
  app.post('/ingest/url', async (req, reply) => {
    try {
      const body = req.body as any;
      const url: string | undefined = body?.url;
      if (!url) {
        return reply.code(400).send({ error: 'missing_url' });
      }

      const artefactId = randomUUID();

      // Try to create a minimal artefact row (ignore if table/cols mismatch).
      try {
        await query(
          `INSERT INTO artefacts (id, type, source_uri)
           VALUES ($1, 'url', $2)`,
          [artefactId, url]
        );
      } catch (e) {
        req.log.warn({ e }, 'artefacts_insert_skipped');
      }

      const aiUrl = process.env.AI_URL || 'http://ai:8090';
      const aiRes = await fetch(`${aiUrl}/extract_text`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!aiRes.ok) {
        const t = await aiRes.text();
        req.log.error({ t }, 'ai_extract_text_failed');
        return reply.code(502).send({ error: 'ai_error' });
      }

      const data = (await aiRes.json()) as { text?: string; html?: string };
      const text = (data.text ?? '').toString().trim();
      if (!text) {
        return reply.code(422).send({ error: 'no_text_extracted' });
      }

      const parts = splitIntoChunks(text, 900);
      let idx = 0;
      for (const p of parts) {
        await query(
          `INSERT INTO artefact_chunks
           (id, artefact_id, idx, content, char_start, char_end)
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5)`,
          [artefactId, idx++, p.content, p.start, p.end]
        );
      }

      return reply.send({ artefactId, chunks: parts.length });
    } catch (err) {
      req.log.error({ err }, 'ingest_url_failed');
      return reply.code(500).send({ error: 'ingest_failed' });
    }
  });

  /**
   * POST /ingest/upload (txt only for now)
   * Multipart form-data with "file".
   * Reads small text file and stores chunks.
   */
  app.post('/ingest/upload', async (req, reply) => {
    try {
      // @fastify/multipart is registered in index.ts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mp: any = await (req as any).file();
      if (!mp) return reply.code(400).send({ error: 'no_file' });

      const filename = mp.filename as string;
      const mimetype = mp.mimetype as string;
      const buf: Buffer =
        typeof mp.toBuffer === 'function'
          ? await mp.toBuffer()
          : await new Promise<Buffer>((resolve, reject) => {
              const chunks: Buffer[] = [];
              mp.file.on('data', (c: Buffer) => chunks.push(c));
              mp.file.on('end', () => resolve(Buffer.concat(chunks)));
              mp.file.on('error', reject);
            });

      // Only support text/plain for now to keep things simple/stable
      if (mimetype !== 'text/plain') {
        return reply.code(415).send({ error: 'unsupported_type', mimetype, filename });
      }

      const text = buf.toString('utf8').trim();
      if (!text) return reply.code(422).send({ error: 'empty_text' });

      const artefactId = randomUUID();

      try {
        await query(
          `INSERT INTO artefacts (id, type, source_uri, title)
           VALUES ($1, 'upload', $2, $3)`,
          [artefactId, filename, filename]
        );
      } catch (e) {
        req.log.warn({ e }, 'artefacts_insert_skipped');
      }

      const parts = splitIntoChunks(text, 900);
      let idx = 0;
      for (const p of parts) {
        await query(
          `INSERT INTO artefact_chunks
           (id, artefact_id, idx, content, char_start, char_end)
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5)`,
          [artefactId, idx++, p.content, p.start, p.end]
        );
      }

      return reply.send({ artefactId, chunks: parts.length });
    } catch (err) {
      req.log.error({ err }, 'upload_failed');
      return reply.code(500).send({ error: 'upload_failed' });
    }
  });

  /**
   * POST /curator/auto-generate
   * Body: { artefactId: string }
   * Calls AI /generate_items then persists objectives & items.
   */
  app.post('/curator/auto-generate', async (req, reply) => {
    try {
      const body = req.body as any;
      const artefactId: string | undefined = body?.artefactId;
      if (!artefactId) {
        return reply.code(400).send({ error: 'missing_artefactId' });
      }

      const { rows: chunks } = await query<{ idx: number; content: string }>(
        'SELECT idx, content FROM artefact_chunks WHERE artefact_id = $1 ORDER BY idx ASC LIMIT 20',
        [artefactId]
      );

      if (chunks.length === 0) {
        return reply.code(400).send({ error: 'no_chunks' });
      }

      const aiUrl = process.env.AI_URL || 'http://ai:8090';
      const aiRes = await fetch(`${aiUrl}/generate_items`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chunks: chunks.map((c) => c.content),
          count_objectives: 3,
          items_per_objective: 4,
        }),
      });

      if (!aiRes.ok) {
        const t = await aiRes.text();
        (req as any).log?.error?.({ t }, 'ai_generate_items_failed');
        return reply.code(502).send({ error: 'ai_error' });
      }

      const gen = (await aiRes.json()) as {
        objectives: { text: string; taxonomy?: string[] }[];
        items: {
          objectiveIndex?: number;
          stem: string;
          options: string[];
          correctIndex?: number;
          correctIndices?: number[];
          explainer?: string;
          sourceSnippetRef?: string;
          difficulty?: number;
          variantGroupId?: string;
          trustMappingRefs?: string[];
        }[];
      };

      // Insert objectives
      const objectiveIds: string[] = [];
      for (const obj of gen.objectives) {
        const r = await query<{ id: string }>(
          `INSERT INTO objectives (id, artefact_id, text, taxonomy)
           VALUES (gen_random_uuid()::text, $1, $2, $3)
           RETURNING id`,
          [artefactId, obj.text, obj.taxonomy ?? []]
        );
        objectiveIds.push(r.rows[0].id);
      }

      // Insert items
      let itemsCreated = 0;
      for (const item of gen.items) {
        const oi = Math.max(0, Math.min(objectiveIds.length - 1, item.objectiveIndex ?? 0));
        const objectiveId = objectiveIds[oi];

        await query(
          `INSERT INTO items
            (id, objective_id, stem, options, correct_index, correct_indices, explainer,
             source_snippet_ref, difficulty, variant_group_id, status, version, trust_label, trust_mapping_refs)
           VALUES
            (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6,
             $7, $8, $9, 'DRAFT', 1, NULL, $10)`,
          [
            objectiveId,
            item.stem,
            item.options,
            item.correctIndex ?? null,
            item.correctIndices ?? [],
            item.explainer ?? '',
            item.sourceSnippetRef ?? null,
            item.difficulty ?? null,
            item.variantGroupId ?? null,
            item.trustMappingRefs ?? [],
          ]
        );
        itemsCreated++;
      }

      return reply.send({
        ok: true,
        objectivesCreated: objectiveIds.length,
        itemsCreated,
      });
    } catch (err) {
      (req as any).log?.error?.({ err }, 'auto_generate_failed');
      return reply.code(500).send({ error: 'auto_generate_failed' });
    }
  });
}