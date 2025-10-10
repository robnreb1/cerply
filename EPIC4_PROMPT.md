# Epic 4: Manager Dashboard - Analytics & Insights

## 🎯 Mission Statement

Build a manager-centric analytics dashboard that delivers team comprehension metrics, retention curves, at-risk learner identification, and business intelligence. This is **core B2B value proposition** — enabling managers to make data-driven decisions about team learning and knowledge retention.

---

## 📋 Context & Current State

### What's Been Completed (Epics 1-3)

**Epic 1:** D2C Removal & Enterprise Foundation ✅
- All consumer flows removed
- Enterprise-only access patterns established
- Marketing site updated for B2B

**Epic 2:** Enterprise SSO & RBAC ✅
- SSO integration (SAML/OIDC/Mock)
- RBAC system: admin, manager, learner roles
- Organization model with multi-tenant support

**Epic 3:** Team Management & Learner Assignment ✅
- Teams table: `id`, `organization_id`, `name`, `manager_id`, `created_at`
- Team members: `team_members` table
- Track subscriptions: `team_track_subscriptions` with `cadence` (daily, weekly, on-demand)
- 7 API routes implemented (teams CRUD, members, subscriptions, overview, tracks, KPIs)
- CSV bulk member import
- RBAC enforcement with `requireManager()` and `requireAdmin()`
- Idempotency support (`X-Idempotency-Key`)
- Event logging (NDJSON)

### Current Database Schema (Relevant to Epic 4)

```sql
-- From Epic 3
CREATE TABLE teams (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  manager_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE team_track_subscriptions (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL,
  track_id UUID NOT NULL,
  cadence TEXT NOT NULL, -- 'daily', 'weekly', 'on-demand'
  priority TEXT, -- 'high', 'medium', 'low'
  assigned_at TIMESTAMP DEFAULT NOW()
);

-- Existing from M3 (Adaptive)
CREATE TABLE items (
  id UUID PRIMARY KEY,
  artefact_id UUID,
  stem TEXT NOT NULL,
  correct_answer TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE attempts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL,
  answer TEXT,
  correct BOOLEAN NOT NULL,
  latency_ms INTEGER,
  attempted_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE objectives (
  id UUID PRIMARY KEY,
  artefact_id UUID,
  title TEXT NOT NULL
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL,
  next_review_at TIMESTAMP,
  interval_days INTEGER
);
```

### Current API Routes (Epic 3)

- `POST /api/teams` - Create team
- `GET /api/teams` - List organization teams
- `POST /api/teams/:id/members` - Add members (supports CSV)
- `POST /api/teams/:id/subscriptions` - Assign tracks
- `GET /api/teams/:id/overview` - Basic team metrics
- `GET /api/tracks` - List available tracks
- `GET /api/ops/kpis` - Organization-wide KPIs (requires admin/manager)

### Feature Flags

```bash
# Epic 3 (Existing)
FF_TEAM_MGMT=true

# Epic 4 (New)
FF_MANAGER_DASHBOARD_V1=true
FF_ANALYTICS_PILOT_V1=true
```

### Tech Stack

- **API**: Node.js + Fastify + TypeScript
- **Database**: PostgreSQL (via Drizzle ORM)
- **Web**: Next.js 14 (App Router) + React + Tailwind CSS
- **Testing**: Vitest (unit), Playwright (E2E)
- **CI**: GitHub Actions (with stub modes for fast PR runs)

### Recent CI Improvements (PR #338)

- Stub modes for quality/canon tests (`QUALITY_STUB`, `CANON_STUB`)
- Evaluator-multiphase moved to nightly (not PR-blocking)
- Epic-3 KPI smoke test now green (auth header fixed)
- `/api/version` returns real commit SHA + build timestamp

---

## 🎯 Epic 4 Goals

### Primary Objectives

1. **Team Comprehension Metrics**: Manager sees avg correct rate, trending up/down
2. **Retention Curves**: Spaced repetition data over time (D0, D7, D14, D30)
3. **At-Risk Identification**: Learners with <70% comprehension or missing reviews
4. **Track Performance**: Per-track metrics (completion %, weak topics, engagement)
5. **Business Intelligence**: Organization-level rollups for executives

### User Stories

**As a Manager, I want to:**
- View my team's overall comprehension score and trend
- Identify learners who are struggling and need intervention
- See which topics are weak across my team
- Track completion rates for assigned tracks
- Export analytics for reports and reviews

**As an Admin, I want to:**
- View organization-wide metrics across all teams
- Compare team performance
- Track certification coverage
- Generate compliance reports for audits

---

## 🏗️ Implementation Scope

### 1. Analytics Data Model

**New Tables:**

