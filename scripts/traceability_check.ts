#!/usr/bin/env tsx

/**
 * Traceability Check Script
 * 
 * Validates that all SSOT items are properly covered in the traceability matrix
 * and that MVP items have required BRD/FSD links and evidence.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface SSOTItem {
  id: string;
  useCase: string;
  isMVP: boolean;
  persona: string;
}

interface MatrixRow {
  ssotId: string;
  useCase: string;
  mvp: 'Yes' | 'No';
  brdSections: string;
  fsdSections: string;
  architectureComponents: string;
  status: 'Planned' | 'In Progress' | 'Done';
  testsEvidence: string;
  notes: string;
}

interface CoverageReport {
  totalItems: number;
  mvpItems: number;
  coveredItems: number;
  mvpCoveredItems: number;
  mvpWithEvidence: number;
  missingBRD: string[];
  missingFSD: string[];
  missingEvidence: string[];
  errors: string[];
  warnings: string[];
}

function parseSSOTFile(filePath: string): SSOTItem[] {
  if (!existsSync(filePath)) {
    throw new Error(`SSOT file not found: ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf-8');
  const items: SSOTItem[] = [];
  
  // Split content into sections by persona
  const sections = content.split(/^## (All users|Learner|Expert|Business|Admin \/ Cerply)$/m);
  
  for (let i = 1; i < sections.length; i += 2) {
    const personaHeader = sections[i];
    const sectionContent = sections[i + 1];
    
    if (!personaHeader || !sectionContent) continue;
    
    // Determine persona code
    let personaCode = '';
    if (personaHeader.includes('All users')) personaCode = 'AU';
    else if (personaHeader.includes('Learner')) personaCode = 'L';
    else if (personaHeader.includes('Expert')) personaCode = 'E';
    else if (personaHeader.includes('Business')) personaCode = 'B';
    else if (personaHeader.includes('Admin')) personaCode = 'A';
    
    // Find the "Beyond MVP" marker in this section
    const beyondMvpIndex = sectionContent.indexOf('**Beyond MVP:**');
    
    // Parse items in this section
    const itemRegex = new RegExp(`(${personaCode})-(\\d+)\\.\\s+(.+)$`, 'gm');
    let match;
    
    while ((match = itemRegex.exec(sectionContent)) !== null) {
      const [, , id, useCase] = match;
      const fullId = `${personaCode}-${id}`;
      
      // Check if this item is after "Beyond MVP" marker
      const itemIndex = match.index;
      const isBeyondMVP = beyondMvpIndex !== -1 && itemIndex > beyondMvpIndex;
      
      items.push({
        id: fullId,
        useCase: useCase.trim(),
        isMVP: !isBeyondMVP,
        persona: personaCode
      });
    }
  }
  
  return items;
}

function parseMatrixFile(filePath: string): MatrixRow[] {
  if (!existsSync(filePath)) {
    throw new Error(`Matrix file not found: ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf-8');
  const rows: MatrixRow[] = [];
  
  // Find the table in the markdown
  const tableStart = content.indexOf('| SSOT ID |');
  if (tableStart === -1) {
    throw new Error('Matrix table not found in file');
  }
  
  const tableContent = content.substring(tableStart);
  const lines = tableContent.split('\n').filter(line => line.trim().startsWith('|'));
  
  // Skip header and separator lines
  const dataLines = lines.slice(2);
  
  for (const line of dataLines) {
    if (!line.trim() || line.includes('---')) continue;
    
    const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
    if (cells.length >= 8) {
      // Clean up the SSOT ID (remove markdown formatting)
      const ssotId = cells[0].replace(/\*\*/g, '').trim();
      
      rows.push({
        ssotId: ssotId,
        useCase: cells[1],
        mvp: cells[2] as 'Yes' | 'No',
        brdSections: cells[3],
        fsdSections: cells[4],
        architectureComponents: cells[5],
        status: cells[6] as 'Planned' | 'In Progress' | 'Done',
        testsEvidence: cells[7],
        notes: cells[8] || ''
      });
    }
  }
  
  return rows;
}

