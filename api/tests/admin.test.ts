import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isAdminAllowed } from '../src/admin';

// Gate signature: isAdminAllowed(headers, hasSession)
const COOKIE = 'cerply.sid=dev';

function headersWith(opts: { xAdmin?: string; cookie?: string } = {}) {
  const h: Record<string, string> = {};
  if (opts.xAdmin !== undefined) h['x-admin'] = opts.xAdmin;
  if (opts.cookie) h['cookie'] = opts.cookie;
  return h as any;
}

describe('admin gating', () => {
  beforeEach(() => {
    delete process.env.ALLOW_DEV_ADMIN;
  });
  afterEach(() => {
    delete process.env.ALLOW_DEV_ADMIN;
  });

  it('allows when ALLOW_DEV_ADMIN=true and session present', () => {
    process.env.ALLOW_DEV_ADMIN = 'true';
    const ok = isAdminAllowed(headersWith({ cookie: COOKIE }), true);
    expect(ok).toBe(true);
  });

  it('allows when x-admin=true with session', () => {
    const ok = isAdminAllowed(headersWith({ cookie: COOKIE, xAdmin: 'true' }), true);
    expect(ok).toBe(true);
  });

  it('denies without session', () => {
    const no = isAdminAllowed(headersWith({ xAdmin: 'true' }), false);
    expect(no).toBe(false);
  });
});