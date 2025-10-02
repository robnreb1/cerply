// Factory for Admin Certified Store selection (EPIC #55)
// Selects between NDJSON (default) and Prisma (SQLite) based on ADMIN_STORE env flag

import type { AdminCertifiedStore } from './adminCertifiedStore.interface';
import { NDJsonAdminCertifiedStore } from './ndjsonAdminCertifiedStore';
import { PrismaAdminCertifiedStore } from './prismaAdminCertifiedStore';

let storeInstance: AdminCertifiedStore | null = null;

export function getAdminCertifiedStore(): AdminCertifiedStore {
  if (storeInstance) return storeInstance;

  const storeType = String(process.env.ADMIN_STORE || 'ndjson').toLowerCase();

  if (storeType === 'sqlite') {
    storeInstance = new PrismaAdminCertifiedStore();
  } else {
    // Default to NDJSON (includes unknown values)
    storeInstance = new NDJsonAdminCertifiedStore();
  }

  return storeInstance;
}

// For testing: reset store instance
export function resetStoreInstance() {
  storeInstance = null;
}

