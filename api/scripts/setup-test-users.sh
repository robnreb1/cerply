#!/usr/bin/env bash
set -e

echo "════════════════════════════════════════════════════════════"
echo "  Setting Up Test Users for Epic 4 UAT"
echo "════════════════════════════════════════════════════════════"
echo ""

DATABASE_URL="${DATABASE_URL:-postgresql://cerply:cerply@localhost:5432/cerply}"

# SQL to insert test organization and users
psql "$DATABASE_URL" << 'SQL'

-- 1. Ensure test organization exists
INSERT INTO organizations (id, name, domain, sso_config, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Cerply Test Organization',
  'cerply-dev.local',
  '{"provider":"mock","enabled":true}'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  domain = EXCLUDED.domain,
  sso_config = EXCLUDED.sso_config;

-- 2. Create test users
INSERT INTO users (id, email, organization_id, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'admin@cerply-dev.local', '00000000-0000-0000-0000-000000000001', NOW()),
  ('00000000-0000-0000-0000-000000000003', 'manager@cerply-dev.local', '00000000-0000-0000-0000-000000000001', NOW()),
  ('00000000-0000-0000-0000-000000000004', 'learner1@cerply-dev.local', '00000000-0000-0000-0000-000000000001', NOW()),
  ('00000000-0000-0000-0000-000000000005', 'learner2@cerply-dev.local', '00000000-0000-0000-0000-000000000001', NOW())
ON CONFLICT (email) DO NOTHING;

-- 3. Assign roles
INSERT INTO user_roles (user_id, organization_id, role, granted_at)
VALUES
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'admin', NOW()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'manager', NOW()),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'learner', NOW()),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'learner', NOW())
ON CONFLICT (user_id, organization_id) DO UPDATE SET
  role = EXCLUDED.role;

-- 4. Create test team for manager
INSERT INTO teams (id, organization_id, name, manager_id, created_at, updated_at)
VALUES (
  '324a0945-1764-4bb2-b1d7-1f6bfa1b3683',
  '00000000-0000-0000-0000-000000000001',
  'Engineering Team',
  '00000000-0000-0000-0000-000000000003',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  manager_id = EXCLUDED.manager_id;

-- 5. Add learners to team
INSERT INTO team_members (team_id, user_id, joined_at)
VALUES
  ('324a0945-1764-4bb2-b1d7-1f6bfa1b3683', '00000000-0000-0000-0000-000000000004', NOW()),
  ('324a0945-1764-4bb2-b1d7-1f6bfa1b3683', '00000000-0000-0000-0000-000000000005', NOW())
ON CONFLICT (team_id, user_id) DO NOTHING;

SQL

echo ""
echo "✅ Test users created successfully!"
echo ""
echo "════════════════════════════════════════════════════════════"
echo "  UAT Login Credentials"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "🔐 Login URL: http://localhost:3000/login"
echo ""
echo "📋 Test Accounts:"
echo ""
echo "  👤 Admin User"
echo "     Email: admin@cerply-dev.local"
echo "     Access: Full organization analytics + export"
echo ""
echo "  👤 Manager User"
echo "     Email: manager@cerply-dev.local"
echo "     Access: Manager dashboard + team analytics"
echo "     Team: Engineering Team"
echo ""
echo "  👤 Learner Users"
echo "     Email: learner1@cerply-dev.local"
echo "     Email: learner2@cerply-dev.local"
echo "     Access: Learner view (for RBAC testing)"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 Dashboard URLs (after login):"
echo ""
echo "  Manager Dashboard:"
echo "  → http://localhost:3000/manager/dashboard"
echo ""
echo "  Team Detail:"
echo "  → http://localhost:3000/manager/teams/324a0945-1764-4bb2-b1d7-1f6bfa1b3683/dashboard"
echo ""
echo "  Admin Analytics:"
echo "  → http://localhost:3000/admin/analytics"
echo ""
echo "════════════════════════════════════════════════════════════"
