# Production Rollback Runbook - M3 API

**Purpose:** Safely roll back the M3 API deployment to a previous stable version.  
**Audience:** DevOps, SRE, Engineering Leads  
**SLA:** < 15 minutes to complete rollback  

---

## 🚨 When to Rollback

Trigger a rollback if:

- [ ] **Critical bugs** affecting > 10% of users
- [ ] **Data corruption** or integrity issues
- [ ] **Performance degradation** (API latency > 5s)
- [ ] **Security vulnerabilities** discovered post-deployment
- [ ] **Smoke tests failing** consistently (> 3 consecutive failures)
- [ ] **Staging monitor** shows sustained failures (> 10 failures in 1 hour)

**⚠️ Do NOT rollback for:**
- Single transient errors
- Non-critical UI bugs
- Feature flags already disabled
- Issues resolved by config changes

---

## 📋 Pre-Rollback Checklist

Before initiating rollback:

1. **Verify the issue:**
   - [ ] Check production logs: `kubectl logs -n prod -l app=cerply-api --tail=100`
   - [ ] Run smoke tests: `./api/scripts/smoke-m3.sh https://api.cerply.com`
   - [ ] Check monitoring dashboards (Grafana/Datadog)

2. **Identify target version:**
   - [ ] Get current version: `curl -sS https://api.cerply.com/api/version | jq -r '.commit'`
   - [ ] Find last known good SHA from: `STAGING_TEST_REPORT.md` or Git history
   - [ ] Verify target image exists: `docker pull ghcr.io/robnreb1/cerply-api:<target-sha>`

3. **Notify stakeholders:**
   - [ ] Post in Slack #eng-incidents: "🚨 Rolling back prod API to <target-sha> due to <reason>"
   - [ ] Tag @oncall-engineer
   - [ ] Update status page (if applicable)

---

## 🔄 Rollback Procedure

### Option A: Automated Rollback Script (Recommended)

**Duration:** ~5 minutes

```bash
# 1. Navigate to project root
cd /path/to/cerply

# 2. Identify target SHA (last known good)
TARGET_SHA="abc1234"  # Replace with actual SHA

# 3. Run rollback script
chmod +x api/scripts/retag-prod.sh
./api/scripts/retag-prod.sh "$TARGET_SHA"

# Expected output:
# ✅ Backup created: ghcr.io/robnreb1/cerply-api:prod-rollback-20251006-103045
# ✅ prod-latest now points to abc1234
# ✅ Rollback successful!

# 4. Trigger Render redeploy (if not automatic)
# Option A: Via deploy hook
curl -X POST "$RENDER_PROD_DEPLOY_HOOK"

# Option B: Manually at https://dashboard.render.com

# 5. Verify rollback
./api/scripts/post-deploy-verify.sh https://api.cerply.com

# Expected: "✅ PASSED (31/31 assertions)"
```

---

### Option B: Manual Rollback (If Script Fails)

**Duration:** ~10 minutes

```bash
# 1. Authenticate to GitHub Container Registry
echo "$GITHUB_TOKEN" | docker login ghcr.io -u <username> --password-stdin

# 2. Pull target image
docker pull ghcr.io/robnreb1/cerply-api:abc1234

# 3. Backup current prod-latest
docker pull ghcr.io/robnreb1/cerply-api:prod-latest
docker tag ghcr.io/robnreb1/cerply-api:prod-latest \
  ghcr.io/robnreb1/cerply-api:prod-rollback-$(date +%Y%m%d-%H%M%S)
docker push ghcr.io/robnreb1/cerply-api:prod-rollback-$(date +%Y%m%d-%H%M%S)

# 4. Retag prod-latest to target SHA
docker tag ghcr.io/robnreb1/cerply-api:abc1234 \
  ghcr.io/robnreb1/cerply-api:prod-latest
docker push ghcr.io/robnreb1/cerply-api:prod-latest

# 5. Trigger Render redeploy
curl -X POST "$RENDER_PROD_DEPLOY_HOOK"

# 6. Wait for deployment (usually 2-3 minutes)
watch -n 5 'curl -sS https://api.cerply.com/api/health | jq -r ".ok"'

# 7. Verify
./api/scripts/post-deploy-verify.sh https://api.cerply.com
```

