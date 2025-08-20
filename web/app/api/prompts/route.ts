import { NextResponse } from 'next/server';

// Force dynamic rendering - prevent static generation during build
export const dynamic = 'force-dynamic';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

export async function GET() {
  try {
    // Try to fetch from backend prompts endpoint
    const resp = await fetch(`${API}/prompts`, { 
      headers: {
        'User-Agent': 'Cerply-Web-Proxy'
      }
    });
    
    if (!resp.ok) {
      // If backend doesn't have /prompts, return empty array for now
      return NextResponse.json({ prompts: [] });
    }
    
    const data = await resp.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Prompts proxy error:', err);
    // Return empty array on error
    return NextResponse.json({ prompts: [] });
  }
}
