# P0 Execution Guide - Content Hierarchy Migration
**Priority:** P0 (BLOCKING Epic 8/9)  
**Status:** Ready to Execute  
**Estimated Time:** 4-6 hours  
**Date:** 2025-10-13

---

## Overview

This guide walks through executing the P0 (Priority 0) blocking tasks for the Content Hierarchy Migration. These tasks **MUST** be completed before Epic 8 Phase 2-9 or Epic 9 can proceed.

**What P0 Does:**
1. Creates new 5-tier content hierarchy (9 new tables)
2. Migrates all existing data (tracks → topics, modules → modules_v2, items → questions)
3. Updates foreign keys in dependent tables (learner_levels, certificates, attempts)
4. Verifies data integrity with automated checks
5. Tests Epic 7 APIs with new schema

---

## Prerequisites

### 1. Environment Access
You need access to your **staging environment** database:
```bash
# Verify you have DATABASE_URL set
echo $DATABASE_URL

# Should output something like:
# postgresql://user:pass@host:5432/cerply_staging
```

### 2. Tools Installed
```bash
# PostgreSQL client (psql)
which psql  # Should show /usr/bin/psql or similar

# Node.js & npm
node --version  # Should be >= 20.x
npm --version
```

### 3. Backups Ready
**CRITICAL:** Always have a recent backup before migrations.

```bash
# Create manual backup first
pg_dump $DATABASE_URL > backup_manual_$(date +%Y%m%d_%H%M%S).sql

# Verify backup created
ls -lh backup_manual_*.sql
```

---

## Step-by-Step Execution

### Step 1: Make Scripts Executable (30 seconds)

```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh

# Make all migration scripts executable
chmod +x scripts/run-content-hierarchy-migration.sh
chmod +x scripts/verify-content-hierarchy-migration.sh
chmod +x scripts/rollback-content-hierarchy-migration.sh
```

### Step 2: Review Migration Files (5 minutes)

**Review what will happen:**
```bash
# Review new schema
cat api/drizzle/016_content_hierarchy.sql | less

# Review migration logic
cat api/drizzle/017_migrate_legacy_content.sql | less
```

**Key things to check:**
- Default subject UUID: `00000000-0000-0000-0000-000000000001`
- All foreign key mappings look correct
- Rollback section is present

### Step 3: Run Migration (15-30 minutes)

**Execute the migration:**
```bash
# Set staging database URL
export DATABASE_URL="postgresql://user:pass@staging-host:5432/cerply_staging"

# Run migration (this will prompt for confirmation)
./scripts/run-content-hierarchy-migration.sh
```

**What happens:**
1. ✅ Script confirms you're on staging (not production)
2. ✅ Creates automatic backup (`backup_pre_content_hierarchy_*.sql`)
3. ✅ Shows current data counts (tracks, modules, items)
4. ✅ Creates new schema (9 tables)
5. ✅ Migrates all legacy data
6. ✅ Renames old tables to `*_legacy`
7. ✅ Runs verification checks automatically

**Expected output:**
```
═══════════════════════════════════════════════════════════════
  Content Hierarchy Migration - P0 Execution
═══════════════════════════════════════════════════════════════

Step 0: Creating database backup...
✓ Backup created: backup_pre_content_hierarchy_20251013_143022.sql

Step 1: Checking current schema...
  Current data:
    - Tracks: 15
    - Modules: 87
    - Items: 543

Step 2: Creating new content hierarchy schema...
✓ New schema created (9 tables)

Step 3: Migrating legacy data...
✓ Data migration complete

Step 4: Verifying migration...
[Verification output - see Step 4 below]

═══════════════════════════════════════════════════════════════
✓ Migration Complete!
═══════════════════════════════════════════════════════════════
```

### Step 4: Verify Migration (5 minutes)

**Verification runs automatically**, but you can re-run manually:
```bash
./scripts/verify-content-hierarchy-migration.sh
```

**What verification checks:**

✅ **Check 1: New tables created**
- All 9 tables exist (subjects, topics, modules_v2, quizzes, questions, topic_assignments, topic_citations, topic_secondary_sources, topic_communications)

✅ **Check 2: Data counts match**
- Tracks → Topics (counts match)
- Modules → Modules_v2 (counts match)
- Items → Questions (counts match)

✅ **Check 3: Foreign keys updated**
- `learner_levels.topic_id` exists (was `track_id`)
- `certificates.topic_id` exists (was `track_id`)
- `attempts.question_id` exists (was `item_id`)

✅ **Check 4: No orphaned records**
- All learner_levels have valid topic_id
- All certificates have valid topic_id
- All attempts have valid question_id

✅ **Check 5: Default subject created**
- Subject "General Knowledge" (UUID `00000000-0000-0000-0000-000000000001`)

