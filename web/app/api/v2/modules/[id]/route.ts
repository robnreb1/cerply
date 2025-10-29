/**
 * Modules API Proxy - Fetch specific module
 * GET /api/v2/modules/[id]
 */

import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const moduleId = params.id

    const response = await fetch(`${API_BASE}/api/v2/modules/${moduleId}`, {
      headers: {
        Authorization: request.headers.get('Authorization') || 'Bearer dev-token',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: error.error || 'Module not found' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Modules API error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'API_ERROR',
          message: 'Failed to fetch module. Ensure API is running on port 8080.',
        },
      },
      { status: 500 }
    )
  }
}

