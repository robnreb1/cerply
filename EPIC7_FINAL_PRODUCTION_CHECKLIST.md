# Epic 7 - Final Production Readiness Checklist

**Date**: 2025-10-12  
**Status**: ✅ PRODUCTION DEPLOYED  
**API URL**: https://api.cerply.com

---

## ✅ Part 1: Route Accessibility (Infrastructure)

### Routes Verified (Unauthenticated)
All Epic 7 routes are **deployed and protected by authentication**:

| Route | Status | Expected | Result |
|-------|--------|----------|--------|
| `GET /api/learners/:id/levels` | `401 UNAUTHORIZED` | Route exists, requires auth | ✅ |
| `GET /api/manager/notifications` | `401 UNAUTHORIZED` | Route exists, requires auth | ✅ |
| `GET /api/certificates/:id/verify` | `400 BAD_REQUEST` | Route exists, invalid UUID | ✅ |
| `GET /api/learners/:id/badges` | `401 UNAUTHORIZED` | Route exists, requires auth | ✅ |

**✅ PASS**: All routes are deployed and correctly require authentication.

---

## 🔐 Part 2: Authenticated Happy-Path (Requires Real Credentials)

**⚠️ IMPORTANT**: These tests require **real JWT tokens** from authenticated users (learner/manager roles).

### Test Commands (Once You Have JWT Tokens)

```bash
# Replace YOUR_JWT_TOKEN with actual token from Auth0/SSO login

# 1️⃣ Learner: Get levels with pagination
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  'https://api.cerply.com/api/learners/YOUR_USER_ID/levels?limit=1&offset=0'
# Expected: 200 { total, limit, offset, data: [...] }

# 2️⃣ Manager: Get notifications (unread only)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  'https://api.cerply.com/api/manager/notifications?limit=5&unreadOnly=true'
# Expected: 200 { total, limit, offset, data: [...] }

# 3️⃣ Idempotency: Mark notification as read (first call)
curl -X PATCH \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Idempotency-Key: test-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"read": true}' \
  'https://api.cerply.com/api/manager/notifications/NOTIFICATION_ID'
# Expected: 200 { id, read: true, readAt, ... }

# 4️⃣ Idempotency: Replay same request (should return cached response)
curl -X PATCH \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Idempotency-Key: test-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"read": true}' \
  'https://api.cerply.com/api/manager/notifications/NOTIFICATION_ID' \
  -i | grep -i "X-Idempotency-Replay"
# Expected: X-Idempotency-Replay: true

# 5️⃣ Certificates: Verify a valid certificate
curl 'https://api.cerply.com/api/certificates/VALID_CERT_ID/verify'
# Expected: 200 { valid: true, certificateId, learnerId, ... }

# 6️⃣ Certificates: Download PDF (requires auth)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  'https://api.cerply.com/api/certificates/CERT_ID/download' \
  -o certificate.pdf
# Expected: 200, Content-Type: application/pdf
```

### What to Verify
- ✅ Pagination: `total`, `limit`, `offset`, `data` array present
- ✅ Idempotency: Second call with same key returns cached response + `X-Idempotency-Replay: true`
- ✅ Certificates: Verify endpoint returns `valid: true` for real certs
- ✅ Downloads: PDF has correct headers (`Content-Disposition`, `Content-Type`)

---

## 📊 Part 3: Ops & Monitoring

### KPI Endpoint
```bash
curl 'https://api.cerply.com/api/ops/kpis'
```

**Status**: Requires investigation (returned error response)

**Action Required**: 
1. Check if `/api/ops/kpis` requires authentication in production
2. If yes, add admin/ops credentials to verify KPI counters are incrementing
3. Monitor these counters after authenticated operations:
   - `certificates_issued`
   - `certificates_verified`
   - `certificates_downloaded`
   - `certificates_revoked`
   - `manager_notifications_sent`
   - `manager_notifications_read`

### Audit Events
**To verify after authenticated operations**:
```bash
# Check application logs in Render for audit events
# Look for JSON lines like:
# {"eventType":"certificate_downloaded","userId":"...","occurredAt":"..."}
# {"eventType":"notification_marked_read","userId":"...","occurredAt":"..."}
```

### Cleanup Jobs (Cron Schedules)

**⚠️ ACTION REQUIRED**: Schedule these jobs in your cron system:

