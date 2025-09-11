// Thin repository interfaces + in-memory implementations (Group 6)

export type RepoResult<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } };

// Keep local copies of types to avoid cross-file coupling
export type RepoLearnerProfile = { userId: string; prefs?: Record<string, any>; updatedAt: string };
export type RepoPlanModule = { id: string; title: string; estMinutes: number };
export type RepoExpertModule = {
  id: string;
  title: string;
  successCriteria?: string[];
  prerequisites?: string[];
  explainers?: string[];
  pitfalls?: string[];
  citations?: string[];
  status?: 'draft' | 'approved';
};

export interface ProfileRepo {
  get(userId: string): Promise<RepoLearnerProfile>;
  update(userId: string, patch: Partial<RepoLearnerProfile>): Promise<RepoLearnerProfile>;
}

export interface PlanRepo {
  load(userId: string): Promise<RepoPlanModule[] | null>;
  store(userId: string, plan: RepoPlanModule[]): Promise<void>;
}

export interface ExpertModuleRepo {
  create(data: Omit<RepoExpertModule, 'id' | 'status'> & { status?: RepoExpertModule['status'] }): Promise<RepoExpertModule>;
  get(id: string): Promise<RepoExpertModule | null>;
  update(id: string, patch: Partial<RepoExpertModule>): Promise<RepoExpertModule | null>;
}

export interface TelemetryRepo {
  record(event: Record<string, any>): Promise<void>;
}

// ---------------------
// In-memory implementations
// ---------------------

export class InMemoryProfileRepo implements ProfileRepo {
  private store = new Map<string, RepoLearnerProfile>();
  async get(userId: string): Promise<RepoLearnerProfile> {
    return this.store.get(userId) ?? { userId, prefs: {}, updatedAt: new Date().toISOString() };
  }
  async update(userId: string, patch: Partial<RepoLearnerProfile>): Promise<RepoLearnerProfile> {
    const prev = await this.get(userId);
    const next: RepoLearnerProfile = {
      userId,
      prefs: { ...(prev.prefs ?? {}), ...(patch.prefs ?? {}) },
      updatedAt: new Date().toISOString(),
    };
    this.store.set(userId, next);
    return next;
  }
}

export class InMemoryPlanRepo implements PlanRepo {
  private plans = new Map<string, RepoPlanModule[]>();
  async load(userId: string): Promise<RepoPlanModule[] | null> {
    return this.plans.get(userId) ?? null;
  }
  async store(userId: string, plan: RepoPlanModule[]): Promise<void> {
    this.plans.set(userId, plan);
  }
}

export class InMemoryExpertModuleRepo implements ExpertModuleRepo {
  private modules = new Map<string, RepoExpertModule>();
  async create(data: Omit<RepoExpertModule, 'id' | 'status'> & { status?: RepoExpertModule['status'] }): Promise<RepoExpertModule> {
    const id = `exp-${Math.random().toString(36).slice(2, 8)}`;
    const row: RepoExpertModule = {
      id,
      title: String(data.title || 'Expert Module'),
      successCriteria: data.successCriteria || [],
      prerequisites: data.prerequisites || [],
      explainers: data.explainers || [],
      pitfalls: data.pitfalls || [],
      citations: data.citations || [],
      status: data.status ?? 'draft',
    };
    this.modules.set(id, row);
    return row;
  }
  async get(id: string): Promise<RepoExpertModule | null> {
    return this.modules.get(id) ?? null;
  }
  async update(id: string, patch: Partial<RepoExpertModule>): Promise<RepoExpertModule | null> {
    const prev = await this.get(id);
    if (!prev) return null;
    const next: RepoExpertModule = { ...prev, ...patch, id };
    this.modules.set(id, next);
    return next;
  }
}

export class InMemoryTelemetryRepo implements TelemetryRepo {
  // keep the last N events for debugging
  private buffer: Record<string, any>[] = [];
  constructor(private max: number = 1000) {}
  async record(event: Record<string, any>): Promise<void> {
    this.buffer.push({ ...event, ts: new Date().toISOString() });
    if (this.buffer.length > this.max) this.buffer.shift();
  }
}

// Singleton in-memory repos (optional export for current runtime)
export const repos = {
  profile: new InMemoryProfileRepo(),
  plan: new InMemoryPlanRepo(),
  expert: new InMemoryExpertModuleRepo(),
  telemetry: new InMemoryTelemetryRepo(),
};


