const RAW =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.API_BASE ||
  'https://api-stg.cerply.com';

export function apiBase(): string {
  return RAW.replace(/\/+$/, '');
}
