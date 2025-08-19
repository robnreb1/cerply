import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ManifestEntry, LoadedPrompt } from "./promptTypes";

const CANDIDATE_DIRS = ["docs/prompt-library", "docs/prompts", "../docs/prompt-library", "../docs/prompts"];
const ALLOWED_EXT = new Set([".md", ".txt", ".json"]);

type Cache = {
  root: string | null;
  byId: Map<string, ManifestEntry>;
  byPrefix: Map<string, string>; // bare id (no hash) -> full id
  builtAt: number;
};

const cache: Cache = { root: null, byId: new Map(), byPrefix: new Map(), builtAt: 0 };

function detectRoot(): string | null {
  for (const p of CANDIDATE_DIRS) {
    const full = path.resolve(process.cwd(), p);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) return full;
  }
  return null;
}

function sha1(buf: Buffer | string) {
  return crypto.createHash("sha1").update(buf).digest("hex");
}

function kebab(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function readText(file: string) {
  return fs.readFileSync(file, "utf8");
}

function firstHeadingOrLine(text: string): string {
  const lines = text.split(/\r?\n/);
  for (const L of lines) {
    const s = L.trim();
    if (!s) continue;
    if (s.startsWith("#")) return s.replace(/^#+\s*/, "").trim();
    return s;
  }
  return "Untitled Prompt";
}

function extractFirstFence(text: string): string | undefined {
  const m = text.match(/```([\s\S]*?)```/);
  return m ? m[1].trim() : undefined;
}

function findAllFiles(root: string): string[] {
  const out: string[] = [];
  (function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (ALLOWED_EXT.has(path.extname(entry.name))) out.push(p);
    }
  })(root);
  return out;
}

function buildManifest(): void {
  const root = detectRoot();
  cache.root = root;
  cache.byId.clear();
  cache.byPrefix.clear();
  cache.builtAt = Date.now();
  if (!root) return;

  const files = findAllFiles(root);
  for (const abs of files) {
    const rel = path.relative(process.cwd(), abs);
    const st = fs.statSync(abs);
    const ext = path.extname(abs);
    const base = path.basename(abs, ext);

    let title = base;
    let raw = readText(abs);
    let role: string | undefined;
    let purpose: string | undefined;
    let template: string | undefined;

    if (ext === ".json") {
      try {
        const obj = JSON.parse(raw);
        title = obj.title || base;
        role = obj.role || undefined;
        purpose = obj.purpose || undefined;
        if (typeof obj.template === "string") template = obj.template;
        // keep raw as source-of-truth string
      } catch {
        // fall back to plain text handling
      }
    } else {
      title = firstHeadingOrLine(raw) || base;
      template = extractFirstFence(raw);
    }

    const h = sha1(raw).slice(0, 6);
    const idPrefix = kebab(title || base) || kebab(base);
    const id = `${idPrefix}-${h}`;

    const meta: ManifestEntry = {
      id,
      title,
      role,
      purpose,
      path: rel,
      hash: h,
      updatedAt: new Date(st.mtimeMs).toISOString(),
    };

    cache.byId.set(id, meta);
    cache.byPrefix.set(idPrefix, id);
  }
}

function ensureManifestFresh() {
  // naive: rebuild on every call if older than 3s; dev-friendly and cheap
  if (!cache.root || Date.now() - cache.builtAt > 3000) buildManifest();
}

export function listPrompts(): ManifestEntry[] {
  ensureManifestFresh();
  return Array.from(cache.byId.values()).sort((a, b) => a.title.localeCompare(b.title));
}

export function getPrompt(idOrPrefix: string): LoadedPrompt | null {
  ensureManifestFresh();
  let id = idOrPrefix;
  if (!cache.byId.has(id)) {
    const maybe = cache.byPrefix.get(idOrPrefix);
    if (maybe) id = maybe;
    else {
      // also accept "prefix-hash" even if hash differs (e.g. file updated)
      const prefix = idOrPrefix.replace(/-[a-f0-9]{6}$/, "");
      const alt = cache.byPrefix.get(prefix);
      if (alt) id = alt;
    }
  }
  const meta = cache.byId.get(id);
  if (!meta) return null;

  const abs = path.resolve(process.cwd(), meta.path);
  const raw = readText(abs);

  let template: string | undefined;
  if (abs.endsWith(".json")) {
    try {
      const obj = JSON.parse(raw);
      if (typeof obj.template === "string") template = obj.template;
    } catch { /* ignore */ }
  } else {
    template = extractFirstFence(raw) || undefined;
  }

  return { id: meta.id, meta, raw, template };
}
