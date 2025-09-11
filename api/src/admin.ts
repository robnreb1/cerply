// api/src/admin.ts
import type { IncomingHttpHeaders } from 'http';

export function isAdminAllowed(headers: IncomingHttpHeaders, hasSession: boolean): boolean {
  const allowDev = process.env.ALLOW_DEV_ADMIN === 'true';
  const xAdmin = String(headers?.['x-admin'] ?? '').toLowerCase() === 'true';
  return Boolean(hasSession && (xAdmin || allowDev));
}

export const COOKIE_NAME = 'cerply_session';
export function hasSessionFromReq(req: any): boolean {
  const cookie = req?.cookies?.[COOKIE_NAME];
  return Boolean(cookie && String(cookie).length > 0);
}