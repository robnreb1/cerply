/**
 * V2.0 Demo Seed Data
 * Creates test organization, users, modules, and progress data for UAT
 */

import { db } from '../src/db'
import {
  modules,
  moduleSections,
  moduleItems,
  moduleAssignments,
  contentLibrary,
  certifiedSubmissions,
  learnerProgress,
  learnerResponses,
} from '../drizzle/schema_v2'

async function seed() {
  console.log('🌱 Seeding V2.0 demo data...')

  try {
    // 1. Test Organization (assuming organizations table exists from V1)
    const testOrgId = 'org_demo_v2'
    console.log(`✓ Using organization: ${testOrgId}`)

    // 2. Test Users (assuming users table exists from V1)
    const users = [
      {
        id: 'user_manager_demo',
        email: 'manager@demo.cerply.com',
        role: 'manager',
        organizationId: testOrgId,
      },
      {
        id: 'user_learner1_demo',
        email: 'learner1@demo.cerply.com',
        role: 'learner',
        organizationId: testOrgId,
      },
      {
        id: 'user_learner2_demo',
        email: 'learner2@demo.cerply.com',
        role: 'learner',
        organizationId: testOrgId,
      },
    ]
    console.log(`✓ Created ${users.length} demo users`)

    // 3. Company Module 1: Compliance Training
    const [complianceModule] = await db.insert(modules).values({
      organizationId: testOrgId,
      title: 'Compliance Training 2025',
      description: 'Essential compliance knowledge for all staff members',
      status: 'locked',
      createdBy: users[0].id,
      lockedAt: new Date(),
      goals: ['Understand regulatory requirements', 'Implement best practices'],
      targetRoles: ['all_staff'],
      tags: ['compliance', 'mandatory', 'annual'],
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning()
    const complianceModuleId = complianceModule.id
    console.log(`✓ Created compliance module: ${complianceModuleId}`)

    // Sections for Compliance Module
    const [section1, section2] = await db.insert(moduleSections).values([
      {
        moduleId: complianceModuleId,
        heading: 'Introduction to Compliance',
        content: 'Understanding the basics of regulatory compliance and why it matters.',
        provenance: 'client_library',
        orderIndex: 0,
      },
      {
        moduleId: complianceModuleId,
        heading: 'Data Protection Fundamentals',
        content: 'Key principles of GDPR and data protection regulations.',
        provenance: 'certified_core',
        orderIndex: 1,
      },
    ]).returning()
    console.log(`✓ Created ${2} sections for compliance module`)

    // Items for Compliance Module
    const complianceItems = [
      {
        id: 'item_comp_1',
        moduleId: complianceModuleId,
        sectionId: complianceSections[0].id,
        itemType: 'multiple_choice',
        questionText: 'What is the primary purpose of compliance training?',
        options: ['To avoid legal penalties', 'To improve company reputation', 'To protect customer data', 'All of the above'],
        correctAnswer: 'd',
        explanation: 'Compliance training serves multiple purposes including legal protection, reputation management, and data security.',
        difficultyLevel: 3,
        orderIndex: 0,
      },
      {
        id: 'item_comp_2',
        moduleId: complianceModuleId,
        sectionId: complianceSections[1].id,
        itemType: 'true_false',
        questionText: 'Under GDPR, individuals have the right to request deletion of their personal data.',
        correctAnswer: 'true',
        explanation: 'This is known as the "right to be forgotten" under GDPR Article 17.',
        difficultyLevel: 2,
        orderIndex: 1,
      },
    ]
    await db.insert(moduleItems).values(complianceItems)
    console.log(`✓ Created ${complianceItems.length} items for compliance module`)

    // 4. Company Module 2: Product Knowledge
    const productModuleId = 'mod_product_demo'
    await db.insert(modules).values({
      id: productModuleId,
      organizationId: testOrgId,
      title: 'Product Knowledge: Enterprise Edition',
      description: 'Deep dive into our enterprise product features and capabilities',
      status: 'draft',
      createdBy: users[0].id,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    console.log(`✓ Created product knowledge module`)

    // Sections for Product Module
    const productSections = [
      {
        id: 'sec_prod_1',
        moduleId: productModuleId,
        heading: 'Core Features Overview',
        content: 'Introduction to the main features of our enterprise platform.',
        provenance: 'client_library',
        orderIndex: 0,
      },
    ]
    await db.insert(moduleSections).values(productSections)

    const productItems = [
      {
        id: 'item_prod_1',
        moduleId: productModuleId,
        sectionId: productSections[0].id,
        itemType: 'multiple_choice',
        questionText: 'Which feature allows multi-tenant data isolation?',
        options: ['Organization boundaries', 'User roles', 'API keys', 'Encryption'],
        correctAnswer: 'a',
        explanation: 'Organization boundaries provide complete data isolation between tenants.',
        difficultyLevel: 4,
        orderIndex: 0,
      },
    ]
    await db.insert(moduleItems).values(productItems)
    console.log(`✓ Created product knowledge module with sections and items`)

    // 5. Certified Module: Leadership Essentials
    const certifiedModuleId = 'mod_leadership_cert'
    await db.insert(modules).values({
      id: certifiedModuleId,
      organizationId: 'cerply_certified', // Special org for certified content
      title: 'Leadership Essentials',
      description: 'Foundational leadership skills for new managers',
      status: 'locked',
      createdBy: 'system',
      lockedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const certifiedSections = [
      {
        id: 'sec_lead_1',
        moduleId: certifiedModuleId,
        heading: 'Effective Communication',
        content: 'Master the art of clear, empathetic communication with your team.',
        provenance: 'certified_core',
        orderIndex: 0,
      },
    ]
    await db.insert(moduleSections).values(certifiedSections)

    const certifiedItems = [
      {
        id: 'item_lead_1',
        moduleId: certifiedModuleId,
        sectionId: certifiedSections[0].id,
        itemType: 'free_text',
        questionText: 'Describe a time when you had to deliver difficult feedback to a team member. How did you approach it?',
        explanation: 'Effective feedback requires empathy, specificity, and a focus on behavior rather than personality.',
        difficultyLevel: 6,
        orderIndex: 0,
      },
    ]
    await db.insert(moduleItems).values(certifiedItems)

    // Submit for certification
    await db.insert(certifiedSubmissions).values({
      id: 'sub_leadership_cert',
      moduleId: certifiedModuleId,
      submittedBy: 'system',
      status: 'stamped',
      reviewNotes: 'Excellent content. Meets all quality standards.',
      reviewedBy: 'certifier_admin',
      reviewedAt: new Date(),
      stampedAt: new Date(),
      submittedAt: new Date(),
    })
    console.log(`✓ Created certified leadership module with stamp`)

    // 6. Module Assignment
    const assignmentId = 'assign_compliance_demo'
    await db.insert(moduleAssignments).values({
      id: assignmentId,
      moduleId: complianceModuleId,
      organizationId: testOrgId,
      createdBy: users[0].id,
      targetUserIds: [users[1].id, users[2].id],
      isMandatory: true,
      startDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    console.log(`✓ Created module assignment`)

    // 7. Learner Progress for User 1
    await db.insert(learnerProgress).values({
      id: 'prog_learner1_comp',
      userId: users[1].id,
      moduleId: complianceModuleId,
      assignmentId,
      currentLevel: 3,
      itemsCompleted: 1,
      itemsCorrect: 1,
      currentStreak: 2,
      longestStreak: 3,
      lastSessionAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    console.log(`✓ Created progress for learner 1`)

    // 8. Learner Responses
    await db.insert(learnerResponses).values([
      {
        id: 'resp_learner1_1',
        userId: users[1].id,
        moduleId: complianceModuleId,
        itemId: complianceItems[0].id,
        assignmentId,
        responseText: 'd',
        isCorrect: true,
        timeSpentSeconds: 15,
        difficultyAtTime: 3,
        respondedAt: new Date(),
      },
      {
        id: 'resp_learner2_1',
        userId: users[2].id,
        moduleId: complianceModuleId,
        itemId: complianceItems[0].id,
        assignmentId,
        responseText: 'a',
        isCorrect: false,
        timeSpentSeconds: 20,
        difficultyAtTime: 3,
        respondedAt: new Date(),
      },
    ])
    console.log(`✓ Created learner responses`)

    // 9. Content Library Entries
    await db.insert(contentLibrary).values([
      {
        id: 'lib_template_1',
        organizationId: 'cerply_building_blocks',
        title: 'Onboarding Checklist Template',
        content: 'Standard template for employee onboarding programs',
        contentType: 'template',
        provenance: 'building_blocks',
        tags: ['onboarding', 'hr', 'checklist'],
        createdAt: new Date(),
      },
      {
        id: 'lib_industry_1',
        organizationId: 'industry_finance',
        title: 'Financial Regulations Overview',
        content: 'Key financial compliance requirements and best practices',
        contentType: 'reference',
        provenance: 'industry',
        tags: ['finance', 'compliance', 'regulations'],
        createdAt: new Date(),
      },
    ])
    console.log(`✓ Created content library entries`)

    console.log('\n✅ Demo seed data created successfully!')
    console.log('\n📊 Summary:')
    console.log('  - 1 test organization')
    console.log('  - 3 test users (1 manager, 2 learners)')
    console.log('  - 2 company modules (1 locked, 1 draft)')
    console.log('  - 1 certified module (with stamp)')
    console.log('  - 1 module assignment')
    console.log('  - Progress and response data')
    console.log('  - 2 content library entries')
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

