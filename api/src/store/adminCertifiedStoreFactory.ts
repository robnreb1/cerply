// Factory for Admin Certified Store selection (EPIC #55)
// Selects between NDJSON (default) and Prisma (SQLite) based on ADMIN_STORE env flag

import type { AdminCertifiedStore } from './adminCertifiedStore.interface';
import { NDJsonAdminCertifiedStore } from './ndjsonAdminCertifiedStore';
import { PrismaAdminCertifiedStore } from './prismaAdminCertifiedStore';

let storeInstance: AdminCertifiedStore | null = null;

export function getAdminCertifiedStore(): AdminCertifiedStore {
  if (storeInstance) return storeInstance;

  // Match the Zod transform logic from env.ts: default to 'ndjson' for undefined, empty, or invalid values
  const rawVal = process.env.ADMIN_STORE;
  const storeType = (!rawVal || (rawVal !== 'ndjson' && rawVal !== 'sqlite')) ? 'ndjson' : rawVal;

  if (storeType === 'sqlite') {
    storeInstance = new PrismaAdminCertifiedStore();
  } else {
    // Default to NDJSON
    storeInstance = new NDJsonAdminCertifiedStore();
  }

  return storeInstance;
}

// For testing: reset store instance
export function resetStoreInstance() {
  storeInstance = null;
}

