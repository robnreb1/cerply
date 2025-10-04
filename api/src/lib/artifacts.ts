/**
 * Artifact utilities for Certified Publish v1
 * [OKR: O1.KR1, O1.KR2] — Canonicalization, SHA-256, artifact I/O
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Canonical JSON stringify with stable key ordering
 * Used to ensure reproducible hashes and signatures
 */
export function canonicalize(obj: any): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    const items = obj.map(canonicalize);
    return `[${items.join(',')}]`;
  }
  
  // Sort keys alphabetically for stable ordering
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(k => `${JSON.stringify(k)}:${canonicalize(obj[k])}`);
  return `{${pairs.join(',')}}`;
}

/**
 * Compute SHA-256 hex digest
 */
export function sha256Hex(input: string | Uint8Array | Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(typeof input === 'string' ? Buffer.from(input, 'utf8') : input);
  return hash.digest('hex');
}

/**
 * Artifact JSON structure (version cert.v1)
 */
export interface ArtifactData {
  version: 'cert.v1';
  artifactId: string;
  itemId: string;
  sourceUrl: string | null;
  lockHash: string;
  sha256: string;
  createdAtISO: string;
}

/**
 * Build artifact object from item data
 */
export interface ArtifactForOptions {
  artifactId: string;
  itemId: string;
  sourceUrl?: string | null;
  lockHash: string;
}

export function artifactFor(opts: ArtifactForOptions): ArtifactData {
  const artifact = {
    version: 'cert.v1' as const,
    artifactId: opts.artifactId,
    itemId: opts.itemId,
    sourceUrl: opts.sourceUrl ?? null,
    lockHash: opts.lockHash,
    createdAtISO: new Date().toISOString(),
  };
  
  // Compute SHA-256 over canonical JSON (without sha256 field)
  const canonical = canonicalize(artifact);
  const sha256 = sha256Hex(canonical);
  
  // Return artifact without sha256 field for consistent signing/storage
  return artifact;
}

/**
 * Write artifact JSON to disk
 * @returns { path, artifactId } where path is relative to directory
 */
export async function writeArtifact(
  directory: string,
  artifact: ArtifactData
): Promise<{ path: string; artifactId: string }> {
  // Ensure directory exists
  await fs.mkdir(directory, { recursive: true });
  
  const filename = `${artifact.artifactId}.json`;
  const fullPath = path.join(directory, filename);
  
  // Write canonical JSON with pretty formatting for readability
  const json = JSON.stringify(artifact, null, 2);
  await fs.writeFile(fullPath, json, 'utf8');
  
  return {
    path: filename,
    artifactId: artifact.artifactId,
  };
}

/**
 * Read artifact JSON from disk
 */
export async function readArtifact(
  directory: string,
  artifactId: string
): Promise<ArtifactData | null> {
  try {
    const fullPath = path.join(directory, `${artifactId}.json`);
    const content = await fs.readFile(fullPath, 'utf8');
    return JSON.parse(content) as ArtifactData;
  } catch (err: any) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * Get artifacts directory from env or default
 */
export function getArtifactsDir(): string {
  return process.env.ARTIFACTS_DIR || path.join(process.cwd(), 'api', '.artifacts');
}

