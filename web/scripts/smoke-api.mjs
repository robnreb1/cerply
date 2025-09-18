// Web smoke: /api/version headers with retries/timeouts.
// No imports; avoid duplicate symbol declarations.

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const API_BASE =
  process.env.SMOKE_API_BASE ||
  process.env.API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.api_base ||
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
})().catch((e) => {
  console.error('* SMOKE ERROR', e);
  process.exit(1);
});
