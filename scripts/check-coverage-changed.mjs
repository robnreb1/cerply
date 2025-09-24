#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

function getChangedFiles(base, head) {
  const out = execSync(`git diff --name-only ${base} ${head}`, { encoding: 'utf8' });
  return out.split(/\r?\n/).filter(Boolean).filter(f => /\.(ts|tsx)$/.test(f));
}

function parseLcov(path) {
  const text = readFileSync(path, 'utf8');
  const entries = [];
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('SF:')) {
      if (cur) entries.push(cur);
      cur = { sf: line.slice(3).trim(), LF: 0, LH: 0, BRF: 0, BRH: 0 };
    } else if (line.startsWith('LF:')) cur.LF = Number(line.slice(3));
    else if (line.startsWith('LH:')) cur.LH = Number(line.slice(3));
    else if (line.startsWith('BRF:')) cur.BRF = Number(line.slice(4));
    else if (line.startsWith('BRH:')) cur.BRH = Number(line.slice(4));
  }
  if (cur) entries.push(cur);
  return entries;
}

function percent(n, d) { return d > 0 ? (n / d) * 100 : 100; }

function main() {
  const base = process.env.COVERAGE_BASE_SHA || process.argv[2];
  const head = process.env.COVERAGE_HEAD_SHA || process.argv[3];
  if (!base || !head) {
    console.error('Usage: node scripts/check-coverage-changed.mjs <base> <head>');
    process.exit(2);
  }
  const files = getChangedFiles(base, head);
  if (files.length === 0) {
    console.log('No TS/TSX changes; skipping coverage gating');
    return;
  }
  const lcov = parseLcov('coverage/merged.info');
  const threshold = Number(process.env.COVERAGE_THRESHOLD || '85');
  const failures = [];
  for (const rel of files) {
    const match = lcov.find(e => e.sf.endsWith(rel));
    if (!match) { failures.push({ file: rel, reason: 'no coverage entry' }); continue; }
    const st = percent(match.LH, match.LF);
    const br = percent(match.BRH, match.BRF);
    if (st < threshold || br < threshold) {
      failures.push({ file: rel, statements: st.toFixed(1), branches: br.toFixed(1) });
    }
  }
  if (failures.length) {
    console.error('Coverage check failed for changed files (threshold %s%):', threshold);
    for (const f of failures) console.error('-', f.file, f.reason ? f.reason : `(statements ${f.statements}%, branches ${f.branches}%)`);
    process.exit(1);
  }
  console.log('Coverage OK on changed files (>= %d%%).', threshold);
}

main();