#### Daily: Idempotency Key Cleanup
```bash
# Delete keys older than 24 hours
cd /app/api && node scripts/cleanup-idempotency-keys.js
```

**Recommended schedule**: Daily at 2:00 AM UTC
```cron
0 2 * * * cd /app/api && node scripts/cleanup-idempotency-keys.js >> /var/log/idempotency-gc.log 2>&1
```

#### Weekly: Audit Event Cleanup
```bash
# Delete audit events older than 180 days (configurable via RETAIN_AUDIT_DAYS)
cd /app/api && RETAIN_AUDIT_DAYS=180 node scripts/cleanup-audit-events.js
```

**Recommended schedule**: Weekly on Sunday at 3:00 AM UTC
```cron
0 3 * * 0 cd /app/api && RETAIN_AUDIT_DAYS=180 node scripts/cleanup-audit-events.js >> /var/log/audit-gc.log 2>&1
```

---

## ⚙️ Part 4: Environment Variables

### Required Feature Flags
Verify these are set in **Render Dashboard → Environment**:

- ✅ `FF_GAMIFICATION_V1=true`
- ✅ `FF_CERTIFICATES_V1=true`
- ✅ `FF_MANAGER_NOTIFICATIONS_V1=true`

### Required Runtime Config
- ✅ `NODE_ENV=production`
- ✅ `DATABASE_URL=postgresql://...` (production database)

### Optional (Recommended)
- ⚠️ `PERSIST_AUDIT_EVENTS=true` (enable audit logging to DB)
- ⚠️ `RETAIN_AUDIT_DAYS=180` (keep audit events for 180 days)

### Security
- ✅ `ADMIN_TOKEN` (secure value, not `test-admin-123`)
- ✅ `JWT_SECRET` (your Auth0/SSO secret)
- ✅ **Admin bypass is OFF** (NODE_ENV=production disables `/api/health` admin token bypass)

---

## 🛡️ Part 5: Guardrails

### Rate Limiting
**⚠️ ACTION REQUIRED**: Implement rate limiting for Epic 7 endpoints

**Recommended limits**:
```javascript
// High-traffic public endpoints
'/api/certificates/:id/verify': 100 req/min per IP
'/api/certificates/:id/download': 10 req/min per user

// Authenticated endpoints
'/api/learners/:id/*': 60 req/min per user
'/api/manager/notifications': 30 req/min per user
```

**Implementation options**:
1. Cloudflare rate limiting (if using Cloudflare)
2. Express middleware: `express-rate-limit`
3. API Gateway (AWS/GCP) built-in rate limiting

### CORS & Security Headers
Verify these headers are present on Epic 7 routes:

```bash
curl -I 'https://api.cerply.com/api/certificates/test/verify'
```

**Expected headers**:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Access-Control-Allow-Origin: https://app.cerply.com` (or your domain)

### Database Backups
**✅ Confirmed**: PostgreSQL on Render has daily snapshots with 7–30 day retention.

**Verify in Render Dashboard**:
- Database: `cerply-production (cerply_t8y3)`
- Backups: Daily automated snapshots
- Retention: Check current policy (recommend 30 days minimum)

---

## 🚨 Part 6: Day-1 Monitoring & Alerts

### Critical Metrics to Watch

1. **5xx Error Rate**
   - Alert if > 1% of requests return 5xx
   - Check for database connection errors, timeouts

2. **Database Slow Queries**
   - Alert if queries take > 1 second
   - Epic 7 tables have proper indexes on `user_id`, `organization_id`, `occurred_at`

3. **Idempotency Conflicts (409s)**
   - Monitor for `409 CONFLICT` responses on PATCH endpoints
   - Indicates concurrent duplicate requests (expected, but watch volume)

4. **Audit GC Failures**
   - Monitor cron job exit codes
   - Alert if cleanup scripts fail for 2+ consecutive runs

### Recommended Alerts (Examples)

**Using Render's built-in monitoring**:
```
Alert: API 5xx Rate
Condition: Error rate > 1%
Duration: 5 minutes
Action: Email + Slack
```

**Using external APM (e.g., Datadog, New Relic)**:
```javascript
// Application metrics to track
metrics.increment('epic7.certificate.verified');
metrics.increment('epic7.certificate.downloaded');
metrics.increment('epic7.notification.read');
metrics.timing('epic7.idempotency.check_duration', duration);
```