---

## ✅ Post-Rollback Verification

After rollback completes:

### 1. Health Check
```bash
curl -sS https://api.cerply.com/api/health | jq
# Expected: {"ok": true, ...}
```

### 2. Version Check
```bash
curl -sS https://api.cerply.com/api/version | jq -r '.commit'
# Should match target SHA: abc1234
```

### 3. Smoke Tests
```bash
./api/scripts/smoke-m3.sh https://api.cerply.com
# Expected: ✅ All M3 smoke tests passed (31/31)
```

### 4. Performance Check
```bash
# Monitor API latency for 5 minutes
for i in {1..10}; do
  curl -sS -w "\nTime: %{time_total}s\n" -o /dev/null \
    -X POST https://api.cerply.com/api/preview \
    -H "Content-Type: application/json" \
    -d '{"content":"Test"}'
  sleep 30
done
# Expected: All requests < 1s
```

### 5. User Impact Assessment
```bash
# Check error rates in last 10 minutes
curl -sS "https://api.cerply.com/api/ops/usage/daily" | jq '.today.errors'
# Should be decreasing after rollback
```

---

## 📊 Monitoring Post-Rollback

**Watch for 30 minutes after rollback:**

| Metric | Tool | Threshold | Action if Breached |
|--------|------|-----------|-------------------|
| API Error Rate | Logs | < 1% | Investigate logs |
| P95 Latency | Datadog | < 500ms | Check infra |
| Smoke Test Pass | CI | 100% | Re-rollback if needed |
| User Reports | Slack | < 2 | Normal operations |

---

## 🔙 Rollback of Rollback (Forward Fix)

If rollback causes new issues:

```bash
# 1. Find the rollback backup tag
docker pull ghcr.io/robnreb1/cerply-api:prod-rollback-20251006-103045

# 2. Retag back to prod-latest
docker tag ghcr.io/robnreb1/cerply-api:prod-rollback-20251006-103045 \
  ghcr.io/robnreb1/cerply-api:prod-latest
docker push ghcr.io/robnreb1/cerply-api:prod-latest

# 3. Redeploy
curl -X POST "$RENDER_PROD_DEPLOY_HOOK"

# 4. Verify
./api/scripts/post-deploy-verify.sh https://api.cerply.com
```

---

## 🔍 Root Cause Analysis

After successful rollback, within 24 hours:

1. **Create incident report:** `docs/incidents/YYYY-MM-DD-m3-rollback.md`
2. **Identify root cause:** Code bug? Config issue? Infrastructure?
3. **Document timeline:** When detected → rollback decision → completion
4. **Action items:** Preventive measures, additional tests, monitoring
5. **Update runbook:** If procedure deviated, document learnings

---

## 📚 Related Documentation

- **Deployment Guide:** `docs/runbooks/web-deployment-troubleshooting.md`
- **Staging Tests:** `STAGING_TEST_REPORT.md`
- **Production Tests:** `PROD_TEST_REPORT.md`
- **Epic:** `EPIC_M3_API_SURFACE.md`
- **Smoke Script:** `api/scripts/smoke-m3.sh`
- **Verify Script:** `api/scripts/post-deploy-verify.sh`
- **Rollback Script:** `api/scripts/retag-prod.sh`

---

## 🆘 Emergency Contacts

| Role | Contact | Slack | Availability |
|------|---------|-------|--------------|
| On-call Engineer | @oncall-engineer | #eng-oncall | 24/7 |
| DevOps Lead | @devops-lead | #devops | Business hours |
| CTO | @cto | #leadership | Emergency only |

---

## 🧪 Dry-Run Test (Recommended Quarterly)

To ensure rollback procedure works:

```bash
# 1. In staging environment
TARGET_SHA=$(curl -sS https://cerply-api-staging-latest.onrender.com/api/version | jq -r '.commit')

# 2. Simulate rollback
./api/scripts/retag-prod.sh "$TARGET_SHA" --dry-run

# 3. Verify no errors
echo "Dry-run completed successfully"

# 4. Document in: docs/runbooks/dry-run-log.md
```

---

**Last Updated:** 2025-10-06  
**Version:** 1.0  
**Owner:** DevOps Team  
**Review Cycle:** Quarterly