function validateCoverage(ssotItems: SSOTItem[], matrixRows: MatrixRow[]): CoverageReport {
  const report: CoverageReport = {
    totalItems: ssotItems.length,
    mvpItems: 0,
    coveredItems: 0,
    mvpCoveredItems: 0,
    mvpWithEvidence: 0,
    missingBRD: [],
    missingFSD: [],
    missingEvidence: [],
    errors: [],
    warnings: []
  };

  // Create lookup map
  const matrixMap = new Map<string, MatrixRow>();
  for (const row of matrixRows) {
    matrixMap.set(row.ssotId, row);
  }

  // Check each SSOT item
  for (const item of ssotItems) {
    if (item.isMVP) {
      report.mvpItems++;
    }

    const matrixRow = matrixMap.get(item.id);
    if (!matrixRow) {
      report.errors.push(`SSOT item ${item.id} not found in traceability matrix`);
      continue;
    }

    report.coveredItems++;

    // Validate MVP items
    if (item.isMVP && matrixRow.mvp === 'Yes') {
      report.mvpCoveredItems++;

      // Check BRD sections
      if (!matrixRow.brdSections || matrixRow.brdSections.trim() === '-' || matrixRow.brdSections.trim() === '') {
        report.missingBRD.push(item.id);
      }

      // Check FSD sections
      if (!matrixRow.fsdSections || matrixRow.fsdSections.trim() === '-' || matrixRow.fsdSections.trim() === '') {
        report.missingFSD.push(item.id);
      }

      // Check evidence for completed items
      if (matrixRow.status === 'Done') {
        if (!matrixRow.testsEvidence || matrixRow.testsEvidence.trim() === '-' || matrixRow.testsEvidence.trim() === '') {
          report.missingEvidence.push(item.id);
        } else {
          report.mvpWithEvidence++;
        }
      }
    }
  }

  // Check for duplicate SSOT IDs in matrix
  const matrixIds = matrixRows.map(row => row.ssotId);
  const duplicateIds = matrixIds.filter((id, index) => matrixIds.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    report.errors.push(`Duplicate SSOT IDs in matrix: ${duplicateIds.join(', ')}`);
  }

  // Check for extra items in matrix not in SSOT
  for (const row of matrixRows) {
    if (!ssotItems.find(item => item.id === row.ssotId)) {
      report.warnings.push(`Matrix contains item ${row.ssotId} not found in SSOT`);
    }
  }

  return report;
}

