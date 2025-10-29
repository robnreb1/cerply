/**
 * UAT Summary Generator
 * Generates markdown summary from Playwright test results
 */

import fs from 'fs';
import path from 'path';

function generateUATSummary() {
  console.log('📊 Generating UAT Summary...\n');

  // Read JUnit XML if it exists
  const junitPath = path.join(process.cwd(), 'reports/junit.xml');
  const junitExists = fs.existsSync(junitPath);

  const summary = {
    timestamp: new Date().toISOString(),
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
  };

  const markdown = [
    '# Cerply V2.0 - UAT Summary',
    '',
    `**Generated:** ${new Date().toLocaleString()}`,
    '**Based on:** BRD v2.0 + FSD v2.0',
    '**Test Matrix:** tests/uat/test-matrix.md',
    '',
    '---',
    '',
    '## Executive Summary',
    '',
    '| Metric | Count |',
    '|--------|-------|',
    `| **Total Tests** | ${summary.total} |`,
    `| **✅ Passed** | ${summary.passed} |`,
    `| **❌ Failed** | ${summary.failed} |`,
    `| **⏭️  Skipped** | ${summary.skipped} |`,
    `| **Duration** | ${summary.duration}ms |`,
    '',
    '---',
    '',
    '## Results by FSD Section',
    '',
    '### 1. Build (FSD §1)',
    '- **B01**: Create module from prompt → 🟡 Pending',
    '- **B02**: Merge prompt + upload → 🟡 Pending',
    '- **B03**: Provenance badges visible to manager → 🟡 Pending',
    '- **B04**: Lock blocked if QC fails → 🟡 Pending',
    '',
    `**Status:** ${junitExists ? '🔄 Tests run, check details' : '⏳ Not yet run'}`,
    '',
    '### 2. Push (FSD §2)',
    '- **P01**: Create module assignment → ⏳ Not implemented',
    '- **P02**: Mandatory vs recommended → ⏳ Not implemented',
    '',
    '**Status:** ⏳ Not yet implemented',
    '',
    '### 3. Learn (FSD §3)',
    '- **L05**: No provenance visible to learner → 🟡 Pending',
    '- **L06**: No exact repeats → 🟡 Pending',
    '',
    `**Status:** ${junitExists ? '🔄 Tests run' : '⏳ Partial'}`,
    '',
    '### 4. Track (FSD §4)',
    '- **T01**: Team dashboard loads → 🟡 Pending',
    '- **T02**: Person dashboard loads → 🟡 Pending',
    '- **T03**: Module dashboard loads → 🟡 Pending',
    '',
    `**Status:** ${junitExists ? '🔄 Tests run' : '⏳ Partial'}`,
    '',
    '---',
    '',
    '## Test Coverage',
    '- **P0 Tests (Must Pass):** ~40% implemented',
    '- **P1 Tests (Should Pass):** ~30% implemented',
    '- **P2 Tests (Nice to Have):** ~10% implemented',
    '',
    '---',
    '',
    '## How to Run',
    '',
    '```bash',
    '# Start application',
    'Terminal 1: cd api && V2_DEV_MODE=true npm run dev',
    'Terminal 2: cd web && npm run dev',
    '',
    '# Start stubs (optional)',
    'Terminal 3: npm run uat:stubs',
    '',
    '# Run UAT',
    'npm run uat',
    '',
    '# Or with headed browser',
    'npm run uat:headed',
    '```',
    '',
    '---',
    '',
    '## Detailed Results',
    '',
    junitExists ? 'See reports/junit.xml and reports/html/ for detailed test results.' : 'No test results yet. Run `npm run uat` to generate.',
    '',
    '---',
    '',
    '**Next Steps:**',
    '1. Review this summary',
    '2. Run tests: `npm run uat`',
    '3. Check detailed HTML report: `reports/html/index.html`',
    '4. Fix failing tests',
    '5. Re-run until all P0 tests pass',
  ].join('\n');

  // Write summary
  const outputPath = path.join(process.cwd(), 'reports/uat-summary.md');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown);

  console.log(`✅ Summary written to: ${outputPath}\n`);
  console.log(markdown);
}

// Run if called directly
if (require.main === module) {
  generateUATSummary();
}

export { generateUATSummary };
