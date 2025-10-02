#!/usr/bin/env tsx
// EPIC #55: Export SQLite data to NDJSON
// Usage: npx tsx scripts/admin.sqlite.export.ts [output-file]

import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const OUTPUT_FILE = process.argv[2] || path.join(process.cwd(), 'api', 'store', 'admin-certified-export.ndjson');

async function exportToNDJSON() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'file:../.data/admin.sqlite',
      },
    },
  });

  try {
    const lines: string[] = [];

    // Export sources
    const sources = await prisma.adminSource.findMany({
      orderBy: { createdAt: 'asc' },
    });
    for (const src of sources) {
      lines.push(
        JSON.stringify({
          type: 'source',
          data: {
            id: src.id,
            name: src.name,
            baseUrl: src.url || undefined,
            createdAt: src.createdAt.toISOString(),
          },
          ts: src.createdAt.toISOString(),
        })
      );
    }

    console.log(`Exported ${sources.length} sources`);

    // Export items
    const items = await prisma.adminItem.findMany({
      orderBy: { createdAt: 'asc' },
    });
    for (const item of items) {
      let meta: any = {};
      try {
        if (item.meta) meta = JSON.parse(item.meta);
      } catch {}

      lines.push(
        JSON.stringify({
          type: 'item',
          data: {
            id: item.id,
            sourceId: item.sourceId,
            status: item.status,
            title: item.title,
            url: item.url,
            sha256: item.sha256,
            mime: meta.mime,
            tags: meta.tags,
            provenance: meta.provenance,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
          },
          ts: item.createdAt.toISOString(),
        })
      );
    }

    console.log(`Exported ${items.length} items`);

    // Export audit events
    const events = await prisma.adminEvent.findMany({
      orderBy: { createdAt: 'asc' },
    });
    for (const evt of events) {
      let payload: any = {};
      try {
        if (evt.payload) payload = JSON.parse(evt.payload);
      } catch {}

      lines.push(
        JSON.stringify({
          type: 'audit',
          data: {
            item_id: evt.itemId,
            decision: evt.type,
            ...payload,
            at: evt.createdAt.toISOString(),
          },
          ts: evt.createdAt.toISOString(),
        })
      );
    }

    console.log(`Exported ${events.length} audit events`);

    // Write to file
    fs.writeFileSync(OUTPUT_FILE, lines.join('\n') + '\n', 'utf8');
    console.log(`✅ Export complete: ${OUTPUT_FILE}`);
    console.log(`Total lines: ${lines.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

exportToNDJSON().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});

