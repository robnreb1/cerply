/**
 * Build Calibration API Proxy
 * Fetches calibration examples at different difficulty levels
 */

import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get('moduleId')
    const difficulty = searchParams.get('difficulty') || '5'

    const response = await fetch(
      `${API_BASE}/api/v2/build/calibration?moduleId=${moduleId}&difficulty=${difficulty}`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || 'Bearer dev-token',
        },
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: error.error || 'Failed to fetch calibration examples' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Build calibration API error:', error)
    return NextResponse.json(
      {
        examples: [],
        error: {
          code: 'API_ERROR',
          message: 'Failed to fetch calibration. Ensure API is running on port 8080.',
        },
      },
      { status: 500 }
    )
  }
}

