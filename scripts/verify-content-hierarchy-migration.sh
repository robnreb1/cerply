#!/bin/bash
################################################################################
# Content Hierarchy Migration - Verification Script
# Verifies data integrity after migration
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Running migration verification checks..."
echo ""

ERRORS=0

# Check 1: Verify new tables exist
echo "Check 1: New tables created"
TABLES=("subjects" "topics" "modules_v2" "quizzes" "questions" "topic_assignments" "topic_citations" "topic_secondary_sources" "topic_communications")
for table in "${TABLES[@]}"; do
  COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='$table'" 2>/dev/null || echo "0")
  if [ "$COUNT" -eq 1 ]; then
    echo -e "  ${GREEN}✓${NC} $table exists"
  else
    echo -e "  ${RED}✗${NC} $table missing"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check 2: Verify data counts match
echo ""
echo "Check 2: Data migration counts"

TRACKS_LEGACY=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM tracks_legacy" 2>/dev/null || echo "0")
TOPICS_NEW=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM topics" 2>/dev/null || echo "0")
echo "  Tracks (legacy) → Topics (new): $TRACKS_LEGACY → $TOPICS_NEW"
if [ "$TRACKS_LEGACY" -eq "$TOPICS_NEW" ]; then
  echo -e "  ${GREEN}✓${NC} Counts match"
else
  echo -e "  ${RED}✗${NC} Count mismatch!"
  ERRORS=$((ERRORS + 1))
fi

MODULES_LEGACY=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM modules_legacy" 2>/dev/null || echo "0")
MODULES_NEW=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM modules_v2" 2>/dev/null || echo "0")
echo "  Modules (legacy) → Modules_v2 (new): $MODULES_LEGACY → $MODULES_NEW"
if [ "$MODULES_LEGACY" -eq "$MODULES_NEW" ]; then
  echo -e "  ${GREEN}✓${NC} Counts match"
else
  echo -e "  ${RED}✗${NC} Count mismatch!"
  ERRORS=$((ERRORS + 1))
fi

ITEMS_LEGACY=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM items_legacy" 2>/dev/null || echo "0")
QUESTIONS_NEW=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM questions" 2>/dev/null || echo "0")
echo "  Items (legacy) → Questions (new): $ITEMS_LEGACY → $QUESTIONS_NEW"
if [ "$ITEMS_LEGACY" -eq "$QUESTIONS_NEW" ]; then
  echo -e "  ${GREEN}✓${NC} Counts match"
else
  echo -e "  ${RED}✗${NC} Count mismatch!"
  ERRORS=$((ERRORS + 1))
fi

# Check 3: Verify foreign keys updated
echo ""
echo "Check 3: Foreign key updates"

# Check learner_levels.topic_id exists (was track_id)
TOPIC_ID_COL=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='learner_levels' AND column_name='topic_id'" 2>/dev/null || echo "0")
if [ "$TOPIC_ID_COL" -eq 1 ]; then
  echo -e "  ${GREEN}✓${NC} learner_levels.topic_id exists"
else
  echo -e "  ${RED}✗${NC} learner_levels.topic_id missing"
  ERRORS=$((ERRORS + 1))
fi

# Check certificates.topic_id exists (was track_id)
CERT_TOPIC_ID=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='certificates' AND column_name='topic_id'" 2>/dev/null || echo "0")
if [ "$CERT_TOPIC_ID" -eq 1 ]; then
  echo -e "  ${GREEN}✓${NC} certificates.topic_id exists"
else
  echo -e "  ${RED}✗${NC} certificates.topic_id missing"
  ERRORS=$((ERRORS + 1))
fi

# Check attempts.question_id exists (was item_id)
QUESTION_ID_COL=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='attempts' AND column_name='question_id'" 2>/dev/null || echo "0")
if [ "$QUESTION_ID_COL" -eq 1 ]; then
  echo -e "  ${GREEN}✓${NC} attempts.question_id exists"
else
  echo -e "  ${RED}✗${NC} attempts.question_id missing"
  ERRORS=$((ERRORS + 1))
fi

# Check 4: Verify no orphaned records
echo ""
echo "Check 4: Foreign key integrity"

ORPHANED_LEVELS=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM learner_levels ll LEFT JOIN topics t ON t.id = ll.topic_id WHERE t.id IS NULL" 2>/dev/null || echo "0")
echo "  Orphaned learner_levels: $ORPHANED_LEVELS"
if [ "$ORPHANED_LEVELS" -eq 0 ]; then
  echo -e "  ${GREEN}✓${NC} No orphaned learner_levels"
else
  echo -e "  ${RED}✗${NC} Found orphaned records!"
  ERRORS=$((ERRORS + 1))
fi

ORPHANED_CERTS=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM certificates c LEFT JOIN topics t ON t.id = c.topic_id WHERE t.id IS NULL" 2>/dev/null || echo "0")
echo "  Orphaned certificates: $ORPHANED_CERTS"
if [ "$ORPHANED_CERTS" -eq 0 ]; then
  echo -e "  ${GREEN}✓${NC} No orphaned certificates"
else
  echo -e "  ${RED}✗${NC} Found orphaned records!"
  ERRORS=$((ERRORS + 1))
fi

ORPHANED_ATTEMPTS=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM attempts a LEFT JOIN questions q ON q.id = a.question_id WHERE q.id IS NULL" 2>/dev/null || echo "0")
echo "  Orphaned attempts: $ORPHANED_ATTEMPTS"
if [ "$ORPHANED_ATTEMPTS" -eq 0 ]; then
  echo -e "  ${GREEN}✓${NC} No orphaned attempts"
else
  echo -e "  ${RED}✗${NC} Found orphaned records!"
  ERRORS=$((ERRORS + 1))
fi

# Check 5: Verify default subject created
echo ""
echo "Check 5: Default subject created"
DEFAULT_SUBJECT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM subjects WHERE id='00000000-0000-0000-0000-000000000001'::UUID" 2>/dev/null || echo "0")
if [ "$DEFAULT_SUBJECT" -eq 1 ]; then
  echo -e "  ${GREEN}✓${NC} Default subject 'General Knowledge' created"
else
  echo -e "  ${YELLOW}⚠${NC} Default subject not found (may be expected if no legacy data)"
fi

# Check 6: Verify legacy tables renamed
echo ""
echo "Check 6: Legacy tables renamed"
LEGACY_TABLES=("tracks_legacy" "modules_legacy" "items_legacy" "plans_legacy" "team_track_subscriptions_legacy")
for table in "${LEGACY_TABLES[@]}"; do
  COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='$table'" 2>/dev/null || echo "0")
  if [ "$COUNT" -eq 1 ]; then
    echo -e "  ${GREEN}✓${NC} $table exists (safe to delete after verification)"
  else
    echo -e "  ${YELLOW}⚠${NC} $table not found (may not exist if table was empty)"
  fi
done

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}✓ All verification checks passed!${NC}"
  echo "═══════════════════════════════════════════════════════════════"
  exit 0
else
  echo -e "${RED}✗ $ERRORS verification check(s) failed${NC}"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  echo "Please review errors above and consider rollback if needed."
  echo "Rollback: ./scripts/rollback-content-hierarchy-migration.sh"
  exit 1
fi

