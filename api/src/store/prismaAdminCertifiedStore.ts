// Prisma-backed Admin Certified Store (EPIC #55)
// SQLite via Prisma Client

import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import type {
  AdminCertifiedStore,
  AdminSource,
  AdminItem,
  AdminAuditEvent,
  ListItemsOptions,
  ListSourcesOptions,
  ListItemsResult,
  ListSourcesResult,
} from './adminCertifiedStore.interface';

export class PrismaAdminCertifiedStore implements AdminCertifiedStore {
  private prisma: PrismaClient;
  private initialized: boolean = false;

  constructor() {
    // Prisma will use the URL from schema.prisma, which points to ./.data/admin.sqlite
    // In tests, we can override via DATABASE_URL env var or let it use the default
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'test' ? [] : ['error'],
    });
  }

  private async ensureInitialized() {
    if (this.initialized) return;
    try {
      // Test connection by querying
      await this.prisma.$connect();
      this.initialized = true;
    } catch (error) {
      console.error('Prisma connection failed:', error);
      throw error;
    }
  }

  async createSource(data: Omit<AdminSource, 'id' | 'createdAt'>): Promise<AdminSource> {
    await this.ensureInitialized();
    const record = await this.prisma.adminSource.create({
      data: {
        id: makeId('src'),
        name: data.name,
        url: data.url,
      },
    });
    return {
      id: record.id,
      name: record.name,
      url: record.url || undefined,
      createdAt: record.createdAt.toISOString(),
    };
  }

  async listSources(options?: ListSourcesOptions): Promise<ListSourcesResult> {
    await this.ensureInitialized();
    const { q, page, limit } = options || {};
    const hasPage = typeof page === 'number' && page > 0;
    const take = hasPage ? Math.min(Math.max(1, limit || 20), 100) : undefined;
    const skip = hasPage && take ? (page! - 1) * take : undefined;

    const where: any = {};
    if (q) {
      // SQLite doesn't support mode: 'insensitive'; use contains only (case-sensitive)
      where.OR = [
        { name: { contains: q } },
        { url: { contains: q } },
      ];
    }

    const [records, total] = await Promise.all([
      this.prisma.adminSource.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      hasPage ? this.prisma.adminSource.count({ where }) : Promise.resolve(undefined),
    ]);

    const sources: AdminSource[] = records.map((r: any) => ({
      id: r.id,
      name: r.name,
      url: r.url || undefined,
      createdAt: r.createdAt.toISOString(),
    }));

    if (hasPage && total !== undefined) {
      return { sources, total, page: page!, limit: take! };
    }
    return { sources };
  }

  async getSource(id: string): Promise<AdminSource | null> {
    await this.ensureInitialized();
    const record = await this.prisma.adminSource.findUnique({ where: { id } });
    if (!record) return null;
    return {
      id: record.id,
      name: record.name,
      url: record.url || undefined,
      createdAt: record.createdAt.toISOString(),
    };
  }

  async createItem(data: Omit<AdminItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdminItem> {
    await this.ensureInitialized();
    const record = await this.prisma.$transaction(async (tx: any) => {
      const item = await tx.adminItem.create({
        data: {
          id: makeId('itm'),
          sourceId: data.sourceId || 'unknown',
          status: data.status || 'queued',
          title: data.title,
          url: data.url,
          sha256: data.sha256,
          sizeBytes: null,
          meta: JSON.stringify({ 
            mime: data.mime, 
            provenance: data.provenance, 
            tags: data.tags 
          }),
        },
      });

      // Log ingest event
      await tx.adminEvent.create({
        data: {
          id: makeId('evt'),
          itemId: item.id,
          type: 'ingest',
          payload: JSON.stringify({ url: data.url, sha256: data.sha256 }),
        },
      });

      return item;
    });

    return this.mapItemRecord(record);
  }

  async listItems(options?: ListItemsOptions): Promise<ListItemsResult> {
    await this.ensureInitialized();
    const { status, sourceId, q, page, limit } = options || {};
    const hasPage = typeof page === 'number' && page > 0;
    const take = hasPage ? Math.min(Math.max(1, limit || 20), 100) : undefined;
    const skip = hasPage && take ? (page! - 1) * take : undefined;

    const where: any = {};
    if (status) where.status = status;
    if (sourceId) where.sourceId = sourceId;
    if (q) {
      // SQLite doesn't support mode: 'insensitive'; use contains only (case-sensitive)
      where.OR = [
        { title: { contains: q } },
        { url: { contains: q } },
      ];
    }

    const [records, total] = await Promise.all([
      this.prisma.adminItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      hasPage ? this.prisma.adminItem.count({ where }) : Promise.resolve(undefined),
    ]);

    const items: AdminItem[] = records.map((r: any) => this.mapItemRecord(r));

    if (hasPage && total !== undefined) {
      return { items, total, page: page!, limit: take! };
    }
    return { items };
  }

  async getItem(id: string): Promise<AdminItem | null> {
    await this.ensureInitialized();
    const record = await this.prisma.adminItem.findUnique({ where: { id } });
    if (!record) return null;
    return this.mapItemRecord(record);
  }

  async updateItemStatus(id: string, status: AdminItem['status']): Promise<AdminItem | null> {
    await this.ensureInitialized();
    const record = await this.prisma.$transaction(async (tx: any) => {
      const item = await tx.adminItem.findUnique({ where: { id } });
      if (!item) return null;

      const updated = await tx.adminItem.update({
        where: { id },
        data: { status, updatedAt: new Date() },
      });

      // Log status change event
      const eventType = status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'error';
      await tx.adminEvent.create({
        data: {
          id: makeId('evt'),
          itemId: id,
          type: eventType,
          payload: JSON.stringify({ from: item.status, to: status }),
        },
      });

      return updated;
    });

    if (!record) return null;
    return this.mapItemRecord(record);
  }

  async logAudit(event: AdminAuditEvent): Promise<void> {
    await this.ensureInitialized();
    await this.prisma.adminEvent.create({
      data: {
        id: makeId('evt'),
        itemId: event.item_id,
        type: event.decision === 'approve' ? 'approve' : event.decision === 'reject' ? 'reject' : 'error',
        payload: JSON.stringify(event),
      },
    });
  }

  private mapItemRecord(r: any): AdminItem {
    let meta: any = {};
    try {
      if (r.meta) meta = JSON.parse(r.meta);
    } catch {}

    return {
      id: r.id,
      title: r.title || undefined,
      url: r.url,
      tags: meta.tags,
      sha256: r.sha256,
      mime: meta.mime,
      status: r.status as AdminItem['status'],
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      provenance: meta.provenance,
      sourceId: r.sourceId,
    };
  }

  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function sha256Hex(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

