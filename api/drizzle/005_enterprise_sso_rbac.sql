------------------------------------------------------------------------------
-- Epic 2: Enterprise SSO & RBAC
------------------------------------------------------------------------------

-- Organizations table: each enterprise customer gets one organization
CREATE TABLE IF NOT EXISTS organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  domain        TEXT UNIQUE, -- e.g., "acme.com" for SSO domain matching
  sso_config    JSONB, -- SSO provider config (type, metadata_url, client_id, etc.)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add organization_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);

-- User roles: RBAC system
-- Role types: 'admin', 'manager', 'learner'
CREATE TABLE IF NOT EXISTS user_roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'learner')),
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by      UUID REFERENCES users(id),
  UNIQUE(user_id, organization_id, role)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org ON user_roles(organization_id);

-- SSO sessions: track SSO login sessions
CREATE TABLE IF NOT EXISTS sso_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL, -- 'google', 'saml', 'oidc'
  provider_id     TEXT, -- external ID from SSO provider
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_user ON sso_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_expires ON sso_sessions(expires_at);

-- Teams: managers create teams within their organization
CREATE TABLE IF NOT EXISTS teams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  manager_id      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teams_org ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_manager ON teams(manager_id);

-- Team members: learners assigned to teams
CREATE TABLE IF NOT EXISTS team_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

------------------------------------------------------------------------------
-- Seed data: Create a default organization and admin user for development
------------------------------------------------------------------------------

-- Default organization (using real UUID)
INSERT INTO organizations (id, name, domain, sso_config)
VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  'Cerply Dev Org',
  'cerply-dev.local',
  '{
    "provider": "mock",
    "enabled": true
  }'::JSONB
) ON CONFLICT (id) DO NOTHING;

-- Default admin user (email: admin@cerply-dev.local)
INSERT INTO users (id, email, organization_id, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000010'::UUID,
  'admin@cerply-dev.local',
  '00000000-0000-0000-0000-000000000001'::UUID,
  now()
) ON CONFLICT (email) DO UPDATE SET organization_id = EXCLUDED.organization_id;

-- Grant admin role to default user
INSERT INTO user_roles (user_id, organization_id, role, granted_at)
VALUES (
  '00000000-0000-0000-0000-000000000010'::UUID,
  '00000000-0000-0000-0000-000000000001'::UUID,
  'admin',
  now()
) ON CONFLICT (user_id, organization_id, role) DO NOTHING;

-- Default manager user (email: manager@cerply-dev.local)
INSERT INTO users (id, email, organization_id, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000020'::UUID,
  'manager@cerply-dev.local',
  '00000000-0000-0000-0000-000000000001'::UUID,
  now()
) ON CONFLICT (email) DO UPDATE SET organization_id = EXCLUDED.organization_id;

-- Grant manager role
INSERT INTO user_roles (user_id, organization_id, role, granted_at)
VALUES (
  '00000000-0000-0000-0000-000000000020'::UUID,
  '00000000-0000-0000-0000-000000000001'::UUID,
  'manager',
  now()
) ON CONFLICT (user_id, organization_id, role) DO NOTHING;

-- Default learner user (email: learner@cerply-dev.local)
INSERT INTO users (id, email, organization_id, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000030'::UUID,
  'learner@cerply-dev.local',
  '00000000-0000-0000-0000-000000000001'::UUID,
  now()
) ON CONFLICT (email) DO UPDATE SET organization_id = EXCLUDED.organization_id;

-- Grant learner role
INSERT INTO user_roles (user_id, organization_id, role, granted_at)
VALUES (
  '00000000-0000-0000-0000-000000000030'::UUID,
  '00000000-0000-0000-0000-000000000001'::UUID,
  'learner',
  now()
) ON CONFLICT (user_id, organization_id, role) DO NOTHING;

------------------------------------------------------------------------------