```sql
-- Aggregated analytics snapshots (computed nightly or on-demand)
CREATE TABLE team_analytics_snapshots (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL,
  track_id UUID, -- NULL for all-tracks aggregate
  snapshot_date DATE NOT NULL,
  active_learners INTEGER NOT NULL DEFAULT 0,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  correct_attempts INTEGER NOT NULL DEFAULT 0,
  avg_comprehension NUMERIC(4,3), -- 0.000 to 1.000
  avg_latency_ms INTEGER,
  at_risk_count INTEGER NOT NULL DEFAULT 0,
  completion_rate NUMERIC(4,3), -- % of assigned items completed
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, track_id, snapshot_date)
);

-- Learner-level analytics (for at-risk identification)
CREATE TABLE learner_analytics (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID NOT NULL,
  track_id UUID, -- NULL for all-tracks aggregate
  total_attempts INTEGER NOT NULL DEFAULT 0,
  correct_attempts INTEGER NOT NULL DEFAULT 0,
  comprehension_rate NUMERIC(4,3), -- correct / total
  last_attempt_at TIMESTAMP,
  next_review_at TIMESTAMP, -- next scheduled review
  overdue_reviews INTEGER NOT NULL DEFAULT 0,
  is_at_risk BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, team_id, track_id)
);

-- Retention curve data (spaced repetition effectiveness)
CREATE TABLE retention_curves (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL,
  track_id UUID, -- NULL for all-tracks
  day_offset INTEGER NOT NULL, -- 0, 7, 14, 30
  retention_rate NUMERIC(4,3), -- % of items still recalled
  sample_size INTEGER NOT NULL,
  snapshot_date DATE NOT NULL,
  UNIQUE(team_id, track_id, day_offset, snapshot_date)
);
```

**Computed Fields:**
- `comprehension_rate` = `correct_attempts / total_attempts`
- `at_risk` = `comprehension_rate < 0.7 OR overdue_reviews > 5`
- `retention_rate` = `correct_on_retest / total_retested` (for D7, D14, D30)

### 2. Analytics Computation Service

**File:** `api/src/services/analytics.ts`

```typescript
export interface TeamAnalytics {
  teamId: string;
  avgComprehension: number; // 0.0 - 1.0
  activeLearners: number;
  atRiskCount: number;
  totalAttempts: number;
  completionRate: number; // % of assigned tracks completed
  trendingUp: boolean; // compared to last week
}

export interface LearnerStatus {
  userId: string;
  name: string;
  email: string;
  comprehensionRate: number;
  totalAttempts: number;
  lastAttemptAt: string | null;
  overdueReviews: number;
  isAtRisk: boolean;
}

export interface RetentionCurve {
  dayOffset: number; // 0, 7, 14, 30
  retentionRate: number; // 0.0 - 1.0
  sampleSize: number;
}

export interface TrackPerformance {
  trackId: string;
  trackTitle: string;
  avgComprehension: number;
  completionRate: number;
  weakTopics: string[]; // topics with <70% comprehension
}

// Compute analytics for a team (on-demand or nightly cron)
export async function computeTeamAnalytics(teamId: string, trackId?: string): Promise<TeamAnalytics>;

// Get at-risk learners for intervention
export async function getAtRiskLearners(teamId: string): Promise<LearnerStatus[]>;

// Compute retention curve (D0, D7, D14, D30)
export async function computeRetentionCurve(teamId: string, trackId?: string): Promise<RetentionCurve[]>;

// Get per-track performance breakdown
export async function getTrackPerformance(teamId: string): Promise<TrackPerformance[]>;
```

