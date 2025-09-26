import crypto from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { TaskPacket, OrchestratorEvent } from '../schemas/orchestrator';

export type OrchestratorBackend = 'memory' | 'redis';

export type JobRecord = {
  id: string;
  packet: TaskPacket;
  status: 'queued'|'running'|'succeeded'|'failed'|'canceled';
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
  stepsRun: number;
  canceled?: boolean;
  logs: { t: string; level: 'info'|'warn'|'error'; msg: string; data?: any }[];
};

export type EventSink = (ev: OrchestratorEvent) => void;

export class InMemoryEngine {
  private jobs = new Map<string, JobRecord>();
  private queue: string[] = [];
  private running = false;
  private listeners = new Map<string, Set<EventSink>>();

  constructor(private opts: { backend?: OrchestratorBackend } = {}) {}

  on(jobId: string, sink: EventSink) {
    if (!this.listeners.has(jobId)) this.listeners.set(jobId, new Set());
    this.listeners.get(jobId)!.add(sink);
    return () => this.listeners.get(jobId)!.delete(sink);
  }

  private emit(ev: OrchestratorEvent) {
    const sinks = this.listeners.get(ev.job_id);
    if (sinks) for (const s of sinks) try { s(ev); } catch {}
  }

  create(packet: TaskPacket): { job_id: string } {
    const id = crypto.randomUUID();
    const rec: JobRecord = { id, packet, status: 'queued', createdAt: Date.now(), stepsRun: 0, logs: [] };
    this.jobs.set(id, rec);
    this.queue.push(id);
    this.kick();
    return { job_id: id };
  }

  get(jobId: string): JobRecord | undefined { return this.jobs.get(jobId); }

  private async runJob(job: JobRecord) {
    const limits = job.packet.limits;
    const wallCutoff = job.createdAt + Number(limits.maxWallMs ?? 10_000);
    job.status = 'running';
    job.startedAt = Date.now();
    this.emit({ job_id: job.id, t: new Date().toISOString(), type: 'start' });
    job.logs.push({ t: new Date().toISOString(), level: 'info', msg: 'job.start' });

    const steps = job.packet.steps.length > 0 ? job.packet.steps : [{ type: 'dev.log', payload: { goal: job.packet.goal } } as any];
    let attempt = 0;
    for (let i = 0; i < steps.length; i++) {
      if (job.canceled) {
        job.status = 'canceled';
        job.logs.push({ t: new Date().toISOString(), level: 'warn', msg: 'job.canceled' });
        break;
      }
      if (Date.now() > wallCutoff) {
        job.status = 'failed';
        job.error = 'wall_clock_exceeded';
        job.logs.push({ t: new Date().toISOString(), level: 'error', msg: 'wall_clock_exceeded' });
        break;
      }
      if (job.stepsRun >= limits.maxSteps) {
        job.status = 'failed';
        job.error = 'step_budget_exceeded';
        job.logs.push({ t: new Date().toISOString(), level: 'error', msg: 'step_budget_exceeded' });
        break;
      }
      const step = steps[i];
      const ts = new Date().toISOString();
      this.emit({ job_id: job.id, t: ts, type: 'step.start', data: { i, step } });
      try {
        // v0: simulate work; jittered backoff on transient failure mock
        await delay(10 + Math.floor(Math.random() * 20));
        job.stepsRun++;
        this.emit({ job_id: job.id, t: new Date().toISOString(), type: 'step.ok', data: { i } });
        job.logs.push({ t: new Date().toISOString(), level: 'info', msg: 'step.ok', data: { i } });
      } catch (e: any) {
        // retry with backoff (max 2 retries)
        const maxRetries = 2;
        if (attempt < maxRetries) {
          const backoffMs = Math.min(500, 50 * Math.pow(2, attempt)) + Math.floor(Math.random() * 30);
          this.emit({ job_id: job.id, t: new Date().toISOString(), type: 'step.retry', data: { i, attempt, backoffMs } });
          attempt++;
          await delay(backoffMs);
          i--; // retry same step
          continue;
        }
        job.status = 'failed';
        job.error = String(e?.message || e || 'step_failed');
        this.emit({ job_id: job.id, t: new Date().toISOString(), type: 'step.error', data: { i, error: job.error } });
        job.logs.push({ t: new Date().toISOString(), level: 'error', msg: 'step.error', data: { i, error: job.error } });
        break;
      }
    }

    if (job.status === 'running') job.status = 'succeeded';
    job.finishedAt = Date.now();
    this.emit({ job_id: job.id, t: new Date().toISOString(), type: 'end', data: { status: job.status } });
    job.logs.push({ t: new Date().toISOString(), level: 'info', msg: 'job.end', data: { status: job.status } });
  }

  private async workerLoop() {
    if (this.running) return;
    this.running = true;
    while (this.queue.length > 0) {
      const id = this.queue.shift()!;
      const job = this.jobs.get(id);
      if (!job) continue;
      await this.runJob(job);
    }
    this.running = false;
  }

  private kick() { void this.workerLoop(); }
}

export function resolveBackend(): OrchestratorBackend {
  const v = String(process.env.ORCH_BACKEND || 'memory').toLowerCase();
  return v === 'redis' ? 'redis' : 'memory';
}