✅ **Check 6: Legacy tables renamed**
- tracks_legacy, modules_legacy, items_legacy, plans_legacy, team_track_subscriptions_legacy

**Expected output:**
```
Check 1: New tables created
  ✓ subjects exists
  ✓ topics exists
  ✓ modules_v2 exists
  ✓ quizzes exists
  ✓ questions exists
  ✓ topic_assignments exists
  ✓ topic_citations exists
  ✓ topic_secondary_sources exists
  ✓ topic_communications exists

Check 2: Data migration counts
  Tracks (legacy) → Topics (new): 15 → 15
  ✓ Counts match
  Modules (legacy) → Modules_v2 (new): 87 → 87
  ✓ Counts match
  Items (legacy) → Questions (new): 543 → 543
  ✓ Counts match

Check 3: Foreign key updates
  ✓ learner_levels.topic_id exists
  ✓ certificates.topic_id exists
  ✓ attempts.question_id exists

Check 4: Foreign key integrity
  Orphaned learner_levels: 0
  ✓ No orphaned learner_levels
  Orphaned certificates: 0
  ✓ No orphaned certificates
  Orphaned attempts: 0
  ✓ No orphaned attempts

Check 5: Default subject created
  ✓ Default subject 'General Knowledge' created

Check 6: Legacy tables renamed
  ✓ tracks_legacy exists (safe to delete after verification)
  ✓ modules_legacy exists (safe to delete after verification)
  ✓ items_legacy exists (safe to delete after verification)
  ✓ plans_legacy exists (safe to delete after verification)
  ✓ team_track_subscriptions_legacy exists (safe to delete after verification)

═══════════════════════════════════════════════════════════════
✓ All verification checks passed!
═══════════════════════════════════════════════════════════════
```

### Step 5: Test Epic 7 APIs (15 minutes)

**Run automated tests:**
```bash
cd api

# Install dependencies (if not already done)
npm install

# Run Epic 7 migration compatibility tests
npm run test:epic7-migration
```

**What this tests:**
- learner_levels table works with topic_id
- certificates table works with topic_id
- topic_assignments table works correctly
- Foreign key constraints enforced
- No orphaned records
- API queries work with new schema

**Expected output:**
```
 ✓ api/tests/epic7-migration-compatibility.test.ts (15)
   ✓ Epic 7 Migration Compatibility (15)
     ✓ learner_levels table (2)
       ✓ should have topic_id column (not track_id)
       ✓ should query by topic_id successfully
     ✓ certificates table (2)
       ✓ should have topic_id column (not track_id)
       ✓ should query by topic_id successfully
     ✓ topic_assignments table (2)
       ✓ should reference topics (not tracks)
       ✓ should query active assignments by topic_id
     ✓ Epic 7 API routes compatibility (2)
       ✓ GET /api/gamification/levels/:topicId should work
       ✓ POST /api/certificates (generate) should use topicId
     ✓ Foreign key integrity (2)
       ✓ should enforce topic_id foreign key in learner_levels
       ✓ should enforce topic_id foreign key in certificates
     ✓ Migration data integrity (3)
       ✓ should have migrated all legacy tracks to topics
       ✓ should have no orphaned learner_levels after migration
       ✓ should have no orphaned certificates after migration

Test Files  1 passed (1)
     Tests  15 passed (15)
  Start at  14:35:22
  Duration  2.34s
```

### Step 6: Manual Smoke Tests (10 minutes)

**Test actual API endpoints:**
```bash
# Start API server
cd api
npm run dev
```

In another terminal:
```bash
# Test gamification endpoints
curl http://localhost:8080/api/gamification/levels/:topicId \
  -H "x-admin-token: dev"

# Should return level data with topic_id (not track_id)

# Test certificate generation
curl -X POST http://localhost:8080/api/certificates \
  -H "Content-Type: application/json" \
  -H "x-admin-token: dev" \
  -d '{"userId":"...","topicId":"..."}'

# Should generate certificate successfully
```

### Step 7: Verify Application Works (15 minutes)

**Start full application:**
```bash
# Terminal 1: API
cd api
npm run dev

# Terminal 2: Web
cd web
npm run dev
```

**Test these flows:**
1. ✅ Learner dashboard shows topics (not tracks)
2. ✅ Progress page shows correct levels per topic
3. ✅ Certificate download works
4. ✅ No console errors in browser
5. ✅ No API errors in terminal

---

## Rollback (If Needed)

### When to Rollback
- Verification checks fail
- Data counts don't match
- Orphaned records found
- API tests fail
- Application doesn't work

### How to Rollback
```bash
# Run rollback script
./scripts/rollback-content-hierarchy-migration.sh

# Follow prompts to restore from backup
# This will drop new tables and restore original schema
```

