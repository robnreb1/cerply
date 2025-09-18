export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { ok: true, service: 'web', ts: new Date().toISOString() },
    { headers: { 'cache-control': 'no-store', 'x-edge': 'health-v2' } }
  );
}


