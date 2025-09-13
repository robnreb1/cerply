const RAW =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.API_BASE ||
  'https://cerply-api-staging.onrender.com';

export function apiBase(): string {
  return RAW.replace(/\/+$/, '');
}
