import { NextResponse } from 'next/server';

export async function GET() {
  const data = {
    ok: true,
    env: process.env.NODE_ENV || 'development',
    note: 'prefer /api/health'
  };
  
  return NextResponse.json(data);
}
