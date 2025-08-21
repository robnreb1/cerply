import { NextResponse } from 'next/server';

// Force dynamic rendering and prevent static generation
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET() {
  return NextResponse.json({ 
    message: 'Test API route working - updated',
    timestamp: new Date().toISOString(),
    build: 'force-refresh-' + Date.now(),
    deployment: 'vercel-catchall-fix-' + Date.now(),
    forceRebuild: 'vercel-cache-bust-' + Math.random().toString(36).substring(7)
  });
}
