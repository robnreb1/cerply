#!/usr/bin/env node
import { execSync } from "node:child_process";

const BASE = process.env.API_BASE || "https://cerply-api-staging-latest.onrender.com";

function sh(cmd) {
  return execSync(cmd, { stdio: "pipe" }).toString();
}

function header(path) {
  return sh(`curl -sS -D - -o /dev/null "${BASE}${path}"`);
}

function body(path) {
  return sh(`curl -sS "${BASE}${path}"`);
}

// 1) health must be 200; bail on suspended HTML
const head = header("/api/health");
if (/x-render-routing:\s*suspend/i.test(head)) {
  console.error("ERROR: Render says 'suspend' — wrong service/domain still wired.");
  process.exit(1);
}
const healthCode = sh(`curl -sS -o /dev/null -w "%{http_code}" "${BASE}/api/health"`);
if (healthCode.trim() !== "200") {
  console.error(`ERROR: health returned ${healthCode}`);
  process.exit(1);
}

// 2) print x-api header for visibility
console.log(head.split(/\r?\n/).filter(l => /^x-api:/i.test(l)).join("\n") || "(no x-api)");

// 3) best-effort version endpoint + image headers
try {
  const vh = sh(`curl -sS -D /tmp/vh.txt "${BASE}/api/version"`);
  console.log(vh);
  const hdrs = sh(`cat /tmp/vh.txt | tr -d '\\r' | grep -Ei '^x-image-(tag|revision|created):' || true`);
  console.log(hdrs || "(no image headers)");
} catch {
  console.log("(/api/version not present yet)");
}


// 4) Cerply Certified stub/mock check (non-fatal; expect 200 when mock, else 501 or 503)
try {
  const head = sh(`curl -sS -D - -o /dev/null -X POST "${BASE}/api/certified/plan" -H 'origin: https://app.cerply.com'`);
  const code = (head.match(/\s(\d{3})\s/) || [,''])[1];
  console.log(`[certified] /api/certified/plan -> ${code}`);
  if (!['200','501','503'].includes(code)) {
    console.error(`WARN: expected 200/501/503 from /api/certified/plan, got ${code}`);
  }
  if (code === '501' || code === '200') {
    const cleaned = head.replace(/\r/g,'');
    const hasAcao = /(^|\n)access-control-allow-origin:\s*\*/i.test(cleaned);
    const hasAcacTrue = /(^|\n)access-control-allow-credentials:\s*true/i.test(cleaned);
    if (!hasAcao) {
      console.error('ERROR: missing Access-Control-Allow-Origin: * on POST');
      process.exitCode = 1;
    }
    if (hasAcacTrue) {
      console.error('ERROR: Access-Control-Allow-Credentials: true present on POST');
      process.exitCode = 1;
    }
    const bodyTxt = sh(`curl -sS -X POST "${BASE}/api/certified/plan" -H 'content-type: application/json' -H 'origin: https://app.cerply.com' -d '{}'`);
    try {
      const j = JSON.parse(bodyTxt);
      if (code === '501') {
        const ok = j && j.status === 'stub' && typeof j.request_id === 'string' && j.request_id.length > 0;
        if (!ok) console.error('WARN: 501 body missing status:"stub" or non-empty request_id');
        else console.log(`[certified] stub ok request_id=${j.request_id}`);
      } else if (code === '200') {
        const isPlan = j?.mode === 'plan'
          && j?.provenance?.planner === 'rule'
          && Array.isArray(j?.plan?.items) && j.plan.items.length > 0;
        const isMock = j?.mode === 'mock'
          && j?.provenance?.planner === 'mock'
          && Array.isArray(j?.plan?.items) && j.plan.items.length > 0;
        if (!(isPlan || isMock)) {
          console.error('WARN: 200 body missing expected planner/mode or items');
        } else {
          console.log(`[certified] ${j.mode} ok items=${j.plan.items.length}`);
        }
      }
    } catch {
      console.error('WARN: body not JSON');
    }
  }
} catch {
  console.log("(certified stub check skipped)");
}


