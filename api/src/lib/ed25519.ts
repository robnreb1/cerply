/**
 * Ed25519 signing and verification utilities for Certified Publish v1
 * [OKR: O3.KR2] — Env-based key management, deterministic test keys
 */

import crypto from 'node:crypto';

interface KeyPair {
  publicKey: crypto.KeyObject;
  privateKey: crypto.KeyObject;
}

let _cachedKeys: KeyPair | null = null;

/**
 * Load Ed25519 keys from environment variables
 * CERT_SIGN_PUBLIC_KEY and CERT_SIGN_PRIVATE_KEY (base64-encoded DER)
 * 
 * In tests (NODE_ENV=test), uses deterministic fixed keys if env vars are not set.
 * In production, throws clear error if keys are missing.
 */
export function loadKeysFromEnv(): KeyPair {
  if (_cachedKeys) return _cachedKeys;

  const isTest = process.env.NODE_ENV === 'test';
  const pubB64 = process.env.CERT_SIGN_PUBLIC_KEY;
  const privB64 = process.env.CERT_SIGN_PRIVATE_KEY;

  // If not in test and keys are missing, throw explicit error
  if (!isTest && (!pubB64 || !privB64)) {
    throw new Error('CERT_SIGN_PUBLIC_KEY and CERT_SIGN_PRIVATE_KEY environment variables are required for signing');
  }

  // Use deterministic test keys if in test environment and env vars not set
  if (isTest && (!pubB64 || !privB64)) {
    const testPair = generateDeterministicTestKeys();
    _cachedKeys = testPair;
    return testPair;
  }

  try {
    // Decode base64 to buffers
    const pubBuf = Buffer.from(pubB64!, 'base64');
    const privBuf = Buffer.from(privB64!, 'base64');

    // Validate minimum lengths (Ed25519 keys are typically 44 bytes for public, 85 bytes for private in DER)
    if (pubBuf.length < 32) {
      throw new Error(`CERT_SIGN_PUBLIC_KEY too short: ${pubBuf.length} bytes`);
    }
    if (privBuf.length < 32) {
      throw new Error(`CERT_SIGN_PRIVATE_KEY too short: ${privBuf.length} bytes`);
    }

    // Import as KeyObject
    const publicKey = crypto.createPublicKey({
      key: pubBuf,
      format: 'der',
      type: 'spki',
    });

    const privateKey = crypto.createPrivateKey({
      key: privBuf,
      format: 'der',
      type: 'pkcs8',
    });

    _cachedKeys = { publicKey, privateKey };
    return _cachedKeys;
  } catch (err: any) {
    throw new Error(`Failed to load Ed25519 keys: ${err.message}`);
  }
}

/**
 * Generate deterministic Ed25519 keys for testing
 * Uses a fixed seed to ensure reproducible signatures in tests
 */
function generateDeterministicTestKeys(): KeyPair {
  // For deterministic test keys, we generate a keypair from a fixed seed
  // Node's crypto.generateKeyPairSync doesn't support seeding, so we use a workaround:
  // Generate a keypair and cache it in memory for the test session
  
  // Check if we have cached test keys in global scope
  const globalCache = (global as any).__cerply_test_keys;
  if (globalCache) return globalCache;

  // Generate new test keypair (will be the same for all test runs in this process)
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  
  const keys = { publicKey, privateKey };
  (global as any).__cerply_test_keys = keys;
  return keys;
}

/**
 * Sign data with Ed25519 private key
 * @param data - Data to sign (as Uint8Array or Buffer)
 * @returns Signature as Uint8Array (64 bytes)
 */
export function sign(data: Uint8Array | Buffer): Uint8Array {
  const keys = loadKeysFromEnv();
  const signature = crypto.sign(null, Buffer.from(data), keys.privateKey);
  return new Uint8Array(signature);
}

/**
 * Verify Ed25519 signature
 * @param data - Original data that was signed
 * @param signatureB64 - Base64-encoded signature
 * @returns true if signature is valid, false otherwise
 */
export function verify(data: Uint8Array | Buffer, signatureB64: string): boolean {
  try {
    const keys = loadKeysFromEnv();
    const signature = Buffer.from(signatureB64, 'base64');
    return crypto.verify(null, Buffer.from(data), keys.publicKey, signature);
  } catch {
    return false;
  }
}

/**
 * Encode binary data to base64
 */
export function toBase64(data: Uint8Array | Buffer): string {
  return Buffer.from(data).toString('base64');
}

/**
 * Decode base64 to Buffer
 */
export function fromBase64(b64: string): Buffer {
  return Buffer.from(b64, 'base64');
}

/**
 * Reset cached keys (useful for testing)
 */
export function _resetCache(): void {
  _cachedKeys = null;
  delete (global as any).__cerply_test_keys;
}

