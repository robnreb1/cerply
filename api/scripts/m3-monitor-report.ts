#!/usr/bin/env tsx
/**
 * m3-monitor-report.ts
 * Compiles M3 staging monitor metrics and updates STAGING_TEST_REPORT.md
 * with hourly rollups.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface MonitorRun {
  status: 'PASSED' | 'FAILED';
  duration: number;
  timestamp: string;
  runId: string;
  runNumber: string;
}

interface HourlyRollup {
  hour: string; // ISO hour (e.g., "2025-10-06T09")
  passCount: number;
  failCount: number;
  totalRuns: number;
  medianLatency: number;
  errorCodes: string[];
}

function parseArgs(): MonitorRun {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    parsed[key] = args[i + 1];
  }
  
  return {
    status: (parsed.status || 'UNKNOWN') as 'PASSED' | 'FAILED',
    duration: parseInt(parsed.duration || '0', 10),
    timestamp: parsed.timestamp || new Date().toISOString(),
    runId: parsed['run-id'] || 'unknown',
    runNumber: parsed['run-number'] || 'unknown',
  };
}

function getHourKey(timestamp: string): string {
  // Return ISO hour: "2025-10-06T09"
  return timestamp.substring(0, 13);
}

function loadExistingReport(): string {
  const reportPath = join(process.cwd(), 'STAGING_TEST_REPORT.md');
  if (!existsSync(reportPath)) {
    console.error('STAGING_TEST_REPORT.md not found');
    process.exit(1);
  }
  return readFileSync(reportPath, 'utf-8');
}

function extractMonitorSection(report: string): { runs: MonitorRun[], existing: string } {
  const monitorMarker = '## 📊 24h Monitor';
  const monitorIdx = report.indexOf(monitorMarker);
  
  if (monitorIdx === -1) {
    return { runs: [], existing: '' };
  }
  
  // Extract everything after the monitor section
  const monitorSection = report.substring(monitorIdx);
  const nextSectionIdx = monitorSection.indexOf('\n## ', monitorMarker.length);
  const sectionContent = nextSectionIdx === -1 
    ? monitorSection 
    : monitorSection.substring(0, nextSectionIdx);
  
  // Parse existing runs from table
  const runs: MonitorRun[] = [];
  const tableRegex = /\| ([^\|]+) \| (\d+)s \| (✅ PASSED|❌ FAILED) \| \[#(\d+)\]/g;
  let match;
  
  while ((match = tableRegex.exec(sectionContent)) !== null) {
    runs.push({
      timestamp: match[1].trim(),
      duration: parseInt(match[2], 10),
      status: match[3].includes('PASSED') ? 'PASSED' : 'FAILED',
      runId: 'unknown', // Not stored in table
      runNumber: match[4],
    });
  }
  
  return { runs, existing: sectionContent };
}

function calculateRollups(runs: MonitorRun[]): HourlyRollup[] {
  const byHour = new Map<string, MonitorRun[]>();
  
  for (const run of runs) {
    const hour = getHourKey(run.timestamp);
    if (!byHour.has(hour)) {
      byHour.set(hour, []);
    }
    byHour.get(hour)!.push(run);
  }
  
  const rollups: HourlyRollup[] = [];
  
  for (const [hour, hourRuns] of Array.from(byHour.entries()).sort()) {
    const passCount = hourRuns.filter(r => r.status === 'PASSED').length;
    const failCount = hourRuns.filter(r => r.status === 'FAILED').length;
    const durations = hourRuns.map(r => r.duration).sort((a, b) => a - b);
    const medianLatency = durations[Math.floor(durations.length / 2)] || 0;
    const errorCodes = hourRuns
      .filter(r => r.status === 'FAILED')
      .map(r => `Run #${r.runNumber}`);
    
    rollups.push({
      hour,
      passCount,
      failCount,
      totalRuns: hourRuns.length,
      medianLatency,
      errorCodes,
    });
  }
  
  return rollups;
}

function generateMonitorSection(runs: MonitorRun[], currentRun: MonitorRun): string {
  const allRuns = [...runs, currentRun];
  const rollups = calculateRollups(allRuns);
  
  const totalPassed = allRuns.filter(r => r.status === 'PASSED').length;
  const totalFailed = allRuns.filter(r => r.status === 'FAILED').length;
  const uptime = totalPassed / (totalPassed + totalFailed) * 100;
  
  let section = `## 📊 24h Monitor

**Status:** ${currentRun.status === 'PASSED' ? '✅ Active' : '❌ Issues Detected'}  
**Total Runs:** ${allRuns.length}  
**Uptime:** ${uptime.toFixed(2)}% (${totalPassed} passed, ${totalFailed} failed)  
**Last Updated:** ${currentRun.timestamp}

### Recent Runs

| Timestamp | Duration | Status | Run |
|-----------|----------|--------|-----|
`;
  
  // Show last 20 runs
  const recentRuns = allRuns.slice(-20).reverse();
  for (const run of recentRuns) {
    const statusIcon = run.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED';
    section += `| ${run.timestamp} | ${run.duration}s | ${statusIcon} | [#${run.runNumber}](https://github.com/robnreb1/cerply/actions/runs/${run.runId}) |\n`;
  }
  
  section += `\n### Hourly Rollup\n\n`;
  section += `| Hour | Runs | Pass | Fail | Median Latency | Errors |\n`;
  section += `|------|------|------|------|----------------|--------|\n`;
  
  for (const rollup of rollups.slice(-24)) { // Last 24 hours
    const errorStr = rollup.errorCodes.length > 0 
      ? rollup.errorCodes.slice(0, 3).join(', ') + (rollup.errorCodes.length > 3 ? '...' : '')
      : '-';
    section += `| ${rollup.hour}:00 | ${rollup.totalRuns} | ${rollup.passCount} | ${rollup.failCount} | ${rollup.medianLatency}s | ${errorStr} |\n`;
  }
  
  section += `\n### Monitoring Details\n\n`;
  section += `- **Frequency:** Every 15 minutes\n`;
  section += `- **Target:** https://cerply-api-staging-latest.onrender.com\n`;
  section += `- **Assertions:** 31 (all M3 endpoints)\n`;
  section += `- **Auto-Issue:** Creates GitHub issue on failure\n`;
  section += `- **Workflow:** [m3-staging-monitor.yml](../.github/workflows/m3-staging-monitor.yml)\n\n`;
  
  return section;
}

function updateReport(report: string, newMonitorSection: string): string {
  const monitorMarker = '## 📊 24h Monitor';
  const monitorIdx = report.indexOf(monitorMarker);
  
  if (monitorIdx === -1) {
    // Add before "Next Steps" or at the end
    const nextStepsIdx = report.indexOf('## 🎯 Next Steps');
    if (nextStepsIdx !== -1) {
      return report.substring(0, nextStepsIdx) + newMonitorSection + '\n' + report.substring(nextStepsIdx);
    }
    return report + '\n' + newMonitorSection;
  }
  
  // Replace existing section
  const afterMonitor = report.substring(monitorIdx);
  const nextSectionIdx = afterMonitor.indexOf('\n## ', monitorMarker.length);
  
  if (nextSectionIdx === -1) {
    return report.substring(0, monitorIdx) + newMonitorSection;
  }
  
  return report.substring(0, monitorIdx) + newMonitorSection + '\n' + afterMonitor.substring(nextSectionIdx);
}

function main() {
  const currentRun = parseArgs();
  
  console.log('📊 M3 Monitor Report Generator');
  console.log(`Status: ${currentRun.status}`);
  console.log(`Duration: ${currentRun.duration}s`);
  console.log(`Timestamp: ${currentRun.timestamp}`);
  
  const report = loadExistingReport();
  const { runs } = extractMonitorSection(report);
  
  console.log(`Found ${runs.length} existing runs`);
  
  const newMonitorSection = generateMonitorSection(runs, currentRun);
  const updatedReport = updateReport(report, newMonitorSection);
  
  writeFileSync(join(process.cwd(), 'STAGING_TEST_REPORT.md'), updatedReport, 'utf-8');
  
  console.log('✅ STAGING_TEST_REPORT.md updated');
}

main();

