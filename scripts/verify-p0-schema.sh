#!/bin/bash
################################################################################
# P0 Schema Verification - Quick Check
# Verifies that P0 migration completed successfully
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "P0 Schema Verification"
echo "====================="
echo ""

if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}ERROR: DATABASE_URL not set${NC}"
  exit 1
fi

PASSED=0
FAILED=0

# Check 1: New tables exist
echo "Check 1: New content hierarchy tables"
for table in topics modules_v2 quizzes questions topic_assignments topic_citations topic_secondary_sources topic_communications; do
  COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='$table'" 2>/dev/null || echo "0")
  if [ "$COUNT" -eq 1 ]; then
    echo -e "  ${GREEN}✓${NC} $table"
    PASSED=$((PASSED + 1))
  else
    echo -e "  ${RED}✗${NC} $table MISSING"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "Check 2: Updated columns in existing tables"
# Check learner_levels.topic_id
if psql "$DATABASE_URL" -tAc "SELECT column_name FROM information_schema.columns WHERE table_name='learner_levels' AND column_name='topic_id'" 2>/dev/null | grep -q "topic_id"; then
  echo -e "  ${GREEN}✓${NC} learner_levels.topic_id"
  PASSED=$((PASSED + 1))
else
  echo -e "  ${RED}✗${NC} learner_levels.topic_id MISSING"
  FAILED=$((FAILED + 1))
fi

# Check certificates.topic_id
if psql "$DATABASE_URL" -tAc "SELECT column_name FROM information_schema.columns WHERE table_name='certificates' AND column_name='topic_id'" 2>/dev/null | grep -q "topic_id"; then
  echo -e "  ${GREEN}✓${NC} certificates.topic_id"
  PASSED=$((PASSED + 1))
else
  echo -e "  ${RED}✗${NC} certificates.topic_id MISSING"
  FAILED=$((FAILED + 1))
fi

# Check attempts.question_id
if psql "$DATABASE_URL" -tAc "SELECT column_name FROM information_schema.columns WHERE table_name='attempts' AND column_name='question_id'" 2>/dev/null | grep -q "question_id"; then
  echo -e "  ${GREEN}✓${NC} attempts.question_id"
  PASSED=$((PASSED + 1))
else
  echo -e "  ${RED}✗${NC} attempts.question_id MISSING"
  FAILED=$((FAILED + 1))
fi

echo ""
echo "Check 3: Default subject exists"
if psql "$DATABASE_URL" -tAc "SELECT id FROM subjects WHERE id='00000000-0000-0000-0000-000000000001'::UUID" 2>/dev/null | grep -q "00000000"; then
  echo -e "  ${GREEN}✓${NC} Default subject 'General Knowledge' exists"
  PASSED=$((PASSED + 1))
else
  echo -e "  ${RED}✗${NC} Default subject MISSING"
  FAILED=$((FAILED + 1))
fi

echo ""
echo "========================================"
echo "Results: $PASSED passed, $FAILED failed"
echo "========================================"

if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}✓ P0 Migration Verified Successfully!${NC}"
  echo ""
  echo "Your database is ready for:"
  echo "  - Epic 6 (Ensemble Content Generation)"
  echo "  - Epic 8 Phase 2-9 (Conversational UI)"
  echo "  - Epic 9 (Adaptive Difficulty)"
  exit 0
else
  echo -e "${RED}✗ P0 Migration Incomplete${NC}"
  echo "Please review failed checks above"
  exit 1
fi