**Implementation Notes:**
- Use SQL aggregations for performance (avoid N+1 queries)
- Cache snapshots for 1 hour (manager dashboard doesn't need real-time)
- Support both on-demand computation and nightly batch jobs
- Use Drizzle ORM for type-safe queries

### 3. Analytics API Routes

**File:** `api/src/routes/analytics.ts`

```typescript
// Manager endpoints (require RBAC: manager or admin)

// GET /api/manager/teams/:teamId/analytics
// Returns: TeamAnalytics
app.get('/api/manager/teams/:teamId/analytics', async (req, reply) => {
  // Check RBAC
  if (!requireManager(req, reply)) return reply;
  
  const { teamId } = req.params;
  const { trackId } = req.query; // optional filter
  
  // Verify manager owns this team (or is admin)
  const session = getSession(req);
  const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team[0] || (team[0].managerId !== session.userId && session.role !== 'admin')) {
    return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not your team' } });
  }
  
  const analytics = await computeTeamAnalytics(teamId, trackId);
  return reply.send(analytics);
});

// GET /api/manager/teams/:teamId/at-risk
// Returns: LearnerStatus[]
app.get('/api/manager/teams/:teamId/at-risk', async (req, reply) => {
  // Similar RBAC + ownership check
  const atRiskLearners = await getAtRiskLearners(teamId);
  return reply.send(atRiskLearners);
});

// GET /api/manager/teams/:teamId/retention
// Returns: RetentionCurve[]
app.get('/api/manager/teams/:teamId/retention', async (req, reply) => {
  const { trackId } = req.query;
  const retentionData = await computeRetentionCurve(teamId, trackId);
  return reply.send(retentionData);
});

// GET /api/manager/teams/:teamId/tracks
// Returns: TrackPerformance[]
app.get('/api/manager/teams/:teamId/tracks', async (req, reply) => {
  const trackPerformance = await getTrackPerformance(teamId);
  return reply.send(trackPerformance);
});

// Admin endpoints (require RBAC: admin only)

// GET /api/analytics/organization/:orgId/overview
// Returns: Organization-level aggregates
app.get('/api/analytics/organization/:orgId/overview', async (req, reply) => {
  if (!requireAdmin(req, reply)) return reply;
  
  // Aggregate all teams in organization
  const orgTeams = await db.select().from(teams).where(eq(teams.organizationId, orgId));
  const teamAnalytics = await Promise.all(
    orgTeams.map(team => computeTeamAnalytics(team.id))
  );
  
  const overview = {
    organizationId: orgId,
    totalTeams: orgTeams.length,
    activeLearners: teamAnalytics.reduce((sum, t) => sum + t.activeLearners, 0),
    avgComprehension: teamAnalytics.reduce((sum, t) => sum + t.avgComprehension, 0) / teamAnalytics.length,
    totalAtRiskCount: teamAnalytics.reduce((sum, t) => sum + t.atRiskCount, 0),
  };
  
  return reply.send(overview);
});

// GET /api/analytics/organization/:orgId/export?format=csv
// Returns: CSV export of analytics data
app.get('/api/analytics/organization/:orgId/export', async (req, reply) => {
  if (!requireAdmin(req, reply)) return reply;
  
  const { format } = req.query; // csv or json
  
  if (format === 'csv') {
    const csvData = await generateAnalyticsCSV(orgId);
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="analytics-${orgId}-${new Date().toISOString()}.csv"`);
    return reply.send(csvData);
  }
  
  // Default: JSON
  const jsonData = await generateAnalyticsJSON(orgId);
  return reply.send(jsonData);
});
```

### 4. Manager Dashboard UI

**New Pages:**

**`web/app/(manager)/manager/dashboard/page.tsx`**
- Overview of all teams managed by current user
- Quick stats: total learners, avg comprehension, at-risk count
- List of teams with click-through to detail

**`web/app/(manager)/manager/teams/[teamId]/dashboard/page.tsx`**
- Detailed team analytics
- Visualizations:
  - Line chart: Comprehension trend (last 30 days)
  - Bar chart: Per-track performance
  - Heatmap: Retention curve (D0, D7, D14, D30)
  - Table: At-risk learners with action buttons
- Filters: date range, track, learner

**`web/components/AnalyticsChart.tsx`**
- Reusable chart component (use Recharts or similar)
- Props: `data`, `type` (line, bar, heatmap), `title`

**`web/components/AtRiskTable.tsx`**
- Table of at-risk learners
- Columns: Name, Email, Comprehension, Last Attempt, Overdue Reviews, Actions
- Actions: "Send Reminder", "View Profile", "Reassign Track"

**Admin Analytics:**

**`web/app/(admin)/admin/analytics/page.tsx`**
- Organization-level dashboard
- Multi-team comparison
- Export button (CSV/JSON)

### 5. Styling & Brand Tokens

**Use existing Tailwind config:**
- `bg-brand-surface`, `text-brand-ink`, `border-brand-border`
- `rounded-12`, `shadow-md`
- Charts: Use brand accent colors from `app/globals.css`

**Responsive:**
- Mobile: Stack charts vertically
- Desktop: 2-column grid for charts

---

## 🔒 Hard Guardrails

### Must NOT Do:
1. **No D2C flows**: No consumer self-serve, payments, or public leaderboards
2. **No BRD/FSD scope changes**: Infrastructure/analytics only, no new use cases
3. **No real-time streaming**: Analytics can be cached for 1 hour (not instant)
4. **No external services**: All analytics computed in-house (no 3rd-party APIs)

### Must Do:
1. **RBAC enforcement**: All routes require `requireManager()` or `requireAdmin()`
2. **Data isolation**: Managers only see their teams; admins see all
3. **Error handling**: API returns error envelope `{ error: { code, message, details } }`
4. **Feature flags**: Gate all routes with `FF_MANAGER_DASHBOARD_V1=true`
5. **[spec] commits**: Update docs with `[spec]` tag in commit messages

### B2B Pivot Alignment:
- Analytics focus on **business outcomes** (team performance, risk, compliance)
- Copy uses "team", "manager", "organization" (not "you", "your learning")
- No individual learner metrics exposed to other learners (privacy)

Must-add (before you run it):
	1.	Tenant isolation everywhere. In every analytics query, join on organization_id and verify ownership (manager of the team or admin). Add this to the prompt explicitly so Cursor doesn’t “forget”.
	2.	Indexes. In the migration, add:
	•	attempts(user_id), attempts(item_id), attempts(attempted_at)
	•	reviews(user_id), reviews(next_review_at)
	•	team_analytics_snapshots(team_id, snapshot_date), learner_analytics(team_id, user_id), retention_curves(team_id, day_offset, snapshot_date)
	3.	Rename one route to avoid confusion. Change GET /api/manager/teams/:teamId/tracks to /api/manager/teams/:teamId/performance (that endpoint returns analytics, not a track list).
	4.	Configurable thresholds. Make at-risk rules org/track config: AT_RISK_MIN_COMPREHENSION (default 0.70) and AT_RISK_MAX_OVERDUE (default 5). Store per-org overrides or accept query overrides gated to admins.
	5.	Pagination & limits. Add limit, offset to at-risk and track performance endpoints; cap to 200 server-side.
	6.	RBAC return behavior. In the prompt, call out: “All route guards must return reply to prevent double-send” (we hit this in Epic 3).
	7.	CSV export safety. Stream the export (Node stream) and include a redaction toggle: ?pii=redacted (hash email; keep display name). Default to redacted.
	8.	Caching & headers. Cache analytics for 1h; add observability headers:
	•	x-analytics-source: snapshot|computed
	•	x-analytics-sample: <n>
	•	x-cache: hit|miss
	9.	Date/time discipline. All aggregation in UTC; UI displays in user timezone.
	10.	CI determinism. Add ANALYTICS_STUB=true for PR runs so analytics tests don’t depend on big fixtures. Nightly can run the real compute.
	11.	Empty-data UX. Define copy/states for “no activity yet” to avoid charts erroring.
	12.	Data freshness note. Dashboard badge: “Updated ~1h ago” with Refresh (on-demand recompute for managers, rate-limited).

Nice-to-add (if simple):
	•	Materialized view option (Postgres) for the team analytics summary; refresh nightly + on-demand.
	•	Precision/rounding: return comprehension/retention rounded to 2 dp; include raw counts in the payload.
	•	Per-team overrides for cadence/weighting (stored on team_track_subscriptions).

---

## 🧪 Comprehensive Test Suite

### Unit Tests (Vitest)

**`api/tests/analytics.test.ts`**

```typescript
describe('Analytics Service', () => {
  test('computeTeamAnalytics returns correct comprehension rate', async () => {
    // Setup: Insert test team, members, attempts
    const teamId = await createTestTeam();
    await createTestAttempts(teamId, { correct: 85, incorrect: 15 });
    
    const analytics = await computeTeamAnalytics(teamId);
    
    expect(analytics.avgComprehension).toBeCloseTo(0.85, 2);
    expect(analytics.activeLearners).toBeGreaterThan(0);
  });
  
  test('getAtRiskLearners identifies learners with <70% comprehension', async () => {
    const teamId = await createTestTeam();
    await createTestAttempts(teamId, { userId: 'user-1', correct: 6, incorrect: 4 }); // 60% - at risk
    await createTestAttempts(teamId, { userId: 'user-2', correct: 9, incorrect: 1 }); // 90% - OK
    
    const atRisk = await getAtRiskLearners(teamId);
    
    expect(atRisk.length).toBe(1);
    expect(atRisk[0].userId).toBe('user-1');
    expect(atRisk[0].isAtRisk).toBe(true);
  });
  
  test('computeRetentionCurve returns D0, D7, D14, D30 data', async () => {
    const teamId = await createTestTeam();
    await createTestRetentionData(teamId); // Seed with historical data
    
    const curve = await computeRetentionCurve(teamId);
    
    expect(curve.length).toBe(4); // D0, D7, D14, D30
    expect(curve[0].dayOffset).toBe(0);
    expect(curve[1].dayOffset).toBe(7);
    expect(curve[2].dayOffset).toBe(14);
    expect(curve[3].dayOffset).toBe(30);
  });
});
```

**`api/tests/analytics-routes.test.ts`**

```typescript
describe('Analytics API Routes', () => {
  test('GET /api/manager/teams/:teamId/analytics requires manager role', async () => {
    const learnerSession = createSession({ role: 'learner' });
    
    const response = await app.inject({
      method: 'GET',
      url: '/api/manager/teams/team-1/analytics',
      headers: { cookie: learnerSession },
    });
    
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });
  
  test('GET /api/manager/teams/:teamId/analytics returns team metrics', async () => {
    const managerSession = createSession({ role: 'manager', userId: 'manager-1' });
    const teamId = await createTestTeam({ managerId: 'manager-1' });
    
    const response = await app.inject({
      method: 'GET',
      url: `/api/manager/teams/${teamId}/analytics`,
      headers: { cookie: managerSession },
    });
    
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('avgComprehension');
    expect(body).toHaveProperty('activeLearners');
    expect(body).toHaveProperty('atRiskCount');
  });
  
  test('GET /api/analytics/organization/:orgId/export returns CSV', async () => {
    const adminSession = createSession({ role: 'admin' });
    
    const response = await app.inject({
      method: 'GET',
      url: '/api/analytics/organization/org-1/export?format=csv',
      headers: { cookie: adminSession },
    });
    
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('filename=');
  });
});
```

### Integration Tests

**`api/tests/analytics-e2e.test.ts`**

```typescript
describe('Analytics E2E Flow', () => {
  test('Manager creates team → assigns learners → views analytics', async () => {
    // 1. Create team
    const createTeamRes = await managerRequest('POST', '/api/teams', {
      name: 'Test Team',
    });
    const teamId = createTeamRes.json().id;
    
    // 2. Add members
    await managerRequest('POST', `/api/teams/${teamId}/members`, {
      emails: ['learner1@example.com', 'learner2@example.com'],
    });
    
    // 3. Assign track
    await managerRequest('POST', `/api/teams/${teamId}/subscriptions`, {
      track_id: 'track-1',
      cadence: 'daily',
    });
    
    // 4. Simulate learner activity
    await simulateLearnerAttempts(teamId, { correct: 80, incorrect: 20 });
    
    // 5. View analytics
    const analyticsRes = await managerRequest('GET', `/api/manager/teams/${teamId}/analytics`);
    
    expect(analyticsRes.statusCode).toBe(200);
    expect(analyticsRes.json().avgComprehension).toBeCloseTo(0.8, 1);
  });
});
```

### Playwright E2E Tests

**`web/e2e/manager-dashboard.spec.ts`**

```typescript
test('Manager can view team analytics dashboard', async ({ page }) => {
  // Login as manager
  await loginAsManager(page);
  
  // Navigate to dashboard
  await page.goto('/manager/dashboard');
  
  // Verify overview stats
  await expect(page.getByTestId('total-learners')).toBeVisible();
  await expect(page.getByTestId('avg-comprehension')).toBeVisible();
  await expect(page.getByTestId('at-risk-count')).toBeVisible();
  
  // Click on a team
  await page.getByTestId('team-card-1').click();
  
  // Verify team detail page
  await expect(page).toHaveURL(/\/manager\/teams\/[^\/]+\/dashboard/);
  await expect(page.getByTestId('comprehension-chart')).toBeVisible();
  await expect(page.getByTestId('retention-heatmap')).toBeVisible();
  await expect(page.getByTestId('at-risk-table')).toBeVisible();
});

