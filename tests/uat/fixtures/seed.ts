/**
 * UAT Seed Data
 * Seeds database with test data for acceptance testing
 */

import crypto from 'crypto';

export interface SeedData {
  organization: { id: string; name: string };
  users: {
    manager: { id: string; email: string; role: string };
    learners: Array<{ id: string; email: string; role: string }>;
  };
  modules: {
    company: { id: string; title: string; status: string };
    certified: { id: string; title: string; status: string };
    draft: { id: string; title: string; status: string };
  };
}

export async function seedUATData(): Promise<SeedData> {
  // Generate UUIDs for test data
  const orgId = crypto.randomUUID();
  const managerId = crypto.randomUUID();
  const learner1Id = crypto.randomUUID();
  const learner2Id = crypto.randomUUID();
  const learner3Id = crypto.randomUUID();
  
  const companyModuleId = crypto.randomUUID();
  const certifiedModuleId = crypto.randomUUID();
  const draftModuleId = crypto.randomUUID();

  const data: SeedData = {
    organization: {
      id: orgId,
      name: 'Demo Financial Services',
    },
    users: {
      manager: {
        id: managerId,
        email: 'manager@demo.com',
        role: 'admin',
      },
      learners: [
        { id: learner1Id, email: 'learner1@demo.com', role: 'learner' },
        { id: learner2Id, email: 'learner2@demo.com', role: 'learner' },
        { id: learner3Id, email: 'learner3@demo.com', role: 'learner' },
      ],
    },
    modules: {
      company: {
        id: companyModuleId,
        title: 'Trade Capture Fundamentals',
        status: 'locked',
      },
      certified: {
        id: certifiedModuleId,
        title: 'Compliance Essentials',
        status: 'certified',
      },
      draft: {
        id: draftModuleId,
        title: 'Python Basics',
        status: 'draft',
      },
    },
  };

  console.log('🌱 UAT Seed Data Generated:', {
    org: data.organization.name,
    users: {
      manager: data.users.manager.email,
      learners: data.users.learners.length,
    },
    modules: Object.keys(data.modules).length,
  });

  // TODO: Actually insert into database when DB connection is available
  // For now, this returns the structure for manual seeding or API calls

  return data;
}

// SQL seed script template (for manual execution)
export function generateSeedSQL(data: SeedData): string {
  return `
-- UAT Seed Data
-- Run this against your PostgreSQL database

-- Organizations
INSERT INTO organizations (id, name, created_at) VALUES
('${data.organization.id}', '${data.organization.name}', NOW());

-- Users (simplified - adjust to match your actual schema)
-- Note: In V2, we're using dev mode auth, so actual user records may not be needed

-- Modules
INSERT INTO modules (
  id, organization_id, owner_id, title, status, visibility,
  goals, target_roles, tags, sector, version, compliance_critical,
  created_at, updated_at
) VALUES
(
  '${data.modules.company.id}',
  '${data.organization.id}',
  '${data.users.manager.id}',
  '${data.modules.company.title}',
  'locked',
  'company',
  '["Master trade capture workflows", "Understand regulatory requirements"]',
  '["trader", "ops"]',
  '["trading", "operations", "mandatory"]',
  'financial-services',
  1,
  false,
  NOW(),
  NOW()
),
(
  '${data.modules.certified.id}',
  '${data.organization.id}',
  '${data.users.manager.id}',
  '${data.modules.certified.title}',
  'certified',
  'certified',
  '["Understand compliance fundamentals", "Apply regulatory best practices"]',
  '["all"]',
  '["compliance", "mandatory", "annual"]',
  'general',
  1,
  true,
  NOW(),
  NOW()
),
(
  '${data.modules.draft.id}',
  '${data.organization.id}',
  '${data.users.manager.id}',
  '${data.modules.draft.title}',
  'draft',
  'company',
  '["Learn Python basics", "Write simple scripts"]',
  '["developer", "analyst"]',
  '["python", "programming", "technical"]',
  'technology',
  1,
  false,
  NOW(),
  NOW()
);

-- Module Sections (sample for company module)
INSERT INTO module_sections (
  id, module_id, title, content, "order",
  source_map, provenance_badges, created_at
) VALUES
(
  '${crypto.randomUUID()}',
  '${data.modules.company.id}',
  'Introduction to Trade Capture',
  'Trade capture is the process of recording and validating trade details...',
  1,
  '{"sources": [{"type": "internal", "name": "Company Training Manual"}]}',
  '["internal"]',
  NOW()
),
(
  '${crypto.randomUUID()}',
  '${data.modules.company.id}',
  'Regulatory Requirements',
  'Key regulations include MiFID II, Dodd-Frank, and EMIR...',
  2,
  '{"sources": [{"type": "industry", "name": "FCA Handbook"}]}',
  '["industry_source"]',
  NOW()
);

-- Module Assignment (for testing Push/Learn)
INSERT INTO module_assignments (
  id, module_id, organization_id, created_by_user_id,
  audience, mandatory, start_date,
  quiet_hours_start, quiet_hours_end, daily_cap,
  status, created_at, updated_at
) VALUES
(
  '${crypto.randomUUID()}',
  '${data.modules.company.id}',
  '${data.organization.id}',
  '${data.users.manager.id}',
  '{"type": "team", "teamId": "ops-emea"}',
  true,
  '2025-11-01',
  '20:00:00',
  '08:00:00',
  2,
  'active',
  NOW(),
  NOW()
);

-- Model Logs (sample)
INSERT INTO model_logs (
  id, organization_id, job_type, model_label,
  prompt_tokens, completion_tokens, total_cost_cents,
  duration_ms, metadata, created_at
) VALUES
(
  '${crypto.randomUUID()}',
  '${data.organization.id}',
  'drafting',
  'gpt-4o',
  500,
  1000,
  3,
  2500,
  '{"moduleId": "${data.modules.company.id}"}',
  NOW()
);

-- Audit Events (sample)
INSERT INTO audit_events (
  id, organization_id, user_id, event_type,
  entity_type, entity_id, metadata, created_at
) VALUES
(
  '${crypto.randomUUID()}',
  '${data.organization.id}',
  '${data.users.manager.id}',
  'module_locked',
  'module',
  '${data.modules.company.id}',
  '{"version": 1, "title": "${data.modules.company.title}"}',
  NOW()
);

-- Success message
SELECT 'UAT seed data inserted successfully' AS status;
`;
}

// Export for use in tests
export const TEST_DATA = {
  manager: {
    email: 'manager@demo.com',
    password: 'test123', // Dev mode, doesn't matter
  },
  learner1: {
    email: 'learner1@demo.com',
    password: 'test123',
  },
};

