#!/usr/bin/env tsx
// EPIC #55: Import NDJSON data into SQLite
// Usage: npx tsx scripts/admin.ndjson.import.ts

import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const NDJSON_FILE = path.join(process.cwd(), 'api', 'store', 'admin-certified.ndjson');

interface NDJSONRow {
  type: 'source' | 'item' | 'audit';
  data: any;
  ts?: string;
}

async function importFromNDJSON() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'file:../.data/admin.sqlite',
      },
    },
  });

  try {
    // Check if NDJSON file exists
    if (!fs.existsSync(NDJSON_FILE)) {
      console.log(`No NDJSON file found at ${NDJSON_FILE}`);
      return;
    }

    const content = fs.readFileSync(NDJSON_FILE, 'utf8');
    const lines = content.split('\n').filter((l) => l.trim());

    console.log(`Found ${lines.length} lines in NDJSON file`);

    const sources = new Map<string, any>();
    const items = new Map<string, any>();
    const audits: any[] = [];

    // Parse NDJSON and build indexes
    for (const line of lines) {
      try {
        const row: NDJSONRow = JSON.parse(line);
        if (row.type === 'source') {
          sources.set(row.data.id, row.data);
        } else if (row.type === 'item') {
          items.set(row.data.id, row.data);
        } else if (row.type === 'audit') {
          audits.push(row.data);
        }
      } catch (err) {
        console.warn('Skipping invalid line:', line.substring(0, 50));
      }
    }

    console.log(`Parsed: ${sources.size} sources, ${items.size} items, ${audits.length} audit events`);

    // Import sources
    let sourceCount = 0;
    for (const [id, src] of sources) {
      try {
        await prisma.adminSource.upsert({
          where: { id },
          create: {
            id,
            name: src.name || 'Unknown',
            url: src.baseUrl || src.url,
            createdAt: src.createdAt ? new Date(src.createdAt) : new Date(),
          },
          update: {
            name: src.name || 'Unknown',
            url: src.baseUrl || src.url,
          },
        });
        sourceCount++;
      } catch (err) {
        console.warn(`Failed to import source ${id}:`, err);
      }
    }

    console.log(`Imported ${sourceCount} sources`);

    // Import items
    let itemCount = 0;
    for (const [id, item] of items) {
      try {
        await prisma.adminItem.upsert({
          where: { id },
          create: {
            id,
            sourceId: item.sourceId || 'unknown',
            status: item.status || 'queued',
            title: item.title,
            url: item.url,
            sha256: item.sha256 || '',
            sizeBytes: item.sizeBytes || null,
            meta: item.mime || item.provenance || item.tags ? JSON.stringify({ mime: item.mime, provenance: item.provenance, tags: item.tags }) : null,
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
            updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
          },
          update: {
            status: item.status || 'queued',
            title: item.title,
            updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
          },
        });
        itemCount++;
      } catch (err) {
        console.warn(`Failed to import item ${id}:`, err);
      }
    }

    console.log(`Imported ${itemCount} items`);

    // Import audit events
    let auditCount = 0;
    for (const audit of audits) {
      try {
        if (!audit.item_id) continue;
        await prisma.adminEvent.create({
          data: {
            id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            itemId: audit.item_id,
            type: audit.decision || 'error',
            payload: JSON.stringify(audit),
            createdAt: audit.at ? new Date(audit.at) : new Date(),
          },
        });
        auditCount++;
      } catch (err) {
        console.warn(`Failed to import audit event:`, err);
      }
    }

    console.log(`Imported ${auditCount} audit events`);
    console.log('✅ Import complete');
  } finally {
    await prisma.$disconnect();
  }
}

importFromNDJSON().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});

