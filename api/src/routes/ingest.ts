import type { FastifyInstance } from 'fastify';
import { FormData } from 'undici';
import { query } from '../db';
import { randomUUID } from 'node:crypto';

const AI_URL = process.env.AI_URL || 'http://ai:8090';

// --- helper: fetch with timeout ---
async function fetchWithTimeout(url: string, opts: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 12000, ...rest } = opts;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...rest, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

function chunkText(text: string, approxSize = 1200) {
  const chunks: { idx: number; start: number; end: number; content: string }[] = [];
  let i = 0, start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + approxSize);
    const slice = text.slice(start, end + 200);
    const punctIndex = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('? '), slice.lastIndexOf('! '));
    if (punctIndex > 0 && punctIndex < approxSize + 100) end = start + punctIndex + 1;
    const content = text.slice(start, end).trim();
    chunks.push({ idx: i++, start, end, content });
    start = end;
  }
  return chunks;
}

export function registerIngest(app: FastifyInstance) {
  // Upload a file (PDF/DOCX/TXT)
  app.post('/ingest/upload', async (req, reply) => {
    try {
      const file = await (req as any).file?.();
      if (!file) return reply.code(400).send({ error: 'file missing' });
      const buf = await file.toBuffer();

      const fd = new FormData();
      const blob = new Blob([buf], { type: file.mimetype || 'application/octet-stream' });
      fd.append('file', blob, file.filename || 'upload.bin');

      const r = await fetchWithTimeout(`${AI_URL}/extract_text`, { method: 'POST', body: fd as any, timeoutMs: 12000 });
      const { text } = await r.json() as any;
      if (!text || text.trim().length === 0) return reply.code(422).send({ error: 'no_text_extracted' });

      const artefactId = randomUUID();
      await query(
        `INSERT INTO artefacts(id,type,title,source_uri,uploaded_by,created_at)
         VALUES ($1,$2,$3,$4,$5, now())`,
        [artefactId, 'doc', file.filename || 'upload', null, 'uploader-1']
      );

      for (const c of chunkText(text)) {
        await query(
          `INSERT INTO artefact_chunks(id, artefact_id, idx, content, char_start, char_end)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [randomUUID(), artefactId, c.idx, c.content, c.start, c.end]
        );
      }
      return { artefactId };
    } catch (err: any) {
      if (err?.name === 'AbortError') return reply.code(504).send({ error: 'ai_timeout' });
      app.log.error({ err }, 'upload failed');
      return reply.code(500).send({ error: 'upload_failed' });
    }
  });

  // Ingest a URL
  app.post('/ingest/url', async (req, reply) => {
    try {
      const { url } = (req as any).body || {};
      if (!url) return reply.code(400).send({ error: 'url missing' });

      const body = new URLSearchParams(); body.set('url', url);
      const r = await fetchWithTimeout(`${AI_URL}/extract_text`, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeoutMs: 12000
      });
      const { text } = await r.json() as any;
      if (!text || text.trim().length === 0) return reply.code(422).send({ error: 'no_text_extracted' });

      const artefactId = randomUUID();
      await query(
        `INSERT INTO artefacts(id,type,title,source_uri,uploaded_by,created_at)
         VALUES ($1,$2,$3,$4,$5, now())`,
        [artefactId, 'url', url, url, 'uploader-1']
      );

      for (const c of chunkText(text)) {
        await query(
          `INSERT INTO artefact_chunks(id, artefact_id, idx, content, char_start, char_end)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [randomUUID(), artefactId, c.idx, c.content, c.start, c.end]
        );
      }
      return { artefactId };
    } catch (err: any) {
      if (err?.name === 'AbortError') return reply.code(504).send({ error: 'ai_timeout' });
      app.log.error({ err }, 'url ingest failed');
      return reply.code(500).send({ error: 'url_ingest_failed' });
    }
  });

  // Auto-generate objectives + items
  app.post('/curator/auto-generate', async (req, reply) => {
    try {
      const { artefactId } = (req as any).body || {};
      if (!artefactId) return reply.code(400).send({ error: 'artefactId missing' });

      const { rows: chunks } = await query<{ id: string; content: string; idx: number }>(
        `SELECT id, content, idx FROM artefact_chunks WHERE artefact_id=$1 ORDER BY idx ASC`,
        [artefactId]
      );
      if (chunks.length === 0) return reply.code(404).send({ error: 'no_chunks' });

      const joined = chunks.map(c => c.content).join("\n\n");

      const r1 = await fetchWithTimeout(`${AI_URL}/draft/objectives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: joined, maxObjectives: 3 }),
        timeoutMs: 12000
      });
      const { objectives } = await r1.json() as any;

      const objectiveIds: string[] = [];
      for (const text of objectives) {
        const id = randomUUID();
        await query(
          `INSERT INTO objectives(id, artefact_id, text, taxonomy)
           VALUES ($1,$2,$3,$4)`,
          [id, artefactId, text, []]
        );
        objectiveIds.push(id);
      }

      const createdItemIds: string[] = [];
      for (let i = 0; i < objectiveIds.length; i++) {
        const objectiveId = objectiveIds[i];
        const ctx = chunks[Math.min(i, chunks.length-1)].content;

        const r2 = await fetchWithTimeout(`${AI_URL}/draft/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ objective: objectives[i], context: ctx, count: 3 }),
          timeoutMs: 12000
        });
        const { items } = await r2.json() as any;

        for (const it of items) {
          const id = randomUUID();
          await query(
            `INSERT INTO items(
              id, objective_id, stem, options, correct_index, explainer, source_snippet_ref,
              difficulty, variant_group_id, status, version, trust_label, trust_mapping_refs
            ) VALUES (
              $1,$2,$3,$4,$5,$6,$7,
              $8,$9,$10,$11,$12,$13
            )`,
            [
              id, objectiveId, it.stem, it.options, it.correctIndex, it.explainer, null,
              null, null, 'DRAFT', 1, 'UNLABELLED', []
            ]
          );
          createdItemIds.push(id);
        }
      }

      return { objectives: objectiveIds, items: createdItemIds };
    } catch (err: any) {
      if (err?.name === 'AbortError') return reply.code(504).send({ error: 'ai_timeout' });
      app.log.error({ err }, 'auto-generate failed');
      return reply.code(500).send({ error: 'auto_generate_failed' });
    }
  });
}
