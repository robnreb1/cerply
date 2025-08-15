import type { FastifyInstance } from 'fastify';
import { query } from '../db';

type ItemInput = Partial<{
  stem: string;
  options: string[];
  correctIndex: number;
  correctIndices: number[];
  explainer: string;
  sourceSnippetRef: string;
  difficulty: number;
  variantGroupId: string;
  status: string;
  trustLabel: string;
  trustMappingRefs: string[];
}>;

export function registerCurator(app: FastifyInstance) {
  // GET one item
  app.get('/curator/items/:id', async (req, reply) => {
    const { id } = (req as any).params as { id: string };
    const res = await query<any>('SELECT * FROM items WHERE id=$1', [id]);
    if (!res.rows.length) return reply.code(404).send({ code: 'NOT_FOUND' });
    return res.rows[0];
  });

  // PUT update item (partial)
  app.put('/curator/items/:id', async (req) => {
    const { id } = (req as any).params as { id: string };
    const body = (req as any).body as ItemInput;

    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;
    for (const [k, v] of Object.entries(body)) {
      if (v === undefined) continue;
      sets.push(`${k} = $${i++}`);
      values.push(v);
    }
    if (!sets.length) return { id }; // nothing to update

    values.push(id);
    const sql = `UPDATE items SET ${sets.join(', ')}, version = version + 1 WHERE id = $${i} RETURNING *`;
    const updated = await query<any>(sql, values);
    return updated.rows[0];
  });
}