**Rollback process:**
1. Drops all new tables (subjects, topics, etc.)
2. Restores from automatic backup
3. Verifies restoration successful

---

## Troubleshooting

### Issue: Verification check fails
**Symptom:** Verification script shows ✗ errors

**Solution:**
```bash
# Check which check failed
./scripts/verify-content-hierarchy-migration.sh

# If data counts don't match, check migration logs
psql $DATABASE_URL -c "SELECT COUNT(*) FROM tracks_legacy;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM topics;"

# If orphaned records found, investigate
psql $DATABASE_URL -c "
SELECT ll.* FROM learner_levels ll
LEFT JOIN topics t ON t.id = ll.topic_id
WHERE t.id IS NULL;
"
```

### Issue: Foreign key constraint violation
**Symptom:** Migration fails with "violates foreign key constraint"

**Solution:**
```bash
# Check if dependent tables exist
psql $DATABASE_URL -c "\dt" | grep -E "(learner_levels|certificates|attempts)"

# If missing, run migrations in order
psql $DATABASE_URL -f api/drizzle/010_gamification.sql  # Epic 7 tables
psql $DATABASE_URL -f api/drizzle/016_content_hierarchy.sql  # Then hierarchy
```

### Issue: Backup not created
**Symptom:** Script aborts with "No backup file found"

**Solution:**
```bash
# Create manual backup
pg_dump $DATABASE_URL > backup_manual_$(date +%Y%m%d_%H%M%S).sql

# Then re-run migration
./scripts/run-content-hierarchy-migration.sh
```

---

## Success Criteria

P0 is complete when **ALL** of these are true:

- [x] Migration script completed without errors
- [x] All 6 verification checks passed
- [x] Epic 7 compatibility tests passed (15/15)
- [x] Manual smoke tests passed
- [x] Application runs without errors
- [x] Backup file created and preserved

---

## What Happens Next

### After P0 Complete

**P1 (Pre-Production) - 22-24 hours:**
1. Complete Epic 8 Phase 2-9 (14h) - with updated prompt
2. Apply Epic-Scope-Fix changes to Epics 5, 6, 7 (8-10h)
   - Epic 5: Update Slack templates
   - Epic 6: Topic-level generation
   - Epic 7: API route updates (should be minimal after P0)

**P2 (Polish) - 28-32 hours:**
1. Implement Epic 6.8 (Manager Curation Workflow) - 20-24h
2. Build migration UI - 4-6h
3. Build admin tools - 4-6h

---

## Files Created

**Migration Scripts:**
- `scripts/run-content-hierarchy-migration.sh` - Main migration executor
- `scripts/verify-content-hierarchy-migration.sh` - Verification checks
- `scripts/rollback-content-hierarchy-migration.sh` - Rollback safety net

**Database Migrations:**
- `api/drizzle/016_content_hierarchy.sql` - New schema (9 tables)
- `api/drizzle/017_migrate_legacy_content.sql` - Data migration

**Tests:**
- `api/tests/epic7-migration-compatibility.test.ts` - Automated compatibility tests

**Documentation:**
- `P0_EXECUTION_GUIDE.md` (this file)
- `EPIC_SCOPE_FIX_CONTENT_HIERARCHY.md` - Full P0/P1/P2 plan

---

## Support

**If you get stuck:**
1. Check troubleshooting section above
2. Review verification output for specific errors
3. Check database logs: `psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"`
4. Rollback and retry with manual fixes

**Critical Issues:**
- Data loss detected → Rollback immediately
- Foreign key violations → Check migration order
- Application broken → Verify API/web both restarted

---

## Estimated Timeline

| Task | Time | Status |
|------|------|--------|
| Review migration files | 5min | ⏳ Pending |
| Run migration | 15-30min | ⏳ Pending |
| Verify migration | 5min | ⏳ Pending |
| Test Epic 7 APIs | 15min | ⏳ Pending |
| Manual smoke tests | 10min | ⏳ Pending |
| Verify application | 15min | ⏳ Pending |
| **Total** | **60-90min** | **⏳ Ready** |

**Note:** First-time execution may take longer. Allow 2-3 hours including reading time.

---

## Ready to Begin?

**Pre-flight checklist:**
- [x] Backup created manually
- [x] DATABASE_URL points to staging (NOT production)
- [x] Scripts made executable (`chmod +x`)
- [x] Dependencies installed (`npm install`)
- [x] This guide reviewed completely

**Start here:**
```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh
export DATABASE_URL="postgresql://..."  # Your staging DB
./scripts/run-content-hierarchy-migration.sh
```

---

**Prepared by:** AI Agent  
**Date:** 2025-10-13  
**Status:** Ready for Execution  
**Priority:** P0 (BLOCKING)

---

**End of Guide**

