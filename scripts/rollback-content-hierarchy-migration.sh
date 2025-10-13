#!/bin/bash
################################################################################
# Content Hierarchy Migration - ROLLBACK Script
# Use this if migration fails or data integrity issues found
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "═══════════════════════════════════════════════════════════════"
echo "  Content Hierarchy Migration - ROLLBACK"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check environment
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}ERROR: DATABASE_URL not set${NC}"
  exit 1
fi

# Confirm rollback
echo -e "${RED}⚠️  WARNING: This will UNDO the content hierarchy migration${NC}"
echo ""
echo "This will:"
echo "  - Drop all new tables (subjects, topics, modules_v2, etc.)"
echo "  - Restore original tables (tracks, modules, items)"
echo "  - Restore original foreign keys"
echo ""
read -p "Are you sure you want to rollback? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

# Check if backup exists
LATEST_BACKUP=$(ls -t backup_pre_content_hierarchy_*.sql 2>/dev/null | head -n 1 || echo "")
if [ -z "$LATEST_BACKUP" ]; then
  echo -e "${RED}ERROR: No backup file found!${NC}"
  echo "Cannot rollback without backup."
  echo "Expected file: backup_pre_content_hierarchy_YYYYMMDD_HHMMSS.sql"
  exit 1
fi

echo ""
echo "Found backup: $LATEST_BACKUP"
read -p "Use this backup to restore? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

# Perform rollback
echo ""
echo "Step 1: Dropping new tables..."
psql "$DATABASE_URL" <<SQL
BEGIN;

-- Drop new tables (CASCADE to remove foreign keys)
DROP TABLE IF EXISTS topic_communications CASCADE;
DROP TABLE IF EXISTS topic_secondary_sources CASCADE;
DROP TABLE IF EXISTS topic_citations CASCADE;
DROP TABLE IF EXISTS topic_assignments CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS modules_v2 CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;

COMMIT;
SQL
echo -e "${GREEN}✓ New tables dropped${NC}"

echo ""
echo "Step 2: Restoring original tables from backup..."
# Drop current database (be VERY careful here)
read -p "⚠️  This will DROP and RESTORE the entire database. Continue? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted. Manual restore required."
  echo "To manually restore:"
  echo "  1. Drop problem tables: DROP TABLE topics CASCADE;"
  echo "  2. Restore backup: psql \$DATABASE_URL < $LATEST_BACKUP"
  exit 1
fi

# Get database name from URL
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Drop and recreate database
psql "$DATABASE_URL" -c "DROP DATABASE IF EXISTS ${DB_NAME}_temp;"
psql "$DATABASE_URL" -c "CREATE DATABASE ${DB_NAME}_temp;"

# Restore to temp database
psql "${DATABASE_URL%/*}/${DB_NAME}_temp" < "$LATEST_BACKUP"

echo -e "${GREEN}✓ Backup restored to ${DB_NAME}_temp${NC}"
echo ""
echo "Manual steps required:"
echo "  1. Verify ${DB_NAME}_temp database looks correct"
echo "  2. Stop your application"
echo "  3. Run: psql \$DATABASE_URL -c 'DROP DATABASE $DB_NAME;'"
echo "  4. Run: psql \$DATABASE_URL -c 'ALTER DATABASE ${DB_NAME}_temp RENAME TO $DB_NAME;'"
echo "  5. Restart your application"
echo ""
echo "Or, to automatically complete rollback:"
read -p "Complete rollback now? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Get connection URL without database name
  BASE_URL=$(echo "$DATABASE_URL" | sed 's/\/[^\/]*$//')
  
  psql "$BASE_URL/postgres" <<SQL
DROP DATABASE IF EXISTS $DB_NAME;
ALTER DATABASE ${DB_NAME}_temp RENAME TO $DB_NAME;
SQL
  
  echo -e "${GREEN}✓ Rollback complete!${NC}"
  echo ""
  echo "Your database has been restored to pre-migration state."
  echo "Backup file preserved: $LATEST_BACKUP"
else
  echo ""
  echo "Rollback paused. Temporary database ${DB_NAME}_temp ready for manual verification."
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo -e "${GREEN}Rollback process complete${NC}"
echo "═══════════════════════════════════════════════════════════════"

