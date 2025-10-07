/**
 * Event Service: Emit events to append-only NDJSON log
 * Epic 3: Team Management & Learner Assignment
 * FSD §22A: OKR Alignment (events + /api/ops/kpis)
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TeamEvent {
  type: 'team.created' | 'member.added' | 'subscription.created';
  timestamp: string;
  payload: any;
}

class EventService {
  private eventLogPath: string;
  private enabled: boolean;

  constructor() {
    // Use EVENTS_LOG_PATH or default to ./events.ndjson
    this.eventLogPath = process.env.EVENTS_LOG_PATH || path.join(process.cwd(), 'events.ndjson');
    this.enabled = process.env.EVENTS_ENABLED !== 'false'; // enabled by default
  }

  /**
   * Emit an event to the append-only NDJSON log
   */
  async emit(type: TeamEvent['type'], payload: any): Promise<void> {
    if (!this.enabled) {
      console.log(`[events] Disabled, skipping: ${type}`, payload);
      return;
    }

    const event: TeamEvent = {
      type,
      timestamp: new Date().toISOString(),
      payload,
    };

    const line = JSON.stringify(event) + '\n';

    try {
      // Append to file (create if not exists)
      await fs.promises.appendFile(this.eventLogPath, line, 'utf8');
      console.log(`[events] Emitted: ${type}`);
    } catch (error: any) {
      console.error(`[events] Failed to emit ${type}:`, error.message);
      // Don't throw - events are best-effort
    }
  }

  /**
   * Team created event
   */
  async teamCreated(params: { team_id: string; org_id: string; by: string }): Promise<void> {
    await this.emit('team.created', params);
  }

  /**
   * Member added event
   */
  async memberAdded(params: { team_id: string; user_id: string; email: string }): Promise<void> {
    await this.emit('member.added', params);
  }

  /**
   * Subscription created event
   */
  async subscriptionCreated(params: {
    team_id: string;
    track_id: string;
    cadence: string;
    start_at: string;
  }): Promise<void> {
    await this.emit('subscription.created', params);
  }

  /**
   * Read all events (for testing/replay)
   */
  async readAll(): Promise<TeamEvent[]> {
    try {
      const content = await fs.promises.readFile(this.eventLogPath, 'utf8');
      return content
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return []; // file doesn't exist yet
      }
      throw error;
    }
  }
}

export const eventService = new EventService();

