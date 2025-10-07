import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export async function POST(request: NextRequest) {
  // Check if Supabase is configured
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'WAITLIST_PROVIDER_NOT_CONFIGURED',
          message: 'Waitlist provider not configured',
        },
      },
      { status: 501 }
    );
  }

  try {
    const body = await request.json();
    const { email, name, source, ua, ts } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'INVALID_EMAIL',
            message: 'Valid email is required',
          },
        },
        { status: 400 }
      );
    }

    // Insert into Supabase
    const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        email,
        name: name || null,
        source: source || 'unknown',
        ua: ua || null,
        ts: ts || new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('Supabase error:', error);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'SUPABASE_ERROR',
            message: 'Failed to save to waitlist',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Waitlist error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}