test('Manager can filter analytics by date range', async ({ page }) => {
  await loginAsManager(page);
  await page.goto('/manager/teams/team-1/dashboard');
  
  // Open date range picker
  await page.getByTestId('date-range-picker').click();
  
  // Select last 7 days
  await page.getByRole('button', { name: 'Last 7 days' }).click();
  
  // Verify chart updates
  await expect(page.getByTestId('comprehension-chart')).toContainText('Last 7 days');
});

test('Manager can export analytics as CSV', async ({ page }) => {
  await loginAsManager(page);
  await page.goto('/manager/dashboard');
  
  // Click export button
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;
  
  // Verify file name
  expect(download.suggestedFilename()).toMatch(/analytics-.*\.csv/);
});
```

### Smoke Tests

**`api/scripts/smoke-analytics.sh`**

```bash
#!/bin/bash
set -e

API_BASE="${API_BASE:-http://localhost:8080}"
ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token-12345}"

echo "🔍 Epic 4 Analytics Smoke Test"
echo "API Base: $API_BASE"
echo ""

# Test 1: Manager analytics endpoint
echo "✓ Test 1: Get team analytics"
curl -sS "$API_BASE/api/manager/teams/team-1/analytics" \
  -H "x-admin-token: $ADMIN_TOKEN" | jq -e '.avgComprehension' > /dev/null
echo "✅ PASS"

# Test 2: At-risk learners
echo "✓ Test 2: Get at-risk learners"
curl -sS "$API_BASE/api/manager/teams/team-1/at-risk" \
  -H "x-admin-token: $ADMIN_TOKEN" | jq -e 'length' > /dev/null
echo "✅ PASS"

# Test 3: Retention curve
echo "✓ Test 3: Get retention curve"
curl -sS "$API_BASE/api/manager/teams/team-1/retention" \
  -H "x-admin-token: $ADMIN_TOKEN" | jq -e '.[0].dayOffset' > /dev/null
echo "✅ PASS"

# Test 4: Organization overview (admin)
echo "✓ Test 4: Get organization overview"
curl -sS "$API_BASE/api/analytics/organization/org-1/overview" \
  -H "x-admin-token: $ADMIN_TOKEN" | jq -e '.totalTeams' > /dev/null
echo "✅ PASS"

# Test 5: CSV export
echo "✓ Test 5: Export analytics as CSV"
curl -sS "$API_BASE/api/analytics/organization/org-1/export?format=csv" \
  -H "x-admin-token: $ADMIN_TOKEN" | head -1 | grep -q "team_id"
echo "✅ PASS"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ All Analytics Smoke Tests Passed!"
echo "════════════════════════════════════════════════════════════"
```

---

## ✅ Acceptance Criteria

### Must Pass Before Merge:

1. **API Unit Tests**: All analytics service tests pass (`npm run test -- analytics`)
2. **API Route Tests**: All endpoint tests pass with RBAC enforcement
3. **E2E Tests**: Manager dashboard flow completes successfully
4. **Smoke Tests**: `smoke-analytics.sh` passes locally and in CI
5. **Linting**: No TypeScript errors, ESLint clean
6. **Feature Flag**: All routes gated by `FF_MANAGER_DASHBOARD_V1=true`

### Functional Requirements:

- [ ] Manager can view team comprehension metrics (avg, trend)
- [ ] Manager can identify at-risk learners (<70% comprehension or overdue reviews)
- [ ] Manager can view retention curves (D0, D7, D14, D30)
- [ ] Manager can see per-track performance breakdown
- [ ] Admin can view organization-level analytics
- [ ] Admin can export analytics as CSV
- [ ] Charts are responsive and use brand tokens
- [ ] RBAC enforced: managers see only their teams, admins see all
- [ ] Data isolation: no cross-organization leaks

### Performance:

- [ ] Analytics API responds in <1 second for teams with 100 learners
- [ ] Dashboard page loads in <2 seconds
- [ ] CSV export completes in <5 seconds for org with 10 teams

### Documentation:

- [ ] `docs/functional-spec.md` updated with §24 Manager Dashboard (mark as ✅ IMPLEMENTED)
- [ ] `README.md` updated with Quick Start for manager dashboard
- [ ] `api/README.md` (or new doc) describes analytics routes with curl examples
- [ ] PR description includes acceptance evidence (curl outputs, screenshots)

---

## 📚 Documentation to Update

### 1. Functional Spec (`docs/functional-spec.md`)

Add new section:

```markdown
## 24) Manager Dashboard & Analytics v1 — ✅ IMPLEMENTED

**Covers SSOT:** B-2, B-14 (Manager tracking team progress and risk metrics)

**Status:** ✅ IMPLEMENTED

**Feature Flag:** `FF_MANAGER_DASHBOARD_V1=true`

### Routes

#### Manager Endpoints

**GET /api/manager/teams/:teamId/analytics**
- Returns: `{ avgComprehension, activeLearners, atRiskCount, totalAttempts, completionRate, trendingUp }`
- RBAC: Manager (owns team) or Admin
- Example:
  ```bash
  curl -H "x-admin-token: TOKEN" https://api.cerply.com/api/manager/teams/team-1/analytics
  ```

**GET /api/manager/teams/:teamId/at-risk**
- Returns: Array of `{ userId, name, email, comprehensionRate, lastAttemptAt, overdueReviews, isAtRisk }`
- RBAC: Manager or Admin
- Example:
  ```bash
  curl -H "x-admin-token: TOKEN" https://api.cerply.com/api/manager/teams/team-1/at-risk
  ```

