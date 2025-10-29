/**
 * V2.0 Demo Seed Data - Simplified
 * Creates minimal test data for UAT
 */

import crypto from 'crypto'
import { db } from '../src/db'
import {
  modules,
  moduleSections,
  moduleItems,
} from '../drizzle/schema_v2'

async function seed() {
  console.log('🌱 Seeding V2.0 demo data (simplified)...')

  try {
    // Generate UUIDs for test data
    const testOrgId = crypto.randomUUID()
    const managerUserId = crypto.randomUUID()
    const learner1UserId = crypto.randomUUID()
    const learner2UserId = crypto.randomUUID()
    
    console.log(`✓ Generated UUIDs for test data`)
    console.log(`  Org: ${testOrgId}`)
    console.log(`  Manager: ${managerUserId}`)
    console.log(`  Learner1: ${learner1UserId}`)
    console.log(`  Learner2: ${learner2UserId}`)

    // 3. Create Compliance Training Module
    const [complianceModule] = await db.insert(modules).values({
      organizationId: testOrgId,
      ownerId: managerUserId,
      title: 'Compliance Training 2025',
      description: 'Essential compliance knowledge for all staff members',
      status: 'locked',
      createdBy: managerUserId,
      lockedAt: new Date(),
      goals: ['Understand regulatory requirements', 'Implement best practices'],
      targetRoles: ['all_staff'],
      tags: ['compliance', 'mandatory', 'annual'],
      sector: 'general',
      version: 1,
      visibility: 'company',
      complianceCritical: true,
    }).returning()
    console.log(`✓ Created compliance module: ${complianceModule.id}`)

    // 4. Create Sections
    const [section1, section2] = await db.insert(moduleSections).values([
      {
        moduleId: complianceModule.id,
        title: 'Introduction to Compliance',
        content: 'Understanding the basics of regulatory compliance and why it matters. This section covers the fundamental principles.',
        provenanceBadges: ['client_library'],
        sourceMap: { citations: [] },
      },
      {
        moduleId: complianceModule.id,
        title: 'Data Protection Fundamentals',
        content: 'Key principles of GDPR and data protection regulations. Learn about data subject rights and organizational responsibilities.',
        provenanceBadges: ['certified_core'],
        sourceMap: { citations: [] },
      },
    ]).returning()
    console.log(`✓ Created 2 sections`)

    // 5. Create Learning Items
    const [item1, item2] = await db.insert(moduleItems).values([
      {
        moduleId: complianceModule.id,
        sectionId: section1.id,
        itemType: 'multiple_choice',
        questionText: 'What is the primary purpose of compliance training?',
        options: ['To avoid legal penalties', 'To improve company reputation', 'To protect customer data', 'All of the above'],
        correctAnswer: 'd',
        explanation: 'Compliance training serves multiple purposes including legal protection, reputation management, and data security.',
        difficultyLevel: 3,
        orderIndex: 0,
        tags: ['fundamentals'],
      },
      {
        moduleId: complianceModule.id,
        sectionId: section2.id,
        itemType: 'true_false',
        questionText: 'Under GDPR, individuals have the right to request deletion of their personal data.',
        correctAnswer: 'true',
        explanation: 'This is known as the "right to be forgotten" under GDPR Article 17.',
        difficultyLevel: 2,
        orderIndex: 1,
        tags: ['gdpr', 'rights'],
      },
    ]).returning()
    console.log(`✓ Created 2 learning items`)

    // 6. Create Product Knowledge Module (draft)
    const [productModule] = await db.insert(modules).values({
      organizationId: testOrgId,
      ownerId: managerUserId,
      title: 'Product Knowledge: Enterprise Edition',
      description: 'Deep dive into our enterprise product features and capabilities',
      status: 'draft',
      createdBy: managerUserId,
      goals: ['Master product features', 'Understand use cases'],
      targetRoles: ['sales', 'support'],
      tags: ['product', 'enterprise'],
      sector: 'technology',
      version: 1,
      visibility: 'company',
    }).returning()
    console.log(`✓ Created product knowledge module (draft): ${productModule.id}`)

    // 7. Create Certified Leadership Module
    const certifiedOrgId = crypto.randomUUID() // Cerply Certified org
    const [leadershipModule] = await db.insert(modules).values({
      organizationId: certifiedOrgId,
      ownerId: managerUserId, // Using manager as system user
      title: 'Leadership Essentials',
      description: 'Foundational leadership skills for new managers',
      status: 'locked',
      createdBy: managerUserId, // Using manager as system user
      lockedAt: new Date(),
      goals: ['Develop leadership skills', 'Build effective teams'],
      targetRoles: ['manager', 'team_lead'],
      tags: ['leadership', 'management', 'certified'],
      sector: 'general',
      version: 1,
      visibility: 'certified',
    }).returning()
    console.log(`✓ Created certified leadership module: ${leadershipModule.id}`)

    console.log('\n✅ Demo seed data created successfully!')
    console.log('\n📊 Summary:')
    console.log('  - 1 test organization')
    console.log('  - 3 test users (referenced by ID)')
    console.log('  - 1 locked compliance module (2 sections, 2 items)')
    console.log('  - 1 draft product module')
    console.log('  - 1 certified leadership module')
    console.log('\n🧪 Ready for UAT testing!')

  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { seed }

