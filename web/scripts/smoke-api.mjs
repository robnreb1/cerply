// Web smoke: /api/version headers with retries/timeouts.
// No imports; avoid duplicate symbol declarations.

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const API_BASE =
  process.env.API_BASE ||
  process.env.SMOKE_API_BASE ||
  'https://cerply-api-staging-latest.onrender.com';

const REQUIRED = [
  'x-runtime-channel',
  'x-image-tag',
  'x-image-revision',
  'x-image-created',
];

const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 15000);
const RETRIES = Number(process.env.SMOKE_RETRIES || 6);

async function fetchJson(url, attempt = 1) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const txt = await res.text();
    let body;
    try { body = JSON.parse(txt); } catch { body = { _raw: txt }; }
    return { res, body };
  } catch (err) {
    if (attempt < RETRIES) {
      const backoff = 500 * attempt;
      console.warn(`WARN: ${err?.name ?? ''} ${err?.message ?? err} — retrying in ${backoff}ms…`);
      await wait(backoff);
      return fetchJson(url, attempt + 1);
    }
    throw err;
  }
}

(async () => {
  const url = `${API_BASE}/api/version`;
  console.log(`SMOKE: API_BASE=${API_BASE}`);
  const { res, body } = await fetchJson(url);

  if (!res.ok) {
    console.error(`SMOKE ERROR: HTTP ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const headers = Object.fromEntries(res.headers.entries());
  const missing = REQUIRED.filter((h) => !(h in headers));
  if (missing.length) {
    console.error(`SMOKE ERROR: missing headers: ${missing.join(', ')}`);
    console.error(headers);
    process.exit(1);
  }

  const picked = Object.fromEntries(REQUIRED.map((h) => [h, headers[h]]));
  console.log('SMOKE OK:', { version: body, headers: picked });
  
  // Cerply Certified stub/mock check (non-fatal; expect 200 when mock, else 501/503)
  try {
    const resp = await fetch(`${API_BASE}/api/certified/plan`, { method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS) });
    const code = resp.status;
    console.log(`[certified] /api/certified/plan -> ${code}`);
    if (![200,501,503].includes(code)) {
      console.warn(`WARN: expected 200/501/503 from /api/certified/plan, got ${code}`);
    }
    if (code === 501 || code === 200) {
      const j = await resp.json().catch(() => ({}));
      if (code === 501) {
        const ok = j && j.status === 'stub' && typeof j.request_id === 'string' && j.request_id.length > 0;
        if (!ok) console.warn('WARN: 501 body missing status:"stub" or non-empty request_id');
        else console.log(`[certified] stub ok request_id=${j.request_id}`);
      } else if (code === 200) {
        const ok = j && j.status === 'ok' && j.endpoint === 'certified.plan' && Array.isArray(j?.plan?.items) && j.plan.items.length > 0;
        if (!ok) console.warn('WARN: 200 mock body missing status:"ok" or plan.items[0]');
        else console.log(`[certified] mock ok items=${j.plan.items.length}`);
      }
    }
  } catch (e) {
    console.log('(certified stub check skipped)', e?.message || e);
  }
})().catch((e) => {
  console.error('* SMOKE ERROR', e);
  process.exit(1);
});
