# ADR v1.1 Updates Summary
**Date:** 2025-10-13  
**Status:** Pending Application  
**Source:** Epic Reconciliation (5 reports)

---

## Updates Already Applied
- ✅ Version updated: 1.0 → 1.1

---

## Updates Needed (Apply These)

### 1. Add New Section: Production Operations Patterns (After §5)

Insert after "5. Database Migration Standards":

```markdown
---

### 6. Production Operations Patterns

**Decision:** All B2B production systems SHOULD implement operational excellence patterns.

**Rationale:** Enterprise customers require reliability, audit trails, and operational maturity.

**Source:** Epic 7 (Gamification & Certification System)

#### 6.1 Idempotency Middleware

**Pattern:** All PATCH/PUT/DELETE routes SHOULD support `X-Idempotency-Key` header.

```typescript
// api/src/middleware/idempotency.ts
export async function checkIdempotency(req: FastifyRequest, key: string) {
  // Check if key exists in last 24h
  const cached = await db.select().from(idempotency_keys)
    .where(and(
      eq(idempotency_keys.key, key),
      gte(idempotency_keys.created_at, sql`now() - interval '24 hours'`)
    ))
    .limit(1);
  
  if (cached.length > 0) {
    return cached[0].response; // Return cached response
  }
  
  return null; // Proceed with request
}
```

**Traceability:** Epic 7, BRD implicit (reliability requirement)

#### 6.2 Audit Event Logging

**Pattern:** All compliance-sensitive operations MUST emit audit events.

```typescript
// api/src/services/audit.ts
export async function logAuditEvent(event: {
  userId: string;
  eventType: string; // 'certificate_downloaded', 'notification_marked_read', etc.
  entityType: string;
  entityId: string;
  metadata?: object;
}) {
  await db.insert(audit_events).values({
    ...event,
    createdAt: new Date(),
  });
}
```

**Event Types:** certificate_downloaded, certificate_verified, certificate_revoked, notification_marked_read, level_achieved, badge_unlocked, content_generated

**Retention:** 180 days (configurable via `RETAIN_AUDIT_DAYS`)

**Traceability:** Epic 7, BRD implicit (compliance requirement)

#### 6.3 Pagination Standard

**Pattern:** All list endpoints MUST use `limit`/`offset` with standardized response envelope.

```typescript
// Response format
{
  total: number,      // Total count of all items
  limit: number,      // Requested limit (default: 10, max: 50)
  offset: number,     // Requested offset (default: 0)
  data: T[]          // Paginated results
}

// Example route
app.get('/api/resource', async (req, reply) => {
  const limit = Math.min(req.query.limit || 10, 50);
  const offset = req.query.offset || 0;
  
  const total = await db.select({ count: sql`count(*)` }).from(table);
  const data = await db.select().from(table).limit(limit).offset(offset);
  
  return reply.send({ total: total[0].count, limit, offset, data });
});
```

**Traceability:** Epic 7, performance requirement

#### 6.4 UUID Validation

**Pattern:** All routes accepting UUID parameters MUST validate format.

```typescript
// api/src/utils/validation.ts
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Usage in route
app.get('/api/resource/:id', async (req, reply) => {
  const { id } = req.params;
  
  if (!isValidUUID(id)) {
    return reply.status(400).send({
      error: { code: 'BAD_REQUEST', message: 'Invalid UUID format' }
    });
  }
  
  // ... proceed
});
```

**Traceability:** Epic 7, security requirement

#### 6.5 Admin Bypass Gating

**Pattern:** Admin token bypass MUST be gated by `NODE_ENV !== 'production'`.

```typescript
// Security check
if (process.env.NODE_ENV === 'production' && req.headers['x-admin-token']) {
  return reply.status(403).send({
    error: { code: 'FORBIDDEN', message: 'Admin token disabled in production' }
  });
}
```

**Traceability:** Epic 7, security requirement

#### 6.6 Cleanup Cron Jobs

**Pattern:** Operational tables SHOULD have scheduled cleanup jobs.

```typescript
// api/scripts/cleanup-idempotency-keys.ts
import cron from 'node-cron';

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  await db.delete(idempotency_keys)
    .where(sql`created_at < now() - interval '24 hours'`);
});
```

**Traceability:** Epic 7, operational requirement
```

---

### 2. Update §3 (RBAC Middleware) - Add Dev/Test Exception

After the existing RBAC pattern, add:

```markdown
**Exception: Dev/Test Mode**

For development and testing environments, a mock session helper is acceptable:

```typescript
// api/src/middleware/rbac.ts (or in routes)
function getSessionOrMock(req: FastifyRequest) {
  let session = getSession(req);
  
  // Allow admin token bypass in non-production
  if (!session && process.env.NODE_ENV !== 'production') {
    const adminToken = process.env.ADMIN_TOKEN?.trim();
    const xAdminToken = req.headers['x-admin-token'] as string | undefined;
    
    if (adminToken && xAdminToken === adminToken) {
      session = { 
        userId: '00000000-0000-0000-0000-000000000001', 
        role: 'admin' as const,
        orgId: 'test-org-id'
      };
    }
  }
  
  return session;
}
```

**Traceability:** Epic 8, test environment requirement  
**Security:** MUST be disabled in production (gated by `NODE_ENV`)
```

---

### 3. Update Database Conventions - Add Environment Differences

After the existing database conventions, add:

```markdown
### 6. Database Environment Differences

**Decision:** Handle schema differences between staging and production environments.

**Context:** Some hosting providers (e.g., Render free tier) have limitations that require schema adaptations.

**Pattern:**

**Production:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
```

**Staging (if UUID not supported):**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY  -- Render limitation
);
```

**Migration Strategy:**
- Create environment-specific migrations when necessary
- Name clearly: `XXX_feature_render.sql` vs `XXX_feature_production.sql`
- Document differences in migration header
- Test both environments independently

**Example:**
```sql
------------------------------------------------------------------------------
-- Epic 8: Conversational Learning Interface (Render/Staging Variant)
-- DIFFERENCE: Uses TEXT for user_id (Render limitation)
-- Production uses UUID, staging uses TEXT
------------------------------------------------------------------------------
```

**Traceability:** Epic 8, hosting constraint
```

---

### 4. Update Feature Flag Naming - Add Infrastructure Exception

In §1 (Feature Flag Driven Development), after Naming Convention, add:

```markdown
**Infrastructure Toggles:**

Non-user-facing infrastructure toggles MAY use simpler naming without `FF_` prefix:

- `CANON_ENABLED` (infrastructure: canon store on/off)
- `COST_GRAPH_ENABLED` (infrastructure: cost tracking on/off)  
- `PERSIST_AUDIT_EVENTS` (infrastructure: audit logging on/off)

**Rationale:** These are dev/ops toggles, not user-facing features. Simpler names reduce cognitive load.

**Rule:** If toggle gates user-facing feature, use `FF_*` prefix. If toggle gates internal infrastructure, simpler naming acceptable.

**Traceability:** Epic 0 (Platform Foundations), operational simplicity
```

---

### 5. Add Changelog Entry

At the end of the document, after the v1.0 changelog:

```markdown
### v1.1 (2025-10-13)
- **Added Production Operations Patterns (§6)** - 6 new patterns from Epic 7 (idempotency, audit logging, pagination, UUID validation, admin gating, cleanup crons)
- **Updated RBAC Middleware (§3)** - Added dev/test mode exception with `getSessionOrMock()` pattern
- **Updated Database Conventions** - Added environment differences pattern (staging TEXT vs production UUID)
- **Updated Feature Flag Naming** - Clarified infrastructure toggles vs user-facing features
- **Added Lazy LLM Init Pattern** - From Epic 6 (prevent startup failures if API keys missing)
- **Source:** Epic Reconciliation Process (5 agent reports analyzing Epics 6, 7, Platform v1, 8)
```

---

## Summary of Changes

| Section | Change Type | Source Epic | Lines Added |
|---------|-------------|-------------|-------------|
| Version | Update | All | 1 |
| §6 (NEW) | Add | 7 | ~150 |
| §3 | Update | 8 | ~20 |
| Database | Update | 8 | ~30 |
| §1 | Update | 0 | ~15 |
| Changelog | Add | All | ~7 |

**Total:** ~223 lines added

---

## Application Instructions

1. **Backup:** Copy current ADR v1.0 before editing
2. **Apply updates:** Insert sections as listed above (in order)
3. **Verify:** All cross-references intact
4. **Test:** Run linter to check markdown formatting
5. **Commit:** `chore(docs): update ADR to v1.1 with production patterns [spec]`

---

**Status:** Ready to apply when user approves  
**Reviewer:** Project owner approval required (LOCKED document)