function printReport(report: CoverageReport, isReportMode: boolean = false): void {
  const coverage = report.mvpItems > 0 ? Math.round((report.mvpCoveredItems / report.mvpItems) * 100) : 0;
  const evidence = report.mvpItems > 0 ? Math.round((report.mvpWithEvidence / report.mvpItems) * 100) : 0;

  console.log('=== MVP Traceability Coverage Report ===\n');

  console.log(`Total SSOT Items: ${report.totalItems}`);
  console.log(`MVP Items: ${report.mvpItems}`);
  console.log(`Covered Items: ${report.coveredItems}`);
  console.log(`MVP Coverage: ${coverage}% (${report.mvpCoveredItems}/${report.mvpItems})`);
  console.log(`Evidence Coverage: ${evidence}% (${report.mvpWithEvidence}/${report.mvpItems})\n`);

  if (report.errors.length > 0) {
    console.log('❌ ERRORS:');
    for (const error of report.errors) {
      console.log(`  - ${error}`);
    }
    console.log('');
  }

  if (report.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    for (const warning of report.warnings) {
      console.log(`  - ${warning}`);
    }
    console.log('');
  }

  if (report.missingBRD.length > 0) {
    console.log('📋 MVP Items Missing BRD Links:');
    for (const id of report.missingBRD) {
      console.log(`  - ${id}`);
    }
    console.log('');
  }

  if (report.missingFSD.length > 0) {
    console.log('📋 MVP Items Missing FSD Links:');
    for (const id of report.missingFSD) {
      console.log(`  - ${id}`);
    }
    console.log('');
  }

  if (report.missingEvidence.length > 0) {
    console.log('🧪 MVP Items (Status=Done) Missing Evidence:');
    for (const id of report.missingEvidence) {
      console.log(`  - ${id}`);
    }
    console.log('');
  }

  // Summary
  const hasErrors = report.errors.length > 0;
  const hasMissingBRD = report.missingBRD.length > 0;
  const hasMissingFSD = report.missingFSD.length > 0;
  const hasMissingEvidence = report.missingEvidence.length > 0;

  if (hasErrors || hasMissingBRD || hasMissingFSD || hasMissingEvidence) {
    console.log('❌ TRACEABILITY CHECK FAILED');
    console.log(`   ${report.errors.length} errors, ${report.missingBRD.length + report.missingFSD.length + report.missingEvidence.length} missing requirements`);
    process.exit(1);
  } else {
    console.log('✅ All SSOT items covered: 100%');
    console.log('✅ All MVP items have BRD/FSD links');
    console.log('✅ All completed items have evidence');
    console.log('\n🎉 TRACEABILITY CHECK PASSED');
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const isReportMode = args.includes('--report');
  const reportPath = args.includes('--report') ? args[args.indexOf('--report') + 1] : undefined;

  try {
    // File paths
    const rootDir = process.cwd();
    const ssotPath = join(rootDir, 'docs/specs/mvp-use-cases.md');
    const matrixPath = join(rootDir, 'docs/specs/traceability-matrix.md');

    console.log('Loading SSOT and traceability matrix...');
    
    // Parse files
    const ssotItems = parseSSOTFile(ssotPath);
    const matrixRows = parseMatrixFile(matrixPath);

    console.log(`Found ${ssotItems.length} SSOT items, ${matrixRows.length} matrix rows`);

    // Validate coverage
    const report = validateCoverage(ssotItems, matrixRows);

    // Print report
    printReport(report, isReportMode);

    // Save report if requested
    if (isReportMode && reportPath) {
      const reportContent = generateReportContent(report);
      require('fs').writeFileSync(reportPath, reportContent);
      console.log(`\n📊 Report saved to: ${reportPath}`);
    }

  } catch (error) {
    console.error('❌ Traceability check failed:', error.message);
    process.exit(1);
  }
}

function generateReportContent(report: CoverageReport): string {
  const timestamp = new Date().toISOString();
  const coverage = report.mvpItems > 0 ? Math.round((report.mvpCoveredItems / report.mvpItems) * 100) : 0;
  const evidence = report.mvpItems > 0 ? Math.round((report.mvpWithEvidence / report.mvpItems) * 100) : 0;

  return `# MVP Traceability Dashboard

**Generated:** ${timestamp}  
**Source:** [docs/specs/mvp-use-cases.md](specs/mvp-use-cases.md)  
**Matrix:** [docs/specs/traceability-matrix.md](specs/traceability-matrix.md)

## Coverage Summary

| Metric | Value | Percentage |
|--------|-------|------------|
| **Total SSOT Items** | ${report.totalItems} | - |
| **MVP Items** | ${report.mvpItems} | - |
| **Covered Items** | ${report.coveredItems} | ${Math.round((report.coveredItems / report.totalItems) * 100)}% |
| **MVP Coverage** | ${report.mvpCoveredItems}/${report.mvpItems} | **${coverage}%** |
| **Evidence Coverage** | ${report.mvpWithEvidence}/${report.mvpItems} | **${evidence}%** |

## Status by Persona

| Persona | Total | MVP | Implemented | In Progress | Planned | Coverage |
|---------|-------|-----|-------------|-------------|---------|----------|
| **All Users** | 4 | 4 | ${getPersonaStats(report, 'AU').implemented} | ${getPersonaStats(report, 'AU').inProgress} | ${getPersonaStats(report, 'AU').planned} | ${getPersonaStats(report, 'AU').coverage}% |
| **Learner** | 24 | 24 | ${getPersonaStats(report, 'L').implemented} | ${getPersonaStats(report, 'L').inProgress} | ${getPersonaStats(report, 'L').planned} | ${getPersonaStats(report, 'L').coverage}% |
| **Expert** | 11 | 11 | ${getPersonaStats(report, 'E').implemented} | ${getPersonaStats(report, 'E').inProgress} | ${getPersonaStats(report, 'E').planned} | ${getPersonaStats(report, 'E').coverage}% |
| **Business** | 12 | 12 | ${getPersonaStats(report, 'B').implemented} | ${getPersonaStats(report, 'B').inProgress} | ${getPersonaStats(report, 'B').planned} | ${getPersonaStats(report, 'B').coverage}% |
| **Admin** | 9 | 9 | ${getPersonaStats(report, 'A').implemented} | ${getPersonaStats(report, 'A').inProgress} | ${getPersonaStats(report, 'A').planned} | ${getPersonaStats(report, 'A').coverage}% |

## Issues

${report.errors.length > 0 ? '### ❌ Errors\n' + report.errors.map(e => `- ${e}`).join('\n') + '\n' : ''}
${report.missingBRD.length > 0 ? '### 📋 Missing BRD Links\n' + report.missingBRD.map(id => `- ${id}`).join('\n') + '\n' : ''}
${report.missingFSD.length > 0 ? '### 📋 Missing FSD Links\n' + report.missingFSD.map(id => `- ${id}`).join('\n') + '\n' : ''}
${report.missingEvidence.length > 0 ? '### 🧪 Missing Evidence\n' + report.missingEvidence.map(id => `- ${id}`).join('\n') + '\n' : ''}

## Next Steps

1. **Address any errors** listed above
2. **Add missing BRD/FSD links** for MVP items
3. **Provide evidence** for completed items
4. **Update traceability matrix** as implementation progresses

---

*This dashboard is automatically generated by the traceability check script.*
`;
}

function getPersonaStats(report: CoverageReport, persona: string): any {
  // This is a simplified version - in a real implementation you'd parse the matrix
  // to get actual status counts by persona
  return {
    implemented: 0,
    inProgress: 0,
    planned: 0,
    coverage: 0
  };
}

if (require.main === module) {
  main();
}
