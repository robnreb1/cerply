import { NextResponse } from 'next/server';

export async function GET() {
  // Mock analytics data for now
  const data = {
    completion21d: 0.67,
    spacedCoverage: 0.45,
    lift: { d7: 0.23, d30: 0.41 }
  };
  
  return NextResponse.json(data);
}
