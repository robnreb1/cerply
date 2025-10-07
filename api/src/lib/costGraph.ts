/**
 * Cost Graph Telemetry - Track Fresh vs Reuse
 * 
 * Cost-aware via reuse, not via low-quality generation.
 * Tracks model usage, tokens, and estimated costs.
 */

export type CostInvocation = {
  route: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_est: number;
  reused: boolean;
  canon_key?: string;
  timestamp: string;
};

export type CostAggregates = {
  route: string;
  fresh_count: number;
  reuse_count: number;
  total_invocations: number;
  fresh_cost: number;
  reuse_cost: number;
  total_cost: number;
  reuse_savings: number;
  avg_cost_per_call: number;
};

class CostGraph {
  private invocations: CostInvocation[] = [];
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.COST_GRAPH_ENABLED === 'true';
  }

  trackInvocation(inv: Omit<CostInvocation, 'timestamp'>) {
    if (!this.enabled) return;

    this.invocations.push({
      ...inv,
      timestamp: new Date().toISOString(),
    });

    // Keep only today's data (rolling window)
    const today = new Date().toISOString().split('T')[0];
    this.invocations = this.invocations.filter(i => i.timestamp.startsWith(today));
  }

  queryToday(): CostAggregates[] {
    if (!this.enabled) return [];

    const today = new Date().toISOString().split('T')[0];
    const todayInvs = this.invocations.filter(i => i.timestamp.startsWith(today));

    // Group by route
    const byRoute = new Map<string, CostInvocation[]>();
    for (const inv of todayInvs) {
      const existing = byRoute.get(inv.route) || [];
      existing.push(inv);
      byRoute.set(inv.route, existing);
    }

    const aggregates: CostAggregates[] = [];
    for (const [route, invs] of byRoute) {
      const fresh = invs.filter(i => !i.reused);
      const reuse = invs.filter(i => i.reused);

      const fresh_cost = fresh.reduce((sum, i) => sum + i.cost_est, 0);
      const reuse_cost = reuse.reduce((sum, i) => sum + i.cost_est, 0);
      const total_cost = fresh_cost + reuse_cost;

      aggregates.push({
        route,
        fresh_count: fresh.length,
        reuse_count: reuse.length,
        total_invocations: invs.length,
        fresh_cost,
        reuse_cost,
        total_cost,
        reuse_savings: fresh.length > 0 ? (fresh_cost / fresh.length) * reuse.length - reuse_cost : 0,
        avg_cost_per_call: invs.length > 0 ? total_cost / invs.length : 0,
      });
    }

    return aggregates;
  }

  getStats() {
    return {
      total_invocations: this.invocations.length,
      enabled: this.enabled,
    };
  }

  clear() {
    this.invocations = [];
  }
}

// Singleton instance
export const costGraph = new CostGraph();

/**
 * Track a fresh generation invocation
 */
export function trackFreshInvocation(
  route: string,
  model: string,
  tokens_in: number,
  tokens_out: number,
  canon_key?: string
) {
  // Estimate cost based on model tier
  let cost_est = 0;
  if (model.includes('gpt-4') || model.includes('o1')) {
    cost_est = (tokens_in * 0.00003 + tokens_out * 0.00006); // High-tier model
  } else if (model.includes('gpt-3.5')) {
    cost_est = (tokens_in * 0.0000015 + tokens_out * 0.000002); // Mid-tier
  } else {
    cost_est = (tokens_in * 0.0000005 + tokens_out * 0.000001); // Cheap tier
  }

  costGraph.trackInvocation({
    route,
    model,
    tokens_in,
    tokens_out,
    cost_est,
    reused: false,
    canon_key,
  });
}

/**
 * Track a canon reuse invocation (near-zero cost)
 */
export function trackReuseInvocation(
  route: string,
  canon_key: string,
  model: string = 'cached'
) {
  costGraph.trackInvocation({
    route,
    model,
    tokens_in: 0,
    tokens_out: 0,
    cost_est: 0.000001, // Near-zero but not zero for tracking
    reused: true,
    canon_key,
  });
}

/**
 * Get today's cost aggregates
 */
export function getTodayAggregates(): CostAggregates[] {
  return costGraph.queryToday();
}

/**
 * Get cost graph stats
 */
export function getCostGraphStats() {
  return costGraph.getStats();
}

/**
 * Clear cost graph (for testing)
 */
export function clearCostGraph() {
  costGraph.clear();
}

