#!/usr/bin/env node
import { execSync } from "node:child_process";

const BASE = process.env.API_BASE || "https://cerply-api-staging.onrender.com";

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


