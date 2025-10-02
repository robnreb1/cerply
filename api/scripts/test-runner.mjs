import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const cliArgs = process.argv.slice(2);
// If CI is passing reporter flags, don't add our own
const hasReporter = cliArgs.some(arg => arg.startsWith('--reporter'));
const defaultReporter = hasReporter ? [] : ['--reporter=verbose'];
const args = ['run', ...defaultReporter, ...cliArgs];

function exists(p) { try { return fs.existsSync(p); } catch { return false; } }

const cwd = process.cwd();
const candidates = [
  path.join(cwd, 'node_modules', '.bin', 'vitest'),
  path.join(cwd, '..', 'node_modules', '.bin', 'vitest'),
  path.join(cwd, '..', '..', 'node_modules', '.bin', 'vitest'),
];

const localVitest = candidates.find(exists);
const isWin = process.platform === 'win32';
const cmd = localVitest ? localVitest : (isWin ? 'npx.cmd' : 'npx');
const cmdArgs = localVitest ? args : ['-y', 'vitest', ...args];

const child = spawn(cmd, cmdArgs, { stdio: 'inherit', env: process.env });
child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', (err) => { console.error(err); process.exit(1); });
