import { z } from 'zod';

// Admin auth header: X-Admin-Token: <token>
export const AdminAuthHeader = z.object({
  'x-admin-token': z.string().min(8),
}).passthrough();

export const SourceCreateReq = z.object({
  name: z.string().min(1).max(120),
  baseUrl: z.string().url(),
  notes: z.string().max(2000).optional(),
});
export type SourceCreateReq = z.infer<typeof SourceCreateReq>;

export const Source = z.object({
  id: z.string(),
  name: z.string(),
  baseUrl: z.string(),
  notes: z.string().optional(),
  createdAt: z.string(),
});
export type Source = z.infer<typeof Source>;

export const ItemIngestReq = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});
export type ItemIngestReq = z.infer<typeof ItemIngestReq>;

export const ItemStatus = z.enum(['pending','approved','rejected']);

export const Item = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  tags: z.array(z.string()).optional(),
  sha256: z.string(),
  mime: z.string(),
  status: ItemStatus,
  sourceId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  provenance: z.object({
    method: z.enum(['head','range','direct']).optional(),
    bytesProbed: z.number().int().nonnegative().optional(),
    etag: z.string().optional(),
    lastModified: z.string().optional(),
  }).optional(),
});
export type Item = z.infer<typeof Item>;

export const ItemQuery = z.object({
  status: ItemStatus.optional(),
  source_id: z.string().optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
export type ItemQuery = z.infer<typeof ItemQuery>;

export const SourceQuery = z.object({
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
export type SourceQuery = z.infer<typeof SourceQuery>;

export const ApproveRejectReq = z.object({}).passthrough();

export const ApproveRejectResp = z.object({ ok: z.boolean(), id: z.string(), status: ItemStatus });
export type ApproveRejectResp = z.infer<typeof ApproveRejectResp>;

export const AdminError = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.any().optional() })
});

export const AdminSchemas = {
  AdminAuthHeader,
  SourceCreateReq,
  Source,
  SourceQuery,
  ItemIngestReq,
  Item,
  ItemQuery,
  ApproveRejectReq,
  ApproveRejectResp,
  AdminError,
};

export default AdminSchemas;


