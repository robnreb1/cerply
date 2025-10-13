#!/bin/bash
################################################################################
# Content Hierarchy Migration - P0 Execution Script
# Epic: Epic-Scope-Fix (Content Hierarchy Refactor)
# Status: P0 - BLOCKING Epic 8/9
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "═══════════════════════════════════════════════════════════════"
echo "  Content Hierarchy Migration - P0 Execution"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check environment
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}ERROR: DATABASE_URL not set${NC}"
  echo "Please set DATABASE_URL environment variable"
  exit 1
fi

# Confirm staging environment
echo -e "${YELLOW}⚠️  WARNING: This migration is DESTRUCTIVE${NC}"
echo ""
echo "This will:"
echo "  - Create 9 new tables"
echo "  - Rename 5 existing tables to *_legacy"
echo "  - Migrate all data to new schema"
echo "  - Update foreign keys in dependent tables"
echo ""
read -p "Are you running this on STAGING (not production)? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}Aborted. Please run on staging first.${NC}"
  exit 1
fi

# Backup database first
echo ""
echo "Step 0: Creating database backup..."
BACKUP_FILE="backup_pre_content_hierarchy_$(date +%Y%m%d_%H%M%S).sql"
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
echo "  Keep this file until migration is verified successful."

# Check current schema
echo ""
echo "Step 1: Checking current schema..."
TRACKS_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM tracks" 2>/dev/null || echo "0")
MODULES_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM modules" 2>/dev/null || echo "0")
ITEMS_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM items" 2>/dev/null || echo "0")

echo "  Current data:"
echo "    - Tracks: $TRACKS_COUNT"
echo "    - Modules: $MODULES_COUNT"
echo "    - Items: $ITEMS_COUNT"

if [ "$TRACKS_COUNT" -eq 0 ]; then
  echo -e "${YELLOW}⚠️  No tracks found. Migration will still create schema.${NC}"
fi

# Run migration 016 (new schema)
echo ""
echo "Step 2: Creating new content hierarchy schema..."
psql "$DATABASE_URL" -f api/drizzle/016_content_hierarchy_v2.sql
echo -e "${GREEN}✓ New schema created (9 tables)${NC}"

# Run migration 017 (data migration)
echo ""
echo "Step 3: Migrating legacy data..."
echo "  This may take a few minutes for large databases..."
psql "$DATABASE_URL" -f api/drizzle/017_migrate_legacy_content_v2.sql
echo -e "${GREEN}✓ Data migration complete${NC}"

# Verify migration
echo ""
echo "Step 4: Verifying migration..."
./scripts/verify-content-hierarchy-migration.sh

# Success
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ Migration Complete!${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Review verification results above"
echo "  2. Test Epic 7 APIs with new topic_id columns"
echo "  3. Run: npm run test:epic7-migration"
echo "  4. If issues found, run: ./scripts/rollback-content-hierarchy-migration.sh"
echo ""
echo "Backup location: $BACKUP_FILE"
echo ""

