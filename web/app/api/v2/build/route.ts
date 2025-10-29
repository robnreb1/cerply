/**
 * Build API Proxy Routes
 * Proxies requests from Next.js frontend to Express backend
 */

import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint') || 'start'
    const body = await request.json()

    const response = await fetch(`${API_BASE}/api/v2/build/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward auth headers
        Authorization: request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Build API proxy error:', error)
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: 'Failed to proxy request' } },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get('moduleId')
    const difficulty = searchParams.get('difficulty')

    const response = await fetch(
      `${API_BASE}/api/v2/build/calibration?moduleId=${moduleId}&difficulty=${difficulty}`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    )

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Build API proxy error:', error)
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: 'Failed to proxy request' } },
      { status: 500 }
    )
  }
}