**GET /api/manager/teams/:teamId/retention**
- Query: `?trackId=<optional>`
- Returns: Array of `{ dayOffset, retentionRate, sampleSize }` (D0, D7, D14, D30)
- RBAC: Manager or Admin

**GET /api/manager/teams/:teamId/tracks**
- Returns: Array of `{ trackId, trackTitle, avgComprehension, completionRate, weakTopics[] }`
- RBAC: Manager or Admin

#### Admin Endpoints

**GET /api/analytics/organization/:orgId/overview**
- Returns: `{ organizationId, totalTeams, activeLearners, avgComprehension, totalAtRiskCount }`
- RBAC: Admin only

**GET /api/analytics/organization/:orgId/export?format=csv**
- Returns: CSV or JSON export of analytics data
- RBAC: Admin only
- Headers: `Content-Type: text/csv`, `Content-Disposition: attachment; filename=...`

### Database Schema

**team_analytics_snapshots:**
- `id`, `team_id`, `track_id`, `snapshot_date`, `active_learners`, `total_attempts`, `correct_attempts`, `avg_comprehension`, `avg_latency_ms`, `at_risk_count`, `completion_rate`, `created_at`

**learner_analytics:**
- `id`, `user_id`, `team_id`, `track_id`, `total_attempts`, `correct_attempts`, `comprehension_rate`, `last_attempt_at`, `next_review_at`, `overdue_reviews`, `is_at_risk`, `updated_at`

**retention_curves:**
- `id`, `team_id`, `track_id`, `day_offset`, `retention_rate`, `sample_size`, `snapshot_date`

### Web UI

**Pages:**
- `/manager/dashboard` - Overview of all managed teams
- `/manager/teams/[teamId]/dashboard` - Detailed team analytics
- `/admin/analytics` - Organization-level dashboard

**Components:**
- `AnalyticsChart.tsx` - Reusable chart component (line, bar, heatmap)
- `AtRiskTable.tsx` - Table of at-risk learners with actions

### Technical Implementation

- **Analytics Service:** `api/src/services/analytics.ts` with functions: `computeTeamAnalytics`, `getAtRiskLearners`, `computeRetentionCurve`, `getTrackPerformance`
- **Caching:** 1-hour cache for analytics snapshots (not real-time)
- **Batch Jobs:** Nightly cron to compute snapshots for all teams
- **RBAC:** All routes use `requireManager()` or `requireAdmin()` middleware
- **Error Handling:** Standard error envelope `{ error: { code, message, details } }`

### Testing

- Unit tests: `api/tests/analytics.test.ts` (service functions)
- Route tests: `api/tests/analytics-routes.test.ts` (RBAC, endpoints)
- E2E tests: `web/e2e/manager-dashboard.spec.ts` (UI flows)
- Smoke tests: `api/scripts/smoke-analytics.sh` (critical paths)

### Changelog

- **2025-10-09**: Epic 4 - Manager Dashboard v1 implemented
  - Added 6 analytics API endpoints
  - Added 3 new database tables
  - Built manager dashboard UI with charts and at-risk table
  - Admin analytics overview and CSV export
  - Comprehensive test coverage (unit, integration, E2E, smoke)
```

### 2. README (`README.md`)

Add section:

```markdown
## Manager Dashboard (Epic 4) — Analytics & Insights

**Feature Flag:** `FF_MANAGER_DASHBOARD_V1=true`

### Quick Start

```bash
# View team analytics
curl -H "x-admin-token: dev-admin-token-12345" \
  http://localhost:8080/api/manager/teams/team-1/analytics

# Get at-risk learners
curl -H "x-admin-token: dev-admin-token-12345" \
  http://localhost:8080/api/manager/teams/team-1/at-risk

# Export organization analytics (admin only)
curl -H "x-admin-token: dev-admin-token-12345" \
  "http://localhost:8080/api/analytics/organization/org-1/export?format=csv" \
  > analytics.csv
```

### Key Features

- **Team Comprehension Metrics**: Avg correct rate, trending indicators
- **At-Risk Identification**: Learners with <70% comprehension or 5+ overdue reviews
- **Retention Curves**: Spaced repetition data (D0, D7, D14, D30)
- **Track Performance**: Per-track breakdown with weak topics
- **Organization Analytics**: Admin-level rollups across all teams
- **CSV Export**: Compliance-ready reports

### Documentation

- Functional Spec: `docs/functional-spec.md` §24
- UAT Guide: `docs/uat/EPIC4_UAT.md`
- Smoke Tests: `api/scripts/smoke-analytics.sh`

### Testing

