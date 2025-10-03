// Common interface for Admin Certified stores (NDJSON and Prisma)
// EPIC #55

export interface AdminSource {
  id: string;
  name: string;
  url?: string;
  createdAt: string;
}

export interface AdminItem {
  id: string;
  title?: string;
  url: string;
  tags?: string[];
  sha256: string;
  mime?: string;
  status: 'pending' | 'approved' | 'rejected' | 'error' | 'queued';
  createdAt: string;
  updatedAt: string;
  provenance?: any;
  sourceId?: string;
}

export interface AdminAuditEvent {
  request_id?: string;
  item_id: string;
  decision: string;
  at: string;
  [key: string]: any;
}

export interface ListItemsOptions {
  status?: string;
  sourceId?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface ListSourcesOptions {
  q?: string;
  page?: number;
  limit?: number;
}

export interface ListItemsResult {
  items: AdminItem[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface ListSourcesResult {
  sources: AdminSource[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface AdminCertifiedStore {
  // Sources
  createSource(data: Omit<AdminSource, 'id' | 'createdAt'>): Promise<AdminSource>;
  listSources(options?: ListSourcesOptions): Promise<ListSourcesResult>;
  getSource(id: string): Promise<AdminSource | null>;

  // Items
  createItem(data: Omit<AdminItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdminItem>;
  listItems(options?: ListItemsOptions): Promise<ListItemsResult>;
  getItem(id: string): Promise<AdminItem | null>;
  updateItemStatus(id: string, status: AdminItem['status']): Promise<AdminItem | null>;

  // Audit
  logAudit(event: AdminAuditEvent): Promise<void>;
}