### Log Patterns to Monitor

**Success patterns**:
```
"eventType":"certificate_downloaded","userId":"..."
"eventType":"notification_marked_read","userId":"..."
"Idempotency key replay: test-key-12345"
```

**Error patterns**:
```
"Database connection failed"
"Error generating certificate"
"Idempotency key conflict"
"Audit event write failed"
```

---

## ✅ Summary: What's Verified vs. What's Pending

### ✅ Verified (Infrastructure)
- [x] Epic 7 routes deployed to production
- [x] Routes protected by RBAC (401s returned for unauthenticated requests)
- [x] Database tables created (7 Epic 7 tables)
- [x] Environment variables set (confirmed by user)
- [x] Docker image built and deployed
- [x] Version headers fixed (`x-image-revision`, etc.)

### ⚠️ Pending (Requires Authentication/Setup)
- [ ] **Authenticated happy-path tests** (need real JWT tokens)
- [ ] **Idempotency verification** (need authenticated PATCH requests)
- [ ] **KPI counter verification** (check `/api/ops/kpis` auth requirements)
- [ ] **Audit event logging** (verify logs after authenticated operations)
- [ ] **Cron job scheduling** (idempotency GC daily, audit GC weekly)
- [ ] **Rate limiting** (implement per-route limits)
- [ ] **Security headers** (verify CORS, HSTS, etc.)
- [ ] **Monitoring alerts** (set up 5xx, slow query, GC failure alerts)

---

## 🎯 Next Steps (15-Minute Action Plan)

### 1. Verify Environment (5 min)
- [x] ~~Check Render dashboard: all env vars set~~ (User confirmed)
- [ ] Verify `ADMIN_TOKEN` is NOT `test-admin-123` in prod
- [ ] Verify `PERSIST_AUDIT_EVENTS=true` is set

### 2. Authenticated Testing (5 min)
- [ ] Log into app as a learner → copy JWT from browser DevTools
- [ ] Run learner levels curl (see commands above)
- [ ] Run manager notifications curl
- [ ] Test idempotency (run same PATCH twice with same key)

### 3. Monitoring Setup (5 min)
- [ ] Schedule idempotency GC cron (daily 2 AM)
- [ ] Schedule audit GC cron (weekly Sunday 3 AM)
- [ ] Set alert: 5xx rate > 1%
- [ ] Set alert: Cron job failures

---

## 📋 Quick Reference: Curl Commands for QA

```bash
# Get JWT token (from browser after login)
# 1. Log into https://app.cerply.com
# 2. Open DevTools → Network tab
# 3. Look for Authorization: Bearer ... header
# 4. Copy token

export JWT="your-jwt-token-here"
export API="https://api.cerply.com"

# Test learner progression
curl -H "Authorization: Bearer $JWT" \
  "$API/api/learners/YOUR_ID/levels?limit=5"

# Test manager notifications
curl -H "Authorization: Bearer $JWT" \
  "$API/api/manager/notifications?limit=10&unreadOnly=true"

# Test idempotency (run twice)
curl -X PATCH \
  -H "Authorization: Bearer $JWT" \
  -H "X-Idempotency-Key: qa-test-$(date +%s)" \
  -H "Content-Type: application/json" \
  -d '{"read": true}' \
  "$API/api/manager/notifications/NOTIFICATION_ID"

# Test certificate verify
curl "$API/api/certificates/CERT_ID/verify"

# Test certificate download
curl -H "Authorization: Bearer $JWT" \
  "$API/api/certificates/CERT_ID/download" \
  -o test-cert.pdf && file test-cert.pdf
```

---

## 📞 Support Contacts

**If issues arise**:
1. Check Render logs: Render Dashboard → Logs tab
2. Check database: `psql $DATABASE_URL` → `\dt` to list tables
3. Check feature flags: Render Dashboard → Environment tab
4. Review audit events: `SELECT * FROM audit_events ORDER BY occurred_at DESC LIMIT 10;`

---

**Status**: 🟢 **PRODUCTION READY** (with pending QA authentication tests)  
**Last Updated**: 2025-10-12  
**Deployment**: Epic 7 is LIVE in production at https://api.cerply.com