```bash
# Run analytics unit tests
npm run test -- analytics

# Run E2E tests
npm run test:e2e -- manager-dashboard

# Run smoke tests
ADMIN_TOKEN=dev-admin-token-12345 bash api/scripts/smoke-analytics.sh
```
```

### 3. UAT Guide (`docs/uat/EPIC4_UAT.md`)

Create comprehensive UAT document with:
- 10 test scenarios (provided below)
- Expected outcomes for each
- Acceptance checklist

---

## 🧪 Suggested UAT Tests (Run Before Merging)

### UAT-1: Manager Views Team Overview

**Setup:**
- Manager logged in with at least 2 teams
- Teams have learners with mixed performance

**Steps:**
1. Navigate to `/manager/dashboard`
2. Verify "My Teams" list shows all managed teams
3. Verify each team card shows: name, learner count, avg comprehension, at-risk count
4. Click on a team card

**Expected:**
- Redirects to `/manager/teams/:teamId/dashboard`
- Team detail page loads with charts

**Acceptance:**
- [ ] Team cards render correctly
- [ ] Metrics are non-zero (or explain if zero is correct)
- [ ] Click navigation works

---

### UAT-2: Manager Views Team Analytics Detail

**Setup:**
- Team with at least 10 learners, 50+ attempts

**Steps:**
1. Navigate to `/manager/teams/:teamId/dashboard`
2. Verify page shows:
   - Team name header
   - Comprehension chart (line chart, last 30 days)
   - Retention heatmap (D0, D7, D14, D30)
   - Per-track performance (bar chart)
   - At-risk learners table

**Expected:**
- All visualizations render without errors
- Data matches expected values (cross-check with API)
- Charts use brand colors

**Acceptance:**
- [ ] Comprehension chart shows trend
- [ ] Retention heatmap has 4 data points (D0, D7, D14, D30)
- [ ] Track performance shows all assigned tracks
- [ ] At-risk table lists learners with <70% comprehension or overdue reviews

---

### UAT-3: Manager Identifies At-Risk Learners

**Setup:**
- Team with mixed learners:
  - Learner A: 95% comprehension (not at-risk)
  - Learner B: 55% comprehension (at-risk)
  - Learner C: 75% comprehension, 7 overdue reviews (at-risk)

**Steps:**
1. Navigate to `/manager/teams/:teamId/dashboard`
2. Scroll to "At-Risk Learners" table
3. Verify Learner B and C are listed
4. Verify Learner A is NOT listed
5. Click on Learner B's row

**Expected:**
- At-risk table shows 2 learners (B and C)
- Columns: Name, Email, Comprehension %, Last Attempt, Overdue Reviews
- Click opens learner profile or detail modal

**Acceptance:**
- [ ] At-risk logic correct (<70% comprehension OR 5+ overdue reviews)
- [ ] Table sortable by column
- [ ] Action buttons visible (Send Reminder, View Profile)

---

### UAT-4: Manager Filters Analytics by Date Range

**Setup:**
- Team with historical attempt data (last 90 days)

**Steps:**
1. Navigate to `/manager/teams/:teamId/dashboard`
2. Click "Date Range" filter
3. Select "Last 7 days"
4. Verify comprehension chart updates to show only last 7 days
5. Change to "Last 30 days"
6. Verify chart updates again

**Expected:**
- Chart data changes based on selected range
- X-axis labels update (e.g., "Oct 1 - Oct 7")

**Acceptance:**
- [ ] Date range picker works
- [ ] Chart updates without page reload
- [ ] Data accuracy verified (compare with API)

---

### UAT-5: Manager Filters Analytics by Track

**Setup:**
- Team with 3 assigned tracks

**Steps:**
1. Navigate to `/manager/teams/:teamId/dashboard`
2. Click "Track" filter dropdown
3. Select "Track A"
4. Verify all metrics update to show only Track A data:
   - Avg comprehension changes
   - At-risk learners list updates
   - Retention curve specific to Track A

**Expected:**
- Metrics recalculate for selected track
- "All Tracks" option available to reset filter

**Acceptance:**
- [ ] Track filter works
- [ ] Metrics match API call with `?trackId=track-a`
- [ ] Clear filter button visible

---

### UAT-6: Admin Views Organization Overview

**Setup:**
- Admin user with access to organization with 5+ teams

**Steps:**
1. Navigate to `/admin/analytics`
2. Verify page shows:
   - Total teams count
   - Total active learners
   - Organization avg comprehension
   - Total at-risk count
   - List of all teams with click-through to detail

**Expected:**
- Organization-level aggregates are accurate
- Can click on any team to view team dashboard

**Acceptance:**
- [ ] Admin sees ALL teams in organization (not just managed teams)
- [ ] Aggregates sum correctly
- [ ] RBAC enforced (manager cannot access this page)

---

### UAT-7: Admin Exports Analytics as CSV

**Setup:**
- Admin user with organization data

**Steps:**
1. Navigate to `/admin/analytics`
2. Click "Export CSV" button
3. Verify CSV file downloads
4. Open CSV file
5. Verify columns: `team_id`, `team_name`, `active_learners`, `avg_comprehension`, `at_risk_count`, `completion_rate`
6. Verify data matches UI

**Expected:**
- CSV file downloads with correct filename format: `analytics-{orgId}-{timestamp}.csv`
- All teams included in export
- Headers and data rows present

**Acceptance:**
- [ ] CSV downloads successfully
- [ ] Data accuracy verified (spot-check 3 teams)
- [ ] Headers are human-readable

---

### UAT-8: Retention Curve Shows Spaced Repetition Data

**Setup:**
- Team with at least 30 days of review data

**Steps:**
1. Navigate to `/manager/teams/:teamId/dashboard`
2. Locate "Retention Curve" heatmap
3. Verify 4 data points: D0, D7, D14, D30
4. Verify D0 retention ~95-100% (initial learning)
5. Verify retention decreases over time (forgetting curve)
6. Hover over heatmap cells to see sample size

**Expected:**
- Heatmap shows retention rates as percentages
- Sample sizes visible on hover (e.g., "85% retention from 40 reviews")
- Color gradient: green (high retention) → red (low retention)

**Acceptance:**
- [ ] All 4 data points present
- [ ] Retention curve follows expected pattern
- [ ] Sample sizes reasonable (>10 for valid data)

---

### UAT-9: Track Performance Shows Weak Topics

**Setup:**
- Team assigned to track with 5 topics, mixed performance:
  - Topic A: 92% comprehension
  - Topic B: 58% comprehension (weak)
  - Topic C: 65% comprehension (weak)
  - Topic D: 88% comprehension
  - Topic E: 75% comprehension

**Steps:**
1. Navigate to `/manager/teams/:teamId/dashboard`
2. Locate "Track Performance" section
3. Verify track shows avg comprehension (75.6%)
4. Click "View Weak Topics"
5. Verify Topic B and C are listed (comprehension <70%)

**Expected:**
- Weak topics highlighted in red or with warning icon
- Click-through to topic detail with suggested interventions

**Acceptance:**
- [ ] Weak topics identified correctly (<70% threshold)
- [ ] Can click to drill down into topic
- [ ] Suggestions provided (e.g., "Send refresher", "Reassign")

---

### UAT-10: RBAC Enforcement - Manager Cannot Access Other Teams

**Setup:**
- Manager A owns Team 1
- Manager B owns Team 2

**Steps:**
1. Login as Manager A
2. Attempt to access `/manager/teams/team-2/dashboard` (Manager B's team)
3. Verify 403 Forbidden error
4. Attempt to call API: `GET /api/manager/teams/team-2/analytics`
5. Verify 403 Forbidden error with message "Not your team"

**Expected:**
- UI redirects to dashboard with error message
- API returns `{ error: { code: 'FORBIDDEN', message: 'Not your team' } }`

**Acceptance:**
- [ ] RBAC enforced at API layer
- [ ] UI shows user-friendly error message
- [ ] Manager cannot enumerate other teams' data

---

## 📦 Deliverables Checklist

Before opening PR:

- [ ] **API Implementation**
  - [ ] `api/src/services/analytics.ts` - Analytics computation service
  - [ ] `api/src/routes/analytics.ts` - 6 API endpoints
  - [ ] `api/src/db/schema.ts` - 3 new tables added
  - [ ] `api/drizzle/007_analytics_tables.sql` - Migration file

- [ ] **Web UI Implementation**
  - [ ] `web/app/(manager)/manager/dashboard/page.tsx` - Manager overview
  - [ ] `web/app/(manager)/manager/teams/[teamId]/dashboard/page.tsx` - Team detail
  - [ ] `web/app/(admin)/admin/analytics/page.tsx` - Admin analytics
  - [ ] `web/components/AnalyticsChart.tsx` - Reusable chart component
  - [ ] `web/components/AtRiskTable.tsx` - At-risk learners table

- [ ] **Tests**
  - [ ] `api/tests/analytics.test.ts` - Unit tests (service)
  - [ ] `api/tests/analytics-routes.test.ts` - API route tests
  - [ ] `api/tests/analytics-e2e.test.ts` - Integration tests
  - [ ] `web/e2e/manager-dashboard.spec.ts` - Playwright E2E
  - [ ] `api/scripts/smoke-analytics.sh` - Smoke test script

- [ ] **Documentation**
  - [ ] `docs/functional-spec.md` - §24 Manager Dashboard added
  - [ ] `README.md` - Quick Start section added
  - [ ] `docs/uat/EPIC4_UAT.md` - UAT guide with 10 scenarios
  - [ ] `api/README.md` or new `ANALYTICS.md` - API docs with curl examples

- [ ] **Commits**
  - [ ] Feature implementation: `feat(analytics): add manager dashboard [spec]`
  - [ ] Tests: `test(analytics): comprehensive test suite`
  - [ ] Docs: `docs(analytics): add Epic 4 documentation [spec]`

---

## 🚢 Merge Criteria

### All Checks Must Pass:

1. ✅ All unit tests pass (`npm run test`)
2. ✅ All E2E tests pass (`npm run test:e2e`)
3. ✅ Smoke tests pass locally (`bash api/scripts/smoke-analytics.sh`)
4. ✅ Linting clean (`npm run lint`)
5. ✅ TypeScript builds without errors
6. ✅ No console errors in browser when using dashboard
7. ✅ All 10 UAT scenarios completed successfully
8. ✅ Documentation updated with `[spec]` tag
9. ✅ Feature flag `FF_MANAGER_DASHBOARD_V1=true` gates all routes
10. ✅ RBAC enforcement verified (managers cannot access other teams)

### PR Description Must Include:

- Summary of Epic 4 implementation
- Curl examples for all 6 API endpoints
- Screenshots of manager dashboard UI
- Evidence of UAT completion (checklist or summary)
- Link to updated FSD §24
- Confirmation: "No D2C flows added, B2B pivot intact"

---

## 🎯 Success Metrics

**Post-Merge (within 1 week):**
- [ ] Manager dashboard used by at least 3 pilot customers
- [ ] Average dashboard load time <2 seconds
- [ ] Zero RBAC violations reported
- [ ] At-risk identification used to trigger 5+ interventions

**Long-Term (within 1 month):**
- [ ] Manager dashboard becomes #1 most-visited page for manager users
- [ ] Analytics export used in 10+ compliance reports
- [ ] Retention curve data informs adaptive algorithm improvements

---

## 📞 Questions or Issues?

If you encounter any blockers:
1. Check existing Epic 3 implementation for patterns
2. Review similar analytics implementations in `docs/`
3. Test with stub data first, then integrate with real database
4. Use feature flags liberally (fail gracefully if flag off)
5. Ask for clarification on B2B pivot boundaries

**Remember:**
- Infrastructure/analytics only — no new use cases
- RBAC is mandatory — never skip auth checks
- Use brand tokens — no ad-hoc colors
- Commit with `[spec]` when docs change

---

**Good luck with Epic 4! This is a critical feature for B2B value proposition. 🚀**

