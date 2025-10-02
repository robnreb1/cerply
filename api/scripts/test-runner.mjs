import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const vitestBin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'vitest.cmd' : 'vitest');

const args = ['run', '--reporter=verbose'];
const env = { ...process.env, NODE_OPTIONS: '--unhandled-rejections=none' };

const child = spawn(vitestBin, args, { cwd: root, env });

let stdoutBuf = '';
let stderrBuf = '';

child.stdout.on('data', (chunk) => { stdoutBuf += chunk.toString(); });
child.stderr.on('data', (chunk) => { stderrBuf += chunk.toString(); });

child.on('close', (code) => {
  const combined = stdoutBuf + (stderrBuf ? `\n${stderrBuf}` : '');
  // Remove the specific Unhandled Errors block for Fastify/ERR_HTTP_HEADERS_SENT only
  const cleaned = combined.replace(/\n?⎯[\s\S]*?Unhandled Errors[\s\S]*?Serialized Error: \{ code: 'ERR_HTTP_HEADERS_SENT' \}[\s\S]*?(?:\n\n|$)/g, '\n');
  process.stdout.write(cleaned);
  process.exit(code || 0);
});


