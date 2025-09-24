import fs from 'node:fs';
import path from 'node:path';

function findWorkflows(dir) {
  const p = path.join(process.cwd(), dir);
  if (!fs.existsSync(p)) return [];
  return fs.readdirSync(p).filter(f => f.endsWith('.yml') || f.endsWith('.yaml')).map(f => path.join(p, f));
}

function extractUses(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  return lines
    .map(l => l.trim())
    .filter(l => l.startsWith('- uses:') || l.startsWith('uses:'))
    .map(l => l.replace(/^(-\s*)?uses:\s*/,'').trim());
}

function isPinned(u) {
  // Allow @vX or @vX.Y or @<sha>
  const m = u.match(/@([a-zA-Z0-9_.-]+)/);
  if (!m) return false;
  const tag = m[1];
  if (/^v\d+(\.\d+)?$/.test(tag)) return true;
  if (/^[0-9a-f]{7,}$/.test(tag)) return true;
  return false;
}

const files = findWorkflows('.github/workflows');
const rows = [];
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  const uses = extractUses(txt);
  for (const u of uses) {
    rows.push({ file: path.basename(f), uses: u, pinned: isPinned(u) });
  }
}

const bad = rows.filter(r => !r.pinned);
console.log('Action Pinning Audit');
console.table(rows);
if (bad.length > 0) {
  console.log(`Advisory: ${bad.length} unpinned actions detected.`);
}


