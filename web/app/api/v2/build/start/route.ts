/**
 * Build Start API Proxy
 * Handles initial module creation
 */

import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(`${API_BASE}/api/v2/build/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || 'Bearer dev-token',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: error.error || 'Backend error' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({
      reply: data.reply,
      moduleId: data.moduleId,
      module: data.module,
      aiGenerated: data.aiGenerated,
    })
  } catch (error) {
    console.error('Build start API error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'API_ERROR',
          message: 'Failed to start module. Ensure API is running on port 8080.',
        },
      },
      { status: 500 }
    )
  }
}

