#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..');

async function sh(cmd, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    const cp = spawn(cmd, args, { stdio: 'inherit', ...opts });
    cp.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} -> ${code}`)));
  });
}

async function waitFor(url, tries = 60, delayMs = 1000) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { method: 'GET' });
      if (r.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error(`Server did not become ready at ${url}`);
}

async function main() {
  // Build with preview flags
  await sh('npm', ['-w', 'web', 'run', 'build'], { env: { ...process.env, NEXT_PUBLIC_PREVIEW_CERTIFIED_UI: 'true', NEXT_PUBLIC_API_BASE: 'http://127.0.0.1:3100' } });

  // Start Next on 3100
  const server = spawn('npm', ['-w', 'web', 'run', 'start', '--', '-p', '3100'], { env: { ...process.env, NEXT_PUBLIC_PREVIEW_CERTIFIED_UI: 'true', NEXT_PUBLIC_API_BASE: 'http://127.0.0.1:3100' }, stdio: 'inherit' });
  let serverClosed = false;
  server.on('exit', () => { serverClosed = true; });
  try {
    await waitFor('http://127.0.0.1:3100');

    // Prepare Playwright
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // Mock API
    const fixturePath = join(__dirname, '..', 'tests', 'fixtures', 'plan.success.json');
    const body = readFileSync(fixturePath, 'utf8');
    await page.route('**/api/certified/plan', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body });
    });

    // Navigate and render deck
    await page.goto('http://127.0.0.1:3100/certified/study');
    await page.fill('input[aria-label="Topic"]', 'Hashes');
    await page.selectOption('select[aria-label="Level"]', { value: 'beginner' });
    await page.fill('input[aria-label="Goals"]', 'memory, spaced repetition');
    await page.click('button[aria-label="Submit"]');
    await page.waitForSelector('[aria-label="Card front"]');

    // Ensure screenshots dir exists
    const shotsDir = join(repoRoot, 'docs', 'screenshots');
    mkdirSync(shotsDir, { recursive: true });

    // Light screenshot
    // Light
    await page.screenshot({ path: join(shotsDir, 'study-runner-light.png'), fullPage: false });

    // Dark screenshot
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.screenshot({ path: join(shotsDir, 'study-runner-dark.png'), fullPage: false });

    await browser.close();
  } finally {
    if (!serverClosed) server.kill('SIGTERM');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });


