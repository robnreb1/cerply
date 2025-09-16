import { setTimeout as delay } from 'node:timers/promises';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE || 'http://localhost:8080';
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 8000);

async function getJson(path) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: ctrl.signal });
    const txt = await res.text();
    let json;
    try { json = JSON.parse(txt); } catch { json = { raw: txt }; }
    return { ok: res.ok, status: res.status, headers: Object.fromEntries(res.headers), json };
  } finally { clearTimeout(t); }
}

(async () => {
  console.log(`SMOKE: API_BASE=${API_BASE}`);
  const h = await getJson('/api/health');
  if (!h.ok || h.status !== 200 || !h.json?.ok) {
    console.error('✖ /api/health failed', h);
    process.exit(1);
  }
  console.log('✓ /api/health ok', { env: h.json.env, planner: h.json.planner?.primary, xapi: h.headers['x-api'] });

  // /api/db/health should be 200 JSON (or 5xx JSON on real fault, never 404)
  const d = await getJson('/api/db/health');
  if (d.status === 404) {
    console.error('✖ /api/db/health must not be 404', d);
    process.exit(1);
  }
  if (d.status >= 500) {
    console.warn('! /api/db/health returned 5xx (acceptable in fault), continuing', { status: d.status, body: d.json });
  } else if (d.status === 200 && d.json?.ok !== true) {
    console.error('✖ /api/db/health expected { ok:true } when 200', d.json);
    process.exit(1);
  } else {
    console.log('✓ /api/db/health okish', { status: d.status, body: d.json });
  }

  // Light delay to catch any CORS/header regressions on a second hit
  await delay(200);
  const h2 = await getJson('/api/health');
  if (!h2.ok) {
    console.error('✖ second /api/health failed', h2);
    process.exit(1);
  }
  console.log('✓ second /api/health ok');

  console.log('SMOKE PASS');
})().catch((err) => {
  console.error('✖ SMOKE ERROR', err);
  process.exit(1);
});


