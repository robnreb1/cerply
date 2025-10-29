/**
 * Build Lock API Proxy
 * Locks a module to prevent further edits
 */

import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { moduleId } = body

    const response = await fetch(`${API_BASE}/api/v2/build/lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || 'Bearer dev-token',
      },
      body: JSON.stringify({
        moduleId,
        userId: 'dev-user-id',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: error.error || 'Failed to lock module' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Build lock API error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'API_ERROR',
          message: 'Failed to lock module. Ensure API is running on port 8080.',
        },
      },
      { status: 500 }
    )
  }
}

