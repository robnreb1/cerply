
import type { FastifyInstance } from 'fastify';
import { query } from '../db';
const FF = process.env.FF_CURATOR_DASHBOARD_V1 === 'true';

export function registerCurator(app: FastifyInstance) {
  if (!FF) return;
  app.get('/curator/items', async () => {
    const rows = (await query(`SELECT * FROM items ORDER BY created_at DESC LIMIT 200`)).rows;
    return { items: rows };
  });
  app.get('/curator/items/:id', async (req, reply) => {
    const { id } = req.params as any;
    const r = await query('SELECT * FROM items WHERE id=$1', [id]);
    if (!r.rows[0]) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Item not found' });
    return r.rows[0];
  });
  app.put<{ Body:any }>('/curator/items/:id', async (req) => {
    const { id } = req.params as any;
    const b = req.body || {};
    await query(`
      UPDATE items SET stem=$2, options=$3, correct_index=$4, correct_indices=$5, explainer=$6,
        source_snippet_ref=$7, difficulty=$8, variant_group_id=$9, status=$10, version=version+1,
        trust_label=$11, trust_mapping_refs=$12
      WHERE id=$1
    `,[id,b.stem,b.options,b.correctIndex,b.correctIndices,b.explainer,b.sourceSnippetRef,b.difficulty,b.variantGroupId,b.status,b.trustLabel,b.trustMappingRefs]);
    return { id, ok:true };
  });
  app.post<{ Body:{ itemId:string; reviewerId:string; status:string; notes?:string } }>('/curator/reviews', async (req) => {
    const { itemId, reviewerId, status, notes } = req.body;
    const id = 'rev-' + Math.random().toString(36).slice(2,10);
    await query('INSERT INTO reviews(id,item_id,reviewer_id,status,notes) VALUES($1,$2,$3,$4,$5)', [id, itemId, reviewerId, status, notes||null]);
    return { id };
  });
}
